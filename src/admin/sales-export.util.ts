import { normalizeStateKey } from "../product/checkout/courier-shipping.util";
import { extractInclusiveTax } from "../product/checkout/checkout-pricing.util";

/** Column headers matching the GST sales upload template (row 1). */
export const SALES_EXPORT_COLUMNS = [
  "Order ID *",
  "Invoice Number *",
  "Invoice Date *",
  "Document Type *",
  "Status *",
  "Original Invoice No",
  "Customer Name *",
  "Customer GSTIN",
  "Customer Phone",
  "Customer Email",
  "Billing State *",
  "Shipping Address",
  "Shipping State",
  "Shipping Pincode",
  "Line Type *",
  "Category *",
  "Product Name *",
  "SKU",
  "Variant / Pack Size *",
  "Packs Ordered *",
  "HSN / SAC *",
  "Item Description",
  "Unit (UQC) *",
  "Quantity (In UQC unit) *",
  "Taxable Value *",
  "GST Rate % *",
  "Supply Type *",
  "CGST",
  "SGST",
  "IGST",
  "Line Total *",
  "Invoice Total (Rounded) *",
  "Payment Mode",
  "Payment Reference",
] as const;

export type SalesExportRow = Record<
  (typeof SALES_EXPORT_COLUMNS)[number],
  string | number
>;

export type SalesExportSource = {
  orderNumber: string;
  orderCreatedAt: Date;
  orderStatus: string;
  orderTotalAmount: number;
  customerName: string;
  customerGstIn: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  billingState: string | null;
  shippingAddressLine: string | null;
  shippingState: string | null;
  shippingPincode: string | null;
  storeState: string | null;
  categoryName: string | null;
  productName: string;
  sku: string | null;
  sizeLabel: string;
  packsOrdered: number;
  hsnCode: string | null;
  itemDescription: string | null;
  stockUnit: string | null;
  packUnit: string | null;
  unitsConsumed: number;
  /** GST-inclusive line amount */
  lineInclusive: number;
  taxPercent: number | null;
  taxAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
};

