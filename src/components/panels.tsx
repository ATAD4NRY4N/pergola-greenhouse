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
      label: "Governing purlin span",
      value: `${s.governingPurlinSpan.toFixed(2)} m`,
      sub: `Z${model.design.roofPurlinDepth}×${model.design.roofPurlinGauge}`,
    },
    {
      label: "Door track",
      value: `${s.trackLength.toFixed(2)} m`,
      sub: `${model.design.frontDoors + model.design.rightDoors} leaves × 2 wheels`,
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

      <div className="space-y-2">
        {model.warnings.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-canopy-800 bg-canopy-900/40 px-3 py-2.5">
            <Check className="size-4 text-canopy-400" />
            <p className="text-xs text-canopy-200">
              No clashes found in the indicative checks.
            </p>
          </div>
        )}
        {model.warnings.map((w, i) => (
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
/* Sourcing                                                            */
/* ------------------------------------------------------------------ */

export function SourcingPanel() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const done = SUPPLIERS.filter((s) => checked[s.name]).length;

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
