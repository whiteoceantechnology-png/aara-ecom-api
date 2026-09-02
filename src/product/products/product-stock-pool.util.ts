/**
 * Product-level inventory pool.
 * Variants are pack SKUs only — they do not hold independent stock.
 *
 * Modes:
 * - Pack-count (stockUnit empty / UNIT): 1 sold pack = 1 pool unit.
 * - Mass/volume (g, kg, ml, L): compare & deduct in base units (g or ml).
 *   Admin may send stock in KG/L; we normalize to g/ml on write.
 */

export { FREE_SHIPPING_MIN_MERCHANDISE } from "../checkout/checkout.constants";
import { FREE_SHIPPING_MIN_MERCHANDISE } from "../checkout/checkout.constants";

export function resolveShippingAmount(
  merchandiseTotal: number,
  shippingFlat: number,
  freeShippingMin: number = FREE_SHIPPING_MIN_MERCHANDISE,
): number {
  if (merchandiseTotal >= freeShippingMin) return 0;
  return shippingFlat;
}

function normUnit(unit: string | null | undefined): string | null {
  if (unit == null) return null;
  const u = unit.trim().toLowerCase();
  return u.length ? u : null;
}

/** Pack-count pool (not weight/volume). */
export function isPackCountUnit(unit: string | null | undefined): boolean {
  const u = normUnit(unit);
  if (!u) return true;
  return [
    "unit",
    "units",
    "pcs",
    "pc",
    "pack",
    "packs",
    "nos",
    "no",
    "each",
  ].includes(u);
}

export function isMassUnit(unit: string | null | undefined): boolean {
  const u = normUnit(unit);
  return (
    u === "g" ||
    u === "gram" ||
    u === "grams" ||
    u === "kg" ||
    u === "kilogram" ||
    u === "kilograms"
  );
}

export function isVolumeUnit(unit: string | null | undefined): boolean {
  const u = normUnit(unit);
  return (
    u === "ml" ||
    u === "l" ||
    u === "lt" ||
    u === "liter" ||
    u === "litre" ||
    u === "liters" ||
    u === "litres"
  );
}

/** Convert an amount into canonical base units (g for mass, ml for volume). */
export function toBaseUnits(
  amount: number,
  unit: string | null | undefined,
): number {
  if (!Number.isFinite(amount)) return 0;
  const u = normUnit(unit);
  if (!u || isPackCountUnit(u)) return amount;
  if (u === "kg" || u === "kilogram" || u === "kilograms") return amount * 1000;
  if (
    u === "l" ||
    u === "lt" ||
    u === "liter" ||
    u === "litre" ||
    u === "liters" ||
    u === "litres"
  ) {
    return amount * 1000;
  }
  return amount; // g / ml / unknown → 1:1
}

/**
 * Normalize admin stock input to integer base units for storage.
 * KG → g (*1000), L → ml (*1000). UNIT / empty unchanged.
 */
export function normalizeStockForStorage(
  stock: number,
  stockUnit: string | null | undefined,
): { stock: number; stockUnit: string | null } {
  const u = normUnit(stockUnit);
  if (!Number.isFinite(stock) || stock < 0) {
    return { stock: 0, stockUnit: u };
  }
  const n = Math.trunc(stock);
  if (!u || isPackCountUnit(u)) {
    return { stock: n, stockUnit: u === "unit" || u === "units" ? "UNIT" : u };
  }
  if (u === "kg" || u === "kilogram" || u === "kilograms") {
    return { stock: n * 1000, stockUnit: "g" };
  }
  if (
    u === "l" ||
    u === "lt" ||
    u === "liter" ||
    u === "litre" ||
    u === "liters" ||
    u === "litres"
  ) {
    return { stock: n * 1000, stockUnit: "ml" };
  }
  if (u === "g" || u === "gram" || u === "grams") {
    return { stock: n, stockUnit: "g" };
  }
  if (u === "ml") {
    return { stock: n, stockUnit: "ml" };
  }
  return { stock: n, stockUnit: u };
}

/** Parse "25 g", "1 kg", "500 ml", "1 L" → size in base unit of that family. */
export function parsePackLabelToBaseUnits(
  label: string | null | undefined,
): number | null {
  if (!label) return null;
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  if (unit === "kg") return n * 1000;
  if (unit === "l") return n * 1000;
  return n;
}

/**
 * Units to consume from the product pool for one line.
 * Returns pack-count OR base mass/volume units (g/ml) matching poolAvailableInBase().
 */
export function unitsToConsume(opts: {
  quantity: number;
  stockUnit?: string | null;
  packSize?: {
    size: { toString(): string } | number;
    unit: string;
    label: string;
  } | null;
  variantName?: string | null;
}): number {
  const qty = opts.quantity;
  if (!Number.isFinite(qty) || qty <= 0) return 0;

  if (isPackCountUnit(opts.stockUnit)) {
    return qty;
  }

  const fromLabel =
    parsePackLabelToBaseUnits(opts.variantName) ??
    parsePackLabelToBaseUnits(opts.packSize?.label);

  let packBase = fromLabel;
  if (packBase == null && opts.packSize) {
    const size = Number(opts.packSize.size);
    if (Number.isFinite(size) && size > 0) {
      packBase = toBaseUnits(size, opts.packSize.unit);
    }
  }

  if (packBase == null || packBase <= 0) {
    return qty; // safe fallback: treat as pack-count
  }
  return qty * packBase;
}

/** Sellable pool in the same unit space as unitsToConsume(). */
export function poolAvailableInBase(
  stock: number,
  reservedStock: number,
  stockUnit?: string | null,
): number {
  const avail = Math.max(0, Number(stock) - Number(reservedStock));
  if (isPackCountUnit(stockUnit)) return avail;
  // After normalize, stock is already in g/ml. Legacy KG/L still converts.
  return toBaseUnits(avail, stockUnit);
}

/**
 * Amount to subtract from Product.stock / reservedStock columns.
 * After normalizeStockForStorage, stock is in g/ml so this equals needed base units.
 * Legacy KG/L rows: convert base → stock unit (must be whole units).
 */
export function unitsToDeductFromStoredPool(
  neededBaseOrPacks: number,
  stockUnit?: string | null,
): number {
  if (!Number.isFinite(neededBaseOrPacks) || neededBaseOrPacks <= 0) return 0;
  if (isPackCountUnit(stockUnit)) {
    return Math.trunc(neededBaseOrPacks);
  }
  const u = normUnit(stockUnit);
  if (
    u === "kg" ||
    u === "kilogram" ||
    u === "kilograms" ||
    u === "l" ||
    u === "lt" ||
    u === "liter" ||
    u === "litre" ||
    u === "liters" ||
    u === "litres"
  ) {
    // Legacy unnormalized rows only — prefer whole stock-units.
    const inStockUnit = neededBaseOrPacks / 1000;
    if (!Number.isInteger(inStockUnit)) {
      // Cannot accurately deduct fractional KG from Int column; require grams storage.
      return Math.ceil(inStockUnit); // last-resort; normalizeStockForStorage avoids this
    }
    return inStockUnit;
  }
  return Math.trunc(neededBaseOrPacks);
}
