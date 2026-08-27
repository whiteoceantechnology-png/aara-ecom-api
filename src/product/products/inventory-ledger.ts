import type { Prisma } from "@prisma/client";

export type StockMovementType =
  | "set"
  | "adjust"
  | "reserve"
  | "release"
  | "bulk_set"
  | "sale"
  | "restock";

export type SaleLineInput = {
  orderId: number;
  orderItemId?: number | null;
  productId: number;
  variantId?: number | null;
  productName: string;
  sizeLabel: string;
  sku?: string | null;
  quantity: number;
  unitsConsumed: number;
  unitPrice: number | Prisma.Decimal;
  subtotal: number | Prisma.Decimal;
  paymentMethod?: string | null;
  stockBefore: number;
  stockAfter: number;
};

export function recordStockMovement(
  tx: Prisma.TransactionClient,
  data: {
    productId: number;
    variantId?: number | null;
    type: StockMovementType;
    quantityChange: number;
    stockBefore: number;
    stockAfter: number;
    reservedBefore: number;
    reservedAfter: number;
    reason?: string | null;
    notes?: string | null;
    referenceType?: string | null;
    referenceId?: number | null;
    actorType?: string;
    actorName?: string | null;
  },
) {
  return tx.stockMovement.create({
    data: {
      productId: data.productId,
      variantId: data.variantId ?? null,
      type: data.type,
      quantityChange: data.quantityChange,
      stockBefore: data.stockBefore,
      stockAfter: data.stockAfter,
      reservedBefore: data.reservedBefore,
      reservedAfter: data.reservedAfter,
      reason: data.reason ?? null,
      notes: data.notes ?? null,
      referenceType: data.referenceType ?? null,
      referenceId: data.referenceId ?? null,
      actorType: data.actorType ?? "admin",
      actorName: data.actorName ?? null,
    },
  });
}

export function recordSaleTransactions(
  tx: Prisma.TransactionClient,
  lines: SaleLineInput[],
) {
  if (!lines.length) return Promise.resolve({ count: 0 });
  return tx.saleTransaction.createMany({
    data: lines.map((line) => ({
      orderId: line.orderId,
      orderItemId: line.orderItemId ?? null,
      productId: line.productId,
      variantId: line.variantId ?? null,
      productName: line.productName,
      sizeLabel: line.sizeLabel,
      sku: line.sku ?? null,
      quantity: line.quantity,
      unitsConsumed: line.unitsConsumed,
      unitPrice: line.unitPrice,
      subtotal: line.subtotal,
      paymentMethod: line.paymentMethod ?? null,
      stockBefore: line.stockBefore,
      stockAfter: line.stockAfter,
    })),
  });
}
