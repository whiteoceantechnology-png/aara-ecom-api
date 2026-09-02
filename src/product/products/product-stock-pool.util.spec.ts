import {
  FREE_SHIPPING_MIN_MERCHANDISE,
  resolveShippingAmount,
  unitsToConsume,
  parsePackLabelToBaseUnits,
  poolAvailableInBase,
  normalizeStockForStorage,
  unitsToDeductFromStoredPool,
  toBaseUnits,
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

  describe("normalizeStockForStorage", () => {
    it("converts KG to grams", () => {
      expect(normalizeStockForStorage(100, "KG")).toEqual({
        stock: 100000,
        stockUnit: "g",
      });
    });

    it("keeps UNIT as pack-count", () => {
      expect(normalizeStockForStorage(20, "UNIT")).toEqual({
        stock: 20,
        stockUnit: "UNIT",
      });
    });
  });

  describe("unitsToConsume + poolAvailableInBase", () => {
    it("uses pack-count mode when stockUnit is unset/UNIT", () => {
      expect(
        unitsToConsume({
          quantity: 3,
          stockUnit: null,
          variantName: "500 g",
        }),
      ).toBe(3);
      expect(poolAvailableInBase(100, 0, "UNIT")).toBe(100);
    });

    it("compares 1kg pack against 100 KG pool in base units", () => {
      const needed = unitsToConsume({
        quantity: 1,
        stockUnit: "KG",
        variantName: "1 kg",
      });
      const available = poolAvailableInBase(100, 0, "KG");
      expect(needed).toBe(1000);
      expect(available).toBe(100000);
      expect(needed).toBeLessThanOrEqual(available);
    });

    it("allows 100g from 100 KG pool", () => {
      const needed = unitsToConsume({
        quantity: 1,
        stockUnit: "KG",
        variantName: "100 g",
      });
      expect(needed).toBe(100);
      expect(poolAvailableInBase(100, 0, "KG")).toBeGreaterThanOrEqual(needed);
    });

    it("uses grams mode when stock already normalized", () => {
      expect(
        unitsToConsume({
          quantity: 2,
          stockUnit: "g",
          variantName: "5 kg",
        }),
      ).toBe(10000);
      expect(poolAvailableInBase(100000, 0, "g")).toBe(100000);
    });
  });

  describe("unitsToDeductFromStoredPool", () => {
    it("deducts grams directly when stockUnit is g", () => {
      expect(unitsToDeductFromStoredPool(1000, "g")).toBe(1000);
    });

    it("deducts whole KG from legacy KG rows", () => {
      expect(unitsToDeductFromStoredPool(1000, "KG")).toBe(1);
    });
  });

  describe("toBaseUnits", () => {
    it("scales kg and L", () => {
      expect(toBaseUnits(100, "KG")).toBe(100000);
      expect(toBaseUnits(2, "L")).toBe(2000);
    });
  });
});
