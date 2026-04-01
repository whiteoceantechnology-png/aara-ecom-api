import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { VariantsService } from "../product/variants/variants.service";
import { CreateVariantDto, UpdateVariantDto } from "../product/dto/variant.dto";
import { AdminRoleGuard } from "../auth/admin-role.guard";

@ApiBearerAuth()
@ApiTags("Admin — Variants")
@Controller("admin/variants")
@UseGuards(AdminRoleGuard)
export class AdminVariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a product variant",
    description:
      "Requires admin JWT from `POST /admin/auth/login` (`role`: admin | superadmin).",
  })
  @ApiBody({ type: CreateVariantDto })
  @ApiResponse({ status: 201, description: "Variant created" })
  @ApiResponse({ status: 403, description: "Not an admin token" })
  create(@Body() dto: CreateVariantDto) {
    return this.variantsService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a product variant" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateVariantDto })
  @ApiResponse({ status: 200, description: "Variant updated" })
  @ApiResponse({ status: 404, description: "Variant not found" })
  @ApiResponse({ status: 403, description: "Not an admin token" })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateVariantDto) {
    return this.variantsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a product variant" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Variant deleted" })
  @ApiResponse({ status: 404, description: "Variant not found" })
  @ApiResponse({ status: 403, description: "Not an admin token" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.variantsService.remove(id);
  }
}
