import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "../dto/category.dto";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

const mockCategory = {
  id: 1,
  name: "Raw Dried Herbs",
  slug: "raw-dried-herbs",
  createdAt: new Date(),
};

const mockCategoriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe("CategoriesController", () => {
  let controller: CategoriesController;
  let service: typeof mockCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return an array of categories", async () => {
      service.findAll.mockResolvedValue([mockCategory]);
      const result = await controller.findAll();
      expect(result).toEqual([mockCategory]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("findOne", () => {
    it("should return a single category by id", async () => {
      service.findOne.mockResolvedValue(mockCategory);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockCategory);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when category not found", async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("should create and return a category", async () => {
      const dto: CreateCategoryDto = {
        name: "Raw Dried Herbs",
        slug: "raw-dried-herbs",
      };
      service.create.mockResolvedValue(mockCategory);
      const result = await controller.create(dto);
      expect(result).toEqual(mockCategory);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("update", () => {
    it("should update and return the category", async () => {
      const dto: UpdateCategoryDto = { name: "Updated Herbs" };
      service.update.mockResolvedValue({
        ...mockCategory,
        name: "Updated Herbs",
      });
      const result = await controller.update(1, dto);
      expect(result.name).toBe("Updated Herbs");
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it("should throw NotFoundException when category not found", async () => {
      service.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update(99, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should delete a category and return success message", async () => {
      service.remove.mockResolvedValue({
        message: "Category deleted successfully",
      });
      const result = await controller.remove(1);
      expect(result).toEqual({ message: "Category deleted successfully" });
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when category not found", async () => {
      service.remove.mockRejectedValue(new NotFoundException());
      await expect(controller.remove(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        CategoriesController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should mark findAll as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CategoriesController.prototype.findAll,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark findOne as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CategoriesController.prototype.findOne,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark findProductsByCategory as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CategoriesController.prototype.findProductsByCategory,
      );
      expect(isPublic).toBe(true);
    });

    it("should NOT mark create as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CategoriesController.prototype.create,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark update as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CategoriesController.prototype.update,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark remove as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CategoriesController.prototype.remove,
      );
      expect(isPublic).toBeUndefined();
    });
  });
});
