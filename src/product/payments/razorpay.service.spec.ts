import * as crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { RazorpayService } from "./razorpay.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";

// ── Test constants ─────────────────────────────────────────────────────────
const TEST_KEY_ID = "rzp_test_xxx";
const TEST_KEY_SECRET = "secret_xxx";

/** Build a valid Razorpay HMAC-SHA256 signature for the given IDs. */
function buildValidSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
): string {
  return crypto
    .createHmac("sha256", TEST_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
}

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockOrdersService = {
  applyPaymentSuccess: jest
    .fn()
    .mockResolvedValue({ id: 1, paymentStatus: "paid" }),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === "RAZORPAY_KEY_ID") return TEST_KEY_ID;
    if (key === "RAZORPAY_KEY_SECRET") return TEST_KEY_SECRET;
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

// Mock the Razorpay SDK so tests never hit the network.
jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: "order_razorpay_xxx",
        amount: 10000,
        currency: "INR",
      }),
    },
  })),
);

// ── Helpers ────────────────────────────────────────────────────────────────
async function buildModule(configOverride?: {
  get: (key: string) => string | undefined;
}) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RazorpayService,
      { provide: ConfigService, useValue: configOverride ?? mockConfig },
      { provide: PrismaService, useValue: mockPrisma },
      { provide: OrdersService, useValue: mockOrdersService },
    ],
  }).compile();
  return module.get<RazorpayService>(RazorpayService);
}

// ── Test suite ─────────────────────────────────────────────────────────────
describe("RazorpayService", () => {
  let service: RazorpayService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset config mock to default (configured) state.
    mockConfig.get.mockImplementation((key: string) => {
      if (key === "RAZORPAY_KEY_ID") return TEST_KEY_ID;
      if (key === "RAZORPAY_KEY_SECRET") return TEST_KEY_SECRET;
      return undefined;
    });

    service = await buildModule();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // isConfigured()
  // ──────────────────────────────────────────────────────────────────────────
  describe("isConfigured()", () => {
    it("should return true when both Razorpay keys are present", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should return false when keys are absent", async () => {
      const unconfigured = await buildModule({
        get: () => "",
      });
      expect(unconfigured.isConfigured()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // createOrder()
  // ──────────────────────────────────────────────────────────────────────────
  describe("createOrder()", () => {
    it("should throw BadRequestException when Razorpay is not configured", async () => {
      const unconfigured = await buildModule({ get: () => "" });

      await expect(unconfigured.createOrder({ orderId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when the order does not exist", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.createOrder({ orderId: 99 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when the order is already paid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: 100,
        orderNumber: "ORD-1",
        paymentStatus: "paid",
      });

      await expect(service.createOrder({ orderId: 1 })).rejects.toThrow(
        "already paid",
      );
    });

    it("should throw BadRequestException when the order amount is below ₹1", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: 0.5, // 50 paise — below minimum
        orderNumber: "ORD-1",
        paymentStatus: "pending",
      });

      await expect(service.createOrder({ orderId: 1 })).rejects.toThrow(
        "Minimum amount",
      );
    });

    it("should return Razorpay order details on success", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: 100,
        orderNumber: "ORD-1",
        paymentStatus: "pending",
      });

      const result = await service.createOrder({ orderId: 1 });

      expect(result).toMatchObject({
        razorpayOrderId: "order_razorpay_xxx",
        amount: 10000, // ₹100 → 10 000 paise
        currency: "INR",
        keyId: TEST_KEY_ID,
        orderNumber: "ORD-1",
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // verifyAndCapturePayment()
  // ──────────────────────────────────────────────────────────────────────────
  describe("verifyAndCapturePayment()", () => {
    const baseDto = {
      orderId: 1,
      razorpayOrderId: "order_xxx",
      razorpayPaymentId: "pay_xxx",
    };

    it("should throw NotFoundException when the order does not exist", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAndCapturePayment({
          ...baseDto,
          razorpaySignature: "any",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when the order is already paid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "paid",
      });

      await expect(
        service.verifyAndCapturePayment({
          ...baseDto,
          razorpaySignature: "any",
        }),
      ).rejects.toThrow("already paid");
    });

    it("should throw BadRequestException when the signature is invalid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
      });

      await expect(
        service.verifyAndCapturePayment({
          ...baseDto,
          razorpaySignature: "tampered_signature",
        }),
      ).rejects.toThrow("Invalid payment signature");
    });

    it("should record payment and mark order paid when signature is valid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
      });

      const validSignature = buildValidSignature(
        baseDto.razorpayOrderId,
        baseDto.razorpayPaymentId,
      );

      const savedPayment = {
        id: 42,
        orderId: 1,
        paymentMethod: "razorpay",
        transactionId: baseDto.razorpayPaymentId,
        paymentStatus: "paid",
        paymentDate: new Date(),
      };
      mockPrisma.payment.create.mockResolvedValue(savedPayment);

      const result = await service.verifyAndCapturePayment({
        ...baseDto,
        razorpaySignature: validSignature,
      });

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 1,
            paymentMethod: "razorpay",
            transactionId: baseDto.razorpayPaymentId,
            paymentStatus: "paid",
          }),
        }),
      );
      expect(mockOrdersService.applyPaymentSuccess).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({
        success: true,
        payment: expect.objectContaining({
          id: 42,
          orderId: 1,
          paymentMethod: "razorpay",
          transactionId: baseDto.razorpayPaymentId,
          paymentStatus: "paid",
        }),
      });
    });
  });
});
