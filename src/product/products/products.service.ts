import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from "../dto/product.dto";
import {
  AdminCreateProductDto,
  AdminUpdateProductDto,
  AdminUpdateStockDto,
  AdminAddImageDto,
} from "../../admin/dto/admin.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: ProductFilterDto) {
    return this.prisma.product.findMany({
      where: {
        ...(filter.category ? { categoryId: filter.category } : {}),
        ...(filter.search
          ? { name: { contains: filter.search, mode: "insensitive" } }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { status: true },
          include: { packSize: { select: { label: true } } },
          select: {
            id: true,
            sku: true,
            price: true,
            stockQuantity: true,
            status: true,
            packSize: true,
          },
        },
        images: { select: { id: true, imageUrl: true, isPrimary: true } },
      },
      orderBy: { id: "asc" },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { status: true },
          include: { packSize: { select: { label: true } } },
        },
        images: { select: { id: true, imageUrl: true, isPrimary: true } },
      },
    });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        hsnCode: dto.hsnCode,
        taxPercent: dto.taxPercent ?? 0,
        status: dto.status ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: "Product deleted successfully" };
  }

  async findVariants(productId: number) {
    await this.findOne(productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      include: { packSize: true },
      orderBy: { packSize: { size: "asc" } },
    });
  }

  async findVariantsByProductId(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);

    const variants = await this.prisma.productVariant.findMany({
      where: { productId, status: true },
      include: {
        product: { select: { name: true } },
        images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { id: "asc" },
    });

    return variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      productName: v.product.name,
      variantName: v.variantName,
      variantImage: v.images.map((img) => img.imageUrl),
      variantColor: v.variantColor,
      isColor: v.isColor,
      actualPrice: v.actualPrice ? Number(v.actualPrice) : Number(v.price),
      discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
      altTags: v.altTags,
      availableStock: v.stockQuantity,
      favourites: v.favourites,
    }));
  }

  async findSpecification(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        description: true,
        category: { select: { name: true } },
      },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);

    const spec = await this.prisma.productSpecification.findFirst({
      where: { productId },
    });

    return {
      specification: spec
        ? {
            id: spec.id,
            productId: spec.productId,
            productSpecification: spec.productSpecification,
          }
        : null,
      description: {
        moreInfo: spec?.moreInfo || null,
        productDescription:
          spec?.productDescription || product.description || null,
        categoryName: product.category.name,
      },
    };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  adminFindAll(search?: string, categoryId?: number, brandId?: number) {
    return this.prisma.product.findMany({
      where: {
        ...(search && { name: { contains: search, mode: "insensitive" } }),
        ...(categoryId && { categoryId }),
        ...(brandId && { brandId }),
      },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: { include: { packSize: true } },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async adminFindOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: { include: { packSize: true } },
        images: true,
      },
    });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  adminCreate(dto: AdminCreateProductDto) {
    return this.prisma.product.create({
      data: dto,
      include: { category: true, brand: true },
    });
  }

  async adminUpdate(id: number, dto: AdminUpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, brand: true, variants: true, images: true },
    });
  }

  async adminDelete(id: number) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: `Product #${id} deleted` };
  }

  async updateStock(variantId: number, dto: AdminUpdateStockDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant)
      throw new NotFoundException(`Variant #${variantId} not found`);
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: dto.stockQuantity },
      include: { packSize: true, product: { select: { name: true } } },
    });
  }

  async addImage(productId: number, dto: AdminAddImageDto) {
    await this.findOne(productId);
    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.productImage.create({ data: { productId, ...dto } });
  }

  async deleteImage(imageId: number) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException(`Image #${imageId} not found`);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: `Image #${imageId} deleted` };
  }
}
