/**
 * Indicative pricing for the build.
 *
 * Every line of the model's cut list is costed against an editable rate card,
 * and each line is assigned to one phase of the build-plan sequence so the
 * estimate can be read either "by component" or "by phase of the build".
 *
 * These are planning estimates in £ from typical UK merchant rates — not
 * quotes. Edit the rate card in the pricing panel to match your suppliers.
 */
import {
  cSteelKgPerM,
  shsKgPerM,
  zSteelKgPerM,
  type CutListItem,
  type Model,
} from "./model";

/* ------------------------------------------------------------------ */
/* Rate card                                                           */
/* ------------------------------------------------------------------ */

export interface RateCard {
  /** Galvanised cold-formed steel sections (C, Z and SHS), £ per kg. */
  steelPerKg: number;
  /** SHS base plate + post foot, £ each. */
  basePlateEach: number;
  /** Purlin hanger cleat + set screw, £ each. */
  hangerEach: number;
  /** Level-rail post cleat, £ each. */
  cleatEach: number;
  /** Corner plate (rigid angle or slotted gusset), £ each. */
  cornerPlateEach: number;
  /** Polycarb tek screw + neoprene washer, £ each. */
  tekScrewEach: number;
  /** M10 grade 8.8 set screw + nut, £ each. */
  boltEach: number;
  /** Recessed double-lane floor channel, £ per metre. */
  floorChannelPerM: number;
  /** Floor-level roller carriage, £ each. */
  rollerCarriageEach: number;
  /** Aluminium U-channel trim, £ per metre. */
  aluminiumTrimPerM: number;
  /** Twinwall polycarbonate 2438 × 1219 mm sheet, £ base each. */
  polySheetBase: number;
  /** Extra £ per sheet per mm of twinwall thickness. */
  polySheetPerMm: number;
  /** Labour, £ per working day on site. */
  labourDayRate: number;
  /** Contingency held on top of materials + labour, %. */
  contingencyPct: number;
}

export const DEFAULT_RATES: RateCard = {
  steelPerKg: 2.1,
  basePlateEach: 9.5,
  hangerEach: 3.2,
  cleatEach: 2.8,
  cornerPlateEach: 6.5,
  tekScrewEach: 0.12,
  boltEach: 0.55,
  floorChannelPerM: 24,
  rollerCarriageEach: 18,
  aluminiumTrimPerM: 7.5,
  polySheetBase: 38,
  polySheetPerMm: 3.4,
  labourDayRate: 220,
  contingencyPct: 10,
};

export interface RateField {
  key: keyof RateCard;
  label: string;
  unit: string;
  step: number;
}

/** Order the rate editor fields are shown in. */
export const RATE_FIELDS: RateField[] = [
  { key: "steelPerKg", label: "Steel sections", unit: "£/kg", step: 0.05 },
  { key: "basePlateEach", label: "Post base plates", unit: "£/each", step: 0.5 },
  { key: "hangerEach", label: "Purlin hanger cleats", unit: "£/each", step: 0.1 },
  { key: "cleatEach", label: "Rail post cleats", unit: "£/each", step: 0.1 },
  { key: "cornerPlateEach", label: "Corner plates", unit: "£/each", step: 0.5 },
  { key: "tekScrewEach", label: "Tek screws + washers", unit: "£/each", step: 0.01 },
  { key: "boltEach", label: "M10 set screws", unit: "£/each", step: 0.05 },
  { key: "floorChannelPerM", label: "Floor channel", unit: "£/m", step: 1 },
  { key: "rollerCarriageEach", label: "Roller carriages", unit: "£/each", step: 1 },
  { key: "aluminiumTrimPerM", label: "Aluminium U-channel", unit: "£/m", step: 0.5 },
  { key: "polySheetBase", label: "Polycarb sheet base", unit: "£/sheet", step: 1 },
  { key: "polySheetPerMm", label: "Polycarb per mm", unit: "£/mm", step: 0.1 },
  { key: "labourDayRate", label: "Labour day rate", unit: "£/day", step: 5 },
  { key: "contingencyPct", label: "Contingency", unit: "%", step: 1 },
];

/* ------------------------------------------------------------------ */
/* Build phases                                                        */
/* ------------------------------------------------------------------ */

export type PhaseId = "groundwork" | "frame" | "doors" | "envelope";

export interface PhaseDef {
  id: PhaseId;
  title: string;
  /** Which stage of the build-plan sequence the spend lands in. */
  step: string;
  /** The transparent day-count rule used for the labour allowance. */
  labourRule: string;
}

