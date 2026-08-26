import {
  FREE_SHIPPING_MIN_MERCHANDISE,
  resolveShippingAmount,
  unitsToConsume,
  parsePackLabelToBaseUnits,
} from "./product-stock-pool.util";

describe("product-stock-pool.util", () => {
  describe("resolveShippingAmount", () => {
    it("charges flat shipping below threshold", () => {
      expect(resolveShippingAmount(1999.99, 50)).toBe(50);
      expect(resolveShippingAmount(400, 50)).toBe(50);
    });

    it("is free at or above ₹2000 merchandise", () => {
      expect(resolveShippingAmount(2000, 50)).toBe(0);
      expect(resolveShippingAmount(4080, 50)).toBe(0);
      expect(FREE_SHIPPING_MIN_MERCHANDISE).toBe(2000);
    });
  });

  describe("parsePackLabelToBaseUnits", () => {
    it("parses g/kg/ml/L", () => {
      expect(parsePackLabelToBaseUnits("25 g")).toBe(25);
      expect(parsePackLabelToBaseUnits("1 kg")).toBe(1000);
      expect(parsePackLabelToBaseUnits("500 ml")).toBe(500);
      expect(parsePackLabelToBaseUnits("1 L")).toBe(1000);
    });
  });

  describe("unitsToConsume", () => {
    it("uses pack-count mode when stockUnit is unset", () => {
      expect(
        unitsToConsume({
          quantity: 3,
          stockUnit: null,
          variantName: "500 g",
        }),
      ).toBe(3);
    });

    it("uses weight mode when stockUnit is set", () => {
      expect(
        unitsToConsume({
          quantity: 2,
          stockUnit: "g",
          variantName: "5 kg",
        }),
      ).toBe(10000);
    });
  });
});
