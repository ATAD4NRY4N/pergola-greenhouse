/**
 * Framing optimiser.
 *
 * Once the structure's dimensions, door count, roof load and steel grade are
 * confirmed, the remaining framing choices — Z purlin size and centres, the
 * number of primary girders and the perimeter post count — are free to vary.
 * This searches that space for the lightest arrangement that still passes the
 * same preliminary screens the Checks panel reports, so material is only
 * reduced until the structure is safe: nothing over-engineered, nothing cut
 * from wasteful member counts.
 *
 * The screen is the same simple gross-section beam check `buildModel` reports
 * (simple span, gross Z section, yield + span/180 deflection). It is planning
 * guidance, not a code design.
 */

import {
  DEFAULT_DESIGN,
  buildModel,
  type Design,
  type Model,
} from "./model";

/* ------------------------------------------------------------------ */
/* Search space and limits                                             */
/* ------------------------------------------------------------------ */

/** Standard Z purlin depths offered in the control panel, mm. */
export const PURLIN_DEPTHS = [100, 150, 175, 200, 250] as const;
/** Candidate purlin gauges, mm. */
export const PURLIN_GAUGES = [1, 1.2, 1.5, 2, 2.5, 3] as const;
/** Candidate primary girder counts. */
export const GIRDER_OPTIONS = [0, 1, 2, 3, 4] as const;

/** Practical minimum purlin centres: room to fix the sheets, metres. */
export const MIN_PURLIN_SPACING = 0.4;
/** Spacing is searched on the same 50 mm grid the control panel uses. */
export const PURLIN_SPACING_STEP = 0.05;
/** Perimeter post bays above this are flagged; the optimiser stays inside it. */
export const MAX_POST_BAY = 2.5;
/** Upper bound of the perimeter post search. */
const MAX_POSTS = 40;

/**
 * Preliminary polycarbonate sheet-support limit, in metres between purlin
 * centres. Thicker sheets span further; the 4 mm twinwall default caps at the
 * 600 mm the control panel quotes as the usual maximum.
 */
export function maxPurlinSpacingFor(polyThicknessMm: number): number {
  return Math.min(1.25, 0.45 + 0.0375 * polyThicknessMm);
}

/* ------------------------------------------------------------------ */
/* Report types                                                        */
/* ------------------------------------------------------------------ */

/** The confirmed inputs the framing is optimised against. */
export interface OptimisationInputs {
  width: number;
  depthLeft: number;
  depthRight: number;
  eaveLeft: number;
  eaveRight: number;
  frontDoors: number;
  rightDoors: number;
  polyThickness: number;
  roofLoadKpa: number;
  steelYieldMpa: number;
}

export interface FramingSummary {
  postCount: number;
  girderCount: number;
  purlinDepth: number;
  purlinGauge: number;
  purlinSpacing: number;
  purlinCount: number;
  /** Total cut length of the Z frame (purlins + girders), metres. */
  frameLengthM: number;
  governingPurlinSpanM: number;
  steelKg: number;
  maxPostSpacingM: number;
  yieldUtilization: number;
  deflectionMm: number;
  deflectionLimitMm: number;
}

