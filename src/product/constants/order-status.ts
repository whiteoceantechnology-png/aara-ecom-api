/** Order fulfillment / lifecycle (payment state is on paymentStatus). */
export const OrderStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
  /** Legacy rows may still use this value */
  LEGACY_PENDING: "pending",
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];
