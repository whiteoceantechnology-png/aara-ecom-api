import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
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
