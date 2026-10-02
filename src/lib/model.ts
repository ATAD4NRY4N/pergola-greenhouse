/**
 * Polyframe — parametric structure engine.
 *
 * Everything the drawings and the cut list render comes out of `buildModel()`.
 * Units: the UI works in metres and millimetres; all internal geometry is in
 * metres and only converted to mm at the cut-list boundary.
 *
 * Coordinate system (plan):
 *   x runs left -> right   (0 .. width)
 *   y runs back  -> front  (0 .. depth, the back edge sits on the log cabin)
 *   z is height above ground.
 *
 * The back and right sides are treated as open (they sit against the log
 * cabin and the brick wall / timber fence), so they carry structure only.
 */

export const SHEET_LONG = 2.438; // 8 ft
export const SHEET_SHORT = 1.219; // 4 ft

export type CornerId = "bl" | "br" | "fl" | "fr";
export type CornerFix = "rigid90" | "adjustable";
export type PolyWall = "twin" | "triple";
export type RingBuild = "single" | "double";

export interface Design {
  name: string;

  /* Footprint */
  width: number; // m, left -> right
  depthLeft: number; // m, back -> front on the left (the deep side)
  depthRight: number; // m, back -> front on the right

  /* Heights — top of the ring rail at each end of the mono-pitch */
  eaveLeft: number; // m
  eaveRight: number; // m

  /* Posts */
  postSize: number; // mm SHS
  postGauge: number; // mm wall
  baySpacing: number; // m maximum post centres on the perimeter
  kneeBraces: boolean; // 45 deg braces into the ring rail
  kneeBraceLength: number; // m, horizontal projection

  /* C purlin perimeter ring */
  ringDepth: number; // mm
  ringGauge: number; // mm
  ringBuildFrontBack: RingBuild;

  /* Z purlin roof frame */
  girderCount: number; // depth-wise primary Z girders (0-4)
  roofPurlinDepth: number; // mm
  roofPurlinGauge: number; // mm
  roofPurlinSpacing: number; // m centres

  /* Wall framing (front + left) */
  studSpacing: number; // m centres
  sillHeight: number; // m

  /* Polycarbonate */
  polyWall: PolyWall;
  polyThickness: number; // mm
  roofOverhang: number; // m all round

  /* Sliding doors */
  doorLeafWidth: number; // m (1.219 or 2.438)
  doorLeafHeight: number; // m (1.219 or 2.438)
  frontDoors: number; // number of leaves on the front run
  leftDoors: number; // number of leaves on the left run
  frontDoorOffset: number; // m in from the left corner
  leftDoorOffset: number; // m back from the front-left corner
  doorOpen: number; // 0..1 — display only
  glazeFront: boolean;
  glazeLeft: boolean;

  /* Corner fixings */
  corners: Record<CornerId, CornerFix>;
}

export const DEFAULT_DESIGN: Design = {
  name: "Rear garden lean-to",
  width: 8.5,
  depthLeft: 8.0,
  depthRight: 7.0,
  eaveLeft: 2.95,
  eaveRight: 3.7,
  postSize: 50,
  postGauge: 3,
  baySpacing: 2.2,
  kneeBraces: true,
  kneeBraceLength: 0.9,
  ringDepth: 100,
  ringGauge: 1.8,
  ringBuildFrontBack: "double",
  girderCount: 2,
  roofPurlinDepth: 150,
  roofPurlinGauge: 1.6,
  roofPurlinSpacing: 0.6,
  studSpacing: 1.1,
  sillHeight: 0.3,
  polyWall: "twin",
  polyThickness: 4,
  roofOverhang: 0.3,
  doorLeafWidth: SHEET_SHORT,
  doorLeafHeight: SHEET_LONG,
  frontDoors: 2,
  leftDoors: 2,
  frontDoorOffset: 2.4,
  leftDoorOffset: 2.2,
  doorOpen: 0,
  glazeFront: true,
  glazeLeft: true,
  corners: { bl: "rigid90", br: "rigid90", fl: "adjustable", fr: "adjustable" },
};

/* ------------------------------------------------------------------ */
/* Geometry primitives                                                 */
/* ------------------------------------------------------------------ */

