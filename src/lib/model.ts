/**
 * Polyframe — parametric structure engine.
 *
 * Everything the drawings and the cut list render comes out of `buildModel()`.
 * Units: the UI works in metres and millimetres; all internal geometry is in
 * metres and only converted to mm at the cut-list boundary.
 *
 * Coordinate system (plan):
 *   x runs left -> right   (0 .. width)
 *   y runs back  -> front  (0 .. depth)
 *   z is height above ground.
 *
 * The front run is dead straight, so both front corners are a true 90 deg.
 * The offset lives on the back: with depthLeft > depthRight the back-left
 * corner reaches further away than the back-right one.
 *
 * The back and left sides are treated as open (they sit against the
 * wall / fence and the log cabin), so they carry structure only. Sliding
 * doors and glazing are on the front and right runs.
 */

export const SHEET_LONG = 2.438; // 8 ft
export const SHEET_SHORT = 1.219; // 4 ft

/**
 * A sliding door leaf is always exactly one 8x4 sheet stood on its side.
 * It is never two sheets and never a cut size — the whole point of hanging
 * a floor-level roller carriage is that a whole sheet drops straight in.
 */
export const DOOR_LEAF_W = SHEET_SHORT;
export const DOOR_LEAF_H = SHEET_LONG;

/** Illustrative floor-channel dimensions; confirm actual hardware before building. */
export const FLOOR_TRACK_DEPTH = 0.06;
export const FLOOR_TRACK_WIDTH = 0.12;
/** Schematic 25 mm lap for brush-sealed leaves; confirm the seal and track system. */
export const DOOR_OVERLAP = 0.025;
export const DOOR_LANE_OFFSET = DOOR_OVERLAP / 2;
/** Small illustrative clearance between the leaf and finished floor, metres. */
export const DOOR_FLOOR_CLEARANCE = 0.005;
/** Roller diameter and axle spacing for the illustrative floor carriages, metres. */
export const WHEEL_DIA = 0.05;
export const TROLLEY_AXLE_SPACING = 0.07;
/** C-channel proportions retained for rendering the separate structural perimeter members. */
export const TRACK_WIDTH = 0.06;
export const TRACK_LIP = 0.012;
const FLOOR_TRACK_BOTTOM = -FLOOR_TRACK_DEPTH;
const FLOOR_TRACK_CENTRE = FLOOR_TRACK_BOTTOM + FLOOR_TRACK_DEPTH / 2;
const FLOOR_WHEEL_CENTRE_Z = FLOOR_TRACK_BOTTOM + WHEEL_DIA / 2;
const FLOOR_LEAF_BOTTOM = DOOR_FLOOR_CLEARANCE;
const FLOOR_LEAF_TOP = FLOOR_LEAF_BOTTOM + DOOR_LEAF_H;
const FLOOR_WHEEL_LATERAL_OFFSET = 0.025;
export const FLOOR_WHEEL_LANES = [-FLOOR_WHEEL_LATERAL_OFFSET, FLOOR_WHEEL_LATERAL_OFFSET] as const;
export const FLOOR_WHEEL_AXLE_OFFSETS = [-TROLLEY_AXLE_SPACING / 2, TROLLEY_AXLE_SPACING / 2] as const;

export type CornerId = "bl" | "br" | "fl" | "fr";
export type CornerFix = "rigid90" | "adjustable";
export type PolyWall = "twin" | "triple";
export type RingBuild = "single" | "double";

export interface Design {
  name: string;

  /* Footprint. The front run is straight; the offset is on the back. */
  width: number; // m, left -> right
  depthLeft: number; // m, left run, front edge to back-left corner
  depthRight: number; // m, right run, front edge to back-right corner

  /* Heights — top of the ring rail at each end of the mono-pitch */
  eaveLeft: number; // m
  eaveRight: number; // m

  /* Posts */
  postSize: number; // mm SHS
  postGauge: number; // mm wall
  postCount: number; // total perimeter posts including four corners
  kneeBraces: boolean; // 45 deg braces into the ring rail
  kneeBraceLength: number; // m, horizontal projection
  kneeBraceSize: number; // mm, brace channel depth
  kneeBraceGauge: number; // mm, brace wall thickness

  /* C purlin perimeter ring */
  ringDepth: number; // mm
  ringGauge: number; // mm
  ringBuildFrontBack: RingBuild;

  /* Z purlin roof frame */
  girderCount: number; // depth-wise primary Z girders (0-4)
  roofPurlinDepth: number; // mm
  roofPurlinGauge: number; // mm
  roofPurlinSpacing: number; // m centres

  /* Preliminary roof-member screening inputs (not code design values). */
  roofLoadKpa: number; // kN/m² downward characteristic pressure on plan area
  steelYieldMpa: number; // nominal steel yield strength from product certificate

  /* Wall framing (front + left) */
  studSpacing: number; // m centres
  sillHeight: number; // m

  /* Polycarbonate */
  polyWall: PolyWall;
  polyThickness: number; // mm
  roofOverhang: number; // m all round

  /* Sliding doors — each leaf is one fixed 8x4 sheet; only count and
     position are adjustable. Doors sit on the front and right runs. */
  doorTrimDepth: number; // mm, U-channel return depth around the leaf edges
  doorTrimGauge: number; // mm, U-channel wall thickness

