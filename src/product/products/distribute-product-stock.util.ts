/**
 * Split a product-level stock total across variants so
 * Σ(variant.stockQuantity) === total (not total per variant).
 * Remainder units go to the first variants; each allocation
 * is never below that variant's reservedQuantity.
 */
export type StockVariantSlice = {
  id: number;
  reservedQuantity: number;
};

export type StockAllocation = {
  id: number;
  stockQuantity: number;
};

export function distributeProductStock(
  total: number,
  variants: StockVariantSlice[],
): StockAllocation[] {
  if (!Number.isFinite(total) || total < 0 || !Number.isInteger(total)) {
    throw new Error("total stock must be a non-negative integer");
  }
  if (variants.length === 0) {
    return [];
  }

  const reservedFloor = variants.reduce(
    (sum, v) => sum + Math.max(0, v.reservedQuantity),
    0,
  );
  if (total < reservedFloor) {
    throw new Error(
      `stock (${total}) cannot be below total reserved quantity (${reservedFloor})`,
    );
  }

  const n = variants.length;
  const base = Math.floor(total / n);
  const remainder = total % n;

  const allocations: StockAllocation[] = variants.map((v, i) => ({
    id: v.id,
    stockQuantity: base + (i < remainder ? 1 : 0),
  }));

  // Lift any slice below its reservation, then reclaim surplus from others.
  let deficit = 0;
  for (let i = 0; i < allocations.length; i++) {
    const reserved = Math.max(0, variants[i].reservedQuantity);
    if (allocations[i].stockQuantity < reserved) {
      deficit += reserved - allocations[i].stockQuantity;
      allocations[i].stockQuantity = reserved;
    }
  }

  if (deficit > 0) {
    for (let i = 0; i < allocations.length && deficit > 0; i++) {
      const reserved = Math.max(0, variants[i].reservedQuantity);
      const surplus = allocations[i].stockQuantity - reserved;
      if (surplus <= 0) continue;
      const take = Math.min(surplus, deficit);
      allocations[i].stockQuantity -= take;
      deficit -= take;
    }
  }

  return allocations;
}
