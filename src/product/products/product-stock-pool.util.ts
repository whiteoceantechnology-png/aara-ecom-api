/**
 * Product-level inventory pool.
 * Variants are pack SKUs only — they do not hold independent stock.
 * Each ordered pack (qty) consumes 1 unit from Product.stock unless a
 * weight/volume stockUnit is configured (then qty × pack size).
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

/** Parse "25 g", "1 kg", "500 ml", "1 L" → size in base unit of the label. */
export function parsePackLabelToBaseUnits(
  label: string | null | undefined,
): number | null {
  if (!label) return null;
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  if (unit === "kg") return n * 1000; // grams
  if (unit === "l") return n * 1000; // ml
  return n; // g or ml
}

/**
 * Units to consume from Product.stock for one cart/order line.
 * - No stockUnit → pack-count mode (1 pack = 1 pool unit). Matches admin { stock: 20 }.
 * - stockUnit set → weight/volume mode using pack label / PackSize.size.
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

  const stockUnit = opts.stockUnit?.trim().toLowerCase() || null;
  if (!stockUnit) {
    return qty; // pack-count pool
  }

  const fromLabel =
    parsePackLabelToBaseUnits(opts.variantName) ??
    parsePackLabelToBaseUnits(opts.packSize?.label);

  let packUnits = fromLabel;
  if (packUnits == null && opts.packSize) {
    const size = Number(opts.packSize.size);
    const pUnit = opts.packSize.unit.toLowerCase();
    if (Number.isFinite(size) && size > 0) {
      if (pUnit === "kg") packUnits = size * 1000;
      else if (pUnit === "l") packUnits = size * 1000;
      else packUnits = size;
    }
  }

  if (packUnits == null || packUnits <= 0) {
    return qty; // safe fallback
  }
  return qty * packUnits;
}
