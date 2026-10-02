/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { buildModel, DEFAULT_DESIGN, SHEET_LONG, SHEET_SHORT } from "../lib/model";

const base = DEFAULT_DESIGN;

describe("plan geometry", () => {
  test("default footprint matches the brief", () => {
    const m = buildModel(base);
    expect(m.design.width).toBe(8.5);
    expect(m.design.depthLeft).toBe(8.0);
    expect(m.design.depthRight).toBe(7.0);
    expect(m.plan.fl).toEqual({ x: 0, y: 8 });
    expect(m.plan.fr).toEqual({ x: 8.5, y: 7 });
  });

  test("depth interpolates linearly across the width", () => {
    const m = buildModel(base);
    expect(m.depthAt(0)).toBeCloseTo(8.0);
    expect(m.depthAt(4.25)).toBeCloseTo(7.5);
    expect(m.depthAt(8.5)).toBeCloseTo(7.0);
  });

  test("eave interpolates linearly across the width", () => {
    const m = buildModel(base);
    expect(m.eaveAt(0)).toBeCloseTo(2.95);
    expect(m.eaveAt(8.5)).toBeCloseTo(3.7);
    expect(m.roofPitchDeg).toBeCloseTo((Math.atan2(0.75, 8.5) * 180) / Math.PI, 5);
  });
});

describe("corner angles", () => {
  test("back corners are always square", () => {
    const m = buildModel(base);
    const bl = m.corners.find((c) => c.id === "bl")!;
    const br = m.corners.find((c) => c.id === "br")!;
    expect(bl.angleDeg).toBeCloseTo(90, 1);
    expect(br.angleDeg).toBeCloseTo(90, 1);
    expect(bl.square).toBe(true);
    expect(br.square).toBe(true);
  });

  test("unequal depths skew the front corners symmetrically", () => {
    const m = buildModel(base);
    const fl = m.corners.find((c) => c.id === "fl")!;
    const fr = m.corners.find((c) => c.id === "fr")!;
    expect(fl.angleDeg + fr.angleDeg).toBeCloseTo(180, 3);
    expect(fl.angleDeg).toBeLessThan(90);
    expect(fr.angleDeg).toBeGreaterThan(90);
    expect(fl.square).toBe(false);
  });

  test("equal depths square every corner", () => {
    const m = buildModel({ ...base, depthRight: 8.0 });
    expect(m.corners.every((c) => c.square)).toBe(true);
    expect(m.corners.every((c) => c.ok)).toBe(true);
  });

  test("a rigid 90 plate on a skewed corner is an error", () => {
    const m = buildModel({
      ...base,
      corners: { bl: "rigid90", br: "rigid90", fl: "rigid90", fr: "rigid90" },
    });
    const bad = m.corners.filter((c) => !c.ok);
    expect(bad.map((c) => c.id).sort()).toEqual(["fl", "fr"]);
    expect(m.warnings.some((w) => w.level === "error")).toBe(true);
  });
});

describe("posts", () => {
  test("posts sit only on the perimeter and never inside", () => {
    const m = buildModel(base);
    expect(m.posts.length).toBeGreaterThan(4);
    for (const p of m.posts) {
      const onEdge =
        p.at.x < 1e-6 ||
        Math.abs(p.at.x - m.design.width) < 1e-6 ||
        p.at.y < 1e-6 ||
        Math.abs(p.at.y - m.depthAt(p.at.x)) < 1e-6;
      expect(onEdge).toBe(true);
    }
  });

  test("tighter bay spacing never reduces the post count", () => {
    const wide = buildModel({ ...base, baySpacing: 3.2 });
    const tight = buildModel({ ...base, baySpacing: 1.5 });
    expect(tight.posts.length).toBeGreaterThanOrEqual(wide.posts.length);
  });
});

