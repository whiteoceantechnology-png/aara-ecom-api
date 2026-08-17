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

type AdminActor = { name?: string | null };

type StockMovementType = "set" | "adjust" | "reserve" | "release" | "bulk_set";

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
  stockQuantity: number;
  reservedQuantity: number;
  status: boolean;
  product: { name: string };
}) {
  return {
    id: v.id,
    productId: v.productId,
    productName: v.product.name,
    variantName: v.variantName,
    sku: v.sku,
    stockQuantity: v.stockQuantity,
    reservedQuantity: v.reservedQuantity,
    availableQuantity: v.stockQuantity - v.reservedQuantity,
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
          stockQuantity: true,
          reservedQuantity: true,
          status: true,
          product: { select: { name: true } },
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
    const nextStock = variant.stockQuantity + dto.quantityChange;
    if (nextStock < 0) {
      throw new BadRequestException(
        `Adjustment would make stockQuantity negative (current ${variant.stockQuantity})`,
      );
    }
    if (nextStock < variant.reservedQuantity) {
      throw new BadRequestException(
        `Adjustment would leave stockQuantity (${nextStock}) below reservedQuantity (${variant.reservedQuantity})`,
      );
    }

    const { updated, movement } = await this.prisma.$transaction(async (tx) => {
      const row = await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: { increment: dto.quantityChange } },
      });
      const movement = await this.recordMovement(tx, {
        variantId,
        type: "adjust",
        quantityChange: dto.quantityChange,
        stockBefore: variant.stockQuantity,
        stockAfter: row.stockQuantity,
        reservedBefore: variant.reservedQuantity,
        reservedAfter: row.reservedQuantity,
        reason: dto.reason,
        notes: dto.notes,
        actorName: actor?.name,
      });
      return { updated: row, movement };
    });

    return {
      id: updated.id,
      stockQuantity: updated.stockQuantity,
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

    await this.requireVariant(variantId);

    const T = quoteSqlIdentifier("ProductVariant");
    const sq = quoteSqlIdentifier("stockQuantity");
    const rq = quoteSqlIdentifier("reservedQuantity");

    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!before) {
        throw new NotFoundException(`Variant #${variantId} not found`);
      }

      const rowsAffected = await tx.$executeRawUnsafe(
        `UPDATE ${T} SET ${rq} = ${rq} + ? WHERE id = ? AND (${sq} - ${rq}) >= ?`,
        dto.quantity,
        variantId,
        dto.quantity,
      );
      if (affectedRowsCount(rowsAffected) !== 1) {
        throw new BadRequestException(
          `Insufficient available stock to reserve for variant #${variantId}`,
        );
      }

      const after = await tx.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      await this.recordMovement(tx, {
        variantId,
        type: "reserve",
        quantityChange: dto.quantity,
        stockBefore: before.stockQuantity,
        stockAfter: after.stockQuantity,
        reservedBefore: before.reservedQuantity,
        reservedAfter: after.reservedQuantity,
        reason: "reserve",
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        actorName: actor?.name,
      });
      return after;
    });

    return {
      id: updated.id,
      reservedQuantity: updated.reservedQuantity,
      availableQuantity: updated.stockQuantity - updated.reservedQuantity,
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

    await this.requireVariant(variantId);

    const T = quoteSqlIdentifier("ProductVariant");
    const rq = quoteSqlIdentifier("reservedQuantity");

    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!before) {
        throw new NotFoundException(`Variant #${variantId} not found`);
      }

      const rowsAffected = await tx.$executeRawUnsafe(
        `UPDATE ${T} SET ${rq} = ${rq} - ? WHERE id = ? AND ${rq} >= ?`,
        dto.quantity,
        variantId,
        dto.quantity,
      );
      if (affectedRowsCount(rowsAffected) !== 1) {
        throw new BadRequestException(
          `Insufficient reserved stock to release for variant #${variantId}`,
        );
      }

      const after = await tx.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      await this.recordMovement(tx, {
        variantId,
        type: "release",
        quantityChange: -dto.quantity,
        stockBefore: before.stockQuantity,
        stockAfter: after.stockQuantity,
        reservedBefore: before.reservedQuantity,
        reservedAfter: after.reservedQuantity,
        reason: "release",
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        actorName: actor?.name,
      });
      return after;
    });

    return {
      id: updated.id,
      reservedQuantity: updated.reservedQuantity,
      availableQuantity: updated.stockQuantity - updated.reservedQuantity,
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

    const where: Prisma.ProductVariantWhereInput = {
      status: true,
      stockQuantity: { lte: threshold },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findMany({
        where,
        select: {
          id: true,
          productId: true,
          variantName: true,
          sku: true,
          stockQuantity: true,
          reservedQuantity: true,
          status: true,
          product: { select: { name: true } },
        },
        orderBy: { stockQuantity: "asc" },
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
      threshold,
    };
  }

  async history(variantId: number, params: { page?: number; limit?: number }) {
    await this.requireVariant(variantId);

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where = { variantId };
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
      movements,
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
      stockQuantity?: number;
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
          stockQuantity: r.stockQuantity,
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
    type: "set" | "bulk_set",
  ) {
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      throw new BadRequestException("stockQuantity must be >= 0");
    }

    const variant = await this.requireVariant(variantId);
    if (stockQuantity < variant.reservedQuantity) {
      throw new BadRequestException(
        `stockQuantity (${stockQuantity}) cannot be below reservedQuantity (${variant.reservedQuantity})`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity },
      });
      await this.recordMovement(tx, {
        variantId,
        type,
        quantityChange: stockQuantity - variant.stockQuantity,
        stockBefore: variant.stockQuantity,
        stockAfter: row.stockQuantity,
        reservedBefore: variant.reservedQuantity,
        reservedAfter: row.reservedQuantity,
        reason: type === "bulk_set" ? "bulk_set" : "manual_set",
        actorName: actor?.name,
      });
      return row;
    });

    return {
      id: updated.id,
      stockQuantity: updated.stockQuantity,
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
        stockQuantity: true,
        reservedQuantity: true,
        status: true,
        product: { select: { name: true } },
      },
    });
    if (!v) throw new NotFoundException(`Variant #${variantId} not found`);
    return v;
  }

  private recordMovement(
    tx: Prisma.TransactionClient,
    data: {
      variantId: number;
      type: StockMovementType;
      quantityChange: number;
      stockBefore: number;
      stockAfter: number;
      reservedBefore: number;
      reservedAfter: number;
      reason?: string;
      notes?: string;
      referenceType?: string;
      referenceId?: number;
      actorName?: string | null;
    },
  ) {
    return tx.stockMovement.create({
      data: {
        variantId: data.variantId,
        type: data.type,
        quantityChange: data.quantityChange,
        stockBefore: data.stockBefore,
        stockAfter: data.stockAfter,
        reservedBefore: data.reservedBefore,
        reservedAfter: data.reservedAfter,
        reason: data.reason,
        notes: data.notes,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        actorType: "admin",
        actorName: data.actorName ?? null,
      },
    });
  }
}
