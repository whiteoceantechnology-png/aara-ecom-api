import { OrdersService } from "./orders.service";

describe("OrdersService order-placed WhatsApp", () => {
  let prisma: { customer: { findUnique: jest.Mock } };
  let whatsapp: { sendTemplateMessage: jest.Mock };
  let service: OrdersService;

  const send = (customerId: number, order: Record<string, unknown> | null) =>
    (
      service as unknown as {
        sendOrderPlacedWhatsApp: (
          id: number,
          o: Record<string, unknown> | null,
        ) => Promise<void>;
      }
    ).sendOrderPlacedWhatsApp(customerId, order);

  beforeEach(() => {
    process.env.WHATSAPP_ORDER_PLACED_TEMPLATE_ID = "aaraa_home_care";
    delete process.env.WHATSAPP_VISIT_WEBSITE;
    prisma = { customer: { findUnique: jest.fn() } };
    whatsapp = { sendTemplateMessage: jest.fn().mockResolvedValue(undefined) };
    service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      whatsapp as never,
    );
  });

  afterAll(() => {
    delete process.env.WHATSAPP_ORDER_PLACED_TEMPLATE_ID;
  });

  it("sends to the ordering customer's phone from the DB", async () => {
    prisma.customer.findUnique.mockResolvedValue({
      name: "Sarmi",
      phone: "7397036307",
    });

    await send(7, { orderNumber: "ORD-44", totalAmount: "400.00" });

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { name: true, phone: true },
    });
    expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith({
      to: "7397036307",
      templateId: "aaraa_home_care",
      variables: {
        name: "Sarmi",
        order_id: "ORD-44",
        amount: "Rs.400",
        Visit_Website: "https://kural.nzen.in",
      },
    });
  });

  it("falls back to the shipping-address phone when the customer has none", async () => {
    prisma.customer.findUnique.mockResolvedValue({
      name: "Sarmi",
      phone: null,
    });

    await send(7, {
      orderNumber: "ORD-45",
      totalAmount: 250,
      addressSnapshot: { phone: "7010124133" },
    });

    expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: "7010124133" }),
    );
  });

  it("skips when no phone is on file", async () => {
    prisma.customer.findUnique.mockResolvedValue({
      name: "Sarmi",
      phone: null,
    });

    await send(7, { orderNumber: "ORD-46", totalAmount: 100 });

    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it("skips when no order-placed template id is configured", async () => {
    delete process.env.WHATSAPP_ORDER_PLACED_TEMPLATE_ID;

    await send(7, { orderNumber: "ORD-47", totalAmount: 100 });

    expect(prisma.customer.findUnique).not.toHaveBeenCalled();
    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
  });
});
