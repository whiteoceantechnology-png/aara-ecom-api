import { BadRequestException, Injectable } from "@nestjs/common";
import * as XLSX from "xlsx";
import { PrismaService } from "../prisma/prisma.service";

export type ReportRange = 7 | 30 | 90;
export type SalesGroupBy = "day" | "week" | "month";

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  parseRange(raw?: string): ReportRange {
    if (raw == null || raw === "") return 30;
    const n = Number(raw);
    if (![7, 30, 90].includes(n)) {
      throw new BadRequestException("range must be one of 7, 30, 90");
    }
    return n as ReportRange;
  }

  private fromDate(range: ReportRange) {
    const from = new Date();
    from.setDate(from.getDate() - range);
    return from;
  }

  private bucketKey(date: Date, groupBy: SalesGroupBy): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    if (groupBy === "day") return `${y}-${m}-${d}`;
    if (groupBy === "month") return `${y}-${m}`;
    // ISO week
    const tmp = new Date(Date.UTC(y, date.getUTCMonth(), date.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  async getSales(rangeRaw?: string, groupByRaw?: string) {
    const range = this.parseRange(rangeRaw);
    const groupBy = (groupByRaw || "day") as SalesGroupBy;
    if (!["day", "week", "month"].includes(groupBy)) {
      throw new BadRequestException("groupBy must be day, week, or month");
    }

    const from = this.fromDate(range);
    const sales = await this.prisma.order.findMany({
      where: { createdAt: { gte: from }, paymentStatus: "paid" },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    });

    const buckets: Record<
      string,
      { period: string; orders: number; revenue: number }
    > = {};
    for (const o of sales) {
      const key = this.bucketKey(o.createdAt, groupBy);
      if (!buckets[key]) buckets[key] = { period: key, orders: 0, revenue: 0 };
      buckets[key].orders += 1;
      buckets[key].revenue += Number(o.totalAmount);
    }

    const data = Object.values(buckets);
    const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
    const totalOrders = data.reduce((s, r) => s + r.orders, 0);

    return {
      range,
      groupBy,
      data,
      totalOrders,
      totalRevenue,
      aov:
        totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
    };
  }

  async getProducts(rangeRaw?: string) {
    const range = this.parseRange(rangeRaw);
    const from = this.fromDate(range);

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { createdAt: { gte: from }, paymentStatus: "paid" },
      },
      select: {
        productName: true,
        quantity: true,
        subtotal: true,
        variantId: true,
        variant: {
          select: {
            sku: true,
            productId: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    const byProduct: Record<
      string,
      {
        productId: number | null;
        productName: string;
        sku: string | null;
        unitsSold: number;
        revenue: number;
      }
    > = {};

    for (const item of items) {
      const productId = item.variant?.productId ?? null;
      const key =
        productId != null ? `p:${productId}` : `n:${item.productName}`;
      if (!byProduct[key]) {
        byProduct[key] = {
          productId,
          productName: item.variant?.product?.name ?? item.productName,
          sku: item.variant?.sku ?? null,
          unitsSold: 0,
          revenue: 0,
        };
      }
      byProduct[key].unitsSold += item.quantity;
      byProduct[key].revenue += Number(item.subtotal);
    }

    const products = Object.values(byProduct).sort(
      (a, b) => b.revenue - a.revenue,
    );

    return {
      range,
      totalProducts: products.length,
      totalUnitsSold: products.reduce((s, p) => s + p.unitsSold, 0),
      totalRevenue: products.reduce((s, p) => s + p.revenue, 0),
      products,
    };
  }

  async exportReport(typeRaw?: string, rangeRaw?: string, formatRaw?: string) {
    const type = (typeRaw || "sales").toLowerCase();
    const format = (formatRaw || "csv").toLowerCase();
    if (!["sales", "products"].includes(type)) {
      throw new BadRequestException("type must be sales or products");
    }
    if (!["csv", "xlsx"].includes(format)) {
      throw new BadRequestException("format must be csv or xlsx");
    }

    let rows: Record<string, unknown>[] = [];
    if (type === "sales") {
      const report = await this.getSales(rangeRaw, "day");
      rows = report.data.map((r) => ({
        period: r.period,
        orders: r.orders,
        revenue: r.revenue,
      }));
    } else {
      const report = await this.getProducts(rangeRaw);
      rows = report.products.map((p) => ({
        productId: p.productId ?? "",
        productName: p.productName,
        sku: p.sku ?? "",
        unitsSold: p.unitsSold,
        revenue: p.revenue,
      }));
    }

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, type);

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return {
        buffer: Buffer.from(csv, "utf8"),
        contentType: "text/csv; charset=utf-8",
        filename: `${type}-report.csv`,
      };
    }

    const buffer = XLSX.write(book, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    return {
      buffer,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${type}-report.xlsx`,
    };
  }
}
