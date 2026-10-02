import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { DEFAULT_DESIGN, buildModel, type Design } from "../lib/model";
import { Axonometric } from "./views/Axonometric";
import { PlanView } from "./views/PlanView";
import { ElevationView, SectionView } from "./views/ElevationView";
import { ControlPanel } from "./ControlPanel";
import { ChecksPanel, CutListPanel, SourcingPanel } from "./panels";
import { Badge, Button, Card } from "./ui";
import { cn, mmNum } from "../lib/utils";
import { coerceDesign, type DesignStore } from "../lib/stores";
import { useBox } from "./useBox";
import {
  Box,
  Map as MapIcon,
  PanelTop,
  Columns3,
  Ruler,
  Save,
  FolderOpen,
  Trash2,
  Boxes,
  ClipboardList,
  MapPin,
  Eye,
  Grid3x3,
  CircleDot,
  Leaf,
  RotateCw,
  X,
  CloudOff,
} from "lucide-react";

type ViewKey = "axon" | "plan" | "front" | "left" | "section";
type SideKey = "cut" | "checks" | "sourcing";

const VIEWS: { key: ViewKey; label: string; icon: typeof Box }[] = [
  { key: "axon", label: "3D", icon: Box },
  { key: "plan", label: "Plan", icon: MapIcon },
  { key: "front", label: "Front", icon: Columns3 },
  { key: "left", label: "Left", icon: PanelTop },
  { key: "section", label: "Section", icon: Ruler },
];

const SIDES: { key: SideKey; label: string; icon: typeof Boxes }[] = [
  { key: "cut", label: "Cut list", icon: ClipboardList },
  { key: "checks", label: "Checks", icon: Grid3x3 },
  { key: "sourcing", label: "Sourcing", icon: MapPin },
];

