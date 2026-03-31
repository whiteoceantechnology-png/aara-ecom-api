import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateReviewDto } from "../dto/review.dto";
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
    });

    await this.refreshProductRating(dto.productId);
    return review;
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
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      productId,
      avgRating: product.avgRating,
      totalReviews: product.reviewCount,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        customer: r.customer,
        verifiedPurchase: r.orderId != null,
      })),
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
    return { deleted: true };
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