export interface Vec2 {
  x: number;
  y: number;
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Member {
  id: string;
  kind: MemberKind;
  a: Vec3;
  b: Vec3;
  /** Cut length in metres, measured along the member. */
  length: number;
  label?: string;
}

export type MemberKind =
  | "post"
  | "ring"
  | "ring-heavy"
  | "stud"
  | "sill"
  | "girder"
  | "purlin"
  | "track"
  | "doorframe"
  | "brace";

export interface Panel {
  id: string;
  kind: "roof" | "wall" | "door";
  poly: Vec3[];
  opacity: number;
  label?: string;
}

export interface PostNode {
  id: string;
  at: Vec2;
  height: number;
  corner: CornerId | null;
}

export interface DoorLeaf {
  id: string;
  side: "front" | "left";
  /** Along-wall parameter of the leaf centre, 0..1 of the run length. */
  runStart: number;
  runEnd: number;
  poly: Vec3[];
  /** Parked position of the leaf (already offset by `doorOpen`). */
  parkedPoly: Vec3[];
  width: number;
  height: number;
}

export interface WallBay {
  id: string;
  side: "front" | "left";
  type: "glazed" | "door" | "open";
  poly: Vec3[];
  /** Along-wall centre, used for elevations. */
  centre: number;
  width: number;
  height: number;
}

export interface SheetCell {
  id: string;
  /** Index in the sheeting grid. */
  col: number;
  row: number;
  full: boolean;
  usedArea: number; // m^2 actually covered
  wasteArea: number; // m^2 of the sheet wasted
  poly: Vec3[];
  /** Trimmed size if the sheet has to be cut, else null. */
  cut: { w: number; h: number } | null;
}

export interface CornerInfo {
  id: CornerId;
  label: string;
  at: Vec2;
  angleDeg: number;
  fix: CornerFix;
  square: boolean;
  ok: boolean;
  note: string;
}

export interface Warning {
  level: "info" | "warn" | "error";
  title: string;
  detail: string;
}

export interface CutListItem {
  id: string;
  group: string;
  item: string;
  spec: string;
  qty: number;
  unit: string;
  lengthMm?: number;
  /** Total metres of section required (for steel). */
  totalM?: number;
  note?: string;
}

export interface Model {
  design: Design;
  plan: Record<CornerId, Vec2>;
  /** Plan depth at a given x. */
  depthAt: (x: number) => number;
  /** Top of structure at a given x. */
  eaveAt: (x: number) => number;
  roofPitchDeg: number;
  posts: PostNode[];
  members: Member[];
  panels: Panel[];
  roofSheets: SheetCell[];
  wallBays: WallBay[];
  doors: DoorLeaf[];
  corners: CornerInfo[];
  warnings: Warning[];
  cutList: CutListItem[];
  stats: {
    planArea: number;
    roofArea: number;
    glazedArea: number;
    sheetsRoofFull: number;
    sheetsRoofCut: number;
    sheetsWall: number;
    sheetsDoor: number;
    totalSheets: number;
    steelMetres: number;
    steelKg: number;
    governingPurlinSpan: number;
    trackLength: number;
    footprintW: number;
    footprintD: number;
  };
}

/* ------------------------------------------------------------------ */
/* Polygon helpers                                                     */
/* ------------------------------------------------------------------ */

function polyArea(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Sutherland–Hodgman clip of a convex subject polygon by a convex clip polygon. */
function clipPolygon(subject: Vec2[], clip: Vec2[]): Vec2[] {
  let output = subject;
  for (let i = 0; i < clip.length; i++) {
    const input = output;
    output = [];
    if (input.length === 0) break;
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const edge = { x: b.x - a.x, y: b.y - a.y };
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const pIn = edge.x * (p.y - a.y) - edge.y * (p.x - a.x) >= -1e-9;
      const qIn = edge.x * (q.y - a.y) - edge.y * (q.x - a.x) >= -1e-9;
      if (pIn) output.push(p);
      if (pIn !== qIn) {
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const ex = edge.x;
        const ey = edge.y;
        const denom = dx * ey - dy * ex;
        if (Math.abs(denom) > 1e-12) {
          const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / denom;
          output.push({ x: p.x + dx * t, y: p.y + dy * t });
        }
      }
    }
  }
  return output;
}

const dist3 = (a: Vec3, b: Vec3) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/* ------------------------------------------------------------------ */
/* Indicative section capacity tables                                  */
/* ------------------------------------------------------------------ */

/**
 * Indicative maximum simply-supported span (m) for a cold-formed Z purlin
 * carrying twinwall at roughly 600 mm centres. Calibrated against Z150x1.6 at
 * about 4.7 m; manufacturer tables always win.
 */
function zSpanCapacity(depthMm: number, gaugeMm: number): number {
  const d = depthMm / 1000;
  const t = Math.max(gaugeMm, 1) / 1000;
  return Math.round((1.914 * Math.pow(d, 1.224) / Math.sqrt(t)) * 10) / 10;
}

/** Indicative maximum span (m) for a C purlin used as a ring beam. */
function cSpanCapacity(depthMm: number, gaugeMm: number): number {
  const d = depthMm / 1000;
  const t = Math.max(gaugeMm, 1) / 1000;
  return Math.round((2.3 * Math.pow(d, 1.224) / Math.sqrt(t)) * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* The engine                                                          */
/* ------------------------------------------------------------------ */

export function buildModel(input: Design): Model {
  const d: Design = { ...DEFAULT_DESIGN, ...input };
  const W = d.width;
  const dL = d.depthLeft;
  const dR = d.depthRight;
  const zL = d.eaveLeft;
  const zR = d.eaveRight;

  const plan: Record<CornerId, Vec2> = {
    bl: { x: 0, y: 0 },
    br: { x: W, y: 0 },
    fr: { x: W, y: dR },
    fl: { x: 0, y: dL },
  };

  const depthAt = (x: number) => dL + ((dR - dL) * x) / W;
  const eaveAt = (x: number) => zL + ((zR - zL) * x) / W;
  const roofPitchDeg = (Math.atan2(zR - zL, W) * 180) / Math.PI;

  const maxDepth = Math.max(dL, dR);
  const members: Member[] = [];
  const panels: Panel[] = [];
  const warnings: Warning[] = [];

  let mid = 0;
  const mid_ = () => `${mid++}`;

  /* ---------------- Posts (perimeter only, no internal posts) ------- */

  const posts: PostNode[] = [];
  const postSeen = new Set<string>();
  const addPost = (p: Vec2, corner: CornerId | null) => {
    const key = `${p.x.toFixed(3)}|${p.y.toFixed(3)}`;
    if (postSeen.has(key)) return;
    postSeen.add(key);
    posts.push({
      id: `post-${posts.length}`,
      at: p,
      height: eaveAt(p.x),
      corner,
    });
  };

  /** Evenly spread posts along a run, honouring the max bay spacing. */
  const addRunPosts = (
    a: Vec2,
    b: Vec2,
    cornerA: CornerId | null,
    cornerB: CornerId | null,
  ) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const bays = Math.max(1, Math.ceil(len / d.baySpacing));
    for (let i = 0; i <= bays; i++) {
      const t = i / bays;
      addPost(
        { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        i === 0 ? cornerA : i === bays ? cornerB : null,
      );
    }
  };

  addRunPosts(plan.bl, plan.br, "bl", "br"); // back  — log cabin
  addRunPosts(plan.br, plan.fr, "br", "fr"); // right — brick wall
  addRunPosts(plan.fr, plan.fl, "fr", "fl"); // front — doors
  addRunPosts(plan.fl, plan.bl, "fl", "bl"); // left  — doors

  posts.sort((p, q) => p.at.x - q.at.x || p.at.y - q.at.y);

  for (const p of posts) {
    members.push({
      id: mid_(),
      kind: "post",
      a: { x: p.at.x, y: p.at.y, z: 0 },
      b: { x: p.at.x, y: p.at.y, z: p.height },
      length: p.height,
      label: `${d.postSize}\u00d7${d.postSize}\u00d7${d.postGauge} SHS`,
    });
  }

  /* ---------------- Knee braces ------------------------------------- */

  const ringD = d.ringDepth / 1000;
  const ringZ = (x: number) => Math.max(0.15, eaveAt(x) - ringD / 2);

  // 45 degree braces from each post head into the ring rail. They are the
  // only way to shorten the front and back ring span without putting a post
  // inside the growing space.
  const braceLen = Math.min(
    d.kneeBraceLength,
    Math.max(d.baySpacing * 0.45, 0.3),
  );
  let braceCount = 0;
  if (d.kneeBraces) {
    for (const p of posts) {
      const top = ringZ(p.at.x);
      const zLow = top - braceLen;
      if (zLow < 0.35) continue;
      const runsHere: [Vec2, Vec2][] = [
        [plan.bl, plan.br],
        [plan.br, plan.fr],
        [plan.fr, plan.fl],
        [plan.fl, plan.bl],
      ];
      for (const [a, b] of runsHere) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        for (const dir of [1, -1]) {
          const hx = p.at.x + ux * braceLen * dir;
          const hy = p.at.y + uy * braceLen * dir;
          if (hx < -0.05 || hx > W + 0.05) continue;
          const a3: Vec3 = { x: p.at.x, y: p.at.y, z: zLow };
          const b3: Vec3 = { x: hx, y: hy, z: ringZ(hx) };
          const l = Math.hypot(hx - p.at.x, hy - p.at.y, b3.z - a3.z);
          if (l < 0.2) continue;
          members.push({
            id: mid_(),
            kind: "brace",
            a: a3,
            b: b3,
            length: l,
            label: "knee brace",
          });
          braceCount++;
        }
      }
    }
  }

  /* ---------------- C purlin perimeter ring ------------------------- */

  const ringRuns: {
    id: string;
    a: CornerId;
    b: CornerId;
    build: RingBuild;
  }[] = [
    { id: "back", a: "bl", b: "br", build: "single" },
    { id: "right", a: "br", b: "fr", build: "single" },
    {
      id: "front",
      a: "fr",
      b: "fl",
      build: d.ringBuildFrontBack,
    },
    { id: "left", a: "fl", b: "bl", build: "single" },
  ];

  const ringInfo: { side: string; len: number; build: RingBuild }[] = [];
  for (const run of ringRuns) {
    const a2 = plan[run.a];
    const b2 = plan[run.b];
    const length = Math.hypot(b2.x - a2.x, b2.y - a2.y);
    ringInfo.push({ side: run.id, len: length, build: run.build });
    const heavy = run.build === "double";
    members.push({
      id: mid_(),
      kind: heavy ? "ring-heavy" : "ring",
      a: { x: a2.x, y: a2.y, z: ringZ(a2.x) },
      b: { x: b2.x, y: b2.y, z: ringZ(b2.x) },
      length,
      label:
        run.build === "double"
          ? `2 \u00d7 C${d.ringDepth}\u00d7${d.ringGauge} bolted`
          : `C${d.ringDepth}\u00d7${d.ringGauge}`,
    });
  }

  /* ---------------- Roof frame: Z girders + Z purlins --------------- */

  // Primary Z girders run back -> front and land on the front & back ring
  // rails, so the 8.5 m opening is spanned by the ring, not by a purlin.
  const girders: Member[] = [];
  for (let i = 0; i < d.girderCount; i++) {
    const x = W * ((i + 1) / (d.girderCount + 1));
    const len = depthAt(x);
    const m: Member = {
      id: mid_(),
      kind: "girder",
      a: { x, y: 0, z: eaveAt(x) },
      b: { x, y: len, z: eaveAt(x) },
      length: len,
      label: `Z${d.roofPurlinDepth}\u00d7${d.roofPurlinGauge}`,
    };
    girders.push(m);
    members.push(m);
  }

  // Secondary Z purlins run left -> right across the girders.
  const purlinLines = Math.max(1, Math.ceil(maxDepth / d.roofPurlinSpacing));
  const purlins: Member[] = [];
  for (let i = 0; i <= purlinLines; i++) {
    const y = (maxDepth * i) / purlinLines;
    const len = Math.hypot(W, zR - zL);
    const m: Member = {
      id: mid_(),
      kind: "purlin",
      a: { x: 0, y, z: eaveAt(0) },
      b: { x: W, y, z: eaveAt(W) },
      length: len,
      label: `Z${d.roofPurlinDepth}\u00d7${d.roofPurlinGauge}`,
    };
    purlins.push(m);
    members.push(m);
  }

  // Governing span of the roof purlins = widest gap between supports
  // (girders plus the two ring rails at the ends).
  const supports = [0, ...girders.map((g) => g.a.x), W].sort((a, b) => a - b);
  let governingSpan = 0;
  for (let i = 1; i < supports.length; i++) {
    governingSpan = Math.max(governingSpan, supports[i] - supports[i - 1]);
  }
  if (girders.length === 0) governingSpan = W;

  /* ---------------- Roof sheeting layout ---------------------------- */

  const ov = d.roofOverhang;
  const sheetPoly: Vec2[] = [
    { x: 0, y: 0 },
    { x: SHEET_LONG, y: 0 },
    { x: SHEET_LONG, y: SHEET_SHORT },
    { x: 0, y: SHEET_SHORT },
  ];
  const roofClip: Vec2[] = [
    { x: -ov, y: -ov },
    { x: W + ov, y: -ov },
    { x: W + ov, y: maxDepth + ov },
    { x: -ov, y: maxDepth + ov },
  ];
  const structureClip: Vec2[] = [plan.bl, plan.br, plan.fr, plan.fl];

  const cols = Math.ceil((W + 2 * ov) / SHEET_LONG);
  const rows = Math.ceil((maxDepth + 2 * ov) / SHEET_SHORT);
  const fullArea = polyArea(sheetPoly);
  const roofSheets: SheetCell[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const origin = { x: c * SHEET_LONG, y: r * SHEET_SHORT };
      const world = sheetPoly.map((p) => ({ x: p.x + origin.x, y: p.y + origin.y }));
      const clipped = clipPolygon(world, roofClip);
      if (clipped.length < 3) continue;
      const usedArea = polyArea(clipped);
      if (usedArea < 0.02) continue;
      const frac = usedArea / fullArea;
      const poly = clipped.map(
        (p) => ({ x: p.x, y: p.y, z: eaveAt(Math.min(W, Math.max(0, p.x))) }) as Vec3,
      );
      roofSheets.push({
        id: `rs-${c}-${r}`,
        col: c,
        row: r,
        full: frac > 0.985,
        usedArea,
        wasteArea: fullArea - usedArea,
        poly,
        cut: frac > 0.985 ? null : null,
      });
    }
  }

  /* ---------------- Wall framing + glazing + doors ------------------ */

  const wallBays: WallBay[] = [];
  const doors: DoorLeaf[] = [];
  const doorSpecs: {
    side: "front" | "left";
    leaves: number;
    offset: number;
    runLen: number;
    toWorld: (t: number) => { x: number; y: number };
    topAt: (x: number) => number;
    glazed: boolean;
  }[] = [];

  doorSpecs.push({
    side: "front",
    leaves: d.frontDoors,
    offset: d.frontDoorOffset,
    runLen: Math.hypot(W, dR - dL),
    toWorld: (t) => {
      // t measured from the left corner towards the right corner along the front edge
      const frac = t / Math.hypot(W, dR - dL);
      return { x: W * frac, y: depthAt(W * frac) };
    },
    topAt: (x) => eaveAt(x),
    glazed: d.glazeFront,
  });

  doorSpecs.push({
    side: "left",
    leaves: d.leftDoors,
    offset: d.leftDoorOffset,
    runLen: dL,
    toWorld: (t) => ({ x: 0, y: dL - t }),
    topAt: () => zL,
    glazed: d.glazeLeft,
  });

  const doorLeafCount = d.frontDoors + d.leftDoors;

  for (const spec of doorSpecs) {
    const leafW = d.doorLeafWidth;
    const leafH = d.doorLeafHeight;
    const gap = 0.02;

    // --- door openings, expressed as [start, end] along the run ------
    const openings: [number, number][] = [];
    for (let i = 0; i < spec.leaves; i++) {
      const s = spec.offset + i * (leafW + gap);
      openings.push([s, s + leafW]);
    }

    // --- studs: even centres plus a jamb either side of each opening --
    const studAt: number[] = [0];
    const nStuds = Math.max(1, Math.ceil(spec.runLen / d.studSpacing));
    for (let i = 1; i < nStuds; i++) studAt.push((spec.runLen * i) / nStuds);
    for (const [s, e] of openings) {
      studAt.push(Math.max(0, s - 0.06), Math.min(spec.runLen, e + 0.06));
    }
    for (const [s, e] of openings) studAt.push(s, e);
    const studs = [...new Set(studAt.map((v) => Math.round(v * 1000) / 1000))]
      .filter((v) => v >= -1e-6 && v <= spec.runLen + 1e-6)
      .sort((a, b) => a - b);

    // --- head rail + sill rail ---------------------------------------
    const headDrop = 0.16 + 0.09; // casing + wheel/track zone
    const headOf = (t: number) => {
      const p = spec.toWorld(t);
      return spec.topAt(p.x) - d.ringDepth / 1000 - headDrop;
    };

    members.push({
      id: mid_(),
      kind: "sill",
      a: (() => {
        const p = spec.toWorld(0);
        return { x: p.x, y: p.y, z: d.sillHeight };
      })(),
      b: (() => {
        const p = spec.toWorld(spec.runLen);
        return { x: p.x, y: p.y, z: d.sillHeight };
      })(),
      length: spec.runLen,
      label: `C${d.ringDepth}\u00d7${d.ringGauge} sill`,
    });

    // --- vertical studs ----------------------------------------------
    for (const t of studs) {
      const p = spec.toWorld(t);
      const top = headOf(t);
      members.push({
        id: mid_(),
        kind: "stud",
        a: { x: p.x, y: p.y, z: d.sillHeight },
        b: { x: p.x, y: p.y, z: top },
        length: top - d.sillHeight,
        label: `C${d.ringDepth}\u00d7${d.ringGauge}`,
      });
    }

    // --- bays between studs ------------------------------------------
    for (let i = 0; i < studs.length - 1; i++) {
      const t0 = studs[i];
      const t1 = studs[i + 1];
      const c = (t0 + t1) / 2;
      const isDoor = openings.some(([s, e]) => c > s && c < e);
      const pa = spec.toWorld(t0);
      const pb = spec.toWorld(t1);
      const poly: Vec3[] = [
        { x: pa.x, y: pa.y, z: d.sillHeight },
        { x: pb.x, y: pb.y, z: d.sillHeight },
        { x: pb.x, y: pb.y, z: headOf(t1) },
        { x: pa.x, y: pa.y, z: headOf(t0) },
      ];
      wallBays.push({
        id: `bay-${spec.side}-${i}`,
        side: spec.side,
        type: isDoor ? "door" : spec.glazed ? "glazed" : "open",
        poly,
        centre: c,
        width: t1 - t0,
        height: headOf(t1) - d.sillHeight,
      });
      if (!isDoor && spec.glazed) {
        panels.push({ id: `wp-${spec.side}-${i}`, kind: "wall", poly, opacity: 0.18 });
      }
    }

    // --- sliding doors ------------------------------------------------
    for (let i = 0; i < spec.leaves; i++) {
      const [s, e] = openings[i];
      const p0 = spec.toWorld(s);
      const p1 = spec.toWorld(e);
      const head = headOf(s);
      const bottom = Math.max(0.02, head - leafH);
      const poly: Vec3[] = [
        { x: p0.x, y: p0.y, z: bottom },
        { x: p1.x, y: p1.y, z: bottom },
        { x: p1.x, y: p1.y, z: bottom + leafH },
        { x: p0.x, y: p0.y, z: bottom + leafH },
      ];
      // Sliding: each leaf parks one leaf-width to one side, opening a bay.
      const slide = i * (leafW + gap);
      const slideDir = spec.side === "front" ? -1 : 1;
      const t0 = s + slide * slideDir;
      const t1 = e + slide * slideDir;
      const q0 = spec.toWorld(t0);
      const q1 = spec.toWorld(t1);
      const parkedPoly: Vec3[] = [
        { x: q0.x, y: q0.y, z: bottom },
        { x: q1.x, y: q1.y, z: bottom },
        { x: q1.x, y: q1.y, z: bottom + leafH },
        { x: q0.x, y: q0.y, z: bottom + leafH },
      ];

      const leaf: DoorLeaf = {
        id: `door-${spec.side}-${i}`,
        side: spec.side,
        runStart: t0,
        runEnd: t1,
        poly,
        parkedPoly,
        width: leafW,
        height: leafH,
      };
      doors.push(leaf);
      panels.push({ id: `dp-${spec.side}-${i}`, kind: "door", poly, opacity: 0.32 });

      // casing / trim around the leaf: four mitred sticks
      members.push({
        id: mid_(),
        kind: "doorframe",
        a: poly[0],
        b: poly[1],
        length: dist3(poly[0], poly[1]),
        label: "casing",
      });
      members.push({
        id: mid_(),
        kind: "doorframe",
        a: poly[3],
        b: poly[2],
        length: dist3(poly[3], poly[2]),
        label: "casing",
      });
      members.push({
        id: mid_(),
        kind: "doorframe",
        a: poly[0],
        b: poly[3],
        length: dist3(poly[3], poly[0]),
        label: "casing",
      });
      members.push({
        id: mid_(),
        kind: "doorframe",
        a: poly[1],
        b: poly[2],
        length: dist3(poly[2], poly[1]),
        label: "casing",
      });
      // two track wheels / hangers
      for (const f of [0.22, 0.78]) {
        const p = {
          x: p0.x + (p1.x - p0.x) * f,
          y: p0.y + (p1.y - p0.y) * f,
          z: bottom + leafH,
        };
        members.push({
          id: mid_(),
          kind: "track",
          a: p,
          b: { ...p, z: bottom + leafH + 0.12 },
          length: 0.12,
          label: "wheel",
        });
      }
    }

    // --- door track C purlin ------------------------------------------
    const trackFrom = Math.max(
      0,
      openings.length
        ? Math.min(...openings.map(([s]) => s)) - (spec.leaves * (leafW + 0.02))
        : 0,
    );
    const trackTo = Math.min(
      spec.runLen,
      openings.length
        ? Math.max(...openings.map(([, e]) => e)) + 0.15
        : spec.runLen,
    );
    if (spec.leaves > 0) {
      const pa = spec.toWorld(trackFrom);
      const pb = spec.toWorld(trackTo);
      members.push({
        id: mid_(),
        kind: "track",
        a: { x: pa.x, y: pa.y, z: headOf(trackFrom) + leafH + 0.12 },
        b: { x: pb.x, y: pb.y, z: headOf(trackTo) + leafH + 0.12 },
        length: dist3(
          { x: pa.x, y: pa.y, z: headOf(trackFrom) + leafH + 0.12 },
          { x: pb.x, y: pb.y, z: headOf(trackTo) + leafH + 0.12 },
        ),
        label: "track C purlin",
      });
    }
  }

  /* ---------------- Corner fixings ---------------------------------- */

  const angleAt = (p: Vec2, a: Vec2, b: Vec2) => {
    const v1 = { x: a.x - p.x, y: a.y - p.y };
    const v2 = { x: b.x - p.x, y: b.y - p.y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    const c = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
    return (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI;
  };

  const cornerDefs: {
    id: CornerId;
    label: string;
    neighbours: [CornerId, CornerId];
  }[] = [
    { id: "bl", label: "Back-left", neighbours: ["br", "fl"] },
    { id: "br", label: "Back-right", neighbours: ["bl", "fr"] },
    { id: "fr", label: "Front-right", neighbours: ["br", "fl"] },
    { id: "fl", label: "Front-left", neighbours: ["bl", "fr"] },
  ];

  const corners: CornerInfo[] = cornerDefs.map((c) => {
    const angle = angleAt(
      plan[c.id],
      plan[c.neighbours[0]],
      plan[c.neighbours[1]],
    );
    const square = Math.abs(angle - 90) < 0.25;
    const fix = d.corners[c.id];
    const ok = fix === "adjustable" || square;
    return {
      id: c.id,
      label: c.label,
      at: plan[c.id],
      angleDeg: angle,
      fix,
      square,
      ok,
      note: ok
        ? square
          ? "Square — rigid 90\u00b0 corner plate is fine."
          : "Square — rigid plate fits, adjustable also fine."
        : `Corner is ${angle.toFixed(1)}\u00b0, not 90\u00b0 — a rigid plate cannot be used here.`,
    };
  });

  /* ---------------- Roof sheet panel surfaces ------------------------ */

  for (const s of roofSheets) {
    panels.push({ id: s.id, kind: "roof", poly: s.poly, opacity: 0.16 });
  }

  /* ---------------- Cut list ----------------------------------------- */

  const cutList: CutListItem[] = [];
  const sheetCount = doorLeafCount;

  cutList.push({
    id: "posts",
    group: "Steel",
    item: "SHS corner & perimeter posts",
    spec: `${d.postSize}\u00d7${d.postSize}\u00d7${d.postGauge} mm SHS`,
    qty: posts.length,
    unit: "lengths",
    lengthMm: Math.ceil(Math.max(...posts.map((p) => p.height), 0) * 1000),
    totalM: posts.reduce((a, p) => a + p.height, 0),
    note: "Cut to one length; the ring bolts straight onto the head.",
  });

  cutList.push({
    id: "postfeet",
    group: "Steel",
    item: "SHS base plates + post feet",
    spec: `${d.postSize} mm SHS base plate, 8 mm, galv`,
    qty: posts.length,
    unit: "no.",
    note: "One per post, set on an 18 mm level peg in a concrete pad.",
  });

  for (const r of ringInfo) {
    cutList.push({
      id: `ring-${r.side}`,
      group: "Steel",
      item: `Perimeter ring — ${r.side} run`,
      spec:
        r.build === "double"
          ? `2 \u00d7 C${d.ringDepth}\u00d7${d.ringGauge} mm, bolted back to back`
          : `C${d.ringDepth}\u00d7${d.ringGauge} mm`,
      qty: r.build === "double" ? 2 : 1,
      unit: "lengths",
      lengthMm: Math.ceil(r.len * 1000) + 60,
      totalM: r.len * (r.build === "double" ? 2 : 1),
      note:
        r.side === "front" || r.side === "back"
          ? "Slope cut at the fall angle; 45\u00b0 mitre at both corners."
          : "45\u00b0 mitre at both corners.",
    });
  }

  cutList.push({
    id: "girders",
    group: "Steel",
    item: "Primary Z girders (back to front)",
    spec: `Z${d.roofPurlinDepth}\u00d7${d.roofPurlinGauge} mm`,
    qty: d.girderCount,
    unit: "lengths",
    lengthMm: Math.ceil(Math.max(...girders.map((g) => g.length), 0) * 1000),
    totalM: girders.reduce((a, g) => a + g.length, 0),
    note: "Each one spans between the front and back ring rails.",
  });

  cutList.push({
    id: "purlins",
    group: "Steel",
    item: "Roof Z purlins (left to right)",
    spec: `Z${d.roofPurlinDepth}\u00d7${d.roofPurlinGauge} mm`,
    qty: purlins.length,
    unit: "lengths",
    lengthMm: Math.ceil(Math.hypot(W, zR - zL) * 1000),
    totalM: purlins.reduce((a, g) => a + g.length, 0),
    note: `Cut to the rafter length with the ${roofPitchDeg.toFixed(1)}\u00b0 fall.`,
  });

  cutList.push({
    id: "studs",
    group: "Steel",
    item: "Wall studs, front & left",
    spec: `C${d.ringDepth}\u00d7${d.ringGauge} mm`,
    qty: members.filter((m) => m.kind === "stud").length,
    unit: "lengths",
    lengthMm: Math.ceil((zL - d.ringDepth / 1000 - 0.25 - d.sillHeight) * 1000),
    note: "Cut to suit; each side varies with the fall.",
  });

  cutList.push({
    id: "sills",
    group: "Steel",
    item: "Sill / base rails",
    spec: `C${d.ringDepth}\u00d7${d.ringGauge} mm`,
    qty: 2,
    unit: "lengths",
    lengthMm: Math.ceil((W + dL) * 500),
    note: "Cut into two, one per glazed run.",
  });

  cutList.push({
    id: "braces",
    group: "Steel",
    item: "Knee braces",
    spec: `C${Math.max(50, Math.round(d.ringDepth * 0.6))}\u00d7${Math.max(50, Math.round(d.ringDepth * 0.6))} mm, 45\u00b0`,
    qty: braceCount,
    unit: "no.",
    lengthMm: Math.ceil(Math.hypot(braceLen, braceLen) * 1000),
    totalM: braceCount * Math.hypot(braceLen, braceLen),
    note:
      braceCount > 0
        ? "One at each post, both directions. Halves the front and back ring span."
        : "Disabled — turn knee braces back on to shorten the front and back span.",
  });

  cutList.push({
    id: "hangers",
    group: "Steel",
    item: "Purlin hanger cleats",
    spec: `Pressed steel angle cleat + M10 set screw`,
    qty: members.filter((m) => m.kind === "purlin" || m.kind === "girder").length,
    unit: "no.",
    note: "One per purlin per bearing point, bolted through the purlin flange.",
  });

  cutList.push({
    id: "track",
    group: "Doors",
    item: "Sliding door track C purlin",
    spec: `C${d.ringDepth}\u00d7${d.ringGauge} mm`,
    qty: 2,
    unit: "lengths",
    lengthMm: Math.ceil((W + dL) * 500),
    note: "Hang off the ring rail on threaded drop rods.",
  });

  cutList.push({
    id: "wheels",
    group: "Doors",
    item: "Track wheels & hanger kits",
    spec: "Polycarb-safe wheel, 2 per leaf",
    qty: sheetCount * 2,
    unit: "no.",
  });

  cutList.push({
    id: "casing",
    group: "Doors",
    item: "Door casing / trim",
    spec: `25\u00d725 mm aluminium box, mitred`,
    qty: sheetCount,
    unit: "sets",
    totalM: sheetCount * 2 * (d.doorLeafWidth + d.doorLeafHeight),
    note: "Four sticks per leaf plus a mid rail if the leaf is two sheets tall.",
  });

  const roofFull = roofSheets.filter((s) => s.full).length;
  const roofCut = roofSheets.filter((s) => !s.full).length;
  cutList.push({
    id: "roofpoly",
    group: "Polycarbonate",
    item: `Roof sheets (${d.polyWall}wall ${d.polyThickness} mm)`,
    spec: `2438 \u00d7 1219 mm`,
    qty: roofSheets.length,
    unit: "sheets",
    note: `${roofFull} whole, ${roofCut} trimmed to the trapezoid edge.`,
  });

  const wallGlazed = wallBays.filter((b) => b.type === "glazed").length;
  cutList.push({
    id: "wallpoly",
    group: "Polycarbonate",
    item: "Fixed wall panels (front & left)",
    spec: `2438 \u00d7 1219 mm`,
    qty: wallGlazed,
    unit: "sheets",
    note: "Cut to the head rail; allow 10 mm expansion gap all round.",
  });

  cutList.push({
    id: "doorpoly",
    group: "Polycarbonate",
    item: "Sliding door infill",
    spec: `2438 \u00d7 1219 mm`,
    qty: sheetCount,
    unit: "sheets",
    note:
      d.doorLeafHeight <= SHEET_SHORT && d.doorLeafWidth <= SHEET_SHORT
        ? "One sheet per leaf, turned on its side."
        : "One sheet per leaf, portrait, trimmed into the casing.",
  });

  cutList.push({
    id: "fixings",
    group: "Fixings",
    item: "Polycarb tek screws + neoprene washers",
    spec: "6 \u00d7 16 mm, low-profile head",
    qty: Math.round(
      (roofSheets.length * 9 +
        wallGlazed * 6 +
        sheetCount * 10 +
        8) *
        1.1,
    ),
    unit: "no.",
    note: "10% spare. Never screw polycarb direct to an unpurlined edge.",
  });

  cutList.push({
    id: "bolts",
    group: "Fixings",
    item: "M10 hex set screws + nuts",
    spec: "Grade 8.8, galvanised",
    qty: members.filter((m) => m.kind !== "post").length * 2,
    unit: "no.",
    note: "Purlin-to-purlin and corner connections.",
  });

  cutList.push({
    id: "cornerplates",
    group: "Fixings",
    item: "Corner plates",
    spec: d.corners.bl === "rigid90" ? "Rigid 90\u00b0 angle plate" : "Adjustable gusset",
    qty: corners.filter((c) => c.fix === "rigid90").length,
    unit: "no.",
    note: "Rigid at square corners, slotted gusset everywhere else.",
  });

  /* ---------------- Warnings ---------------------------------------- */

  const zCap = zSpanCapacity(d.roofPurlinDepth, d.roofPurlinGauge);
  if (governingSpan > zCap) {
    warnings.push({
      level: "warn",
      title: `Roof purlin span ${governingSpan.toFixed(2)} m is long for a Z${d.roofPurlinDepth}`,
      detail:
        `Indicative capacity for a Z${d.roofPurlinDepth}\u00d7${d.roofPurlinGauge} at ` +
        `${(governingSpan * 1.0).toFixed(1)} m centres is around ${zCap.toFixed(1)} m. ` +
        `Add a girder (currently ${d.girderCount}), double the purlin, or drop ` +
        `the purlin centres. Check the manufacturer table before ordering.`,
    });
  }

  // The front and back ring rails span the full width. Knee braces at each
  // end knock the effective span back by twice the brace projection.
  const bracedSpan = Math.max(
    0.5,
    W - (braceCount > 0 ? braceLen * 2 : 0),
  );
  const cCap = cSpanCapacity(
    d.ringDepth * (d.ringBuildFrontBack === "double" ? 1.45 : 1),
    d.ringGauge,
  );
  if (bracedSpan > cCap) {
    warnings.push({
      level: "warn",
      title: `Front / back ring spans ${bracedSpan.toFixed(2)} m${braceCount > 0 ? " with knee braces" : ""}`,
      detail:
        `A${d.ringBuildFrontBack === "double" ? "doubled" : "single"} ` +
        `C${d.ringDepth}\u00d7${d.ringGauge} is indicative to about ${cCap.toFixed(1)} m here. ` +
        (braceCount === 0
          ? "Turn the knee braces on, go deeper on the section, or drop the front and back posts to a closer spacing."
          : `Go deeper on the ring (C150 or C200), or close the post spacing so the braces do more of the work.`),
    });
  }

  for (const c of corners) {
    if (!c.ok) {
      warnings.push({
        level: "error",
        title: `${c.label} corner is ${c.angleDeg.toFixed(1)}\u00b0`,
        detail:
          `It is set to a rigid 90\u00b0 fixing. Either set it to adjustable, or set ` +
          `the two depths equal (${d.depthLeft.toFixed(2)} m vs ${d.depthRight.toFixed(2)} m) ` +
          `to square the plan up.`,
      });
    }
  }

  const headDrop = 0.25;
  const minHead = Math.min(zL, zR) - d.ringDepth / 1000 - headDrop;
  const doorSill = minHead - d.doorLeafHeight;
  if (d.doorLeafHeight > minHead) {
    warnings.push({
      level: "error",
      title: "Doors do not fit under the low end of the ring",
      detail:
        `A ${d.doorLeafHeight.toFixed(2)} m leaf plus the track needs about ` +
        `${(d.doorLeafHeight + 0.25 + d.ringDepth / 1000).toFixed(2)} m of ring height. ` +
        `The low end only gives ${minHead.toFixed(2)} m. Raise the eave or use a shorter leaf.`,
    });
  } else if (doorSill < 0.06) {
    warnings.push({
      level: "warn",
      title: `Doors only clear the floor by ${Math.round(doorSill * 1000)} mm`,
      detail:
        "A sliding leaf needs roughly 75 mm to sweep without catching the slab. " +
        `Raise the low eave by ${Math.ceil((0.075 - doorSill) * 1000)} mm, or drop to a single-sheet leaf.`,
    });
  }

  const frontRun = Math.hypot(W, dR - dL);
  if (d.frontDoors * d.doorLeafWidth + d.frontDoorOffset > frontRun + 0.4) {
    warnings.push({
      level: "warn",
      title: "Front doors run past the end of the front wall",
      detail: `The opening needs about ${(d.frontDoorOffset + d.frontDoors * d.doorLeafWidth).toFixed(2)} m of an ${frontRun.toFixed(2)} m run.`,
    });
  }
  if (d.leftDoors * d.doorLeafWidth + d.leftDoorOffset > dL + 0.4) {
    warnings.push({
      level: "warn",
      title: "Left doors run past the end of the left wall",
      detail: `The opening needs about ${(d.leftDoorOffset + d.leftDoors * d.doorLeafWidth).toFixed(2)} m of a ${dL.toFixed(2)} m run.`,
    });
  }

  if (Math.abs(roofPitchDeg) < 2.5) {
    warnings.push({
      level: "info",
      title: "Roof fall is only " + Math.abs(roofPitchDeg).toFixed(1) + "\u00b0",
      detail:
        "Polycarbonate sheds best at 5\u00b0 and up. Anything under 3\u00b0 will hold water " +
        "and dirt on the ribs. Raise the high eave or lower the low one.",
    });
  }

  if (d.baySpacing > 2.5) {
    warnings.push({
      level: "info",
      title: `Perimeter posts at ${d.baySpacing.toFixed(1)} m centres`,
      detail: "A tighter 2.0\u20132.2 m centres keeps the glazing bars straight and stops the rail sagging.",
    });
  }

  /* ---------------- Stats -------------------------------------------- */

  const roofArea = polyArea(structureClip) * Math.cos((roofPitchDeg * Math.PI) / 180);
  const glazedArea =
    wallBays
      .filter((b) => b.type === "glazed")
      .reduce((a, b) => a + b.width * b.height, 0) / 1000;

  const steelKg =
    cSteelKgPerM(d.ringDepth, d.ringGauge) * ringInfo.reduce((a, r) => a + r.len * (r.build === "double" ? 2 : 1), 0) +
    cSteelKgPerM(d.ringDepth, d.ringGauge) *
      (members.filter((m) => m.kind === "stud" || m.kind === "sill" || m.kind === "track").reduce((a, m) => a + m.length, 0)) +
    zSteelKgPerM(d.roofPurlinDepth, d.roofPurlinGauge) *
      (purlins.reduce((a, m) => a + m.length, 0) + girders.reduce((a, m) => a + m.length, 0)) +
    shsKgPerM(d.postSize, d.postGauge) * posts.reduce((a, p) => a + p.height, 0);

  const trackLength = members
    .filter((m) => m.kind === "track" && m.label === "track C purlin")
    .reduce((a, m) => a + m.length, 0);

  const stats: Model["stats"] = {
    planArea: polyArea(structureClip),
    roofArea,
    glazedArea,
    sheetsRoofFull: roofFull,
    sheetsRoofCut: roofCut,
    sheetsWall: wallGlazed,
    sheetsDoor: sheetCount,
    totalSheets: roofSheets.length + wallGlazed + sheetCount,
    steelMetres: members.reduce((a, m) => a + m.length, 0),
    steelKg: Math.round(steelKg),
    governingPurlinSpan: governingSpan,
    trackLength,
    footprintW: W,
    footprintD: maxDepth,
  };

  return {
    design: d,
    plan,
    depthAt,
    eaveAt,
    roofPitchDeg,
    posts,
    members,
    panels,
    roofSheets,
    wallBays,
    doors,
    corners,
    warnings,
    cutList,
    stats,
  };
}

/* ------------------------------------------------------------------ */
/* Section weight helpers                                              */
/* ------------------------------------------------------------------ */

/** kg per metre of a cold-formed C purlin, approximate. */
export function cSteelKgPerM(depthMm: number, gaugeMm: number): number {
  const d = depthMm / 1000;
  const w = (gaugeMm / 1000) * 0.785;
  // web + two flanges, less the corner radii
  return (2 * d * w + 2 * 0.05 * w) * 7850 * 1.08;
}

/** kg per metre of a cold-formed Z purlin, approximate. */
export function zSteelKgPerM(depthMm: number, gaugeMm: number): number {
  return cSteelKgPerM(depthMm, gaugeMm) * 1.04;
}

/** kg per metre of SHS, approximate. */
export function shsKgPerM(sizeMm: number, gaugeMm: number): number {
  const s = sizeMm / 1000;
  const t = gaugeMm / 1000;
  return (4 * (s - t) * t) * 7850 * 1.04;
}

export const SHEET_AREA = SHEET_LONG * SHEET_SHORT;
