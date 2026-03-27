import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { OrdersService } from "../orders/orders.service";
import {
  computeCheckoutTotals,
  toCartLineInputs,
} from "./checkout-pricing.util";
import {
  ApplyCouponDto,
  PlaceOrderDto,
  CheckoutPaymentMethod,
} from "../dto/checkout.dto";
import { assertCouponUsable } from "./assert-coupon-usable";
import { CHECKOUT_SESSION_TTL_MS } from "./checkout.constants";

/**
 * Orchestrates checkout UX: summaries use server prices; coupons sit on a short-lived session;
 * place-order delegates persistence and inventory rules to {@link OrdersService}.
 */
@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
  ) {}

  async getSummary(customerId: number) {
    const cart = await this.cartService.getOrCreate(customerId);
    await this.expireStaleSessionIfNeeded(customerId);

    const coupon = await this.resolveActiveCouponForCustomer(customerId);

    const shippingFlat = this.ordersService.getShippingFlat();
    const lines = toCartLineInputs(cart.items);
    const totals = computeCheckoutTotals(lines, {
      shippingFlat,
      discountPercent: coupon?.percentOff
        ? Number(coupon.percentOff)
        : undefined,
      maxDiscountAmount: coupon?.maxDiscountAmount
        ? Number(coupon.maxDiscountAmount)
        : null,
      minOrderAmount: coupon?.minOrderAmount
        ? Number(coupon.minOrderAmount)
        : null,
    });

    return {
      items: totals.items.map((i) => ({
        variantId: i.variantId,
        productId: i.productId,
        name: i.productName,
        sizeLabel: i.sizeLabel,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineSubtotal: i.lineSubtotal,
        taxAmount: i.taxAmount,
        taxPercent: i.taxPercent,
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total,
      couponCode: coupon?.code ?? null,
    };
  }

  async applyCoupon(customerId: number, dto: ApplyCouponDto) {
    const code = dto.couponCode.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });
    assertCouponUsable(coupon);

    const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MS);
    await this.prisma.checkoutSession.upsert({
      where: { customerId },
      create: {
        customerId,
        couponCode: coupon.code,
        expiresAt,
      },
      update: {
        couponCode: coupon.code,
        expiresAt,
      },
    });

    return { applied: true, couponCode: coupon.code };
  }

  async placeOrder(
    customerId: number,
    dto: PlaceOrderDto,
    idempotencyKey?: string,
  ) {
    const cart = await this.cartService.getOrCreate(customerId);
    await this.expireStaleSessionIfNeeded(customerId);

    const session = await this.prisma.checkoutSession.findUnique({
      where: { customerId },
    });

    const couponCode =
      dto.couponCode?.trim().toUpperCase() ?? session?.couponCode ?? undefined;

    const couponRow = couponCode
      ? await this.fetchCouponRowOrThrow(couponCode)
      : null;

    const paymentMethod =
      dto.paymentMethod === CheckoutPaymentMethod.COD ? "COD" : "ONLINE";

    return this.ordersService.placeOrder({
      customerId,
      cartId: cart.id,
      shippingAddressId: dto.addressId,
      couponCode,
      paymentMethod,
      idempotencyKey: idempotencyKey ?? null,
      shippingFlat: this.ordersService.getShippingFlat(),
      couponPricing: couponRow
        ? {
            percentOff: couponRow.percentOff,
            maxDiscountAmount: couponRow.maxDiscountAmount,
            minOrderAmount: couponRow.minOrderAmount,
          }
        : null,
    });
  }

  /**
   * Loads coupon tied to session; if the session references a stale/invalid code, clears the session.
   */
  private async resolveActiveCouponForCustomer(customerId: number) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { customerId },
    });
    if (!session?.couponCode) {
      return null;
    }
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: session.couponCode },
    });
    const usable =
      coupon?.active &&
      (coupon.expiresAt == null || coupon.expiresAt >= new Date());
    if (!usable) {
      await this.prisma.checkoutSession.deleteMany({ where: { customerId } });
      return null;
    }
    return coupon;
  }

  private async fetchCouponRowOrThrow(code: string) {
    const row = await this.prisma.coupon.findUnique({
      where: { code },
    });
    assertCouponUsable(row);
    return row;
  }

  private async expireStaleSessionIfNeeded(customerId: number) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { customerId },
    });
    if (session != null && session.expiresAt.getTime() < Date.now()) {
      await this.prisma.checkoutSession.delete({ where: { customerId } });
    }
  }
}
