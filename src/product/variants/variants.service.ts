import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

    const { imagePath, discountedPrice, ...fields } = dto;

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.productVariant.create({
        data: {
          productId: fields.productId,
          packSizeId: fields.packSizeId,
          price: fields.price,
          actualPrice: product.actualPrice,
          discountPrice:
            discountedPrice != null ? discountedPrice : product.discountPrice,
          sku: fields.sku,
          stockQuantity: fields.stockQuantity ?? 0,
          status: fields.status ?? true,
          ...(fields.variantName !== undefined && fields.variantName !== ""
            ? { variantName: fields.variantName }
            : {}),
        },
        include: {
          packSize: true,
          product: { select: { id: true, name: true } },
        },
      });

      if (imagePath?.length) {
        await tx.variantImage.createMany({
          data: imagePath.map((imageUrl, sortOrder) => ({
            variantId: row.id,
            imageUrl: imageUrl.trim(),
            sortOrder,
          })),
        });
      }

      return tx.productVariant.findUniqueOrThrow({
        where: { id: row.id },
        include: {
          packSize: true,
          product: { select: { id: true, name: true } },
          images: { orderBy: { sortOrder: "asc" } },
        },
      });
    });

    return serializeProductVariantForApi(created);
  }

  async update(id: number, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    if (!variant) throw new NotFoundException(`Variant #${id} not found`);

    const { imagePath, discountedPrice, ...rest } = dto;
    const data: Prisma.ProductVariantUpdateInput = {};

    if (rest.packSizeId !== undefined) {
      data.packSize = { connect: { id: rest.packSizeId } };
    }
    if (rest.price !== undefined) data.price = rest.price;
    if (rest.sku !== undefined) data.sku = rest.sku;
    if (rest.stockQuantity !== undefined)
      data.stockQuantity = rest.stockQuantity;
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.variantName !== undefined) {
      data.variantName = rest.variantName === "" ? null : rest.variantName;
    }
    if (discountedPrice !== undefined) {
      data.discountPrice = discountedPrice;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.update({ where: { id }, data });

      if (imagePath !== undefined) {
        await tx.variantImage.deleteMany({ where: { variantId: id } });
        if (imagePath.length > 0) {
          await tx.variantImage.createMany({
            data: imagePath.map((imageUrl, sortOrder) => ({
              variantId: id,
              imageUrl: imageUrl.trim(),
              sortOrder,
            })),
          });
        }
      }

      return tx.productVariant.findUniqueOrThrow({
        where: { id },
        include: {
          packSize: true,
          product: { select: { id: true, name: true } },
          images: { orderBy: { sortOrder: "asc" } },
        },
      });
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
