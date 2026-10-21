import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AppSettingsService } from "../../settings/app-settings.service";
import { OrdersService } from "../orders/orders.service";
import Razorpay from "razorpay";
import * as crypto from "crypto";
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from "../dto/payment.dto";

const RP_NOTE_PREFIX = "razorpayOrderId:";

type RazorpayPaymentLike = {
  id: string;
  status?: string;
  order_id?: string;
  amount?: number;
  notes?: Record<string, string>;
};

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client: {
    keyId: string;
    keySecret: string;
    instance: Razorpay;
  } | null = null;

  constructor(
    private readonly settings: AppSettingsService,
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  private get keyId(): string {
    return this.settings.get("RAZORPAY_KEY_ID");
  }

  private get keySecret(): string {
    return this.settings.get("RAZORPAY_KEY_SECRET");
  }

  private get webhookSecret(): string {
    return this.settings.get("RAZORPAY_WEBHOOK_SECRET");
  }

  /** Razorpay SDK client; rebuilt when credentials in the DB change. */
  private get razorpay(): Razorpay | null {
    const keyId = this.keyId;
    const keySecret = this.keySecret;
    if (!keyId || !keySecret) return null;
    if (
      !this.client ||
      this.client.keyId !== keyId ||
      this.client.keySecret !== keySecret
    ) {
      this.client = {
        keyId,
        keySecret,
        instance: new Razorpay({ key_id: keyId, key_secret: keySecret }),
      };
    }
    return this.client.instance;
  }

  isConfigured(): boolean {
    return Boolean(this.razorpay && this.keyId && this.keySecret);
  }

  getConfigStatus() {
    const mode = this.keyId.startsWith("rzp_live_")
      ? "live"
      : this.keyId.startsWith("rzp_test_")
        ? "test"
        : this.keyId
          ? "unknown"
          : "unset";
    return {
      configured: this.isConfigured(),
      mode,
      keyIdPrefix: this.keyId ? `${this.keyId.slice(0, 12)}…` : null,
      webhookConfigured: Boolean(this.webhookSecret),
      websiteWhitelistRequired: mode === "live",
      hint:
        mode === "live"
          ? "Live mode: Checkout domain must be listed in Razorpay Dashboard → Account & Settings → Website and app settings. Also call POST /payments/razorpay/verify (or GET status sync) after payment."
          : mode === "test"
            ? "Test mode keys are active — use Razorpay test cards/UPI."
            : "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET via PUT /admin/settings/credentials.",
    };
  }

  async createOrder(dto: CreateRazorpayOrderDto) {
    if (!this.razorpay) {
      throw new BadRequestException(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET via PUT /admin/settings/credentials.",
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        payments: {
          where: { paymentMethod: "razorpay" },
          orderBy: { id: "desc" },
          take: 5,
        },
      },
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

    // Reuse an open Razorpay order so refresh/retry does not create orphans.
    const existingRpId = this.resolveStoredRazorpayOrderId(order);
    if (existingRpId) {
      try {
        const existing = await this.razorpay.orders.fetch(existingRpId);
        if (existing && existing.status !== "paid") {
          return this.buildCreateResponse(
            existing.id,
            Number(existing.amount) || amountInPaise,
            existing.currency || "INR",
            order.orderNumber,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Could not reuse Razorpay order ${existingRpId}: ${String(err)}`,
        );
      }
    }

    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${order.orderNumber}`.slice(0, 40),
      notes: {
        orderId: String(order.id),
        orderNumber: order.orderNumber,
      },
    });

    await this.persistRazorpayOrderLink(
      order.id,
      razorpayOrder.id,
      order.totalAmount,
      order.notes,
    );

    return this.buildCreateResponse(
      razorpayOrder.id,
      amountInPaise,
      razorpayOrder.currency,
      order.orderNumber,
    );
  }

  async verifyAndCapturePayment(dto: VerifyRazorpayPaymentDto) {
    if (!this.keySecret) {
      throw new BadRequestException(
        "Razorpay is not configured. Set RAZORPAY_KEY_SECRET via PUT /admin/settings/credentials.",
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        payments: {
          where: { paymentMethod: "razorpay" },
          orderBy: { id: "desc" },
          take: 10,
        },
      },
    });
    if (!order) throw new NotFoundException(`Order #${dto.orderId} not found`);

    if (order.paymentStatus === "paid") {
      const existing =
        order.payments.find((p) => p.paymentStatus === "paid") ??
        order.payments[0];
      return {
        success: true,
        alreadyPaid: true,
        payment: existing
          ? {
              id: existing.id,
              orderId: existing.orderId,
              paymentMethod: existing.paymentMethod,
              transactionId: existing.transactionId,
              paymentStatus: existing.paymentStatus,
            }
          : null,
      };
    }

    const isValid = this.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!isValid) {
      throw new BadRequestException("Invalid payment signature");
    }

    const storedRpId = this.resolveStoredRazorpayOrderId(order);
    if (storedRpId && storedRpId !== dto.razorpayOrderId) {
      throw new BadRequestException(
        "Razorpay order does not match this shop order",
      );
    }

    const payment = await this.markOrderPaidFromRazorpay({
      orderId: dto.orderId,
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      amount: order.totalAmount,
    });

    return {
      success: true,
      alreadyPaid: false,
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        paymentStatus: payment.paymentStatus,
      },
    };
  }

  /**
   * Poll Razorpay for the linked order and mark our order paid if payment
   * was captured (covers cases where Checkout handler/verify never ran).
   * Maps missing/incomplete gateway payments to razorpayPaymentStatus "unprocessed".
   */
  async syncPaymentStatus(orderId: number) {
    if (!this.razorpay) {
      throw new BadRequestException(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET via PUT /admin/settings/credentials.",
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { paymentMethod: "razorpay" },
          orderBy: { id: "desc" },
          take: 10,
        },
      },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    const razorpayOrderId = this.resolveStoredRazorpayOrderId(order);

    if (order.paymentStatus === "paid") {
      return {
        orderId,
        paymentStatus: "paid",
        razorpayOrderId,
        razorpayOrderStatus: "paid",
        razorpayPaymentStatus: "captured",
        message: "Order is already paid",
        synced: false,
      };
    }

    if (!razorpayOrderId) {
      return {
        orderId,
        paymentStatus: order.paymentStatus,
        razorpayOrderId: null,
        razorpayOrderStatus: null,
        razorpayPaymentStatus: "unprocessed",
        message:
          "No Razorpay order linked yet. Call POST /payments/razorpay/create-order first.",
        synced: false,
      };
    }

    let rpOrder: { id: string; status?: string; amount?: number | string };
    try {
      rpOrder = await this.razorpay.orders.fetch(razorpayOrderId);
    } catch (err) {
      this.logger.error(`Razorpay orders.fetch failed: ${String(err)}`);
      throw new BadRequestException(
        "Unable to fetch Razorpay order status. Check keys and order id.",
      );
    }

    let paymentsList: RazorpayPaymentLike[] = [];
    try {
      const fetched = await this.razorpay.orders.fetchPayments(razorpayOrderId);
      paymentsList = (fetched?.items ?? []) as RazorpayPaymentLike[];
    } catch (err) {
      this.logger.warn(
        `Razorpay fetchPayments failed for ${razorpayOrderId}: ${String(err)}`,
      );
    }

    const successful = paymentsList.find((p) =>
      ["captured", "authorized"].includes(String(p.status ?? "").toLowerCase()),
    );
    const failed = paymentsList.find(
      (p) => String(p.status ?? "").toLowerCase() === "failed",
    );

    if (successful?.id) {
      await this.markOrderPaidFromRazorpay({
        orderId,
        razorpayOrderId,
        razorpayPaymentId: successful.id,
        amount: order.totalAmount,
      });
      return {
        orderId,
        paymentStatus: "paid",
        razorpayOrderId,
        razorpayOrderStatus: rpOrder.status ?? "paid",
        razorpayPaymentStatus: successful.status ?? "captured",
        razorpayPaymentId: successful.id,
        message: "Payment captured at Razorpay — order marked paid",
        synced: true,
      };
    }

    const gatewayPaymentStatus =
      rpOrder.status === "paid"
        ? "captured"
        : failed
          ? "failed"
          : paymentsList.length > 0
            ? String(paymentsList[0].status ?? "unprocessed")
            : "unprocessed";

    return {
      orderId,
      paymentStatus: order.paymentStatus,
      razorpayOrderId,
      razorpayOrderStatus: rpOrder.status ?? "created",
      razorpayPaymentStatus: gatewayPaymentStatus,
      message:
        gatewayPaymentStatus === "unprocessed"
          ? "Payment not completed at Razorpay yet (often blocked Checkout / abandoned UPI QR). If you see 'website does not match registered website(s)', add your storefront domain in Razorpay Dashboard → Website and app settings. After a successful pay, call verify or re-poll this status endpoint."
          : gatewayPaymentStatus === "failed"
            ? "Razorpay reported payment failed"
            : `Razorpay order status: ${rpOrder.status}`,
      synced: false,
      config: this.getConfigStatus(),
    };
  }

  async handleWebhook(
    signature: string | undefined,
    rawBody: string,
    payload: {
      event?: string;
      payload?: {
        payment?: { entity?: RazorpayPaymentLike };
        order?: { entity?: { id?: string; notes?: Record<string, string> } };
      };
    },
  ) {
    if (!this.webhookSecret) {
      throw new BadRequestException(
        "RAZORPAY_WEBHOOK_SECRET is not configured",
      );
    }
    if (!signature) {
      throw new BadRequestException("Missing X-Razorpay-Signature header");
    }

    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
    if (expected !== signature) {
      throw new BadRequestException("Invalid Razorpay webhook signature");
    }

    const event = payload.event ?? "";
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    if (
      !["payment.captured", "payment.authorized", "order.paid"].includes(event)
    ) {
      return { received: true, handled: false, event };
    }

    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId =
      paymentEntity?.order_id ?? orderEntity?.id ?? undefined;
    const notes = paymentEntity?.notes ?? orderEntity?.notes ?? {};
    const orderIdRaw = notes.orderId;
    const orderId = orderIdRaw ? Number(orderIdRaw) : NaN;

    let resolvedOrderId = Number.isFinite(orderId) ? orderId : null;
    if (!resolvedOrderId && razorpayOrderId) {
      const linked = await this.prisma.payment.findFirst({
        where: {
          paymentMethod: "razorpay",
          reference: razorpayOrderId,
        },
        orderBy: { id: "desc" },
      });
      resolvedOrderId = linked?.orderId ?? null;
    }

    if (!resolvedOrderId || !razorpayPaymentId || !razorpayOrderId) {
      this.logger.warn(
        `Webhook ${event} missing order/payment linkage: ${JSON.stringify({
          razorpayPaymentId,
          razorpayOrderId,
          notes,
        })}`,
      );
      return { received: true, handled: false, event, reason: "unlinked" };
    }

    await this.markOrderPaidFromRazorpay({
      orderId: resolvedOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      amount: paymentEntity?.amount
        ? new Prisma.Decimal(paymentEntity.amount / 100)
        : undefined,
    });

    return {
      received: true,
      handled: true,
      event,
      orderId: resolvedOrderId,
      razorpayPaymentId,
    };
  }

  private buildCreateResponse(
    razorpayOrderId: string,
    amount: number,
    currency: string,
    orderNumber: string,
  ) {
    return {
      razorpayOrderId,
      amount,
      currency,
      keyId: this.keyId,
      orderNumber,
      mode: this.keyId.startsWith("rzp_live_") ? "live" : "test",
      checkoutNotes: {
        websiteWhitelist:
          "Live Checkout requires your exact storefront domain (incl. https://www…) in Razorpay Dashboard → Website and app settings. Mismatch returns: Payment blocked as website does not match registered website(s).",
        afterPayment:
          "On handler success call POST /payments/razorpay/verify. If handler is skipped, poll GET /payments/razorpay/status/:orderId.",
        upiVpa: "UPI VPA must look like name@bank (e.g. user@okaxis).",
      },
    };
  }

  private resolveStoredRazorpayOrderId(order: {
    notes: string | null;
    payments: Array<{
      reference: string | null;
      paymentStatus: string;
      notes: string | null;
    }>;
  }): string | null {
    const fromPayment = order.payments.find(
      (p) =>
        p.reference &&
        ["initiated", "pending", "paid"].includes(p.paymentStatus),
    )?.reference;
    if (fromPayment) return fromPayment;

    const notes = order.notes ?? "";
    const match = notes.match(new RegExp(`${RP_NOTE_PREFIX}(order_[\\w]+)`));
    return match?.[1] ?? null;
  }

  private async persistRazorpayOrderLink(
    orderId: number,
    razorpayOrderId: string,
    amount: Prisma.Decimal | number | string,
    existingNotes: string | null,
  ) {
    const noteLine = `${RP_NOTE_PREFIX}${razorpayOrderId}`;
    const cleaned = (existingNotes ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith(RP_NOTE_PREFIX));
    cleaned.push(noteLine);

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { notes: cleaned.join("\n") },
      }),
      this.prisma.payment.create({
        data: {
          orderId,
          paymentMethod: "razorpay",
          reference: razorpayOrderId,
          amount:
            amount instanceof Prisma.Decimal
              ? amount
              : new Prisma.Decimal(amount),
          paymentStatus: "initiated",
          notes: `Razorpay order ${razorpayOrderId}`,
        },
      }),
    ]);
  }

  private async markOrderPaidFromRazorpay(params: {
    orderId: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    amount?: Prisma.Decimal | number | string;
  }) {
    const already = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: params.razorpayPaymentId },
          {
            orderId: params.orderId,
            paymentMethod: "razorpay",
            paymentStatus: "paid",
          },
        ],
      },
      orderBy: { id: "desc" },
    });

    if (already?.paymentStatus === "paid") {
      await this.ordersService.applyPaymentSuccess(params.orderId);
      return already;
    }

    const initiated = await this.prisma.payment.findFirst({
      where: {
        orderId: params.orderId,
        paymentMethod: "razorpay",
        reference: params.razorpayOrderId,
        paymentStatus: "initiated",
      },
      orderBy: { id: "desc" },
    });

    let payment;
    if (initiated) {
      payment = await this.prisma.payment.update({
        where: { id: initiated.id },
        data: {
          transactionId: params.razorpayPaymentId,
          paymentStatus: "paid",
          paymentDate: new Date(),
          notes: `Captured ${params.razorpayPaymentId}`,
        },
      });
    } else {
      payment = await this.prisma.payment.create({
        data: {
          orderId: params.orderId,
          paymentMethod: "razorpay",
          transactionId: params.razorpayPaymentId,
          reference: params.razorpayOrderId,
          amount:
            params.amount == null
              ? undefined
              : params.amount instanceof Prisma.Decimal
                ? params.amount
                : new Prisma.Decimal(params.amount),
          paymentStatus: "paid",
          paymentDate: new Date(),
        },
      });
    }

    await this.ordersService.applyPaymentSuccess(params.orderId);
    return payment;
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
