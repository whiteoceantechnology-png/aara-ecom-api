import { Injectable, BadRequestException, HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../product/products/products.service";
import type {
  AdminCreateProductDto,
  AdminUpdateProductDto,
} from "./dto/admin.dto";
import {
  MASTERDATA_MAX_ROWS,
  MASTERDATA_PRODUCT_COLUMNS,
  MASTERDATA_SHEET_NAME,
  rowToProductImportPayload,
} from "./masterdata-excel.util";

export interface ProductImportRowResult {
  row: number;
  id: number;
  name: string;
  slug: string;
}

export interface ProductImportFailure {
  row: number;
  reason: string;
}

export interface ProductImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
}

function createDtoToAdminUpdate(
  dto: AdminCreateProductDto,
): AdminUpdateProductDto {
  const u: AdminUpdateProductDto = {
    categoryId: dto.categoryId,
    name: dto.name,
    slug: dto.slug,
  };
  if (dto.brandId !== undefined) u.brandId = dto.brandId;
  if (dto.description !== undefined) u.description = dto.description;
  if (dto.hsnCode !== undefined) u.hsnCode = dto.hsnCode;
  if (dto.taxPercent !== undefined) u.taxPercent = dto.taxPercent;
  if (dto.taxId !== undefined) u.taxId = dto.taxId;
  return u;
}

function messageFromUnknown(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const meta = e.meta as { target?: string[] };
      const t = meta?.target ?? [];
      const joined = t.map(String).join(", ");
      const slugHit =
        t.some((x) => String(x).toLowerCase().includes("slug")) ||
        e.message.toLowerCase().includes("slug");
      if (slugHit) {
        return (
          "Duplicate slug: a product with this slug already exists. " +
          "To update it, export products (the file includes id) and re-import with that id, or use a different slug for a new product."
        );
      }
      return `Duplicate value (${joined || "unique constraint"})`;
    }
  }
  if (e instanceof HttpException) {
    const r = e.getResponse();
    if (typeof r === "string") return r;
    if (typeof r === "object" && r !== null && "message" in r) {
      const m = (r as { message: unknown }).message;
      if (Array.isArray(m)) return m.join("; ");
      if (typeof m === "string") return m;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

@Injectable()
export class AdminMasterdataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  /** Same columns as import; one example data row. `id` left blank for new products. */
  buildProductTemplateBuffer(): Buffer {
    const header = [...MASTERDATA_PRODUCT_COLUMNS];
    const example = [
      "",
      1,
      "Example Product",
      "example-product",
      "",
      "Optional description",
      "",
      18,
      "",
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, MASTERDATA_SHEET_NAME);
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  /** All products with the same columns as the import template (for round-trip testing). */
  async buildProductExportBuffer(): Promise<Buffer> {
    const products = await this.prisma.product.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        brandId: true,
        description: true,
        hsnCode: true,
        taxPercent: true,
        taxId: true,
      },
    });

    const rows = products.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      slug: p.slug,
      brandId: p.brandId ?? "",
      description: p.description ?? "",
      hsnCode: p.hsnCode ?? "",
      taxPercent: Number(p.taxPercent),
      taxId: p.taxId ?? "",
    }));

    const wb = XLSX.utils.book_new();
    if (rows.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([[...MASTERDATA_PRODUCT_COLUMNS]]);
      XLSX.utils.book_append_sheet(wb, ws, MASTERDATA_SHEET_NAME);
    } else {
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, MASTERDATA_SHEET_NAME);
    }
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  /**
   * Parses the first worksheet: row 1 = headers, from row 2 = data.
   * Rows with an **id** that exists in the DB are updated; otherwise created.
   */
  async importProductsFromExcel(buffer: Buffer): Promise<{
    summary: ProductImportSummary;
    created: ProductImportRowResult[];
    updated: ProductImportRowResult[];
    failed: ProductImportFailure[];
  }> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    } catch {
      throw new BadRequestException("Could not read Excel file");
    }
    if (!workbook.SheetNames.length) {
      throw new BadRequestException("Workbook has no sheets");
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      blankrows: false,
    });

    const filtered = rows.filter((row) =>
      Object.values(row).some((v) => {
        if (v === null || v === undefined) return false;
        if (typeof v === "string") return v.trim() !== "";
        return true;
      }),
    );

    if (filtered.length === 0) {
      throw new BadRequestException(
        "No data rows found — add at least one row below the header",
      );
    }

    if (filtered.length > MASTERDATA_MAX_ROWS) {
      throw new BadRequestException(
        `Too many rows (max ${MASTERDATA_MAX_ROWS} data rows per upload)`,
      );
    }

    const created: ProductImportRowResult[] = [];
    const updated: ProductImportRowResult[] = [];
    const failed: ProductImportFailure[] = [];

    for (let i = 0; i < filtered.length; i++) {
      const excelRow = i + 2;
      try {
        const { productId, dto } = rowToProductImportPayload(filtered[i]);

        if (productId !== undefined) {
          const existing = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { id: true },
          });
          if (!existing) {
            failed.push({
              row: excelRow,
              reason: `Product id ${productId} not found — remove id or use an id from Export.`,
            });
            continue;
          }
          const product = await this.productsService.adminUpdate(
            productId,
            createDtoToAdminUpdate(dto),
          );
          updated.push({
            row: excelRow,
            id: product.id,
            name: product.name,
            slug: product.slug,
          });
        } else {
          const product = await this.productsService.adminCreate(dto);
          created.push({
            row: excelRow,
            id: product.id,
            name: product.name,
            slug: product.slug,
          });
        }
      } catch (e) {
        failed.push({ row: excelRow, reason: messageFromUnknown(e) });
      }
    }

    return {
      summary: {
        totalRows: filtered.length,
        created: created.length,
        updated: updated.length,
        failed: failed.length,
      },
      created,
      updated,
      failed,
    };
  }
}
