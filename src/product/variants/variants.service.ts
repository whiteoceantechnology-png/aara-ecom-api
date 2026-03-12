import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateVariantDto, UpdateVariantDto } from "../dto/variant.dto";

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVariantDto) {
    return this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        packSizeId: dto.packSizeId,
        price: dto.price,
        sku: dto.sku,
        stockQuantity: dto.stockQuantity ?? 0,
        status: dto.status ?? true,
      },
      include: { packSize: true },
    });
  }

  async update(id: number, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    if (!variant) throw new NotFoundException(`Variant #${id} not found`);
    return this.prisma.productVariant.update({
      where: { id },
      data: dto,
      include: { packSize: true },
    });
  }

  async remove(id: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    if (!variant) throw new NotFoundException(`Variant #${id} not found`);
    await this.prisma.productVariant.delete({ where: { id } });
    return { message: "Variant deleted successfully" };
  }
}
