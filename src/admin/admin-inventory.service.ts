import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { PrismaService } from "../prisma/prisma.service";
import {
  affectedRowsCount,
  quoteSqlIdentifier,
  stringContainsFilter,
} from "../common/database-provider.util";
import {
  AdminAdjustStockDto,
  AdminBulkStockUpdateDto,
  AdminReleaseStockDto,
  AdminReserveStockDto,
  AdminUpdateStockDto,
} from "./dto/admin.dto";
import {
  recordStockMovement,
  type StockMovementType,
} from "../product/products/inventory-ledger";

type AdminActor = { name?: string | null };

/** Low-stock cutoffs by pool unit (total product.stock). */
export const LOW_STOCK_THRESHOLDS = {
  /** Mass pools stored in g (legacy kg: stock &lt; 1). */
  massG: 1000,
  /** Volume pools stored in ml (legacy L: stock &lt; 1). */
  volumeMl: 1000,
  /** Piece / UNIT / null stockUnit pools. */
  unit: 25,
} as const;

const MASS_G_UNITS = ["g", "G", "gram", "grams", "Gram", "Grams"];
const MASS_KG_UNITS = [
  "kg",
  "KG",
  "Kg",
  "kilogram",
  "kilograms",
  "Kilogram",
  "Kilograms",
];
const VOLUME_ML_UNITS = ["ml", "ML", "Ml"];
const VOLUME_L_UNITS = [
  "l",
  "L",
  "lt",
  "Lt",
  "LT",
  "liter",
  "litre",
  "liters",
  "litres",
  "Liter",
  "Litre",
  "Liters",
  "Litres",
];
const PACK_UNITS = [
  "UNIT",
  "unit",
  "units",
  "Unit",
  "Units",
  "pcs",
  "pc",
  "PCS",
  "PC",
  "pack",
  "packs",
  "Pack",
  "Packs",
  "nos",
  "no",
  "Nos",
  "No",
  "each",
  "Each",
];

/** Prisma where: total stock below unit-specific low-stock thresholds. */
export function lowStockWhere(): Prisma.ProductWhereInput {
  const { massG, volumeMl, unit } = LOW_STOCK_THRESHOLDS;
  return {
    status: true,
    OR: [
      { AND: [{ stockUnit: { in: MASS_G_UNITS } }, { stock: { lt: massG } }] },
      {
        AND: [{ stockUnit: { in: MASS_KG_UNITS } }, { stock: { lt: 1 } }],
      },
      {
        AND: [
          { stockUnit: { in: VOLUME_ML_UNITS } },
          { stock: { lt: volumeMl } },
        ],
      },
      {
        AND: [{ stockUnit: { in: VOLUME_L_UNITS } }, { stock: { lt: 1 } }],
      },
      {
        AND: [
          {
            OR: [
              { stockUnit: null },
              { stockUnit: "" },
              { stockUnit: { in: PACK_UNITS } },
            ],
          },
          { stock: { lt: unit } },
        ],
      },
    ],
  };
}

const LOW_STOCK_SELECT = {
  id: true,
  name: true,
  stock: true,
  reservedStock: true,
  stockUnit: true,
  status: true,
  variants: {
    where: { status: true },
    select: { id: true, sku: true, variantName: true },
    take: 5,
    orderBy: { id: "asc" as const },
  },
} satisfies Prisma.ProductSelect;

function mapLowStockRow(p: {
  id: number;
  name: string;
  stock: number;
  reservedStock: number;
  stockUnit: string | null;
  status: boolean;
  variants: Array<{ id: number; sku: string; variantName: string | null }>;
}) {
  const available = Math.max(0, p.stock - p.reservedStock);
  return {
    productId: p.id,
    productName: p.name,
    productStock: p.stock,
    productReservedStock: p.reservedStock,
    availableProductStock: available,
    availableQuantity: available,
    stockUnit: p.stockUnit,
    status: p.status,
    variants: p.variants,
  };
}

function parseStatusFilter(status?: string): boolean | undefined {
  if (status == null || status === "") return undefined;
  const s = status.trim().toLowerCase();
  if (["true", "1", "active", "yes"].includes(s)) return true;
  if (["false", "0", "inactive", "no"].includes(s)) return false;
  throw new BadRequestException(
    `Invalid status filter "${status}". Use true/false or active/inactive.`,
  );
}

