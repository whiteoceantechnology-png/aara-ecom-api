import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import type { Request } from "express";
import { PaymentsService } from "./payments.service";
import { RazorpayService } from "./razorpay.service";
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from "../dto/payment.dto";
import { Public } from "../../auth/public.decorator";

@ApiBearerAuth()
@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly razorpayService: RazorpayService,
  ) {}

  // ─── Razorpay ──────────────────────────────────────────────────────────────

  @Get("razorpay/config")
  @ApiOperation({
    summary: "Razorpay configuration health (mode live/test, webhook flag)",
  })
  @ApiResponse({ status: 200, description: "Config status" })
  getRazorpayConfig() {
    return this.razorpayService.getConfigStatus();
  }

  @Post("razorpay/create-order")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Create Razorpay order — returns orderId, amount, keyId for frontend checkout",
  })
  @ApiBody({ type: CreateRazorpayOrderDto })
  @ApiResponse({
    status: 200,
    description:
      "Razorpay order created — use razorpayOrderId and keyId in Razorpay Checkout",
  })
  @ApiResponse({
    status: 400,
    description: "Order already paid or Razorpay not configured",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  createRazorpayOrder(@Body() dto: CreateRazorpayOrderDto) {
    return this.razorpayService.createOrder(dto);
  }

  @Post("razorpay/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Verify Razorpay payment signature and capture payment — call after checkout success",
  })
  @ApiBody({ type: VerifyRazorpayPaymentDto })
  @ApiResponse({
    status: 200,
    description: "Payment verified and recorded",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid signature or order already paid",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  verifyRazorpayPayment(
    @Body() dto: VerifyRazorpayPaymentDto,
    @Req() req: Request,
  ) {
    return this.razorpayService.verifyAndCapturePayment(dto, {
      clientIpAddress: this.resolveClientIp(req),
      clientUserAgent: req.headers["user-agent"] ?? null,
    });
  }

  /** Prefers the original client IP from a reverse proxy (X-Forwarded-For) over the socket address. */
  private resolveClientIp(req: Request): string | null {
    const forwarded = req.headers["x-forwarded-for"];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const fromHeader = first?.split(",")[0]?.trim();
    return fromHeader || req.socket.remoteAddress || null;
  }

  @Get("razorpay/status/:orderId")
  @ApiOperation({
    summary:
      "Sync/check Razorpay payment status for an order (fixes stuck pending/unprocessed when verify was skipped)",
  })
  @ApiParam({ name: "orderId", type: Number })
  @ApiResponse({ status: 200, description: "Payment status snapshot" })
  @ApiResponse({ status: 404, description: "Order not found" })
  syncRazorpayStatus(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.razorpayService.syncPaymentStatus(orderId);
  }

  @Public()
  @Post("razorpay/webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Razorpay webhook (payment.captured / order.paid) — configure in Dashboard with RAZORPAY_WEBHOOK_SECRET",
  })
  @ApiHeader({ name: "x-razorpay-signature", required: true })
  @ApiResponse({ status: 200, description: "Webhook received" })
  handleRazorpayWebhook(
    @Headers("x-razorpay-signature") signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer | string },
    @Body() body: Record<string, unknown>,
  ) {
    const rawBody =
      typeof req.rawBody === "string"
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString("utf8")
          : JSON.stringify(body);
    return this.razorpayService.handleWebhook(signature, rawBody, body as any);
  }

  // ─── Lookups ───────────────────────────────────────────────────────────────

  @Get("order/:orderId")
  @ApiOperation({ summary: "Get all payments for a specific order" })
  @ApiParam({ name: "orderId", type: Number })
  @ApiResponse({ status: 200, description: "List of payments for the order" })
  @ApiResponse({ status: 404, description: "Order not found" })
  findByOrder(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Payment details" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }
}
