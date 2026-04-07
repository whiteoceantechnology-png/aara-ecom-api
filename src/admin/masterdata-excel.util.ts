import type { AdminCreateProductDto } from "./dto/admin.dto";

/** Max data rows processed per upload (excluding header row). */
export const MASTERDATA_MAX_ROWS = 2000;

/** First sheet name in template / export workbooks. */
export const MASTERDATA_SHEET_NAME = "Products";

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