  frontDoors: number; // number of leaves on the front run
  rightDoors: number; // number of leaves on the right run
  frontDoorOffset: number; // m in from the front-left corner
  rightDoorOffset: number; // m back from the front-right corner
  doorOpen: number; // 0..1 — display only
  aluminiumTrimSize: number; // mm, U-channel face width around the door leaves
  fixingDiameter: number; // mm, illustrative tek screw / bolt head
  fixingSpacing: number; // m centres for roof sheet fasteners
  glazeFront: boolean;
  glazeRight: boolean;

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
  postCount: 16,
  kneeBraces: true,
  kneeBraceLength: 0.9,
  kneeBraceSize: 60,
  kneeBraceGauge: 2,
  ringDepth: 100,
  ringGauge: 1.8,
  ringBuildFrontBack: "double",
  girderCount: 2,
  roofPurlinDepth: 150,
  roofPurlinGauge: 1.6,
  roofPurlinSpacing: 0.6,
  roofLoadKpa: 0.75,
  steelYieldMpa: 250,
  studSpacing: 1.1,
  sillHeight: 0.3,
  polyWall: "twin",
  polyThickness: 4,
  roofOverhang: 0.3,
  frontDoors: 2,
  rightDoors: 2,
  frontDoorOffset: 2.4,
  rightDoorOffset: 2.2,
  doorOpen: 0,
  aluminiumTrimSize: 25,
  doorTrimDepth: 18,
  doorTrimGauge: 2,
  fixingDiameter: 6,
  fixingSpacing: 0.6,
  glazeFront: false,
  glazeRight: true,
  // Front corners are square, back corners are skewed by the offset.
  corners: { bl: "adjustable", br: "adjustable", fl: "rigid90", fr: "rigid90" },
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
  /** Optional section axes for edge trim: mouth direction and sheet normal. */
  profileFacing?: Vec3;
  profileNormal?: Vec3;
  label?: string;
}

export type MemberKind =
  | "post"
  | "ring"
  | "ring-heavy"
  | "level-ring"
  | "floor-track"
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

export type ComponentCategory =
  | "posts"
  | "c-purlins"
  | "z-purlins"
  | "braces"
  | "wall-framing"
  | "sheets"
  | "aluminium-trim"
  | "fixings";

export const COMPONENT_CATEGORIES: {
  id: ComponentCategory;
  label: string;
  color: string;
}[] = [
  { id: "posts", label: "SHS posts", color: "#c9d5e2" },
  { id: "c-purlins", label: "C-purlins", color: "#49c2a7" },
  { id: "z-purlins", label: "Z-purlins & girders", color: "#e4a747" },
  { id: "braces", label: "Knee braces", color: "#80aee0" },
  { id: "wall-framing", label: "Wall framing", color: "#99bd70" },
  { id: "sheets", label: "Polycarbonate", color: "#67cbe3" },
  { id: "aluminium-trim", label: "Aluminium trim", color: "#f1c877" },
  { id: "fixings", label: "Fixings & hardware", color: "#ed806c" },
];

export type FixingKind = "anchor" | "bolt" | "tek-screw";

export interface Fixing {
  id: string;
  kind: FixingKind;
  at: Vec3;
  diameter: number; // metres, illustrative head size
}

export type ComponentVisibility = Record<ComponentCategory, boolean>;

export const DEFAULT_COMPONENT_VISIBILITY: ComponentVisibility = {
  posts: true,
  "c-purlins": true,
  "z-purlins": true,
  braces: true,
  "wall-framing": true,
  sheets: true,
  "aluminium-trim": true,
  fixings: true,
};

export function memberComponent(kind: MemberKind): ComponentCategory {
  if (kind === "post") return "posts";
  if (kind === "ring" || kind === "ring-heavy" || kind === "level-ring") return "c-purlins";
  if (kind === "girder" || kind === "purlin") return "z-purlins";
  if (kind === "brace") return "braces";
  if (kind === "stud" || kind === "sill") return "wall-framing";
  if (kind === "doorframe") return "aluminium-trim";
  if (kind === "floor-track") return "c-purlins";
  return "fixings";
}

export function panelComponent(_kind: Panel["kind"]): ComponentCategory {
  return "sheets";
}

export function componentVisible(
  visibility: Partial<ComponentVisibility> | undefined,
  category: ComponentCategory,
): boolean {
  return visibility?.[category] ?? true;
}

export interface PostNode {
  id: string;
  at: Vec2;
  height: number;
  corner: CornerId | null;
}

export interface DoorRollerCarriage {
  id: string;
  /** Four schematic roller centres inside the recessed floor channel. */
  rollerCentres: Vec3[];
  /** Roller centres after the door has parked fully open. */
  parkedRollerCentres: Vec3[];
  carrier: Member;
  parkedCarrier: Member;
}

export interface DoorLeaf {
  id: string;
  side: "front" | "right";
  /** Closed position of the leaf along the run, in metres from the corner. */
  runStart: number;
  runEnd: number;
  /** Offset from the wall plane; alternating lanes let adjacent leaves lap. */
  laneOffset: number;
  /** Direction the leaf travels when it opens, and how far it goes. */
  slideDir: 1 | -1;
  travel: number;
  poly: Vec3[];
  /** The same leaf after it has slid fully open. */
  parkedPoly: Vec3[];
  width: number;
  height: number;
  /** Member id of the recessed floor channel guiding this leaf. */
  supportMemberId: string;
  /** Two floor-level roller carriages per leaf (illustrative). */
  carriages: DoorRollerCarriage[];
}

