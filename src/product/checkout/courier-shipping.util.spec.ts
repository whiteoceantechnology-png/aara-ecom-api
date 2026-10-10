import {
  DEFAULT_PIECE_WEIGHT_KG,
  estimateCartWeightKg,
  estimateLineWeightKg,
  findCourierForState,
  normalizeStateKey,
  pickRateRule,
  quoteCourierShipping,
} from "./courier-shipping.util";

const stCourier = {
  id: 1,
  name: "ST Courier",
  code: "ST",
  status: "ACTIVE",
  states: [
    { name: "Tamil Nadu", code: "TN" },
    { name: "Pondicherry", code: "PY" },
    { name: "Kerala", code: "KL" },
  ],
  rateRules: [
    { minWeight: 0, maxWeight: 7, ratePerKg: 45, freeShipping: false },
    { minWeight: 7.001, maxWeight: 10, ratePerKg: 40, freeShipping: false },
  ],
};

const dtdc = {
  id: 2,
  name: "DTDC",
  code: "DTDC",
  status: "ACTIVE",
  states: [
    { name: "Karnataka", code: "KA" },
    { name: "Andhra Pradesh", code: "AP" },
    { name: "Telangana", code: "TG" },
  ],
  rateRules: [
    { minWeight: 0, maxWeight: 7, ratePerKg: 70, freeShipping: false },
    { minWeight: 7.001, maxWeight: null, ratePerKg: 0, freeShipping: true },
  ],
};

describe("courier-shipping.util", () => {
  describe("normalizeStateKey", () => {
    it("matches Kerala variants", () => {
      expect(normalizeStateKey("Kerala")).toBe(normalizeStateKey("kerala"));
      expect(normalizeStateKey("Tamil Nadu")).toBe(
        normalizeStateKey("Tamilnadu"),
      );
    });
  });

  describe("estimateLineWeightKg", () => {
    it("converts gram packs to kg", () => {
      expect(
        estimateLineWeightKg({
          quantity: 2,
          variantName: "500 g",
          packSize: { size: 500, unit: "g", label: "500 g" },
        }),
      ).toBe(1);
    });

    it("uses piece weight for Pack of N", () => {
      expect(
        estimateLineWeightKg({
          quantity: 1,
          variantName: "Pack of 20",
          stockUnit: "UNIT",
        }),
      ).toBe(round3(20 * DEFAULT_PIECE_WEIGHT_KG));
    });
  });

  describe("quoteCourierShipping", () => {
    it("charges ST Kerala ratePerKg × ceil(weight)", () => {
      const q = quoteCourierShipping({
        state: "Kerala",
        weightKg: 1.2,
        merchandiseTotal: 1175,
        couriers: [stCourier, dtdc],
      });
      expect(q.source).toBe("courier_rate");
      expect(q.courierCode).toBe("ST");
      expect(q.matchedState).toBe("Kerala");
      // ceil(1.2)=2 → 2×45
      expect(q.shipping).toBe(90);
    });

    it("uses free shipping band for heavy DTDC KA", () => {
      const q = quoteCourierShipping({
        state: "Karnataka",
        weightKg: 8,
        merchandiseTotal: 500,
        couriers: [stCourier, dtdc],
      });
      expect(q.courierCode).toBe("DTDC");
      expect(q.shipping).toBe(0);
    });

    it("waives shipping when merchandise ≥ 2000", () => {
      const q = quoteCourierShipping({
        state: "Kerala",
        weightKg: 2,
        merchandiseTotal: 2000,
        couriers: [stCourier],
      });
      expect(q.shipping).toBe(0);
      expect(q.source).toBe("free_merchandise");
    });

    it("falls back to flat when state unknown", () => {
      const q = quoteCourierShipping({
        state: "Goa",
        weightKg: 1,
        merchandiseTotal: 500,
        couriers: [stCourier],
        flatFallback: 50,
      });
      expect(q.shipping).toBe(50);
      expect(q.source).toBe("flat_fallback");
    });
  });

  describe("findCourierForState + pickRateRule", () => {
    it("maps Tamilnadu to ST", () => {
      const m = findCourierForState([stCourier, dtdc], "Tamilnadu");
      expect(m?.courier.code).toBe("ST");
    });

    it("picks correct weight band", () => {
      expect(pickRateRule(stCourier.rateRules, 0.5)?.ratePerKg).toBe(45);
      expect(pickRateRule(stCourier.rateRules, 8)?.ratePerKg).toBe(40);
    });

    it("uses lowest slab when weight is below first minWeight (not free open band)", () => {
      const tcRules = [
        { minWeight: 0.1, maxWeight: 7, ratePerKg: 80, freeShipping: false },
        {
          minWeight: 7,
          maxWeight: null,
          ratePerKg: 0,
          freeShipping: true,
        },
      ];
      const rule = pickRateRule(tcRules, 0.025);
      expect(rule?.ratePerKg).toBe(80);
      expect(rule?.freeShipping).toBe(false);
    });
  });

  describe("quoteCourierShipping light NE parcels", () => {
    const tc = {
      id: 5,
      name: "test courier",
      code: "TC",
      status: "ACTIVE",
      states: [
        { name: "Andaman and Nicobar Islands", code: "AN" },
        { name: "Arunachal Pradesh", code: "AR" },
      ],
      rateRules: [
        { minWeight: 0.1, maxWeight: 7, ratePerKg: 80, freeShipping: false },
        {
          minWeight: 7,
          maxWeight: null,
          ratePerKg: 0,
          freeShipping: true,
        },
      ],
    };

    it("charges ₹80 for Arunachal under minWeight slab start", () => {
      const q = quoteCourierShipping({
        state: "Arunachal Pradesh",
        weightKg: 0.025,
        merchandiseTotal: 0.1,
        couriers: [tc],
      });
      expect(q.source).toBe("courier_rate");
      expect(q.courierCode).toBe("TC");
      // ceil(0.025)=1 → 1×80
      expect(q.shipping).toBe(80);
    });

    it("multiplies ratePerKg by ceil(weightKg)", () => {
      const cases: Array<[number, number]> = [
        [1, 80],
        [2, 160],
        [2.1, 240],
        [2.5, 240],
      ];
      for (const [weightKg, shipping] of cases) {
        const q = quoteCourierShipping({
          state: "Arunachal Pradesh",
          weightKg,
          merchandiseTotal: 500,
          couriers: [tc],
        });
        expect(q.shipping).toBe(shipping);
      }
    });
  });

  describe("estimateCartWeightKg", () => {
    it("sums lines", () => {
      expect(
        estimateCartWeightKg([
          { quantity: 1, variantName: "1 kg" },
          { quantity: 2, variantName: "250 g" },
        ]),
      ).toBe(1.5);
    });
  });
});

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
