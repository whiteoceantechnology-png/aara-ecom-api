import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import Razorpay from "razorpay";
import * as crypto from "crypto";
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from "../dto/payment.dto";

@Injectable()
export class RazorpayService {
  private readonly razorpay: Razorpay | null;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {
    this.keyId = this.config.get<string>("RAZORPAY_KEY_ID") ?? "";
    this.keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET") ?? "";

    if (this.keyId && this.keySecret) {
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } else {
      this.razorpay = null;
    }
  }

  async createOrder(dto: CreateRazorpayOrderDto) {
    if (!this.razorpay) {
      throw new BadRequestException(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException(`Order #${dto.orderId} not found`);

    if (order.paymentStatus === "paid") {
      throw new BadRequestException("Order is already paid");
    }

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    if (amountInPaise < 100) {
      throw new BadRequestException(
        "Minimum amount for Razorpay is ₹1 (100 paise)",
      );
    }

    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${order.orderNumber}_${Date.now()}`,
      notes: {
        orderId: String(order.id),
        orderNumber: order.orderNumber,
      },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: razorpayOrder.currency,
      keyId: this.keyId,
      orderNumber: order.orderNumber,
    };
  }

  async verifyAndCapturePayment(dto: VerifyRazorpayPaymentDto) {
    if (!this.keySecret) {
      throw new BadRequestException(
        "Razorpay is not configured. Set RAZORPAY_KEY_SECRET.",
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException(`Order #${dto.orderId} not found`);

    if (order.paymentStatus === "paid") {
      throw new BadRequestException("Order is already paid");
    }

    const isValid = this.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isValid) {
      throw new BadRequestException("Invalid payment signature");
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        paymentMethod: "razorpay",
        transactionId: dto.razorpayPaymentId,
        paymentStatus: "paid",
        paymentDate: new Date(),
      },
    });

    await this.ordersService.applyPaymentSuccess(dto.orderId);

    return {
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        paymentStatus: payment.paymentStatus,
      },
    };
  }

  private verifySignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(body)
      .digest("hex");
    return expectedSignature === razorpaySignature;
  }
}
