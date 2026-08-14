import { BadRequestException } from "@nestjs/common";
import type { AdminCreateProductDto } from "./dto/admin.dto";
import type {
  CreateVariantDto,
  UpdateVariantDto,
} from "../product/dto/variant.dto";

/** Max data rows processed per upload (excluding header row). */
export const MASTERDATA_MAX_ROWS = 2000;

/** First sheet name in product template / export workbooks. */
export const MASTERDATA_SHEET_NAME = "Products";

/** Sheet name for variant template / export / upload workbooks. */
export const MASTERDATA_VARIANT_SHEET_NAME = "Variants";

/** Lookup sheet embedded in the variant template workbook. */
export const MASTERDATA_PACK_SIZES_SHEET_NAME = "PackSizes";

/** Instructions sheet in the variant template workbook. */
export const MASTERDATA_VARIANT_HELP_SHEET_NAME = "Instructions";

/**
 * Column order for template + export (matches import). `id` is optional:
 * if set to an existing product id, the row **updates** that product; otherwise a new row is **created**.
 */
export const MASTERDATA_PRODUCT_COLUMNS = [
  "id",
  "categoryId",
  "name",
  "brandId",
  "description",
  "hsnCode",
  "taxPercent",
  "taxId",
  "actualPrice",
  "discountPrice",
  "productImage",
] as const;

/**
 * Variant bulk-upload columns.
 * - `id` optional → update that variant when present
 * - else match by unique `sku` → update if found, otherwise create
 * - `productId` + `packSizeId` + `sku` + `price` required for create
 */
export const MASTERDATA_VARIANT_COLUMNS = [
  "id",
  "productId",
  "packSizeId",
  "sku",
  "price",
  "discountedPrice",
  "variantName",
  "stockQuantity",
  "status",
  "imagePath",
] as const;

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Flatten Excel column names to canonical keys (e.g. `Category ID` → `category_id`). */
export function normalizeExcelRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeKey(k)] = v;
  }
  return out;
}

/** Safe string for Excel cell values (avoids `[object Object]`). */
function excelCellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return `${v}`;
  if (v instanceof Date) return v.toISOString();
  return "";
}

function getFirstDefined(r: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const v = r[key];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    return v;
  }
  return undefined;
}

function parseRequiredInt(v: unknown, field: string): number {
  if (v === undefined || v === null || v === "") {
    throw new Error(`${field} is required`);
  }
  const n =
    typeof v === "number"
      ? Math.trunc(v)
      : parseInt(excelCellToString(v).trim(), 10);
  if (!Number.isFinite(n)) {
    throw new Error(`${field} must be a valid integer`);
  }
  return n;
}

