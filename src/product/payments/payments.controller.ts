import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { RazorpayService } from "./razorpay.service";
import { CreatePaymentDto } from "../dto/order.dto";
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from "../dto/payment.dto";

@ApiBearerAuth()
@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Record a payment for an order (COD, manual, etc.)",
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: "Payment recorded successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  // ─── Razorpay ──────────────────────────────────────────────────────────────

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
  verifyRazorpayPayment(@Body() dto: VerifyRazorpayPaymentDto) {
    return this.razorpayService.verifyAndCapturePayment(dto);
  }

  @Get("razorpay/status")
  @ApiOperation({ summary: "Check if Razorpay is configured" })
  @ApiResponse({ status: 200, description: "Razorpay configuration status" })
  razorpayStatus() {
    return {
      configured: this.razorpayService.isConfigured(),
    };
  }

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
