import { AdminOrdersService } from "./admin-orders.service";

describe("AdminOrdersService — shipped notifications", () => {
  const original = { ...process.env };
  let order: Record<string, unknown>;
  let tx: Record<string, jest.Mock | Record<string, jest.Mock>>;
  let prisma: Record<string, unknown>;
  let mail: { sendOrderShippedEmail: jest.Mock };
  let whatsapp: { sendTemplateMessage: jest.Mock };
  let service: AdminOrdersService;

  beforeEach(() => {
    process.env.WHATSAPP_SHIPPED_TEMPLATE_ID = "tpl_shipped";
    process.env.PUBLIC_API_BASE_URL = "https://api-dev.aaraahomecare.com";

    order = {
      id: 39,
      orderNumber: "73211",
      status: "PROCESSING",
      totalAmount: 11643.06,
      trackingId: null,
      trackingImageUrl: null,
      notes: null,
      customer: {
        id: 1,
        name: "AARAA HOMECARE",
        email: "customer@example.com",
        phone: "8122031856",
        gstIn: null,
      },
      items: [],
      payments: [],
      shipments: [],
      events: [],
      refunds: [],
      shippingAddress: null,
    };

    tx = {
      shipment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      order: { update: jest.fn().mockResolvedValue({}) },
      orderEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      order: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(order)),
      },
      notificationSettings: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    };
    mail = { sendOrderShippedEmail: jest.fn().mockResolvedValue(undefined) };
    whatsapp = { sendTemplateMessage: jest.fn().mockResolvedValue(undefined) };

    service = new AdminOrdersService(
      prisma as never,
      {} as never,
      mail as never,
      whatsapp as never,
    );
  });

  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  it("sends the WhatsApp shipped template to the customer when status becomes SHIPPED", async () => {
    await service.update(39, { status: "SHIPPED" });

    expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith({
      to: "8122031856",
      templateId: "tpl_shipped",
      variables: {
        name: "AARAA HOMECARE",
        order_id: "73211",
        amount: "Rs.11643.06",
      },
    });
  });

  it("does not send WhatsApp for non-shipped status changes", async () => {
    order.status = "PENDING_PAYMENT";
    await service.update(39, { status: "PROCESSING" });

    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it("does not send WhatsApp when no shipped template id is configured", async () => {
    delete process.env.WHATSAPP_SHIPPED_TEMPLATE_ID;

    await service.update(39, { status: "SHIPPED" });

    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it("still sends the shipped email alongside WhatsApp", async () => {
    await service.update(39, { status: "SHIPPED" });

    expect(mail.sendOrderShippedEmail).toHaveBeenCalledTimes(1);
  });
  it("stores the tracking image and sends its absolute URL to WhatsApp", async () => {
    const path = "2026/11/03/1793717363404-0-2b5bb5db.jpeg";
    // The refreshed order read after the transaction carries the saved image.
    order.trackingImageUrl = path;

    await service.update(39, { status: "SHIPPED", trackingImageUrl: path });

    expect((tx.order as { update: jest.Mock }).update).toHaveBeenCalledWith({
      where: { id: 39 },
      data: expect.objectContaining({ trackingImageUrl: path }),
    });
    expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          tracking_image_url: `https://api-dev.aaraahomecare.com/admin/images/serve?path=${encodeURIComponent(path)}`,
        }),
      }),
    );
  });

  it("accepts the trackingImage alias", async () => {
    await service.update(39, {
      trackingImage: "https://cdn.example.com/a.jpg",
    });

    expect((tx.order as { update: jest.Mock }).update).toHaveBeenCalledWith({
      where: { id: 39 },
      data: { trackingImageUrl: "https://cdn.example.com/a.jpg" },
    });
  });

  it("clears the tracking image when null is sent", async () => {
    await service.update(39, { trackingImageUrl: null });

    expect((tx.order as { update: jest.Mock }).update).toHaveBeenCalledWith({
      where: { id: 39 },
      data: { trackingImageUrl: null },
    });
  });

  it("updates only the tracking image without sending notifications", async () => {
    await service.update(39, { trackingImageUrl: "2026/11/03/a.jpeg" });

    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
    expect(mail.sendOrderShippedEmail).not.toHaveBeenCalled();
  });

  it("omits the image variable when no public base URL is configured", async () => {
    delete process.env.PUBLIC_API_BASE_URL;
    order.trackingImageUrl = "2026/11/03/a.jpeg";

    await service.update(39, { status: "SHIPPED" });

    expect(
      (whatsapp.sendTemplateMessage.mock.calls[0][0] as { variables: object })
        .variables,
    ).not.toHaveProperty("tracking_image_url");
  });

  it("passes the absolute image URL to the shipped email", async () => {
    order.trackingImageUrl = "https://cdn.example.com/a.jpg";

    await service.update(39, { status: "SHIPPED" });

    expect(mail.sendOrderShippedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        trackingImageUrl: "https://cdn.example.com/a.jpg",
      }),
    );
  });
});
