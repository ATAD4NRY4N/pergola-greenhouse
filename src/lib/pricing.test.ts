/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { DEFAULT_DESIGN, buildModel, type Design } from "./model";
import {
  DEFAULT_RATES,
  PHASES,
  RATE_FIELDS,
  formatGBP,
  loadRates,
  priceModel,
  sanitizeRates,
  storeRates,
} from "./pricing";

const base = DEFAULT_DESIGN;

function line(report: ReturnType<typeof priceModel>, id: string) {
  const found = report.components.find((c) => c.id === id);
  expect(found).toBeDefined();
  return found!;
}

describe("pricing roll-up", () => {
  test("components, phases and the summary all agree", () => {
    const model = buildModel(base);
    const report = priceModel(model);

    const componentSum = report.components.reduce((sum, c) => sum + c.cost, 0);
    expect(componentSum).toBeCloseTo(report.materials, 6);

    // Every component lands in exactly one phase, so the phase materials
    // must cover the whole materials total with nothing lost or double-counted.
    const phaseMaterialSum = report.phases.reduce(
      (sum, p) => sum + p.materials,
      0,
    );
    expect(phaseMaterialSum).toBeCloseTo(report.materials, 6);

    const groupSum = report.groups.reduce((sum, g) => sum + g.total, 0);
    expect(groupSum).toBeCloseTo(report.materials, 6);

    const phaseLabourSum = report.phases.reduce((sum, p) => sum + p.labour, 0);
    expect(phaseLabourSum).toBeCloseTo(report.labour, 6);
    const phaseDaySum = report.phases.reduce((sum, p) => sum + p.labourDays, 0);
    expect(phaseDaySum).toBeCloseTo(report.labourDays, 6);

    expect(report.contingency).toBeCloseTo(
      (report.materials + report.labour) * (report.contingencyPct / 100),
      6,
    );
    expect(report.total).toBeCloseTo(
      report.materials + report.labour + report.contingency,
      6,
    );
    expect(report.perRoofM2).toBeCloseTo(report.total / model.stats.roofArea, 6);
  });

  test("every priced line is non-negative and the default brief is plausible", () => {
    const report = priceModel(buildModel(base));
    for (const c of report.components) {
      expect(c.cost).toBeGreaterThanOrEqual(0);
      expect(c.basis.length).toBeGreaterThan(0);
    }
    expect(report.total).toBeGreaterThan(0);
    expect(Number.isFinite(report.total)).toBe(true);
    expect(report.phases.map((p) => p.id)).toEqual(PHASES.map((p) => p.id));
  });

  test("the per-run level rails are priced once — the summary line is not double-counted", () => {
    const report = priceModel(buildModel(base));
    expect(line(report, "door-rails").cost).toBe(0);
    const rails = report.components.filter((c) =>
      c.id.startsWith("level-rail-"),
    );
    expect(rails.length).toBeGreaterThan(0);
    expect(
      rails.reduce((sum, c) => sum + c.cost, 0),
    ).toBeGreaterThan(0);
  });
});

