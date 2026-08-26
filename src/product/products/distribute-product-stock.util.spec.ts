import { distributeProductStock } from "./distribute-product-stock.util";

describe("distributeProductStock", () => {
  it("divides total evenly across variants (sum equals total)", () => {
    const result = distributeProductStock(50, [
      { id: 1, reservedQuantity: 0 },
      { id: 2, reservedQuantity: 0 },
      { id: 3, reservedQuantity: 0 },
      { id: 4, reservedQuantity: 0 },
      { id: 5, reservedQuantity: 0 },
      { id: 6, reservedQuantity: 0 },
    ]);
    expect(result.map((r) => r.stockQuantity)).toEqual([9, 9, 8, 8, 8, 8]);
    expect(result.reduce((s, r) => s + r.stockQuantity, 0)).toBe(50);
  });

  it("does not assign the full total to every variant", () => {
    const result = distributeProductStock(50, [
      { id: 1, reservedQuantity: 0 },
      { id: 2, reservedQuantity: 0 },
    ]);
    expect(result).toEqual([
      { id: 1, stockQuantity: 25 },
      { id: 2, stockQuantity: 25 },
    ]);
  });

  it("respects reservedQuantity floors", () => {
    const result = distributeProductStock(10, [
      { id: 1, reservedQuantity: 4 },
      { id: 2, reservedQuantity: 0 },
      { id: 3, reservedQuantity: 0 },
    ]);
    expect(
      result.find((r) => r.id === 1)!.stockQuantity,
    ).toBeGreaterThanOrEqual(4);
    expect(result.reduce((s, r) => s + r.stockQuantity, 0)).toBe(10);
  });

  it("throws when total is below reserved floor", () => {
    expect(() =>
      distributeProductStock(2, [
        { id: 1, reservedQuantity: 3 },
        { id: 2, reservedQuantity: 0 },
      ]),
    ).toThrow(/reserved/);
  });

  it("returns empty when there are no variants", () => {
    expect(distributeProductStock(50, [])).toEqual([]);
  });
});
