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
import { AdminLogisticsCouriersService } from "./admin-logistics-couriers.service";
import { CreateCourierDto, UpdateCourierDto } from "./dto/admin-courier.dto";

@ApiBearerAuth()
@ApiTags("Admin — Logistics Couriers")
@UseGuards(AdminRoleGuard)
@Controller("admin/logistics/couriers")
export class AdminLogisticsCouriersController {
  constructor(private readonly couriers: AdminLogisticsCouriersService) {}

  @Get()
  @ApiOperation({ summary: "List couriers with states and rate rules" })
  @ApiResponse({ status: 200, description: "Courier list" })
  list() {
    return this.couriers.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a courier by id" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Courier detail" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.couriers.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create courier with optional states and rate rules",
  })
  @ApiBody({ type: CreateCourierDto })
  @ApiResponse({ status: 201, description: "Courier created" })
  create(@Body() dto: CreateCourierDto) {
    return this.couriers.create(dto);
  }

  @Put(":id")
  @ApiOperation({
    summary:
      "Update courier; when states/rateRules are sent they fully replace nested rows",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateCourierDto })
  @ApiResponse({ status: 200, description: "Courier updated" })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCourierDto) {
    return this.couriers.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete courier (cascades states and rate rules)" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Deleted" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.couriers.remove(id);
  }
}
