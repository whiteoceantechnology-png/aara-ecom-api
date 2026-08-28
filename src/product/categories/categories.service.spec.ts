import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("CategoriesService", () => {
  let service: CategoriesService;
  const prisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  // ─── findAll (public) ─────────────────────────────────────────────────────

  describe("findAll", () => {
    it("should return categoryImage as raw path, not wrapped in /admin/images/serve URL", async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 2,
          name: "COLOURING AGENTS",
          categoryImage: "2026/04/10/1775832719143-0-195877cd.jpg",
        },
      ]);

      const result = await service.findAll();

      expect(result).toEqual({
        status: true,
        data: [
          {
            id: 2,
            categoryName: "COLOURING AGENTS",
            categoryImage: "2026/04/10/1775832719143-0-195877cd.jpg",
          },
        ],
      });
      // Must NOT contain /admin/images/serve wrapper
      expect(result.data[0].categoryImage).not.toContain("/admin/images/serve");
    });

    it("should return null when categoryImage is empty string", async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: 1, name: "Herbs", categoryImage: "" },
      ]);

      const result = await service.findAll();

      expect(result.data[0].categoryImage).toBeNull();
    });

    it("should return null when categoryImage is null", async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: 1, name: "Herbs", categoryImage: null },
      ]);

      const result = await service.findAll();

      expect(result.data[0].categoryImage).toBeNull();
    });

    it("should map name to categoryName", async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: 5, name: "Oils", categoryImage: null },
      ]);

      const result = await service.findAll();

      expect(result.data[0].categoryName).toBe("Oils");
      expect(result.data[0]).not.toHaveProperty("name");
    });
  });

  // ─── findOne (public) ─────────────────────────────────────────────────────

  describe("findOne", () => {
    it("should return categoryImage as raw path", async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 2,
        name: "COLOURING AGENTS",
        categoryImage: "2026/04/10/1775832719143-0-195877cd.jpg",
        isActive: true,
        createdAt: new Date("2026-04-10"),
        updatedAt: new Date("2026-04-10"),
      });

      const result = await service.findOne(2);

      expect(result.data.categoryImage).toBe(
        "2026/04/10/1775832719143-0-195877cd.jpg",
      );
      expect(result.data.categoryImage).not.toContain("/admin/images/serve");
      expect(result.data.categoryName).toBe("COLOURING AGENTS");
    });

    it("should return null when categoryImage is null", async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 1,
        name: "Herbs",
        categoryImage: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findOne(1);

      expect(result.data.categoryImage).toBeNull();
    });

    it("should throw NotFoundException for non-existent category", async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findProductsByCategory ───────────────────────────────────────────────

  describe("findProductsByCategory", () => {
    it("should return productImage as raw path", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: "Herbs" });
      prisma.product.findMany.mockResolvedValue([
        {
          id: 10,
          categoryId: 1,
          name: "Ashwagandha",
          productImage: "2026/04/10/product-img.jpg",
          discountPrice: 80,
          category: { name: "Herbs" },
        },
      ]);

      const result = await service.findProductsByCategory(1);

      expect(result.data[0].productImage).toBe("2026/04/10/product-img.jpg");
      expect(result.data[0].productImage).not.toContain("/admin/images/serve");
    });

    it("should return null when productImage is null", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: "Herbs" });
      prisma.product.findMany.mockResolvedValue([
        {
          id: 10,
          categoryId: 1,
          name: "Ashwagandha",
          productImage: null,
          discountPrice: null,
          category: { name: "Herbs" },
        },
      ]);

      const result = await service.findProductsByCategory(1);

      expect(result.data[0].productImage).toBeNull();
    });

    it("should throw NotFoundException for non-existent category", async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findProductsByCategory(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── create (storefront) ─────────────────────────────────────────────────

  describe("create (storefront)", () => {
    it("should persist name and optional image", async () => {
      prisma.category.create.mockResolvedValue({
        id: 1,
        name: "Raw Dried Herbs",
      });

      await service.create({
        name: "Raw Dried Herbs",
        categoryImage: "/img.png",
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: "Raw Dried Herbs",
          categoryImage: "/img.png",
        },
      });
    });
  });

  // ─── adminCreate ──────────────────────────────────────────────────────────

  describe("adminCreate", () => {
    it("should persist name and optional image", async () => {
      prisma.category.create.mockResolvedValue({ id: 2 });

      await service.adminCreate({ name: "Oils & Extracts" });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: "Oils & Extracts" },
      });
    });
  });
});