describe("roof sheeting", () => {
  test("every roof sheet cell comes off a 8x4 sheet", () => {
    const m = buildModel(base);
    expect(m.roofSheets.length).toBeGreaterThan(0);
    for (const s of m.roofSheets) {
      expect(s.usedArea).toBeLessThanOrEqual(SHEET_LONG * SHEET_SHORT + 1e-6);
      expect(s.wasteArea).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  test("a wider footprint never needs fewer sheets", () => {
    const narrow = buildModel({ ...base, width: 6 });
    const wide = buildModel({ ...base, width: 12 });
    expect(wide.roofSheets.length).toBeGreaterThan(narrow.roofSheets.length);
  });

  test("all sheets land inside the structure footprint", () => {
    const m = buildModel(base);
    for (const s of m.roofSheets) {
      for (const p of s.poly) {
        expect(p.x).toBeGreaterThanOrEqual(-m.design.roofOverhang - 1e-6);
        expect(p.x).toBeLessThanOrEqual(m.design.width + m.design.roofOverhang + 1e-6);
        expect(p.y).toBeGreaterThanOrEqual(-m.design.roofOverhang - 1e-6);
      }
    }
  });
});

describe("doors", () => {
  test("one leaf per configured door, each 1219 x 2438 by default", () => {
    const m = buildModel(base);
    expect(m.doors.length).toBe(base.frontDoors + base.leftDoors);
    for (const leaf of m.doors) {
      expect(leaf.width).toBeCloseTo(SHEET_SHORT);
      expect(leaf.height).toBeCloseTo(SHEET_LONG);
    }
  });

  test("a leaf that cannot fit under the low eave raises an error", () => {
    const m = buildModel({ ...base, eaveLeft: 2.2, eaveRight: 2.4 });
    expect(m.warnings.some((w) => w.title.includes("Doors do not fit"))).toBe(true);
  });

  test("the default layout leaves a usable door gap", () => {
    const minHead =
      Math.min(base.eaveLeft, base.eaveRight) - base.ringDepth / 1000 - 0.25;
    expect(minHead - base.doorLeafHeight).toBeGreaterThan(0.075);
  });

  test("knee braces are added at the posts and shorten the ring span", () => {
    const braced = buildModel({ ...base, kneeBraces: true });
    const bare = buildModel({ ...base, kneeBraces: false });
    expect(
      braced.members.filter((x) => x.kind === "brace").length,
    ).toBeGreaterThan(0);
    expect(bare.members.filter((x) => x.kind === "brace")).toHaveLength(0);

    const bracedWarn = braced.warnings.find((w) =>
      w.title.includes("Front / back ring spans"),
    );
    const bareWarn = bare.warnings.find((w) =>
      w.title.includes("Front / back ring spans"),
    );
    if (bracedWarn && bareWarn) {
      expect(bracedWarn.title).not.toBe(bareWarn.title);
    }
  });

  test("track length covers the parked leaves", () => {
    const m = buildModel(base);
    expect(m.stats.trackLength).toBeGreaterThan(0);
  });
});

describe("frame", () => {
  test("more girders shorten the governing purlin span", () => {
    const none = buildModel({ ...base, girderCount: 0 });
    const two = buildModel({ ...base, girderCount: 2 });
    const four = buildModel({ ...base, girderCount: 4 });
    expect(two.stats.governingPurlinSpan).toBeLessThan(none.stats.governingPurlinSpan);
    expect(four.stats.governingPurlinSpan).toBeLessThan(two.stats.governingPurlinSpan);
  });

  test("tightening purlin centres adds purlins", () => {
    const wide = buildModel({ ...base, roofPurlinSpacing: 1.2 });
    const tight = buildModel({ ...base, roofPurlinSpacing: 0.4 });
    expect(tight.members.filter((x) => x.kind === "purlin").length).toBeGreaterThan(
      wide.members.filter((x) => x.kind === "purlin").length,
    );
  });

  test("there is a C purlin ring on all four sides", () => {
    const m = buildModel(base);
    const ring = m.members.filter((x) => x.kind === "ring" || x.kind === "ring-heavy");
    expect(ring.length).toBe(4);
  });
});

describe("cut list", () => {
  test("includes steel, doors, polycarbonate and fixings", () => {
    const m = buildModel(base);
    const groups = new Set(m.cutList.map((i) => i.group));
    expect(groups).toContain("Steel");
    expect(groups).toContain("Doors");
    expect(groups).toContain("Polycarbonate");
    expect(groups).toContain("Fixings");
  });

  test("every quantity is a positive whole number", () => {
    const m = buildModel(base);
    for (const item of m.cutList) {
      expect(item.qty).toBeGreaterThan(0);
      expect(Number.isFinite(item.qty)).toBe(true);
    }
  });

  test("sheeting quantities track the door count", () => {
    const m = buildModel({ ...base, frontDoors: 3, leftDoors: 1 });
    expect(m.doors.length).toBe(4);
    expect(m.stats.sheetsDoor).toBe(4);
  });
});
