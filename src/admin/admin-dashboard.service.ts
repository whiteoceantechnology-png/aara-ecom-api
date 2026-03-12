import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      pendingOrders,
      totalRevenue,
      recentOrders,
      topProducts,
      ordersByStatus,
    ] = await Promise.all([
      // Total orders
      this.prisma.order.count(),

      // Total customers
      this.prisma.customer.count(),

      // Total active products
      this.prisma.product.count({ where: { status: true } }),

      // Pending orders
      this.prisma.order.count({ where: { status: "pending" } }),

      // Total revenue (sum of paid orders)
      this.prisma.order.aggregate({
        where: { paymentStatus: "paid" },
        _sum: { totalAmount: true },
      }),

      // Recent 5 orders
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

      // Top 5 selling products by order item count
      this.prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),

      // Orders count by status
      this.prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    return {
      summary: {
        totalOrders,
        totalCustomers,
        totalProducts,
        pendingOrders,
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      },
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      recentOrders,
      topProducts,
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

    // Group by date
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
