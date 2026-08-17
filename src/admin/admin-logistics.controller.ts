import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { AdminLogisticsService } from "./admin-logistics.service";
import {
  AdminBookShipmentDto,
  AdminLogisticsWebhookDto,
  AdminNdrAddressDto,
  AdminNdrReattemptDto,
  AdminNdrRtoDto,
  AdminRtoRestockDto,
  AdminWalletRechargeDto,
} from "./dto/admin.dto";

@ApiBearerAuth()
@ApiTags("Admin — Logistics")
@UseGuards(AdminRoleGuard)
@Controller("admin/logistics")
export class AdminLogisticsController {
  constructor(private readonly logistics: AdminLogisticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Logistics ops overview KPIs" })
  @ApiResponse({ status: 200, description: "Overview metrics" })
  overview() {
    return this.logistics.overview();
  }

  @Get("ready-to-ship")
  @ApiOperation({ summary: "PACKED orders ready to ship" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  readyToShip(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.logistics.readyToShip({
      search,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get("rates")
  @ApiOperation({ summary: "Courier rate card" })
  @ApiQuery({ name: "zone", required: false, example: "B" })
  @ApiQuery({ name: "weightKg", required: false, example: 1.2 })
  rates(@Query("zone") zone?: string, @Query("weightKg") weightKg?: string) {
    return this.logistics.rates(
      zone,
      weightKg != null ? Number(weightKg) : undefined,
    );
  }

  @Get("serviceability/:pincode")
  @ApiOperation({ summary: "Pincode serviceability check" })
  @ApiParam({ name: "pincode", example: "600028" })
  serviceability(@Param("pincode") pincode: string) {
    return this.logistics.serviceability(pincode);
  }

  @Get("config")
  @ApiOperation({ summary: "Logistics config (ensures id=1)" })
  getConfig() {
    return this.logistics.getConfig();
  }

  @Post("webhook")
  @ApiOperation({ summary: "Ingest logistics tracking webhook" })
  @ApiBody({ type: AdminLogisticsWebhookDto })
  webhook(@Body() dto: AdminLogisticsWebhookDto) {
    return this.logistics.webhook(dto);
  }

  @Get("ndr")
  @ApiOperation({ summary: "NDR shipments list" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "reason", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listNdr(
    @Query("search") search?: string,
    @Query("reason") reason?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.logistics.listNdr({
      search,
      reason,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Post("ndr/:awb/reattempt")
  @ApiOperation({ summary: "Schedule NDR reattempt" })
  @ApiParam({ name: "awb" })
  @ApiBody({ type: AdminNdrReattemptDto })
  ndrReattempt(@Param("awb") awb: string, @Body() dto: AdminNdrReattemptDto) {
    return this.logistics.ndrReattempt(awb, dto);
  }

  @Post("ndr/:awb/address")
  @ApiOperation({ summary: "Update address on NDR and reattempt" })
  @ApiParam({ name: "awb" })
  @ApiBody({ type: AdminNdrAddressDto })
  ndrAddress(@Param("awb") awb: string, @Body() dto: AdminNdrAddressDto) {
    return this.logistics.ndrAddress(awb, dto);
  }

  @Post("ndr/:awb/rto")
  @ApiOperation({ summary: "Mark NDR as RTO in transit" })
  @ApiParam({ name: "awb" })
  @ApiBody({ type: AdminNdrRtoDto })
  ndrToRto(@Param("awb") awb: string, @Body() dto: AdminNdrRtoDto) {
    return this.logistics.ndrToRto(awb, dto);
  }

  @Get("rto")
  @ApiOperation({ summary: "RTO shipments list" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listRto(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.logistics.listRto({
      status,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Post("rto/:awb/receive")
  @ApiOperation({ summary: "Mark RTO received at warehouse" })
  @ApiParam({ name: "awb" })
  rtoReceive(@Param("awb") awb: string) {
    return this.logistics.rtoReceive(awb);
  }

  @Post("rto/:awb/restock")
  @ApiOperation({ summary: "QC + restock after RTO receive" })
  @ApiParam({ name: "awb" })
  @ApiBody({ type: AdminRtoRestockDto })
  rtoRestock(@Param("awb") awb: string, @Body() dto: AdminRtoRestockDto) {
    return this.logistics.rtoRestock(awb, dto);
  }

  @Post("wallet/recharge")
  @ApiOperation({ summary: "Credit logistics wallet" })
  @ApiBody({ type: AdminWalletRechargeDto })
  walletRecharge(@Body() dto: AdminWalletRechargeDto) {
    return this.logistics.walletRecharge(dto);
  }

  @Get("shipments")
  @ApiOperation({ summary: "Paginated shipments list" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "courier", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listShipments(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("courier") courier?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.logistics.listShipments({
      search,
      status,
      courier,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Post("shipments/:orderId/book")
  @ApiOperation({ summary: "Book shipment for an order" })
  @ApiParam({ name: "orderId", type: Number })
  @ApiBody({ type: AdminBookShipmentDto })
  bookShipment(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: AdminBookShipmentDto,
  ) {
    return this.logistics.bookShipment(orderId, dto);
  }

  @Get("shipments/:awb/tracking")
  @ApiOperation({ summary: "Shipment tracking scans" })
  @ApiParam({ name: "awb" })
  tracking(@Param("awb") awb: string) {
    return this.logistics.tracking(awb);
  }

  @Get("shipments/:awb")
  @ApiOperation({ summary: "Shipment detail by AWB" })
  @ApiParam({ name: "awb" })
  getShipment(@Param("awb") awb: string) {
    return this.logistics.getShipment(awb);
  }
}
