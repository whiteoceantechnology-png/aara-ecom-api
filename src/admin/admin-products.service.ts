import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminCreateProductDto,
  AdminUpdateProductDto,
  AdminUpdateStockDto,
  AdminAddImageDto,
  CreateBrandDto,
  UpdateBrandDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Brands ──────────────────────────────────────────────────────────────────

  async getBrands() {
    return await this.prisma.brand.findMany({ orderBy: { name: "asc" } });
  }

  async createBrand(dto: CreateBrandDto) {
    return await this.prisma.brand.create({ data: dto });
  }

  async updateBrand(id: number, dto: UpdateBrandDto) {
    await this.findBrandOrFail(id);
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async deleteBrand(id: number) {
    await this.findBrandOrFail(id);
    await this.prisma.brand.delete({ where: { id } });
    return { message: `Brand #${id} deleted` };
  }

  private async findBrandOrFail(id: number) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand #${id} not found`);
    return brand;
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async getProducts(search?: string, categoryId?: number, brandId?: number) {
    return await this.prisma.product.findMany({
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

  async getProductById(id: number) {
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

  async createProduct(dto: AdminCreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category)
      throw new BadRequestException(`Category #${dto.categoryId} not found`);

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
      });
      if (!brand)
        throw new BadRequestException(`Brand #${dto.brandId} not found`);
    }

    return await this.prisma.product.create({
      data: dto,
      include: { category: true, brand: true },
    });
  }

  async updateProduct(id: number, dto: AdminUpdateProductDto) {
    await this.findProductOrFail(id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, brand: true, variants: true, images: true },
    });
  }

  async deleteProduct(id: number) {
    await this.findProductOrFail(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: `Product #${id} deleted` };
  }

  // ─── Stock ───────────────────────────────────────────────────────────────────

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

  // ─── Images ──────────────────────────────────────────────────────────────────

  async addImage(productId: number, dto: AdminAddImageDto) {
    await this.findProductOrFail(productId);

    // If setting as primary, unset all existing primary images first
    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.create({
      data: { productId, ...dto },
    });
  }

  async deleteImage(imageId: number) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException(`Image #${imageId} not found`);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: `Image #${imageId} deleted` };
  }

  private async findProductOrFail(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }
}
