import { Injectable, BadRequestException, HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../product/products/products.service";
import { VariantsService } from "../product/variants/variants.service";
import type {
  AdminCreateProductDto,
  AdminUpdateProductDto,
} from "./dto/admin.dto";
import {
  MASTERDATA_MAX_ROWS,
  MASTERDATA_PRODUCT_COLUMNS,
  MASTERDATA_SHEET_NAME,
  MASTERDATA_VARIANT_COLUMNS,
  MASTERDATA_VARIANT_SHEET_NAME,
  MASTERDATA_PACK_SIZES_SHEET_NAME,
  MASTERDATA_VARIANT_HELP_SHEET_NAME,
  isNonEmptyExcelRow,
  rowToProductImportPayload,
  rowToVariantImportPayload,
} from "./masterdata-excel.util";

export interface ProductImportRowResult {
  row: number;
  id: number;
  name: string;
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

export interface VariantImportRowResult {
  row: number;
  id: number;
  sku: string;
  productId: number;
}

export interface VariantImportFailure {
  row: number;
  sku?: string;
  reason: string;
}

export interface VariantImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  duplicateSkusInFile: number;
}

function createDtoToAdminUpdate(
  dto: AdminCreateProductDto,
): AdminUpdateProductDto {
  const u: AdminUpdateProductDto = {
    categoryId: dto.categoryId,
    name: dto.name,
  };
  if (dto.brandId !== undefined) u.brandId = dto.brandId;
  if (dto.description !== undefined) u.description = dto.description;
  if (dto.hsnCode !== undefined) u.hsnCode = dto.hsnCode;
  if (dto.taxPercent !== undefined) u.taxPercent = dto.taxPercent;
  if (dto.taxId !== undefined) u.taxId = dto.taxId;
  if (dto.actualPrice !== undefined) u.actualPrice = dto.actualPrice;
  if (dto.discountPrice !== undefined) u.discountPrice = dto.discountPrice;
  if (dto.productImage !== undefined) u.productImage = dto.productImage;
  return u;
}

function messageFromUnknown(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const meta = e.meta as { target?: string[] };
      const t = meta?.target ?? [];
      const joined = t.map(String).join(", ");
      const skuHit =
        t.some((x) => String(x).toLowerCase().includes("sku")) ||
        e.message.toLowerCase().includes("sku");
      if (skuHit) {
        return (
          "Duplicate SKU: a variant with this SKU already exists. " +
          "To update it, include its id from Export, or reuse the same SKU (upload upserts by SKU)."
        );
      }
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

function parseExcelRows(
  buffer: Buffer,
  preferredSheet?: string,
): Record<string, unknown>[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new BadRequestException("Could not read Excel file");
  }
  if (!workbook.SheetNames.length) {
    throw new BadRequestException("Workbook has no sheets");
  }
  const sheetName =
    preferredSheet && workbook.SheetNames.includes(preferredSheet)
      ? preferredSheet
      : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    blankrows: false,
  });
  const filtered = rows.filter(isNonEmptyExcelRow);
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
  return filtered;
}

