import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ProductLookupController } from "./product-lookup.controller";
import { ProductsService } from "./products/products.service";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

describe("ProductLookupController", () => {
  let controller: ProductLookupController;
  const productsService = {
    findVariantsByProductId: jest.fn(),
    findSpecification: jest.fn(),
    upsertSpecification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductLookupController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = module.get<ProductLookupController>(ProductLookupController);
  });

  describe("getVariants", () => {
    it("should delegate to findVariantsByProductId with body productId", async () => {
      const rows = [{ id: 1, sku: "SKU-1" }];
      productsService.findVariantsByProductId.mockResolvedValue(rows);

      const result = await controller.getVariants({ productId: 42 });

      expect(productsService.findVariantsByProductId).toHaveBeenCalledTimes(1);
      expect(productsService.findVariantsByProductId).toHaveBeenCalledWith(42);
      expect(result).toEqual(rows);
    });

    it("should propagate NotFoundException from the service", async () => {
      productsService.findVariantsByProductId.mockRejectedValue(
        new NotFoundException("Product #99 not found"),
      );

      await expect(controller.getVariants({ productId: 99 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getSpecification", () => {
    it("should pass path param id as product id to findSpecification", async () => {
      const payload = {
        specification: {
          id: 5,
          productId: 7,
          productSpecification: [
            { title: "Details", items: [{ key: "Fabric", value: "Cotton" }] },
          ],
        },
        description: {
          shortDescription: "Brief",
          longDescription: "Long",
          productDescription: "Long",
          moreInfoHtml: "<ul></ul>",
          moreInfo: "<ul></ul>",
          categoryName: "business wear trousers",
        },
      };
      productsService.findSpecification.mockResolvedValue(payload);

      const result = await controller.getSpecification(7);

      expect(productsService.findSpecification).toHaveBeenCalledWith(7);
      expect(result).toEqual(payload);
    });

    it("should propagate NotFoundException when product does not exist", async () => {
      productsService.findSpecification.mockRejectedValue(
        new NotFoundException("Product #404 not found"),
      );

      await expect(controller.getSpecification(404)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("upsertSpecification", () => {
    it("should merge path id with body and call upsertSpecification on service", async () => {
      const body = {
        specification: [
          { title: "Details", items: [{ key: "Fabric", value: "Cotton" }] },
        ],
        description: { productDescription: "Long text", moreInfo: "<ul></ul>" },
      };
      const saved = {
        specification: {
          id: 1,
          productId: 7,
          productSpecification: body.specification,
        },
        description: { categoryName: "Cat" },
      };
      productsService.upsertSpecification.mockResolvedValue(saved);

      const result = await controller.upsertSpecification(7, body as any);

      expect(productsService.upsertSpecification).toHaveBeenCalledWith({
        ...body,
        productId: 7,
      });
      expect(result).toEqual(saved);
    });

    it("should let path id override body productId", async () => {
      const body = {
        specification: [],
        productId: 999,
      } as any;
      productsService.upsertSpecification.mockResolvedValue({});

      await controller.upsertSpecification(3, body);

      expect(productsService.upsertSpecification).toHaveBeenCalledWith({
        specification: [],
        productId: 3,
      });
    });

    it("should propagate NotFoundException when product missing", async () => {
      productsService.upsertSpecification.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.upsertSpecification(1, { specification: [] } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("auth and Swagger metadata", () => {
    it("should mark getVariants as @Public()", () => {
      expect(
        Reflect.getMetadata(
          IS_PUBLIC_KEY,
          ProductLookupController.prototype.getVariants,
        ),
      ).toBe(true);
    });

    it("should mark getSpecification as @Public()", () => {
      expect(
        Reflect.getMetadata(
          IS_PUBLIC_KEY,
          ProductLookupController.prototype.getSpecification,
        ),
      ).toBe(true);
    });

    it("should NOT mark upsertSpecification as @Public()", () => {
      expect(
        Reflect.getMetadata(
          IS_PUBLIC_KEY,
          ProductLookupController.prototype.upsertSpecification,
        ),
      ).toBeUndefined();
    });

    it("should attach @ApiBearerAuth to upsertSpecification only (not entire controller)", () => {
      const classSecurity = Reflect.getMetadata(
        "swagger/apiSecurity",
        ProductLookupController,
      );
      expect(classSecurity).toBeUndefined();

      const methodSecurity = Reflect.getMetadata(
        "swagger/apiSecurity",
        ProductLookupController.prototype.upsertSpecification,
      );
      expect(methodSecurity).toEqual([{ bearer: [] }]);
    });

    it("should have ApiTags on controller", () => {
      const tags = Reflect.getMetadata(
        "swagger/apiUseTags",
        ProductLookupController,
      );
      expect(tags).toEqual(["Product Lookup"]);
    });
  });
});
