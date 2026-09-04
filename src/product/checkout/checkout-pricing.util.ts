import { FREE_SHIPPING_MIN_MERCHANDISE } from "./checkout.constants";

/**
 * Pure checkout pricing: maps cart lines to numeric inputs and totals merchandise,
 * coupon discount, GST embedded in prices (inclusive), and flat shipping.
 * No I/O — safe to unit test.
 *
 * Catalog / variant prices are GST-inclusive (Indian B2C). Tax is extracted for
 * reporting/invoices and must NOT be added again on top of the merchandise total.
 * Shipping is free when merchandise (after discount) is ≥ FREE_SHIPPING_MIN_MERCHANDISE.
 */

export function toCartLineInputs(
  items: Array<{
    quantity: number;
    variant: {
      id: number;
      price: { toString(): string } | string | number;
      product: {
        id: number;
        name: string;
        taxPercent: { toString(): string } | string | number;
        hsnCode?: string | null;
      };
      packSize: { label: string };
    };
  }>,
): CartLineInput[] {
  return items.map((item) => ({
    variantId: item.variant.id,
    productId: item.variant.product.id,
    quantity: item.quantity,
    productName: item.variant.product.name,
    taxPercent: Number(item.variant.product.taxPercent),
    sizeLabel: item.variant.packSize.label,
    currentVariantPrice: Number(item.variant.price),
    hsnCode: item.variant.product.hsnCode ?? null,
  }));
}

export type CartLineInput = {
  variantId: number;
  productId: number;
  quantity: number;
  productName: string;
  taxPercent: number;
  sizeLabel: string;
  currentVariantPrice: number;
  hsnCode?: string | null;
};

export type PricedLine = {
  variantId: number;
  productId: number;
  productName: string;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
  /** Line total before order-level coupon (qty * unitPrice) */
  lineSubtotal: number;
  /** GST embedded in the (discounted) inclusive line amount */
  taxAmount: number;
  taxPercent: number;
  hsnCode?: string | null;
};

export type CheckoutTotals = {
  items: PricedLine[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
};

/**
 * Server-side pricing: uses current variant price, not cart-stored price.
 * Coupon applies to merchandise subtotal. GST is extracted from inclusive prices
 * (tax = amount × rate / (100 + rate)) and is not added to the payable total.
 */
export function computeCheckoutTotals(
  lines: CartLineInput[],
  opts: {
    shippingFlat: number;
    discountPercent?: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number | null;
  },
): CheckoutTotals {
  const pricedLines: PricedLine[] = [];
  let subtotal = 0;

  for (const line of lines) {
    const unitPrice = line.currentVariantPrice;
    const lineSubtotal = unitPrice * line.quantity;
    subtotal += lineSubtotal;
    pricedLines.push({
      variantId: line.variantId,
      productId: line.productId,
      productName: line.productName,
      sizeLabel: line.sizeLabel,
      unitPrice,
      quantity: line.quantity,
      lineSubtotal,
      taxAmount: 0,
      taxPercent: line.taxPercent,
      hsnCode: line.hsnCode ?? null,
    });
  }

  let discount = 0;
  const { discountPercent, maxDiscountAmount, minOrderAmount } = opts;
  if (
    discountPercent != null &&
    discountPercent > 0 &&
    subtotal > 0 &&
    (minOrderAmount == null || subtotal >= minOrderAmount)
  ) {
    discount = (subtotal * discountPercent) / 100;
    if (maxDiscountAmount != null && discount > maxDiscountAmount) {
      discount = maxDiscountAmount;
    }
    discount = Math.round(discount * 100) / 100;
  }

  let tax = 0;
  if (subtotal > 0) {
    for (const pl of pricedLines) {
      const share = pl.lineSubtotal / subtotal;
      const lineAfterDiscount = pl.lineSubtotal - discount * share;
      // GST-inclusive: extract embedded tax, do not add on top.
      const rate = Math.max(0, pl.taxPercent);
      const lineTax = rate > 0 ? (lineAfterDiscount * rate) / (100 + rate) : 0;
      pl.taxAmount = Math.round(lineTax * 100) / 100;
      tax += pl.taxAmount;
    }
  }

  const merchandiseTotal = Math.max(0, subtotal - discount);
  const shipping =
    merchandiseTotal >= FREE_SHIPPING_MIN_MERCHANDISE ? 0 : opts.shippingFlat;
  // Payable = inclusive merchandise + shipping (tax already inside merchandise).
  const total = merchandiseTotal + shipping;

  return {
    items: pricedLines,
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    tax: Math.round(tax * 100) / 100,
    shipping,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * GST embedded in an inclusive amount: amount × rate / (100 + rate).
 */
export function extractInclusiveTax(
  inclusiveAmount: number,
  taxPercent: number,
): number {
  const rate = Math.max(0, Number(taxPercent) || 0);
  const amount = Number(inclusiveAmount) || 0;
  if (rate <= 0 || amount <= 0) return 0;
  return Math.round(((amount * rate) / (100 + rate)) * 100) / 100;
}
