import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminOrdersService } from "./admin-orders.service";
import {
  AdminAutoDeliverDto,
  AdminCancelOrderDto,
  AdminContactCustomerDto,
  AdminRecordPaymentDto,
  AdminRefundOrderDto,
  AdminUpdateOrderDto,
  AdminUpdatePaymentStatusDto,
} from "./dto/admin.dto";
import { OrderStatus } from "../product/constants/order-status";

@ApiBearerAuth()
@ApiTags("Admin — Orders")
@UseGuards(AdminRoleGuard)
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly adminOrders: AdminOrdersService) {}

  @Get("inventory-policy")
  @ApiOperation({
    summary:
      "Stock reservation policy (ONLINE reserve vs COD deduct) — for admin UI docs",
  })
  inventoryPolicy() {
    return this.adminOrders.getInventoryPolicy();
  }

  @Post("jobs/auto-deliver")
  @ApiOperation({
    summary:
      "Job: mark long-shipped orders as DELIVERED (cron-friendly auto-deliver)",
  })
  @ApiBody({ type: AdminAutoDeliverDto, required: false })
  autoDeliver(@Body() dto: AdminAutoDeliverDto = {}) {
    return this.adminOrders.autoDeliver(dto);
  }

  @Get()
  @ApiOperation({
    summary: "Paginated order list — search, status, paymentStatus, date range",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: Object.values(OrderStatus),
  })
  @ApiQuery({
    name: "paymentStatus",
    required: false,
    enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Order number, tracking ID, or customer name/email",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "ISO date (alias: from)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "ISO date (alias: to)",
  })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  findAll(
    @Query("status") status?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminOrders.findAll({
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("export")
  @ApiOperation({ summary: "Export orders to CSV" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiResponse({ status: 200, description: "CSV file download" })
  async exportCsv(
    @Res() res: Response,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const csv = await this.adminOrders.exportCsv({
      status,
      from,
      to,
      startDate,
      endDate,
    });
    const filename = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get(":id/events")
  @ApiOperation({ summary: "Order activity timeline" })
  @ApiParam({ name: "id", type: Number })
  listEvents(@Param("id", ParseIntPipe) id: number) {
    return this.adminOrders.listEvents(id);
  }

  @Get(":id/invoice")
  @ApiOperation({
    summary:
      "Generate invoice — printable HTML (Print → PDF). format=json returns a URL hint.",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "format", required: false, enum: ["html", "pdf", "json"] })
  async invoice(
    @Param("id", ParseIntPipe) id: number,
    @Query("format") format = "html",
    @Res() res: Response,
  ) {
    if (format === "json") {
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          orderId: id,
          format: "html",
          url: `/admin/orders/${id}/invoice?format=html`,
          hint: "Open URL and use browser Print → Save as PDF",
        },
      });
    }
    const html = await this.adminOrders.buildInvoiceHtml(id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (format === "pdf") {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="invoice-${id}.html"`,
      );
    }
    return res.status(HttpStatus.OK).send(html);
  }

  @Get(":id/packing-slip")
  @ApiOperation({
    summary: "Generate packing slip — printable HTML (Print → PDF)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "format", required: false, enum: ["html", "pdf", "json"] })
  async packingSlip(
    @Param("id", ParseIntPipe) id: number,
    @Query("format") format = "html",
    @Res() res: Response,
  ) {
    if (format === "json") {
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          orderId: id,
          format: "html",
          url: `/admin/orders/${id}/packing-slip?format=html`,
          hint: "Open URL and use browser Print → Save as PDF",
        },
      });
    }
    const html = await this.adminOrders.buildPackingSlipHtml(id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (format === "pdf") {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="packing-slip-${id}.html"`,
      );
    }
    return res.status(HttpStatus.OK).send(html);
  }

  @Get(":id")
  @ApiOperation({
    summary:
      "Order detail + items, payments, shipments, events timeline, refunds",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 404, description: "Order not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.adminOrders.findOne(id);
  }

  @Put(":id")
  @ApiOperation({
    summary:
      "Update fulfillment status (validated transitions), trackingId, notes",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminUpdateOrderDto })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdateOrderDto,
    @Req() req: Request & { user?: { username?: string } },
  ) {
    return this.adminOrders.update(id, dto, {
      name: req.user?.username ?? "Admin",
    });
  }

  @Post(":id/payments")
  @ApiOperation({ summary: "Record COD / offline payment collection" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminRecordPaymentDto })
  recordPayment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminRecordPaymentDto,
    @Req() req: Request & { user?: { username?: string } },
  ) {
    return this.adminOrders.recordPayment(id, dto, {
      name: req.user?.username ?? "Admin",
    });
  }

  @Patch(":id/payment-status")
  @ApiOperation({ summary: "Manually adjust paymentStatus (with audit event)" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminUpdatePaymentStatusDto })
  updatePaymentStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdatePaymentStatusDto,
    @Req() req: Request & { user?: { username?: string } },
  ) {
    return this.adminOrders.updatePaymentStatus(id, dto, {
      name: req.user?.username ?? "Admin",
    });
  }

  @Post(":id/refund")
  @ApiOperation({ summary: "Request a refund (audit + paymentStatus update)" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminRefundOrderDto })
  refund(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminRefundOrderDto,
    @Req() req: Request & { user?: { username?: string } },
  ) {
    return this.adminOrders.requestRefund(id, dto, {
      name: req.user?.username ?? "Admin",
    });
  }

  @Post(":id/cancel")
  @ApiOperation({
    summary: "Cancel order before ship and release/restock inventory",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminCancelOrderDto })
  cancel(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminCancelOrderDto,
    @Req() req: Request & { user?: { username?: string } },
  ) {
    return this.adminOrders.cancel(id, dto, {
      name: req.user?.username ?? "Admin",
    });
  }

  @Post(":id/contact")
  @ApiOperation({
    summary: "Log customer contact on the order timeline (wire SMTP/SMS later)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminContactCustomerDto })
  contact(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminContactCustomerDto,
    @Req() req: Request & { user?: { username?: string } },
  ) {
    return this.adminOrders.contactCustomer(id, dto, {
      name: req.user?.username ?? "Admin",
    });
  }
}
