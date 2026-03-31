import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto, UpdateOrderStatusDto } from "../dto/order.dto";
import { CurrentCustomerId } from "../decorators/current-customer.decorator";

@ApiBearerAuth()
@ApiTags("Orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Create order from cart (legacy) — same rules as checkout (server pricing, stock reserve)",
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  @ApiResponse({ status: 400, description: "Cart is empty" })
  @ApiResponse({ status: 404, description: "Cart not found" })
  create(@Body() dto: CreateOrderDto, @CurrentCustomerId() customerId: number) {
    if (dto.customerId !== customerId) {
      throw new ForbiddenException(
        "customerId does not match authenticated customer",
      );
    }
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: "List orders for the authenticated customer",
  })
  @ApiResponse({ status: 200, description: "List of orders" })
  findAll(@CurrentCustomerId() customerId: number) {
    return this.ordersService.findAll(customerId);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Cancel order (only PENDING_PAYMENT — releases inventory reservation)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Order cancelled" })
  cancel(
    @Param("id", ParseIntPipe) id: number,
    @CurrentCustomerId() customerId: number,
  ) {
    return this.ordersService.cancel(id, customerId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get order by ID with items, payments and shipments",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Order details" })
  @ApiResponse({ status: 404, description: "Order not found" })
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentCustomerId() customerId: number,
  ) {
    return this.ordersService.findOneForCustomer(id, customerId);
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Update order status" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({ status: 200, description: "Order status updated" })
  @ApiResponse({ status: 404, description: "Order not found" })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
