import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { toImageUrl } from "../../common/image-url";

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(customerId: number, productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    });
    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }
    if (!product.status) {
      throw new BadRequestException("Product is not available");
    }

    const existing = await this.prisma.wishlist.findUnique({
      where: {
        customerId_productId: { customerId, productId },
      },
    });
    if (existing) {
      return { message: "Product already in wishlist" };
    }

    await this.prisma.wishlist.create({
      data: { customerId, productId },
    });
    return { message: "Product added to wishlist" };
  }

  async list(customerId: number, page = 1, limit = 10) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;
    const where = { customerId };

    const [rows, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              actualPrice: true,
              discountPrice: true,
              productImage: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                select: { imageUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.wishlist.count({ where }),
    ]);

    return {
      items: rows.map((w) => this.mapWishlistRow(w)),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async remove(customerId: number, productId: number) {
    const result = await this.prisma.wishlist.deleteMany({
      where: { customerId, productId },
    });
    if (result.count === 0) {
      throw new NotFoundException("Wishlist item not found");
    }
    return { message: "Removed from wishlist" };
  }

  private mapWishlistRow(w: {
    product: {
      id: number;
      name: string;
      actualPrice: { toString(): string } | null;
      discountPrice: { toString(): string } | null;
      productImage: string | null;
      images: { imageUrl: string }[];
    };
  }) {
    const p = w.product;
    const price = this.resolveDisplayPrice(p.discountPrice, p.actualPrice);
    const primaryFromGallery = p.images[0]?.imageUrl;
    const rawImage = primaryFromGallery ?? p.productImage;
    return {
      productId: p.id,
      name: p.name,
      price,
      image: toImageUrl(rawImage) ?? rawImage ?? null,
    };
  }

  private resolveDisplayPrice(
    discount: { toString(): string } | null | undefined,
    actual: { toString(): string } | null | undefined,
  ): number {
    const d = discount != null ? Number(discount) : null;
    const a = actual != null ? Number(actual) : null;
    if (d != null && !Number.isNaN(d)) return d;
    if (a != null && !Number.isNaN(a)) return a;
    return 0;
  }
}
