import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminReportsService } from "./admin-reports.service";

@ApiBearerAuth()
@ApiTags("Admin — Reports")
@Controller("admin/reports")
@UseGuards(AdminRoleGuard)
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get("sales")
  @ApiOperation({ summary: "Sales analytics by range and groupBy" })
  @ApiQuery({ name: "range", required: false, enum: [7, 30, 90] })
  @ApiQuery({
    name: "groupBy",
    required: false,
    enum: ["day", "week", "month"],
    description: "Bucket size (default: day)",
  })
  @ApiResponse({ status: 200, description: "Sales analytics" })
  getSales(@Query("range") range?: string, @Query("groupBy") groupBy?: string) {
    return this.reportsService.getSales(range, groupBy);
  }

  @Get("products")
  @ApiOperation({ summary: "Product sales analytics for a range" })
  @ApiQuery({ name: "range", required: false, enum: [7, 30, 90] })
  @ApiResponse({ status: 200, description: "Product analytics" })
  getProducts(@Query("range") range?: string) {
    return this.reportsService.getProducts(range);
  }

  @Get("sales-export")
  @ApiOperation({
    summary:
      "Export SaleTransaction sales ledger (GST template columns) for a month",
  })
  @ApiQuery({
    name: "month",
    required: true,
    example: "2026-10",
    description: "Month filter as YYYY-MM",
  })
  @ApiQuery({
    name: "productId",
    required: false,
    description: "Filter by product id",
  })
  @ApiQuery({
    name: "sku",
    required: false,
    description: "Filter by variant SKU",
  })
  @ApiQuery({
    name: "format",
    required: false,
    enum: ["xlsx", "json", "csv"],
    description: "xlsx (default) downloads Excel; json returns rows in body",
  })
  @ApiResponse({
    status: 200,
    description: "Excel/CSV download or JSON rows",
  })
  async salesExport(
    @Res() res: Response,
    @Query("month") month?: string,
    @Query("productId") productId?: string,
    @Query("sku") sku?: string,
    @Query("format") format?: string,
  ) {
    const result = await this.reportsService.exportSalesLedger({
      month,
      productId,
      sku,
      format,
    });

    if (result.kind === "json") {
      res.status(HttpStatus.OK).json({
        month: result.month,
        productId: result.productId,
        sku: result.sku,
        totalRows: result.totalRows,
        columns: result.columns,
        rows: result.rows,
      });
      return;
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.status(HttpStatus.OK).send(result.buffer);
  }

  @Get("export")
  @ApiOperation({ summary: "Export sales or product report as CSV/XLSX" })
  @ApiQuery({ name: "type", required: false, enum: ["sales", "products"] })
  @ApiQuery({ name: "range", required: false, enum: [7, 30, 90] })
  @ApiQuery({ name: "format", required: false, enum: ["csv", "xlsx"] })
  @ApiResponse({ status: 200, description: "Downloadable report file" })
  async export(
    @Query("type") type: string | undefined,
    @Query("range") range: string | undefined,
    @Query("format") format: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.reportsService.exportReport(type, range, format);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.buffer);
  }
}
