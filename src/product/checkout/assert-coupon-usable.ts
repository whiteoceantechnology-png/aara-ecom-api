import { BadRequestException } from "@nestjs/common";

/** Minimal shape for validating a coupon row from Prisma (or null when code unknown). */
export type CouponUsableFields = {
  active: boolean;
  expiresAt: Date | null;
};

/**
 * Ensures the coupon exists, is active, and has not expired.
 * Call after `findUnique` — pass `null` if no row was found for the code.
 */
export function assertCouponUsable(
  coupon: CouponUsableFields | null,
): asserts coupon is CouponUsableFields {
  if (!coupon?.active) {
    throw new BadRequestException("Invalid or inactive coupon");
  }
  if (coupon.expiresAt != null && coupon.expiresAt.getTime() < Date.now()) {
    throw new BadRequestException("Coupon has expired");
  }
}