@Injectable()
export class AdminMasterdataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly variantsService: VariantsService,
  ) {}

  /** Same columns as import; one example data row. `id` left blank for new products. */
  buildProductTemplateBuffer(): Buffer {
    const header = [...MASTERDATA_PRODUCT_COLUMNS];
    const example = [
      "",
      1,
      "Example Product",
      "",
      "Optional description",
      "",
      18,
      "",
      "",
      "",
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
        brandId: true,
        description: true,
        hsnCode: true,
        taxPercent: true,
        taxId: true,
        actualPrice: true,
        discountPrice: true,
        productImage: true,
      },
    });

    const rows = products.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      brandId: p.brandId ?? "",
      description: p.description ?? "",
      hsnCode: p.hsnCode ?? "",
      taxPercent: p.taxPercent !== null ? Number(p.taxPercent) : "",
      taxId: p.taxId ?? "",
      actualPrice: p.actualPrice !== null ? Number(p.actualPrice) : "",
      discountPrice: p.discountPrice !== null ? Number(p.discountPrice) : "",
      productImage: p.productImage ?? "",
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
    const filtered = parseExcelRows(buffer, MASTERDATA_SHEET_NAME);

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
          });
        } else {
          const product = await this.productsService.adminCreate(dto);
          created.push({
            row: excelRow,
            id: product.id,
            name: product.name,
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

  // ─── Variants bulk upload ──────────────────────────────────────────────────

  buildVariantTemplateBuffer(): Buffer {
    // Synced PackSizes are filled asynchronously via buildVariantTemplateBufferAsync.
    return this.buildVariantTemplateWorkbook([]);
  }

  /** Template with live PackSizes lookup sheet (preferred). */
  async buildVariantTemplateBufferAsync(): Promise<Buffer> {
    const packSizes = await this.prisma.packSize.findMany({
      orderBy: [{ unit: "asc" }, { size: "asc" }, { id: "asc" }],
      select: { id: true, size: true, unit: true, label: true },
    });
    return this.buildVariantTemplateWorkbook(packSizes);
  }

  private buildVariantTemplateWorkbook(
    packSizes: Array<{
      id: number;
      size: unknown;
      unit: string;
      label: string;
    }>,
  ): Buffer {
    const header = [...MASTERDATA_VARIANT_COLUMNS];
    const example = [
      "", // id blank = create / upsert by sku
      1, // productId
      packSizes[0]?.id ?? 1, // packSizeId
      "SKU-EXAMPLE-25G",
      99.0,
      89.0,
      "Example 25g",
      100,
      true,
      "", // imagePath — path1|path2
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, example]);

    const packHeader = ["id", "size", "unit", "label"];
    const packRows = packSizes.map((p) => [
      p.id,
      Number(p.size),
      p.unit,
      p.label,
    ]);
    const wsPack = XLSX.utils.aoa_to_sheet([packHeader, ...packRows]);

    const help = [
      ["Variant bulk upload — how to use"],
      [""],
      ["1. Fill the Variants sheet (one row per SKU)."],
      ["2. Leave id blank to create, or set id / reuse sku to update."],
      ["3. Required for create: productId, packSizeId, sku, price."],
      ["4. Use PackSizes sheet for valid packSizeId values."],
      ["5. imagePath: multiple paths separated by | (pipe)."],
      ["6. Re-upload the same file safely: SKU is unique — upserts by sku."],
      ["7. Max rows per file: " + String(MASTERDATA_MAX_ROWS)],
      [""],
      ["Upsert rules"],
      ["id exists → update that variant"],
      ["else sku exists → update that variant"],
      ["else → create (same as POST /admin/variants)"],
    ];
    const wsHelp = XLSX.utils.aoa_to_sheet(help);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, MASTERDATA_VARIANT_SHEET_NAME);
    XLSX.utils.book_append_sheet(wb, wsPack, MASTERDATA_PACK_SIZES_SHEET_NAME);
    XLSX.utils.book_append_sheet(
      wb,
      wsHelp,
      MASTERDATA_VARIANT_HELP_SHEET_NAME,
    );
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  async buildVariantExportBuffer(): Promise<Buffer> {
    const variants = await this.prisma.productVariant.findMany({
      orderBy: { id: "asc" },
      include: {
        images: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
      },
    });

    const header = [...MASTERDATA_VARIANT_COLUMNS];
    const dataRows = variants.map((v) => [
      v.id,
      v.productId,
      v.packSizeId,
      v.sku,
      Number(v.price),
      v.discountPrice !== null ? Number(v.discountPrice) : "",
      v.variantName ?? "",
      v.stockQuantity,
      v.status,
      v.images.map((img) => img.imageUrl).join("|"),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, MASTERDATA_VARIANT_SHEET_NAME);
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  /**
   * Variant-wise bulk upload (same domain rules as POST/PUT /admin/variants).
   * Upsert rules:
   * 1. If `id` exists → update that variant
   * 2. Else if `sku` exists → update that variant (SKU is unique)
   * 3. Else → create
   * In-file duplicate SKUs are rejected with clear row references.
   */
  async importVariantsFromExcel(buffer: Buffer): Promise<{
    summary: VariantImportSummary;
    created: VariantImportRowResult[];
    updated: VariantImportRowResult[];
    failed: VariantImportFailure[];
  }> {
    const filtered = parseExcelRows(buffer, MASTERDATA_VARIANT_SHEET_NAME);

    type ParsedRow = {
      excelRow: number;
      payload: ReturnType<typeof rowToVariantImportPayload>;
    };

    const parsed: ParsedRow[] = [];
    const failed: VariantImportFailure[] = [];
    const skuToRows = new Map<string, number[]>();

    // Phase 1 — parse + collect in-file SKU collisions
    for (let i = 0; i < filtered.length; i++) {
      const excelRow = i + 2;
      try {
        const payload = rowToVariantImportPayload(filtered[i]);
        const skuKey = payload.sku.trim().toLowerCase();
        const rows = skuToRows.get(skuKey) ?? [];
        rows.push(excelRow);
        skuToRows.set(skuKey, rows);
        parsed.push({ excelRow, payload });
      } catch (e) {
        failed.push({ row: excelRow, reason: messageFromUnknown(e) });
      }
    }

    const duplicateSkuKeys = new Set(
      [...skuToRows.entries()]
        .filter(([, rows]) => rows.length > 1)
        .map(([sku]) => sku),
    );

    let duplicateSkusInFile = 0;
    const eligible: ParsedRow[] = [];
    for (const row of parsed) {
      const skuKey = row.payload.sku.trim().toLowerCase();
      if (duplicateSkuKeys.has(skuKey)) {
        duplicateSkusInFile += 1;
        const allRows = skuToRows.get(skuKey) ?? [];
        failed.push({
          row: row.excelRow,
          sku: row.payload.sku,
          reason: `Duplicate SKU "${row.payload.sku}" in file (rows ${allRows.join(", ")}) — keep a single row per SKU`,
        });
        continue;
      }
      eligible.push(row);
    }

    // Phase 2 — preload FK / uniqueness lookups (avoid N+1)
    const productIds = [
      ...new Set(eligible.map((r) => r.payload.createDto.productId)),
    ];
    const packSizeIds = [
      ...new Set(eligible.map((r) => r.payload.createDto.packSizeId)),
    ];
    const variantIds = [
      ...new Set(
        eligible
          .map((r) => r.payload.variantId)
          .filter((id): id is number => id != null),
      ),
    ];
    const skus = [...new Set(eligible.map((r) => r.payload.sku))];

    type VariantLookup = { id: number; sku: string; productId: number };

    const [products, packSizes, variantsById, variantsBySku] =
      await Promise.all([
        this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true },
        }),
        this.prisma.packSize.findMany({
          where: { id: { in: packSizeIds } },
          select: { id: true },
        }),
        variantIds.length
          ? this.prisma.productVariant.findMany({
              where: { id: { in: variantIds } },
              select: { id: true, sku: true, productId: true },
            })
          : Promise.resolve([] as VariantLookup[]),
        skus.length
          ? this.prisma.productVariant.findMany({
              where: { sku: { in: skus } },
              select: { id: true, sku: true, productId: true },
            })
          : Promise.resolve([] as VariantLookup[]),
      ]);

    const productIdSet = new Set(products.map((p) => p.id));
    const packSizeIdSet = new Set(packSizes.map((p) => p.id));
    const byId = new Map<number, VariantLookup>();
    for (const v of variantsById) byId.set(v.id, v);
    const bySku = new Map<string, VariantLookup>();
    for (const v of variantsBySku) bySku.set(v.sku.trim().toLowerCase(), v);

    const created: VariantImportRowResult[] = [];
    const updated: VariantImportRowResult[] = [];

    // Phase 3 — create / update via domain service (same rules as single-variant API)
    for (const { excelRow, payload } of eligible) {
      const { variantId, sku, createDto, updateDto } = payload;
      try {
        if (!productIdSet.has(createDto.productId)) {
          failed.push({
            row: excelRow,
            sku,
            reason: `Product #${createDto.productId} not found`,
          });
          continue;
        }
        if (!packSizeIdSet.has(createDto.packSizeId)) {
          failed.push({
            row: excelRow,
            sku,
            reason: `PackSize #${createDto.packSizeId} not found — download template PackSizes sheet or GET /variants`,
          });
          continue;
        }

        let targetId: number | undefined;
        let existingLookup: VariantLookup | undefined;
        if (variantId != null) {
          existingLookup = byId.get(variantId);
          if (!existingLookup) {
            failed.push({
              row: excelRow,
              sku,
              reason: `Variant id ${variantId} not found — remove id or use an id from Export`,
            });
            continue;
          }
          const skuOwner = bySku.get(sku.trim().toLowerCase());
          if (skuOwner && skuOwner.id !== existingLookup.id) {
            failed.push({
              row: excelRow,
              sku,
              reason: `SKU "${sku}" already belongs to variant #${skuOwner.id}`,
            });
            continue;
          }
          targetId = existingLookup.id;
        } else {
          existingLookup = bySku.get(sku.trim().toLowerCase());
          if (existingLookup) targetId = existingLookup.id;
        }

        if (
          existingLookup &&
          existingLookup.productId !== createDto.productId
        ) {
          failed.push({
            row: excelRow,
            sku,
            reason: `SKU/id is owned by product #${existingLookup.productId}, but row has productId ${createDto.productId} — fix productId or use a new SKU`,
          });
          continue;
        }

        if (targetId != null) {
          const result = await this.variantsService.update(targetId, updateDto);
          const id = Number(result.id);
          const resultSku = String(result.sku);
          const productId = Number(result.productId ?? createDto.productId);
          updated.push({
            row: excelRow,
            id,
            sku: resultSku,
            productId,
          });
          byId.set(id, { id, sku: resultSku, productId });
          bySku.set(resultSku.trim().toLowerCase(), {
            id,
            sku: resultSku,
            productId,
          });
        } else {
          const result = await this.variantsService.create(createDto);
          const id = Number(result.id);
          const resultSku = String(result.sku);
          const productId = Number(result.productId ?? createDto.productId);
          created.push({
            row: excelRow,
            id,
            sku: resultSku,
            productId,
          });
          byId.set(id, { id, sku: resultSku, productId });
          bySku.set(resultSku.trim().toLowerCase(), {
            id,
            sku: resultSku,
            productId,
          });
        }
      } catch (e) {
        failed.push({
          row: excelRow,
          sku,
          reason: messageFromUnknown(e),
        });
      }
    }

    return {
      summary: {
        totalRows: filtered.length,
        created: created.length,
        updated: updated.length,
        failed: failed.length,
        duplicateSkusInFile,
      },
      created,
      updated,
      failed,
    };
  }
}
