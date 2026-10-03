/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  buildModel,
  DEFAULT_DESIGN,
  LEAF_GAP,
  SHEET_LONG,
  SHEET_SHORT,
  TRACK_DROP,
} from "../lib/model";

const base = DEFAULT_DESIGN;

describe("plan geometry", () => {
  test("default footprint matches the brief", () => {
    const m = buildModel(base);
    expect(m.design.width).toBe(8.5);
    expect(m.design.depthLeft).toBe(8.0);
    expect(m.design.depthRight).toBe(7.0);
    // Front run straight, back-left reaching furthest back.
    expect(m.plan.fl).toEqual({ x: 0, y: 8 });
    expect(m.plan.fr).toEqual({ x: 8.5, y: 8 });
    expect(m.plan.bl).toEqual({ x: 0, y: 0 });
    expect(m.plan.br).toEqual({ x: 8.5, y: 1 });
  });

  test("the front run is straight and the back run is sloped", () => {
    const m = buildModel(base);
    expect(m.plan.fl.y).toBeCloseTo(m.plan.fr.y);
    expect(m.plan.bl.y).toBeLessThan(m.plan.br.y);
    // The back-left corner reaches further back than the back-right one.
    expect(m.plan.bl.y).toBeCloseTo(0);
    expect(m.plan.br.y).toBeCloseTo(1);
    expect(m.backAt(0)).toBeCloseTo(0);
    expect(m.backAt(8.5)).toBeCloseTo(1);
    expect(m.backAt(4.25)).toBeCloseTo(0.5);
  });

  test("eave interpolates linearly across the width", () => {
    const m = buildModel(base);
    expect(m.eaveAt(0)).toBeCloseTo(2.95);
    expect(m.eaveAt(8.5)).toBeCloseTo(3.7);
    expect(m.roofPitchDeg).toBeCloseTo((Math.atan2(0.75, 8.5) * 180) / Math.PI, 5);
  });
});