function empty(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

/** Format date as DD-MM-YYYY (Asia/Kolkata calendar day via local components). */
export function formatInvoiceDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function mapOrderStatus(status: string): string {
  const s = (status || "").toUpperCase();
  if (s === "CANCELLED" || s === "CANCELED") return "Cancelled";
  return "Active";
}

export function mapPaymentMode(method: string | null | undefined): string {
  if (!method) return "";
  const m = method.toUpperCase();
  if (m === "COD") return "COD";
  if (m === "ONLINE" || m === "PREPAID" || m === "RAZORPAY") return "Prepaid";
  return method;
}

/** Map stock/pack unit strings to GST UQC codes. */
export function toUqc(unit: string | null | undefined): string {
  if (!unit) return "";
  const u = unit.trim().toLowerCase();
  if (["g", "gm", "gms", "gram", "grams"].includes(u)) return "GMS";
  if (["kg", "kgs", "kilogram", "kilograms"].includes(u)) return "KGS";
  if (
    ["ml", "millilitre", "milliliter", "millilitres", "milliliters"].includes(u)
  )
    return "MLT";
  if (["l", "lt", "ltr", "litre", "liter", "litres", "liters"].includes(u))
    return "LTR";
  if (
    [
      "pcs",
      "pc",
      "nos",
      "no",
      "unit",
      "units",
      "pack",
      "packs",
      "each",
    ].includes(u)
  ) {
    return "NOS";
  }
  return unit.toUpperCase();
}

/**
 * Quantity in UQC units.
 * Mass/volume pools use unitsConsumed; piece pools use pack count.
 * When stock is in grams/ml we report KG/LTR with qty / 1000 (template sample: 100g → 0.1).
 */
export function quantityInUqc(opts: {
  unitsConsumed: number;
  packsOrdered: number;
  stockUnit: string | null;
  packUnit: string | null;
}): { uqc: string; quantity: number | "" } {
  const unit = opts.stockUnit || opts.packUnit || "";
  const u = unit.trim().toLowerCase();
  const consumed = Number(opts.unitsConsumed) || 0;

  if (["g", "gm", "gms", "gram", "grams"].includes(u)) {
    return {
      uqc: "KGS",
      quantity: Math.round((consumed / 1000) * 1000) / 1000,
    };
  }
  if (["kg", "kgs", "kilogram", "kilograms"].includes(u)) {
    return { uqc: "KGS", quantity: Math.round(consumed * 1000) / 1000 };
  }
  if (
    ["ml", "millilitre", "milliliter", "millilitres", "milliliters"].includes(u)
  ) {
    return {
      uqc: "LTR",
      quantity: Math.round((consumed / 1000) * 1000) / 1000,
    };
  }
  if (["l", "lt", "ltr", "litre", "liter", "litres", "liters"].includes(u)) {
    return { uqc: "LTR", quantity: Math.round(consumed * 1000) / 1000 };
  }

  const uqc = toUqc(unit);
  if (!uqc) return { uqc: "", quantity: "" };
  return {
    uqc,
    quantity: Number(opts.packsOrdered) || consumed || "",
  };
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Seller's registered state; used as the home-state fallback when StoreProfile.state isn't configured. */
const DEFAULT_SELLER_STATE = "Tamil Nadu";

function splitGst(opts: {
  taxAmount: number;
  billingState: string | null;
  storeState: string | null;
}): { cgst: number; sgst: number; igst: number } {
  const tax = money(Math.max(0, opts.taxAmount));
  if (tax <= 0) return { cgst: 0, sgst: 0, igst: 0 };

  const bill = normalizeStateKey(opts.billingState);
  const store = normalizeStateKey(opts.storeState || DEFAULT_SELLER_STATE);
  const intra = bill.length > 0 && bill === store;

  if (intra) {
    const half = money(tax / 2);
    return { cgst: half, sgst: money(tax - half), igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: tax };
}

export function mapSaleToExportRow(src: SalesExportSource): SalesExportRow {
  const inclusive = Number(src.lineInclusive) || 0;
  const rate =
    src.taxPercent != null && Number.isFinite(Number(src.taxPercent))
      ? Number(src.taxPercent)
      : 0;
  const tax =
    src.taxAmount != null && Number.isFinite(Number(src.taxAmount))
      ? Number(src.taxAmount)
      : extractInclusiveTax(inclusive, rate);
  const taxable = money(Math.max(0, inclusive - tax));
  const { cgst, sgst, igst } = splitGst({
    taxAmount: tax,
    billingState: src.billingState || src.shippingState,
    storeState: src.storeState,
  });
  const { uqc, quantity } = quantityInUqc({
    unitsConsumed: src.unitsConsumed,
    packsOrdered: src.packsOrdered,
    stockUnit: src.stockUnit,
    packUnit: src.packUnit,
  });

  const billingState = empty(src.billingState) || empty(src.shippingState);
  const supplyType =
    rate > 0 ? "Taxable" : empty(src.hsnCode) ? "" : "Nil Rated";

  return {
    "Order ID *": empty(src.orderNumber),
    "Invoice Number *": empty(src.orderNumber),
    "Invoice Date *": formatInvoiceDate(src.orderCreatedAt),
    "Document Type *": "Invoice",
    "Status *": mapOrderStatus(src.orderStatus),
    "Original Invoice No": "",
    "Customer Name *": empty(src.customerName),
    "Customer GSTIN": empty(src.customerGstIn),
    "Customer Phone": empty(src.customerPhone),
    "Customer Email": empty(src.customerEmail),
    "Billing State *": billingState,
    "Shipping Address": empty(src.shippingAddressLine),
    "Shipping State": empty(src.shippingState),
    "Shipping Pincode": empty(src.shippingPincode),
    "Line Type *": "Product",
    "Category *": empty(src.categoryName),
    "Product Name *": empty(src.productName),
    SKU: empty(src.sku),
    "Variant / Pack Size *": empty(src.sizeLabel),
    "Packs Ordered *": src.packsOrdered || "",
    "HSN / SAC *": empty(src.hsnCode),
    "Item Description": empty(src.itemDescription),
    "Unit (UQC) *": uqc,
    "Quantity (In UQC unit) *": quantity,
    "Taxable Value *": taxable || "",
    "GST Rate % *": rate || "",
    "Supply Type *": supplyType,
    CGST: cgst || "",
    SGST: sgst || "",
    IGST: igst || "",
    "Line Total *": money(inclusive) || "",
    "Invoice Total (Rounded) *":
      Math.round(Number(src.orderTotalAmount) || 0) || "",
    "Payment Mode": mapPaymentMode(src.paymentMethod),
    "Payment Reference": empty(src.paymentReference),
  };
}

export function parseMonthRange(month: string): { from: Date; to: Date } {
  const m = month.trim();
  if (!/^\d{4}-\d{2}$/.test(m)) {
    throw new Error("month must be YYYY-MM");
  }
  const [yStr, moStr] = m.split("-");
  const y = Number(yStr);
  const mo = Number(moStr);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) {
    throw new Error("month must be YYYY-MM");
  }
  const from = new Date(y, mo - 1, 1, 0, 0, 0, 0);
  const to = new Date(y, mo, 1, 0, 0, 0, 0); // exclusive end
  return { from, to };
}

export function addressFields(
  snapshot: unknown,
  shipping: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null,
): {
  state: string | null;
  pincode: string | null;
  line: string | null;
} {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const s = snapshot as Record<string, unknown>;
    const state =
      typeof s.state === "string"
        ? s.state
        : typeof s.State === "string"
          ? s.State
          : null;
    const pincodeRaw = s.postalCode ?? s.pincode ?? s.zip ?? s.Zip;
    const pincode =
      typeof pincodeRaw === "string" || typeof pincodeRaw === "number"
        ? String(pincodeRaw)
        : null;
    const line1 = s.addressLine1 ?? s.line1 ?? s.address1;
    const line2 = s.addressLine2 ?? s.line2 ?? s.address2;
    const city = s.city ?? s.City;
    const line = joinAddressLine(line1, line2, city);
    return {
      state: state || shipping?.state || null,
      pincode: pincode || shipping?.postalCode || null,
      line:
        line ||
        joinAddressLine(
          shipping?.addressLine1,
          shipping?.addressLine2,
          shipping?.city,
        ),
    };
  }
  return {
    state: shipping?.state ?? null,
    pincode: shipping?.postalCode ?? null,
    line: joinAddressLine(
      shipping?.addressLine1,
      shipping?.addressLine2,
      shipping?.city,
    ),
  };
}

function joinAddressLine(...parts: unknown[]): string | null {
  const strs = parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  return strs.length > 0 ? strs.join(", ") : null;
}
