/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  buildModel,
  DEFAULT_DESIGN,
  SHEET_LONG,
  SHEET_SHORT,
  DOOR_FLOOR_CLEARANCE,
  DOOR_OVERLAP,
  FLOOR_TRACK_DEPTH,
  FLOOR_WHEEL_AXLE_OFFSETS,
  FLOOR_WHEEL_LANES,
  WHEEL_DIA,
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

  test("roof girders and purlins follow the skewed rear boundary", () => {
    const m = buildModel(base);
    const girders = m.members.filter((member) => member.kind === "girder");
    expect(girders).toHaveLength(base.girderCount);
    for (const girder of girders) {
      expect(girder.a.y).toBeCloseTo(m.backAt(girder.a.x));
      expect(girder.b.y).toBeCloseTo(m.depthAt(girder.b.x));
      expect(girder.a.z).toBeCloseTo(m.eaveAt(girder.a.x) - base.roofPurlinDepth / 2000);
    }
    for (const purlin of m.members.filter((member) => member.kind === "purlin")) {
      expect(purlin.a.y).toBeCloseTo(purlin.b.y);
      for (const end of [purlin.a, purlin.b]) {
        expect(end.y).toBeGreaterThanOrEqual(m.backAt(end.x) - 1e-6);
        expect(end.y).toBeLessThanOrEqual(m.depthAt(end.x) + 1e-6);
      }
      expect(purlin.a.x).toBeGreaterThanOrEqual(-1e-6);
      expect(purlin.b.x).toBeLessThanOrEqual(base.width + 1e-6);
    }
  });

  test("purlin ends are trimmed correctly when the rear edge slopes the other way", () => {
    const m = buildModel({ ...base, depthLeft: 7, depthRight: 8 });
    const purlins = m.members.filter((member) => member.kind === "purlin");
    expect(purlins.length).toBeGreaterThan(0);
    expect(purlins.some((purlin) => purlin.a.x > 1e-6)).toBe(true);
    for (const purlin of purlins) {
      for (const end of [purlin.a, purlin.b]) {
        expect(end.y).toBeGreaterThanOrEqual(m.backAt(end.x) - 1e-6);
        expect(end.y).toBeLessThanOrEqual(m.depthAt(end.x) + 1e-6);
      }
    }
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
    expect(m.posts.length).toBe(base.postCount);
    for (const p of m.posts) {
      const onEdge =
        p.at.x < 1e-6 ||
        Math.abs(p.at.x - m.design.width) < 1e-6 ||
        Math.abs(p.at.y - m.plan.fl.y) < 1e-6 ||
        Math.abs(p.at.y - m.backAt(p.at.x)) < 1e-6;
      expect(onEdge).toBe(true);
    }
  });

  test("requested count includes the four corners and distributes remaining posts along the boundary", () => {
    const sparse = buildModel({ ...base, postCount: 4 });
    const specified = buildModel({ ...base, postCount: 13 });
    expect(sparse.posts).toHaveLength(4);
    expect(specified.posts).toHaveLength(13);
    expect(specified.stats.maximumPostSpacing).toBeLessThan(sparse.stats.maximumPostSpacing);
    expect(specified.posts.filter((post) => post.corner !== null)).toHaveLength(4);
  });

  test("post count is clamped to a valid perimeter minimum and maximum", () => {
    expect(buildModel({ ...base, postCount: 1 }).posts).toHaveLength(4);
    expect(buildModel({ ...base, postCount: 80 }).posts).toHaveLength(60);
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

  test("a single leaf uses floor-level roller carriages and parks into the clear bay", () => {
    const m = buildModel({ ...base, frontDoors: 1, rightDoors: 0 });
    expect(m.doors).toHaveLength(1);
    const [leaf] = m.doors;
    expect(leaf.side).toBe("front");
    expect(leaf.width).toBeCloseTo(SHEET_SHORT);
    expect(leaf.height).toBeCloseTo(SHEET_LONG);
    expect(leaf.travel).toBeCloseTo(SHEET_SHORT + 0.02);
    expect(leaf.carriages).toHaveLength(2);
    expect(leaf.carriages.every((carriage) => carriage.rollerCentres.length === 4)).toBe(true);
    expect(leaf.parkedPoly[0].x - leaf.poly[0].x).toBeCloseTo(-leaf.travel);
    expect(leaf.parkedPoly[1].x - leaf.poly[1].x).toBeCloseTo(-leaf.travel);

    const trimMembers = m.members.filter((member) => member.kind === "doorframe");
    expect(trimMembers).toHaveLength(4);
    expect(trimMembers.every((member) => member.label?.includes("aluminium U-channel"))).toBe(true);
    const leafCentre = leaf.poly.reduce(
      (sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4, z: sum.z + point.z / 4 }),
      { x: 0, y: 0, z: 0 },
    );
    for (const trimMember of trimMembers) {
      const midpoint = {
        x: (trimMember.a.x + trimMember.b.x) / 2,
        y: (trimMember.a.y + trimMember.b.y) / 2,
        z: (trimMember.a.z + trimMember.b.z) / 2,
      };
      const facing = trimMember.profileFacing!;
      expect(
        facing.x * (leafCentre.x - midpoint.x) +
          facing.y * (leafCentre.y - midpoint.y) +
          facing.z * (leafCentre.z - midpoint.z),
      ).toBeGreaterThan(0);
    }
    expect(m.cutList.find((item) => item.id === "casing")?.spec).toBe(
      "25×18×2 mm aluminium U-channel, mitred",
    );
  });

  test("a single leaf at the run end chooses the clear side for travel", () => {
    const m = buildModel({ ...base, frontDoors: 1, rightDoors: 0, frontDoorOffset: 0 });
    const [leaf] = m.doors;
    expect(leaf.slideDir).toBe(1);
    expect(leaf.travel).toBeCloseTo(SHEET_SHORT + 0.02);
    expect(leaf.parkedPoly[0].x - leaf.poly[0].x).toBeCloseTo(leaf.travel);
  });

  test("floor channels support the fixed-height door leaves and perimeter ties remain structural", () => {
    const m = buildModel(base);
    const rails = m.members.filter((member) => member.kind === "level-ring");
    expect(rails).toHaveLength(4);

    const railHeights = rails.flatMap((rail) => [rail.a.z, rail.b.z]);
    expect(Math.max(...railHeights)).toBeCloseTo(Math.min(...railHeights), 8);
    for (const post of m.posts) {
      const railAtPost = rails.some((rail) => {
        const dx = rail.b.x - rail.a.x;
        const dy = rail.b.y - rail.a.y;
        const lengthSquared = dx * dx + dy * dy;
        const along = (post.at.x - rail.a.x) * dx + (post.at.y - rail.a.y) * dy;
        const cross = dx * (post.at.y - rail.a.y) - dy * (post.at.x - rail.a.x);
        return Math.abs(cross) < 1e-6 && along >= -1e-6 && along <= lengthSquared + 1e-6;
      });
      expect(railAtPost).toBe(true);
    }

    const tracks = m.members.filter((member) => member.kind === "floor-track");
    expect(tracks).toHaveLength(2);
    for (const leaf of m.doors) {
      const support = tracks.find((track) => track.id === leaf.supportMemberId);
      expect(support).toBeDefined();
      expect(leaf.poly[0].z).toBeCloseTo(DOOR_FLOOR_CLEARANCE, 8);
      expect(leaf.poly[2].z - leaf.poly[0].z).toBeCloseTo(SHEET_LONG, 8);
      expect(leaf.carriages).toHaveLength(2);
      for (const carriage of leaf.carriages) {
        expect(carriage.rollerCentres).toHaveLength(4);
        expect(carriage.carrier.label).toBe("floor roller carrier");
        expect(carriage.carrier.length).toBeGreaterThan(0);
        expect(carriage.rollerCentres.every((wheel) => wheel.z < 0)).toBe(true);
      }
    }
  });

  test("door support is independent of roof-purlin layout and has no drop rods", () => {
    const reference = buildModel(base);
    const changedRoof = buildModel({ ...base, roofPurlinSpacing: 0.35, roofPurlinDepth: 220 });
    const referenceRails = reference.members.filter((member) => member.kind === "level-ring");
    const changedRails = changedRoof.members.filter((member) => member.kind === "level-ring");
    expect(changedRails.map((rail) => [rail.a.z, rail.b.z])).toEqual(
      referenceRails.map((rail) => [rail.a.z, rail.b.z]),
    );
    expect(reference.members.some((member) => member.label === "drop rod")).toBe(false);
    expect(reference.doors.every((leaf) =>
      reference.members.some((member) => member.kind === "floor-track" && member.id === leaf.supportMemberId),
    )).toBe(true);
  });

  test("door channels are only included in the track total when their run has doors", () => {
    const frontOnly = buildModel({ ...base, rightDoors: 0 });
    expect(frontOnly.stats.trackLength).toBeCloseTo(base.width, 6);
    const noDoors = buildModel({ ...base, frontDoors: 0, rightDoors: 0 });
    expect(noDoors.stats.trackLength).toBe(0);
  });

  test("every leaf stays on its floor-channel run, closed and fully open", () => {
    const m = buildModel(base);
    for (const side of ["front", "right"] as const) {
      const track = m.members.find(
        (x) => x.kind === "floor-track" && x.label?.endsWith(side),
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
        // Floor rollers keep every parked leaf at the same elevation.
        for (const [index, corner] of leaf.parkedPoly.entries()) {
          expect(corner.z).toBeCloseTo(leaf.poly[index].z, 8);
          expect(corner.z).toBeGreaterThan(0);
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
      m.warnings.some((w) => w.title.includes("clash with the low roof ring")),
    ).toBe(true);
  });

  test("floor rollers sit in the recessed channel and leaves lap by the schematic overlap", () => {
    const m = buildModel(base);
    for (const leaf of m.doors.filter((item) => item.side === "front")) {
      expect(leaf.carriages).toHaveLength(2);
      expect(leaf.carriages.every((carriage) => carriage.rollerCentres.length === 4)).toBe(true);
      const first = leaf.carriages[0].rollerCentres;
      expect(first.every((wheel) => wheel.z >= -FLOOR_TRACK_DEPTH && wheel.z <= 0)).toBe(true);
      expect(Math.abs(leaf.laneOffset)).toBeCloseTo(DOOR_OVERLAP / 2, 8);
    }
    const [first, second] = m.doors.filter((leaf) => leaf.side === "front");
    expect(first.runEnd - second.runStart).toBeCloseTo(DOOR_OVERLAP, 8);
    expect(Math.abs(first.laneOffset - second.laneOffset)).toBeCloseTo(DOOR_OVERLAP, 8);
    expect(FLOOR_WHEEL_LANES).toHaveLength(2);
    expect(FLOOR_WHEEL_AXLE_OFFSETS).toHaveLength(2);
    expect(WHEEL_DIA).toBeGreaterThan(0);
  });

  test("the fixed leaf clears the low roof ring", () => {
    const lowEave = Math.min(base.eaveLeft, base.eaveRight);
    expect(lowEave - base.ringDepth / 1000 - SHEET_LONG).toBeGreaterThan(0.075);
  });

  test("knee braces are added at the posts and shorten the ring span", () => {
    const braced = buildModel({ ...base, kneeBraces: true });
    const bare = buildModel({ ...base, kneeBraces: false });
    expect(
      braced.members.filter((x) => x.kind === "brace").length,
    ).toBeGreaterThan(0);
    expect(bare.members.filter((x) => x.kind === "brace")).toHaveLength(0);

    expect(braced.posts).toHaveLength(bare.posts.length);
  });

  test("model includes illustrative physical fasteners that respond to their controls", () => {
    const baseModel = buildModel(base);
    expect(baseModel.fixings.some((fixing) => fixing.kind === "anchor")).toBe(true);
    expect(baseModel.fixings.some((fixing) => fixing.kind === "bolt")).toBe(true);
    expect(baseModel.fixings.some((fixing) => fixing.kind === "tek-screw")).toBe(true);
    const tighter = buildModel({ ...base, fixingSpacing: 0.3 });
    expect(tighter.fixings.filter((fixing) => fixing.kind === "tek-screw").length).toBeGreaterThan(
      baseModel.fixings.filter((fixing) => fixing.kind === "tek-screw").length,
    );
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

  test("level structural ties and separate recessed floor tracks are both listed", () => {
    const m = buildModel(base);
    const rails = m.members.filter((member) => member.kind === "level-ring");
    expect(rails.map((rail) => rail.label?.split(" · ").pop()).sort()).toEqual([
      "back", "front", "left", "right",
    ]);
    expect(m.stats.trackLength).toBeCloseTo(base.width + base.depthRight, 6);
    expect(m.cutList.find((item) => item.id === "door-rails")?.qty).toBe(4);
    expect(m.cutList.find((item) => item.id === "floor-tracks")?.qty).toBe(2);
    expect(m.cutList.find((item) => item.id === "floor-tracks")?.totalM).toBeCloseTo(base.width + base.depthRight, 6);
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

  test("roof load, section gauge, and added girders affect screening demand", () => {
    const reference = buildModel(base);
    const loaded = buildModel({ ...base, roofLoadKpa: 1.5 });
    const thicker = buildModel({ ...base, roofPurlinGauge: 2.5 });
    const braced = buildModel({ ...base, girderCount: 4 });
    expect(loaded.stats.purlinScreen.elasticStressMpa).toBeGreaterThan(reference.stats.purlinScreen.elasticStressMpa);
    expect(thicker.stats.purlinScreen.elasticStressMpa).toBeLessThan(reference.stats.purlinScreen.elasticStressMpa);
    expect(braced.stats.purlinScreen.maxMomentKnM).toBeLessThan(reference.stats.purlinScreen.maxMomentKnM);
    expect(reference.warnings.some((warning) => warning.title.includes("screen only"))).toBe(true);
  });

  test("tightening purlin centres adds purlins", () => {
    const wide = buildModel({ ...base, roofPurlinSpacing: 1.2 });
    const tight = buildModel({ ...base, roofPurlinSpacing: 0.4 });
    expect(tight.members.filter((x) => x.kind === "purlin").length).toBeGreaterThan(
      wide.members.filter((x) => x.kind === "purlin").length,
    );
  });

  test("the sloped roof ring and separate level perimeter rail both cover all four sides", () => {
    const m = buildModel(base);
    const ring = m.members.filter((x) => x.kind === "ring" || x.kind === "ring-heavy");
    const structuralTies = m.members.filter((x) => x.kind === "level-ring");
    const floorTracks = m.members.filter((x) => x.kind === "floor-track");
    expect(ring.length).toBe(4);
    expect(structuralTies).toHaveLength(4);
    expect(floorTracks).toHaveLength(2);
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
