import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";

const mockPrisma = {
  order: { findUnique: jest.fn() },
  payment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockOrdersService = {
  applyPaymentSuccess: jest.fn(),
};

describe("PaymentsService", () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create()
  // ──────────────────────────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a payment and mark the order as paid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
      });
      const paymentRow = {
        id: 10,
        orderId: 1,
        paymentMethod: "UPI",
        paymentStatus: "paid",
      };
      mockPrisma.payment.create.mockResolvedValue(paymentRow);
      mockOrdersService.applyPaymentSuccess.mockResolvedValue({ id: 1 });

      const dto = { orderId: 1, paymentMethod: "UPI", transactionId: "TXN1" };
      const result = await service.create(dto);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 1,
            paymentMethod: "UPI",
            transactionId: "TXN1",
            paymentStatus: "paid",
          }),
        }),
      );
      expect(mockOrdersService.applyPaymentSuccess).toHaveBeenCalledWith(1);
      expect(result).toEqual(paymentRow);
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ orderId: 99, paymentMethod: "COD" } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(mockOrdersService.applyPaymentSuccess).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the order is already paid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "paid",
      });

      await expect(
        service.create({ orderId: 1, paymentMethod: "COD" } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(mockOrdersService.applyPaymentSuccess).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findByOrder()
  // ──────────────────────────────────────────────────────────────────────────
  describe("findByOrder()", () => {
    it("should return all payments for a given order", async () => {
      const payments = [
        { id: 1, orderId: 1, paymentMethod: "UPI", paymentStatus: "paid" },
        { id: 2, orderId: 1, paymentMethod: "COD", paymentStatus: "paid" },
      ];
      mockPrisma.order.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.payment.findMany.mockResolvedValue(payments);

      const result = await service.findByOrder(1);

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { orderId: 1 },
        orderBy: { paymentDate: "desc" },
      });
      expect(result).toEqual(payments);
    });

    it("should return an empty array when the order has no payments", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 2 });
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.findByOrder(2);

      expect(result).toEqual([]);
    });

    it("should throw NotFoundException when the order does not exist", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findByOrder(99)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.payment.findMany).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findOne()
  // ──────────────────────────────────────────────────────────────────────────
  describe("findOne()", () => {
    it("should return the payment record for a given ID", async () => {
      const payment = {
        id: 5,
        orderId: 1,
        paymentMethod: "razorpay",
        paymentStatus: "paid",
      };
      mockPrisma.payment.findUnique.mockResolvedValue(payment);

      const result = await service.findOne(5);

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(result).toEqual(payment);
    });

    it("should throw NotFoundException when payment does not exist", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
