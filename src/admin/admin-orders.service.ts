import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../product/orders/orders.service";
import {
  affectedRowsCount,
  quoteSqlIdentifier,
  stringContainsFilter,
} from "../common/database-provider.util";
import {
  ORDER_STATUS_TRANSITIONS,
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  canTransitionOrderStatus,
  normalizeOrderStatus,
} from "../product/constants/order-status";
import {
  renderInvoiceHtml,
  renderPackingSlipHtml,
} from "./order-documents.util";
import { unitsToConsume } from "../product/products/product-stock-pool.util";
import {
  AdminAutoDeliverDto,
  AdminCancelOrderDto,
  AdminContactCustomerDto,
  AdminRecordPaymentDto,
  AdminRefundOrderDto,
  AdminUpdateOrderDto,
  AdminUpdatePaymentStatusDto,
} from "./dto/admin.dto";

type AdminActor = { name?: string | null };

const adminOrderDetailInclude = {
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
  items: {
    include: {
      variant: {
        include: {
          packSize: true,
          product: { select: { id: true, name: true, hsnCode: true } },
        },
      },
    },
  },
  payments: true,
  shipments: true,
  events: { orderBy: { createdAt: "desc" as const } },
  refunds: { orderBy: { createdAt: "desc" as const } },
  shippingAddress: true,
} as const;

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  /** Documents stock reservation policy for admin UI / ops. */
  getInventoryPolicy() {
    return {
      online: {
        onCreate: "reserve",
        description:
          "ONLINE checkout increments reservedQuantity until payment succeeds (then stock commits) or the unpaid order is cancelled (reservation released).",
      },
      cod: {
        onCreate: "deduct",
        description:
          "COD deducts stockQuantity immediately at place-order. Admin cancel before ship restocks. COD cash is recorded via POST /admin/orders/:id/payments.",
      },
      cancelStockRelease: {
        beforeShip: true,
        afterShip: false,
      },
    };
  }

  async findAll(params: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    from?: string;
    to?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const from = params.startDate ?? params.from;
    const to = params.endDate ?? params.to;
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.paymentStatus && { paymentStatus: params.paymentStatus }),
      ...(params.search && {
        OR: [
          { orderNumber: stringContainsFilter(params.search) },
          { customer: { name: stringContainsFilter(params.search) } },
          { customer: { email: stringContainsFilter(params.search) } },
          { trackingId: stringContainsFilter(params.search) },
        ],
      }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: true,
          payments: {
            select: {
              id: true,
              paymentMethod: true,
              paymentStatus: true,
              paymentDate: true,
              amount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: adminOrderDetailInclude,
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        hsnCode: item.hsnCode ?? item.variant?.product?.hsnCode ?? null,
      })),
    };
  }

  async listEvents(id: number) {
    await this.findOneOrFail(id);
    const events = await this.prisma.orderEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });
    return { id, events };
  }

  async update(id: number, dto: AdminUpdateOrderDto, actor: AdminActor = {}) {
    const order = await this.findOneOrFail(id);
    const data: Prisma.OrderUpdateInput = {};
    let nextStatus: string | undefined;

    if (dto.status != null) {
      const next = normalizeOrderStatus(dto.status);
      if (next !== order.status) {
        this.assertTransition(order.status, next);
        data.status = next;
        nextStatus = next;
      }
    }
    if (dto.trackingId !== undefined) data.trackingId = dto.trackingId;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }

    await this.prisma.$transaction(async (tx) => {
      if (nextStatus === OrderStatus.SHIPPED) {
        await this.upsertShipmentOnShip(
          tx,
          id,
          dto.trackingId ?? order.trackingId,
        );
      }
      if (nextStatus === OrderStatus.DELIVERED) {
        await this.markShipmentDelivered(tx, id);
      }

      await tx.order.update({ where: { id }, data });

      if (nextStatus) {
        await this.writeEvent(tx, {
          orderId: id,
          type: OrderEventType.STATUS_CHANGED,
          label: `Status → ${nextStatus}`,
          detail: `Changed from ${order.status} to ${nextStatus}`,
          actorType: "admin",
          actorName: actor.name ?? "Admin",
          metadata: {
            from: order.status,
            to: nextStatus,
            trackingId: dto.trackingId ?? null,
          },
        });
      } else if (dto.notes != null) {
        await this.writeEvent(tx, {
          orderId: id,
          type: OrderEventType.NOTE_ADDED,
          label: "Note updated",
          detail: dto.notes,
          actorType: "admin",
          actorName: actor.name ?? "Admin",
        });
      }
    });

    return this.findOne(id);
  }

  async recordPayment(
    id: number,
    dto: AdminRecordPaymentDto,
    actor: AdminActor = {},
  ) {
    const order = await this.findOneOrFail(id);
    const method = (dto.method ?? "cod").toLowerCase();
    if (method !== "cod" && method !== "cash" && method !== "offline") {
      throw new BadRequestException(
        "This endpoint records offline/COD collections. Use payment-status for other adjustments.",
      );
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException("Order is already marked paid");
    }

    const amount = dto.amount ?? Number(order.totalAmount);
    if (!(amount > 0)) {
      throw new BadRequestException("amount must be greater than 0");
    }

    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          orderId: id,
          paymentMethod: method,
          amount,
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
          transactionId: dto.reference ?? null,
          paymentStatus: PaymentStatus.PAID,
          paymentDate: receivedAt,
        },
      });

      await this.writeEvent(tx, {
        orderId: id,
        type: OrderEventType.PAYMENT_RECORDED,
        label: "COD / offline payment recorded",
        detail: dto.notes ?? `Received ${amount} via ${method}`,
        actorType: "admin",
        actorName: actor.name ?? "Admin",
        metadata: {
          paymentId: created.id,
          amount,
          method,
          reference: dto.reference ?? null,
        },
      });

      return created;
    });

    // Reuses inventory commit rules for ONLINE unpaid → paid
    await this.ordersService.applyPaymentSuccess(id);

    const refreshed = await this.findOne(id);
    return {
      id: payment.id,
      orderId: id,
      amount: Number(payment.amount),
      method: payment.paymentMethod,
      receivedAt: payment.paymentDate,
      paymentStatus: refreshed.paymentStatus,
      reference: payment.reference,
    };
  }

  async updatePaymentStatus(
    id: number,
    dto: AdminUpdatePaymentStatusDto,
    actor: AdminActor = {},
  ) {
    const order = await this.findOneOrFail(id);
    const next = dto.paymentStatus;
    const allowed = new Set(Object.values(PaymentStatus));
    if (
      !allowed.has(next as (typeof PaymentStatus)[keyof typeof PaymentStatus])
    ) {
      throw new BadRequestException(`Invalid paymentStatus: ${next}`);
    }

    if (
      next === PaymentStatus.PAID &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      await this.ordersService.applyPaymentSuccess(id);
      await this.prisma.orderEvent.create({
        data: {
          orderId: id,
          type: OrderEventType.PAYMENT_STATUS_CHANGED,
          label: "Payment marked paid",
          detail: dto.notes ?? null,
          actorType: "admin",
          actorName: actor.name ?? "Admin",
          metadata: { from: order.paymentStatus, to: next },
        },
      });
      if (dto.notes) {
        await this.prisma.order.update({
          where: { id },
          data: { notes: dto.notes },
        });
      }
      const refreshed = await this.findOne(id);
      return {
        id: refreshed.id,
        paymentStatus: refreshed.paymentStatus,
        updatedAt: refreshed.updatedAt,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: next,
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });
      await this.writeEvent(tx, {
        orderId: id,
        type: OrderEventType.PAYMENT_STATUS_CHANGED,
        label: `Payment status → ${next}`,
        detail: dto.notes ?? null,
        actorType: "admin",
        actorName: actor.name ?? "Admin",
        metadata: { from: order.paymentStatus, to: next },
      });
      return row;
    });

    return {
      id: updated.id,
      paymentStatus: updated.paymentStatus,
      updatedAt: updated.updatedAt,
    };
  }

  async requestRefund(
    id: number,
    dto: AdminRefundOrderDto,
    actor: AdminActor = {},
  ) {
    const order = await this.findOneOrFail(id);
    if (
      order.paymentStatus !== PaymentStatus.PAID &&
      order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException("Only paid orders can be refunded");
    }

    const amount = dto.amount;
    if (!(amount > 0)) {
      throw new BadRequestException("amount must be greater than 0");
    }
    if (amount > Number(order.totalAmount) + 0.001) {
      throw new BadRequestException("Refund amount exceeds order total");
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orderRefund.create({
        data: {
          orderId: id,
          amount,
          reason: dto.reason,
          status: "requested",
          items:
            dto.items != null
              ? (dto.items as Prisma.InputJsonValue)
              : undefined,
        },
      });

      const fully = amount >= Number(order.totalAmount) - 0.001;
      await tx.order.update({
        where: { id },
        data: {
          paymentStatus: fully
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED,
        },
      });

      await this.writeEvent(tx, {
        orderId: id,
        type: OrderEventType.REFUND_REQUESTED,
        label: "Refund requested",
        detail: dto.reason,
        actorType: "admin",
        actorName: actor.name ?? "Admin",
        metadata: {
          refundId: created.id,
          amount,
          items: (dto.items ?? null) as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return {
      refundId: refund.id,
      orderId: id,
      amount: Number(refund.amount),
      status: refund.status,
      reason: refund.reason,
    };
  }

  async cancel(id: number, dto: AdminCancelOrderDto, actor: AdminActor = {}) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                packSize: true,
                product: { select: { id: true, stockUnit: true } },
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    if (order.status === OrderStatus.CANCELLED) {
      return { id, status: OrderStatus.CANCELLED, stockReleased: false };
    }
    if (
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED ||
      order.status === "shipped" ||
      order.status === "delivered"
    ) {
      throw new BadRequestException(
        "Shipped/delivered orders cannot be cancelled — create a refund instead",
      );
    }

    const stockReleased = await this.prisma.$transaction(async (tx) => {
      const released = await this.releaseStockOnCancel(tx, order);
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          notes: dto.reason
            ? [order.notes, `Cancel: ${dto.reason}`].filter(Boolean).join("\n")
            : order.notes,
        },
      });
      await this.writeEvent(tx, {
        orderId: id,
        type: OrderEventType.CANCELLED,
        label: "Order cancelled",
        detail: dto.reason,
        actorType: "admin",
        actorName: actor.name ?? "Admin",
        metadata: { stockReleased: released },
      });
      return released;
    });

    return { id, status: OrderStatus.CANCELLED, stockReleased };
  }

  async contactCustomer(
    id: number,
    dto: AdminContactCustomerDto,
    actor: AdminActor = {},
  ) {
    const order = await this.findOne(id);
    const channel = dto.channel.toLowerCase();
    if (!["email", "sms", "whatsapp", "phone"].includes(channel)) {
      throw new BadRequestException("channel must be email|sms|whatsapp|phone");
    }

    // Delivery is intentionally out-of-band until a provider is wired; we audit the intent.
    await this.prisma.orderEvent.create({
      data: {
        orderId: id,
        type: OrderEventType.CUSTOMER_CONTACTED,
        label: `Customer contacted via ${channel}`,
        detail: dto.message,
        actorType: "admin",
        actorName: actor.name ?? "Admin",
        metadata: {
          channel,
          to: channel === "email" ? order.customer.email : order.customer.phone,
          queued: true,
          deliveredByProvider: false,
        },
      },
    });

    return {
      sent: true,
      sentAt: new Date().toISOString(),
      channel,
      delivery: "logged",
      note: "Message recorded on the order timeline. Wire SMTP/SMS provider to send live.",
    };
  }

  /**
   * Marks SHIPPED orders as DELIVERED when shippedAt (or updatedAt) is older than N days.
   * Intended for cron: POST /admin/orders/jobs/auto-deliver
   */
  async autoDeliver(dto: AdminAutoDeliverDto = {}) {
    const days =
      dto.daysAfterShip == null ? 7 : Math.max(0, Number(dto.daysAfterShip));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const candidates = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.SHIPPED, "shipped"] },
        OR: [
          { shipments: { some: { shippedAt: { lte: cutoff } } } },
          {
            AND: [{ shipments: { none: {} } }, { updatedAt: { lte: cutoff } }],
          },
        ],
      },
      select: { id: true, orderNumber: true },
      take: Math.min(200, Number(dto.limit) || 50),
    });

    const results: Array<{ id: number; orderNumber: string; ok: boolean }> = [];
    for (const c of candidates) {
      try {
        await this.update(
          c.id,
          { status: OrderStatus.DELIVERED },
          { name: "system:auto-deliver" },
        );
        await this.prisma.orderEvent.create({
          data: {
            orderId: c.id,
            type: OrderEventType.AUTO_DELIVERED,
            label: "Auto-marked delivered",
            detail: `No delivery confirmation after ${days} day(s)`,
            actorType: "system",
            actorName: "auto-deliver-job",
            metadata: { daysAfterShip: days },
          },
        });
        results.push({ id: c.id, orderNumber: c.orderNumber, ok: true });
      } catch {
        results.push({ id: c.id, orderNumber: c.orderNumber, ok: false });
      }
    }

    return {
      daysAfterShip: days,
      scanned: candidates.length,
      marked: results.filter((r) => r.ok).length,
      results,
    };
  }

  async buildInvoiceHtml(id: number): Promise<string> {
    const order = await this.findOne(id);
    const store = await this.prisma.storeProfile.findUnique({
      where: { id: 1 },
    });
    const shipLines = this.addressLines(
      order.addressSnapshot,
      order.shippingAddress,
    );
    return renderInvoiceHtml({
      storeName: store?.storeName ?? "Aaraa Homecare",
      storeLines: [
        store?.addressLine1,
        store?.city,
        store?.phone,
        store?.email,
      ].filter(Boolean) as string[],
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingId: order.trackingId,
      customer: order.customer,
      shipTo: { lines: shipLines },
      items: order.items.map((i) => ({
        productName: i.productName,
        sizeLabel: i.sizeLabel,
        hsnCode:
          i.hsnCode ??
          (
            i as {
              variant?: { product?: { hsnCode?: string | null } };
            }
          ).variant?.product?.hsnCode ??
          null,
        quantity: i.quantity,
        price: i.price,
        subtotal: i.subtotal,
      })),
      totals: {
        tax: order.taxAmount,
        shipping: order.shippingAmount,
        discount: order.discountAmount,
        total: order.totalAmount,
      },
    });
  }

  async buildPackingSlipHtml(id: number): Promise<string> {
    const order = await this.findOne(id);
    const store = await this.prisma.storeProfile.findUnique({
      where: { id: 1 },
    });
    const shipLines = this.addressLines(
      order.addressSnapshot,
      order.shippingAddress,
    );
    return renderPackingSlipHtml({
      storeName: store?.storeName ?? "Aaraa Homecare",
      storeLines: [],
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingId: order.trackingId,
      customer: order.customer,
      shipTo: { lines: shipLines },
      items: order.items.map((i) => ({
        productName: i.productName,
        sizeLabel: i.sizeLabel,
        quantity: i.quantity,
      })),
    });
  }

  async exportExcel(params: {
    status?: string;
    from?: string;
    to?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    const from = params.startDate ?? params.from;
    const to = params.endDate ?? params.to;

    const where: Prisma.OrderWhereInput = {
      ...(params.status && { status: params.status }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const rows = orders.map((o) => ({
      "Order Number": o.orderNumber,
      "Customer Name": o.customer.name,
      "Customer Email": o.customer.email,
      "Customer Phone": o.customer.phone ?? "",
      Status: o.status,
      "Payment Status": o.paymentStatus,
      "Total Amount": Number(o.totalAmount),
      "Tax Amount": Number(o.taxAmount),
      "Shipping Amount": Number(o.shippingAmount),
      "Tracking ID": o.trackingId ?? "",
      Notes: o.notes ?? "",
      "Created At": o.createdAt.toISOString(),
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Orders");
    return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  /** @deprecated Prefer exportExcel — kept for any callers still expecting CSV text. */
  async exportCsv(params: {
    status?: string;
    from?: string;
    to?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const buffer = await this.exportExcel(params);
    const wb = XLSX.read(buffer, { type: "buffer" });
    return XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private assertTransition(from: string, to: string) {
    if (!canTransitionOrderStatus(from, to)) {
      const allowed = ORDER_STATUS_TRANSITIONS[from] ?? [];
      throw new BadRequestException(
        `Invalid status transition ${from} → ${to}. Allowed: ${allowed.join(", ") || "none"}`,
      );
    }
  }

  private async findOneOrFail(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  private async writeEvent(
    tx: Prisma.TransactionClient,
    data: {
      orderId: number;
      type: string;
      label: string;
      detail?: string | null;
      actorType?: string;
      actorName?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await tx.orderEvent.create({
      data: {
        orderId: data.orderId,
        type: data.type,
        label: data.label,
        detail: data.detail ?? null,
        actorType: data.actorType ?? "admin",
        actorName: data.actorName ?? null,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  private async upsertShipmentOnShip(
    tx: Prisma.TransactionClient,
    orderId: number,
    trackingId: string | null | undefined,
  ) {
    const existing = await tx.shipment.findFirst({ where: { orderId } });
    if (existing) {
      await tx.shipment.update({
        where: { id: existing.id },
        data: {
          status: "shipped",
          trackingNumber: trackingId ?? existing.trackingNumber,
          shippedAt: existing.shippedAt ?? new Date(),
        },
      });
    } else {
      await tx.shipment.create({
        data: {
          orderId,
          status: "shipped",
          trackingNumber: trackingId ?? null,
          shippedAt: new Date(),
        },
      });
    }
  }

  private async markShipmentDelivered(
    tx: Prisma.TransactionClient,
    orderId: number,
  ) {
    const existing = await tx.shipment.findFirst({ where: { orderId } });
    if (existing) {
      await tx.shipment.update({
        where: { id: existing.id },
        data: { status: "delivered", deliveredAt: new Date() },
      });
    } else {
      await tx.shipment.create({
        data: {
          orderId,
          status: "delivered",
          deliveredAt: new Date(),
        },
      });
    }
  }

  /**
   * PENDING_PAYMENT (ONLINE): release Product.reservedStock.
   * Paid / COD deducted: restock Product.stock.
   */
  private async releaseStockOnCancel(
    tx: Prisma.TransactionClient,
    order: {
      status: string;
      paymentStatus: string;
      items: Array<{
        quantity: number;
        variant: {
          variantName: string | null;
          packSize: {
            size: { toString(): string } | number;
            unit: string;
            label: string;
          } | null;
          product: { id: number; stockUnit: string | null };
        };
      }>;
    },
  ): Promise<boolean> {
    if (!order.items.length) return false;

    const byProduct = new Map<number, number>();
    for (const item of order.items) {
      const units = unitsToConsume({
        quantity: item.quantity,
        stockUnit: item.variant.product.stockUnit,
        packSize: item.variant.packSize,
        variantName: item.variant.variantName,
      });
      const pid = item.variant.product.id;
      byProduct.set(pid, (byProduct.get(pid) ?? 0) + units);
    }

    const T = quoteSqlIdentifier("Product");
    const stockCol = quoteSqlIdentifier("stock");
    const reservedCol = quoteSqlIdentifier("reservedStock");

    if (
      order.status === OrderStatus.PENDING_PAYMENT &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      for (const [productId, units] of byProduct) {
        const rowsAffected = await tx.$executeRawUnsafe(
          `UPDATE ${T} SET ${reservedCol} = ${reservedCol} - ? WHERE id = ? AND ${reservedCol} >= ?`,
          units,
          productId,
          units,
        );
        if (affectedRowsCount(rowsAffected) !== 1) {
          throw new BadRequestException(
            `Failed to release reservation for product #${productId}`,
          );
        }
      }
      return true;
    }

    for (const [productId, units] of byProduct) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: units } },
      });
      void stockCol;
    }
    return true;
  }

  private addressLines(
    snapshot: unknown,
    shippingAddress: {
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } | null,
  ): string[] {
    if (snapshot && typeof snapshot === "object") {
      const s = snapshot as Record<string, unknown>;
      return [
        s.line1 ?? s.addressLine1,
        s.line2 ?? s.addressLine2,
        [s.city, s.state, s.postalCode ?? s.zip].filter(Boolean).join(", "),
        s.country,
      ]
        .map((x) => {
          if (typeof x === "string") return x;
          if (typeof x === "number" || typeof x === "boolean") return String(x);
          return "";
        })
        .filter((x) => x.length > 0);
    }
    if (!shippingAddress) return [];
    return [
      shippingAddress.addressLine1,
      shippingAddress.addressLine2,
      [shippingAddress.city, shippingAddress.state, shippingAddress.postalCode]
        .filter(Boolean)
        .join(", "),
      shippingAddress.country,
    ].filter((x): x is string => !!x);
  }
}