export interface OptimisationResult {
  /** False when nothing in the searched range passes the screen. */
  ok: boolean;
  inputs: OptimisationInputs;
  before: FramingSummary;
  after: FramingSummary;
  /** Only the framing fields that should change; empty when nothing does. */
  patch: Partial<Design>;
  /** The full design with the patch applied and every confirmed input kept. */
  design: Design;
  changes: string[];
  notes: string[];
  /** How many framing arrangements were evaluated. */
  searched: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function optimisationInputs(design: Design): OptimisationInputs {
  return {
    width: design.width,
    depthLeft: design.depthLeft,
    depthRight: design.depthRight,
    eaveLeft: design.eaveLeft,
    eaveRight: design.eaveRight,
    frontDoors: design.frontDoors,
    rightDoors: design.rightDoors,
    polyThickness: design.polyThickness,
    roofLoadKpa: design.roofLoadKpa,
    steelYieldMpa: design.steelYieldMpa,
  };
}

function summarise(design: Design, model: Model): FramingSummary {
  const zMembers = model.members.filter(
    (member) => member.kind === "purlin" || member.kind === "girder",
  );
  return {
    postCount: model.posts.length,
    girderCount: design.girderCount,
    purlinDepth: design.roofPurlinDepth,
    purlinGauge: design.roofPurlinGauge,
    purlinSpacing: design.roofPurlinSpacing,
    purlinCount: model.members.filter((member) => member.kind === "purlin").length,
    frameLengthM: zMembers.reduce((sum, member) => sum + member.length, 0),
    governingPurlinSpanM: model.stats.governingPurlinSpan,
    steelKg: model.stats.steelKg,
    maxPostSpacingM: model.stats.maximumPostSpacing,
    yieldUtilization: model.stats.purlinScreen.yieldUtilization,
    deflectionMm: model.stats.purlinScreen.deflectionMm,
    deflectionLimitMm: model.stats.purlinScreen.deflectionLimitMm,
  };
}

/** A candidate passes only if every screen the Checks panel applies is met. */
function passes(model: Model, spacing: number, spacingCap: number): boolean {
  const s = model.stats;
  return (
    spacing <= spacingCap + 1e-9 &&
    s.maximumPostSpacing <= MAX_POST_BAY + 1e-9 &&
    s.purlinScreen.yieldUtilization <= 1 &&
    s.purlinScreen.deflectionMm <= s.purlinScreen.deflectionLimitMm
  );
}

/** Lightest first; ties prefer fewer members, then wider centres. */
function lighter(
  a: { steelKg: number; members: number; spacing: number; depth: number; gauge: number },
  b: { steelKg: number; members: number; spacing: number; depth: number; gauge: number },
): number {
  return (
    a.steelKg - b.steelKg ||
    a.members - b.members ||
    b.spacing - a.spacing ||
    a.depth - b.depth ||
    a.gauge - b.gauge
  );
}

const fmtM = (v: number) => `${v.toFixed(2)} m`;
const fmtKg = (v: number) => `${Math.round(v)} kg`;

function describeSection(depth: number, gauge: number, spacing: number, count: number): string {
  return `Z${depth}\u00d7${gauge.toFixed(1)} mm at ${spacing.toFixed(2)} m centres \u00b7 ${count} lengths`;
}

/* ------------------------------------------------------------------ */
/* The optimiser                                                       */
/* ------------------------------------------------------------------ */

export function optimiseDesign(input: Design): OptimisationResult {
  const d: Design = { ...DEFAULT_DESIGN, ...input };
  const beforeModel = buildModel(d);
  const before = summarise(d, beforeModel);
  const inputs = optimisationInputs(d);
  const spacingCap = maxPurlinSpacingFor(d.polyThickness);
  let searched = 0;

  /* ---- posts: the fewest perimeter posts inside the bay guidance ---- */

  let postCount = 4;
  while (postCount < MAX_POSTS) {
    const probe = buildModel({ ...d, postCount, roofPurlinSpacing: d.roofPurlinSpacing });
    if (probe.stats.maximumPostSpacing <= MAX_POST_BAY) break;
    postCount++;
  }

  /* ---- framing: every standard arrangement that passes the screen --- */

  type Rank = {
    steelKg: number;
    members: number;
    spacing: number;
    depth: number;
    gauge: number;
  };
  type Candidate = {
    patch: Partial<Design>;
    model: Model;
    summary: FramingSummary;
    rank: Rank;
  };
  const candidates: Candidate[] = [];

  const evaluate = (trial: Design, patch: Partial<Design>, spacing: number): void => {
    searched++;
    const model = buildModel(trial);
    if (!passes(model, spacing, spacingCap)) return;
    const summary = summarise(trial, model);
    const members = model.members.filter(
      (member) => member.kind === "purlin" || member.kind === "girder",
    ).length;
    candidates.push({
      patch,
      model,
      summary,
      rank: {
        steelKg: summary.steelKg,
        members,
        spacing,
        depth: summary.purlinDepth,
        gauge: summary.purlinGauge,
      },
    });
  };

  // Seed with the current framing at the optimal post count so a design that
  // is already safe and lighter than anything standard is never made heavier.
  evaluate(
    { ...d, postCount },
    {
      postCount,
      girderCount: d.girderCount,
      roofPurlinDepth: d.roofPurlinDepth,
      roofPurlinGauge: d.roofPurlinGauge,
      roofPurlinSpacing: d.roofPurlinSpacing,
    },
    d.roofPurlinSpacing,
  );

  for (const depth of PURLIN_DEPTHS) {
    for (const gauge of PURLIN_GAUGES) {
      for (const girders of GIRDER_OPTIONS) {
        for (
          let s = MIN_PURLIN_SPACING;
          s <= spacingCap + 1e-9;
          s += PURLIN_SPACING_STEP
        ) {
          const spacing = Math.round(s * 100) / 100;
          evaluate(
            {
              ...d,
              postCount,
              girderCount: girders,
              roofPurlinDepth: depth,
              roofPurlinGauge: gauge,
              roofPurlinSpacing: spacing,
            },
            {
              postCount,
              girderCount: girders,
              roofPurlinDepth: depth,
              roofPurlinGauge: gauge,
              roofPurlinSpacing: spacing,
            },
            spacing,
          );
        }
      }
    }
  }

  let best: Candidate | null = null;
  for (const candidate of candidates) {
    if (!best || lighter(candidate.rank, best.rank) < 0) best = candidate;
  }

  /* ---- nothing passes: report failure without touching the design --- */

  if (!best) {
    return {
      ok: false,
      inputs,
      before,
      after: before,
      patch: {},
      design: d,
      changes: [],
      notes: [
        `No arrangement in the standard range (Z100\u2013Z250, 1.0\u20133.0 mm, 0\u20134 girders) passes the screen at ${d.roofLoadKpa.toFixed(2)} kN/m\u00b2 with ${d.steelYieldMpa.toFixed(0)} MPa steel. Reduce the roof load, widen the available sections, or get structural advice.`,
        "Preliminary gross-section beam screen only (simple span; yield + span/180 deflection) \u2014 this is not a code design or construction sign-off.",
      ],
      searched,
    };
  }

  /* ---- report the winning arrangement ------------------------------- */

  const chosen: Design = { ...d, ...best.patch };
  const after = best.summary;

  const patch: Partial<Design> = {};
  if (chosen.postCount !== input.postCount) patch.postCount = chosen.postCount;
  if (chosen.girderCount !== input.girderCount) patch.girderCount = chosen.girderCount;
  if (chosen.roofPurlinDepth !== input.roofPurlinDepth) patch.roofPurlinDepth = chosen.roofPurlinDepth;
  if (chosen.roofPurlinGauge !== input.roofPurlinGauge) patch.roofPurlinGauge = chosen.roofPurlinGauge;
  if (chosen.roofPurlinSpacing !== input.roofPurlinSpacing) patch.roofPurlinSpacing = chosen.roofPurlinSpacing;

  const changes: string[] = [];
  if (
    before.purlinDepth !== after.purlinDepth ||
    before.purlinGauge !== after.purlinGauge ||
    before.purlinSpacing !== after.purlinSpacing ||
    before.purlinCount !== after.purlinCount
  ) {
    changes.push(
      `Z purlins: ${describeSection(before.purlinDepth, before.purlinGauge, before.purlinSpacing, before.purlinCount)} \u2192 ${describeSection(after.purlinDepth, after.purlinGauge, after.purlinSpacing, after.purlinCount)}`,
    );
  }
  if (before.girderCount !== after.girderCount) {
    changes.push(`Primary girders: ${before.girderCount} \u2192 ${after.girderCount}`);
  }
  if (before.postCount !== after.postCount) {
    changes.push(`Perimeter posts: ${before.postCount} \u2192 ${after.postCount}`);
  }
  if (Math.round(before.steelKg) !== Math.round(after.steelKg)) {
    const delta = before.steelKg > 0 ? ((after.steelKg - before.steelKg) / before.steelKg) * 100 : 0;
    changes.push(
      `Estimated steel: ${fmtKg(before.steelKg)} \u2192 ${fmtKg(after.steelKg)} (${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%)`,
    );
    if (Math.abs(before.frameLengthM - after.frameLengthM) > 0.05) {
      changes.push(
        `Z frame length: ${fmtM(before.frameLengthM)} \u2192 ${fmtM(after.frameLengthM)}`,
      );
    }
  }
  if (changes.length === 0) {
    changes.push(
      "Already optimal \u2014 the current framing is the lightest standard arrangement that passes the screen.",
    );
  }

  const roofWasteM2 = beforeModel.roofSheets.reduce((sum, sheet) => sum + sheet.wasteArea, 0);
  const notes: string[] = [
    `Governing purlin screen: ${(after.yieldUtilization * 100).toFixed(0)}% gross-yield utilisation, ${after.deflectionMm.toFixed(1)} mm deflection of a ${after.deflectionLimitMm.toFixed(1)} mm span/180 limit, on a ${fmtM(after.governingPurlinSpanM)} clear span.`,
    `Purlin centres are capped at ${spacingCap.toFixed(2)} m by the sheet-support rule for ${d.polyThickness} mm polycarbonate; post bays stay within ${MAX_POST_BAY.toFixed(1)} m.`,
    `Roof sheet count and cut waste follow the confirmed footprint and the 8 \u00d7 4 ft sheet module (${beforeModel.stats.totalSheets} sheets, ${roofWasteM2.toFixed(1)} m\u00b2 trimmed at the edges) \u2014 this pass trims frame material only.`,
    "Preliminary gross-section beam screen only (simple span; yield + span/180 deflection). It excludes wind uplift, buckling, connections and foundations \u2014 this is not a code design or construction sign-off.",
  ];

  return {
    ok: true,
    inputs,
    before,
    after,
    patch,
    design: chosen,
    changes,
    notes,
    searched,
  };
}
