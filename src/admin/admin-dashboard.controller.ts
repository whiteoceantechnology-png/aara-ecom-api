import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";

@ApiBearerAuth()
@ApiTags("Admin — Dashboard")
@Controller("admin/dashboard")
@UseGuards(AdminRoleGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({
    summary:
      "Dashboard summary — KPIs, revenue trend, AOV, low stock, awaiting fulfillment, previous-period delta",
  })
  @ApiQuery({
    name: "range",
    required: false,
    enum: [7, 30, 90],
    description: "Lookback window in days (default: 30)",
  })
  @ApiResponse({ status: 200, description: "Dashboard statistics" })
  getSummary(@Query("range") range?: string) {
    return this.dashboardService.getSummary(range);
  }

  @Get("attention")
  @ApiOperation({
    summary:
      "Issues needing attention — missing address, pricing, duplicate tax, missing variant price, low stock",
  })
  @ApiResponse({ status: 200, description: "Attention issues" })
  getAttention() {
    return this.dashboardService.getAttention();
  }

  @Get("sales")
  @ApiOperation({ summary: "Sales report grouped by day (legacy)" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of past days (default: 30)",
  })
  @ApiResponse({ status: 200, description: "Daily sales breakdown" })
  getSalesReport(@Query("days") days?: string) {
    return this.dashboardService.getSalesReport(days ? parseInt(days, 10) : 30);
  }
}
