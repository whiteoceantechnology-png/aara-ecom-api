import * as crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RazorpayService } from "./razorpay.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";

const TEST_KEY_ID = "rzp_test_xxx";
const TEST_KEY_SECRET = "secret_xxx";
const TEST_WEBHOOK_SECRET = "whsec_xxx";

function buildValidSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
): string {
  return crypto
    .createHmac("sha256", TEST_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
}

const mockOrdersCreate = jest.fn().mockResolvedValue({
  id: "order_razorpay_xxx",
  amount: 10000,
  currency: "INR",
  status: "created",
});
const mockOrdersFetch = jest.fn();
const mockOrdersFetchPayments = jest.fn();

const mockOrdersService = {
  applyPaymentSuccess: jest
    .fn()
    .mockResolvedValue({ id: 1, paymentStatus: "paid" }),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === "RAZORPAY_KEY_ID") return TEST_KEY_ID;
    if (key === "RAZORPAY_KEY_SECRET") return TEST_KEY_SECRET;
    if (key === "RAZORPAY_WEBHOOK_SECRET") return TEST_WEBHOOK_SECRET;
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
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(async (ops: unknown) => {
    if (Array.isArray(ops)) {
      return Promise.all(ops);
    }
    return ops;
  }),
};

jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: {
      create: (...args: unknown[]) => mockOrdersCreate(...args),
      fetch: (...args: unknown[]) => mockOrdersFetch(...args),
      fetchPayments: (...args: unknown[]) => mockOrdersFetchPayments(...args),
    },
  })),
);

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

