import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateReviewDto, ListReviewsQueryDto } from "../dto/review.dto";
import { OrderStatus } from "../constants/order-status";

const orderForReviewInclude = {
  items: { include: { variant: { select: { productId: true } } } },
} as const;

type OrderForReview = Prisma.OrderGetPayload<{
  include: typeof orderForReviewInclude;
}>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: number, dto: CreateReviewDto) {
    await this.assertProductExists(dto.productId);
    await this.assertNoDuplicateReview(customerId, dto.productId);

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: orderForReviewInclude,
    });
    this.assertOrderAllowsReview(order, customerId, dto.productId, dto.orderId);

    const review = await this.prisma.productReview.create({
      data: {
        customerId,
        productId: dto.productId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
      include: {
        customer: { select: { name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    await this.refreshProductRating(dto.productId);
    return this.mapReview(review);
  }

  /** Site-wide (or filtered) reviews list with aggregate summary. */
  async findAll(query: ListReviewsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductReviewWhereInput = {};
    if (query.productId != null) where.productId = query.productId;
    if (query.rating != null) where.rating = query.rating;

    if (query.productId != null) {
      await this.assertProductExists(query.productId);
    }

    const orderBy = this.resolveSort(query.sort);

    const [agg, totalReviews, reviews] = await Promise.all([
      this.prisma.productReview.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: { select: { name: true } },
          product: { select: { id: true, name: true } },
        },
      }),
    ]);

    const average =
      agg._avg.rating != null ? Math.round(agg._avg.rating * 100) / 100 : 0;

    return {
      summary: {
        averageRating: average,
        totalReviews,
      },
      reviews: reviews.map((r) => this.mapReview(r)),
      page,
      limit,
      totalPages: totalReviews === 0 ? 0 : Math.ceil(totalReviews / limit),
    };
  }

  async findByProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, avgRating: true, reviewCount: true },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);

    const reviews = await this.prisma.productReview.findMany({
      where: { productId },
      include: {
        customer: { select: { name: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      summary: {
        averageRating:
          product.avgRating != null
            ? Math.round(Number(product.avgRating) * 100) / 100
            : 0,
        totalReviews: product.reviewCount,
      },
      reviews: reviews.map((r) => this.mapReview(r)),
    };
  }

  async remove(reviewId: number, customerId: number) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException(`Review #${reviewId} not found`);
    if (review.customerId !== customerId) {
      throw new ForbiddenException("Not your review");
    }
    const productId = review.productId;
    await this.prisma.productReview.delete({ where: { id: reviewId } });
    await this.refreshProductRating(productId);
    return { message: "Review deleted successfully" };
  }

  private mapReview(r: {
    id: number;
    rating: number;
    comment: string | null;
    orderId: number | null;
    createdAt?: Date;
    customer: { name: string };
    product: { id: number; name: string };
  }) {
    return {
      id: r.id,
      customerName: r.customer.name,
      rating: r.rating,
      comment: r.comment,
      isVerified: r.orderId != null,
      ...(r.createdAt != null && { createdAt: r.createdAt }),
      product: {
        id: r.product.id,
        name: r.product.name,
      },
    };
  }

  private resolveSort(
    sort?: ListReviewsQueryDto["sort"],
  ): Prisma.ProductReviewOrderByWithRelationInput {
    switch (sort) {
      case "oldest":
        return { createdAt: "asc" };
      case "highest":
        return { rating: "desc" };
      case "lowest":
        return { rating: "asc" };
      case "newest":
      default:
        return { createdAt: "desc" };
    }
  }

  private async assertProductExists(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);
  }

  private async assertNoDuplicateReview(customerId: number, productId: number) {
    const existing = await this.prisma.productReview.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (existing) {
      throw new ConflictException("You have already reviewed this product");
    }
  }

  private assertOrderAllowsReview(
    order: OrderForReview | null,
    customerId: number,
    productId: number,
    orderId: number,
  ) {
    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }
    if (order.customerId !== customerId) {
      throw new ForbiddenException("Order does not belong to you");
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        "Reviews are allowed only after the order is delivered",
      );
    }
    const boughtHere = order.items.some(
      (line) => line.variant.productId === productId,
    );
    if (!boughtHere) {
      throw new BadRequestException(
        "This product was not part of the given order",
      );
    }
  }

  private async refreshProductRating(productId: number) {
    const [agg, count] = await Promise.all([
      this.prisma.productReview.aggregate({
        where: { productId },
        _avg: { rating: true },
      }),
      this.prisma.productReview.count({ where: { productId } }),
    ]);

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.rating ?? null,
        reviewCount: count,
      },
    });
  }
}
