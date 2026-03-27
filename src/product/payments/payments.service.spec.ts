import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";

describe("PaymentsService", () => {
  let service: PaymentsService;
  const prisma = {
    order: { findUnique: jest.fn() },
    payment: { create: jest.fn() },
  };
  const ordersService = {
    applyPaymentSuccess: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe("create()", () => {
    it("should create payment and apply order payment success", async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
      });
      const paymentRow = {
        id: 10,
        orderId: 1,
        paymentMethod: "UPI",
        paymentStatus: "paid",
      };
      prisma.payment.create.mockResolvedValue(paymentRow);
      ordersService.applyPaymentSuccess.mockResolvedValue({ id: 1 });

      const dto = {
        orderId: 1,
        paymentMethod: "UPI",
        transactionId: "TXN1",
      };
      const result = await service.create(dto);

      expect(prisma.payment.create).toHaveBeenCalled();
      expect(ordersService.applyPaymentSuccess).toHaveBeenCalledWith(1);
      expect(result).toEqual(paymentRow);
    });

    it("should throw NotFoundException when order missing", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          orderId: 99,
          paymentMethod: "COD",
        } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when already paid", async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "paid",
      });

      await expect(
        service.create({ orderId: 1, paymentMethod: "COD" } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });
});
