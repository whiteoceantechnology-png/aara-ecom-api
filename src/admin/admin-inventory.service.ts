import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

  async lowStock(params: {
    threshold?: number;
    page?: number;
    limit?: number;
  }) {
    let threshold = params.threshold;
    if (threshold == null || !Number.isFinite(threshold)) {
      const settings = await this.prisma.notificationSettings.findUnique({
        where: { id: 1 },
        select: { lowStockThreshold: true },
      });
      threshold = settings?.lowStockThreshold ?? 10;
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: true,
      stock: { lte: threshold },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: {
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
            orderBy: { id: "asc" },
          },
        },
        orderBy: { stock: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      inventory: rows.map((p) => ({
        productId: p.id,
        productName: p.name,
        productStock: p.stock,
        productReservedStock: p.reservedStock,
        availableProductStock: Math.max(0, p.stock - p.reservedStock),
        availableQuantity: Math.max(0, p.stock - p.reservedStock),
        stockUnit: p.stockUnit,
        status: p.status,
        variants: p.variants,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      threshold,
    };
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