export const PHASES: PhaseDef[] = [
  {
    id: "groundwork",
    title: "Set-out & groundwork",
    step: "Build plan 1–4 · mark the footprint, stake posts, foundations",
    labourRule: "1 day + 0.25 day per post",
  },
  {
    id: "frame",
    title: "Steel frame",
    step: "Build plan 5 · posts, ring rails, girders, purlins, braces",
    labourRule: "1.5 days + 4 days per tonne of steel",
  },
  {
    id: "doors",
    title: "Doors & hardware",
    step: "Build plan 6 · floor channels, roller carriages, U-channel casing",
    labourRule: "0.5 day + 0.75 day per sliding leaf",
  },
  {
    id: "envelope",
    title: "Glazing & weatherproofing",
    step: "Build plan 6–7 · polycarbonate, fixings, seals",
    labourRule: "0.5 day + 0.1 day per sheet",
  },
];

/* ------------------------------------------------------------------ */
/* Report shape                                                        */
/* ------------------------------------------------------------------ */

export interface ComponentPrice {
  id: string;
  group: string;
  phase: PhaseId;
  item: string;
  spec: string;
  qty: number;
  unit: string;
  /** How the cost was arrived at, e.g. "218.4 kg Z200×2.0 @ £2.10/kg". */
  basis: string;
  cost: number;
}

export interface PhasePrice {
  id: PhaseId;
  title: string;
  step: string;
  labourRule: string;
  materials: number;
  labourDays: number;
  labour: number;
  total: number;
  /** Share of the staged spend (materials + labour across all phases). */
  sharePct: number;
}

export interface PricingReport {
  components: ComponentPrice[];
  groups: { group: string; total: number }[];
  phases: PhasePrice[];
  materials: number;
  labourDays: number;
  labour: number;
  contingencyPct: number;
  contingency: number;
  total: number;
  perRoofM2: number;
}

/* ------------------------------------------------------------------ */
/* Formatting + persisted rate overrides                               */
/* ------------------------------------------------------------------ */

export function formatGBP(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

const RATES_STORAGE_KEY = "polyframe:rates:v1";

/** Keep only known, numeric, non-negative rate values. */
export function sanitizeRates(raw: unknown): RateCard {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const out = { ...DEFAULT_RATES };
  for (const field of RATE_FIELDS) {
    const value = Number(source[field.key]);
    if (Number.isFinite(value) && value >= 0) {
      out[field.key] = value;
    }
  }
  return out;
}

export function loadRates(): RateCard {
  if (typeof localStorage === "undefined") return { ...DEFAULT_RATES };
  try {
    const raw = localStorage.getItem(RATES_STORAGE_KEY);
    return raw ? sanitizeRates(JSON.parse(raw)) : { ...DEFAULT_RATES };
  } catch {
    return { ...DEFAULT_RATES };
  }
}

export function storeRates(rates: RateCard): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
  } catch {
    /* storage full or blocked — the estimate still works for this session */
  }
}

/* ------------------------------------------------------------------ */
/* Costing                                                             */
/* ------------------------------------------------------------------ */

function polySheetRate(thicknessMm: number, rates: RateCard): number {
  return rates.polySheetBase + rates.polySheetPerMm * thicknessMm;
}

