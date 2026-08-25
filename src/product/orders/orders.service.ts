import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Coupon } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrderDto } from "../dto/order.dto";
import { AdminUpdateOrderDto } from "../../admin/dto/admin.dto";
import { OrderStatus } from "../constants/order-status";
import {
  computeCheckoutTotals,
  toCartLineInputs,
} from "../checkout/checkout-pricing.util";
import { assertCouponUsable } from "../checkout/assert-coupon-usable";
import { DEFAULT_CHECKOUT_SHIPPING_FLAT } from "../checkout/checkout.constants";
import {
  affectedRowsCount,
  quoteSqlIdentifier,
  stringContainsFilter,
} from "../../common/database-provider.util";

/** Standard relation graph for storefront order responses. */
const orderDetailInclude = {
  items: {
    include: {
      variant: {
        select: {
          id: true,
          product: { select: { hsnCode: true } },
        },
      },
    },
  },
  payments: true,
  shipments: true,
} as const;

/** `adminFindAll` + `include.customer` — Prisma MariaDB typings omit nested includes on some models. */
type AdminOrderCsvRow = {
  orderNumber: string;
  customer: { name: string; email: string; phone: string | null };
  status: string;
  paymentStatus: string;
  totalAmount: unknown;
  taxAmount: unknown;
  shippingAmount: unknown;
  trackingId: string | null;
  notes: string | null;
  createdAt: Date;
};

const cartForPlaceOrderInclude = {
  items: {
    include: {
      variant: { include: { packSize: true, product: true } },
    },
  },
} as const;

export type PlaceOrderParams = {
  customerId: number;
  cartId: number;
  shippingAddressId?: number;
  couponCode?: string | null;
  /** ONLINE = reserve stock until payment; COD = deduct immediately */
  paymentMethod: "ONLINE" | "COD";
  idempotencyKey?: string | null;
  shippingFlat: number;
  /** Snapshot from checkout when DB row is not loaded in this call */
  couponPricing?: {
    percentOff: Prisma.Decimal | null;
    maxDiscountAmount: Prisma.Decimal | null;
    minOrderAmount: Prisma.Decimal | null;
  } | null;
};

type CartForPlaceOrder = Prisma.CartGetPayload<{
  include: typeof cartForPlaceOrderInclude;
}>;

