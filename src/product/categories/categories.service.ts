import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCategoryDto, UpdateCategoryDto } from "../dto/category.dto";
import {
  AdminCreateCategoryDto,
  AdminUpdateCategoryDto,
} from "../../admin/dto/admin.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        categoryImage: true,
      },
    });
    return {
      status: true,
      data: categories.map((c) => ({
        id: c.id,
        categoryName: c.name,
        categoryImage: c.categoryImage,
      })),
    };
  }

  async findProductsByCategory(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category)
      throw new NotFoundException(`Category #${categoryId} not found`);

    const products = await this.prisma.product.findMany({
      where: { categoryId, status: true },
      select: {
        id: true,
        categoryId: true,
        name: true,
        productImage: true,
        actualPrice: true,
        discountPrice: true,
        category: { select: { name: true } },
      },
      orderBy: { id: "asc" },
    });

    return {
      data: products.map((p) => ({
        id: p.id,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        productName: p.name,
        productImage: p.productImage,
        actualPrice: p.actualPrice ? Number(p.actualPrice) : null,
        discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      })),
    };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent)
        throw new BadRequestException(
          `Parent category #${dto.parentId} not found`,
        );
    }
    return this.prisma.category.create({ data: dto });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: "Category deleted successfully" };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  adminFindAll() {
    return this.prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async adminFindOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: true,
        products: { select: { id: true, name: true, status: true } },
      },
    });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async adminCreate(dto: AdminCreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent)
        throw new BadRequestException(
          `Parent category #${dto.parentId} not found`,
        );
    }
    return this.prisma.category.create({ data: dto });
  }

  async adminUpdate(id: number, dto: AdminUpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async adminRemove(id: number) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: `Category #${id} deleted` };
  }
}
