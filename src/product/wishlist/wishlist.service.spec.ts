import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { WishlistService } from "./wishlist.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("WishlistService", () => {
  let service: WishlistService;
  const prisma = {
    product: { findUnique: jest.fn() },
    wishlist: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
  });

  describe("add", () => {
    it("should create row when product exists and not yet wishlisted", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 7, status: true });
      prisma.wishlist.findUnique.mockResolvedValue(null);
      prisma.wishlist.create.mockResolvedValue({ id: 1 });

      const result = await service.add(1, 7);

      expect(result).toEqual({ message: "Product added to wishlist" });
      expect(prisma.wishlist.create).toHaveBeenCalledWith({
        data: { customerId: 1, productId: 7 },
      });
    });

    it("should return already message when duplicate", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 7, status: true });
      prisma.wishlist.findUnique.mockResolvedValue({ id: 1 });

      const result = await service.add(1, 7);

      expect(result).toEqual({ message: "Product already in wishlist" });
      expect(prisma.wishlist.create).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when product missing", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.add(1, 99)).rejects.toThrow(NotFoundException);
      expect(prisma.wishlist.findUnique).not.toHaveBeenCalled();
    });

    it("should throw when product inactive", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 7, status: false });

      await expect(service.add(1, 7)).rejects.toThrow(BadRequestException);
    });
  });

  describe("list", () => {
    it("should return paginated mapped items", async () => {
      prisma.wishlist.findMany.mockResolvedValue([
        {
          product: {
            id: 3,
            name: "Phone",
            actualPrice: "100",
            discountPrice: "90",
            productImage: "/img.png",
            images: [],
          },
        },
      ]);
      prisma.wishlist.count.mockResolvedValue(1);

      const result = await service.list(2, 1, 10);

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        productId: 3,
        name: "Phone",
        price: 90,
      });
      expect(result.items[0].image).toBe("/img.png");
    });

    it("should cap limit at 100", async () => {
      prisma.wishlist.findMany.mockResolvedValue([]);
      prisma.wishlist.count.mockResolvedValue(0);

      await service.list(1, 1, 500);

      expect(prisma.wishlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it("should prefer primary gallery image over productImage", async () => {
      prisma.wishlist.findMany.mockResolvedValue([
        {
          product: {
            id: 1,
            name: "X",
            actualPrice: "10",
            discountPrice: null,
            productImage: "/legacy.png",
            images: [{ imageUrl: "2026/01/a.jpg" }],
          },
        },
      ]);
      prisma.wishlist.count.mockResolvedValue(1);

      const result = await service.list(1, 1, 10);

      expect(result.items[0].image).toContain("/admin/images/serve");
    });
  });

  describe("remove", () => {
    it("should delete and return message", async () => {
      prisma.wishlist.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove(1, 7);

      expect(result).toEqual({ message: "Removed from wishlist" });
    });

    it("should throw when nothing deleted", async () => {
      prisma.wishlist.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(1, 7)).rejects.toThrow(NotFoundException);
    });
  });
});
