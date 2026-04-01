import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateVariantDto, UpdateVariantDto } from "../dto/variant.dto";
import { serializeProductVariantForApi } from "../utils/variant-api.util";

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public discovery: valid `packSizeId` values for `POST /admin/variants`. */
  async listPackSizes() {
    const packSizes = await this.prisma.packSize.findMany({
      orderBy: [{ unit: "asc" }, { size: "asc" }, { id: "asc" }],
    });
    return {
      packSizes,
      _hint:
        packSizes.length === 0
          ? "No pack sizes yet — run `npm run db:seed` (adds defaults), then POST /admin/variants with a valid packSizeId (admin JWT)."
          : "POST /admin/variants with productId, packSizeId (from packSizes), price, and sku (admin JWT).",
    };
  }

  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product)
      throw new NotFoundException(`Product #${dto.productId} not found`);

    const packSize = await this.prisma.packSize.findUnique({
      where: { id: dto.packSizeId },
    });
    if (!packSize) {
      const count = await this.prisma.packSize.count();
      const suffix =
        count === 0
          ? " Seed pack sizes first: `npm run db:seed`. Then GET /variants lists valid IDs."
          : " Use GET /variants to see valid packSizeId values.";
      throw new NotFoundException(
        `PackSize #${dto.packSizeId} not found.${suffix}`,
      );
    }

    const created = await this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        packSizeId: dto.packSizeId,
        price: dto.price,
        actualPrice: product.actualPrice,
        discountPrice: product.discountPrice,
        sku: dto.sku,
        stockQuantity: dto.stockQuantity ?? 0,
        status: dto.status ?? true,
      },
      include: {
        packSize: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    return serializeProductVariantForApi(created);
  }

  async update(id: number, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    if (!variant) throw new NotFoundException(`Variant #${id} not found`);
    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: dto,
      include: {
        packSize: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    return serializeProductVariantForApi(updated);
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
