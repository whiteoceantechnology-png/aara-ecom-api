import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminPaymentsService } from "./admin-payments.service";
import {
  AdminCreatePaymentLinkDto,
  AdminCreateRefundDto,
  AdminPaymentWebhookDto,
  AdminReconcilePaymentDto,
} from "./dto/admin.dto";

@ApiBearerAuth()
@ApiTags("Admin — Payments")
@UseGuards(AdminRoleGuard)
@Controller("admin/payments")
export class AdminPaymentsController {
  constructor(private readonly payments: AdminPaymentsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Payment ops overview KPIs" })
  @ApiQuery({ name: "days", required: false, example: 30 })
  @ApiResponse({ status: 200, description: "Overview metrics" })
  overview(@Query("days") days?: string) {
    return this.payments.overview(days != null ? Number(days) : undefined);
  }

  @Get("transactions")
  @ApiOperation({ summary: "Paginated payment transactions" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "paymentMethod", required: false })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listTransactions(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("paymentMethod") paymentMethod?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.payments.listTransactions({
      search,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get("transactions/:transactionId")
  @ApiOperation({ summary: "Payment transaction detail" })
  @ApiParam({ name: "transactionId" })
  getTransaction(@Param("transactionId") transactionId: string) {
    return this.payments.getTransaction(transactionId);
  }

  @Get("refunds")
  @ApiOperation({ summary: "Paginated refunds list" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listRefunds(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.payments.listRefunds({
      search,
      status,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Post("refunds")
  @ApiOperation({ summary: "Create a refund" })
  @ApiBody({ type: AdminCreateRefundDto })
  createRefund(@Body() dto: AdminCreateRefundDto) {
    return this.payments.createRefund(dto);
  }

  @Get("settlements")
  @ApiOperation({ summary: "Paginated settlements list" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listSettlements(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.payments.listSettlements({
      search,
      status,
      dateFrom,
      dateTo,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get("settlements/:settlementId")
  @ApiOperation({ summary: "Settlement detail" })
  @ApiParam({ name: "settlementId" })
  getSettlement(@Param("settlementId") settlementId: string) {
    return this.payments.getSettlement(settlementId);
  }

  @Get("cod")
  @ApiOperation({ summary: "COD cycles and delivered awaiting cash" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  getCod(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.payments.getCod({
      status,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get("health")
  @ApiOperation({ summary: "Payment gateway health and webhook log" })
  health() {
    return this.payments.health();
  }

  @Post("webhook")
  @ApiOperation({ summary: "Ingest payment gateway webhook" })
  @ApiBody({ type: AdminPaymentWebhookDto })
  webhook(@Body() dto: AdminPaymentWebhookDto) {
    return this.payments.webhook(dto);
  }

  @Post("reconcile")
  @ApiOperation({ summary: "Reconcile a payment by transactionId" })
  @ApiBody({ type: AdminReconcilePaymentDto })
  reconcile(@Body() dto: AdminReconcilePaymentDto) {
    return this.payments.reconcile(dto);
  }

  @Post("payment-links")
  @ApiOperation({ summary: "Create a payment link" })
  @ApiBody({ type: AdminCreatePaymentLinkDto })
  createPaymentLink(@Body() dto: AdminCreatePaymentLinkDto) {
    return this.payments.createPaymentLink(dto);
  }

  @Get("payment-links")
  @ApiOperation({ summary: "List payment links" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listPaymentLinks(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.payments.listPaymentLinks({
      status,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }
}
