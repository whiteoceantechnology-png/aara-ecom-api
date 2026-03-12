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
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "../dto/order.dto";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Record a payment for an order and mark it as paid",
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: "Payment recorded successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
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
