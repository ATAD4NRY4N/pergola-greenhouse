import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  COMPONENT_CATEGORIES,
  DEFAULT_COMPONENT_VISIBILITY,
  DEFAULT_DESIGN,
  buildModel,
  type ComponentVisibility,
  type Design,
} from "../lib/model";
import { Axonometric } from "./views/Axonometric";
import { PlanView } from "./views/PlanView";
import { ElevationView, SectionView } from "./views/ElevationView";
import { DoorDetailView } from "./views/DoorDetailView";
import { ControlPanel } from "./ControlPanel";
import { OrbitControls, XyzPad } from "./ViewControls";
import { BuildPlanPanel, ChecksPanel, CutListPanel, SourcingPanel } from "./panels";
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
  Leaf,
  DoorOpen,
  Home,
} from "lucide-react";

type ViewKey = "axon" | "plan" | "front" | "right" | "back" | "left" | "section" | "door";
type SideKey = "cut" | "checks" | "sourcing" | "build";

const VIEWS: { key: ViewKey; label: string; icon: typeof Box }[] = [
  { key: "axon", label: "3D", icon: Box },
  { key: "plan", label: "Plan", icon: MapIcon },
  { key: "front", label: "Front", icon: Columns3 },
  { key: "right", label: "Right", icon: PanelTop },
  { key: "back", label: "Back", icon: PanelTop },
  { key: "left", label: "Left", icon: PanelTop },
  { key: "section", label: "Section", icon: Ruler },
  { key: "door", label: "Door detail", icon: DoorOpen },
];

const SIDES: { key: SideKey; label: string; icon: typeof Boxes }[] = [
  { key: "cut", label: "Cut list", icon: ClipboardList },
  { key: "checks", label: "Checks", icon: Grid3x3 },
  { key: "sourcing", label: "Sourcing", icon: MapPin },
  { key: "build", label: "Build plan", icon: Home },
];

export function DesignerApp({ store }: { store: DesignStore }) {
  const [design, setDesign] = useState<Design>(() => ({
    ...DEFAULT_DESIGN,
    name: DEFAULT_DESIGN.name,
  }));
  const [view, setView] = useState<ViewKey>("axon");
  const [side, setSide] = useState<SideKey>("cut");
  const [componentVisibility, setComponentVisibility] = useState<ComponentVisibility>(
    () => ({ ...DEFAULT_COMPONENT_VISIBILITY }),
  );
  const [yaw, setYaw] = useState(-38);
  const [tilt, setTilt] = useState(58);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0, z: 0 });
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
        <div className="flex items-center gap-2 pr-1 text-canopy-300">
          <Leaf className="size-4" />
          <span className="hidden font-mono text-xs font-semibold uppercase tracking-[0.2em] sm:inline">
            Polyframe
          </span>
        </div>

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

            {COMPONENT_CATEGORIES.filter((component) => component.id !== "sheets" && component.id !== "aluminium-trim" && component.id !== "fixings" && component.id !== "wall-framing").map((component) => (
              <ToggleChip
                key={component.id}
                on={componentVisibility[component.id]}
                onClick={() =>
                  setComponentVisibility((current) => ({
                    ...current,
                    [component.id]: !current[component.id],
                  }))
                }
                icon={<Eye className="size-3.5" />}
                label={component.label}
                color={component.color}
              />
            ))}
            <ToggleChip
              on={componentVisibility.sheets}
              onClick={() => setComponentVisibility((current) => ({ ...current, sheets: !current.sheets }))}
              icon={<Eye className="size-3.5" />}
              label="Polycarbonate"
              color="#67cbe3"
            />
            <ToggleChip
              on={componentVisibility["aluminium-trim"]}
              onClick={() => setComponentVisibility((current) => ({ ...current, "aluminium-trim": !current["aluminium-trim"] }))}
              icon={<Eye className="size-3.5" />}
              label="Aluminium trim"
              color="#f1c877"
            />
            <ToggleChip
              on={componentVisibility.fixings}
              onClick={() => setComponentVisibility((current) => ({ ...current, fixings: !current.fixings }))}
              icon={<Eye className="size-3.5" />}
              label="Fixings"
              color="#ed806c"
            />

            {view === "axon" && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <XyzPad
                  pan={pan}
                  onChange={setPan}
                  onReset={() => setPan({ x: 0, y: 0, z: 0 })}
                />
                <OrbitControls
                  yaw={yaw}
                  tilt={tilt}
                  zoom={zoom}
                  onYaw={setYaw}
                  onTilt={setTilt}
                  onZoom={setZoom}
                  onReset={() => {
                    setYaw(-38);
                    setTilt(58);
                    setZoom(1);
                    setPan({ x: 0, y: 0, z: 0 });
                  }}
                />
              </div>
            )}
          </div>

          <div ref={ref} className="bp-grid relative min-h-[320px] flex-1 overflow-hidden">
            {view === "axon" && (
              <Axonometric
                model={model}
                showSheets
                showSteel
                visibility={componentVisibility}
                width={w}
                height={h}
                yaw={yaw}
                tilt={tilt}
                zoom={zoom}
                onYaw={setYaw}
                onTilt={setTilt}
                onZoom={setZoom}
                pan={pan}
                onPan={setPan}
              />
            )}
            {view === "plan" && (
              <PlanView
                model={model}
                width={w}
                height={h}
                showSheets
                showFrame
                visibility={componentVisibility}
              />
            )}
            {view === "front" && (
              <ElevationView
                model={model}
                side="front"
                width={w}
                height={h}
                showSteel
                visibility={componentVisibility}
              />
            )}
            {view === "right" && (
              <ElevationView
                model={model}
                side="right"
                width={w}
                height={h}
                showSteel
                visibility={componentVisibility}
              />
            )}
            {view === "back" && (
              <ElevationView model={model} side="back" width={w} height={h} showSteel visibility={componentVisibility} />
            )}
            {view === "left" && (
              <ElevationView model={model} side="left" width={w} height={h} showSteel visibility={componentVisibility} />
            )}
            {view === "section" && (
              <SectionView model={model} width={w} height={h} visibility={componentVisibility} />
            )}
            {view === "door" && (
              <DoorDetailView model={model} width={w} height={h} />
            )}

            {view === "axon" && (
              <p className="pointer-events-none absolute right-3 top-3 rounded-md border border-slate-bark-800 bg-slate-bark-950/80 px-2.5 py-1.5 text-right font-mono text-[10px] leading-relaxed text-slate-bark-500 backdrop-blur">
                drag = orbit
                <br />
                right / shift-drag = move X, Y, Z
                <br />
                wheel = zoom · eye-level = tilt 0°
                <br />
                double-click = recenter
              </p>
            )}

            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-slate-bark-800 bg-slate-bark-950/80 px-3 py-2 backdrop-blur">
              {COMPONENT_CATEGORIES.filter((component) => component.id !== "wall-framing" && componentVisibility[component.id]).map((component) => (
                <span
                  key={component.id}
                  className="flex items-center gap-1.5 font-mono text-[10px] text-slate-bark-400"
                >
                  <span className="inline-block h-0.5 w-4 rounded" style={{ background: component.color }} />
                  {component.label}
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
            {side === "build" && <BuildPlanPanel model={model} />}
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
  color,
}: {
  on: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={color ? { color: on ? color : undefined } : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] transition-colors",
        on
          ? "bg-slate-bark-800 text-canopy-200"
          : "text-slate-bark-500 hover:text-slate-bark-300",
      )}
      title={`${on ? "Hide" : "Show"} ${label.toLowerCase()}`}
    >
      {icon}
      {label}
    </button>
  );
}