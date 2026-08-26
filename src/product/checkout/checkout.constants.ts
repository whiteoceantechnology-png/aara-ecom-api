/** Checkout session cookie replacement: how long an applied coupon stays valid. */
export const CHECKOUT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Flat shipping used when `CHECKOUT_SHIPPING_FLAT` env is unset or invalid.
 * Keep in sync with `OrdersService.getShippingFlat()` fallback logic.
 */
export const DEFAULT_CHECKOUT_SHIPPING_FLAT = 50;

/**
 * Inclusive merchandise total (after discount, before shipping) at/above which
 * shipping is ₹0 ("Free Shipping").
 */
export const FREE_SHIPPING_MIN_MERCHANDISE = 2000;