export function DesignerApp({
  store,
  sessionLabel,
  onSignOut,
}: {
  store: DesignStore;
  sessionLabel: string;
  onSignOut?: () => void;
}) {
  const [design, setDesign] = useState<Design>(() => ({
    ...DEFAULT_DESIGN,
    name: DEFAULT_DESIGN.name,
  }));
  const [view, setView] = useState<ViewKey>("axon");
  const [side, setSide] = useState<SideKey>("cut");
  const [showSheets, setShowSheets] = useState(true);
  const [showSteel, setShowSteel] = useState(true);
  const [showFrame, setShowFrame] = useState(true);
  const [yaw, setYaw] = useState(-38);
  const [tilt] = useState(58);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const { ref, w, h } = useBox<HTMLDivElement>();

  const model = useMemo(() => buildModel(design), [design]);

  const patch = useCallback((p: Partial<Design>) => {
    setDesign((d) => ({ ...d, ...p }));
  }, []);

  const reset = useCallback(() => setDesign({ ...DEFAULT_DESIGN }), []);

  const summary = useMemo(
    () =>
      `${model.design.width.toFixed(2)}m wide · ${model.design.depthLeft.toFixed(2)}/${model.design.depthRight.toFixed(2)}m deep · ${model.roofPitchDeg.toFixed(1)}° fall · ${model.stats.totalSheets} sheets · ${model.posts.length} posts`,
    [model],
  );

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2400);
  };

  const doSave = async () => {
    flash("Saving…");
    try {
      const id = await store.save({ id: savedId, name: design.name, summary, design });
      setSavedId(id);
      flash("Saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save");
    }
  };

  const load = (id: string, raw: unknown) => {
    setDesign(coerceDesign(raw));
    setSavedId(id);
    setShowSaved(false);
    flash("Loaded");
  };

  const remove = async (id: string) => {
    await store.remove(id);
    if (savedId === id) setSavedId(null);
  };

  const errors = model.warnings.filter((x) => x.level === "error").length;
  const warns = model.warnings.filter((x) => x.level === "warn").length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-bark-950">
      {/* ---------------- top bar ---------------- */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-bark-800 bg-slate-bark-900/80 px-3 py-2 backdrop-blur">
        <Link
          to="/"
          className="flex items-center gap-2 pr-1 text-canopy-300 transition-colors hover:text-canopy-200"
        >
          <Leaf className="size-4" />
          <span className="hidden font-mono text-xs font-semibold uppercase tracking-[0.2em] sm:inline">
            Polyframe
          </span>
        </Link>

        <div className="min-w-0 flex-1 basis-56">
          <input
            value={design.name}
            onChange={(e) => patch({ name: e.target.value })}
            aria-label="Design name"
            className="w-full max-w-xs truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-bark-100 outline-none transition-colors hover:border-slate-bark-700 focus:border-canopy-600"
          />
          <p className="truncate px-2 font-mono text-[10px] text-slate-bark-500">
            {summary}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {errors > 0 && <Badge tone="red">{errors} clash</Badge>}
          {warns > 0 && <Badge tone="brass">{warns} to check</Badge>}
          {model.warnings.length === 0 && <Badge tone="green">no clashes</Badge>}
        </div>

        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowSaved((v) => !v)}>
            <FolderOpen className="size-3.5" />
            <span className="hidden sm:inline">Designs</span>
            {store.designs.length > 0 && (
              <Badge tone="neutral" className="ml-1">
                {store.designs.length}
              </Badge>
            )}
          </Button>
          {showSaved && (
            <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-lg border border-slate-bark-800 bg-slate-bark-900 p-2 shadow-2xl">
              <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-bark-500">
                Saved designs
              </p>
              {store.designs.length === 0 && (
                <p className="px-2 pb-2 text-[11px] text-slate-bark-500">
                  Nothing saved yet. Hit Save to keep the current layout.
                </p>
              )}
              <div className="panel-scroll max-h-72 space-y-1 overflow-y-auto">
                {store.designs.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1 rounded-md px-1 hover:bg-slate-bark-800"
                  >
                    <button
                      onClick={() => load(s.id, s.design)}
                      className="min-w-0 flex-1 rounded px-2 py-1.5 text-left"
                    >
                      <span className="block truncate text-xs text-slate-bark-200">
                        {s.name || "Untitled"}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-slate-bark-500">
                        {s.summary}
                      </span>
                    </button>
                    <button
                      onClick={() => void remove(s.id)}
                      aria-label="Delete design"
                      className="rounded p-1.5 text-slate-bark-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button variant="primary" size="sm" onClick={doSave}>
          <Save className="size-3.5" />
          Save
        </Button>

        <div className="flex items-center gap-2 border-l border-slate-bark-800 pl-3">
          <span className="hidden max-w-[9rem] truncate font-mono text-[10px] text-slate-bark-500 md:inline">
            {sessionLabel}
          </span>
          {onSignOut ? (
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-1.5 text-slate-bark-400 transition-colors hover:bg-slate-bark-800 hover:text-slate-bark-100"
            >
              <X className="size-4" />
            </button>
          ) : (
            <span
              title="Saved in this browser only"
              className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] text-slate-bark-500"
            >
              <CloudOff className="size-3.5" />
              <span className="hidden lg:inline">local</span>
            </span>
          )}
        </div>
      </header>

      {/* ---------------- body ---------------- */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-bark-800 bg-slate-bark-900/40 lg:w-[336px] lg:border-b-0 lg:border-r">
          <div className="h-[40vh] lg:h-full">
            <ControlPanel design={design} onChange={patch} onReset={reset} />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-bark-800 bg-slate-bark-900/40 px-3 py-2">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                  view === v.key
                    ? "bg-canopy-500 text-slate-bark-950"
                    : "text-slate-bark-400 hover:bg-slate-bark-800 hover:text-slate-bark-200",
                )}
              >
                <v.icon className="size-3.5" />
                {v.label}
              </button>
            ))}

            <span className="mx-1 h-4 w-px bg-slate-bark-800" />

            <ToggleChip
              on={showSheets}
              onClick={() => setShowSheets((s) => !s)}
              icon={<Eye className="size-3.5" />}
              label="Sheets"
            />
            <ToggleChip
              on={showSteel}
              onClick={() => setShowSteel((s) => !s)}
              icon={<Columns3 className="size-3.5" />}
              label="Steel"
            />
            {(view === "plan" || view === "axon") && (
              <ToggleChip
                on={showFrame}
                onClick={() => setShowFrame((s) => !s)}
                icon={<CircleDot className="size-3.5" />}
                label="Purlin layout"
              />
            )}

            {view === "axon" && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setYaw((y) => y + 45)}
                  aria-label="Rotate 45 degrees"
                  className="rounded-md p-1.5 text-slate-bark-400 transition-colors hover:bg-slate-bark-800 hover:text-canopy-300"
                >
                  <RotateCw className="size-3.5" />
                </button>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={yaw}
                  onChange={(e) => setYaw(Number(e.target.value))}
                  aria-label="Rotation"
                  className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-slate-bark-800 accent-canopy-400"
                />
                <span className="w-9 font-mono text-[10px] text-slate-bark-500 tnum">
                  {Math.round(yaw)}°
                </span>
              </div>
            )}
          </div>

          <div ref={ref} className="bp-grid relative min-h-[320px] flex-1 overflow-hidden">
            {view === "axon" && (
              <Axonometric
                model={model}
                showSheets={showSheets}
                showSteel={showSteel}
                width={w}
                height={h}
                yaw={yaw}
                tilt={tilt}
                onYaw={setYaw}
              />
            )}
            {view === "plan" && (
              <PlanView
                model={model}
                width={w}
                height={h}
                showSheets={showSheets}
                showFrame={showFrame}
              />
            )}
            {view === "front" && (
              <ElevationView
                model={model}
                side="front"
                width={w}
                height={h}
                showSteel={showSteel}
              />
            )}
            {view === "left" && (
              <ElevationView
                model={model}
                side="left"
                width={w}
                height={h}
                showSteel={showSteel}
              />
            )}
            {view === "section" && <SectionView model={model} width={w} height={h} />}

            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-slate-bark-800 bg-slate-bark-950/80 px-3 py-2 backdrop-blur">
              {[
                ["#8fd9ab", "C purlin ring"],
                ["#7ecfb0", "Z purlin / girder"],
                ["#cfe3d8", "SHS post"],
                ["#e0b05c", "door + track"],
                ["#8ad7e3", "polycarbonate"],
              ].map(([c, t]) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 font-mono text-[10px] text-slate-bark-400"
                >
                  <span
                    className="inline-block h-0.5 w-4 rounded"
                    style={{ background: c }}
                  />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-px border-t border-slate-bark-800 bg-slate-bark-800 sm:grid-cols-3 lg:grid-cols-6">
            {[
              [
                "Footprint",
                `${mmNum(model.stats.footprintW)} × ${mmNum(model.stats.footprintD)}`,
              ],
              ["Roof area", `${model.stats.roofArea.toFixed(1)} m²`],
              ["Polycarb", `${model.stats.totalSheets} sheets`],
              ["Steel", `${model.stats.steelKg.toLocaleString()} kg`],
              ["Posts", `${model.posts.length} perimeter`],
              ["Roof fall", `${Math.abs(model.roofPitchDeg).toFixed(1)}°`],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-bark-900 px-3 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-bark-500">
                  {k}
                </p>
                <p className="font-mono text-xs text-canopy-200 tnum">{v}</p>
              </div>
            ))}
          </div>
        </main>

        <aside className="flex w-full shrink-0 flex-col border-t border-slate-bark-800 bg-slate-bark-900/40 lg:w-[400px] lg:border-l lg:border-t-0">
          <div className="flex shrink-0 gap-1 border-b border-slate-bark-800 px-2 py-2">
            {SIDES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSide(s.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  side === s.key
                    ? "bg-canopy-500 text-slate-bark-950"
                    : "text-slate-bark-400 hover:bg-slate-bark-800 hover:text-slate-bark-200",
                )}
              >
                <s.icon className="size-3.5" />
                <span className="hidden xl:inline">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 p-3">
            {side === "cut" && <CutListPanel model={model} />}
            {side === "checks" && <ChecksPanel model={model} />}
            {side === "sourcing" && <SourcingPanel />}
          </div>
        </aside>
      </div>

      {status && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <Card className="bg-slate-bark-900/95 px-4 py-2 text-xs text-canopy-200 shadow-xl">
            {status}
          </Card>
        </div>
      )}
    </div>
  );
}

function ToggleChip({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] transition-colors",
        on
          ? "bg-slate-bark-800 text-canopy-200"
          : "text-slate-bark-500 hover:text-slate-bark-300",
      )}
    >
      {icon}
      {label}
    </button>
  );
}