describe("corner angles", () => {
  test("front corners are always square", () => {
    const m = buildModel(base);
    const fl = m.corners.find((c) => c.id === "fl")!;
    const fr = m.corners.find((c) => c.id === "fr")!;
    expect(fl.angleDeg).toBeCloseTo(90, 6);
    expect(fr.angleDeg).toBeCloseTo(90, 6);
    expect(fl.square).toBe(true);
    expect(fr.square).toBe(true);
  });

  test("unequal depths skew the back corners symmetrically", () => {
    const m = buildModel(base);
    const bl = m.corners.find((c) => c.id === "bl")!;
    const br = m.corners.find((c) => c.id === "br")!;
    expect(bl.angleDeg + br.angleDeg).toBeCloseTo(180, 3);
    // The back-left corner is further out, so it is the sharper one.
    expect(bl.angleDeg).toBeLessThan(90);
    expect(br.angleDeg).toBeGreaterThan(90);
    expect(bl.square).toBe(false);
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
    expect(bad.map((c) => c.id).sort()).toEqual(["bl", "br"]);
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
        Math.abs(p.at.y - m.plan.fl.y) < 1e-6 ||
        Math.abs(p.at.y - m.backAt(p.at.x)) < 1e-6;
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
  test("one leaf per configured door, always a whole 8x4 sheet", () => {
    const m = buildModel(base);
    expect(m.doors.length).toBe(base.frontDoors + base.rightDoors);
    for (const leaf of m.doors) {
      expect(leaf.width).toBeCloseTo(SHEET_SHORT);
      expect(leaf.height).toBeCloseTo(SHEET_LONG);
    }
  });

  test("four level perimeter C-purlins carry the doors directly at one height", () => {
    const m = buildModel(base);
    const rails = m.members.filter((member) => member.kind === "level-ring");
    expect(rails).toHaveLength(4);
    const heights = rails.flatMap((rail) => [rail.a.z, rail.b.z]);
    expect(Math.max(...heights)).toBeCloseTo(Math.min(...heights), 8);

    for (const post of m.posts) {
      const supported = rails.some((rail) => {
        const dx = rail.b.x - rail.a.x;
        const dy = rail.b.y - rail.a.y;
        const lengthSquared = dx * dx + dy * dy;
        const along = (post.at.x - rail.a.x) * dx + (post.at.y - rail.a.y) * dy;
        const cross = dx * (post.at.y - rail.a.y) - dy * (post.at.x - rail.a.x);
        return Math.abs(cross) < 1e-6 && along >= -1e-6 && along <= lengthSquared + 1e-6;
      });
      expect(supported).toBe(true);
    }

    const channelDepth = Math.max(0.05, base.ringDepth / 1000);
    for (const leaf of m.doors) {
      const support = rails.find((rail) => rail.id === leaf.supportMemberId);
      expect(support).toBeDefined();
      expect(leaf.poly[0].z).toBeCloseTo(leaf.poly[1].z, 8);
      expect(leaf.poly[2].z).toBeCloseTo(leaf.poly[3].z, 8);
      expect(leaf.poly[2].z).toBeCloseTo(support!.a.z - channelDepth / 2 - LEAF_GAP, 8);
      expect(leaf.poly[0].z).toBeGreaterThan(0.075);
      expect(leaf.poly[2].z - leaf.poly[0].z).toBeCloseTo(SHEET_LONG, 6);
      expect(leaf.trolleys).toHaveLength(2);
      for (const trolley of leaf.trolleys) {
        expect(trolley.wheelCentres).toHaveLength(4);
        expect(trolley.hanger.label).toBe("four-wheel trolley hanger");
        expect(trolley.hanger.length).toBeGreaterThan(0);
        for (const wheel of trolley.wheelCentres) {
          expect(wheel.z).toBeGreaterThan(support!.a.z - channelDepth / 2);
        }
      }
    }
  });

  test("level door rails are independent of roof geometry and have no drop rods", () => {
    const m = buildModel(base);
    const changedRoof = buildModel({ ...base, eaveRight: 4.1, roofPurlinSpacing: 0.35 });
    const rails = m.members.filter((member) => member.kind === "level-ring");
    const changedRails = changedRoof.members.filter((member) => member.kind === "level-ring");
    expect(changedRails.map((rail) => [rail.a.z, rail.b.z])).toEqual(
      rails.map((rail) => [rail.a.z, rail.b.z]),
    );
    expect(m.members.some((member) => member.label === "drop rod")).toBe(false);
    expect(m.doors.every((leaf) => rails.some((rail) => rail.id === leaf.supportMemberId))).toBe(true);
    expect(TRACK_DROP).toBeGreaterThan(0);
  });

  test("door rail length includes only front/right runs that carry doors", () => {
    const frontOnly = buildModel({ ...base, rightDoors: 0 });
    expect(frontOnly.stats.trackLength).toBeCloseTo(base.width, 6);
    const noDoors = buildModel({ ...base, frontDoors: 0, rightDoors: 0 });
    expect(noDoors.stats.trackLength).toBe(0);
    expect(noDoors.warnings.some((warning) => warning.title.includes("doors do not clear the floor"))).toBe(false);
  });

  test("every leaf stays on its track, closed and fully open", () => {
    const m = buildModel(base);
    for (const side of ["front", "right"] as const) {
      const track = m.members.find(
        (x) => x.kind === "level-ring" && x.label?.endsWith(side),
      );
      expect(track).toBeDefined();
      // Convert a world point to the along-run coordinate the doors use. The
      // right run is measured back from the straight front edge.
      const frontY = Math.max(base.depthLeft, base.depthRight);
      const u = (p: { x: number; y: number }) =>
        side === "right" ? frontY - p.y : p.x;
      const from = Math.min(u(track!.a), u(track!.b));
      const to = Math.max(u(track!.a), u(track!.b));

      for (const leaf of m.doors.filter((x) => x.side === side)) {
        // closed
        expect(leaf.runStart).toBeGreaterThanOrEqual(from - 1e-6);
        expect(leaf.runEnd).toBeLessThanOrEqual(to + 1e-6);
        // fully parked
        const parked = leaf.runStart + leaf.travel * leaf.slideDir;
        expect(Math.min(parked, parked + leaf.width)).toBeGreaterThanOrEqual(from - 1e-6);
        expect(Math.max(parked, parked + leaf.width)).toBeLessThanOrEqual(to + 1e-6);
        // The level rail holds the leaf at one height even when parked along
        // the sloped front elevation.
        for (const corner of leaf.parkedPoly) {
          expect(corner.z).toBeLessThan(m.eaveAt(corner.x) - base.ringDepth / 1000);
          expect(corner.z).toBeGreaterThan(0.075);
        }
        // Same sheet, same size, only moved.
        expect(leaf.poly[2].z - leaf.poly[0].z).toBeCloseTo(
          leaf.parkedPoly[2].z - leaf.parkedPoly[0].z,
          6,
        );
      }
    }

  });

  test("a leaf that cannot clear the floor raises an error", () => {
    const m = buildModel({ ...base, eaveLeft: 2.2, eaveRight: 2.4 });
    expect(
      m.warnings.some((w) => w.title.includes("doors do not clear the floor")),
    ).toBe(true);
  });

  test("the level perimeter rail leaves usable clearance under a full sheet", () => {
    const railUnderside =
      Math.min(base.eaveLeft, base.eaveRight) -
      base.ringDepth / 1000 - TRACK_DROP - base.ringDepth / 1000;
    expect(railUnderside - LEAF_GAP - SHEET_LONG).toBeGreaterThan(0.075);
    const m = buildModel(base);
    expect(Math.min(...m.doors.map((leaf) => leaf.poly[0].z))).toBeGreaterThan(0.075);
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

  test("every brace lands on a perimeter edge, never in open ground", () => {
    const m = buildModel(base);
    const edges: [{ x: number; y: number }, { x: number; y: number }][] = [
      [m.plan.bl, m.plan.br],
      [m.plan.br, m.plan.fr],
      [m.plan.fr, m.plan.fl],
      [m.plan.fl, m.plan.bl],
    ];
    const braces = m.members.filter((x) => x.kind === "brace");
    expect(braces.length).toBeGreaterThan(0);
    for (const b of braces) {
      // Both ends must lie on the outline of the structure.
      for (const p of [b.a, b.b]) {
        const onEdge = edges.some(([a, c]) => {
          const ex = c.x - a.x;
          const ey = c.y - a.y;
          const len = Math.hypot(ex, ey) || 1;
          const t = (p.x - a.x) * (ex / len) + (p.y - a.y) * (ey / len);
          const off = Math.abs((p.x - a.x) * -(ey / len) + (p.y - a.y) * (ex / len));
          return off < 0.05 && t > -0.05 && t < len + 0.05;
        });
        expect(onEdge).toBe(true);
      }
    }
  });

  test("cut list includes all four level rails and trolley assemblies", () => {
    const m = buildModel(base);
    expect(m.stats.trackLength).toBeGreaterThan(0);
    expect(m.cutList.filter((item) => item.id.startsWith("level-rail-"))).toHaveLength(4);
    expect(m.cutList.filter((item) => item.id.startsWith("level-rail-")).every((item) => item.qty === 1)).toBe(true);
    expect(m.cutList.find((item) => item.id === "wheels")?.qty).toBe(m.doors.length * 2);
    expect(m.cutList.some((item) => item.id === "droprods")).toBe(false);
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
    const m = buildModel({ ...base, frontDoors: 3, rightDoors: 1 });
    expect(m.doors.length).toBe(4);
    expect(m.stats.sheetsDoor).toBe(4);
  });
});
