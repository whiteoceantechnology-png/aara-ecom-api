import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AdminProductsController } from "./admin-products.controller";
import { ProductsService } from "../product/products/products.service";
import { BrandsService } from "./brands.service";
import {
  CreateBrandDto,
  UpdateBrandDto,
  AdminCreateProductDto,
  AdminUpdateProductDto,
  AdminUpdateStockDto,
  AdminAddImageDto,
  UpsertSpecificationBodyDto,
} from "./dto/admin.dto";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

const mockBrand = {
  id: 1,
  name: "Himalaya",
  slug: "himalaya",
  logoUrl: null,
  isActive: true,
};

const mockProduct = {
  id: 1,
  name: "Ashwagandha Root",
  slug: "ashwagandha-root",
  status: true,
  category: { id: 1, name: "Raw Dried Herbs" },
  brand: mockBrand,
  variants: [],
  images: [],
};

const mockProductsService = {
  adminFindAll: jest.fn(),
  adminFindOne: jest.fn(),
  adminCreate: jest.fn(),
  adminUpdate: jest.fn(),
  adminDelete: jest.fn(),
  updateStock: jest.fn(),
  addImage: jest.fn(),
  deleteImage: jest.fn(),
  upsertSpecification: jest.fn(),
  deleteSpecification: jest.fn(),
};

