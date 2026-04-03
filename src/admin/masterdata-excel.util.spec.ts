import {
  rowToAdminCreateProductDto,
  rowToProductImportPayload,
} from "./masterdata-excel.util";

describe("masterdata-excel.util", () => {
  it("maps a minimal row", () => {
    const dto = rowToAdminCreateProductDto({
      categoryId: 2,
      name: "Test",
      slug: "test-slug",
    });
    expect(dto).toEqual({
      categoryId: 2,
      name: "Test",
      slug: "test-slug",
    });
  });

  it("accepts category_id and optional fields", () => {
    const dto = rowToAdminCreateProductDto({
      category_id: 1,
      name: "A",
      slug: "a",
      brand_id: 3,
      description: "Desc",
      hsn_code: "1234",
      tax_percent: 18,
      tax_id: 2,
    });
    expect(dto.categoryId).toBe(1);
    expect(dto.brandId).toBe(3);
    expect(dto.description).toBe("Desc");
    expect(dto.hsnCode).toBe("1234");
    expect(dto.taxPercent).toBe(18);
    expect(dto.taxId).toBe(2);
  });

  it("throws when categoryId missing", () => {
    expect(() => rowToAdminCreateProductDto({ name: "X", slug: "y" })).toThrow(
      /categoryId/,
    );
  });

  it("rowToProductImportPayload parses id for update path", () => {
    const { productId, dto } = rowToProductImportPayload({
      id: 42,
      categoryId: 1,
      name: "A",
      slug: "a",
    });
    expect(productId).toBe(42);
    expect(dto.slug).toBe("a");
  });

  it("rowToProductImportPayload omits productId when id blank", () => {
    const { productId } = rowToProductImportPayload({
      id: "",
      categoryId: 1,
      name: "A",
      slug: "a",
    });
    expect(productId).toBeUndefined();
  });
});
