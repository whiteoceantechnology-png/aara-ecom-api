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
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiProduces,
} from "@nestjs/swagger";
import { VariantsService } from "../product/variants/variants.service";
import { CreateVariantDto, UpdateVariantDto } from "../product/dto/variant.dto";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { PrismaService } from "../prisma/prisma.service";
import { AdminMasterdataService } from "./admin-masterdata.service";
import { assertExcelUpload } from "./masterdata-excel.util";

const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

@ApiBearerAuth()
@ApiTags("Admin — Variants")
@Controller("admin/variants")
@UseGuards(AdminRoleGuard)
export class AdminVariantsController {
  constructor(
    private readonly variantsService: VariantsService,
    private readonly prisma: PrismaService,
    private readonly masterdataService: AdminMasterdataService,
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

    const items = await this.prisma.product.findMany({
      where: { status: true, stock: { lte: threshold } },
      orderBy: { stock: "asc" },
      select: {
        id: true,
        name: true,
        stock: true,
        reservedStock: true,
        stockUnit: true,
        productImage: true,
        status: true,
        variants: {
          where: { status: true },
          select: {
            id: true,
            sku: true,
            price: true,
            discountPrice: true,
            packSize: {
              select: { id: true, label: true, size: true, unit: true },
            },
          },
        },
      },
    });

    return {
      threshold,
      count: items.length,
      items: items.map((p) => ({
        productId: p.id,
        productName: p.name,
        productStock: p.stock,
        reservedStock: p.reservedStock,
        availableProductStock: Math.max(0, p.stock - p.reservedStock),
        stockUnit: p.stockUnit,
        productImage: p.productImage,
        status: p.status,
        variants: p.variants,
      })),
    };
  }

  @Get("template")
  @ApiOperation({
    summary: "Download Excel template for variant bulk import",
    description:
      "Same workbook as `GET /admin/masterdata/variants/template` (Variants + PackSizes + Instructions).",
  })
  @ApiProduces(XLSX_MIME)
  async downloadTemplate(): Promise<StreamableFile> {
    const buf = await this.masterdataService.buildVariantTemplateBufferAsync();
    return new StreamableFile(buf, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="variant-import-template.xlsx"',
    });
  }

  @Get("export")
  @ApiOperation({
    summary: "Export all variants to Excel",
    description: "Round-trip file for `POST /admin/variants/import`.",
  })
  @ApiProduces(XLSX_MIME)
  async exportVariants(): Promise<StreamableFile> {
    const buf = await this.masterdataService.buildVariantExportBuffer();
    const date = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buf, {
      type: XLSX_MIME,
      disposition: `attachment; filename="variants-export-${date}.xlsx"`,
    });
  }

  @Post("import")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_EXCEL_BYTES },
    }),
  )
  @ApiOperation({
    summary: "Bulk import variants from Excel",
    description:
      "Industry-standard masterdata upsert — same engine as product bulk import.\n\n" +
      "**Upsert:** id → else unique sku → else create (delegates to VariantsService).\n" +
      "Required create columns: productId, packSizeId, sku, price.\n" +
      "Optional: discountedPrice, variantName, status, imagePath (`a|b`).",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Import finished — see summary / failed rows",
  })
  async importVariants(@UploadedFile() file: Express.Multer.File) {
    const uploaded = assertExcelUpload(file);
    return this.masterdataService.importVariantsFromExcel(uploaded.buffer);
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
