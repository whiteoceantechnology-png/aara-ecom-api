import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  UpsertSpecificationDto,
  SpecSectionDto,
} from "../../admin/dto/admin.dto";
import { toImageUrl, toImageUrls } from "../../common/image-url";
import {
  stringContainsFilter,
  stringEqualsInsensitiveFilter,
} from "../../common/database-provider.util";
import { normalizeStockForStorage } from "./product-stock-pool.util";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: ProductFilterDto) {
    const products = await this.prisma.product.findMany({
      where: {
        ...(filter.category ? { categoryId: filter.category } : {}),
        ...(filter.search ? { name: stringContainsFilter(filter.search) } : {}),
        ...(filter.specKey && filter.specValue
          ? {
              specItems: {
                some: {
                  key: filter.specKey,
                  value: stringEqualsInsensitiveFilter(filter.specValue),
                },
              },
            }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        tax: { select: { id: true, name: true, percent: true } },
        variants: {
          where: { status: true },
          select: {
            id: true,
            sku: true,
            price: true,
            status: true,
            packSize: { select: { label: true } },
            images: {
              select: { imageUrl: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        images: { select: { id: true, imageUrl: true, isPrimary: true } },
      },
      orderBy: { id: "asc" },
    });
    return products.map((p) => this.formatStorefrontProduct(p));
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        tax: { select: { id: true, name: true, percent: true } },
        variants: {
          where: { status: true },
          include: {
            packSize: { select: { label: true } },
            images: {
              orderBy: { sortOrder: "asc" },
              select: { imageUrl: true },
            },
          },
        },
        images: { select: { id: true, imageUrl: true, isPrimary: true } },
      },
    });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return this.formatStorefrontProduct(product);
  }

  async create(dto: CreateProductDto) {
    await this.validateProductRefs(dto.categoryId);
    const taxFields = await this.resolveProductTaxForCreate(dto);
    const created = await this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        hsnCode: dto.hsnCode,
        status: dto.status ?? true,
        ...taxFields,
        ...(dto.discountPrice != null
          ? { discountPrice: dto.discountPrice }
          : {}),
        ...(dto.productImage != null ? { productImage: dto.productImage } : {}),
      },
      include: {
        tax: { select: { id: true, name: true, percent: true } },
      },
    });
    return this.formatStorefrontProduct(created);
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    const { taxId, taxPercent, ...rest } = dto;
    const data: Prisma.ProductUpdateInput = { ...rest };
    if (taxId !== undefined) {
      Object.assign(
        data,
        await this.resolveProductTaxForCreate({ taxId, taxPercent }),
      );
    } else if (taxPercent !== undefined) {
      data.taxPercent = taxPercent;
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        tax: { select: { id: true, name: true, percent: true } },
        variants: {
          where: { status: true },
          include: {
            packSize: { select: { label: true } },
            images: {
              orderBy: { sortOrder: "asc" },
              select: { imageUrl: true },
            },
          },
        },
        images: { select: { id: true, imageUrl: true, isPrimary: true } },
      },
    });
    return this.formatStorefrontProduct(updated);
  }

  async remove(id: number) {
    await this.deleteProductById(id);
    return { message: "Product deleted successfully" };
  }

  /**
   * Deletes a product and non-order dependencies (cart lines, images, variants).
   * Throws {@link ConflictException} if any order line references the product's variants.
   */
  async adminDelete(id: number) {
    await this.deleteProductById(id);
    return { message: `Product #${id} deleted` };
  }

  private async deleteProductById(id: number): Promise<void> {
    await this.findOne(id);

    const variants = await this.prisma.productVariant.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const variantIds = variants.map((v) => v.id);

    if (variantIds.length > 0) {
      const orderLineCount = await this.prisma.orderItem.count({
        where: { variantId: { in: variantIds } },
      });
      if (orderLineCount > 0) {
        throw new ConflictException(
          "Cannot delete this product because it appears on existing orders. Deactivate it or archive it instead.",
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: {
          OR: [
            { productId: id },
            ...(variantIds.length > 0
              ? [{ variantId: { in: variantIds } }]
              : []),
          ],
        },
      });
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
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
      select: {
        id: true,
        name: true,
        stock: true,
        reservedStock: true,
        stockUnit: true,
      },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);

    const variants = await this.prisma.productVariant.findMany({
      where: { productId, status: true },
      include: {
        product: { select: { name: true } },
        packSize: true,
        images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { id: "asc" },
    });

    const availableProductStock = Math.max(
      0,
      product.stock - product.reservedStock,
    );

    return variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      productName: v.product.name,
      variantName: v.variantName,
      variantImage: toImageUrls(v.images.map((img) => img.imageUrl)),
      variantColor: v.variantColor,
      isColor: v.isColor,
      price: Number(v.price),
      discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
      altTags: v.altTags,
      // Pack SKU only — FE derives pack availability from product pool + pack size.
      availableStock: availableProductStock,
      productStock: product.stock,
      reservedStock: product.reservedStock,
      availableProductStock,
      stockUnit: product.stockUnit,
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

    const longText = spec?.productDescription ?? product.description ?? null;
    const moreHtml = spec?.moreInfo ?? null;

    return {
      specification: spec
        ? {
            id: spec.id,
            productId: spec.productId,
            productSpecification: spec.productSpecification,
          }
        : null,
      description: {
        shortDescription: spec?.shortDescription ?? null,
        longDescription: longText,
        productDescription: longText,
        moreInfoHtml: moreHtml,
        moreInfo: moreHtml,
        categoryName: product.category.name,
      },
    };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  adminFindAll(
    search?: string,
    categoryId?: number,
    brandId?: number,
    specKey?: string,
    specValue?: string,
  ) {
    return this.prisma.product.findMany({
      where: {
        ...(search && { name: stringContainsFilter(search) }),
        ...(categoryId && { categoryId }),
        ...(brandId && { brandId }),
        ...(specKey &&
          specValue && {
            specItems: {
              some: {
                key: specKey,
                value: stringEqualsInsensitiveFilter(specValue),
              },
            },
          }),
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
        tax: true,
        variants: { include: { packSize: true } },
        images: true,
        specifications: true,
        specItems: true,
      },
    });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return this.mapAdminProduct(product);
  }

  async adminCreate(dto: AdminCreateProductDto) {
    const brandId = this.normalizeOptionalFk(dto.brandId);
    await this.validateProductRefs(dto.categoryId, brandId);
    const {
      taxId,
      taxPercent,
      productImage,
      stock,
      stockUnit,
      brandId: _brandId,
      actualPrice: _actualPrice,
      ...rest
    } = dto;
    void _brandId;
    void _actualPrice;
    const taxFields = await this.resolveProductTaxForCreate({
      taxId: this.normalizeOptionalFk(taxId),
      taxPercent,
    });
    const imagePaths = this.normalizeImagePaths(productImage);
    const primaryImage = imagePaths[0] ?? null;
    const normalizedStock =
      stock !== undefined
        ? normalizeStockForStorage(stock, stockUnit ?? null)
        : null;

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...rest,
          brandId: brandId ?? null,
          ...taxFields,
          productImage: primaryImage,
          ...(normalizedStock
            ? {
                stock: normalizedStock.stock,
                stockUnit: normalizedStock.stockUnit,
              }
            : stockUnit !== undefined
              ? { stockUnit }
              : {}),
        },
      });

      if (imagePaths.length) {
        await tx.productImage.createMany({
          data: imagePaths.map((imageUrl, index) => ({
            productId: created.id,
            imageUrl,
            isPrimary: index === 0,
          })),
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: { category: true, brand: true, tax: true, images: true },
      });
    });

    return this.mapAdminProduct(product);
  }

  async adminUpdate(id: number, dto: AdminUpdateProductDto) {
    await this.findOne(id);
    const {
      taxId,
      taxPercent,
      productImage,
      brandId,
      categoryId,
      stock,
      stockUnit,
      actualPrice: _actualPrice,
      ...rest
    } = dto;
    void _actualPrice;

    if (categoryId != null || (brandId != null && brandId > 0)) {
      const existing = await this.prisma.product.findUniqueOrThrow({
        where: { id },
        select: { categoryId: true },
      });
      await this.validateProductRefs(
        categoryId ?? existing.categoryId,
        this.normalizeOptionalFk(brandId ?? undefined),
      );
    }

    const data: Prisma.ProductUpdateInput = { ...rest };

    if (categoryId !== undefined) {
      data.category = { connect: { id: categoryId } };
    }

    if (brandId !== undefined) {
      const normalizedBrand = this.normalizeOptionalFk(brandId);
      data.brand =
        normalizedBrand == null
          ? { disconnect: true }
          : { connect: { id: normalizedBrand } };
    }

    if (taxId !== undefined) {
      const taxResolved = await this.resolveProductTaxForCreate({
        taxId: this.normalizeOptionalFk(taxId) ?? undefined,
        taxPercent: taxPercent ?? undefined,
      });
      data.tax =
        taxResolved.taxId == null
          ? { disconnect: true }
          : { connect: { id: taxResolved.taxId } };
      data.taxPercent = taxResolved.taxPercent;
    } else if (taxPercent !== undefined) {
      data.taxPercent = taxPercent;
    }

    if (stock !== undefined) {
      const existingUnit = (
        await this.prisma.product.findUniqueOrThrow({
          where: { id },
          select: { stockUnit: true },
        })
      ).stockUnit;
      const normalized = normalizeStockForStorage(
        stock,
        stockUnit !== undefined ? stockUnit : existingUnit,
      );
      data.stock = normalized.stock;
      data.stockUnit = normalized.stockUnit;
    } else if (stockUnit !== undefined) {
      data.stockUnit = normalizeStockForStorage(0, stockUnit).stockUnit;
    }

    const imagePaths =
      productImage !== undefined
        ? this.normalizeImagePaths(productImage)
        : undefined;
    if (imagePaths !== undefined) {
      data.productImage = imagePaths[0] ?? null;
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data,
      });

      if (imagePaths !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (imagePaths.length) {
          await tx.productImage.createMany({
            data: imagePaths.map((imageUrl, index) => ({
              productId: id,
              imageUrl,
              isPrimary: index === 0,
            })),
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          category: true,
          brand: true,
          variants: { include: { packSize: true } },
          images: true,
          tax: true,
        },
      });
    });

    return this.mapAdminProduct(product);
  }

  async updateStock(variantId: number, dto: AdminUpdateStockDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true, packSize: true },
    });
    if (!variant)
      throw new NotFoundException(`Variant #${variantId} not found`);

    const reserved = variant.product.reservedStock ?? 0;
    if (dto.stockQuantity < reserved) {
      throw new BadRequestException(
        `product stock (${dto.stockQuantity}) cannot be below reservedStock (${reserved})`,
      );
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: variant.productId },
      data: { stock: dto.stockQuantity },
    });

    return {
      id: variant.id,
      productId: variant.productId,
      productStock: updatedProduct.stock,
      reservedStock: updatedProduct.reservedStock,
      availableProductStock: Math.max(
        0,
        updatedProduct.stock - updatedProduct.reservedStock,
      ),
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        stock: updatedProduct.stock,
        reservedStock: updatedProduct.reservedStock,
        stockUnit: updatedProduct.stockUnit,
      },
    };
  }

  async updateProductStock(productId: number, stock: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);
    if (stock < product.reservedStock) {
      throw new BadRequestException(
        `product stock (${stock}) cannot be below reservedStock (${product.reservedStock})`,
      );
    }
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { stock },
    });
    return {
      productId: updated.id,
      stock: updated.stock,
      reservedStock: updated.reservedStock,
      availableProductStock: Math.max(0, updated.stock - updated.reservedStock),
      stockUnit: updated.stockUnit,
    };
  }

  async addImage(productId: number, dto: AdminAddImageDto) {
    await this.findOne(productId);
    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.productImage.create({
      data: {
        productId,
        imageUrl: dto.imageUrl ?? dto.path ?? "",
        isPrimary: dto.isPrimary ?? false,
      },
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

  // ─── Specification (Admin) ───────────────────────────────────────────────────

  async upsertSpecification(dto: UpsertSpecificationDto) {
    await this.findOne(dto.productId);

    const flattened = this.flattenSpecs(dto.productId, dto.specification);
    const desc = dto.description;
    const longText = desc?.longDescription ?? desc?.productDescription ?? null;
    const moreHtml = desc?.moreInfoHtml ?? desc?.moreInfo ?? null;

    await this.prisma.$transaction([
      this.prisma.productSpecification.upsert({
        where: { productId: dto.productId },
        update: {
          productSpecification: dto.specification as object,
          shortDescription: desc?.shortDescription ?? null,
          productDescription: longText,
          moreInfo: moreHtml,
        },
        create: {
          productId: dto.productId,
          productSpecification: dto.specification as object,
          shortDescription: desc?.shortDescription ?? null,
          productDescription: longText,
          moreInfo: moreHtml,
        },
      }),
      this.prisma.productSpecItem.deleteMany({
        where: { productId: dto.productId },
      }),
      this.prisma.productSpecItem.createMany({
        data: flattened,
      }),
    ]);

    return this.findSpecification(dto.productId);
  }

  async deleteSpecification(productId: number) {
    await this.findOne(productId);
    await this.prisma.productSpecItem.deleteMany({ where: { productId } });
    await this.prisma.productSpecification.deleteMany({
      where: { productId },
    });
    return { message: `Specification for product #${productId} deleted` };
  }

  private flattenSpecs(
    productId: number,
    specs: SpecSectionDto[],
  ): { productId: number; title: string; key: string; value: string }[] {
    const result: {
      productId: number;
      title: string;
      key: string;
      value: string;
    }[] = [];
    for (const section of specs) {
      for (const item of section.items) {
        result.push({
          productId,
          title: section.title,
          key: item.key,
          value: item.value,
        });
      }
    }
    return result;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** When `taxId` is set, `taxPercent` is taken from the Tax row (master data). */
  private async resolveProductTaxForCreate(dto: {
    taxId?: number;
    taxPercent?: number;
  }): Promise<{ taxId: number | null; taxPercent: number }> {
    if (dto.taxId != null) {
      const tax = await this.prisma.tax.findUnique({
        where: { id: dto.taxId },
      });
      if (!tax) {
        throw new BadRequestException(`Tax #${dto.taxId} not found`);
      }
      return { taxId: dto.taxId, taxPercent: Number(tax.percent) };
    }
    return { taxId: null, taxPercent: dto.taxPercent ?? 0 };
  }

  private formatStorefrontProduct<
    T extends {
      name: string;
      images?: { imageUrl: string }[];
      tax?: { id: number; name: string; percent: unknown } | null;
      variants?: unknown;
      actualPrice?: unknown;
      discountPrice?: unknown;
    },
  >(product: T) {
    const mapped = this.mapProductWithImageUrls(this.mapProductName(product));
    const tax = mapped.tax
      ? {
          id: mapped.tax.id,
          name: mapped.tax.name,
          percent: Number(mapped.tax.percent),
        }
      : null;
    const {
      tax: previousTax,
      variants,
      actualPrice: _actualPrice,
      discountPrice: _discountPrice,
      ...rest
    } = mapped as typeof mapped & {
      actualPrice?: unknown;
      discountPrice?: unknown;
    };
    void previousTax;
    void _actualPrice;
    void _discountPrice;
    const mappedVariants = Array.isArray(variants)
      ? variants.map((v) => {
          const row = v as {
            images?: { imageUrl: string }[];
            packSize?: unknown;
            actualPrice?: unknown;
            discountPrice?: unknown;
            [key: string]: unknown;
          };
          const {
            images,
            packSize: _packSize,
            actualPrice: _vActual,
            discountPrice: _vDiscount,
            ...vrest
          } = row;
          void _packSize;
          void _vActual;
          void _vDiscount;
          return {
            ...vrest,
            imagePath: Array.isArray(images)
              ? images.map((img) => toImageUrl(img.imageUrl) ?? img.imageUrl)
              : [],
          };
        })
      : variants;
    return { ...rest, tax, variants: mappedVariants };
  }

  private mapProductName<T extends { name: string }>(product: T) {
    const { name, ...rest } = product as T & Record<string, unknown>;
    return { ...(rest as object), productName: name } as Omit<T, "name"> & {
      productName: string;
    };
  }

  private mapProductWithImageUrls<
    T extends { images?: { imageUrl: string }[] },
  >(product: T): T {
    if (!product.images?.length) return product;
    return {
      ...product,
      images: product.images.map((img) => ({
        ...img,
        imageUrl: toImageUrl(img.imageUrl) ?? img.imageUrl,
      })),
    };
  }

  private async validateProductRefs(categoryId: number, brandId?: number) {
    const normalizedBrand = this.normalizeOptionalFk(brandId);
    const [category, brand] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: categoryId } }),
      normalizedBrand != null
        ? this.prisma.brand.findUnique({ where: { id: normalizedBrand } })
        : Promise.resolve(null),
    ]);
    if (!category)
      throw new BadRequestException(`Category #${categoryId} not found`);
    if (normalizedBrand != null && !brand)
      throw new BadRequestException(`Brand #${normalizedBrand} not found`);
  }

  /** Treat 0 / null / empty as “no FK”. */
  private normalizeOptionalFk(id?: number | null): number | undefined {
    if (id == null || id === 0) return undefined;
    return id;
  }

  private normalizeImagePaths(value?: string | string[] | null): string[] {
    if (value == null || value === "") return [];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    return [String(value)].filter(Boolean);
  }

  /** Admin product responses expose `productImage` as a string array. */
  private mapAdminProduct<
    T extends {
      stock?: number;
      reservedStock?: number;
      stockUnit?: string | null;
      productImage?: string | string[] | null;
      images?: { imageUrl: string; isPrimary?: boolean }[];
      variants?: Array<Record<string, unknown>>;
    },
  >(product: T) {
    const fromGallery = (product.images ?? [])
      .slice()
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((img) => img.imageUrl)
      .filter(Boolean);
    const productImage =
      fromGallery.length > 0
        ? fromGallery
        : Array.isArray(product.productImage)
          ? product.productImage
          : product.productImage
            ? [product.productImage]
            : [];

    const stock = product.stock ?? 0;
    const reservedStock = product.reservedStock ?? 0;
    const availableProductStock = Math.max(0, stock - reservedStock);

    const { actualPrice: _productActual, ...productWithoutActual } =
      product as T & { actualPrice?: unknown };
    void _productActual;

    const variants = Array.isArray(product.variants)
      ? product.variants.map((v) => {
          const { actualPrice: _va, ...vrest } = v;
          void _va;
          return {
            ...vrest,
            availableProductStock,
          };
        })
      : product.variants;

    return {
      ...productWithoutActual,
      productImage,
      availableProductStock,
      variants,
    };
  }
}
