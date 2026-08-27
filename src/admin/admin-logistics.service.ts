import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { stringContainsFilter } from "../common/database-provider.util";
import { OrderStatus, PaymentStatus } from "../product/constants/order-status";
import {
  AdminBookShipmentDto,
  AdminLogisticsWebhookDto,
  AdminNdrAddressDto,
  AdminNdrReattemptDto,
  AdminNdrRtoDto,
  AdminRtoRestockDto,
  AdminWalletRechargeDto,
} from "./dto/admin.dto";

type CourierRate = {
  id: string;
  name: string;
  zones: Record<string, number>;
  perKg: number;
};

const COURIERS: CourierRate[] = [
  {
    id: "delhivery",
    name: "Delhivery",
    zones: { A: 45, B: 62, C: 85, D: 110 },
    perKg: 12,
  },
  {
    id: "bluedart",
    name: "Blue Dart",
    zones: { A: 55, B: 72, C: 95, D: 125 },
    perKg: 15,
  },
  {
    id: "dtdc",
    name: "DTDC",
    zones: { A: 40, B: 58, C: 80, D: 105 },
    perKg: 11,
  },
  {
    id: "xpressbees",
    name: "XpressBees",
    zones: { A: 42, B: 60, C: 82, D: 108 },
    perKg: 10,
  },
];

