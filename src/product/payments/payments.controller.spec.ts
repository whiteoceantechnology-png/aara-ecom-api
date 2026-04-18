import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { RazorpayService } from "./razorpay.service";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

const mockPaymentsService = {
  findByOrder: jest.fn(),
  findOne: jest.fn(),
};

const mockRazorpayService = {
  createOrder: jest.fn(),
  verifyAndCapturePayment: jest.fn(),
};

describe("PaymentsController", () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
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

  // ──────────────────────────────────────────────
  // POST /payments/razorpay/create-order
  // ──────────────────────────────────────────────
  describe("createRazorpayOrder()", () => {
    it("should create Razorpay order and return orderId, amount, keyId", async () => {
      const dto = { orderId: 1 };
      const result = {
        razorpayOrderId: "order_xxx",
        amount: 10000,
        currency: "INR",
        keyId: "rzp_test_xxx",
        orderNumber: "ORD-123",
      };
      mockRazorpayService.createOrder.mockResolvedValue(result);

      expect(await controller.createRazorpayOrder(dto as any)).toEqual(result);
      expect(mockRazorpayService.createOrder).toHaveBeenCalledWith(dto);
    });
  });

  // ──────────────────────────────────────────────
  // POST /payments/razorpay/verify
  // ──────────────────────────────────────────────
  describe("verifyRazorpayPayment()", () => {
    it("should verify and capture payment", async () => {
      const dto = {
        orderId: 1,
        razorpayOrderId: "order_xxx",
        razorpayPaymentId: "pay_xxx",
        razorpaySignature: "sig_xxx",
      };
      const result = {
        success: true,
        payment: { id: 1, orderId: 1, paymentMethod: "razorpay" },
      };
      mockRazorpayService.verifyAndCapturePayment.mockResolvedValue(result);

      expect(await controller.verifyRazorpayPayment(dto as any)).toEqual(
        result,
      );
      expect(mockRazorpayService.verifyAndCapturePayment).toHaveBeenCalledWith(
        dto,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        PaymentsController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should NOT mark findByOrder as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PaymentsController.prototype.findByOrder,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark findOne as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PaymentsController.prototype.findOne,
      );
      expect(isPublic).toBeUndefined();
    });
  });
});
