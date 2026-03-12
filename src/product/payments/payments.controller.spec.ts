import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

const mockPaymentsService = {
  create: jest.fn(),
  findByOrder: jest.fn(),
  findOne: jest.fn(),
};

describe("PaymentsController", () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // POST /payments
  // ──────────────────────────────────────────────
  describe("create()", () => {
    it("should record a payment for an order", async () => {
      const dto = { orderId: 1, paymentMethod: "UPI", transactionId: "TXN123" };
      const payment = {
        id: 1,
        orderId: 1,
        paymentStatus: "paid",
        paymentMethod: "UPI",
      };
      mockPaymentsService.create.mockResolvedValue(payment);

      const result = await controller.create(dto as any);

      expect(mockPaymentsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(payment);
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockPaymentsService.create.mockRejectedValue(
        new NotFoundException("Order #99 not found"),
      );

      await expect(
        controller.create({ orderId: 99, paymentMethod: "COD" } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // GET /payments/order/:orderId
  // ──────────────────────────────────────────────
  describe("findByOrder()", () => {
    it("should return all payments for an order", async () => {
      const payments = [
        { id: 1, orderId: 1 },
        { id: 2, orderId: 1 },
      ];
      mockPaymentsService.findByOrder.mockResolvedValue(payments);

      const result = await controller.findByOrder(1);

      expect(mockPaymentsService.findByOrder).toHaveBeenCalledWith(1);
      expect(result).toEqual(payments);
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockPaymentsService.findByOrder.mockRejectedValue(
        new NotFoundException("Order #99 not found"),
      );

      await expect(controller.findByOrder(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // GET /payments/:id
  // ──────────────────────────────────────────────
  describe("findOne()", () => {
    it("should return a payment by ID", async () => {
      const payment = { id: 1, orderId: 1, paymentStatus: "paid" };
      mockPaymentsService.findOne.mockResolvedValue(payment);

      const result = await controller.findOne(1);

      expect(mockPaymentsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(payment);
    });

    it("should throw NotFoundException for a non-existent payment", async () => {
      mockPaymentsService.findOne.mockRejectedValue(
        new NotFoundException("Payment #999 not found"),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
