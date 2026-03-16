import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdminDashboardService } from "./admin-dashboard.service";

@ApiBearerAuth()
@ApiTags("Admin — Dashboard")
@Controller("admin/dashboard")
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({
    summary: "Dashboard summary — sales, orders, customers, top products",
  })
  @ApiResponse({ status: 200, description: "Dashboard statistics" })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get("sales")
  @ApiOperation({ summary: "Sales report grouped by day" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of past days (default: 30)",
  })
  @ApiResponse({ status: 200, description: "Daily sales breakdown" })
  getSalesReport(@Query("days") days?: string) {
    return this.dashboardService.getSalesReport(days ? parseInt(days) : 30);
  }
}
