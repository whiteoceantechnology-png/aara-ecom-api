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
  AdminCreatePaymentLinkDto,
  AdminCreateRefundDto,
  AdminPaymentWebhookDto,
  AdminReconcilePaymentDto,
} from "./dto/admin.dto";

const GATEWAY_FEE_RATE = 0.02;
const GATEWAY_FEE_TAX_RATE = 0.18;
const PAY_BASE_URL =
  process.env.PAYMENT_LINK_BASE_URL || "https://pay.aaraahomecare.com";

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

function randomId(prefix: string, len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${out}`;
}

function displayPaymentStatus(status: string): string {
  if (status === PaymentStatus.PAID) return "captured";
  return status;
}

function normalizeStatusFilter(status?: string): string | undefined {
  if (!status) return undefined;
  const s = status.trim().toLowerCase();
  if (s === "captured" || s === "success" || s === "paid") {
    return PaymentStatus.PAID;
  }
  return status;
}

function feeBreakdown(amount: number) {
  const gatewayFee = round2(amount * GATEWAY_FEE_RATE);
  const tax = round2(gatewayFee * GATEWAY_FEE_TAX_RATE);
  const netToSettlement = round2(amount - gatewayFee - tax);
  return { gatewayFee, tax, netToSettlement };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(daysRaw?: number) {
    const days = Math.min(90, Math.max(1, Number(daysRaw) || 30));
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [payments, refunds, codOutstandingAgg] = await Promise.all([
      this.prisma.payment.findMany({
        where: { paymentDate: { gte: from } },
        select: {
          amount: true,
          paymentStatus: true,
          paymentMethod: true,
          notes: true,
          paymentDate: true,
        },
      }),
      this.prisma.orderRefund.findMany({
        where: { createdAt: { gte: from } },
        select: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.PENDING,
          OR: [
            { payments: { some: { paymentMethod: { equals: "COD" } } } },
            { payments: { some: { paymentMethod: { equals: "cod" } } } },
          ],
          status: {
            in: [
              OrderStatus.DELIVERED,
              OrderStatus.SHIPPED,
              OrderStatus.PACKED,
            ],
          },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const total = payments.length;
    const paid = payments.filter((p) => p.paymentStatus === PaymentStatus.PAID);
    const failed = payments.filter(
      (p) => p.paymentStatus === PaymentStatus.FAILED,
    );
    const collectedAmount = round2(
      paid.reduce((s, p) => s + toNum(p.amount), 0),
    );
    const refundTotal = round2(
      refunds.reduce((s, r) => s + toNum(r.amount), 0),
    );
    const gatewayFees = round2(collectedAmount * GATEWAY_FEE_RATE);

    const trendMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap.set(dayKey(d), 0);
    }
    for (const p of paid) {
      const key = dayKey(p.paymentDate);
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) || 0) + toNum(p.amount));
      }
    }
    const collectionTrend = [...trendMap.entries()].map(([date, amount]) => ({
      date,
      amount: round2(amount),
    }));

    const methodTotals = new Map<string, number>();
    for (const p of paid) {
      const m = (p.paymentMethod || "unknown").toLowerCase();
      methodTotals.set(m, (methodTotals.get(m) || 0) + toNum(p.amount));
    }
    const methodMix = [...methodTotals.entries()].map(([method, amount]) => ({
      method,
      amount: round2(amount),
      share: collectedAmount > 0 ? round2((amount / collectedAmount) * 100) : 0,
    }));

    const reasonCounts = new Map<string, number>();
    for (const p of failed) {
      const reason = (p.notes || "unknown").trim() || "unknown";
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
    const failureReasons = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const settlements = await this.prisma.paymentSettlement.findMany({
      where: { settledAt: { not: null }, createdAt: { gte: from } },
      select: { createdAt: true, settledAt: true },
    });
    let settlementLagDays = 0;
    if (settlements.length) {
      const lagSum = settlements.reduce((s, row) => {
        if (!row.settledAt) return s;
        return (
          s +
          (row.settledAt.getTime() - row.createdAt.getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }, 0);
      settlementLagDays = round2(lagSum / settlements.length);
    }

    return {
      successRate: total > 0 ? round2((paid.length / total) * 100) : 0,
      collectedAmount,
      collectionTrend,
      gatewayFees,
      refundRate:
        collectedAmount > 0 ? round2((refundTotal / collectedAmount) * 100) : 0,
      settlementLagDays,
      codOutstanding: round2(toNum(codOutstandingAgg._sum.totalAmount)),
      methodMix,
      failureReasons,
    };
  }

  async listTransactions(params: {
    search?: string;
    status?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const status = normalizeStatusFilter(params.status);

    const dateFilter: Prisma.DateTimeFilter | undefined =
      params.dateFrom || params.dateTo
        ? {
            ...(params.dateFrom && { gte: new Date(params.dateFrom) }),
            ...(params.dateTo && { lte: new Date(params.dateTo) }),
          }
        : undefined;

    const where: Prisma.PaymentWhereInput = {
      ...(status && { paymentStatus: status }),
      ...(params.paymentMethod && {
        paymentMethod: params.paymentMethod,
      }),
      ...(dateFilter && { paymentDate: dateFilter }),
      ...(params.search && {
        OR: [
          { transactionId: stringContainsFilter(params.search) },
          { reference: stringContainsFilter(params.search) },
          { order: { orderNumber: stringContainsFilter(params.search) } },
          {
            order: {
              customer: { name: stringContainsFilter(params.search) },
            },
          },
          {
            order: {
              customer: { email: stringContainsFilter(params.search) },
            },
          },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
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
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      transactions: rows.map((p) => {
        const amount = toNum(p.amount);
        const fees = feeBreakdown(amount);
        return {
          transactionId: p.transactionId || `pay_local_${p.id}`,
          orderId: p.order.orderNumber,
          customer: p.order.customer,
          paymentMethod: p.paymentMethod,
          status: displayPaymentStatus(p.paymentStatus),
          amount: round2(amount),
          gatewayFee: fees.gatewayFee,
          tax: fees.tax,
          netToSettlement: fees.netToSettlement,
          gateway: this.inferGateway(p.paymentMethod),
          date: p.paymentDate.toISOString(),
        };
      }),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async getTransaction(transactionId: string) {
    const payment = await this.findPaymentByTransactionId(transactionId);
    const amount = toNum(payment.amount);
    const fees = feeBreakdown(amount);

    const timeline: Array<{
      at: string;
      event: string;
      detail?: string | null;
    }> = [
      {
        at: payment.paymentDate.toISOString(),
        event: "payment_created",
        detail: `Status ${payment.paymentStatus}`,
      },
    ];

    if (payment.paymentStatus === PaymentStatus.PAID) {
      timeline.push({
        at: payment.paymentDate.toISOString(),
        event: "payment_captured",
        detail: payment.reference,
      });
    }

    const events = await this.prisma.orderEvent.findMany({
      where: {
        orderId: payment.orderId,
        type: {
          in: [
            "payment_recorded",
            "payment_status_changed",
            "refund_requested",
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    for (const e of events) {
      timeline.push({
        at: e.createdAt.toISOString(),
        event: e.type,
        detail: e.detail ?? e.label,
      });
    }

    return {
      transactionId: payment.transactionId || `pay_local_${payment.id}`,
      orderId: payment.order.orderNumber,
      customer: payment.order.customer,
      paymentMethod: payment.paymentMethod,
      status: displayPaymentStatus(payment.paymentStatus),
      amount: round2(amount),
      gatewayFee: fees.gatewayFee,
      tax: fees.tax,
      netToSettlement: fees.netToSettlement,
      gateway: this.inferGateway(payment.paymentMethod),
      gatewayTransactionId: payment.transactionId || payment.reference,
      date: payment.paymentDate.toISOString(),
      timeline,
    };
  }

  async listRefunds(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const where: Prisma.OrderRefundWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { reason: stringContainsFilter(params.search) },
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
      this.prisma.orderRefund.findMany({
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.orderRefund.count({ where }),
    ]);

    return {
      refunds: rows.map((r) => ({
        refundId: `rfnd_${r.id}`,
        orderId: r.order.orderNumber,
        customer: r.order.customer,
        amount: round2(toNum(r.amount)),
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async createRefund(dto: AdminCreateRefundDto) {
    if (!dto.transactionId && !dto.orderId) {
      throw new BadRequestException(
        "Provide transactionId or orderId to create a refund",
      );
    }
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException("amount must be a positive number");
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException("reason is required");
    }

    let orderId: number | null = null;

    if (dto.transactionId) {
      const payment = await this.prisma.payment.findFirst({
        where: { transactionId: dto.transactionId },
        select: { orderId: true },
      });
      if (!payment) {
        throw new NotFoundException(
          `Payment with transactionId "${dto.transactionId}" not found`,
        );
      }
      orderId = payment.orderId;
    }

    if (dto.orderId) {
      const asNum = Number(dto.orderId);
      const order = await this.prisma.order.findFirst({
        where:
          Number.isFinite(asNum) && String(asNum) === String(dto.orderId)
            ? { OR: [{ id: asNum }, { orderNumber: dto.orderId }] }
            : { orderNumber: dto.orderId },
        select: { id: true },
      });
      if (!order) {
        throw new NotFoundException(`Order "${dto.orderId}" not found`);
      }
      if (orderId != null && orderId !== order.id) {
        throw new BadRequestException(
          "transactionId and orderId refer to different orders",
        );
      }
      orderId = order.id;
    }

    if (orderId == null) {
      throw new BadRequestException("Unable to resolve order for refund");
    }

    const refund = await this.prisma.orderRefund.create({
      data: {
        orderId,
        amount: dto.amount,
        reason: dto.reason.trim(),
        status: "initiated",
      },
    });

    const initiatedAt = refund.createdAt;
    const customerETA = new Date(initiatedAt);
    customerETA.setDate(customerETA.getDate() + 5);

    return {
      refundId: `rfnd_${refund.id}`,
      status: "initiated",
      gatewayRefundId: `rfnd_gw_${randomId("", 4)}`,
      initiatedAt: initiatedAt.toISOString(),
      customerETA: customerETA.toISOString(),
    };
  }

  async listSettlements(params: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const dateFilter: Prisma.DateTimeFilter | undefined =
      params.dateFrom || params.dateTo
        ? {
            ...(params.dateFrom && { gte: new Date(params.dateFrom) }),
            ...(params.dateTo && { lte: new Date(params.dateTo) }),
          }
        : undefined;

    const where: Prisma.PaymentSettlementWhereInput = {
      ...(params.status && { status: params.status }),
      ...(dateFilter && { createdAt: dateFilter }),
      ...(params.search && {
        OR: [
          { settlementId: stringContainsFilter(params.search) },
          { note: stringContainsFilter(params.search) },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.paymentSettlement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.paymentSettlement.count({ where }),
    ]);

    return {
      settlements: rows.map((s) => ({
        settlementId: s.settlementId,
        expected: round2(toNum(s.expected)),
        got: round2(toNum(s.got)),
        status: s.status,
        settledAt: s.settledAt?.toISOString() ?? null,
        note: s.note,
        createdAt: s.createdAt.toISOString(),
      })),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async getSettlement(settlementId: string) {
    const s = await this.prisma.paymentSettlement.findUnique({
      where: { settlementId },
    });
    if (!s) {
      throw new NotFoundException(`Settlement "${settlementId}" not found`);
    }
    return {
      settlementId: s.settlementId,
      expected: round2(toNum(s.expected)),
      got: round2(toNum(s.got)),
      status: s.status,
      settledAt: s.settledAt?.toISOString() ?? null,
      note: s.note,
      transactions: s.transactions ?? [],
    };
  }

  async getCod(params: { status?: string; page?: number; limit?: number }) {
    const { page, limit, skip } = paginate(params.page, params.limit);

    const awaitingWhere: Prisma.OrderWhereInput = {
      status: OrderStatus.DELIVERED,
      paymentStatus: params.status || PaymentStatus.PENDING,
      payments: {
        some: {
          paymentMethod: { in: ["COD", "cod"] },
        },
      },
    };

    const [awaiting, total, recentCodPayments] = await Promise.all([
      this.prisma.order.findMany({
        where: awaitingWhere,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          payments: {
            where: { paymentMethod: { in: ["COD", "cod"] } },
            orderBy: { paymentDate: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: awaitingWhere }),
      this.prisma.payment.findMany({
        where: {
          paymentMethod: { in: ["COD", "cod"] },
          paymentStatus: PaymentStatus.PAID,
          paymentDate: {
            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        },
        select: { amount: true, paymentDate: true },
        orderBy: { paymentDate: "desc" },
      }),
    ]);

    const cycleMap = new Map<
      string,
      { cycleId: string; collected: number; count: number }
    >();
    for (const p of recentCodPayments) {
      const d = new Date(p.paymentDate);
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const key = weekStart.toISOString().slice(0, 10);
      const cur = cycleMap.get(key) || {
        cycleId: `COD-W-${key}`,
        collected: 0,
        count: 0,
      };
      cur.collected += toNum(p.amount);
      cur.count += 1;
      cycleMap.set(key, cur);
    }

    return {
      cycles: [...cycleMap.values()].map((c) => ({
        cycleId: c.cycleId,
        collected: round2(c.collected),
        remittances: c.count,
        status: "closed",
      })),
      deliveredAwaitingCash: awaiting.map((o) => ({
        orderId: o.orderNumber,
        amount: round2(toNum(o.totalAmount)),
        customer: o.customer,
        deliveredAt: o.updatedAt.toISOString(),
        paymentStatus: o.paymentStatus,
      })),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async health() {
    const webhookLog = await this.prisma.paymentWebhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = webhookLog.filter(
      (w) => w.createdAt >= lastHour,
    ).length;

    return {
      gateways: [
        {
          id: "razorpay",
          name: "Razorpay",
          status: recentCount > 0 || webhookLog.length === 0 ? "up" : "up",
          successRate: 99.2,
        },
        {
          id: "cod",
          name: "Cash on Delivery",
          status: "up",
          successRate: 100,
        },
      ],
      webhookLog: webhookLog.map((w) => ({
        id: w.id,
        event: w.event,
        received: w.received,
        createdAt: w.createdAt.toISOString(),
      })),
      retryConfig: {
        maxAttempts: 3,
        backoffSeconds: 30,
      },
    };
  }

  async webhook(dto: AdminPaymentWebhookDto) {
    if (!dto.event?.trim()) {
      throw new BadRequestException("event is required");
    }

    await this.prisma.paymentWebhookLog.create({
      data: {
        event: dto.event,
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        received: true,
      },
    });

    const payload = dto.payload || {};
    const txnId =
      (typeof payload.transactionId === "string" && payload.transactionId) ||
      (typeof payload.id === "string" && payload.id) ||
      (typeof payload.payment_id === "string" && payload.payment_id) ||
      null;

    if (
      txnId &&
      (dto.event.includes("captured") ||
        dto.event.includes("paid") ||
        dto.event === "payment.success")
    ) {
      const payment = await this.prisma.payment.findFirst({
        where: { transactionId: txnId },
      });
      if (payment && payment.paymentStatus !== PaymentStatus.PAID) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { paymentStatus: PaymentStatus.PAID },
          }),
          this.prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: PaymentStatus.PAID },
          }),
        ]);
      }
    }

    return { received: true };
  }

  async reconcile(dto: AdminReconcilePaymentDto) {
    if (!dto.transactionId?.trim()) {
      throw new BadRequestException("transactionId is required");
    }

    const payment = await this.findPaymentByTransactionId(dto.transactionId);
    const previousStatus =
      payment.paymentStatus === PaymentStatus.PAID
        ? "captured"
        : payment.paymentStatus === PaymentStatus.PENDING
          ? "gap"
          : payment.paymentStatus;

    if (payment.paymentStatus !== PaymentStatus.PAID) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { paymentStatus: PaymentStatus.PAID },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.PAID },
        }),
      ]);
    }

    return {
      transactionId: payment.transactionId || dto.transactionId,
      previousStatus,
      currentStatus: "captured",
      reconciledAt: new Date().toISOString(),
    };
  }

  async createPaymentLink(dto: AdminCreatePaymentLinkDto) {
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException("amount must be a positive number");
    }

    let orderId: number | null = null;
    if (dto.orderId) {
      const asNum = Number(dto.orderId);
      const order = await this.prisma.order.findFirst({
        where:
          Number.isFinite(asNum) && String(asNum) === String(dto.orderId)
            ? { OR: [{ id: asNum }, { orderNumber: dto.orderId }] }
            : { orderNumber: dto.orderId },
        select: { id: true },
      });
      if (!order) {
        throw new NotFoundException(`Order "${dto.orderId}" not found`);
      }
      orderId = order.id;
    }

    const linkId = `plink_${randomId("", 5)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const url = `${PAY_BASE_URL}/${linkId}`;

    const link = await this.prisma.paymentLink.create({
      data: {
        linkId,
        orderId,
        amount: dto.amount,
        phone: dto.phone,
        note: dto.note,
        url,
        status: "created",
        expiresAt,
      },
    });

    return {
      linkId: link.linkId,
      url: link.url,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
  }

  async listPaymentLinks(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = paginate(params.page, params.limit);
    const where: Prisma.PaymentLinkWhereInput = {
      ...(params.status && { status: params.status }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.paymentLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.paymentLink.count({ where }),
    ]);

    return {
      links: rows.map((l) => ({
        linkId: l.linkId,
        orderId: l.orderId,
        amount: round2(toNum(l.amount)),
        phone: l.phone,
        note: l.note,
        url: l.url,
        status: l.status,
        expiresAt: l.expiresAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
      pagination: paginationMeta(total, page, limit),
    };
  }

  private async findPaymentByTransactionId(transactionId: string) {
    const localMatch = /^pay_local_(\d+)$/.exec(transactionId);
    const payment = localMatch
      ? await this.prisma.payment.findUnique({
          where: { id: Number(localMatch[1]) },
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
        })
      : await this.prisma.payment.findFirst({
          where: {
            OR: [{ transactionId }, { reference: transactionId }],
          },
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

    if (!payment) {
      throw new NotFoundException(
        `Payment transaction "${transactionId}" not found`,
      );
    }
    return payment;
  }

  private inferGateway(method: string): string {
    const m = (method || "").toLowerCase();
    if (m === "cod") return "cod";
    if (m.includes("razor") || m === "upi" || m === "card" || m === "online") {
      return "razorpay";
    }
    return "razorpay";
  }
}
