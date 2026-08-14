import {
  rowToAdminCreateProductDto,
  rowToProductImportPayload,
  rowToVariantImportPayload,
} from "./masterdata-excel.util";

describe("masterdata-excel.util", () => {
  it("maps a minimal row", () => {
    const dto = rowToAdminCreateProductDto({
      categoryId: 2,
      name: "Test",
    });
    expect(dto).toEqual({
      categoryId: 2,
      name: "Test",
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
    const { productId } = rowToProductImportPayload({
      id: 42,
      categoryId: 1,
      name: "A",
    });
    expect(productId).toBe(42);
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

  it("rowToVariantImportPayload maps create fields", () => {
    const { variantId, sku, createDto, updateDto } = rowToVariantImportPayload({
      productId: 10,
      packSizeId: 2,
      sku: "ASH-25",
      price: 31,
      discountedPrice: 28,
      stockQuantity: 50,
      status: "yes",
      imagePath: "a.jpg|b.jpg",
    });
    expect(variantId).toBeUndefined();
    expect(sku).toBe("ASH-25");
    expect(createDto).toMatchObject({
      productId: 10,
      packSizeId: 2,
      sku: "ASH-25",
      price: 31,
      discountedPrice: 28,
      stockQuantity: 50,
      status: true,
      imagePath: ["a.jpg", "b.jpg"],
    });
    expect(updateDto.sku).toBe("ASH-25");
  });

  it("rowToVariantImportPayload requires sku", () => {
    expect(() =>
      rowToVariantImportPayload({
        productId: 1,
        packSizeId: 1,
        price: 10,
      }),
    ).toThrow(/sku/);
  });

  it("rowToVariantImportPayload parses variant id", () => {
    const { variantId } = rowToVariantImportPayload({
      id: 9,
      product_id: 1,
      pack_size_id: 1,
      sku: "X",
      price: 1,
    });
    expect(variantId).toBe(9);
  });
});
