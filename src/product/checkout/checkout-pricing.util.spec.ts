import {
  toCartLineInputs,
  computeCheckoutTotals,
  type CartLineInput,
} from "./checkout-pricing.util";

describe("checkout-pricing.util", () => {
  describe("toCartLineInputs()", () => {
    it("should map cart lines with numeric coercion", () => {
      const lines = toCartLineInputs([
        {
          quantity: 2,
          variant: {
            id: 10,
            price: "31",
            product: { id: 1, name: "Herb", taxPercent: "5" },
            packSize: { label: "25 g" },
          },
        },
      ]);
      expect(lines).toEqual([
        {
          variantId: 10,
          productId: 1,
          quantity: 2,
          productName: "Herb",
          taxPercent: 5,
          sizeLabel: "25 g",
          currentVariantPrice: 31,
        },
      ]);
    });
  });

  describe("computeCheckoutTotals()", () => {
    const baseLines: CartLineInput[] = [
      {
        variantId: 1,
        productId: 1,
        quantity: 2,
        productName: "A",
        taxPercent: 10,
        sizeLabel: "x",
        currentVariantPrice: 50,
      },
    ];

    it("should compute subtotal, tax, shipping without coupon", () => {
      const t = computeCheckoutTotals(baseLines, { shippingFlat: 20 });
      expect(t.subtotal).toBe(100);
      expect(t.discount).toBe(0);
      expect(t.shipping).toBe(20);
      expect(t.tax).toBe(10);
      expect(t.total).toBe(130);
    });

    it("should apply percent discount and scale tax", () => {
      const t = computeCheckoutTotals(baseLines, {
        shippingFlat: 0,
        discountPercent: 10,
      });
      expect(t.discount).toBe(10);
      expect(t.subtotal).toBe(100);
      expect(t.tax).toBe(9);
      expect(t.items[0].taxAmount).toBe(9);
    });

    it("should cap discount with maxDiscountAmount", () => {
      const t = computeCheckoutTotals(baseLines, {
        shippingFlat: 0,
        discountPercent: 50,
        maxDiscountAmount: 5,
      });
      expect(t.discount).toBe(5);
    });

    it("should skip discount when subtotal below minOrderAmount", () => {
      const t = computeCheckoutTotals(baseLines, {
        shippingFlat: 0,
        discountPercent: 10,
        minOrderAmount: 500,
      });
      expect(t.discount).toBe(0);
    });
  });
});
