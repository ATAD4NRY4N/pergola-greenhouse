import { useState } from "react";
import type { Model } from "../lib/model";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from "./ui";
import { SUPPLIERS, SUPPLIER_CATEGORIES } from "../lib/suppliers";
import { cn } from "../lib/utils";
import {
  ClipboardList,
  Copy,
  Check,
  TriangleAlert,
  Info,
  CircleAlert,
  MapPin,
  Truck,
  Ruler,
  HardHat,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Cut list                                                            */
/* ------------------------------------------------------------------ */

export function CutListPanel({ model }: { model: Model }) {
  const [copied, setCopied] = useState(false);
  const groups = [...new Set(model.cutList.map((i) => i.group))];

  const asText = () =>
    [
      `POLYFRAME CUT LIST — ${model.design.name}`,
      `${model.design.width.toFixed(2)}m wide x ${model.design.depthLeft.toFixed(2)}m (left) / ${model.design.depthRight.toFixed(2)}m (right) deep`,
      `Roof fall ${model.roofPitchDeg.toFixed(1)}deg  |  ${model.posts.length} perimeter posts  |  ${model.stats.totalSheets} polycarbonate sheets`,
      "",
      ...groups.flatMap((g) => [
        `-- ${g} --`,
        ...model.cutList
          .filter((i) => i.group === g)
          .map(
            (i) =>
              `${i.item} | ${i.spec} | ${i.qty} ${i.unit}` +
              (i.lengthMm ? ` @ ${i.lengthMm}mm` : "") +
              (i.totalM ? ` | ${i.totalM.toFixed(1)}m total` : "") +
              (i.note ? ` | ${i.note}` : ""),
          ),
        "",
      ]),
    ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the table is still on screen */
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <ClipboardList className="size-3.5 text-canopy-400" />
        <CardTitle className="flex-1">Cut list &amp; bill of materials</CardTitle>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardBody className="panel-scroll flex-1 overflow-y-auto p-0">
        {groups.map((g) => (
          <div key={g}>
            <p className="sticky top-0 bg-slate-bark-900/95 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-canopy-400 backdrop-blur">
              {g}
            </p>
            <table className="w-full text-left">
              <tbody>
                {model.cutList
                  .filter((i) => i.group === g)
                  .map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-slate-bark-800/60 align-top last:border-0"
                    >
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-slate-bark-200">{i.item}</p>
                        <p className="font-mono text-[10px] text-slate-bark-500">
                          {i.spec}
                        </p>
                        {i.note && (
                          <p className="mt-1 max-w-md text-[11px] leading-snug text-slate-bark-400">
                            {i.note}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right align-top">
                        {i.lengthMm ? (
                          <p className="font-mono text-xs text-canopy-300 tnum">
                            {i.lengthMm.toLocaleString()} mm
                          </p>
                        ) : i.totalM ? (
                          <p className="font-mono text-xs text-canopy-300 tnum">
                            {i.totalM.toFixed(1)} m
                          </p>
                        ) : null}
                        <p className="font-mono text-[10px] text-slate-bark-400">
                          {i.qty} {i.unit}
                        </p>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

export function ChecksPanel({ model }: { model: Model }) {
  const s = model.stats;
  const cards = [
    {
      label: "Plan area",
      value: `${s.planArea.toFixed(1)} m²`,
      sub: `${model.design.width.toFixed(2)} × ${Math.max(
        model.design.depthLeft,
        model.design.depthRight,
      ).toFixed(2)} m`,
    },
    {
      label: "Roof area",
      value: `${s.roofArea.toFixed(1)} m²`,
      sub: `${s.sheetsRoofFull} whole + ${s.sheetsRoofCut} cut sheets`,
    },
    {
      label: "Polycarb total",
      value: `${s.totalSheets} sheets`,
      sub: `${s.sheetsRoofFull + s.sheetsRoofCut} roof · ${s.sheetsWall} wall · ${s.sheetsDoor} door`,
    },
    {
      label: "Steel",
      value: `${s.steelKg.toLocaleString()} kg`,
      sub: `${s.steelMetres.toFixed(1)} m of section, ${model.posts.length} posts`,
    },
    {
      label: "Governing Z purlin span",
      value: `${s.governingPurlinSpan.toFixed(2)} m`,
      sub: `Z${model.design.roofPurlinDepth}×${model.design.roofPurlinGauge} · ${s.purlinScreen.loadKpa.toFixed(2)} kN/m²`,
    },
    {
      label: "Elastic stress screen",
      value: `${s.purlinScreen.elasticStressMpa.toFixed(0)} MPa`,
      sub: `${(s.purlinScreen.yieldUtilization * 100).toFixed(0)}% of nominal ${model.design.steelYieldMpa} MPa yield · gross section only`,
    },
    {
      label: "Deflection screen",
      value: `${s.purlinScreen.deflectionMm.toFixed(0)} mm`,
      sub: `simple-span estimate · comparison limit L/180 = ${s.purlinScreen.deflectionLimitMm.toFixed(0)} mm`,
    },
    {
      label: "Door track",
      value: `${s.trackLength.toFixed(2)} m`,
      sub: `${model.design.frontDoors + model.design.rightDoors} leaves · 2 four-wheel carriages each`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-bark-500">
              {c.label}
            </p>
            <p className="mt-1 font-mono text-lg text-canopy-200 tnum">{c.value}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-bark-500">
              {c.sub}
            </p>
          </Card>
        ))}
      </div>

      <div className="rounded-md border border-brass-400/30 bg-brass-400/5 px-3 py-2.5">
        <p className="text-xs font-medium text-brass-200">Screening only—not a structural design</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-bark-400">
          The Z-purlin estimate uses a simple span and an idealized gross section (50 mm flanges). It does not use manufacturer effective section properties and omits buckling, wind/uplift, load combinations, girders, ring rails, posts, joints, anchors and foundations. Confirm site loads and all member capacities with a qualified structural engineer before building.
        </p>
      </div>

      <div className="space-y-2">
        {model.warnings.filter((warning) => warning.level !== "info").length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-canopy-800 bg-canopy-900/40 px-3 py-2.5">
            <Check className="size-4 text-canopy-400" />
            <p className="text-xs text-canopy-200">
              No clashes found in the indicative checks.
            </p>
          </div>
        )}
        {model.warnings.filter((warning) => warning.level !== "info").map((w, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2.5 rounded-md border px-3 py-2.5",
              w.level === "error" && "border-red-500/40 bg-red-500/5",
              w.level === "warn" && "border-brass-400/40 bg-brass-400/5",
              w.level === "info" && "border-slate-bark-700 bg-slate-bark-900/60",
            )}
          >
            {w.level === "error" ? (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-400" />
            ) : w.level === "warn" ? (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brass-400" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0 text-slate-bark-400" />
            )}
            <div>
              <p className="text-xs font-medium text-slate-bark-100">
                {w.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-bark-400">
                {w.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ground set-out and solo assembly plan                               */
/* ------------------------------------------------------------------ */

export function BuildPlanPanel({ model }: { model: Model }) {
  const [copied, setCopied] = useState(false);
  const { plan, design, posts } = model;
  const fromFront = (p: { x: number; y: number }) => plan.fl.y - p.y;
  const diagonal = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);
  const points = [
    { name: "FL · front-left", at: plan.fl },
    { name: "FR · front-right", at: plan.fr },
    { name: "BR · back-right", at: plan.br },
    { name: "BL · back-left", at: plan.bl },
  ];
  const postLabel = (post: (typeof posts)[number], index: number) => post.corner
    ? post.corner.toUpperCase()
    : `P${String(posts.slice(0, index + 1).filter((item) => !item.corner).length).padStart(2, "0")}`;
  const setOut = [
    `GROUND SET-OUT — ${design.name}`,
    `Use FL as (0, 0); X runs right, Y runs back. Units: mm.`,
    ...points.map(({ name, at }) => `${name}: X ${Math.round(at.x * 1000)}, Y ${Math.round(fromFront(at) * 1000)}`),
    `Sides FL-FR ${Math.round(diagonal(plan.fl, plan.fr) * 1000)} · FR-BR ${Math.round(diagonal(plan.fr, plan.br) * 1000)} · BR-BL ${Math.round(diagonal(plan.br, plan.bl) * 1000)} · BL-FL ${Math.round(diagonal(plan.bl, plan.fl) * 1000)}`,
    `Diagonals FL-BR ${Math.round(diagonal(plan.fl, plan.br) * 1000)} · FR-BL ${Math.round(diagonal(plan.fr, plan.bl) * 1000)}`,
    ...posts.map((post, index) => `${postLabel(post, index)}: X ${Math.round(post.at.x * 1000)}, Y ${Math.round(fromFront(post.at) * 1000)}`),
  ].join("\n");
  const copySetOut = async () => {
    try {
      await navigator.clipboard.writeText(setOut);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Keep the on-screen schedule available when clipboard access is blocked. */
    }
  };
  const sideMm = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.round(diagonal(a, b) * 1000).toLocaleString();
  const coordMm = (metres: number) => Math.round(metres * 1000).toLocaleString();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <Ruler className="size-3.5 text-canopy-400" />
        <CardTitle className="flex-1">Ground set-out &amp; build plan</CardTitle>
        <Button variant="ghost" size="sm" onClick={copySetOut}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy set-out"}
        </Button>
      </CardHeader>
      <CardBody className="panel-scroll space-y-4 overflow-y-auto">
        <p className="text-[11px] leading-relaxed text-slate-bark-400">Start at the front-left corner (FL). Coordinates below are plan dimensions from that datum; use the ground as a measured layout, not a substitute for verified site levels or foundation design.</p>
        <section className="rounded-md border border-slate-bark-800 bg-slate-bark-950/60 p-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-canopy-300">1 · Mark the footprint</h3>
          <p className="mt-1 text-[10px] text-slate-bark-500">FL is (0, 0); X right, Y back · all figures mm</p>
          <div className="mt-2 space-y-1.5">
            {points.map(({ name, at }) => <div key={name} className="flex justify-between gap-3 font-mono text-[10px]"><span className="text-slate-bark-300">{name}</span><span className="text-canopy-200 tnum">X {coordMm(at.x)} · Y {coordMm(fromFront(at))}</span></div>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-bark-800 pt-2 font-mono text-[10px]">
            <span className="text-slate-bark-500">Front FL–FR</span><span className="text-right text-slate-bark-200">{sideMm(plan.fl, plan.fr)} mm</span>
            <span className="text-slate-bark-500">Right FR–BR</span><span className="text-right text-slate-bark-200">{sideMm(plan.fr, plan.br)} mm</span>
            <span className="text-slate-bark-500">Back BR–BL</span><span className="text-right text-slate-bark-200">{sideMm(plan.br, plan.bl)} mm</span>
            <span className="text-slate-bark-500">Left BL–FL</span><span className="text-right text-slate-bark-200">{sideMm(plan.bl, plan.fl)} mm</span>
            <span className="border-t border-slate-bark-800 pt-1 text-canopy-300">Diagonal FL–BR</span><span className="border-t border-slate-bark-800 pt-1 text-right text-canopy-200">{sideMm(plan.fl, plan.br)} mm</span>
            <span className="text-canopy-300">Diagonal FR–BL</span><span className="text-right text-canopy-200">{sideMm(plan.fr, plan.bl)} mm</span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-bark-500">Use a baseline, square, tape and batter boards; measure both diagonals to check the footprint. This plan may be intentionally skewed—do not force the diagonals equal. Confirm each corner angle against the design before fixing the layout.</p>
        </section>
        <section className="rounded-md border border-slate-bark-800 bg-slate-bark-950/60 p-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-canopy-300">2 · Stake every post</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-bark-500">Post-centre coordinates relative to FL; corner IDs match the model. Set levels from a common datum, then verify actual finished floor / pad heights separately.</p>
          <div className="panel-scroll mt-2 max-h-44 space-y-1 overflow-y-auto">
            {posts.map((post, index) => <div key={post.id} className="flex justify-between gap-3 font-mono text-[10px]"><span className="text-slate-bark-300">{postLabel(post, index)}{post.corner ? " corner" : " post"}</span><span className="text-canopy-200 tnum">X {coordMm(post.at.x)} · Y {coordMm(fromFront(post.at))}</span></div>)}
          </div>
        </section>
        <section className="rounded-md border border-slate-bark-800 bg-slate-bark-950/60 p-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-canopy-300">3 · Solo-friendly assembly sequence</h3>
          <ol className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-bark-300">
            <li><b className="text-canopy-200">Before digging:</b> check permissions, underground services, boundary clearances, access and the engineer-approved foundation / anchor detail.</li>
            <li><b className="text-canopy-200">Prepare:</b> freeze a design revision; confirm member capacities, wind/uplift, connections, foundations and supplier section properties with a qualified professional. Order and label cut members by run.</li>
            <li><b className="text-canopy-200">Set out:</b> establish one level datum, batter boards, footprint corners and post centres. Check side lengths, both design diagonals, boundary offsets and finished levels before excavating.</li>
            <li><b className="text-canopy-200">Foundations:</b> form and cure the engineer-specified pads/anchors; recheck centre positions and levels before lifting steel.</li>
            <li><b className="text-canopy-200">Frame safely:</b> plan lifts and temporary bracing; use suitable lifting gear / a second person for long or heavy members. Stand and brace posts, fit perimeter rails, square/plumb-check, then install braces and roof girders/purlins.</li>
            <li><b className="text-canopy-200">Close in:</b> trial-fit tracks and doors, test clearances, then install glazing and roof sheets following the panel maker’s expansion, sealing and fixing instructions.</li>
            <li><b className="text-canopy-200">Final check:</b> verify anchors, bolts, plumb, drainage/fall, door travel, sharp edges and weather seals; keep temporary bracing until the permanent frame is complete and checked.</li>
          </ol>
        </section>
        <div className="flex gap-2 rounded-md border border-brass-400/30 bg-brass-400/5 p-3">
          <HardHat className="mt-0.5 size-4 shrink-0 text-brass-300" />
          <p className="text-[10px] leading-relaxed text-slate-bark-300"><b className="text-brass-200">Planning aid only—not construction or structural instructions.</b> The generated sizes, spacing and foundations are not verified for site loads, ground, wind, connections or local rules. Obtain approval and qualified design review before ordering, excavation or assembly. Do not erect long/heavy members alone; use a lift plan and competent help.</p>
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sourcing                                                            */
/* ------------------------------------------------------------------ */

export function SourcingPanel() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const done = SUPPLIERS.filter((s) => checked[s.name + s.where]).length;

  return (
    <Card>
      <CardHeader>
        <MapPin className="size-3.5 text-canopy-400" />
        <CardTitle className="flex-1">
          Where to buy it — Runcorn &amp; Widnes
        </CardTitle>
        <Badge tone={done === SUPPLIERS.length ? "green" : "neutral"}>
          {done}/{SUPPLIERS.length}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-[11px] leading-relaxed text-slate-bark-400">
          A shortlist of the counters around Runcorn, Widnes and the nearby
          Deeside / Flintshire belt that normally stock this sort of build.
          Tick them off as you get them.
        </p>

        {SUPPLIER_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-canopy-400">
              {cat}
            </p>
            <div className="space-y-1.5">
              {SUPPLIERS.filter((s) => s.category === cat).map((s) => (
                <button
                  key={s.name + s.where}
                  type="button"
                  onClick={() =>
                    setChecked((c) => ({ ...c, [s.name + s.where]: !c[s.name + s.where] }))
                  }
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors",
                    checked[s.name + s.where]
                      ? "border-canopy-800 bg-canopy-900/30"
                      : "border-slate-bark-800 bg-slate-bark-950/50 hover:border-canopy-900",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                      checked[s.name + s.where]
                        ? "border-canopy-400 bg-canopy-500 text-slate-bark-950"
                        : "border-slate-bark-600",
                    )}
                  >
                    {checked[s.name + s.where] && (
                      <Check className="size-3" strokeWidth={3} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          checked[s.name + s.where]
                            ? "text-slate-bark-500 line-through"
                            : "text-slate-bark-100",
                        )}
                      >
                        {s.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-bark-500">
                        {s.where}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-bark-400">
                      {s.for}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-canopy-600">
                      search: {s.search}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2 rounded-md border border-slate-bark-800 bg-slate-bark-950/60 p-3">
          <Truck className="mt-0.5 size-4 shrink-0 text-slate-bark-500" />
          <p className="text-[11px] leading-relaxed text-slate-bark-400">
            Branches, opening hours and stock change — confirm before you
            travel, and ask whether they cut to length on site. Ask the steel
            supplier for the load table on your Z and C sections and take it to
            whoever signs the build off.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
