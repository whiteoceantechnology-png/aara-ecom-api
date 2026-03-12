import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AdminCategoriesController } from "./admin-categories.controller";
import { CategoriesService } from "../product/categories/categories.service";
import {
  AdminCreateCategoryDto,
  AdminUpdateCategoryDto,
} from "./dto/admin.dto";

const mockCategory = {
  id: 1,
  name: "Raw Dried Herbs",
  slug: "raw-dried-herbs",
  isActive: true,
  parent: null,
  children: [],
  _count: { products: 3 },
};

const mockCategoriesService = {
  adminFindAll: jest.fn(),
  adminFindOne: jest.fn(),
  adminCreate: jest.fn(),
  adminUpdate: jest.fn(),
  adminRemove: jest.fn(),
};

describe("AdminCategoriesController", () => {
  let controller: AdminCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    controller = module.get<AdminCategoriesController>(
      AdminCategoriesController,
    );
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // GET /admin/categories
  // ──────────────────────────────────────────────
  describe("findAll()", () => {
    it("should return all categories with parent/child/count", async () => {
      mockCategoriesService.adminFindAll.mockResolvedValue([mockCategory]);

      const result = await controller.findAll();

      expect(mockCategoriesService.adminFindAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockCategory]);
    });

    it("should return empty array when no categories exist", async () => {
      mockCategoriesService.adminFindAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // GET /admin/categories/:id
  // ──────────────────────────────────────────────
  describe("findOne()", () => {
    it("should return category detail with products", async () => {
      const detail = {
        ...mockCategory,
        products: [{ id: 1, name: "Ashwagandha" }],
      };
      mockCategoriesService.adminFindOne.mockResolvedValue(detail);

      const result = await controller.findOne(1);

      expect(mockCategoriesService.adminFindOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(detail);
    });

    it("should throw NotFoundException for non-existent category", async () => {
      mockCategoriesService.adminFindOne.mockRejectedValue(
        new NotFoundException("Category #99 not found"),
      );

      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // POST /admin/categories
  // ──────────────────────────────────────────────
  describe("create()", () => {
    it("should create and return a new category", async () => {
      const dto: AdminCreateCategoryDto = {
        name: "Oils & Extracts",
        slug: "oils-extracts",
      };
      mockCategoriesService.adminCreate.mockResolvedValue({ id: 2, ...dto });

      const result = await controller.create(dto);

      expect(mockCategoriesService.adminCreate).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 2, ...dto });
    });
  });

  // ──────────────────────────────────────────────
  // PUT /admin/categories/:id
  // ──────────────────────────────────────────────
  describe("update()", () => {
    it("should update and return the category", async () => {
      const dto: AdminUpdateCategoryDto = { isActive: false };
      mockCategoriesService.adminUpdate.mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });

      const result = await controller.update(1, dto);

      expect(mockCategoriesService.adminUpdate).toHaveBeenCalledWith(1, dto);
      expect(result.isActive).toBe(false);
    });

    it("should throw NotFoundException when category does not exist", async () => {
      mockCategoriesService.adminUpdate.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.update(99, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /admin/categories/:id
  // ──────────────────────────────────────────────
  describe("remove()", () => {
    it("should delete and return success message", async () => {
      mockCategoriesService.adminRemove.mockResolvedValue({
        message: "Category #1 deleted",
      });

      const result = await controller.remove(1);

      expect(mockCategoriesService.adminRemove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: "Category #1 deleted" });
    });

    it("should throw NotFoundException for non-existent category", async () => {
      mockCategoriesService.adminRemove.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