const mockBrandsService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe("AdminProductsController", () => {
  let controller: AdminProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
        { provide: BrandsService, useValue: mockBrandsService },
      ],
    }).compile();

    controller = module.get<AdminProductsController>(AdminProductsController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // Brands
  // ──────────────────────────────────────────────
  describe("getBrands()", () => {
    it("should return all brands", async () => {
      mockBrandsService.findAll.mockResolvedValue([mockBrand]);

      const result = await controller.getBrands();

      expect(mockBrandsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockBrand]);
    });
  });

  describe("createBrand()", () => {
    it("should create and return a new brand", async () => {
      const dto: CreateBrandDto = { name: "Himalaya", slug: "himalaya" };
      mockBrandsService.create.mockResolvedValue(mockBrand);

      const result = await controller.createBrand(dto);

      expect(mockBrandsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBrand);
    });
  });

  describe("updateBrand()", () => {
    it("should update and return the brand", async () => {
      const dto: UpdateBrandDto = { name: "Himalaya Wellness" };
      mockBrandsService.update.mockResolvedValue({
        ...mockBrand,
        name: "Himalaya Wellness",
      });

      const result = await controller.updateBrand(1, dto);

      expect(mockBrandsService.update).toHaveBeenCalledWith(1, dto);
      expect(result.name).toBe("Himalaya Wellness");
    });

    it("should throw NotFoundException for unknown brand", async () => {
      mockBrandsService.update.mockRejectedValue(
        new NotFoundException("Brand #99 not found"),
      );

      await expect(controller.updateBrand(99, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteBrand()", () => {
    it("should delete brand and return message", async () => {
      mockBrandsService.remove.mockResolvedValue({
        message: "Brand #1 deleted",
      });

      const result = await controller.deleteBrand(1);

      expect(mockBrandsService.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: "Brand #1 deleted" });
    });

    it("should throw NotFoundException for unknown brand", async () => {
      mockBrandsService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteBrand(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Products
  // ──────────────────────────────────────────────
  describe("getProducts()", () => {
    it("should return all products with no filters", async () => {
      mockProductsService.adminFindAll.mockResolvedValue([mockProduct]);

      const result = await controller.getProducts();

      expect(mockProductsService.adminFindAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual([mockProduct]);
    });

    it("should parse and forward categoryId and brandId filters", async () => {
      mockProductsService.adminFindAll.mockResolvedValue([mockProduct]);

      await controller.getProducts("ashwagandha", "1", "2");

      expect(mockProductsService.adminFindAll).toHaveBeenCalledWith(
        "ashwagandha",
        1,
        2,
        undefined,
        undefined,
      );
    });

    it("should forward specKey and specValue filters", async () => {
      mockProductsService.adminFindAll.mockResolvedValue([mockProduct]);

      await controller.getProducts(
        undefined,
        undefined,
        undefined,
        "Fabric",
        "Cotton",
      );

      expect(mockProductsService.adminFindAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        "Fabric",
        "Cotton",
      );
    });
  });

  describe("getProduct()", () => {
    it("should return product detail by ID", async () => {
      mockProductsService.adminFindOne.mockResolvedValue(mockProduct);

      const result = await controller.getProduct(1);

      expect(mockProductsService.adminFindOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });

    it("should throw NotFoundException for unknown product", async () => {
      mockProductsService.adminFindOne.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.getProduct(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createProduct()", () => {
    it("should create and return a product", async () => {
      const dto: AdminCreateProductDto = {
        categoryId: 1,
        name: "Ashwagandha Root",
        slug: "ashwagandha-root",
      };
      mockProductsService.adminCreate.mockResolvedValue(mockProduct);

      const result = await controller.createProduct(dto);

      expect(mockProductsService.adminCreate).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe("updateProduct()", () => {
    it("should update and return product", async () => {
      const dto: AdminUpdateProductDto = {
        name: "Ashwagandha Powder",
        status: false,
      };
      mockProductsService.adminUpdate.mockResolvedValue({
        ...mockProduct,
        ...dto,
      });

      const result = await controller.updateProduct(1, dto);

      expect(mockProductsService.adminUpdate).toHaveBeenCalledWith(1, dto);
      expect(result.name).toBe("Ashwagandha Powder");
    });
  });

  describe("deleteProduct()", () => {
    it("should delete and return message", async () => {
      mockProductsService.adminDelete.mockResolvedValue({
        message: "Product #1 deleted",
      });

      const result = await controller.deleteProduct(1);

      expect(mockProductsService.adminDelete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: "Product #1 deleted" });
    });

    it("should throw NotFoundException for unknown product", async () => {
      mockProductsService.adminDelete.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.deleteProduct(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Stock
  // ──────────────────────────────────────────────
  describe("updateStock()", () => {
    it("should update stock for a variant", async () => {
      const dto: AdminUpdateStockDto = { stockQuantity: 150 };
      const updated = {
        id: 1,
        stockQuantity: 150,
        packSize: { label: "25 g" },
      };
      mockProductsService.updateStock.mockResolvedValue(updated);

      const result = await controller.updateStock(1, dto);

      expect(mockProductsService.updateStock).toHaveBeenCalledWith(1, dto);
      expect(result.stockQuantity).toBe(150);
    });

    it("should throw NotFoundException for unknown variant", async () => {
      mockProductsService.updateStock.mockRejectedValue(
        new NotFoundException("Variant #99 not found"),
      );

      await expect(
        controller.updateStock(99, { stockQuantity: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // Images
  // ──────────────────────────────────────────────
  describe("addImage()", () => {
    it("should add image to a product", async () => {
      const dto: AdminAddImageDto = {
        imageUrl: "https://cdn.example.com/img.jpg",
        isPrimary: true,
      };
      const image = { id: 1, productId: 1, ...dto };
      mockProductsService.addImage.mockResolvedValue(image);

      const result = await controller.addImage(1, dto);

      expect(mockProductsService.addImage).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(image);
    });
  });

  describe("deleteImage()", () => {
    it("should delete an image and return message", async () => {
      mockProductsService.deleteImage.mockResolvedValue({
        message: "Image #1 deleted",
      });

      const result = await controller.deleteImage(1);

      expect(mockProductsService.deleteImage).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: "Image #1 deleted" });
    });

    it("should throw NotFoundException for unknown image", async () => {
      mockProductsService.deleteImage.mockRejectedValue(
        new NotFoundException("Image #99 not found"),
      );

      await expect(controller.deleteImage(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Specification
  // ──────────────────────────────────────────────
  describe("upsertSpecification()", () => {
    it("should create or update specification", async () => {
      const dto: UpsertSpecificationBodyDto = {
        specification: [
          {
            title: "Product Details",
            items: [
              { key: "Fabric", value: "Cotton" },
              { key: "Fit", value: "Regular" },
            ],
          },
        ],
        description: {
          shortDescription: "Brief summary",
          longDescription: "Full description",
          moreInfoHtml: "<ul><li>Feature 1</li></ul>",
        },
      };
      const payload = {
        specification: {
          id: 1,
          productId: 7,
          productSpecification: dto.specification,
        },
        description: {
          shortDescription: "Brief summary",
          longDescription: "Full description",
          productDescription: "Full description",
          moreInfoHtml: "<ul><li>Feature 1</li></ul>",
          moreInfo: "<ul><li>Feature 1</li></ul>",
          categoryName: "Herbs",
        },
      };
      mockProductsService.upsertSpecification.mockResolvedValue(payload);

      const result = await controller.upsertSpecification(7, dto);

      expect(mockProductsService.upsertSpecification).toHaveBeenCalledWith({
        ...dto,
        productId: 7,
      });
      expect(result).toEqual(payload);
    });
  });

  describe("deleteSpecification()", () => {
    it("should delete specification and return message", async () => {
      mockProductsService.deleteSpecification.mockResolvedValue({
        message: "Specification for product #7 deleted",
      });

      const result = await controller.deleteSpecification(7);

      expect(mockProductsService.deleteSpecification).toHaveBeenCalledWith(7);
      expect(result).toEqual({
        message: "Specification for product #7 deleted",
      });
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        AdminProductsController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should NOT mark any route as @Public() — all require auth", () => {
      const methods = [
        "getBrands",
        "createBrand",
        "updateBrand",
        "deleteBrand",
        "getProducts",
        "getProduct",
        "createProduct",
        "updateProduct",
        "deleteProduct",
        "updateStock",
        "addImage",
        "deleteImage",
        "upsertSpecification",
        "deleteSpecification",
      ];
      methods.forEach((method) => {
        const isPublic = Reflect.getMetadata(
          IS_PUBLIC_KEY,
          AdminProductsController.prototype[method],
        );
        expect(isPublic).toBeUndefined();
      });
    });
  });
});