function costLine(
  item: CutListItem,
  model: Model,
  rates: RateCard,
): { basis: string; cost: number; phase: PhaseId } {
  const d = model.design;
  const totalM = item.totalM ?? 0;

  const steel = (kg: number, section: string, phase: PhaseId) => ({
    phase,
    basis: `${kg.toFixed(1)} kg ${section} @ ${formatGBP(rates.steelPerKg, 2)}/kg`,
    cost: kg * rates.steelPerKg,
  });
  const each = (rate: number, per: string, phase: PhaseId) => ({
    phase,
    basis: `${item.qty} × ${formatGBP(rate, 2)}/${per}`,
    cost: item.qty * rate,
  });
  const perM = (rate: number, per: string, phase: PhaseId) => ({
    phase,
    basis: `${totalM.toFixed(1)} m @ ${formatGBP(rate, 2)}/${per}`,
    cost: totalM * rate,
  });

  if (item.id === "posts") {
    return steel(
      shsKgPerM(d.postSize, d.postGauge) * totalM,
      `SHS ${d.postSize}×${d.postGauge}`,
      "frame",
    );
  }
  if (item.id === "postfeet") {
    return each(rates.basePlateEach, "plate", "groundwork");
  }
  if (item.id.startsWith("level-rail-")) {
    return steel(
      cSteelKgPerM(d.ringDepth, d.ringGauge) * totalM,
      `C${d.ringDepth}×${d.ringGauge}`,
      "frame",
    );
  }
  if (item.id === "door-rails") {
    // Summary of the per-run level rails, which are priced above. Costing it
    // again would double-count the same steel.
    return {
      phase: "frame",
      basis: "Summary of the per-run level rails above — not priced twice",
      cost: 0,
    };
  }
  if (item.id.startsWith("ring-")) {
    return steel(
      cSteelKgPerM(d.ringDepth, d.ringGauge) * totalM,
      `C${d.ringDepth}×${d.ringGauge}`,
      "frame",
    );
  }
  if (item.id === "girders" || item.id === "purlins") {
    return steel(
      zSteelKgPerM(d.roofPurlinDepth, d.roofPurlinGauge) * totalM,
      `Z${d.roofPurlinDepth}×${d.roofPurlinGauge}`,
      "frame",
    );
  }
  if (item.id === "braces") {
    return steel(
      cSteelKgPerM(d.kneeBraceSize, d.kneeBraceGauge) * totalM,
      `C${d.kneeBraceSize}×${d.kneeBraceGauge}`,
      "frame",
    );
  }
  if (item.id === "hangers") {
    return each(rates.hangerEach, "cleat", "frame");
  }
  if (item.id === "door-rail-cleats") {
    return each(rates.cleatEach, "cleat", "frame");
  }
  if (item.id === "cornerplates") {
    return each(rates.cornerPlateEach, "plate", "frame");
  }
  if (item.id === "bolts") {
    return each(rates.boltEach, "set screw", "frame");
  }
  if (item.id === "floor-tracks") {
    return perM(rates.floorChannelPerM, "m channel", "doors");
  }
  if (item.id === "wheels") {
    return each(rates.rollerCarriageEach, "carriage", "doors");
  }
  if (item.id === "casing") {
    return perM(rates.aluminiumTrimPerM, "m U-channel", "doors");
  }
  if (item.id === "roofpoly" || item.id === "doorpoly") {
    const rate = polySheetRate(d.polyThickness, rates);
    return {
      phase: "envelope",
      basis: `${item.qty} sheets @ ${formatGBP(rate, 2)} (${d.polyThickness} mm twinwall)`,
      cost: item.qty * rate,
    };
  }
  if (item.id === "fixings") {
    return each(rates.tekScrewEach, "screw + washer", "envelope");
  }
  // No rate on file — surfaced at £0 rather than guessed.
  return {
    phase: "frame",
    basis: "No rate on file — not priced",
    cost: 0,
  };
}

function labourDaysFor(phase: PhaseId, model: Model): number {
  const leaves = model.design.frontDoors + model.design.rightDoors;
  switch (phase) {
    case "groundwork":
      return 1 + model.posts.length * 0.25;
    case "frame":
      return 1.5 + (model.stats.steelKg / 1000) * 4;
    case "doors":
      return leaves === 0 ? 0 : 0.5 + leaves * 0.75;
    case "envelope":
      return 0.5 + model.stats.totalSheets * 0.1;
  }
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/* ------------------------------------------------------------------ */
/* The report                                                          */
/* ------------------------------------------------------------------ */

export function priceModel(
  model: Model,
  rates: RateCard = DEFAULT_RATES,
): PricingReport {
  const components: ComponentPrice[] = model.cutList.map((item) => {
    const line = costLine(item, model, rates);
    return {
      id: item.id,
      group: item.group,
      phase: line.phase,
      item: item.item,
      spec: item.spec,
      qty: item.qty,
      unit: item.unit,
      basis: line.basis,
      cost: line.cost,
    };
  });

  const materials = components.reduce((sum, c) => sum + c.cost, 0);

  const groups: { group: string; total: number }[] = [];
  for (const c of components) {
    const entry = groups.find((g) => g.group === c.group);
    if (entry) entry.total += c.cost;
    else groups.push({ group: c.group, total: c.cost });
  }

  const stages = PHASES.map((def) => {
    const phaseMaterials = components
      .filter((c) => c.phase === def.id)
      .reduce((sum, c) => sum + c.cost, 0);
    const days = round1(labourDaysFor(def.id, model));
    return {
      def,
      materials: phaseMaterials,
      labourDays: days,
      labour: days * rates.labourDayRate,
      total: phaseMaterials + days * rates.labourDayRate,
    };
  });

  const stagedSpend = stages.reduce((sum, s) => sum + s.total, 0);

  const phases: PhasePrice[] = stages.map((s) => ({
    id: s.def.id,
    title: s.def.title,
    step: s.def.step,
    labourRule: s.def.labourRule,
    materials: s.materials,
    labourDays: s.labourDays,
    labour: s.labour,
    total: s.total,
    sharePct: stagedSpend > 0 ? (s.total / stagedSpend) * 100 : 0,
  }));

  const labourDays = phases.reduce((sum, p) => sum + p.labourDays, 0);
  const labour = phases.reduce((sum, p) => sum + p.labour, 0);
  const contingency =
    ((materials + labour) * Math.max(0, rates.contingencyPct)) / 100;
  const total = materials + labour + contingency;

  return {
    components,
    groups,
    phases,
    materials,
    labourDays: round1(labourDays),
    labour,
    contingencyPct: rates.contingencyPct,
    contingency,
    total,
    perRoofM2: model.stats.roofArea > 0 ? total / model.stats.roofArea : 0,
  };
}
