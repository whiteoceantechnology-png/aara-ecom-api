import { BadRequestException } from "@nestjs/common";
import type { Coupon } from "@prisma/client";

/**
 * Ensures the coupon exists, is active, and has not expired.
 * Call after `findUnique` — pass `null` if no row was found for the code.
 * Narrows to full {@link Coupon} so callers can use `code`, `percentOff`, etc.
 */
export function assertCouponUsable(
  coupon: Coupon | null,
): asserts coupon is Coupon {
  if (!coupon?.active) {
    throw new BadRequestException("Invalid or inactive coupon");
  }
  if (coupon.expiresAt != null && coupon.expiresAt.getTime() < Date.now()) {
    throw new BadRequestException("Coupon has expired");
  }
}