describe("RazorpayService", () => {
  let service: RazorpayService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfig.get.mockImplementation((key: string) => {
      if (key === "RAZORPAY_KEY_ID") return TEST_KEY_ID;
      if (key === "RAZORPAY_KEY_SECRET") return TEST_KEY_SECRET;
      if (key === "RAZORPAY_WEBHOOK_SECRET") return TEST_WEBHOOK_SECRET;
      return undefined;
    });
    mockOrdersCreate.mockResolvedValue({
      id: "order_razorpay_xxx",
      amount: 10000,
      currency: "INR",
      status: "created",
    });
    mockPrisma.order.update.mockResolvedValue({});
    mockPrisma.payment.create.mockResolvedValue({
      id: 1,
      orderId: 1,
      paymentMethod: "razorpay",
      paymentStatus: "initiated",
    });
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops;
    });

    service = await buildModule();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getConfigStatus()", () => {
    it("reports test mode when using rzp_test_ keys", () => {
      expect(service.getConfigStatus()).toMatchObject({
        configured: true,
        mode: "test",
        webhookConfigured: true,
        websiteWhitelistRequired: false,
      });
    });

    it("flags live mode website whitelist requirement", async () => {
      const live = await buildModule({
        get: (key) => {
          if (key === "RAZORPAY_KEY_ID") return "rzp_live_abc";
          if (key === "RAZORPAY_KEY_SECRET") return "secret";
          return undefined;
        },
      });
      expect(live.getConfigStatus()).toMatchObject({
        mode: "live",
        websiteWhitelistRequired: true,
      });
    });
  });

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
        notes: null,
        payments: [],
      });
      await expect(service.createOrder({ orderId: 1 })).rejects.toThrow(
        "already paid",
      );
    });

    it("should throw BadRequestException when the order amount is below ₹1", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: 0.5,
        orderNumber: "ORD-1",
        paymentStatus: "pending",
        notes: null,
        payments: [],
      });
      await expect(service.createOrder({ orderId: 1 })).rejects.toThrow(
        "Minimum amount",
      );
    });

    it("should create Razorpay order, persist link, and return checkout fields", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: new Prisma.Decimal(100),
        orderNumber: "ORD-1",
        paymentStatus: "pending",
        notes: null,
        payments: [],
      });

      const result = await service.createOrder({ orderId: 1 });

      expect(mockOrdersCreate).toHaveBeenCalled();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toMatchObject({
        razorpayOrderId: "order_razorpay_xxx",
        amount: 10000,
        currency: "INR",
        keyId: TEST_KEY_ID,
        orderNumber: "ORD-1",
        mode: "test",
      });
      expect(result.checkoutNotes.websiteWhitelist).toContain(
        "Website and app settings",
      );
    });

    it("should reuse an open Razorpay order instead of creating a new one", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        totalAmount: 100,
        orderNumber: "ORD-1",
        paymentStatus: "pending",
        notes: "razorpayOrderId:order_existing",
        payments: [
          {
            reference: "order_existing",
            paymentStatus: "initiated",
            notes: null,
          },
        ],
      });
      mockOrdersFetch.mockResolvedValue({
        id: "order_existing",
        amount: 10000,
        currency: "INR",
        status: "created",
      });

      const result = await service.createOrder({ orderId: 1 });

      expect(mockOrdersCreate).not.toHaveBeenCalled();
      expect(result.razorpayOrderId).toBe("order_existing");
    });
  });

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

    it("should return success when the order is already paid (idempotent)", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "paid",
        notes: null,
        payments: [
          {
            id: 9,
            orderId: 1,
            paymentMethod: "razorpay",
            transactionId: "pay_old",
            paymentStatus: "paid",
            reference: "order_xxx",
            notes: null,
          },
        ],
      });

      const result = await service.verifyAndCapturePayment({
        ...baseDto,
        razorpaySignature: "any",
      });

      expect(result).toMatchObject({
        success: true,
        alreadyPaid: true,
        payment: { id: 9, paymentStatus: "paid" },
      });
    });

    it("should throw BadRequestException when the signature is invalid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
        notes: null,
        payments: [],
        totalAmount: 100,
      });
      await expect(
        service.verifyAndCapturePayment({
          ...baseDto,
          razorpaySignature: "tampered_signature",
        }),
      ).rejects.toThrow("Invalid payment signature");
    });

    it("should reject mismatched stored Razorpay order id", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
        notes: "razorpayOrderId:order_other",
        payments: [
          {
            reference: "order_other",
            paymentStatus: "initiated",
            notes: null,
          },
        ],
        totalAmount: 100,
      });
      const validSignature = buildValidSignature(
        baseDto.razorpayOrderId,
        baseDto.razorpayPaymentId,
      );
      await expect(
        service.verifyAndCapturePayment({
          ...baseDto,
          razorpaySignature: validSignature,
        }),
      ).rejects.toThrow("does not match");
    });

    it("should record payment and mark order paid when signature is valid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
        notes: "razorpayOrderId:order_xxx",
        payments: [
          {
            id: 7,
            reference: "order_xxx",
            paymentStatus: "initiated",
            notes: null,
          },
        ],
        totalAmount: 100,
      });
      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null) // already paid check
        .mockResolvedValueOnce({
          id: 7,
          orderId: 1,
          paymentMethod: "razorpay",
          reference: "order_xxx",
          paymentStatus: "initiated",
        });
      mockPrisma.payment.update.mockResolvedValue({
        id: 7,
        orderId: 1,
        paymentMethod: "razorpay",
        transactionId: baseDto.razorpayPaymentId,
        paymentStatus: "paid",
      });

      const validSignature = buildValidSignature(
        baseDto.razorpayOrderId,
        baseDto.razorpayPaymentId,
      );
      const result = await service.verifyAndCapturePayment({
        ...baseDto,
        razorpaySignature: validSignature,
      });

      expect(mockPrisma.payment.update).toHaveBeenCalled();
      expect(mockOrdersService.applyPaymentSuccess).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({
        success: true,
        alreadyPaid: false,
        payment: { id: 7, paymentStatus: "paid" },
      });
    });
  });

  describe("syncPaymentStatus()", () => {
    it("returns unprocessed when no Razorpay order is linked", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
        notes: null,
        payments: [],
        totalAmount: 100,
      });

      const result = await service.syncPaymentStatus(1);

      expect(result).toMatchObject({
        paymentStatus: "pending",
        razorpayPaymentStatus: "unprocessed",
        synced: false,
      });
    });

    it("marks order paid when Razorpay has a captured payment", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
        notes: "razorpayOrderId:order_xxx",
        payments: [
          {
            id: 3,
            reference: "order_xxx",
            paymentStatus: "initiated",
            notes: null,
          },
        ],
        totalAmount: 100,
      });
      mockOrdersFetch.mockResolvedValue({
        id: "order_xxx",
        status: "paid",
        amount: 10000,
      });
      mockOrdersFetchPayments.mockResolvedValue({
        items: [{ id: "pay_ok", status: "captured", order_id: "order_xxx" }],
      });
      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 3,
          orderId: 1,
          reference: "order_xxx",
          paymentStatus: "initiated",
        });
      mockPrisma.payment.update.mockResolvedValue({
        id: 3,
        orderId: 1,
        paymentMethod: "razorpay",
        transactionId: "pay_ok",
        paymentStatus: "paid",
      });

      const result = await service.syncPaymentStatus(1);

      expect(result).toMatchObject({
        paymentStatus: "paid",
        razorpayPaymentStatus: "captured",
        synced: true,
      });
      expect(mockOrdersService.applyPaymentSuccess).toHaveBeenCalledWith(1);
    });

    it("keeps unprocessed when QR/checkout never completed", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        paymentStatus: "pending",
        notes: "razorpayOrderId:order_xxx",
        payments: [
          {
            reference: "order_xxx",
            paymentStatus: "initiated",
            notes: null,
          },
        ],
        totalAmount: 100,
      });
      mockOrdersFetch.mockResolvedValue({
        id: "order_xxx",
        status: "created",
        amount: 10000,
      });
      mockOrdersFetchPayments.mockResolvedValue({ items: [] });

      const result = await service.syncPaymentStatus(1);

      expect(result).toMatchObject({
        paymentStatus: "pending",
        razorpayPaymentStatus: "unprocessed",
        synced: false,
      });
      expect(result.message).toContain("website does not match");
    });
  });

  describe("handleWebhook()", () => {
    it("rejects invalid signature", async () => {
      await expect(
        service.handleWebhook("bad", "{}", { event: "payment.captured" }),
      ).rejects.toThrow("Invalid Razorpay webhook signature");
    });

    it("marks order paid on payment.captured", async () => {
      const bodyObj = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_wh",
              order_id: "order_wh",
              status: "captured",
              amount: 10000,
              notes: { orderId: "5" },
            },
          },
        },
      };
      const raw = JSON.stringify(bodyObj);
      const signature = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(raw)
        .digest("hex");

      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.payment.create.mockResolvedValue({
        id: 11,
        orderId: 5,
        paymentMethod: "razorpay",
        transactionId: "pay_wh",
        paymentStatus: "paid",
      });

      const result = await service.handleWebhook(signature, raw, bodyObj);

      expect(result).toMatchObject({
        received: true,
        handled: true,
        orderId: 5,
        razorpayPaymentId: "pay_wh",
      });
      expect(mockOrdersService.applyPaymentSuccess).toHaveBeenCalledWith(5);
    });
  });
});
