/**
 * Pure checkout pricing: maps cart lines to numeric inputs and totals merchandise,
 * coupon discount, proportional tax, and flat shipping. No I/O — safe to unit test.
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
  /** Tax on this line after coupon is spread proportionally */
  taxAmount: number;
  taxPercent: number;
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
 * Coupon applies to merchandise subtotal; tax is computed on discounted line amounts.
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
      const lineTax = (lineAfterDiscount * pl.taxPercent) / 100;
      pl.taxAmount = Math.round(lineTax * 100) / 100;
      tax += pl.taxAmount;
    }
  }

  const shipping = opts.shippingFlat;
  const merchandiseTotal = Math.max(0, subtotal - discount);
  const total = merchandiseTotal + tax + shipping;

  return {
    items: pricedLines,
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    tax: Math.round(tax * 100) / 100,
    shipping,
    total: Math.round(total * 100) / 100,
  };
}
