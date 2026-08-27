import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiProduces,
} from "@nestjs/swagger";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminMasterdataService } from "./admin-masterdata.service";
import { assertExcelUpload } from "./masterdata-excel.util";

const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

@ApiBearerAuth()
@ApiTags("Admin — Master data")
@UseGuards(AdminRoleGuard)
@Controller("admin/masterdata")
export class AdminMasterdataController {
  constructor(private readonly masterdataService: AdminMasterdataService) {}

  // ─── Products ──────────────────────────────────────────────────────────────

  @Get("products/template")
  @ApiOperation({
    summary: "Download Excel template for product import",
    description:
      "Same columns as `POST .../products/import` and as **Export**. Row 1 = headers; row 2 = example. " +
      "Leave **id** blank for new products. Use **Export** to pull current DB rows, edit, then import.",
  })
  @ApiProduces(XLSX_MIME)
  @ApiResponse({ status: 200, description: "`.xlsx` file download" })
  downloadTemplate(): StreamableFile {
    const buf = this.masterdataService.buildProductTemplateBuffer();
    return new StreamableFile(buf, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="product-import-template.xlsx"',
    });
  }

  @Get("products/export")
  @ApiOperation({
    summary: "Export all products to Excel",
    description:
      "Same columns as **Template** / **Import**. Use to review data or round-trip updates by id.",
  })
  @ApiProduces(XLSX_MIME)
  @ApiResponse({ status: 200, description: "`.xlsx` file download" })
  async exportProducts(): Promise<StreamableFile> {
    const buf = await this.masterdataService.buildProductExportBuffer();
    const date = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buf, {
      type: XLSX_MIME,
      disposition: `attachment; filename="products-export-${date}.xlsx"`,
    });
  }

  @Post("products/import")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_EXCEL_BYTES },
    }),
  )
  @ApiOperation({
    summary: "Bulk import products from Excel",
    description:
      "Upload `.xlsx` or `.xls`. First row: headers. From row 2: one product per row. " +
      "Required: **categoryId**, **name**. Optional: brandId, description, hsnCode, taxPercent, taxId, prices. " +
      "Rows with existing **id** are updated; otherwise created.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Excel file (first sheet)",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      "Import finished — check `summary` and `failed` for per-row errors",
  })
  @ApiResponse({ status: 400, description: "Invalid file or empty sheet" })
  async importProducts(@UploadedFile() file: Express.Multer.File) {
    const uploaded = assertExcelUpload(file);
    return this.masterdataService.importProductsFromExcel(uploaded.buffer);
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  @Get("variants/template")
  @ApiOperation({
    summary: "Download Excel template for variant bulk upload",
    description:
      "Sheets: **Variants** (data), **PackSizes** (lookup), **Instructions**. " +
      "Columns: id (optional), productId, packSizeId, sku, price, discountedPrice, " +
      "variantName, status, imagePath (`path1|path2`). " +
      "Leave **id** blank to create, or omit id and reuse an existing **sku** to upsert.",
  })
  @ApiProduces(XLSX_MIME)
  @ApiResponse({ status: 200, description: "`.xlsx` file download" })
  async downloadVariantTemplate(): Promise<StreamableFile> {
    const buf = await this.masterdataService.buildVariantTemplateBufferAsync();
    return new StreamableFile(buf, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="variant-import-template.xlsx"',
    });
  }

  @Get("variants/export")
  @ApiOperation({
    summary: "Export all variants to Excel",
    description:
      "Same columns as template/import. Edit and re-upload via `POST .../variants/import`.",
  })
  @ApiProduces(XLSX_MIME)
  @ApiResponse({ status: 200, description: "`.xlsx` file download" })
  async exportVariants(): Promise<StreamableFile> {
    const buf = await this.masterdataService.buildVariantExportBuffer();
    const date = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buf, {
      type: XLSX_MIME,
      disposition: `attachment; filename="variants-export-${date}.xlsx"`,
    });
  }

  @Post("variants/import")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_EXCEL_BYTES },
    }),
  )
  @ApiOperation({
    summary: "Bulk import variants from Excel (preferred path)",
    description:
      "Same behavior as `POST .../variants/upload`. Multipart field **`file`**.\n\n" +
      "**Upsert rules:**\n" +
      "1. If `id` exists → update that variant\n" +
      "2. Else if `sku` already exists → update that variant (SKU unique)\n" +
      "3. Else → create via same logic as `POST /admin/variants`\n\n" +
      "Required for create: `productId`, `packSizeId`, `sku`, `price`.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Excel workbook with Variants sheet",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      "Import finished — check `summary`, `created`, `updated`, `failed`",
  })
  async importVariants(@UploadedFile() file: Express.Multer.File) {
    const uploaded = assertExcelUpload(file);
    return this.masterdataService.importVariantsFromExcel(uploaded.buffer);
  }

  @Post("variants/upload")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_EXCEL_BYTES },
    }),
  )
  @ApiOperation({
    summary: "Alias of `POST .../variants/import` (kept for compatibility)",
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
  async uploadVariants(@UploadedFile() file: Express.Multer.File) {
    const uploaded = assertExcelUpload(file);
    return this.masterdataService.importVariantsFromExcel(uploaded.buffer);
  }
}
