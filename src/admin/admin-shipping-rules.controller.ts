import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import {
  AdminShippingRuleDto,
  AdminUpdateShippingRuleDto,
} from "./dto/admin.dto";
import { AdminShippingRulesService } from "./admin-shipping-rules.service";

@ApiBearerAuth()
@ApiTags("Admin — Shipping Rules")
@Controller("admin/shipping-rules")
@UseGuards(AdminRoleGuard)
export class AdminShippingRulesController {
  constructor(
    private readonly shippingRulesService: AdminShippingRulesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List shipping rules" })
  @ApiResponse({ status: 200, description: "Shipping rules" })
  list() {
    return this.shippingRulesService.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a shipping rule" })
  @ApiBody({ type: AdminShippingRuleDto })
  @ApiResponse({ status: 201, description: "Created rule" })
  create(@Body() dto: AdminShippingRuleDto) {
    return this.shippingRulesService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a shipping rule" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminUpdateShippingRuleDto })
  @ApiResponse({ status: 200, description: "Updated rule" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdateShippingRuleDto,
  ) {
    return this.shippingRulesService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a shipping rule" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Success message" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.shippingRulesService.remove(id);
  }
}
