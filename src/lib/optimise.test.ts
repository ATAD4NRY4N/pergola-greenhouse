/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { DEFAULT_DESIGN, buildModel, type Design } from "./model";
import {
  GIRDER_OPTIONS,
  MAX_POST_BAY,
  MIN_PURLIN_SPACING,
  PURLIN_DEPTHS,
  PURLIN_GAUGES,
  PURLIN_SPACING_STEP,
  maxPurlinSpacingFor,
  optimisationInputs,
  optimiseDesign,
} from "./optimise";

const base = DEFAULT_DESIGN;

function isSafe(design: Design): boolean {
  const model = buildModel(design);
  const s = model.stats.purlinScreen;
  return (
    model.stats.maximumPostSpacing <= MAX_POST_BAY + 1e-9 &&
    s.yieldUtilization <= 1 &&
    s.deflectionMm <= s.deflectionLimitMm
  );
}

describe("framing optimiser", () => {
  test("the default brief trims to a lighter framing that still passes every screen", () => {
    const result = optimiseDesign(base);
    expect(result.ok).toBe(true);
    expect(isSafe(result.design)).toBe(true);
    expect(result.after.steelKg).toBeLessThan(result.before.steelKg);
    // Lighter sections can use more lines, so only steel weight is compared.
    expect(result.after.frameLengthM).toBeGreaterThan(0);
    // The report matches the model the patch produces.
    const applied = buildModel({ ...base, ...result.patch });
    expect(applied.stats.steelKg).toBe(result.after.steelKg);
    expect(applied.stats.purlinScreen.yieldUtilization).toBeCloseTo(
      result.after.yieldUtilization,
      6,
    );
  });

  test("an over-engineered design is cut back and never made heavier", () => {
    const heavy: Design = {
      ...base,
      roofPurlinDepth: 250,
      roofPurlinGauge: 3,
      roofPurlinSpacing: 0.4,
      girderCount: 4,
      postCount: 30,
    };
    const result = optimiseDesign(heavy);
    expect(result.ok).toBe(true);
    expect(isSafe(result.design)).toBe(true);
    expect(result.after.steelKg).toBeLessThan(result.before.steelKg);
    expect(result.after.postCount).toBeLessThan(30);
    expect(result.after.purlinCount).toBeLessThan(
      buildModel(heavy).members.filter((m) => m.kind === "purlin").length,
    );
  });

  test("an under-engineered design gains material until it is safe", () => {
    const light: Design = {
      ...base,
      roofPurlinDepth: 100,
      roofPurlinGauge: 1,
      roofPurlinSpacing: 0.6,
      girderCount: 0,
      postCount: 4,
    };
    expect(isSafe(light)).toBe(false);
    const result = optimiseDesign(light);
    expect(result.ok).toBe(true);
    expect(isSafe(result.design)).toBe(true);
    expect(result.after.steelKg).toBeGreaterThan(result.before.steelKg);
  });

  test("the confirmed dimensions, doors and materials are never changed", () => {
    const result = optimiseDesign(base);
    expect(result.inputs).toEqual(optimisationInputs(base));
    const preserved: (keyof Design)[] = [
      "width",
      "depthLeft",
      "depthRight",
      "eaveLeft",
      "eaveRight",
      "frontDoors",
      "rightDoors",
      "frontDoorOffset",
      "rightDoorOffset",
      "polyThickness",
      "roofLoadKpa",
      "steelYieldMpa",
    ];
    for (const key of preserved) {
      expect(result.design[key]).toEqual(base[key]);
    }
    // Display-only and non-confirmed fields stay out of the staleness key.
    const inputs: Record<string, unknown> = { ...optimisationInputs(base) };
    expect(inputs.doorOpen).toBeUndefined();
    expect(inputs.postCount).toBeUndefined();
  });

  test("no standard arrangement lighter than the result passes the screens", () => {
    const result = optimiseDesign(base);
    expect(result.ok).toBe(true);
    const spacingCap = maxPurlinSpacingFor(base.polyThickness);
    let lightestFeasible = Infinity;
    for (const depth of PURLIN_DEPTHS) {
      for (const gauge of PURLIN_GAUGES) {
        for (const girders of GIRDER_OPTIONS) {
          for (
            let s = MIN_PURLIN_SPACING;
            s <= spacingCap + 1e-9;
            s += PURLIN_SPACING_STEP
          ) {
            const spacing = Math.round(s * 100) / 100;
            const trial: Design = {
              ...result.design,
              girderCount: girders,
              roofPurlinDepth: depth,
              roofPurlinGauge: gauge,
              roofPurlinSpacing: spacing,
            };
            if (!isSafe(trial)) continue;
            lightestFeasible = Math.min(lightestFeasible, buildModel(trial).stats.steelKg);
          }
        }
      }
    }
    expect(lightestFeasible).toBeFinite();
    expect(result.after.steelKg).toBeLessThanOrEqual(lightestFeasible + 1e-6);
  });

  test("a heavier roof load cannot produce a lighter frame", () => {
    const lightLoad = optimiseDesign({ ...base, roofLoadKpa: 0.75 });
    const heavyLoad = optimiseDesign({ ...base, roofLoadKpa: 2 });
    expect(lightLoad.ok).toBe(true);
    expect(heavyLoad.ok).toBe(true);
    expect(heavyLoad.after.steelKg).toBeGreaterThanOrEqual(lightLoad.after.steelKg);
  });

  test("purlin centres respect the sheet-support cap for the chosen thickness", () => {
    expect(maxPurlinSpacingFor(4)).toBeCloseTo(0.6, 6);
    expect(maxPurlinSpacingFor(16)).toBeGreaterThan(maxPurlinSpacingFor(4));

    const thin = optimiseDesign({ ...base, polyThickness: 4 });
    expect(thin.after.purlinSpacing).toBeLessThanOrEqual(maxPurlinSpacingFor(4) + 1e-9);
    const thick = optimiseDesign({ ...base, polyThickness: 16 });
    expect(thick.after.purlinSpacing).toBeLessThanOrEqual(maxPurlinSpacingFor(16) + 1e-9);
  });

  test("post count is the minimum that keeps every bay inside the guidance", () => {
    const result = optimiseDesign(base);
    expect(result.after.maxPostSpacingM).toBeLessThanOrEqual(MAX_POST_BAY + 1e-9);
    const fewer = buildModel({ ...result.design, postCount: result.after.postCount - 1 });
    expect(fewer.stats.maximumPostSpacing).toBeGreaterThan(MAX_POST_BAY);
  });

  test("an impossible load reports failure without touching the design", () => {
    const crazy: Design = { ...base, roofLoadKpa: 500 };
    const result = optimiseDesign(crazy);
    expect(result.ok).toBe(false);
    expect(result.patch).toEqual({});
    expect(result.design).toEqual(crazy);
    expect(result.changes).toHaveLength(0);
    expect(result.notes.join(" ")).toContain("passes the screen");
  });

  test("a design already at the lightest safe framing reports nothing to change", () => {
    const first = optimiseDesign(base);
    const second = optimiseDesign(first.design);
    expect(second.ok).toBe(true);
    expect(second.after.steelKg).toBe(first.after.steelKg);
    expect(second.patch).toEqual({});
    expect(second.changes.join(" ")).toContain("Already optimal");
  });

  test("the report names the screens and keeps the planning-only caveat", () => {
    const result = optimiseDesign(base);
    const text = [...result.changes, ...result.notes].join(" ");
    expect(text).toContain("Z purlins");
    expect(text).toContain("gross-yield utilisation");
    expect(text).toContain("sheet-support rule");
    expect(text).toContain("not a code design");
  });
});
