import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { AdminCustomersService } from "./admin-customers.service";
import { AdminCustomerFilterDto } from "./dto/admin.dto";

@ApiTags("Admin — Customers")
@Controller("admin/customers")
export class AdminCustomersController {
  constructor(private readonly service: AdminCustomersService) {}

  @Get()
  @ApiOperation({
    summary: "List all customers with optional search and block filter",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by name, email or phone",
  })
  @ApiQuery({ name: "isBlocked", required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: "List of customers with order count",
  })
  findAll(@Query() filter: AdminCustomerFilterDto) {
    return this.service.findAll(filter);
  }

  @Get(":id")
  @ApiOperation({
    summary:
      "Get customer detail with order history, total spent, last order date",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Customer detail view" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(":id/toggle-block")
  @ApiOperation({
    summary: "Block or unblock a customer account (toggles current state)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Customer blocked/unblocked" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  toggleBlock(@Param("id", ParseIntPipe) id: number) {
    return this.service.toggleBlock(id);
  }
}
