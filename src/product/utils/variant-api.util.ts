import type {
  PackSize,
  Product,
  ProductVariant,
  VariantImage,
} from "@prisma/client";

type VariantWithRelations = ProductVariant & {
  packSize: PackSize;
  product?: Pick<Product, "id" | "name">;
  images?: VariantImage[];
};

/**
 * Prisma `Decimal` serializes as JSON strings; many clients expect numbers.
 * Ensures `product` (name/slug) is present when included in the query.
 */
export function serializeProductVariantForApi(
  v: VariantWithRelations,
): Record<string, unknown> {
  return {
    id: v.id,
    productId: v.productId,
    packSizeId: v.packSizeId,
    variantName: v.variantName,
    variantColor: v.variantColor,
    isColor: v.isColor,
    price: Number(v.price),
    actualPrice: v.actualPrice != null ? Number(v.actualPrice) : null,
    discountPrice: v.discountPrice != null ? Number(v.discountPrice) : null,
    sku: v.sku,
    altTags: v.altTags,
    favourites: v.favourites,
    status: v.status,
    packSize: {
      id: v.packSize.id,
      size: Number(v.packSize.size),
      unit: v.packSize.unit,
      label: v.packSize.label,
    },
    ...(v.product
      ? {
          product: {
            id: v.product.id,
            name: v.product.name,
          },
        }
      : {}),
    imagePath: v.images?.map((img) => img.imageUrl) ?? [],
  };
}
