/**
 * Printable HTML for invoice / packing slip (browser print → PDF).
 * Avoids a heavy PDF binary dependency while remaining ops-friendly.
 */

type DocMoney = string | number | { toString(): string };

export type OrderDocumentInput = {
  storeName: string;
  storeLines: string[];
  orderNumber: string;
  createdAt: Date | string;
  status: string;
  paymentStatus: string;
  trackingId?: string | null;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  shipTo?: {
    name?: string;
    lines: string[];
  };
  items: Array<{
    productName: string;
    sizeLabel?: string | null;
    quantity: number;
    price?: DocMoney;
    subtotal?: DocMoney;
  }>;
  totals?: {
    subtotal?: DocMoney;
    tax?: DocMoney;
    shipping?: DocMoney;
    discount?: DocMoney;
    total: DocMoney;
  };
};

function esc(v: unknown): string {
  const s =
    typeof v === "string"
      ? v
      : typeof v === "number" || typeof v === "boolean"
        ? String(v)
        : "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(v: DocMoney | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : esc(v);
}

function baseStyles(): string {
  return `
    body{font-family:Georgia,serif;color:#1a1a1a;margin:24px;font-size:14px}
    h1{font-size:22px;margin:0 0 4px}
    .muted{color:#666;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
    th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#444}
    .right{text-align:right}
    .totals td{border:0;padding:4px 8px}
    .totals .grand{font-weight:700;font-size:16px}
    .box{border:1px solid #ddd;padding:12px;margin-top:12px}
    @media print{body{margin:0} .noprint{display:none}}
  `;
}

export function renderInvoiceHtml(input: OrderDocumentInput): string {
  const rows = input.items
    .map(
      (i) => `<tr>
      <td>${esc(i.productName)}${i.sizeLabel ? ` <span class="muted">(${esc(i.sizeLabel)})</span>` : ""}</td>
      <td class="right">${esc(i.quantity)}</td>
      <td class="right">${money(i.price)}</td>
      <td class="right">${money(i.subtotal)}</td>
    </tr>`,
    )
    .join("");

  const ship = input.shipTo
    ? `<div class="box"><strong>Ship to</strong><br/>${esc(input.shipTo.name ?? input.customer.name)}<br/>${input.shipTo.lines.map(esc).join("<br/>")}</div>`
    : "";

  const t = input.totals;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${esc(input.orderNumber)}</title>
<style>${baseStyles()}</style></head><body>
  <p class="noprint muted">Use Print → Save as PDF for a PDF copy.</p>
  <h1>${esc(input.storeName)}</h1>
  <div class="muted">${input.storeLines.map(esc).join("<br/>")}</div>
  <h2 style="margin-top:24px">Tax Invoice</h2>
  <div><strong>Order:</strong> ${esc(input.orderNumber)}</div>
  <div class="muted">Date: ${esc(new Date(input.createdAt).toISOString())} · Status: ${esc(input.status)} · Payment: ${esc(input.paymentStatus)}</div>
  <div class="box"><strong>Bill to</strong><br/>${esc(input.customer.name)}<br/>${esc(input.customer.email ?? "")}<br/>${esc(input.customer.phone ?? "")}</div>
  ${ship}
  <table><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  ${
    t
      ? `<table class="totals" style="width:280px;margin-left:auto">
    <tr><td>Tax</td><td class="right">${money(t.tax)}</td></tr>
    <tr><td>Shipping</td><td class="right">${money(t.shipping)}</td></tr>
    <tr><td>Discount</td><td class="right">${money(t.discount)}</td></tr>
    <tr class="grand"><td>Total</td><td class="right">${money(t.total)}</td></tr>
  </table>`
      : ""
  }
</body></html>`;
}

export function renderPackingSlipHtml(input: OrderDocumentInput): string {
  const rows = input.items
    .map(
      (i) => `<tr>
      <td>${esc(i.productName)}${i.sizeLabel ? ` <span class="muted">(${esc(i.sizeLabel)})</span>` : ""}</td>
      <td class="right">${esc(i.quantity)}</td>
    </tr>`,
    )
    .join("");

  const ship = input.shipTo
    ? `<div class="box"><strong>Ship to</strong><br/>${esc(input.shipTo.name ?? input.customer.name)}<br/>${input.shipTo.lines.map(esc).join("<br/>")}</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Packing Slip ${esc(input.orderNumber)}</title>
<style>${baseStyles()}</style></head><body>
  <p class="noprint muted">Use Print → Save as PDF for a PDF copy.</p>
  <h1>Packing Slip</h1>
  <div class="muted">${esc(input.storeName)}</div>
  <div style="margin-top:12px"><strong>Order:</strong> ${esc(input.orderNumber)}</div>
  <div class="muted">Tracking: ${esc(input.trackingId ?? "—")} · Status: ${esc(input.status)}</div>
  ${ship}
  <table><thead><tr><th>Item</th><th class="right">Qty to pack</th></tr></thead>
  <tbody>${rows}</tbody></table>
</body></html>`;
}