export interface WallBay {
  id: string;
  side: "front" | "right";
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
  /** Plan depth at a given x (the front run is straight, so this is flat). */
  depthAt: (x: number) => number;
  /** y of the sloped back run at a given x. */
  backAt: (x: number) => number;
  /** Top of structure at a given x. */
  eaveAt: (x: number) => number;
  roofPitchDeg: number;
  posts: PostNode[];
  members: Member[];
  panels: Panel[];
  fixings: Fixing[];
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
    maximumPostSpacing: number;
    trackLength: number;
    purlinScreen: {
      loadKpa: number;
      lineLoadKnM: number;
      maxMomentKnM: number;
      grossSectionModulusMm3: number;
      elasticStressMpa: number;
      yieldUtilization: number;
      deflectionMm: number;
      deflectionLimitMm: number;
    };
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
/* Transparent gross-section screening (not cold-formed design)         */
/* ------------------------------------------------------------------ */

/**
 * Approximate elastic section modulus for a plain web + two-flange Z/C shape.
 * Assumes 50 mm flanges and ignores lips, corner radii, effective-width/local
 * buckling, torsion and manufacturer-specific section properties.
 */
function grossSectionModulusMm3(depthMm: number, gaugeMm: number, flangeMm = 50): number {
  const d = Math.max(1, depthMm);
  const t = Math.max(0.1, Math.min(gaugeMm, d / 3));
  const b = Math.max(t, flangeMm);
  const inertia = (t * Math.pow(d, 3)) / 12 +
    2 * ((b * Math.pow(t, 3)) / 12 + b * t * Math.pow((d - t) / 2, 2));
  return inertia / (d / 2);
}

function makePurlinScreen(
  depthMm: number,
  gaugeMm: number,
  loadKpa: number,
  tributaryWidthM: number,
  spanM: number,
  yieldMpa: number,
) {
  const lineLoadKnM = loadKpa * tributaryWidthM;
  const maxMomentKnM = (lineLoadKnM * spanM * spanM) / 8;
  const sectionModulus = grossSectionModulusMm3(depthMm, gaugeMm);
  const elasticStressMpa = (maxMomentKnM * 1e6) / sectionModulus;
  const inertiaMm4 = sectionModulus * (depthMm / 2);
  const spanMm = spanM * 1000;
  // 1 kN/m equals 1 N/mm; E = 200 GPa for the elastic deflection estimate.
  const deflectionMm = (5 * lineLoadKnM * Math.pow(spanMm, 4)) / (384 * 200_000 * inertiaMm4);
  return {
    loadKpa,
    lineLoadKnM,
    maxMomentKnM,
    grossSectionModulusMm3: sectionModulus,
    elasticStressMpa,
    yieldUtilization: elasticStressMpa / Math.max(1, yieldMpa),
    deflectionMm,
    deflectionLimitMm: spanMm / 180,
  };
}

/* ------------------------------------------------------------------ */
/* The engine                                                          */
/* ------------------------------------------------------------------ */

export function buildModel(input: Design): Model {
  const requestedPostCount = Number.isFinite(input.postCount)
    ? Math.max(4, Math.min(60, Math.round(input.postCount)))
    : DEFAULT_DESIGN.postCount;
  const d: Design = { ...DEFAULT_DESIGN, ...input, postCount: requestedPostCount };
  const W = d.width;
  const dL = d.depthLeft;
  const dR = d.depthRight;
  const zL = d.eaveLeft;
  const zR = d.eaveRight;

  /* The front run is dead straight, so both front corners are a true 90 deg.
     The offset lives on the back: with depthLeft > depthRight the back-left
     corner reaches further away than the back-right one. */
  const frontY = Math.max(dL, dR);
  const backY0 = frontY - dL;
  const backY1 = frontY - dR;

  const plan: Record<CornerId, Vec2> = {
    bl: { x: 0, y: backY0 },
    br: { x: W, y: backY1 },
    fr: { x: W, y: frontY },
    fl: { x: 0, y: frontY },
  };

  /** y of the straight front run at a given x. */
  const depthAt = (_x: number) => frontY;
  /** y of the sloped back run at a given x. */
  const backAt = (x: number) => backY0 + ((backY1 - backY0) * x) / W;
  const eaveAt = (x: number) => zL + ((zR - zL) * x) / W;
  const roofPitchDeg = (Math.atan2(zR - zL, W) * 180) / Math.PI;

  const minY = Math.min(backY0, backY1);
  const maxDepth = frontY;
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

  const postEdges: { a: Vec2; b: Vec2; ca: CornerId; cb: CornerId; length: number; extra: number; remainder: number }[] = [
    { a: plan.bl, b: plan.br, ca: "bl", cb: "br", length: Math.hypot(plan.br.x - plan.bl.x, plan.br.y - plan.bl.y), extra: 0, remainder: 0 },
    { a: plan.br, b: plan.fr, ca: "br", cb: "fr", length: Math.hypot(plan.fr.x - plan.br.x, plan.fr.y - plan.br.y), extra: 0, remainder: 0 },
    { a: plan.fr, b: plan.fl, ca: "fr", cb: "fl", length: Math.hypot(plan.fl.x - plan.fr.x, plan.fl.y - plan.fr.y), extra: 0, remainder: 0 },
    { a: plan.fl, b: plan.bl, ca: "fl", cb: "bl", length: Math.hypot(plan.bl.x - plan.fl.x, plan.bl.y - plan.fl.y), extra: 0, remainder: 0 },
  ];
  const intermediatePosts = requestedPostCount - 4;
  const perimeterLength = postEdges.reduce((sum, edge) => sum + edge.length, 0);
  let allocatedPosts = 0;
  for (const edge of postEdges) {
    const exact = perimeterLength > 0 ? (intermediatePosts * edge.length) / perimeterLength : 0;
    edge.extra = Math.floor(exact);
    edge.remainder = exact - edge.extra;
    allocatedPosts += edge.extra;
  }
  postEdges
    .slice()
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, intermediatePosts - allocatedPosts)
    .forEach((edge) => edge.extra++);

