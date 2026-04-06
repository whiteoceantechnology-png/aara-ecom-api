import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ReviewsService } from "../reviews/reviews.service";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from "../dto/product.dto";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

const mockVariant = {
  id: 1,
  sku: "ASH-25",
  price: "31",
  packSize: { label: "25 g" },
};
const mockProduct = {
  id: 1,
  name: "Ashwagandha Root",
  // slug removed
  hsnCode: "12119029",
  taxPercent: "5",
  status: true,
  category: { id: 1, name: "Raw Dried Herbs" },
  variants: [mockVariant],
  images: [],
};

const mockProductsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findVariants: jest.fn(),
};

const mockReviewsService = {
  findByProduct: jest.fn(),
};

describe("ProductsController", () => {
  let controller: ProductsController;
  let service: typeof mockProductsService;
  let reviewsService: typeof mockReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
        { provide: ReviewsService, useValue: mockReviewsService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
    reviewsService = module.get(ReviewsService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all products", async () => {
      service.findAll.mockResolvedValue([mockProduct]);
      const result = await controller.findAll({});
      expect(result).toEqual([mockProduct]);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it("should filter products by category", async () => {
      service.findAll.mockResolvedValue([mockProduct]);
      const filter: ProductFilterDto = { category: 1 };
      await controller.findAll(filter);
      expect(service.findAll).toHaveBeenCalledWith(filter);
    });

    it("should filter products by search term", async () => {
      service.findAll.mockResolvedValue([mockProduct]);
      const filter: ProductFilterDto = { search: "ashwagandha" };
      await controller.findAll(filter);
      expect(service.findAll).toHaveBeenCalledWith(filter);
    });
  });

  describe("findOne", () => {
    it("should return a product by id", async () => {
      service.findOne.mockResolvedValue(mockProduct);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockProduct);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when product not found", async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("should create and return a product", async () => {
      const dto: CreateProductDto = {
        categoryId: 1,
        name: "Ashwagandha Root",
        // slug removed
      };
      service.create.mockResolvedValue(mockProduct);
      const result = await controller.create(dto);
      expect(result).toEqual(mockProduct);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("update", () => {
    it("should update and return the product", async () => {
      const dto: UpdateProductDto = { name: "Updated Root" };
      service.update.mockResolvedValue({
        ...mockProduct,
        name: "Updated Root",
      });
      const result = await controller.update(1, dto);
      expect(result.name).toBe("Updated Root");
    });

    it("should throw NotFoundException when product not found", async () => {
      service.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update(99, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should delete a product and return success message", async () => {
      service.remove.mockResolvedValue({
        message: "Product deleted successfully",
      });
      const result = await controller.remove(1);
      expect(result).toEqual({ message: "Product deleted successfully" });
    });

    it("should throw NotFoundException when product not found", async () => {
      service.remove.mockRejectedValue(new NotFoundException());
      await expect(controller.remove(99)).rejects.toThrow(NotFoundException);
    });

    it("should propagate ConflictException when product is on orders", async () => {
      service.remove.mockRejectedValue(
        new ConflictException(
          "Cannot delete this product because it appears on existing orders. Deactivate it or archive it instead.",
        ),
      );
      await expect(controller.remove(1)).rejects.toThrow(ConflictException);
    });
  });

  describe("findVariants", () => {
    it("should return variants for a product", async () => {
      service.findVariants.mockResolvedValue([mockVariant]);
      const result = await controller.findVariants(1);
      expect(result).toEqual([mockVariant]);
      expect(service.findVariants).toHaveBeenCalledWith(1);
    });
  });

  describe("getReviews", () => {
    it("should return reviews aggregate and list", async () => {
      const payload = {
        productId: 1,
        avgRating: 4.5,
        totalReviews: 2,
        reviews: [],
      };
      reviewsService.findByProduct.mockResolvedValue(payload);

      const result = await controller.getReviews(1);

      expect(reviewsService.findByProduct).toHaveBeenCalledWith(1);
      expect(result).toEqual(payload);
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        ProductsController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should mark findAll as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ProductsController.prototype.findAll,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark findOne as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ProductsController.prototype.findOne,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark findVariants as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ProductsController.prototype.findVariants,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark getReviews as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ProductsController.prototype.getReviews,
      );
      expect(isPublic).toBe(true);
    });

    it("should NOT mark create as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ProductsController.prototype.create,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark update as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ProductsController.prototype.update,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark remove as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ProductsController.prototype.remove,
      );
      expect(isPublic).toBeUndefined();
    });
  });
});
