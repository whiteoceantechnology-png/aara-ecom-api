import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Body,
  Param,
  Query,
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
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { VariantsService } from "../product/variants/variants.service";
import { CreateVariantDto, UpdateVariantDto } from "../product/dto/variant.dto";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { PrismaService } from "../prisma/prisma.service";

@ApiBearerAuth()
@ApiTags("Admin — Variants")
@Controller("admin/variants")
@UseGuards(AdminRoleGuard)
export class AdminVariantsController {
  constructor(
    private readonly variantsService: VariantsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("low-stock")
  @ApiOperation({ summary: "List low-stock product variants" })
  @ApiQuery({
    name: "threshold",
    required: false,
    type: Number,
    description:
      "Stock <= threshold (default: NotificationSettings.lowStockThreshold or 10)",
  })
  @ApiResponse({ status: 200, description: "Low stock product list" })
  async lowStock(@Query("threshold") thresholdRaw?: string) {
    let threshold = thresholdRaw ? Number(thresholdRaw) : NaN;
    if (!Number.isFinite(threshold)) {
      const settings = await this.prisma.notificationSettings.findUnique({
        where: { id: 1 },
        select: { lowStockThreshold: true },
      });
      threshold = settings?.lowStockThreshold ?? 10;
    }

    const items = await this.prisma.productVariant.findMany({
      where: { status: true, stockQuantity: { lte: threshold } },
      orderBy: { stockQuantity: "asc" },
      select: {
        id: true,
        sku: true,
        stockQuantity: true,
        reservedQuantity: true,
        price: true,
        discountPrice: true,
        productId: true,
        product: {
          select: {
            id: true,
            name: true,
            productImage: true,
            status: true,
          },
        },
        packSize: { select: { id: true, label: true, size: true, unit: true } },
      },
    });

    return {
      threshold,
      count: items.length,
      items,
    };
  }

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