function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function paginate(pageRaw?: number, limitRaw?: number) {
  const page = Math.max(1, Number(pageRaw) || 1);
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

function paginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function generateAwb(): string {
  return `DLV${Date.now().toString().slice(-7)}`;
}

function calcRate(courierId: string, zone?: string, weightKg?: number): number {
  const courier =
    COURIERS.find((c) => c.id === courierId.toLowerCase()) || COURIERS[0];
  const z = (zone || "B").toUpperCase();
  const base = courier.zones[z] ?? courier.zones.B ?? 62;
  const w = Math.max(0.5, Number(weightKg) || 1);
  return round2(base + Math.max(0, w - 0.5) * courier.perKg);
}

function courierName(courierId: string): string {
  return (
    COURIERS.find((c) => c.id === courierId.toLowerCase())?.name || courierId
  );
}

function zoneFromPincode(pincode: string): string {
  const n = Number(pincode.slice(0, 2));
  if (!Number.isFinite(n)) return "B";
  if (n >= 60 && n <= 64) return "A";
  if (n >= 40 && n <= 49) return "B";
  if (n >= 10 && n <= 29) return "C";
  return "D";
}

function asScanArray(scans: Prisma.JsonValue | null | undefined): Array<{
  status: string;
  location?: string;
  timestamp: string;
}> {
  if (!Array.isArray(scans)) return [];
  return scans as Array<{
    status: string;
    location?: string;
    timestamp: string;
  }>;
}

@Injectable()
export class AdminLogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      readyToShipCount,
      inTransitCount,
      deliveredToday,
      ndrCount,
      rtoCount,
      deliveredShipments,
      config,
      codPending,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.PACKED } }),
      this.prisma.shipment.count({
        where: { status: { in: ["transit", "ofd", "scheduled"] } },
      }),
      this.prisma.shipment.count({
        where: {
          status: "delivered",
          deliveredAt: { gte: startOfDay },
        },
      }),
      this.prisma.shipment.count({ where: { status: "ndr" } }),
      this.prisma.shipment.count({
        where: { status: { in: ["rto_t", "rto_r"] } },
      }),
      this.prisma.shipment.findMany({
        where: {
          status: "delivered",
          shippedAt: { not: null },
          deliveredAt: { not: null },
        },
        select: { shippedAt: true, deliveredAt: true },
        take: 200,
        orderBy: { deliveredAt: "desc" },
      }),
      this.ensureConfig(),
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PENDING,
          payments: { some: { paymentMethod: { in: ["COD", "cod"] } } },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    let avgDeliveryDays = 0;
    if (deliveredShipments.length) {
      const sum = deliveredShipments.reduce((s, sh) => {
        if (!sh.shippedAt || !sh.deliveredAt) return s;
        return (
          s +
          (sh.deliveredAt.getTime() - sh.shippedAt.getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }, 0);
      avgDeliveryDays = round2(sum / deliveredShipments.length);
    }

    return {
      readyToShipCount,
      inTransitCount,
      deliveredToday,
      ndrCount,
      rtoCount,
      avgDeliveryDays,
      walletBalance: round2(toNum(config.walletBalance)),
      codPendingRemit: round2(toNum(codPending._sum.totalAmount)),
    };
  }

  async readyToShip(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.PACKED,
      ...(params.search && {
        OR: [
          { orderNumber: stringContainsFilter(params.search) },
          { customer: { name: stringContainsFilter(params.search) } },
          { customer: { email: stringContainsFilter(params.search) } },
        ],
      }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          shippingAddress: true,
          items: {
            select: {
              productName: true,
              quantity: true,
              sizeLabel: true,
            },
          },
        },
        orderBy: { updatedAt: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => ({
        id: o.id,
        orderId: o.orderNumber,
        customer: o.customer,
        totalAmount: round2(toNum(o.totalAmount)),
        paymentStatus: o.paymentStatus,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        shippingAddress: o.shippingAddress,
        packedAt: o.updatedAt.toISOString(),
      })),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async listShipments(params: {
    search?: string;
    status?: string;
    courier?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const where: Prisma.ShipmentWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.courier && {
        courierName: stringContainsFilter(params.courier),
      }),
      ...(params.search && {
        OR: [
          { trackingNumber: stringContainsFilter(params.search) },
          { order: { orderNumber: stringContainsFilter(params.search) } },
          {
            order: {
              customer: { name: stringContainsFilter(params.search) },
            },
          },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      shipments: rows.map((s) => this.mapShipmentListItem(s)),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async getShipment(awb: string) {
    const s = await this.requireShipmentByAwb(awb);
    const scans = asScanArray(s.scans);
    return {
      awb: s.trackingNumber,
      orderId: s.order.orderNumber,
      customer: s.order.customer,
      courier: s.courierName,
      status: s.status,
      zone: s.zone,
      weightKg: s.weightKg != null ? toNum(s.weightKg) : null,
      codAmount: round2(toNum(s.codAmount)),
      rate: s.rate != null ? round2(toNum(s.rate)) : null,
      ndrReason: s.ndrReason,
      lastLocation: s.lastLocation,
      timeline: scans.map((sc) => ({
        status: sc.status,
        location: sc.location,
        at: sc.timestamp,
      })),
    };
  }

  async bookShipment(orderId: number, dto: AdminBookShipmentDto) {
    if (!dto.courierId?.trim()) {
      throw new BadRequestException("courierId is required");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { orderBy: { paymentDate: "desc" }, take: 1 },
        shipments: { orderBy: { id: "desc" }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    const zone = (dto.zone || "B").toUpperCase();
    const weightKg = dto.weightKg ?? 1;
    const rate = calcRate(dto.courierId, zone, weightKg);
    const awb = generateAwb();
    const courier = courierName(dto.courierId);
    const isCod =
      order.payments[0]?.paymentMethod?.toLowerCase() === "cod" &&
      order.paymentStatus !== PaymentStatus.PAID;
    const codAmount = isCod ? toNum(order.totalAmount) : 0;

    const pickupScheduledFor = new Date();
    pickupScheduledFor.setDate(pickupScheduledFor.getDate() + 1);
    pickupScheduledFor.setHours(10, 0, 0, 0);

    const result = await this.prisma.$transaction(async (tx) => {
      const config = await this.ensureConfigTx(tx);
      const balance = toNum(config.walletBalance);
      if (balance < rate) {
        throw new BadRequestException(
          `Insufficient logistics wallet balance (${balance}) for rate ${rate}`,
        );
      }

      const newBalance = round2(balance - rate);
      await tx.logisticsConfig.update({
        where: { id: 1 },
        data: { walletBalance: newBalance },
      });
      await tx.logisticsWalletTxn.create({
        data: {
          amount: -rate,
          paymentReference: `ship_${awb}`,
          balanceAfter: newBalance,
        },
      });

      const existing = order.shipments[0];
      const scan = {
        status: "scheduled",
        location: "Origin warehouse",
        timestamp: new Date().toISOString(),
      };

      const shipment = existing
        ? await tx.shipment.update({
            where: { id: existing.id },
            data: {
              courierName: courier,
              trackingNumber: awb,
              status: "scheduled",
              shippedAt: new Date(),
              zone,
              weightKg,
              codAmount,
              rate,
              scans: [scan] as Prisma.InputJsonValue,
              lastScanAt: new Date(),
              lastLocation: scan.location,
            },
          })
        : await tx.shipment.create({
            data: {
              orderId: order.id,
              courierName: courier,
              trackingNumber: awb,
              status: "scheduled",
              shippedAt: new Date(),
              zone,
              weightKg,
              codAmount,
              rate,
              scans: [scan] as Prisma.InputJsonValue,
              lastScanAt: new Date(),
              lastLocation: scan.location,
            },
          });

      if (order.status === OrderStatus.PACKED) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.SHIPPED,
            trackingId: awb,
          },
        });
      } else {
        await tx.order.update({
          where: { id: order.id },
          data: { trackingId: awb },
        });
      }

      return { shipment, walletBalance: newBalance };
    });

    return {
      awb: result.shipment.trackingNumber,
      orderId: order.orderNumber,
      courier,
      status: result.shipment.status,
      rate,
      walletBalance: result.walletBalance,
      pickupScheduledFor: pickupScheduledFor.toISOString(),
    };
  }

  async tracking(awb: string) {
    const s = await this.requireShipmentByAwb(awb);
    return {
      awb: s.trackingNumber,
      status: s.status,
      scans: asScanArray(s.scans),
    };
  }

  async webhook(dto: AdminLogisticsWebhookDto) {
    if (!dto.awb?.trim() || !dto.status?.trim()) {
      throw new BadRequestException("awb and status are required");
    }

    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber: dto.awb },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment AWB "${dto.awb}" not found`);
    }

    const ts = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const scans = asScanArray(shipment.scans);
    scans.push({
      status: dto.status,
      location: dto.location,
      timestamp: ts.toISOString(),
    });

    const data: Prisma.ShipmentUpdateInput = {
      status: dto.status,
      lastLocation: dto.location ?? shipment.lastLocation,
      lastScanAt: ts,
      scans: scans as Prisma.InputJsonValue,
    };

    if (dto.status === "delivered") {
      data.deliveredAt = ts;
      await this.prisma.$transaction([
        this.prisma.shipment.update({ where: { id: shipment.id }, data }),
        this.prisma.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.DELIVERED },
        }),
      ]);
    } else if (dto.status === "transit" || dto.status === "ofd") {
      await this.prisma.shipment.update({ where: { id: shipment.id }, data });
    } else {
      await this.prisma.shipment.update({ where: { id: shipment.id }, data });
    }

    return { received: true };
  }

  async listNdr(params: {
    search?: string;
    reason?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const where: Prisma.ShipmentWhereInput = {
      status: "ndr",
      ...(params.reason && {
        ndrReason: stringContainsFilter(params.reason),
      }),
      ...(params.search && {
        OR: [
          { trackingNumber: stringContainsFilter(params.search) },
          { order: { orderNumber: stringContainsFilter(params.search) } },
          {
            order: {
              customer: { name: stringContainsFilter(params.search) },
            },
          },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
        },
        orderBy: { lastScanAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      ndrs: rows.map((s) => ({
        awb: s.trackingNumber,
        orderId: s.order.orderNumber,
        customer: s.order.customer,
        reason: s.ndrReason,
        note: s.ndrNote,
        lastLocation: s.lastLocation,
        lastScanAt: s.lastScanAt?.toISOString() ?? null,
      })),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async ndrReattempt(awb: string, dto: AdminNdrReattemptDto) {
    const shipment = await this.requireShipmentByAwb(awb);
    const reattemptScheduledFor = new Date();
    reattemptScheduledFor.setDate(reattemptScheduledFor.getDate() + 1);

    const scans = asScanArray(shipment.scans);
    scans.push({
      status: "transit",
      location: shipment.lastLocation || "NDR reattempt",
      timestamp: new Date().toISOString(),
    });

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "transit",
        ndrNote: dto.note ?? shipment.ndrNote,
        scans: scans as Prisma.InputJsonValue,
        lastScanAt: new Date(),
      },
    });

    return {
      awb: shipment.trackingNumber,
      status: "transit",
      reattemptScheduledFor: reattemptScheduledFor.toISOString(),
    };
  }

  async ndrAddress(awb: string, dto: AdminNdrAddressDto) {
    if (!dto.address?.trim()) {
      throw new BadRequestException("address is required");
    }
    const shipment = await this.requireShipmentByAwb(awb);
    const reattemptScheduledFor = new Date();
    reattemptScheduledFor.setDate(reattemptScheduledFor.getDate() + 1);

    const scans = asScanArray(shipment.scans);
    scans.push({
      status: "address_updated",
      location: dto.address,
      timestamp: new Date().toISOString(),
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "transit",
          ndrNote: [
            shipment.ndrNote,
            `Address update: ${dto.address}`,
            dto.phone ? `Phone: ${dto.phone}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
          lastLocation: dto.address,
          scans: scans as Prisma.InputJsonValue,
          lastScanAt: new Date(),
        },
      });

      if (dto.phone || dto.address) {
        const order = await tx.order.findUnique({
          where: { id: shipment.orderId },
          select: { shippingAddressId: true, addressSnapshot: true },
        });
        if (order?.shippingAddressId && dto.phone) {
          await tx.customerAddress.update({
            where: { id: order.shippingAddressId },
            data: { phone: dto.phone },
          });
        }
        const snap =
          order?.addressSnapshot &&
          typeof order.addressSnapshot === "object" &&
          !Array.isArray(order.addressSnapshot)
            ? { ...(order.addressSnapshot as Record<string, unknown>) }
            : {};
        snap.addressLine1 = dto.address;
        if (dto.phone) snap.phone = dto.phone;
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { addressSnapshot: snap as Prisma.InputJsonValue },
        });
      }
    });

    return {
      awb: shipment.trackingNumber,
      addressUpdated: true,
      reattemptScheduledFor: reattemptScheduledFor.toISOString(),
    };
  }

  async ndrToRto(awb: string, dto: AdminNdrRtoDto) {
    if (!dto.reason?.trim()) {
      throw new BadRequestException("reason is required");
    }
    const shipment = await this.requireShipmentByAwb(awb);
    const scans = asScanArray(shipment.scans);
    scans.push({
      status: "rto_t",
      location: shipment.lastLocation || undefined,
      timestamp: new Date().toISOString(),
    });

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "rto_t",
        rtoReason: dto.reason,
        scans: scans as Prisma.InputJsonValue,
        lastScanAt: new Date(),
      },
    });

    return {
      awb: shipment.trackingNumber,
      status: "rto_t",
    };
  }

  async listRto(params: { status?: string; page?: number; limit?: number }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const where: Prisma.ShipmentWhereInput = {
      status: params.status
        ? params.status
        : { in: ["rto_t", "rto_r", "closed"] },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      rtos: rows.map((s) => ({
        awb: s.trackingNumber,
        orderId: s.order.orderNumber,
        customer: s.order.customer,
        status: s.status,
        reason: s.rtoReason,
        qcResult: s.qcResult,
        receivedAt: s.receivedAt?.toISOString() ?? null,
      })),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async rtoReceive(awb: string) {
    const shipment = await this.requireShipmentByAwb(awb);
    const now = new Date();
    const scans = asScanArray(shipment.scans);
    scans.push({
      status: "rto_r",
      location: "Warehouse",
      timestamp: now.toISOString(),
    });

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "rto_r",
        receivedAt: now,
        scans: scans as Prisma.InputJsonValue,
        lastScanAt: now,
        lastLocation: "Warehouse",
      },
    });

    return {
      awb: shipment.trackingNumber,
      status: "rto_r",
      receivedAt: now.toISOString(),
    };
  }

  async rtoRestock(awb: string, dto: AdminRtoRestockDto) {
    if (!dto.qcResult?.trim()) {
      throw new BadRequestException("qcResult is required");
    }
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException("quantity must be a positive integer");
    }

    const shipment = await this.requireShipmentByAwb(awb);
    const variant = await this.resolveVariant(dto.variantId);

    const passed = ["pass", "passed", "ok", "good"].includes(
      dto.qcResult.trim().toLowerCase(),
    );

    await this.prisma.$transaction(async (tx) => {
      if (passed) {
        const before = await tx.product.findUniqueOrThrow({
          where: { id: variant.productId },
          select: { stock: true, reservedStock: true },
        });
        await tx.product.update({
          where: { id: variant.productId },
          data: { stock: { increment: dto.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            type: "restock",
            quantityChange: dto.quantity,
            stockBefore: before.stock,
            stockAfter: before.stock + dto.quantity,
            reservedBefore: before.reservedStock,
            reservedAfter: before.reservedStock,
            reason: "rto_qc_pass",
            referenceType: "shipment",
            referenceId: shipment.id,
            actorType: "admin",
          },
        });
      }
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "closed",
          qcResult: dto.qcResult,
        },
      });
    });

    return {
      awb: shipment.trackingNumber,
      status: "closed",
      restocked: passed,
      quantity: dto.quantity,
    };
  }

  rates(zone?: string, weightKg?: number) {
    const z = (zone || "B").toUpperCase();
    const w = weightKg != null ? Number(weightKg) : 1;
    return {
      couriers: COURIERS.map((c) => ({
        id: c.id,
        name: c.name,
        zone: z,
        weightKg: w,
        rate: calcRate(c.id, z, w),
        etaDays: z === "A" ? 2 : z === "B" ? 3 : z === "C" ? 4 : 5,
      })),
    };
  }

  serviceability(pincode: string) {
    if (!/^\d{6}$/.test(pincode)) {
      throw new BadRequestException("pincode must be a 6-digit string");
    }
    const zone = zoneFromPincode(pincode);
    const serviceable = !pincode.startsWith("000");
    return {
      pincode,
      serviceable,
      zone,
      codAvailable: serviceable && zone !== "D",
      couriers: serviceable
        ? COURIERS.map((c) => ({
            id: c.id,
            name: c.name,
            rate: calcRate(c.id, zone, 1),
          }))
        : [],
    };
  }

  async getConfig() {
    const config = await this.ensureConfig();
    return {
      defaultCourier: config.defaultCourier,
      autoNdrReattemptLimit: config.autoNdrReattemptLimit,
      rtoAutoCloseDays: config.rtoAutoCloseDays,
      walletLowBalanceThreshold: round2(
        toNum(config.walletLowBalanceThreshold),
      ),
      walletBalance: round2(toNum(config.walletBalance)),
    };
  }

  async walletRecharge(dto: AdminWalletRechargeDto) {
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException("amount must be a positive number");
    }

    const creditedAt = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await this.ensureConfigTx(tx);
      const updated = await tx.logisticsConfig.update({
        where: { id: 1 },
        data: { walletBalance: { increment: dto.amount } },
      });
      await tx.logisticsWalletTxn.create({
        data: {
          amount: dto.amount,
          paymentReference: dto.paymentReference,
          balanceAfter: updated.walletBalance,
        },
      });
      return updated;
    });

    return {
      walletBalance: round2(toNum(result.walletBalance)),
      amountCredited: round2(dto.amount),
      creditedAt: creditedAt.toISOString(),
    };
  }

  private mapShipmentListItem(s: {
    trackingNumber: string | null;
    courierName: string | null;
    status: string;
    zone: string | null;
    weightKg: Prisma.Decimal | null;
    codAmount: Prisma.Decimal | null;
    rate: Prisma.Decimal | null;
    lastLocation: string | null;
    order: {
      orderNumber: string;
      customer: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
      };
    };
  }) {
    return {
      awb: s.trackingNumber,
      orderId: s.order.orderNumber,
      customer: s.order.customer,
      courier: s.courierName,
      status: s.status,
      zone: s.zone,
      weightKg: s.weightKg != null ? toNum(s.weightKg) : null,
      codAmount: round2(toNum(s.codAmount)),
      rate: s.rate != null ? round2(toNum(s.rate)) : null,
      lastLocation: s.lastLocation,
    };
  }

  private async requireShipmentByAwb(awb: string) {
    const s = await this.prisma.shipment.findFirst({
      where: { trackingNumber: awb },
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });
    if (!s) throw new NotFoundException(`Shipment AWB "${awb}" not found`);
    return s;
  }

  private async resolveVariant(variantId: number | string) {
    const asNum = Number(variantId);
    if (Number.isFinite(asNum) && String(asNum) === String(variantId)) {
      const v = await this.prisma.productVariant.findUnique({
        where: { id: asNum },
        select: { id: true, sku: true, productId: true },
      });
      if (!v) throw new NotFoundException(`Variant #${variantId} not found`);
      return v;
    }

    const sku = String(variantId);
    const bySku = await this.prisma.productVariant.findFirst({
      where: { sku },
      select: { id: true, sku: true, productId: true },
    });
    if (!bySku) {
      throw new NotFoundException(`Variant "${variantId}" not found`);
    }
    return bySku;
  }

  private async ensureConfig() {
    const existing = await this.prisma.logisticsConfig.findUnique({
      where: { id: 1 },
    });
    if (existing) return existing;
    return this.prisma.logisticsConfig.create({ data: { id: 1 } });
  }

  private async ensureConfigTx(tx: Prisma.TransactionClient) {
    const existing = await tx.logisticsConfig.findUnique({
      where: { id: 1 },
    });
    if (existing) return existing;
    return tx.logisticsConfig.create({ data: { id: 1 } });
  }
}