function mapInventoryRow(v: {
  id: number;
  productId: number;
  variantName: string | null;
  sku: string;
  status: boolean;
  product: {
    name: string;
    stock: number;
    reservedStock: number;
    stockUnit?: string | null;
  };
}) {
  const productStock = v.product.stock ?? 0;
  const productReserved = v.product.reservedStock ?? 0;
  const availableProductStock = Math.max(0, productStock - productReserved);
  return {
    id: v.id,
    productId: v.productId,
    productName: v.product.name,
    variantName: v.variantName,
    sku: v.sku,
    productStock,
    productReservedStock: productReserved,
    availableProductStock,
    availableQuantity: availableProductStock,
    stockUnit: v.product.stockUnit ?? null,
    status: v.status,
  };
}

@Injectable()
export class AdminInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    status?: string;
    productId?: number;
    variantId?: number;
    categoryId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;
    const status = parseStatusFilter(params.status);

    const where: Prisma.ProductVariantWhereInput = {
      ...(status !== undefined && { status }),
      ...(params.productId != null &&
        Number.isFinite(params.productId) && { productId: params.productId }),
      ...(params.variantId != null &&
        Number.isFinite(params.variantId) && { id: params.variantId }),
      ...(params.categoryId != null &&
        Number.isFinite(params.categoryId) && {
          product: { categoryId: params.categoryId },
        }),
      ...(params.search && {
        OR: [
          { sku: stringContainsFilter(params.search) },
          { variantName: stringContainsFilter(params.search) },
          { product: { name: stringContainsFilter(params.search) } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findMany({
        where,
        select: {
          id: true,
          productId: true,
          variantName: true,
          sku: true,
          status: true,
          product: {
            select: {
              name: true,
              stock: true,
              reservedStock: true,
              stockUnit: true,
            },
          },
        },
        orderBy: [{ productId: "asc" }, { id: "asc" }],
        skip,
        take: limit,
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    return {
      inventory: rows.map(mapInventoryRow),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(variantId: number) {
    const v = await this.requireVariant(variantId);
    return mapInventoryRow(v);
  }

  async updateStock(
    variantId: number,
    dto: AdminUpdateStockDto,
    actor?: AdminActor,
  ) {
    return this.setStockAbsolute(variantId, dto.stockQuantity, actor, "set");
  }

  async updateProductStock(
    productId: number,
    stock: number,
    actor?: AdminActor,
  ) {
    if (!Number.isFinite(stock) || stock < 0) {
      throw new BadRequestException("stock must be >= 0");
    }
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, reservedStock: true, name: true },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);
    if (stock < product.reservedStock) {
      throw new BadRequestException(
        `product stock (${stock}) cannot be below reservedStock (${product.reservedStock})`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { stock },
      });
      await recordStockMovement(tx, {
        productId,
        type: "set",
        quantityChange: stock - product.stock,
        stockBefore: product.stock,
        stockAfter: stock,
        reservedBefore: product.reservedStock,
        reservedAfter: product.reservedStock,
        reason: "manual_set_product_pool",
        actorName: actor?.name,
      });
    });

    const availableProductStock = Math.max(0, stock - product.reservedStock);
    return {
      productId,
      productName: product.name,
      stock,
      reservedStock: product.reservedStock,
      availableProductStock,
      updatedAt: new Date().toISOString(),
    };
  }

  async adjustStock(
    variantId: number,
    dto: AdminAdjustStockDto,
    actor?: AdminActor,
  ) {
    if (!Number.isFinite(dto.quantityChange) || dto.quantityChange === 0) {
      throw new BadRequestException(
        "quantityChange must be a non-zero integer",
      );
    }

    const variant = await this.requireVariant(variantId);
    const before = variant.product.stock;
    const reserved = variant.product.reservedStock;
    const nextStock = before + dto.quantityChange;
    if (nextStock < 0) {
      throw new BadRequestException(
        `Adjustment would make product stock negative (current ${before})`,
      );
    }
    if (nextStock < reserved) {
      throw new BadRequestException(
        `Adjustment would leave stock (${nextStock}) below reservedStock (${reserved})`,
      );
    }

    const { movement } = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: variant.productId },
        data: { stock: { increment: dto.quantityChange } },
      });
      const movement = await recordStockMovement(tx, {
        productId: variant.productId,
        variantId,
        type: "adjust",
        quantityChange: dto.quantityChange,
        stockBefore: before,
        stockAfter: nextStock,
        reservedBefore: reserved,
        reservedAfter: reserved,
        reason: dto.reason,
        notes: dto.notes,
        actorName: actor?.name,
      });
      return { movement };
    });

    return {
      productId: variant.productId,
      variantId,
      stock: nextStock,
      reservedStock: reserved,
      availableProductStock: Math.max(0, nextStock - reserved),
      adjustmentId: movement.id,
      updatedAt: new Date().toISOString(),
    };
  }

  async reserveStock(
    variantId: number,
    dto: AdminReserveStockDto,
    actor?: AdminActor,
  ) {
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException("quantity must be a positive integer");
    }

    const variant = await this.requireVariant(variantId);
    const T = quoteSqlIdentifier("Product");
    const stockCol = quoteSqlIdentifier("stock");
    const reservedCol = quoteSqlIdentifier("reservedStock");

    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({
        where: { id: variant.productId },
        select: { stock: true, reservedStock: true },
      });

      const rowsAffected = await tx.$executeRawUnsafe(
        `UPDATE ${T} SET ${reservedCol} = ${reservedCol} + ? WHERE id = ? AND (${stockCol} - ${reservedCol}) >= ?`,
        dto.quantity,
        variant.productId,
        dto.quantity,
      );
      if (affectedRowsCount(rowsAffected) !== 1) {
        throw new BadRequestException(
          `Insufficient available stock to reserve for product #${variant.productId}`,
        );
      }

      const after = await tx.product.findUniqueOrThrow({
        where: { id: variant.productId },
        select: { stock: true, reservedStock: true },
      });
      await recordStockMovement(tx, {
        productId: variant.productId,
        variantId,
        type: "reserve",
        quantityChange: dto.quantity,
        stockBefore: before.stock,
        stockAfter: after.stock,
        reservedBefore: before.reservedStock,
        reservedAfter: after.reservedStock,
        reason: "reserve",
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        actorName: actor?.name,
      });
      return after;
    });

    return {
      productId: variant.productId,
      variantId,
      reservedStock: updated.reservedStock,
      availableProductStock: Math.max(0, updated.stock - updated.reservedStock),
    };
  }

  async releaseStock(
    variantId: number,
    dto: AdminReleaseStockDto,
    actor?: AdminActor,
  ) {
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException("quantity must be a positive integer");
    }

    const variant = await this.requireVariant(variantId);
    const T = quoteSqlIdentifier("Product");
    const reservedCol = quoteSqlIdentifier("reservedStock");

    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({
        where: { id: variant.productId },
        select: { stock: true, reservedStock: true },
      });

      const rowsAffected = await tx.$executeRawUnsafe(
        `UPDATE ${T} SET ${reservedCol} = ${reservedCol} - ? WHERE id = ? AND ${reservedCol} >= ?`,
        dto.quantity,
        variant.productId,
        dto.quantity,
      );
      if (affectedRowsCount(rowsAffected) !== 1) {
        throw new BadRequestException(
          `Insufficient reserved stock to release for product #${variant.productId}`,
        );
      }

      const after = await tx.product.findUniqueOrThrow({
        where: { id: variant.productId },
        select: { stock: true, reservedStock: true },
      });
      await recordStockMovement(tx, {
        productId: variant.productId,
        variantId,
        type: "release",
        quantityChange: -dto.quantity,
        stockBefore: before.stock,
        stockAfter: after.stock,
        reservedBefore: before.reservedStock,
        reservedAfter: after.reservedStock,
        reason: "release",
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        actorName: actor?.name,
      });
      return after;
    });

    return {
      productId: variant.productId,
      variantId,
      reservedStock: updated.reservedStock,
      availableProductStock: Math.max(0, updated.stock - updated.reservedStock),
    };
  }

  async lowStock(params: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;
    const where = lowStockWhere();

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: LOW_STOCK_SELECT,
        orderBy: { stock: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      inventory: rows.map(mapLowStockRow),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      thresholds: { ...LOW_STOCK_THRESHOLDS },
    };
  }

  async exportLowStockExcel(): Promise<Buffer> {
    const rows = await this.prisma.product.findMany({
      where: lowStockWhere(),
      select: LOW_STOCK_SELECT,
      orderBy: { stock: "asc" },
      take: 10000,
    });

    const sheetRows = rows.map((p) => {
      const mapped = mapLowStockRow(p);
      return {
        "Product ID": mapped.productId,
        "Product Name": mapped.productName,
        "Total Stock": mapped.productStock,
        "Reserved Stock": mapped.productReservedStock,
        "Available Stock": mapped.availableProductStock,
        "Stock Unit": mapped.stockUnit ?? "UNIT",
        Status: mapped.status ? "Active" : "Inactive",
        "Variant SKUs": mapped.variants.map((v) => v.sku).join(", "),
        "Variant Names": mapped.variants
          .map((v) => v.variantName ?? "")
          .filter(Boolean)
          .join(", "),
      };
    });

    const sheet = XLSX.utils.json_to_sheet(
      sheetRows.length
        ? sheetRows
        : [
            {
              "Product ID": "",
              "Product Name": "",
              "Total Stock": "",
              "Reserved Stock": "",
              "Available Stock": "",
              "Stock Unit": "",
              Status: "",
              "Variant SKUs": "",
              "Variant Names": "",
            },
          ],
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Low Stock");
    return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  async history(variantId: number, params: { page?: number; limit?: number }) {
    const variant = await this.requireVariant(variantId);
    return this.productHistory(variant.productId, params);
  }

  async productHistory(
    productId: number,
    params: { page?: number; limit?: number },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where = { productId };
    const [movements, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      productId,
      movements,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listSales(params: {
    productId?: number;
    orderId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.SaleTransactionWhereInput = {
      ...(params.productId != null &&
        Number.isFinite(params.productId) && { productId: params.productId }),
      ...(params.orderId != null &&
        Number.isFinite(params.orderId) && { orderId: params.orderId }),
    };

    const [sales, total] = await this.prisma.$transaction([
      this.prisma.saleTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.saleTransaction.count({ where }),
    ]);

    return {
      sales,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async bulkUpdate(dto: AdminBulkStockUpdateDto, actor?: AdminActor) {
    if (!dto.updates?.length) {
      throw new BadRequestException("updates must contain at least one item");
    }

    const results: Array<{
      variantId: number;
      success: boolean;
      productStock?: number;
      error?: string;
    }> = [];
    let updated = 0;
    let failed = 0;

    for (const item of dto.updates) {
      try {
        const r = await this.setStockAbsolute(
          item.variantId,
          item.stockQuantity,
          actor,
          "bulk_set",
        );
        results.push({
          variantId: item.variantId,
          success: true,
          productStock: r.productStock,
        });
        updated += 1;
      } catch (err) {
        failed += 1;
        results.push({
          variantId: item.variantId,
          success: false,
          error: err instanceof Error ? err.message : "Update failed",
        });
      }
    }

    return { updated, failed, results };
  }

  private async setStockAbsolute(
    variantId: number,
    stockQuantity: number,
    actor: AdminActor | undefined,
    type: Extract<StockMovementType, "set" | "bulk_set">,
  ) {
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      throw new BadRequestException("stockQuantity must be >= 0");
    }

    const variant = await this.requireVariant(variantId);
    const productReserved = variant.product.reservedStock ?? 0;
    if (stockQuantity < productReserved) {
      throw new BadRequestException(
        `product stock (${stockQuantity}) cannot be below reservedStock (${productReserved})`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const before = variant.product.stock ?? 0;
      await tx.product.update({
        where: { id: variant.productId },
        data: { stock: stockQuantity },
      });
      await recordStockMovement(tx, {
        productId: variant.productId,
        variantId,
        type,
        quantityChange: stockQuantity - before,
        stockBefore: before,
        stockAfter: stockQuantity,
        reservedBefore: productReserved,
        reservedAfter: productReserved,
        reason:
          type === "bulk_set"
            ? "bulk_set_product_pool"
            : "manual_set_product_pool",
        actorName: actor?.name,
      });
    });

    return {
      id: variantId,
      productId: variant.productId,
      productStock: stockQuantity,
      reservedStock: productReserved,
      availableProductStock: Math.max(0, stockQuantity - productReserved),
      updatedAt: new Date().toISOString(),
    };
  }

  private async requireVariant(variantId: number) {
    const v = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        productId: true,
        variantName: true,
        sku: true,
        status: true,
        product: {
          select: {
            name: true,
            stock: true,
            reservedStock: true,
            stockUnit: true,
          },
        },
      },
    });
    if (!v) throw new NotFoundException(`Variant #${variantId} not found`);
    return v;
  }
}
