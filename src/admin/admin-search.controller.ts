import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminSearchService } from "./admin-search.service";

@ApiBearerAuth()
@ApiTags("Admin — Search")
@Controller("admin/search")
@UseGuards(AdminRoleGuard)
export class AdminSearchController {
  constructor(private readonly searchService: AdminSearchService) {}

  @Get()
  @ApiOperation({
    summary: "Global admin search across products, orders, and customers",
  })
  @ApiQuery({ name: "q", required: true, type: String })
  @ApiQuery({
    name: "types",
    required: false,
    type: String,
    description: "Comma-separated: products,orders,customers (default: all)",
  })
  @ApiResponse({ status: 200, description: "Search results" })
  search(@Query("q") q?: string, @Query("types") types?: string) {
    return this.searchService.search(q, types);
  }
}
