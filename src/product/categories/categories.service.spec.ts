import { Test, TestingModule } from "@nestjs/testing";
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
