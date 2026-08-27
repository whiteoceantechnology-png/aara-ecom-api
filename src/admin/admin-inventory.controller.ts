import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
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
import type { Request } from "express";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminInventoryService } from "./admin-inventory.service";
import {
  AdminAdjustStockDto,
  AdminBulkStockUpdateDto,
  AdminReleaseStockDto,
  AdminReserveStockDto,
  AdminUpdateProductStockDto,
  AdminUpdateStockDto,
} from "./dto/admin.dto";

@ApiBearerAuth()
@ApiTags("Admin — Inventory")
@UseGuards(AdminRoleGuard)
@Controller("admin/inventory")
export class AdminInventoryController {
  constructor(private readonly inventory: AdminInventoryService) {}

  @Get("low-stock")
  @ApiOperation({ summary: "Paginated low-stock products (product pool)" })
  @ApiQuery({
    name: "threshold",
    required: false,
    type: Number,
    description:
      "Product stock <= threshold (default: NotificationSettings.lowStockThreshold or 10)",
  })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  @ApiResponse({ status: 200, description: "Low stock list" })
  lowStock(
    @Query("threshold") threshold?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.inventory.lowStock({
      threshold: threshold != null ? Number(threshold) : undefined,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get("sales")
  @ApiOperation({
    summary: "Sale transactions ledger (what was sold + stock before/after)",
  })
  @ApiQuery({ name: "productId", required: false, type: Number })
  @ApiQuery({ name: "orderId", required: false, type: Number })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  listSales(
    @Query("productId") productId?: string,
    @Query("orderId") orderId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.inventory.listSales({
      productId: productId != null ? Number(productId) : undefined,
      orderId: orderId != null ? Number(orderId) : undefined,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Post("bulk-update")
  @ApiOperation({
    summary:
      "Bulk absolute product-pool stock updates (via variantId → product)",
  })
  @ApiBody({ type: AdminBulkStockUpdateDto })
  @ApiResponse({ status: 200, description: "Bulk update results" })
  bulkUpdate(@Body() dto: AdminBulkStockUpdateDto, @Req() req: Request) {
    return this.inventory.bulkUpdate(dto, this.actorFrom(req));
  }

  @Get()
  @ApiOperation({
    summary:
      "Paginated inventory list — product pool stock exposed per pack SKU",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "SKU, variant name, or product name",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "true/false or active/inactive",
  })
  @ApiQuery({ name: "productId", required: false, type: Number })
  @ApiQuery({ name: "variantId", required: false, type: Number })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  @ApiResponse({ status: 200, description: "Stock list" })
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("productId") productId?: string,
    @Query("variantId") variantId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.inventory.findAll({
      search,
      status,
      productId: productId != null ? Number(productId) : undefined,
      variantId: variantId != null ? Number(variantId) : undefined,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Put("products/:productId/stock")
  @ApiOperation({
    summary: "Set absolute product-level stock (source of truth)",
  })
  @ApiParam({ name: "productId", type: Number })
  @ApiBody({ type: AdminUpdateProductStockDto })
  updateProductStock(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() dto: AdminUpdateProductStockDto,
    @Req() req: Request,
  ) {
    return this.inventory.updateProductStock(
      productId,
      dto.stock,
      this.actorFrom(req),
    );
  }

  @Get("products/:productId/history")
  @ApiOperation({ summary: "Stock movement history for a product pool" })
  @ApiParam({ name: "productId", type: Number })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  productHistory(
    @Param("productId", ParseIntPipe) productId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.inventory.productHistory(productId, {
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get(":variantId/history")
  @ApiOperation({
    summary: "Stock movement history (resolves variant → product pool)",
  })
  @ApiParam({ name: "variantId", type: Number })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  history(
    @Param("variantId", ParseIntPipe) variantId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.inventory.history(variantId, {
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get(":variantId")
  @ApiOperation({
    summary: "Stock details for a pack SKU (shows parent product pool)",
  })
  @ApiParam({ name: "variantId", type: Number })
  @ApiResponse({ status: 200, description: "Stock details" })
  findOne(@Param("variantId", ParseIntPipe) variantId: number) {
    return this.inventory.findOne(variantId);
  }

  @Put(":variantId/stock")
  @ApiOperation({
    summary:
      "Set absolute product-pool stock via variantId (legacy; prefer PUT .../products/:id/stock)",
  })
  @ApiParam({ name: "variantId", type: Number })
  @ApiBody({ type: AdminUpdateStockDto })
  updateStock(
    @Param("variantId", ParseIntPipe) variantId: number,
    @Body() dto: AdminUpdateStockDto,
    @Req() req: Request,
  ) {
    return this.inventory.updateStock(variantId, dto, this.actorFrom(req));
  }

  @Post(":variantId/adjust")
  @ApiOperation({
    summary: "Adjust product-pool stock by signed delta with reason",
  })
  @ApiParam({ name: "variantId", type: Number })
  @ApiBody({ type: AdminAdjustStockDto })
  adjust(
    @Param("variantId", ParseIntPipe) variantId: number,
    @Body() dto: AdminAdjustStockDto,
    @Req() req: Request,
  ) {
    return this.inventory.adjustStock(variantId, dto, this.actorFrom(req));
  }

  @Post(":variantId/reserve")
  @ApiOperation({ summary: "Reserve available product-pool stock" })
  @ApiParam({ name: "variantId", type: Number })
  @ApiBody({ type: AdminReserveStockDto })
  reserve(
    @Param("variantId", ParseIntPipe) variantId: number,
    @Body() dto: AdminReserveStockDto,
    @Req() req: Request,
  ) {
    return this.inventory.reserveStock(variantId, dto, this.actorFrom(req));
  }

  @Post(":variantId/release")
  @ApiOperation({ summary: "Release previously reserved product-pool stock" })
  @ApiParam({ name: "variantId", type: Number })
  @ApiBody({ type: AdminReleaseStockDto })
  release(
    @Param("variantId", ParseIntPipe) variantId: number,
    @Body() dto: AdminReleaseStockDto,
    @Req() req: Request,
  ) {
    return this.inventory.releaseStock(variantId, dto, this.actorFrom(req));
  }

  private actorFrom(
    req: Request & {
      user?: { name?: string; username?: string; email?: string };
    },
  ): { name?: string | null } {
    const user = req.user;
    return {
      name: user?.username ?? user?.name ?? user?.email ?? null,
    };
  }
}