  let maximumPostSpacing = 0;
  for (const edge of postEdges) {
    const bays = edge.extra + 1;
    maximumPostSpacing = Math.max(maximumPostSpacing, edge.length / bays);
    for (let i = 0; i <= bays; i++) {
      const t = i / bays;
      addPost(
        { x: edge.a.x + (edge.b.x - edge.a.x) * t, y: edge.a.y + (edge.b.y - edge.a.y) * t },
        i === 0 ? edge.ca : i === bays ? edge.cb : null,
      );
    }
  }

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
  //
  // A brace only exists where there is actually rail to land on: along the
  // tangent of an edge the post sits on, aimed at the neighbouring post and
  // stopping short of the end of the run.
  const braceLen = Math.min(
    d.kneeBraceLength,
    Math.max(maximumPostSpacing * 0.45, 0.3),
  );
  let braceCount = 0;
  if (d.kneeBraces) {
    const edges: [Vec2, Vec2][] = [
      [plan.bl, plan.br],
      [plan.br, plan.fr],
      [plan.fr, plan.fl],
      [plan.fl, plan.bl],
    ];
    const ON_EDGE = Math.max(d.postSize / 2000, 0.02);

    for (const p of posts) {
      const zLow = ringZ(p.at.x) - braceLen;
      if (zLow < 0.35) continue;

      for (const [a, b] of edges) {
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const len = Math.hypot(ex, ey) || 1;
        const ux = ex / len;
        const uy = ey / len;
        // Distance from the post to the edge line: zero means it lies on it.
        const t = (p.at.x - a.x) * ux + (p.at.y - a.y) * uy;
        const off = Math.abs((p.at.x - a.x) * -uy + (p.at.y - a.y) * ux);
        if (off > ON_EDGE) continue;

        for (const dir of [1, -1]) {
          const target = t + braceLen * dir;
          // Must still be over rail, and must not run back past the corner.
          if (target < 0.15 || target > len - 0.15) continue;
          const hx = a.x + ux * target;
          const hy = a.y + uy * target;
          const zHigh = ringZ(hx);
          if (zHigh - zLow < 0.2) continue;
          members.push({
            id: mid_(),
            kind: "brace",
            a: { x: p.at.x, y: p.at.y, z: zLow },
            b: { x: hx, y: hy, z: zHigh },
            length: Math.hypot(hx - p.at.x, hy - p.at.y, zHigh - zLow),
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
    { id: "back", a: "bl", b: "br", build: d.ringBuildFrontBack },
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

  /* ---------------- Level structural perimeter ties ----------------- */

  const levelRailDepth = Math.max(0.05, ringD);
  // These level perimeter ties are structural only; sliding leaves are floor-supported.
  const levelRailZ = Math.min(zL, zR) - ringD - 0.17 - levelRailDepth / 2;
  const perimeterRails: Member[] = ringRuns.map((run) => {
    const a = plan[run.a];
    const b = plan[run.b];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const rail: Member = {
      id: mid_(),
      kind: "level-ring",
      a: { x: a.x, y: a.y, z: levelRailZ },
      b: { x: b.x, y: b.y, z: levelRailZ },
      length,
      label: `level C-purlin perimeter · ${run.id}`,
    };
    members.push(rail);
    return rail;
  });
  const perimeterRailLength = perimeterRails.reduce((sum, rail) => sum + rail.length, 0);
  const floorTracks: Member[] = [];
  for (const side of ["front", "right"] as const) {
    const doorsOnRun = side === "front" ? d.frontDoors : d.rightDoors;
    if (doorsOnRun < 1) continue;
    const length = side === "front" ? W : dR;
    const floorTrack: Member = {
      id: mid_(),
      kind: "floor-track",
      a: side === "front"
        ? { x: 0, y: frontY, z: FLOOR_TRACK_CENTRE }
        : { x: W, y: frontY, z: FLOOR_TRACK_CENTRE },
      b: side === "front"
        ? { x: W, y: frontY, z: FLOOR_TRACK_CENTRE }
        : { x: W, y: frontY - dR, z: FLOOR_TRACK_CENTRE },
      length,
      label: `recessed double-lane floor channel · ${side}`,
    };
    floorTracks.push(floorTrack);
    members.push(floorTrack);
  }
  const floorTrackBySide = new Map(floorTracks.map((track) => [track.label?.split("· ")[1], track]));
  const trackLength = floorTracks.reduce((sum, track) => sum + track.length, 0);

  /* ---------------- Roof frame: Z girders + Z purlins --------------- */

  // Primary Z girders run from the skew rear ring to the straight front ring.
  const girders: Member[] = [];
  for (let i = 0; i < d.girderCount; i++) {
    const x = W * ((i + 1) / (d.girderCount + 1));
    const yBack = backAt(x);
    const len = frontY - yBack;
    const m: Member = {
      id: mid_(),
      kind: "girder",
      a: { x, y: yBack, z: eaveAt(x) - d.roofPurlinDepth / 2000 },
      b: { x, y: frontY, z: eaveAt(x) - d.roofPurlinDepth / 2000 },
      length: len,
      label: `Z${d.roofPurlinDepth}\u00d7${d.roofPurlinGauge}`,
    };
    girders.push(m);
    members.push(m);
  }

  // Z purlins span left-to-right at regular depth stations. Where a station
  // intersects the skewed rear edge before reaching the left/right eave, trim
  // the corresponding end instead of drawing steel outside the roof polygon.
  const roofDepth = maxDepth - minY;
  const purlinLines = Math.max(1, Math.ceil(roofDepth / d.roofPurlinSpacing));
  const purlins: Member[] = [];
  for (let i = 0; i <= purlinLines; i++) {
    const y = minY + (roofDepth * i) / purlinLines;
    let startX = 0;
    let endX = W;
    if (y < Math.max(backY0, backY1) - 1e-8) {
      const rearX = Math.max(0, Math.min(W, ((y - backY0) / (backY1 - backY0 || 1)) * W));
      if (backY1 >= backY0) endX = rearX;
      else startX = rearX;
    }
    const runX = endX - startX;
    if (runX < 0.05) continue;
    const len = Math.hypot(runX, (zR - zL) * runX / W);
    const m: Member = {
      id: mid_(),
      kind: "purlin",
      a: { x: startX, y, z: eaveAt(startX) - d.roofPurlinDepth / 2000 },
      b: { x: endX, y, z: eaveAt(endX) - d.roofPurlinDepth / 2000 },
      length: len,
      label: `Z${d.roofPurlinDepth}\u00d7${d.roofPurlinGauge}`,
    };
    purlins.push(m);
    members.push(m);
  }

  // Width-running purlins are supported by the perimeter side rings and
  // intermediate depth-running girders. Track their longest clear x-span.
  let governingSpan = 0;
  for (const purlin of purlins) {
    const supports = [
      purlin.a.x,
      ...girders
        .filter((girder) => {
          const x = girder.a.x;
          return (
            x > purlin.a.x + 1e-6 &&
            x < purlin.b.x - 1e-6 &&
            purlin.a.y >= backAt(x) - 1e-6 &&
            purlin.a.y <= frontY + 1e-6
          );
        })
        .map((girder) => girder.a.x),
      purlin.b.x,
    ].sort((a, b) => a - b);
    for (let i = 1; i < supports.length; i++) {
      governingSpan = Math.max(governingSpan, supports[i] - supports[i - 1]);
    }
  }
  if (purlins.length === 0) governingSpan = W;
  const purlinScreen = makePurlinScreen(
    d.roofPurlinDepth,
    d.roofPurlinGauge,
    d.roofLoadKpa,
    roofDepth / purlinLines,
    governingSpan,
    d.steelYieldMpa,
  );

  /* ---------------- Roof sheeting layout ---------------------------- */

  const ov = d.roofOverhang;
  const sheetPoly: Vec2[] = [
    { x: 0, y: 0 },
    { x: SHEET_LONG, y: 0 },
    { x: SHEET_LONG, y: SHEET_SHORT },
    { x: 0, y: SHEET_SHORT },
  ];
  const roofClip: Vec2[] = [
    { x: -ov, y: backY0 - ov },
    { x: W + ov, y: backY1 - ov },
    { x: W + ov, y: frontY + ov },
    { x: -ov, y: frontY + ov },
  ];
  const structureClip: Vec2[] = [plan.bl, plan.br, plan.fr, plan.fl];

  const cols = Math.ceil((W + 2 * ov) / SHEET_LONG);
  const rows = Math.ceil((maxDepth - minY + 2 * ov) / SHEET_SHORT);
  const fullArea = polyArea(sheetPoly);
  const roofSheets: SheetCell[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const origin = { x: -ov + c * SHEET_LONG, y: minY - ov + r * SHEET_SHORT };
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
    side: "front" | "right";
    leaves: number;
    offset: number;
    runLen: number;
    toWorld: (t: number, laneOffset?: number) => { x: number; y: number };
    glazed: boolean;
  }[] = [];

  doorSpecs.push({
    side: "front",
    leaves: d.frontDoors,
    offset: d.frontDoorOffset,
    runLen: W,
    toWorld: (t, laneOffset = 0) => ({ x: t, y: frontY - laneOffset }),
    glazed: false,
  });

  doorSpecs.push({
    side: "right",
    leaves: d.rightDoors,
    offset: d.rightDoorOffset,
    runLen: dR,
    toWorld: (t, laneOffset = 0) => ({ x: W - laneOffset, y: frontY - t }),
    glazed: d.glazeRight,
  });

  const doorLeafCount = d.frontDoors + d.rightDoors;

  for (const spec of doorSpecs) {
    const leafW = DOOR_LEAF_W;
    const leafH = DOOR_LEAF_H;
    const supportTrack = floorTrackBySide.get(spec.side)!;
    const leafBottom = (_t: number) => FLOOR_LEAF_BOTTOM;
    const leafTop = (_t: number) => FLOOR_LEAF_BOTTOM + leafH;
    /** Wall framing stops at the fixed-size leaf head on this run. */
    const headOf = (t: number) => leafTop(t);

    // --- door openings, expressed as [start, end] along the run ------
    const openings: [number, number][] = [];
    for (let i = 0; i < spec.leaves; i++) {
      const s = spec.offset + i * (leafW - DOOR_OVERLAP);
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

    // --- sill rail -----------------------------------------------------
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
      const laneOffset = i % 2 === 0 ? -DOOR_LANE_OFFSET : DOOR_LANE_OFFSET;
      const p0 = spec.toWorld(s, laneOffset);
      const p1 = spec.toWorld(e, laneOffset);
      const poly: Vec3[] = [
        { x: p0.x, y: p0.y, z: leafBottom(s) },
        { x: p1.x, y: p1.y, z: leafBottom(e) },
        { x: p1.x, y: p1.y, z: leafTop(e) },
        { x: p0.x, y: p0.y, z: leafTop(s) },
      ];
      /* `poly` is the closed leaf. Alternating floor-channel lanes let the
         25 mm brush-seal lap pass without the sheets occupying the same plane. */
      const preferredSlideDir: 1 | -1 = spec.side === "front" ? -1 : 1;
      const availableBefore = Math.max(0, s);
      const availableAfter = Math.max(0, spec.runLen - e);
      const preferredClearance = preferredSlideDir === -1 ? availableBefore : availableAfter;
      const alternateClearance = preferredSlideDir === -1 ? availableAfter : availableBefore;
      const slideDir: 1 | -1 = spec.leaves === 1 && preferredClearance < leafW && alternateClearance > preferredClearance
        ? preferredSlideDir === -1 ? 1 : -1
        : preferredSlideDir;
      // A single leaf travels just beyond its own width to clear the opening;
      // paired leaves stack with the schematic seal overlap on separate lanes.
      const singleLeafClearance = leafW + 0.02;
      const park = spec.leaves === 1
        ? Math.min(singleLeafClearance, slideDir === -1 ? availableBefore : availableAfter)
        : i * (leafW - DOOR_OVERLAP);
      const q0 = spec.toWorld(s + park * slideDir, laneOffset);
      const q1 = spec.toWorld(e + park * slideDir, laneOffset);
      const parkedStart = s + park * slideDir;
      const parkedEnd = e + park * slideDir;
      const parkedPoly: Vec3[] = [
        { x: q0.x, y: q0.y, z: leafBottom(parkedStart) },
        { x: q1.x, y: q1.y, z: leafBottom(parkedEnd) },
        { x: q1.x, y: q1.y, z: leafTop(parkedEnd) },
        { x: q0.x, y: q0.y, z: leafTop(parkedStart) },
      ];

      const rollerCarriages = [0.22, 0.78].map((fraction, carriageIndex) => {
        const closedAt = s + leafW * fraction;
        const parkedAt = s + park * slideDir + leafW * fraction;
        const wheelSet = (at: number): Vec3[] =>
          FLOOR_WHEEL_AXLE_OFFSETS.flatMap((axial) =>
            FLOOR_WHEEL_LANES.map((lane) => {
              const centre = spec.toWorld(at + axial, laneOffset);
              const ahead = spec.toWorld(at + axial + 0.01, laneOffset);
              const tangentLength = Math.hypot(ahead.x - centre.x, ahead.y - centre.y) || 1;
              const nx = (ahead.y - centre.y) / tangentLength;
              const ny = -(ahead.x - centre.x) / tangentLength;
              return {
                x: centre.x + nx * lane,
                y: centre.y + ny * lane,
                z: FLOOR_WHEEL_CENTRE_Z,
              };
            }),
          );
        const carrier = (at: number): Member => {
          const p = spec.toWorld(at, laneOffset);
          return {
            id: `floor-roller-carrier-${spec.side}-${i}-${carriageIndex}`,
            kind: "track",
            a: { ...p, z: FLOOR_WHEEL_CENTRE_Z },
            b: { ...p, z: leafBottom(at) },
            length: leafBottom(at) - FLOOR_WHEEL_CENTRE_Z,
            label: "floor roller carrier",
          };
        };
        return {
          id: `carriage-${spec.side}-${i}-${carriageIndex}`,
          rollerCentres: wheelSet(closedAt),
          parkedRollerCentres: wheelSet(parkedAt),
          carrier: carrier(closedAt),
          parkedCarrier: carrier(parkedAt),
        };
      });
      const leaf: DoorLeaf = {
        id: `door-${spec.side}-${i}`,
        side: spec.side,
        runStart: s,
        runEnd: e,
        slideDir,
        travel: park,
        poly,
        parkedPoly,
        width: leafW,
        height: leafH,
        supportMemberId: supportTrack.id,
        laneOffset,
        carriages: rollerCarriages,
      };
      doors.push(leaf);
      panels.push({ id: `dp-${spec.side}-${i}`, kind: "door", poly, opacity: 0.32 });

      // casing / trim around the leaf: four mitred sticks
      const edges: [[Vec3, Vec3], [Vec3, Vec3], [Vec3, Vec3], [Vec3, Vec3]] = [
        [poly[0], poly[1]],
        [poly[3], poly[2]],
        [poly[0], poly[3]],
        [poly[1], poly[2]],
      ];
      const leafCentre = poly.reduce(
        (sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4, z: sum.z + point.z / 4 }),
        { x: 0, y: 0, z: 0 },
      );
      const profileNormal = spec.side === "front" ? { x: 0, y: -1, z: 0 } : { x: -1, y: 0, z: 0 };
      for (const [a, b] of edges) {
        const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
        const inward = { x: leafCentre.x - midpoint.x, y: leafCentre.y - midpoint.y, z: leafCentre.z - midpoint.z };
        const tangent = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const mouth = {
          x: tangent.y * profileNormal.z - tangent.z * profileNormal.y,
          y: tangent.z * profileNormal.x - tangent.x * profileNormal.z,
          z: tangent.x * profileNormal.y - tangent.y * profileNormal.x,
        };
        const mouthLength = Math.hypot(mouth.x, mouth.y, mouth.z) || 1;
        const facing = { x: mouth.x / mouthLength, y: mouth.y / mouthLength, z: mouth.z / mouthLength };
        const facingDot = facing.x * inward.x + facing.y * inward.y + facing.z * inward.z;
        members.push({
          id: mid_(),
          kind: "doorframe",
          a,
          b,
          length: dist3(a, b),
          profileFacing: facingDot < 0 ? { x: -facing.x, y: -facing.y, z: -facing.z } : facing,
          profileNormal,
          label: `aluminium U-channel door trim ${d.aluminiumTrimSize}×${d.doorTrimDepth}×${d.doorTrimGauge} mm`,
        });
      }
    }

  }

  /* ---------------- Illustrative connection and sheet fixings -------- */

  const fixings: Fixing[] = [];
  const fixingDiameter = Math.max(3, d.fixingDiameter) / 1000;
  for (const post of posts) {
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      fixings.push({
        id: `anchor-${post.id}-${dx}-${dy}`,
        kind: "anchor",
        at: {
          x: post.at.x + dx * d.postSize / 3000,
          y: post.at.y + dy * d.postSize / 3000,
          z: 0.025,
        },
        diameter: fixingDiameter * 1.5,
      });
    }
    for (const railZ of [ringZ(post.at.x), levelRailZ]) {
      for (const side of [-1, 1] as const) {
        fixings.push({
          id: `bolt-${post.id}-${railZ}-${side}`,
          kind: "bolt",
          at: {
            x: post.at.x + side * d.postSize / 2500,
            y: post.at.y,
            z: railZ,
          },
          diameter: fixingDiameter * 1.6,
        });
      }
    }
  }
  for (const purlin of purlins) {
    const stations = Math.max(1, Math.floor(purlin.length / Math.max(0.2, d.fixingSpacing)));
    for (let i = 0; i <= stations; i++) {
      const t = (i + 0.5) / (stations + 1);
      fixings.push({
        id: `tek-${purlin.id}-${i}`,
        kind: "tek-screw",
        at: {
          x: purlin.a.x + (purlin.b.x - purlin.a.x) * t,
          y: purlin.a.y + (purlin.b.y - purlin.a.y) * t,
          z: purlin.a.z + (purlin.b.z - purlin.a.z) * t + d.roofPurlinDepth / 2000,
        },
        diameter: fixingDiameter,
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

  for (const rail of perimeterRails) {
    const run = rail.label?.split("· ")[1] ?? "perimeter";
    cutList.push({
      id: `level-rail-${run}`,
      group: "Steel",
      item: `Level perimeter C-purlin — ${run} run`,
      spec: `C${d.ringDepth}\u00d7${d.ringGauge} mm`,
      qty: 1,
      unit: "length",
      lengthMm: Math.ceil(rail.length * 1000),
      totalM: rail.length,
      note: "Level structural perimeter tie fixed to posts; the recessed floor channels are separate door guides.",
    });
  }

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
    id: "door-rails",
    group: "Steel",
    item: "Level perimeter structural ties",
    spec: `C${d.ringDepth}×${d.ringGauge} mm`,
    qty: perimeterRails.length,
    unit: "lengths",
    lengthMm: Math.ceil(Math.max(...perimeterRails.map((rail) => rail.length), 0) * 1000),
    totalM: perimeterRailLength,
    note: "Four horizontal structural runs fixed to the perimeter posts; door leaves run on separate recessed floor channels.",
  });

  if (floorTracks.length > 0) {
    cutList.push({
      id: "floor-tracks",
      group: "Doors",
      item: "Recessed double-lane floor channels",
      spec: "Recessed floor channel, schematic profile; dimensions to be confirmed",
      qty: floorTracks.length,
      unit: "runs",
      lengthMm: Math.ceil(Math.max(...floorTracks.map((track) => track.length), 0) * 1000),
      totalM: floorTracks.reduce((sum, track) => sum + track.length, 0),
      note: "Schematic only. Confirm channel profile, drainage, clearances, brush seals and rated wheels with the hardware supplier.",
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
    lengthMm: Math.ceil(Math.max(...purlins.map((g) => g.length), 0) * 1000),
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
    spec: `C${d.kneeBraceSize}\u00d7${d.kneeBraceSize}\u00d7${d.kneeBraceGauge} mm, 45\u00b0`,
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
    id: "door-rail-cleats",
    group: "Fixings",
    item: "Level perimeter C-purlin post cleats",
    spec: "Bolted C-purlin-to-SHS connections",
    qty: posts.length,
    unit: "no.",
    note: "One at each perimeter post; these support structural ties, not the door leaves.",
  });

  cutList.push({
    id: "wheels",
    group: "Doors",
    item: "Floor-level roller carriages",
    spec: `${(WHEEL_DIA * 1000).toFixed(0)} mm schematic rollers; 2 carriages × 4 rollers per leaf`,
    qty: sheetCount * 2,
    unit: "assemblies",
    note: "Eight illustrative floor-level rollers per leaf. Confirm wheel material, recessed-channel fit, drainage and rated capacity with the hardware supplier.",
  });

  cutList.push({
    id: "casing",
    group: "Doors",
    item: "Door U-channel trim",
    spec: `${d.aluminiumTrimSize}×${d.doorTrimDepth}×${d.doorTrimGauge} mm aluminium U-channel, mitred`,
    qty: sheetCount,
    unit: "sets",
    totalM: sheetCount * 2 * (DOOR_LEAF_W + DOOR_LEAF_H),
    note: "Four U-channel lengths per whole 8 × 4 ft sheet; brush-seal overlap is schematic and requires hardware confirmation.",
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
      "One whole 2438 × 1219 mm sheet per leaf, stood on its side in the U-channel casing. Never cut, never two sheets.",
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

  if (purlinScreen.yieldUtilization > 1 || purlinScreen.deflectionMm > purlinScreen.deflectionLimitMm) {
    warnings.push({
      level: "warn",
      title: `Roof Z purlin preliminary screen exceeds a limit (${Math.round(purlinScreen.yieldUtilization * 100)}% gross-yield utilization)`,
      detail:
        `At ${d.roofLoadKpa.toFixed(2)} kN/m² and a ${governingSpan.toFixed(2)} m span, ` +
        `the simplified elastic estimate is ${purlinScreen.elasticStressMpa.toFixed(0)} MPa ` +
        `and ${purlinScreen.deflectionMm.toFixed(0)} mm deflection (screening limit ` +
        `${purlinScreen.deflectionLimitMm.toFixed(0)} mm). Reduce span/load or select a larger/thicker section, then verify using exact manufacturer design properties.`,
    });
  }

  warnings.push({
    level: "info",
    title: "Preliminary roof-member screen only",
    detail: "Uses simple-span beam formulas and an idealized gross C/Z section. It excludes wind uplift, load combinations, local/distortional and lateral buckling, continuity, connection and foundation capacity. This is not a code design or construction sign-off.",
  });

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

  // Fixed-size leaves are supported by floor-level wheels; check their head
  // clearance against the low roof ring. This is geometry screening only.
  const doorHeadClearance = Math.min(zL, zR) - ringD - FLOOR_LEAF_TOP;
  if (d.frontDoors + d.rightDoors > 0 && doorHeadClearance < 0) {
    warnings.push({
      level: "error",
      title: "The 8 ft door leaves clash with the low roof ring",
      detail: `The fixed 2438 mm leaf head needs ${Math.ceil(-doorHeadClearance * 1000)} mm more clearance below the low eave and perimeter ring.`,
    });
  } else if (d.frontDoors + d.rightDoors > 0 && doorHeadClearance < 0.075) {
    warnings.push({
      level: "warn",
      title: `Door head clearance is only ${Math.round(doorHeadClearance * 1000)} mm`,
      detail: "Check the U-channel casing, brush seals and floor-wheel adjustment against the low eave before fixing final dimensions.",
    });
  }

  const frontRun = W;
  if (d.frontDoors * DOOR_LEAF_W + d.frontDoorOffset > frontRun + 0.4) {
    warnings.push({
      level: "warn",
      title: "Front doors run past the end of the front wall",
      detail: `The opening needs about ${(d.frontDoorOffset + d.frontDoors * DOOR_LEAF_W).toFixed(2)} m of an ${frontRun.toFixed(2)} m run.`,
    });
  }
  if (d.rightDoors * DOOR_LEAF_W + d.rightDoorOffset > dR + 0.4) {
    warnings.push({
      level: "warn",
      title: "Right doors run past the end of the right wall",
      detail: `The opening needs about ${(d.rightDoorOffset + d.rightDoors * DOOR_LEAF_W).toFixed(2)} m of a ${dR.toFixed(2)} m run.`,
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

  if (maximumPostSpacing > 2.5) {
    warnings.push({
      level: "warn",
      title: `Perimeter post bays reach ${maximumPostSpacing.toFixed(2)} m`,
      detail: `The selected ${posts.length} posts leave long perimeter bays. Increase the post count to shorten them; this geometry note is not a capacity check.`,
    });
  }

  /* ---------------- Stats -------------------------------------------- */

  const roofArea = polyArea(structureClip) * Math.sqrt(1 + Math.pow((zR - zL) / W, 2));
  const glazedArea =
    wallBays
      .filter((b) => b.type === "glazed")
      .reduce((a, b) => a + b.width * b.height, 0) / 1000;

  const channelMetres = members
    .filter((member) => member.kind === "stud" || member.kind === "sill")
    .reduce((sum, member) => sum + member.length, 0);
  const steelKg =
    cSteelKgPerM(d.ringDepth, d.ringGauge) *
      (ringInfo.reduce((sum, run) => sum + run.len * (run.build === "double" ? 2 : 1), 0) +
        perimeterRailLength + channelMetres) +
    zSteelKgPerM(d.roofPurlinDepth, d.roofPurlinGauge) *
      (purlins.reduce((sum, member) => sum + member.length, 0) +
        girders.reduce((sum, member) => sum + member.length, 0)) +
    shsKgPerM(d.postSize, d.postGauge) * posts.reduce((sum, post) => sum + post.height, 0);

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
    maximumPostSpacing,
    trackLength,
    purlinScreen,
    footprintW: W,
    footprintD: maxDepth,
  };

  return {
    design: d,
    plan,
    depthAt,
    backAt,
    eaveAt,
    roofPitchDeg,
    posts,
    members,
    panels,
    fixings,
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
