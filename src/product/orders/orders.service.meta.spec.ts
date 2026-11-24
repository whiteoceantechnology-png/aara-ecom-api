import { OrdersService } from "./orders.service";

describe("OrdersService Meta Purchase", () => {
  const originalWhatsAppTemplate =
    process.env.WHATSAPP_ORDER_PLACED_TEMPLATE_ID;
  const order = {
    id: 1,
    customerId: 2,
    orderNumber: "ORD-1",
    status: "PROCESSING",
    paymentStatus: "paid",
    paymentMethod: "ONLINE",
    totalAmount: 100,
    items: [],
  };
  const transactionOrder = {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn((callback) => callback({ order: transactionOrder })),
    notificationSettings: {
      findUnique: jest.fn().mockResolvedValue({ orderPlacedEmail: false }),
    },
    customer: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const meta = {
    isConfigured: jest.fn().mockReturnValue(true),
    isTestMode: jest.fn().mockReturnValue(false),
    sendPurchaseEvent: jest.fn().mockResolvedValue(undefined),
  };
  const service = new OrdersService(
    prisma as never,
    {} as never,
    meta as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.WHATSAPP_ORDER_PLACED_TEMPLATE_ID;
    transactionOrder.findUnique
      .mockResolvedValueOnce({
        ...order,
        status: "PENDING_PAYMENT",
        paymentStatus: "pending",
      })
      .mockResolvedValueOnce(order);
    transactionOrder.updateMany.mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    if (originalWhatsAppTemplate === undefined) {
      delete process.env.WHATSAPP_ORDER_PLACED_TEMPLATE_ID;
    } else {
      process.env.WHATSAPP_ORDER_PLACED_TEMPLATE_ID = originalWhatsAppTemplate;
    }
  });

  it("sends a deterministic Purchase only after confirming the payment", async () => {
    await service.applyPaymentSuccess(1, { eventId: "untrusted-custom-id" });
    expect(meta.sendPurchaseEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "purchase_order_ORD-1" }),
    );
  });

  it("does not send a duplicate if another confirmation won the race", async () => {
    transactionOrder.updateMany.mockResolvedValue({ count: 0 });
    await service.applyPaymentSuccess(1);
    expect(meta.sendPurchaseEvent).not.toHaveBeenCalled();
  });

  it("does not send Purchase for a cancelled order", async () => {
    transactionOrder.findUnique.mockReset().mockResolvedValueOnce({
      ...order,
      status: "CANCELLED",
      paymentStatus: "pending",
    });
    transactionOrder.update.mockResolvedValue(order);
    await service.applyPaymentSuccess(1);
    expect(meta.sendPurchaseEvent).not.toHaveBeenCalled();
  });

  it("does not send a test payment to the production dataset", async () => {
    await service.applyPaymentSuccess(1, { isTestPayment: true });
    expect(meta.sendPurchaseEvent).not.toHaveBeenCalled();
  });

  it("allows a test payment when a test event code is configured", async () => {
    meta.isTestMode.mockReturnValueOnce(true);
    await service.applyPaymentSuccess(1, { isTestPayment: true });
    expect(meta.sendPurchaseEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "purchase_order_ORD-1" }),
    );
  });

  it("sends Purchase after a COD order is committed, not on an idempotent retry", async () => {
    const variant = {
      id: 4,
      price: 100,
      variantName: null,
      packSize: { label: "1 unit", size: 1, unit: "unit" },
      product: {
        id: 3,
        name: "Product",
        taxPercent: 0,
        stock: 5,
        reservedStock: 0,
        stockUnit: null,
      },
    };
    const item = {
      id: 8,
      variantId: 4,
      quantity: 1,
      price: 100,
      subtotal: 100,
      productName: "Product",
      sizeLabel: "1 unit",
      variant,
    };
    const created = {
      ...order,
      paymentMethod: "COD",
      paymentStatus: "pending",
      items: [item],
    };
    const tx = {
      product: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ stock: 5, reservedStock: 0, stockUnit: null }),
      },
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      order: {
        create: jest.fn().mockResolvedValue(created),
        update: jest.fn().mockResolvedValue(created),
      },
      cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      checkoutIdempotency: { create: jest.fn().mockResolvedValue({}) },
      checkoutSession: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      saleTransaction: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stockMovement: { create: jest.fn().mockResolvedValue({}) },
    };
    const codPrisma = {
      ...prisma,
      cart: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 1, customerId: 2, items: [item] }),
      },
      productVariant: { findMany: jest.fn().mockResolvedValue([variant]) },
      checkoutIdempotency: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ order: created }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const codService = new OrdersService(
      codPrisma as never,
      {} as never,
      meta as never,
      {} as never,
    );
    const params = {
      customerId: 2,
      cartId: 1,
      paymentMethod: "COD" as const,
      idempotencyKey: "retry-key",
      shippingFlat: 0,
    };
    await codService.placeOrder(params);
    await codService.placeOrder(params);
    expect(meta.sendPurchaseEvent).toHaveBeenCalledTimes(1);
    expect(meta.sendPurchaseEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "purchase_order_ORD-1",
        contentIds: ["4"],
      }),
    );
    expect(codPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