function parseOptionalInt(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n =
    typeof v === "number"
      ? Math.trunc(v)
      : parseInt(excelCellToString(v).trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseRequiredNumber(v: unknown, field: string): number {
  if (v === undefined || v === null || v === "") {
    throw new Error(`${field} is required`);
  }
  const n = typeof v === "number" ? v : Number(excelCellToString(v).trim());
  if (!Number.isFinite(n)) {
    throw new Error(`${field} must be a valid number`);
  }
  return n;
}

function parseOptionalNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(excelCellToString(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function optionalString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = excelCellToString(v).trim();
  return s === "" ? undefined : s;
}

function parseOptionalBoolean(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  const s = excelCellToString(v).trim().toLowerCase();
  if (["true", "1", "yes", "y", "active"].includes(s)) return true;
  if (["false", "0", "no", "n", "inactive"].includes(s)) return false;
  throw new Error(`status must be true/false (got "${excelCellToString(v)}")`);
}

/** Split image paths from Excel: `|` preferred, also supports `,`. */
function parseImagePaths(v: unknown): string[] | undefined {
  const raw = optionalString(v);
  if (!raw) return undefined;
  const parts = raw
    .split(/[|,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/**
 * Maps one sheet row to {@link AdminCreateProductDto}.
 * Headers (case/spacing flexible): categoryId / category_id; name;
 * optional: brandId, description, hsnCode, taxPercent, taxId.
 */
export function rowToAdminCreateProductDto(
  raw: Record<string, unknown>,
): AdminCreateProductDto {
  const r = normalizeExcelRow(raw);

  const categoryId = parseRequiredInt(
    getFirstDefined(r, ["category_id", "categoryid"]),
    "categoryId",
  );

  const name = optionalString(getFirstDefined(r, ["name", "product_name"]));
  if (!name) throw new Error("name is required");

  const dto: AdminCreateProductDto = {
    categoryId,
    name,
  };

  const brandRaw = getFirstDefined(r, ["brand_id", "brandid"]);
  const brandId = parseOptionalInt(brandRaw);
  if (brandId !== undefined) dto.brandId = brandId;

  const description = optionalString(
    getFirstDefined(r, ["description", "desc"]),
  );
  if (description !== undefined) dto.description = description;

  const hsnCode = optionalString(
    getFirstDefined(r, ["hsn_code", "hsncode", "hsn"]),
  );
  if (hsnCode !== undefined) dto.hsnCode = hsnCode;

  const taxPercent = parseOptionalNumber(
    getFirstDefined(r, ["tax_percent", "taxpercent"]),
  );
  if (taxPercent !== undefined) dto.taxPercent = taxPercent;

  const taxId = parseOptionalInt(getFirstDefined(r, ["tax_id", "taxid"]));
  if (taxId !== undefined) dto.taxId = taxId;

  const actualPrice = parseOptionalNumber(
    getFirstDefined(r, ["actual_price", "actualprice"]),
  );
  if (actualPrice !== undefined) dto.actualPrice = actualPrice;

  const discountPrice = parseOptionalNumber(
    getFirstDefined(r, ["discount_price", "discountprice"]),
  );
  if (discountPrice !== undefined) dto.discountPrice = discountPrice;

  const productImage = optionalString(
    getFirstDefined(r, ["product_image", "productimage", "image"]),
  );
  if (productImage !== undefined) dto.productImage = productImage;

  return dto;
}

/**
 * Same fields as {@link rowToAdminCreateProductDto}, plus optional `id` / `product_id`
 * from the sheet. When `productId` is set, import should update that row instead of creating.
 */
export function rowToProductImportPayload(raw: Record<string, unknown>): {
  productId?: number;
  dto: AdminCreateProductDto;
} {
  const dto = rowToAdminCreateProductDto(raw);
  const r = normalizeExcelRow(raw);
  const idRaw = getFirstDefined(r, ["id", "product_id", "productid"]);
  let productId: number | undefined;
  if (idRaw !== undefined && idRaw !== null && idRaw !== "") {
    const n = parseOptionalInt(idRaw);
    if (n !== undefined && n >= 1) productId = n;
  }
  return { productId, dto };
}

export type VariantImportPayload = {
  /** Existing variant id — when set and found, row updates that variant. */
  variantId?: number;
  /** Normalized unique SKU (always required). */
  sku: string;
  createDto: CreateVariantDto;
  updateDto: UpdateVariantDto;
};

/**
 * Maps one Excel row to create/update DTOs for variant bulk upload.
 * Required for create: productId, packSizeId, sku, price.
 */
export function rowToVariantImportPayload(
  raw: Record<string, unknown>,
): VariantImportPayload {
  const r = normalizeExcelRow(raw);

  const sku = optionalString(getFirstDefined(r, ["sku", "variant_sku"]));
  if (!sku) throw new Error("sku is required");

  const idRaw = getFirstDefined(r, ["id", "variant_id", "variantid"]);
  let variantId: number | undefined;
  if (idRaw !== undefined && idRaw !== null && idRaw !== "") {
    const n = parseOptionalInt(idRaw);
    if (n !== undefined && n >= 1) variantId = n;
  }

  const productId = parseRequiredInt(
    getFirstDefined(r, ["product_id", "productid"]),
    "productId",
  );
  const packSizeId = parseRequiredInt(
    getFirstDefined(r, ["pack_size_id", "packsizeid", "pack_size"]),
    "packSizeId",
  );
  const price = parseRequiredNumber(
    getFirstDefined(r, ["price", "variant_price"]),
    "price",
  );

  const discountedPrice = parseOptionalNumber(
    getFirstDefined(r, [
      "discounted_price",
      "discountedprice",
      "discount_price",
      "discountprice",
    ]),
  );
  const variantName = optionalString(
    getFirstDefined(r, ["variant_name", "variantname", "name"]),
  );
  const stockQuantity = parseOptionalInt(
    getFirstDefined(r, ["stock_quantity", "stockquantity", "stock"]),
  );
  const status = parseOptionalBoolean(
    getFirstDefined(r, ["status", "is_active", "active"]),
  );
  const imagePath = parseImagePaths(
    getFirstDefined(r, ["image_path", "imagepath", "images", "image"]),
  );

  const createDto: CreateVariantDto = {
    productId,
    packSizeId,
    sku,
    price,
  };
  if (discountedPrice !== undefined) {
    createDto.discountedPrice = discountedPrice;
  }
  if (variantName !== undefined) createDto.variantName = variantName;
  if (stockQuantity !== undefined) createDto.stockQuantity = stockQuantity;
  if (status !== undefined) createDto.status = status;
  if (imagePath !== undefined) createDto.imagePath = imagePath;

  const updateDto: UpdateVariantDto = {
    packSizeId,
    sku,
    price,
  };
  if (discountedPrice !== undefined) {
    updateDto.discountedPrice = discountedPrice;
  }
  if (variantName !== undefined) updateDto.variantName = variantName;
  if (stockQuantity !== undefined) updateDto.stockQuantity = stockQuantity;
  if (status !== undefined) updateDto.status = status;
  if (imagePath !== undefined) updateDto.imagePath = imagePath;

  return { variantId, sku, createDto, updateDto };
}

/** True if the Excel row has any non-empty cell. */
export function isNonEmptyExcelRow(row: Record<string, unknown>): boolean {
  return Object.values(row).some((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    return true;
  });
}

/** Validate multipart Excel upload (field name `file`). */
export function assertExcelUpload(
  file?: Express.Multer.File,
): Express.Multer.File {
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
  return file;
}
