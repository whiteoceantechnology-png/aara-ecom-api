import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  order: { findUnique: jest.fn() },
  payment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe("PaymentsService", () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
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
