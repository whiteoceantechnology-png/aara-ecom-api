import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminCreateCategoryDto,
  AdminUpdateCategoryDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: { select: { id: true, name: true, status: true } },
      },
    });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async create(dto: AdminCreateCategoryDto) {
    return await this.prisma.category.create({
      data: {
        name: dto.name,
        ...(dto.categoryImage != null && { categoryImage: dto.categoryImage }),
      },
    });
  }

  async update(id: number, dto: AdminUpdateCategoryDto) {
    await this.findOneOrFail(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: `Category #${id} deleted` };
  }

  private async findOneOrFail(id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`Category #${id} not found`);
    return cat;
  }
}
