import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { RazorpayService } from "./razorpay.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";

const mockOrdersService = {
  applyPaymentSuccess: jest.fn().mockResolvedValue({ id: 1, paymentStatus: "paid" }),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === "RAZORPAY_KEY_ID") return "rzp_test_xxx";
    if (key === "RAZORPAY_KEY_SECRET") return "secret_xxx";
    return undefined;
  }),
};

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
};

jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: "order_razorpay_xxx",
        amount: 10000,
        currency: "INR",
      }),
    },
  }));
});

describe("RazorpayService", () => {
  let service: RazorpayService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfig.get.mockImplementation((key: string) => {
      if (key === "RAZORPAY_KEY_ID") return "rzp_test_xxx";
      if (key === "RAZORPAY_KEY_SECRET") return "secret_xxx";
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<RazorpayService>(RazorpayService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("isConfigured()", () => {
    it("should return true when keys are set", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should return false when keys are missing", async () => {
      mockConfig.get.mockReturnValue("");
      const mod = await Test.createTestingModule({
        providers: [
          RazorpayService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: PrismaService, useValue: mockPrisma },
          { provide: OrdersService, useValue: mockOrdersService },
        ],
      }).compile();
      const svc = mod.get<RazorpayService>(RazorpayService);
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe("createOrder()", () => {
    it("should throw NotFoundException when order not found", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.createOrder({ orderId: 99 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when order already paid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: 100,
        orderNumber: "ORD-1",
        paymentStatus: "paid",
      });

      await expect(service.createOrder({ orderId: 1 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createOrder({ orderId: 1 })).rejects.toThrow(
        "already paid",
      );
    });

    it("should create Razorpay order and return data", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: 100,
        orderNumber: "ORD-1",
        paymentStatus: "pending",
      });

      const result = await service.createOrder({ orderId: 1 });

      expect(result).toMatchObject({
        razorpayOrderId: "order_razorpay_xxx",
        amount: 10000,
        currency: "INR",
        keyId: "rzp_test_xxx",
        orderNumber: "ORD-1",
      });
    });
  });

  describe("verifyAndCapturePayment()", () => {
    it("should throw NotFoundException when order not found", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAndCapturePayment({
          orderId: 99,
          razorpayOrderId: "order_xxx",
          razorpayPaymentId: "pay_xxx",
          razorpaySignature: "sig_xxx",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when signature invalid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
      });

      await expect(
        service.verifyAndCapturePayment({
          orderId: 1,
          razorpayOrderId: "order_xxx",
          razorpayPaymentId: "pay_xxx",
          razorpaySignature: "invalid_signature",
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifyAndCapturePayment({
          orderId: 1,
          razorpayOrderId: "order_xxx",
          razorpayPaymentId: "pay_xxx",
          razorpaySignature: "invalid_signature",
        }),
      ).rejects.toThrow("Invalid payment signature");
    });
  });
});
