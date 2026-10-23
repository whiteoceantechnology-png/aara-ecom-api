import {
  addressFields,
  formatInvoiceDate,
  mapOrderStatus,
  mapPaymentMode,
  mapSaleToExportRow,
  parseMonthRange,
  quantityInUqc,
  toUqc,
} from "./sales-export.util";

describe("sales-export.util", () => {
  describe("parseMonthRange", () => {
    it("parses YYYY-MM into local month bounds", () => {
      const { from, to } = parseMonthRange("2026-10");
      expect(from.getFullYear()).toBe(2026);
      expect(from.getMonth()).toBe(9);
      expect(from.getDate()).toBe(1);
      expect(to.getFullYear()).toBe(2026);
      expect(to.getMonth()).toBe(10);
      expect(to.getDate()).toBe(1);
    });

    it("rejects invalid month", () => {
      expect(() => parseMonthRange("2026-13")).toThrow();
      expect(() => parseMonthRange("oct-2026")).toThrow();
    });
  });

  describe("quantityInUqc", () => {
    it("converts grams pool to KG", () => {
      expect(
        quantityInUqc({
          unitsConsumed: 100,
          packsOrdered: 1,
          stockUnit: "g",
          packUnit: "g",
        }),
      ).toEqual({ uqc: "KGS", quantity: 0.1 });
    });

    it("uses pack count for piece units", () => {
      expect(
        quantityInUqc({
          unitsConsumed: 2,
          packsOrdered: 2,
          stockUnit: null,
          packUnit: "pcs",
        }),
      ).toEqual({ uqc: "NOS", quantity: 2 });
    });
  });

  it("maps status and payment mode", () => {
    expect(mapOrderStatus("CANCELLED")).toBe("Cancelled");
    expect(mapOrderStatus("SHIPPED")).toBe("Active");
    expect(mapPaymentMode("COD")).toBe("COD");
    expect(mapPaymentMode("ONLINE")).toBe("Prepaid");
    expect(toUqc("ml")).toBe("MLT");
  });

  describe("addressFields", () => {
    it("reads state/pincode/line from an addressSnapshot", () => {
      const result = addressFields(
        {
          addressLine1: "23, Gandhi Nagar",
          addressLine2: "Near Bus Stand",
          city: "Erode",
          state: "Tamil Nadu",
          postalCode: "638104",
        },
        null,
      );
      expect(result).toEqual({
        state: "Tamil Nadu",
        pincode: "638104",
        line: "23, Gandhi Nagar, Near Bus Stand, Erode",
      });
    });

    it("falls back to the linked shippingAddress when snapshot is missing", () => {
      const result = addressFields(null, {
        addressLine1: "12, MG Road",
        addressLine2: null,
        city: "Ahmedabad",
        state: "Gujarat",
        postalCode: "380001",
        country: "India",
      });
      expect(result).toEqual({
        state: "Gujarat",
        pincode: "380001",
        line: "12, MG Road, Ahmedabad",
      });
    });

    it("falls back to shippingAddress fields when snapshot is missing a value", () => {
      const result = addressFields(
        { addressLine1: "23, Gandhi Nagar", city: "Erode" },
        {
          addressLine1: "fallback line1",
          city: "fallback city",
          state: "Tamil Nadu",
          postalCode: "638104",
        },
      );
      expect(result.state).toBe("Tamil Nadu");
      expect(result.pincode).toBe("638104");
    });

    it("handles alternate snapshot key casing", () => {
      const result = addressFields(
        { line1: "23, Gandhi Nagar", State: "Tamil Nadu", zip: "638104" },
        null,
      );
      expect(result).toEqual({
        state: "Tamil Nadu",
        pincode: "638104",
        line: "23, Gandhi Nagar",
      });
    });

    it("returns nulls when both snapshot and shippingAddress are missing", () => {
      expect(addressFields(null, null)).toEqual({
        state: null,
        pincode: null,
        line: null,
      });
    });
  });

  it("maps a sale line into template columns", () => {
    const row = mapSaleToExportRow({
      orderNumber: "ORD-1",
      orderCreatedAt: new Date(2026, 9, 1),
      orderStatus: "CONFIRMED",
      orderTotalAmount: 105.4,
      customerName: "Priya K",
      customerGstIn: null,
      customerPhone: "9000000001",
      customerEmail: "priya@example.com",
      billingState: "Tamil Nadu",
      shippingAddressLine: "23, Gandhi Nagar, Erode",
      shippingState: "Tamil Nadu",
      shippingPincode: "600001",
      storeState: "Tamil Nadu",
      categoryName: "Health Powder",
      productName: "CHARCOAL POWDER",
      sku: "CP-100",
      sizeLabel: "100g",
      packsOrdered: 1,
      hsnCode: "1111",
      itemDescription: "",
      stockUnit: "g",
      packUnit: "g",
      unitsConsumed: 100,
      lineInclusive: 105,
      taxPercent: 5,
      taxAmount: 5,
      paymentMethod: "ONLINE",
      paymentReference: "pay_SAMPLE001",
    });

    expect(row["Order ID *"]).toBe("ORD-1");
    expect(row["Invoice Number *"]).toBe("ORD-1");
    expect(row["Invoice Date *"]).toBe(formatInvoiceDate(new Date(2026, 9, 1)));
    expect(row["Document Type *"]).toBe("Invoice");
    expect(row["Status *"]).toBe("Active");
    expect(row["Customer GSTIN"]).toBe("");
    expect(row["Unit (UQC) *"]).toBe("KGS");
    expect(row["Quantity (In UQC unit) *"]).toBe(0.1);
    expect(row["Taxable Value *"]).toBe(100);
    expect(row["GST Rate % *"]).toBe(5);
    expect(row.CGST).toBe(2.5);
    expect(row.SGST).toBe(2.5);
    expect(row.IGST).toBe("");
    expect(row["Line Total *"]).toBe(105);
    expect(row["Invoice Total (Rounded) *"]).toBe(105);
    expect(row["Payment Mode"]).toBe("Prepaid");
    expect(row["Payment Reference"]).toBe("pay_SAMPLE001");
    expect(row["Shipping Address"]).toBe("23, Gandhi Nagar, Erode");
  });

  it("applies IGST (not CGST/SGST) for an out-of-state customer", () => {
    const row = mapSaleToExportRow({
      orderNumber: "ORD-2",
      orderCreatedAt: new Date(2026, 9, 1),
      orderStatus: "CONFIRMED",
      orderTotalAmount: 105.4,
      customerName: "Asha P",
      customerGstIn: null,
      customerPhone: "9000000002",
      customerEmail: "asha@example.com",
      billingState: "Gujarat",
      shippingAddressLine: "12, MG Road, Ahmedabad",
      shippingState: "Gujarat",
      shippingPincode: "380001",
      storeState: null,
      categoryName: "Health Powder",
      productName: "CHARCOAL POWDER",
      sku: "CP-100",
      sizeLabel: "100g",
      packsOrdered: 1,
      hsnCode: "1111",
      itemDescription: "",
      stockUnit: "g",
      packUnit: "g",
      unitsConsumed: 100,
      lineInclusive: 105,
      taxPercent: 5,
      taxAmount: 5,
      paymentMethod: "ONLINE",
      paymentReference: "pay_SAMPLE002",
    });

    expect(row.CGST).toBe("");
    expect(row.SGST).toBe("");
    expect(row.IGST).toBe(5);
  });
});
