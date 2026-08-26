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
          hsnCode: null,
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

    it("should extract inclusive GST and not add it to payable total", () => {
      // ₹100 inclusive @ 10% → tax = 100×10/110 ≈ 9.09; total = 100 + 20 shipping
      const t = computeCheckoutTotals(baseLines, { shippingFlat: 20 });
      expect(t.subtotal).toBe(100);
      expect(t.discount).toBe(0);
      expect(t.shipping).toBe(20);
      expect(t.tax).toBe(9.09);
      expect(t.total).toBe(120);
    });

    it("should apply percent discount and scale extracted tax", () => {
      // After 10% off → ₹90 inclusive @ 10% → tax = 90×10/110 ≈ 8.18; total = 90
      const t = computeCheckoutTotals(baseLines, {
        shippingFlat: 0,
        discountPercent: 10,
      });
      expect(t.discount).toBe(10);
      expect(t.subtotal).toBe(100);
      expect(t.tax).toBe(8.18);
      expect(t.items[0].taxAmount).toBe(8.18);
      expect(t.total).toBe(90);
    });

    it("should match GST-inclusive storefront example (80 + 50 shipping = 130)", () => {
      const lines: CartLineInput[] = [
        {
          variantId: 1,
          productId: 1,
          quantity: 2,
          productName: "Mud",
          taxPercent: 5,
          sizeLabel: "25 g",
          currentVariantPrice: 40,
        },
      ];
      const t = computeCheckoutTotals(lines, { shippingFlat: 50 });
      expect(t.subtotal).toBe(80);
      expect(t.tax).toBe(3.81); // 80 × 5 / 105
      expect(t.shipping).toBe(50);
      expect(t.total).toBe(130);
    });

    it("should apply free shipping when merchandise ≥ ₹2000", () => {
      const lines: CartLineInput[] = [
        {
          variantId: 1,
          productId: 1,
          quantity: 6,
          productName: "Bluecorn",
          taxPercent: 5,
          sizeLabel: "25 g",
          currentVariantPrice: 660,
        },
        {
          variantId: 2,
          productId: 2,
          quantity: 1,
          productName: "Allantoin",
          taxPercent: 18,
          sizeLabel: "25 g",
          currentVariantPrice: 120,
        },
      ];
      const t = computeCheckoutTotals(lines, { shippingFlat: 50 });
      expect(t.subtotal).toBe(4080);
      expect(t.shipping).toBe(0);
      expect(t.total).toBe(4080);
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