describe("component pricing follows the design", () => {
  test("steel is priced from the real section mass, so heavier sections cost more", () => {
    const light = priceModel(buildModel(base));
    const heavy = priceModel(
      buildModel({ ...base, roofPurlinDepth: 250, roofPurlinGauge: 3 }),
    );
    expect(line(heavy, "purlins").cost).toBeGreaterThan(
      line(light, "purlins").cost,
    );
    const lightFrame = light.phases.find((p) => p.id === "frame")!;
    const heavyFrame = heavy.phases.find((p) => p.id === "frame")!;
    expect(heavyFrame.materials).toBeGreaterThan(lightFrame.materials);
    expect(heavy.materials).toBeGreaterThan(light.materials);
  });

  test("thicker twinwall polycarbonate costs more per sheet", () => {
    const thin = priceModel(buildModel({ ...base, polyThickness: 4 }));
    const thick = priceModel(buildModel({ ...base, polyThickness: 16 }));
    const sheets = (report: ReturnType<typeof priceModel>) =>
      line(report, "roofpoly").cost + line(report, "doorpoly").cost;
    expect(sheets(thick)).toBeGreaterThan(sheets(thin));
    const thinEnv = thin.phases.find((p) => p.id === "envelope")!;
    const thickEnv = thick.phases.find((p) => p.id === "envelope")!;
    expect(thickEnv.materials).toBeGreaterThan(thinEnv.materials);
  });

  test("doubling the steel rate doubles every steel line", () => {
    const model = buildModel(base);
    const standard = priceModel(model, DEFAULT_RATES);
    const dear = priceModel(model, {
      ...DEFAULT_RATES,
      steelPerKg: DEFAULT_RATES.steelPerKg * 2,
    });
    for (const id of ["posts", "purlins", "girders", "ring-front"]) {
      expect(line(dear, id).cost).toBeCloseTo(line(standard, id).cost * 2, 6);
    }
    // Non-steel lines are untouched.
    expect(line(dear, "fixings").cost).toBeCloseTo(
      line(standard, "fixings").cost,
      6,
    );
  });

  test("a design with no sliding doors spends nothing on door hardware", () => {
    const model = buildModel({ ...base, frontDoors: 0, rightDoors: 0 });
    const report = priceModel(model);
    const doors = report.phases.find((p) => p.id === "doors")!;
    expect(doors.materials).toBe(0);
    expect(doors.labourDays).toBe(0);
    expect(line(report, "wheels").cost).toBe(0);
    expect(line(report, "casing").cost).toBe(0);
  });

  test("labour days scale with the size of the build", () => {
    const small = priceModel(buildModel(base));
    const big = priceModel(
      buildModel({ ...base, postCount: 24, width: 12, depthLeft: 11 }),
    );
    const groundwork = (report: ReturnType<typeof priceModel>) =>
      report.phases.find((p) => p.id === "groundwork")!.labourDays;
    const frame = (report: ReturnType<typeof priceModel>) =>
      report.phases.find((p) => p.id === "frame")!.labourDays;
    expect(big.labourDays).toBeGreaterThan(small.labourDays);
    expect(groundwork(big)).toBeGreaterThan(groundwork(small));
    expect(frame(big)).toBeGreaterThan(frame(small));
  });

  test("a zero contingency drops the contingency line entirely", () => {
    const report = priceModel(buildModel(base), {
      ...DEFAULT_RATES,
      contingencyPct: 0,
    });
    expect(report.contingency).toBe(0);
    expect(report.total).toBeCloseTo(report.materials + report.labour, 6);
  });
});

describe("rate card hygiene and formatting", () => {
  test("unknown, negative or garbage rates are rejected", () => {
    const cleaned = sanitizeRates({
      steelPerKg: 5,
      contingencyPct: -3,
      boltEach: "not a number",
      madeUpKey: 99,
    });
    expect(cleaned.steelPerKg).toBe(5);
    expect(cleaned.contingencyPct).toBe(DEFAULT_RATES.contingencyPct);
    expect(cleaned.boltEach).toBe(DEFAULT_RATES.boltEach);
    expect("madeUpKey" in cleaned).toBe(false);
  });

  test("loaded rates always cover every field", () => {
    const loaded = loadRates();
    for (const field of RATE_FIELDS) {
      expect(Number.isFinite(loaded[field.key])).toBe(true);
      expect(loaded[field.key]).toBeGreaterThanOrEqual(0);
    }
  });

  test("rate edits round-trip through storage, and corrupt storage falls back to defaults", () => {
    // The test runtime has no localStorage; an in-memory shim exercises the
    // real serialise → store → read → sanitise path in this module.
    const backing = new Map<string, string>();
    let lastKey = "";
    const shim = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        lastKey = key;
        backing.set(key, value);
      },
      removeItem: (key: string) => void backing.delete(key),
      clear: () => backing.clear(),
    };
    const g = globalThis as { localStorage?: unknown };
    const previous = g.localStorage;
    g.localStorage = shim;
    try {
      const custom = { ...DEFAULT_RATES, steelPerKg: 3.5, contingencyPct: 15 };
      storeRates(custom);
      expect(loadRates()).toEqual(custom);

      // Corrupt JSON must not take the app down.
      backing.set(lastKey, "{not json");
      expect(loadRates()).toEqual(DEFAULT_RATES);

      // Out-of-range values are sanitised on the way back in.
      backing.set(lastKey, JSON.stringify({ steelPerKg: -2, junk: true }));
      expect(loadRates().steelPerKg).toBe(DEFAULT_RATES.steelPerKg);
    } finally {
      g.localStorage = previous;
    }
  });

  test("money is formatted in pounds", () => {
    expect(formatGBP(2000)).toBe("£2,000");
    expect(formatGBP(2.5, 2)).toBe("£2.50");
  });
});

describe("phases match the build plan", () => {
  test("each phase names its build-plan step and labour rule", () => {
    const report = priceModel(buildModel({} as Design));
    for (const phase of report.phases) {
      expect(phase.step).toContain("Build plan");
      expect(phase.labourRule.length).toBeGreaterThan(0);
      expect(phase.sharePct).toBeGreaterThanOrEqual(0);
    }
    const shareSum = report.phases.reduce((sum, p) => sum + p.sharePct, 0);
    expect(shareSum).toBeCloseTo(100, 6);
  });
});
