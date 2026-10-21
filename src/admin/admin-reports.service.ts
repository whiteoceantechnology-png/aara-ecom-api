import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { stringEqualsInsensitiveFilter } from "../common/database-provider.util";
import { PrismaService } from "../prisma/prisma.service";
import {
  SALES_EXPORT_COLUMNS,
  addressFields,
  mapSaleToExportRow,
  parseMonthRange,
  type SalesExportRow,
} from "./sales-export.util";

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

  /**
   * Line-level GST sales export from SaleTransaction.
   * Filters: month=YYYY-MM (required), optional productId / sku.
   * format=json returns rows; format=xlsx (default) returns a downloadable workbook.
   */
  async exportSalesLedger(params: {
    month?: string;
    productId?: string | number;
    sku?: string;
    format?: string;
  }) {
    const month = (params.month || "").trim();
    if (!month) {
      throw new BadRequestException("month is required (YYYY-MM)");
    }

    let from: Date;
    let to: Date;
    try {
      ({ from, to } = parseMonthRange(month));
    } catch {
      throw new BadRequestException("month must be YYYY-MM");
    }

    const format = (params.format || "xlsx").toLowerCase();
    if (!["xlsx", "json", "csv"].includes(format)) {
      throw new BadRequestException("format must be xlsx, json, or csv");
    }

    let productId: number | undefined;
    if (params.productId != null && params.productId !== "") {
      productId = Number(params.productId);
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new BadRequestException("productId must be a positive number");
      }
    }

    const sku = params.sku?.trim() || undefined;

    const where: Prisma.SaleTransactionWhereInput = {
      createdAt: { gte: from, lt: to },
      ...(productId != null ? { productId } : {}),
      ...(sku ? { sku: stringEqualsInsensitiveFilter(sku) } : {}),
    };

    const [store, sales] = await Promise.all([
      this.prisma.storeProfile.findUnique({ where: { id: 1 } }),
      this.prisma.saleTransaction.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          order: {
            select: {
              orderNumber: true,
              createdAt: true,
              status: true,
              totalAmount: true,
              addressSnapshot: true,
              customer: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                  gstIn: true,
                },
              },
              shippingAddress: {
                select: { state: true, postalCode: true },
              },
              payments: {
                orderBy: { paymentDate: "desc" },
                take: 1,
                select: {
                  paymentMethod: true,
                  transactionId: true,
                  reference: true,
                },
              },
              items: {
                select: {
                  id: true,
                  hsnCode: true,
                  taxPercent: true,
                  taxAmount: true,
                  subtotal: true,
                },
              },
            },
          },
          product: {
            select: {
              name: true,
              description: true,
              hsnCode: true,
              taxPercent: true,
              stockUnit: true,
              category: { select: { name: true } },
            },
          },
          variant: {
            select: {
              sku: true,
              packSize: { select: { unit: true, label: true } },
            },
          },
        },
      }),
    ]);

    const storeState = store?.state ?? null;
    const rows: SalesExportRow[] = sales.map((sale) => {
      const order = sale.order;
      const addr = addressFields(order.addressSnapshot, order.shippingAddress);
      const orderItem =
        sale.orderItemId != null
          ? order.items.find((i) => i.id === sale.orderItemId)
          : undefined;
      const payment = order.payments[0];
      const taxPercent =
        orderItem?.taxPercent != null
          ? Number(orderItem.taxPercent)
          : sale.product.taxPercent != null
            ? Number(sale.product.taxPercent)
            : null;
      const taxAmount =
        orderItem?.taxAmount != null ? Number(orderItem.taxAmount) : null;

      return mapSaleToExportRow({
        orderNumber: order.orderNumber,
        orderCreatedAt: order.createdAt,
        orderStatus: order.status,
        orderTotalAmount: Number(order.totalAmount),
        customerName: order.customer.name,
        customerGstIn: order.customer.gstIn,
        customerPhone: order.customer.phone,
        customerEmail: order.customer.email,
        billingState: addr.state,
        shippingState: addr.state,
        shippingPincode: addr.pincode,
        storeState,
        categoryName: sale.product.category?.name ?? null,
        productName: sale.productName || sale.product.name,
        sku: sale.sku ?? sale.variant?.sku ?? null,
        sizeLabel: sale.sizeLabel,
        packsOrdered: sale.quantity,
        hsnCode: orderItem?.hsnCode ?? sale.product.hsnCode ?? null,
        itemDescription: sale.product.description
          ? sale.product.description.slice(0, 200)
          : null,
        stockUnit: sale.product.stockUnit,
        packUnit: sale.variant?.packSize?.unit ?? null,
        unitsConsumed: sale.unitsConsumed,
        lineInclusive: Number(sale.subtotal),
        taxPercent,
        taxAmount,
        paymentMethod: sale.paymentMethod ?? payment?.paymentMethod ?? null,
        paymentReference: payment?.transactionId ?? payment?.reference ?? null,
      });
    });

    if (format === "json") {
      return {
        kind: "json" as const,
        month,
        productId: productId ?? null,
        sku: sku ?? null,
        totalRows: rows.length,
        columns: [...SALES_EXPORT_COLUMNS],
        rows,
      };
    }

    const sheetRows = rows.map((r) => {
      const out: Record<string, string | number> = {};
      for (const col of SALES_EXPORT_COLUMNS) out[col] = r[col];
      return out;
    });
    const sheet = XLSX.utils.json_to_sheet(sheetRows, {
      header: [...SALES_EXPORT_COLUMNS],
    });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Sales");

    const stem = `sales-export-${month}${productId != null ? `-product-${productId}` : ""}`;

    if (format === "csv") {
      return {
        kind: "file" as const,
        buffer: Buffer.from(XLSX.utils.sheet_to_csv(sheet), "utf8"),
        contentType: "text/csv; charset=utf-8",
        filename: `${stem}.csv`,
      };
    }

    return {
      kind: "file" as const,
      buffer: XLSX.write(book, {
        type: "buffer",
        bookType: "xlsx",
      }) as Buffer,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${stem}.xlsx`,
    };
  }
}
