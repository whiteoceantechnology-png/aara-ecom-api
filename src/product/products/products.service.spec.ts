import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("ProductsService", () => {
  let service: ProductsService;

  const tx = {
    cartItem: { deleteMany: jest.fn() },
    productImage: { deleteMany: jest.fn() },
    productVariant: { deleteMany: jest.fn() },
    product: { delete: jest.fn() },
  };

  const prisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productImage: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    productSpecification: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    productSpecItem: { deleteMany: jest.fn(), createMany: jest.fn() },
    category: { findUnique: jest.fn() },
    brand: { findUnique: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    orderItem: { count: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (t: typeof tx) => Promise<unknown>)(tx);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  const productRow = {
    id: 1,
    name: "Ashwagandha",
    hsnCode: "12119029",
    taxPercent: "5",
    tax: null as { id: number; name: string; percent: string } | null,
    status: true,
    category: { id: 1, name: "Herbs" },
    variants: [
      {
        id: 10,
        sku: "ASH-1",
        price: "10",
        stockQuantity: 5,
        status: true,
        packSize: { label: "100g" },
      },
    ],
    images: [] as { id: number; imageUrl: string; isPrimary: boolean }[],
  };

  describe("findAll", () => {
    it("should return mapped products", async () => {
      prisma.product.findMany.mockResolvedValue([productRow]);

      const result = await service.findAll({});

      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(result[0]).toMatchObject({
        productName: "Ashwagandha",
        id: 1,
      });
    });

    it("should pass category filter", async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.findAll({ category: 2 });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 2 }),
        }),
      );
    });

    it("should pass search and spec filters", async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.findAll({
        search: "root",
        specKey: "origin",
        specValue: "India",
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: "root", mode: "insensitive" },
            specItems: {
              some: {
                key: "origin",
                value: { equals: "India", mode: "insensitive" },
              },
            },
          }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should not return slug and should map variant images to imagePath", async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...productRow,
        variants: [
          {
            ...productRow.variants[0],
            images: [{ imageUrl: "/images/products/a.png" }],
          },
        ],
      });

      const result = await service.findOne(1);
      expect(prisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(result).toHaveProperty("productName", "Ashwagandha");
      expect((result as any).variants?.[0]?.imagePath).toEqual(
        expect.arrayContaining([
          expect.stringContaining("/images/products/a.png"),
        ]),
      );
    });
  });

  describe("findOne", () => {
    it("should return product with productName", async () => {
      prisma.product.findUnique.mockResolvedValue(productRow);

      const result = await service.findOne(1);

      expect(result.productName).toBe("Ashwagandha");
      expect(prisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it("should throw NotFoundException when missing", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("should validate category and create product", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.product.create.mockResolvedValue({
        id: 1,
        name: "New",
        tax: null,
      });

      const dto = {
        categoryId: 1,
        name: "New",
      };
      const result = await service.create(dto as any);

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.product.create).toHaveBeenCalled();
      expect(result.productName).toBe("New");
    });

    it("should persist listing price and image when provided", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.product.create.mockResolvedValue({ id: 2, name: "P", tax: null });

      await service.create({
        categoryId: 1,
        name: "P",
        actualPrice: 1699,
        discountPrice: 1455,
        productImage: "/images/products/sample.png",
      } as any);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actualPrice: 1699,
          discountPrice: 1455,
          productImage: "/images/products/sample.png",
          taxId: null,
          taxPercent: 0,
        }),
        include: {
          tax: { select: { id: true, name: true, percent: true } },
        },
      });
    });

    it("should throw when category missing", async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          categoryId: 99,
          name: "X",
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should throw NotFound when product missing", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update(99, {})).rejects.toThrow(NotFoundException);
    });

    it("should update when product exists", async () => {
      prisma.product.findUnique.mockResolvedValue(productRow);
      prisma.product.update.mockResolvedValue({ ...productRow, name: "Up" });

      const result = await service.update(1, { name: "Up" } as any);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { name: "Up" },
        }),
      );
      expect(result.productName).toBe("Up");
    });
  });

  describe("remove / adminDelete (deleteProductById)", () => {
    beforeEach(() => {
      prisma.product.findUnique.mockResolvedValue(productRow);
      prisma.productVariant.findMany.mockResolvedValue([{ id: 10 }]);
      prisma.orderItem.count.mockResolvedValue(0);
      tx.cartItem.deleteMany.mockResolvedValue({ count: 0 });
      tx.productImage.deleteMany.mockResolvedValue({ count: 0 });
      tx.productVariant.deleteMany.mockResolvedValue({ count: 1 });
      tx.product.delete.mockResolvedValue(productRow);
    });

    it("remove should run transaction and return storefront message", async () => {
      const result = await service.remove(1);

      expect(prisma.orderItem.count).toHaveBeenCalledWith({
        where: { variantId: { in: [10] } },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalled();
      expect(tx.productVariant.deleteMany).toHaveBeenCalled();
      expect(tx.product.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: "Product deleted successfully" });
    });

    it("adminDelete should use same path and return admin message", async () => {
      const result = await service.adminDelete(1);

      expect(tx.product.delete).toHaveBeenCalled();
      expect(result).toEqual({ message: "Product #1 deleted" });
    });

    it("should throw NotFound when findOne fails", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should throw ConflictException when order lines reference variants", async () => {
      prisma.orderItem.count.mockResolvedValue(1);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should delete product with no variants without order count edge", async () => {
      prisma.productVariant.findMany.mockResolvedValue([]);

      await service.remove(7);

      expect(prisma.orderItem.count).not.toHaveBeenCalled();
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ productId: 7 }] },
      });
      expect(tx.product.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });

  describe("findVariants", () => {
    it("should throw when product not found", async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findVariants(1)).rejects.toThrow(NotFoundException);
    });

    it("should list variants with packSize", async () => {
      prisma.product.findUnique.mockResolvedValue(productRow);
      prisma.productVariant.findMany.mockResolvedValue([
        { id: 1, packSize: { size: "1", unit: "g", label: "1g" } },
      ]);

      const rows = await service.findVariants(1);
      expect(rows).toHaveLength(1);
      expect(prisma.productVariant.findMany).toHaveBeenCalled();
    });
  });

  describe("findVariantsByProductId", () => {
    it("should throw when product missing", async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findVariantsByProductId(9)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should map variant fields", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 1, name: "P" });
      prisma.productVariant.findMany.mockResolvedValue([
        {
          id: 3,
          productId: 1,
          variantName: "V",
          variantColor: null,
          isColor: 0,
          price: "10",
          actualPrice: null,
          discountPrice: null,
          altTags: [],
          stockQuantity: 4,
          favourites: 0,
          product: { name: "P" },
          images: [],
        },
      ]);

      const rows = await service.findVariantsByProductId(1);
      expect(rows[0]).toMatchObject({
        id: 3,
        productName: "P",
        availableStock: 4,
      });
    });
  });

  describe("findSpecification", () => {
    it("should throw when product missing", async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findSpecification(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return null specification block when none stored", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 1,
        description: "D",
        category: { name: "Cat" },
      });
      prisma.productSpecification.findFirst.mockResolvedValue(null);

      const result = await service.findSpecification(1);

      expect(result.specification).toBeNull();
      expect(result.description?.longDescription).toBe("D");
      expect(result.description?.productDescription).toBe("D");
      expect(result.description?.moreInfo).toBeNull();
      expect(result.description?.moreInfoHtml).toBeNull();
      expect(result.description?.categoryName).toBe("Cat");
    });

    it("should merge spec row with description", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 1,
        description: "Long",
        category: { name: "Cat" },
      });
      prisma.productSpecification.findFirst.mockResolvedValue({
        id: 1,
        productId: 1,
        productSpecification: [],
        shortDescription: "S",
        productDescription: "P",
        moreInfo: "<p>x</p>",
      });

      const result = await service.findSpecification(1);

      expect(result.specification).not.toBeNull();
      expect(result.description?.shortDescription).toBe("S");
      expect(result.description?.longDescription).toBe("P");
      expect(result.description?.productDescription).toBe("P");
      expect(result.description?.moreInfoHtml).toBe("<p>x</p>");
      expect(result.description?.moreInfo).toBe("<p>x</p>");
    });
  });

  describe("adminFindAll", () => {
    it("should query with optional filters", async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.adminFindAll("tea", 1, 2, "key", "val");
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: "tea", mode: "insensitive" },
            categoryId: 1,
            brandId: 2,
          }),
        }),
      );
    });
  });

  describe("adminFindOne", () => {
    it("should throw when missing", async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.adminFindOne(1)).rejects.toThrow(NotFoundException);
    });

    it("should return full product graph", async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...productRow,
        brand: null,
        specifications: [],
        specItems: [],
      });
      const p = await service.adminFindOne(1);
      expect(p.id).toBe(1);
    });
  });

  describe("adminCreate", () => {
    it("should validate refs and create", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.brand.findUnique.mockResolvedValue({ id: 2 });
      prisma.product.create.mockResolvedValue({ id: 1 });

      await service.adminCreate({
        categoryId: 1,
        brandId: 2,
        name: "N",
      } as any);

      expect(prisma.product.create).toHaveBeenCalled();
    });

    it("should throw when brand invalid", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(
        service.adminCreate({
          categoryId: 1,
          brandId: 99,
          name: "N",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("adminUpdate", () => {
    it("should require existing product", async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.adminUpdate(1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateStock", () => {
    it("should throw when variant missing", async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStock(1, { stockQuantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update quantity", async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: 1 });
      prisma.productVariant.update.mockResolvedValue({
        id: 1,
        stockQuantity: 20,
      });

      const r = await service.updateStock(1, { stockQuantity: 20 });
      expect(r.stockQuantity).toBe(20);
    });
  });

  describe("addImage", () => {
    it("should clear primary flags when isPrimary", async () => {
      prisma.product.findUnique.mockResolvedValue(productRow);
      prisma.productImage.create.mockResolvedValue({ id: 1 });

      await service.addImage(1, {
        imageUrl: "/x.png",
        isPrimary: true,
      } as any);

      expect(prisma.productImage.updateMany).toHaveBeenCalledWith({
        where: { productId: 1 },
        data: { isPrimary: false },
      });
      expect(prisma.productImage.create).toHaveBeenCalled();
    });
  });

  describe("deleteImage", () => {
    it("should throw when image missing", async () => {
      prisma.productImage.findUnique.mockResolvedValue(null);
      await expect(service.deleteImage(1)).rejects.toThrow(NotFoundException);
    });

    it("should delete image row", async () => {
      prisma.productImage.findUnique.mockResolvedValue({
        id: 1,
        productId: 1,
      });
      await service.deleteImage(1);
      expect(prisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe("upsertSpecification", () => {
    it("should run transaction with upsert, deleteMany, createMany", async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(productRow)
        .mockResolvedValueOnce({
          id: 1,
          description: "l",
          category: { name: "Herbs" },
        });
      prisma.productSpecification.upsert.mockResolvedValue({ id: 1 });
      prisma.productSpecItem.deleteMany.mockResolvedValue({ count: 0 });
      prisma.productSpecItem.createMany.mockResolvedValue({ count: 2 });
      prisma.productSpecification.findFirst.mockResolvedValue({
        id: 1,
        productId: 1,
        productSpecification: [
          { title: "T", items: [{ key: "k", value: "v" }] },
        ],
        shortDescription: "s",
        productDescription: "l",
        moreInfo: "m",
      });

      const dto = {
        productId: 1,
        specification: [
          {
            title: "T",
            items: [{ key: "k", value: "v" }],
          },
        ],
        description: {
          shortDescription: "s",
          longDescription: "l",
          moreInfoHtml: "m",
        },
      };

      const result = await service.upsertSpecification(dto as any);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.productSpecification.upsert).toHaveBeenCalled();
      expect(prisma.productSpecItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            productId: 1,
            title: "T",
            key: "k",
            value: "v",
          }),
        ],
      });
      expect(result.specification?.productId).toBe(1);
      expect(result.description?.categoryName).toBe("Herbs");
    });

    it("should map productDescription and moreInfo aliases onto DB fields", async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(productRow)
        .mockResolvedValueOnce({
          id: 1,
          description: null,
          category: { name: "Cat" },
        });
      prisma.productSpecification.upsert.mockResolvedValue({ id: 1 });
      prisma.productSpecItem.deleteMany.mockResolvedValue({ count: 0 });
      prisma.productSpecItem.createMany.mockResolvedValue({ count: 0 });
      prisma.productSpecification.findFirst.mockResolvedValue({
        id: 1,
        productId: 1,
        productSpecification: [],
        shortDescription: null,
        productDescription: "PD",
        moreInfo: "<ul></ul>",
      });

      await service.upsertSpecification({
        productId: 1,
        specification: [],
        description: {
          productDescription: "PD",
          moreInfo: "<ul></ul>",
        },
      } as any);

      expect(prisma.productSpecification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            productDescription: "PD",
            moreInfo: "<ul></ul>",
          }),
          create: expect.objectContaining({
            productDescription: "PD",
            moreInfo: "<ul></ul>",
          }),
        }),
      );
    });
  });

  describe("deleteSpecification", () => {
    it("should delete spec rows", async () => {
      prisma.product.findUnique.mockResolvedValue(productRow);
      prisma.productSpecItem.deleteMany.mockResolvedValue({ count: 1 });
      prisma.productSpecification.deleteMany.mockResolvedValue({ count: 1 });

      const msg = await service.deleteSpecification(1);
      expect(msg.message).toContain("1");
      expect(prisma.productSpecItem.deleteMany).toHaveBeenCalled();
      expect(prisma.productSpecification.deleteMany).toHaveBeenCalled();
    });
  });
});