/** DB coupon row or checkout snapshot — both expose pricing fields for totals. */
type OrderPricingSource =
  | Coupon
  | NonNullable<PlaceOrderParams["couponPricing"]>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Legacy: create order from cart (server-priced, ONLINE checkout with reservation).
   */
  async create(dto: CreateOrderDto) {
    return this.placeOrder({
      customerId: dto.customerId,
      cartId: dto.cartId,
      paymentMethod: "ONLINE",
      shippingFlat: this.getShippingFlat(),
      couponPricing: null,
    });
  }

  async placeOrder(params: PlaceOrderParams) {
    const {
      customerId,
      cartId,
      shippingAddressId,
      couponCode,
      paymentMethod,
      idempotencyKey,
      shippingFlat,
      couponPricing: couponPricingFromCaller,
    } = params;

    const idempotentHit = await this.findOrderByIdempotencyKey(
      customerId,
      idempotencyKey,
    );
    if (idempotentHit) {
      return idempotentHit;
    }

    const cart = await this.loadCartForPlaceOrder(cartId, customerId);

    const couponRow = await this.loadCouponRowIfCodePresent(couponCode);
    const pricingSource: OrderPricingSource | null =
      couponRow ?? couponPricingFromCaller ?? null;

    const lines = toCartLineInputs(cart.items);
    const totals = computeCheckoutTotals(lines, {
      shippingFlat,
      discountPercent: decimalToNumberOrUndefined(pricingSource?.percentOff),
      maxDiscountAmount: decimalToNumberOrNull(
        pricingSource?.maxDiscountAmount,
      ),
      minOrderAmount: decimalToNumberOrNull(pricingSource?.minOrderAmount),
    });

    this.assertSubtotalMeetsCouponMinimum(totals.subtotal, pricingSource);

    await this.validateStockForCheckout(cart.items, paymentMethod);

    const { snapshot, shippingId } = await this.resolveShippingSnapshot(
      shippingAddressId,
      customerId,
    );

    const orderNumber = this.generateOrderNumber();

    return this.prisma.$transaction(async (tx) => {
      await this.applyInventoryForPaymentMode(tx, cart.items, paymentMethod);

      const created = await tx.order.create({
        data: {
          customerId,
          orderNumber,
          status:
            paymentMethod === "COD"
              ? OrderStatus.PROCESSING
              : OrderStatus.PENDING_PAYMENT,
          totalAmount: totals.total,
          taxAmount: totals.tax,
          shippingAmount: totals.shipping,
          discountAmount: totals.discount,
          couponCode:
            couponCode?.trim().toUpperCase() ?? couponRow?.code ?? null,
          paymentStatus: "pending",
          shippingAddressId: shippingId ?? null,
          ...(snapshot !== undefined ? { addressSnapshot: snapshot } : {}),
          items: {
            create: totals.items.map((pl) => ({
              variantId: pl.variantId,
              productName: pl.productName,
              sizeLabel: pl.sizeLabel,
              hsnCode: pl.hsnCode ?? null,
              price: pl.unitPrice,
              quantity: pl.quantity,
              subtotal: pl.lineSubtotal,
            })),
          },
        },
        include: orderDetailInclude,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      if (idempotencyKey) {
        await tx.checkoutIdempotency.create({
          data: {
            customerId,
            key: idempotencyKey,
            orderId: created.id,
          },
        });
      }

      await tx.checkoutSession.deleteMany({ where: { customerId } });

      return this.mapOrderDetail(created);
    });
  }

  /**
   * After a successful payment: commit reserved units to stock for ONLINE orders,
   * or only flip payment flags for COD / already-deducted flows.
   */
  async applyPaymentSuccess(orderId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException(`Order #${orderId} not found`);
      if (order.paymentStatus === "paid") {
        return tx.order.findUnique({
          where: { id: orderId },
          include: orderDetailInclude,
        });
      }

      if (order.status === OrderStatus.PENDING_PAYMENT) {
        const T = quoteSqlIdentifier("ProductVariant");
        const sq = quoteSqlIdentifier("stockQuantity");
        const rq = quoteSqlIdentifier("reservedQuantity");
        for (const item of order.items) {
          const rowsAffected = await tx.$executeRawUnsafe(
            `UPDATE ${T} SET ${sq} = ${sq} - ?, ${rq} = ${rq} - ? WHERE id = ? AND ${rq} >= ?`,
            item.quantity,
            item.quantity,
            item.variantId,
            item.quantity,
          );
          if (affectedRowsCount(rowsAffected) !== 1) {
            throw new BadRequestException(
              `Inventory commit failed for variant #${item.variantId}`,
            );
          }
        }
        return tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PROCESSING, paymentStatus: "paid" },
          include: orderDetailInclude,
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "paid" },
        include: orderDetailInclude,
      });
    });
  }

  async cancel(orderId: number, customerId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);
    if (order.customerId !== customerId) {
      throw new ForbiddenException("Not your order");
    }
    if (order.status === OrderStatus.CANCELLED) {
      return order;
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        "Only orders awaiting payment can be cancelled by customer",
      );
    }
    if (order.paymentStatus === "paid") {
      throw new BadRequestException("Paid orders cannot use this cancel flow");
    }

    const T = quoteSqlIdentifier("ProductVariant");
    const rq = quoteSqlIdentifier("reservedQuantity");
    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const rowsAffected = await tx.$executeRawUnsafe(
          `UPDATE ${T} SET ${rq} = ${rq} - ? WHERE id = ? AND ${rq} >= ?`,
          item.quantity,
          item.variantId,
          item.quantity,
        );
        if (affectedRowsCount(rowsAffected) !== 1) {
          throw new BadRequestException(
            `Failed to release reservation for variant #${item.variantId}`,
          );
        }
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    return this.findOne(orderId);
  }

  findAll(customerId?: number) {
    return this.prisma.order
      .findMany({
        where: customerId ? { customerId } : {},
        include: orderDetailInclude,
        orderBy: { createdAt: "desc" },
      })
      .then((orders) => orders.map((o) => this.mapOrderDetail(o)));
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return this.mapOrderDetail(order);
  }

  async findOneForCustomer(id: number, customerId: number) {
    const order = await this.findOne(id);
    if (order.customerId !== customerId) {
      throw new ForbiddenException("Not your order");
    }
    return order;
  }

  async updateStatus(id: number, status: string) {
    await this.findOne(id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  getShippingFlat(): number {
    const raw = process.env.CHECKOUT_SHIPPING_FLAT;
    if (raw == null || raw === "") return DEFAULT_CHECKOUT_SHIPPING_FLAT;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CHECKOUT_SHIPPING_FLAT;
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  adminFindAll(params: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    from?: string;
    to?: string;
  }) {
    const { status, paymentStatus, search, from, to } = params;
    return this.prisma.order.findMany({
      where: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(search && {
          OR: [
            { orderNumber: stringContainsFilter(search) },
            { customer: { name: stringContainsFilter(search) } },
            { customer: { email: stringContainsFilter(search) } },
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
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: true,
        payments: {
          select: {
            paymentMethod: true,
            paymentStatus: true,
            paymentDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async adminFindOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: { include: { variant: { include: { packSize: true } } } },
        payments: true,
        shipments: true,
      },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async adminUpdate(id: number, dto: AdminUpdateOrderDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: dto,
      include: {
        customer: { select: { name: true, email: true } },
        items: true,
      },
    });
  }

  async adminExportCsv(params: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const orders = (await this.adminFindAll(params)) as AdminOrderCsvRow[];

    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Status",
      "Payment Status",
      "Total Amount",
      "Tax Amount",
      "Shipping Amount",
      "Tracking ID",
      "Notes",
      "Created At",
    ].join(",");

    const rows = orders.map((o) =>
      [
        o.orderNumber,
        `"${o.customer.name}"`,
        o.customer.email,
        o.customer.phone ?? "",
        o.status,
        o.paymentStatus,
        o.totalAmount,
        o.taxAmount,
        o.shippingAmount,
        o.trackingId ?? "",
        `"${(o.notes ?? "").replace(/"/g, '""')}"`,
        o.createdAt.toISOString(),
      ].join(","),
    );

    return [headers, ...rows].join("\n");
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private generateOrderNumber(): string {
    return `ORD-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  private async findOrderByIdempotencyKey(
    customerId: number,
    idempotencyKey: string | null | undefined,
  ) {
    if (!idempotencyKey) {
      return null;
    }
    const record = await this.prisma.checkoutIdempotency.findUnique({
      where: { customerId_key: { customerId, key: idempotencyKey } },
      include: { order: { include: orderDetailInclude } },
    });
    return record?.order ?? null;
  }

  private async loadCartForPlaceOrder(
    cartId: number,
    customerId: number,
  ): Promise<CartForPlaceOrder> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: cartForPlaceOrderInclude,
    });
    if (!cart || cart.customerId !== customerId) {
      throw new NotFoundException("Cart not found");
    }
    if (cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }
    return cart;
  }

  /**
   * When the client sends a coupon code, load the row and validate.
   * No code → no DB call.
   */
  private async loadCouponRowIfCodePresent(
    couponCode: string | null | undefined,
  ): Promise<Coupon | null> {
    const trimmed = couponCode?.trim();
    if (!trimmed) {
      return null;
    }
    const row = await this.prisma.coupon.findUnique({
      where: { code: trimmed.toUpperCase() },
    });
    assertCouponUsable(row);
    return row;
  }

  private assertSubtotalMeetsCouponMinimum(
    subtotal: number,
    pricingSource: OrderPricingSource | null,
  ) {
    if (pricingSource?.minOrderAmount == null) {
      return;
    }
    if (subtotal < Number(pricingSource.minOrderAmount)) {
      throw new BadRequestException("Order subtotal is below coupon minimum");
    }
  }

  private async resolveShippingSnapshot(
    shippingAddressId: number | undefined,
    customerId: number,
  ): Promise<{
    snapshot: Prisma.InputJsonValue | undefined;
    shippingId: number | undefined;
  }> {
    if (shippingAddressId == null) {
      return { snapshot: undefined, shippingId: undefined };
    }
    const addr = await this.prisma.customerAddress.findFirst({
      where: { id: shippingAddressId, customerId },
    });
    if (!addr) {
      throw new BadRequestException(
        `Shipping address #${shippingAddressId} not found for this customer`,
      );
    }
    return {
      shippingId: shippingAddressId,
      snapshot: {
        name: addr.name,
        phone: addr.phone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
      },
    };
  }

  private async applyInventoryForPaymentMode(
    tx: Prisma.TransactionClient,
    items: CartForPlaceOrder["items"],
    paymentMethod: "ONLINE" | "COD",
  ) {
    if (paymentMethod === "COD") {
      await this.deductStockImmediate(tx, items);
    } else {
      await this.reserveStockForOnlineCheckout(tx, items);
    }
  }

  /** COD: permanently reduce on-hand quantity. */
  private async deductStockImmediate(
    tx: Prisma.TransactionClient,
    items: CartForPlaceOrder["items"],
  ) {
    for (const item of items) {
      const updated = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw new BadRequestException(
          `Insufficient stock for variant #${item.variantId}`,
        );
      }
    }
  }

  /** ONLINE: hold units until payment clears or the customer cancels. */
  private async reserveStockForOnlineCheckout(
    tx: Prisma.TransactionClient,
    items: CartForPlaceOrder["items"],
  ) {
    const T = quoteSqlIdentifier("ProductVariant");
    const sq = quoteSqlIdentifier("stockQuantity");
    const rq = quoteSqlIdentifier("reservedQuantity");
    for (const item of items) {
      const rowsAffected = await tx.$executeRawUnsafe(
        `UPDATE ${T} SET ${rq} = ${rq} + ? WHERE id = ? AND (${sq} - ${rq}) >= ?`,
        item.quantity,
        item.variantId,
        item.quantity,
      );
      if (affectedRowsCount(rowsAffected) !== 1) {
        throw new BadRequestException(
          `Insufficient stock to reserve for variant #${item.variantId}`,
        );
      }
    }
  }

  private async validateStockForCheckout(
    items: Array<{ variantId: number; quantity: number }>,
    paymentMethod: "ONLINE" | "COD",
  ) {
    for (const item of items) {
      const v = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (!v) {
        throw new NotFoundException(`Variant #${item.variantId} not found`);
      }
      if (paymentMethod === "COD") {
        if (v.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant #${item.variantId}`,
          );
        }
      } else {
        const sellable = v.stockQuantity - v.reservedQuantity;
        if (sellable < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock to reserve for variant #${item.variantId}`,
          );
        }
      }
    }
  }

  /** Flatten HSN onto each line (snapshot, else live product fallback). */
  private mapOrderDetail<
    T extends {
      items: Array<{
        hsnCode?: string | null;
        variant?: { product?: { hsnCode?: string | null } | null } | null;
        [key: string]: unknown;
      }>;
    },
  >(order: T) {
    return {
      ...order,
      items: order.items.map((item) => {
        const { variant, ...rest } = item;
        return {
          ...rest,
          hsnCode: rest.hsnCode ?? variant?.product?.hsnCode ?? null,
        };
      }),
    };
  }
}

function decimalToNumberOrUndefined(
  d: Prisma.Decimal | null | undefined,
): number | undefined {
  return d != null ? Number(d) : undefined;
}

function decimalToNumberOrNull(
  d: Prisma.Decimal | null | undefined,
): number | null {
  return d != null ? Number(d) : null;
}
