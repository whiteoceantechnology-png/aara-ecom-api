import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  StreamableFile,
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
import { AdminMasterdataService } from "./admin-masterdata.service";

const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

@ApiBearerAuth()
@ApiTags("Admin — Master data")
@Controller("admin/masterdata")
export class AdminMasterdataController {
  constructor(private readonly masterdataService: AdminMasterdataService) {}

  @Get("products/template")
  @ApiOperation({
    summary: "Download Excel template for product import",
    description:
      "Same columns as `POST .../products/import` and as **Export**. Row 1 = headers; row 2 = example. " +
      "Leave **id** blank for new products. Use **Export** to pull current DB rows, edit, then re-import.",
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
      "Same columns as **Template** / **Import** (`id`, `categoryId`, `name`, …). " +
      "Use to review data or copy rows; re-importing existing id will update that product.",
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
      "Required columns: **categoryId** (or category_id), **name**. " +
      "Optional: brandId, description, hsnCode, taxPercent, taxId. " +
      "Each row is created via the same logic as `POST /admin/products`. Requires a valid Bearer token.",
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
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        "No file uploaded — use form field name `file`",
      );
    }
    const name = file.originalname?.toLowerCase() ?? "";
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      throw new BadRequestException(
        "File must be an Excel workbook (.xlsx or .xls)",
      );
    }
    return this.masterdataService.importProductsFromExcel(file.buffer);
  }
}
