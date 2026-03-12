import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { OrdersService } from "../product/orders/orders.service";
import { AdminUpdateOrderDto } from "./dto/admin.dto";

@ApiTags("Admin — Orders")
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary:
      "All orders with filters: status, paymentStatus, search, date range",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
  })
  @ApiQuery({
    name: "paymentStatus",
    required: false,
    enum: ["pending", "paid", "failed"],
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Order number or customer name/email",
  })
  @ApiQuery({
    name: "from",
    required: false,
    type: String,
    description: "Start date (ISO 8601)",
  })
  @ApiQuery({
    name: "to",
    required: false,
    type: String,
    description: "End date (ISO 8601)",
  })
  findAll(
    @Query("status") status?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("search") search?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.ordersService.adminFindAll({
      status,
      paymentStatus,
      search,
      from,
      to,
    });
  }

  @Get("export")
  @ApiOperation({ summary: "Export orders to CSV — for accounts team" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "from", required: false, type: String })
  @ApiQuery({ name: "to", required: false, type: String })
  @ApiResponse({ status: 200, description: "CSV file download" })
  async exportCsv(
    @Res() res: Response,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const csv = await this.ordersService.adminExportCsv({ status, from, to });
    const filename = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get full order detail with items, payments and shipments",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 404, description: "Order not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.adminFindOne(id);
  }

  @Put(":id")
  @ApiOperation({
    summary: "Update order — change status, set tracking ID, add notes",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminUpdateOrderDto })
  @ApiResponse({ status: 404, description: "Order not found" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdateOrderDto,
  ) {
    return this.ordersService.adminUpdate(id, dto);
  }
}
