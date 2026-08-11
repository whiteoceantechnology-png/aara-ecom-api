import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus } from "../product/constants/order-status";

const ALLOWED_RANGES = [7, 30, 90] as const;
export type DashboardRange = (typeof ALLOWED_RANGES)[number];

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  parseRange(raw?: string): DashboardRange {
    if (raw == null || raw === "") return 30;
    const n = Number(raw);
    if (!ALLOWED_RANGES.includes(n as DashboardRange)) {
      throw new BadRequestException("range must be one of 7, 30, 90");
    }
    return n as DashboardRange;
  }

  private periodWindow(range: DashboardRange, now = new Date()) {
    const currentTo = now;
    const currentFrom = new Date(now);
    currentFrom.setDate(currentFrom.getDate() - range);
    const previousTo = new Date(currentFrom);
    const previousFrom = new Date(currentFrom);
    previousFrom.setDate(previousFrom.getDate() - range);
    return { currentFrom, currentTo, previousFrom, previousTo };
  }

  private async lowStockThreshold(): Promise<number> {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { id: 1 },
      select: { lowStockThreshold: true },
    });
    return settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  }

  async getSummary(rangeRaw?: string) {
    const range = this.parseRange(rangeRaw);
    const { currentFrom, currentTo, previousFrom, previousTo } =
      this.periodWindow(range);
    const threshold = await this.lowStockThreshold();

    const paidCurrent: Prisma.OrderWhereInput = {
      paymentStatus: "paid",
      createdAt: { gte: currentFrom, lte: currentTo },
    };
    const paidPrevious: Prisma.OrderWhereInput = {
      paymentStatus: "paid",
      createdAt: { gte: previousFrom, lt: previousTo },
    };

    const [
      currentAgg,
      previousAgg,
      currentOrders,
      awaitingFulfillment,
      lowStockCount,
      totalCustomers,
      totalProducts,
      recentOrders,
      topProducts,
      ordersByStatus,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: paidCurrent,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.order.aggregate({
        where: paidPrevious,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        where: paidCurrent,
        select: { createdAt: true, totalAmount: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.order.count({
        where: {
          OR: [
            { status: OrderStatus.PROCESSING },
            { status: OrderStatus.LEGACY_PENDING },
            {
              paymentStatus: "paid",
              status: { in: [OrderStatus.PENDING_PAYMENT, "pending"] },
            },
          ],
        },
      }),
      this.prisma.productVariant.count({
        where: {
          status: true,
          stockQuantity: { lte: threshold },
        },
      }),
      this.prisma.customer.count(),
      this.prisma.product.count({ where: { status: true } }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      this.prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: currentFrom, lte: currentTo } },
        _count: { id: true },
      }),
    ]);

    const collectedRevenue = Number(currentAgg._sum.totalAmount ?? 0);
    const orderCount = currentAgg._count.id;
    const aov = orderCount > 0 ? collectedRevenue / orderCount : 0;

    const prevRevenue = Number(previousAgg._sum.totalAmount ?? 0);
    const prevOrders = previousAgg._count.id;
    const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    const pctDelta = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return Number((((current - previous) / previous) * 100).toFixed(2));
    };

    const byDate: Record<
      string,
      { date: string; orders: number; revenue: number }
    > = {};
    for (const o of currentOrders) {
      const date = o.createdAt.toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = { date, orders: 0, revenue: 0 };
      byDate[date].orders += 1;
      byDate[date].revenue += Number(o.totalAmount);
    }

    return {
      range,
      period: {
        from: currentFrom.toISOString(),
        to: currentTo.toISOString(),
      },
      kpis: {
        orders: orderCount,
        collectedRevenue,
        aov: Number(aov.toFixed(2)),
        lowStockCount,
        awaitingFulfillment,
        totalCustomers,
        totalProducts,
      },
      previousPeriodDelta: {
        orders: {
          previous: prevOrders,
          delta: orderCount - prevOrders,
          percent: pctDelta(orderCount, prevOrders),
        },
        collectedRevenue: {
          previous: prevRevenue,
          delta: Number((collectedRevenue - prevRevenue).toFixed(2)),
          percent: pctDelta(collectedRevenue, prevRevenue),
        },
        aov: {
          previous: Number(prevAov.toFixed(2)),
          delta: Number((aov - prevAov).toFixed(2)),
          percent: pctDelta(aov, prevAov),
        },
      },
      revenueTrend: Object.values(byDate),
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      recentOrders,
      topProducts,
      // backward-compatible summary block
      summary: {
        totalOrders: orderCount,
        totalCustomers,
        totalProducts,
        pendingOrders: awaitingFulfillment,
        totalRevenue: collectedRevenue,
      },
    };
  }

  async getAttention() {
    const threshold = await this.lowStockThreshold();

    const [
      missingAddressOrders,
      zeroPriceVariants,
      productsWithoutPrice,
      taxRows,
      lowStockVariants,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          shippingAddressId: null,
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED],
          },
        },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.productVariant.findMany({
        where: {
          OR: [{ price: { lte: 0 } }, { discountPrice: { lte: 0 } }],
        },
        take: 50,
        select: {
          id: true,
          sku: true,
          price: true,
          discountPrice: true,
          productId: true,
          product: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.findMany({
        where: {
          status: true,
          actualPrice: null,
          discountPrice: null,
          variants: { none: { price: { gt: 0 } } },
        },
        take: 50,
        select: {
          id: true,
          name: true,
          actualPrice: true,
          discountPrice: true,
        },
      }),
      this.prisma.tax.findMany({
        select: { id: true, name: true, percent: true },
        orderBy: { percent: "asc" },
      }),
      this.prisma.productVariant.findMany({
        where: { status: true, stockQuantity: { lte: threshold } },
        take: 50,
        orderBy: { stockQuantity: "asc" },
        select: {
          id: true,
          sku: true,
          stockQuantity: true,
          product: { select: { id: true, name: true } },
        },
      }),
    ]);

    const byPercent = new Map<string, typeof taxRows>();
    for (const t of taxRows) {
      const key = String(Number(t.percent));
      const list = byPercent.get(key) ?? [];
      list.push(t);
      byPercent.set(key, list);
    }
    const duplicateTax = [...byPercent.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([percent, rows]) => ({
        percent: Number(percent),
        taxes: rows,
      }));

    const pricingIssues = [
      ...productsWithoutPrice.map((p) => ({
        type: "product_missing_price" as const,
        productId: p.id,
        productName: p.name,
      })),
      ...zeroPriceVariants
        .filter((v) => Number(v.price) <= 0)
        .map((v) => ({
          type: "variant_zero_or_missing_price" as const,
          variantId: v.id,
          sku: v.sku,
          productId: v.product.id,
          productName: v.product.name,
          price: v.price,
        })),
    ];

    const missingVariantPrice = zeroPriceVariants
      .filter((v) => Number(v.price) <= 0)
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        productId: v.product.id,
        productName: v.product.name,
        price: v.price,
        discountPrice: v.discountPrice,
      }));

    return {
      missingAddress: missingAddressOrders,
      pricingIssues,
      duplicateTax,
      missingVariantPrice,
      lowStock: {
        threshold,
        items: lowStockVariants,
      },
      counts: {
        missingAddress: missingAddressOrders.length,
        pricingIssues: pricingIssues.length,
        duplicateTax: duplicateTax.length,
        missingVariantPrice: missingVariantPrice.length,
        lowStock: lowStockVariants.length,
      },
    };
  }

  async getSalesReport(days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const sales = await this.prisma.order.findMany({
      where: { createdAt: { gte: from }, paymentStatus: "paid" },
      select: {
        createdAt: true,
        totalAmount: true,
        orderNumber: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const byDate: Record<
      string,
      { date: string; orders: number; revenue: number }
    > = {};
    for (const o of sales) {
      const date = o.createdAt.toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = { date, orders: 0, revenue: 0 };
      byDate[date].orders += 1;
      byDate[date].revenue += Number(o.totalAmount);
    }

    return {
      period: `Last ${days} days`,
      data: Object.values(byDate),
      totalOrders: sales.length,
      totalRevenue: sales.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    };
  }
}
