import type { CornerFix, CornerId, Design, PolyWall, RingBuild } from "../lib/model";
import { Badge, Button, Input, Label } from "./ui";
import { cn, mmNum } from "../lib/utils";
import {
  ChevronDown,
  Ruler,
  Layers,
  DoorOpen,
  Boxes,
  RotateCcw,
  Factory,
  TriangleAlert,
  Minus,
  Plus,
  Move3d,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-bark-800/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-bark-800/40"
      >
        <span className="text-canopy-400">{icon}</span>
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-bark-200">
          {title}
        </span>
        {badge}
        <ChevronDown
          className={cn(
            "size-3.5 text-slate-bark-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

function Dim({
  label,
  value,
  min,
  max,
  step,
  unit = "m",
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: "m" | "mm" | "no." | "kN/m²" | "MPa";
  hint?: string;
  onChange: (v: number) => void;
}) {
  const clampTo = (v: number) => Math.min(max, Math.max(min, v));
  const scrub = useRef<{
    startX: number;
    startValue: number;
    active: boolean;
  } | null>(null);

  // Drag the number left and right to scrub it. Much quicker than aiming for
  // the slider thumb when you already know roughly what you want.
  const onScrubDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrub.current = { startX: e.clientX, startValue: value, active: true };
  };
  const onScrubMove = (e: React.PointerEvent) => {
    const s = scrub.current;
    if (!s?.active) return;
    const span = max - min;
    const perPx = span / 320;
    onChange(clampTo(s.startValue + (e.clientX - s.startX) * perPx));
  };
  const onScrubUp = () => {
    if (scrub.current) scrub.current.active = false;
  };

  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 2 : 0;
  const display =
    unit === "m"
      ? value.toFixed(decimals)
      : unit === "no."
        ? String(Math.round(value))
        : value.toFixed(decimals);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Stepper
          onClick={() => onChange(clampTo(value - step))}
          disabled={value <= min}
          title={`Decrease ${label}`}
        >
          <Minus className="size-3.5" />
        </Stepper>

        <span className="min-w-0 flex-1">
          <span
            className="pf-scrub block select-none text-xs font-medium text-slate-bark-300"
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            onPointerCancel={onScrubUp}
            title="Drag left and right to scrub"
          >
            {label}
          </span>
        </span>

        <div className="flex items-center gap-0.5">
          <Input
            type="number"
            value={display}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) onChange(clampTo(n));
            }}
            className="h-8 w-[4.5rem] px-2 text-right font-mono text-xs tnum"
          />
          <span className="min-w-8 whitespace-nowrap px-1 font-mono text-[10px] text-slate-bark-500">
            {unit}
          </span>
        </div>

        <Stepper
          onClick={() => onChange(clampTo(value + step))}
          disabled={value >= max}
          title={`Increase ${label}`}
        >
          <Plus className="size-3.5" />
        </Stepper>
      </div>

      <input
        type="range"
        className="pf-slider mt-0.5"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />

      {hint && (
        <p className="font-mono text-[10px] leading-tight text-slate-bark-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function Stepper({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-bark-700 bg-slate-bark-950 text-slate-bark-400 transition-colors hover:border-canopy-700 hover:bg-canopy-900/60 hover:text-canopy-200 active:bg-canopy-500 active:text-slate-bark-950 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 grid grid-flow-col gap-1 rounded-md bg-slate-bark-950 p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded px-2 py-1.5 font-mono text-[11px] transition-colors",
              value === o.value
                ? "bg-canopy-500 text-slate-bark-950"
                : "text-slate-bark-400 hover:bg-slate-bark-800 hover:text-slate-bark-200",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-md border border-slate-bark-800 bg-slate-bark-950/60 px-3 py-2 text-left transition-colors hover:border-canopy-800"
    >
      <span className="text-xs text-slate-bark-300">{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-canopy-500" : "bg-slate-bark-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function ControlPanel({
  design,
  onChange,
  onReset,
}: {
  design: Design;
  onChange: (patch: Partial<Design>) => void;
  onReset: () => void;
}) {
  const set = <K extends keyof Design>(k: K, v: Design[K]) =>
    onChange({ [k]: v } as Partial<Design>);
  const setCorner = (id: CornerId, fix: CornerFix) =>
    onChange({ corners: { ...design.corners, [id]: fix } });

  // The front run is straight, so both front corners are a true 90 deg and any
  // skew lands on the back, where the back-left corner reaches further out.
  const frontRun = design.width;
  const delta = design.depthLeft - design.depthRight;
  const skew = (Math.atan2(Math.abs(delta), design.width) * 180) / Math.PI;
  const backLeftAngle = delta >= 0 ? 90 - skew : 90 + skew;
  const backRightAngle = 180 - backLeftAngle;

  return (
    <div className="panel-scroll h-full overflow-y-auto">
      {/* header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-bark-800 bg-slate-bark-900/95 px-4 py-3 backdrop-blur">
        <Ruler className="size-4 text-canopy-400" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-bark-200">
          Dimensions
        </span>
        <Button variant="ghost" size="sm" onClick={onReset} title="Reset to the briefed size">
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      <p className="flex items-start gap-1.5 border-b border-slate-bark-800/80 bg-slate-bark-950/40 px-4 py-2 font-mono text-[10px] leading-relaxed text-slate-bark-500">
        <Move3d className="mt-px size-3 shrink-0 text-canopy-500" />
        Drag a label to scrub it, drag the slider, or use the −/+ buttons.
      </p>

      <Section title="Footprint" icon={<Layers className="size-3.5" />}>
        <Dim
          label="Overall width"
          value={design.width}
          min={3}
          max={14}
          step={0.05}
          onChange={(v) => set("width", v)}
          hint={`${mmNum(design.width)} across, log cabin side to wall/fence side`}
        />
        <Dim
          label="Depth — left run"
          value={design.depthLeft}
          min={2}
          max={14}
          step={0.05}
          onChange={(v) => set("depthLeft", v)}
          hint={`${mmNum(design.depthLeft)} — the log cabin run, your deep side`}
        />
        <Dim
          label="Depth — right run"
          value={design.depthRight}
          min={2}
          max={14}
          step={0.05}
          onChange={(v) => set("depthRight", v)}
          hint={`${mmNum(design.depthRight)} — match the left to square the back corners up`}
        />
        <div className="rounded-md border border-slate-bark-800 bg-slate-bark-950/60 p-2.5">
          <p className="font-mono text-[10px] leading-relaxed text-slate-bark-400">
            Front run{" "}
            <span className="text-canopy-300 tnum">{mmNum(frontRun)}</span> ·
            front corners{" "}
            <span className="text-canopy-300 tnum">90.0°</span> · back-left{" "}
            <span
              className={cn(
                "tnum",
                Math.abs(backLeftAngle - 90) > 0.25 ? "text-brass-400" : "text-canopy-300",
              )}
            >
              {backLeftAngle.toFixed(1)}°
            </span>{" "}
            · back-right{" "}
            <span
              className={cn(
                "tnum",
                Math.abs(backRightAngle - 90) > 0.25 ? "text-brass-400" : "text-canopy-300",
              )}
            >
              {backRightAngle.toFixed(1)}°
            </span>
          </p>
        </div>
      </Section>

      <Section title="Height & fall" icon={<Layers className="size-3.5" />}>
        <Dim
          label="Eave — left (low)"
          value={design.eaveLeft}
          min={1.9}
          max={4}
          step={0.05}
          onChange={(v) => set("eaveLeft", v)}
          hint="Top of ring rail, log cabin side"
        />
        <Dim
          label="Eave — right (high)"
          value={design.eaveRight}
          min={1.9}
          max={4.5}
          step={0.05}
          onChange={(v) => set("eaveRight", v)}
          hint="Top of ring rail, door side"
        />
        <Dim
          label="Roof overhang"
          value={design.roofOverhang}
          min={0}
          max={1.2}
          step={0.05}
          onChange={(v) => set("roofOverhang", v)}
        />
      </Section>

      <Section title="Posts & perimeter ring" icon={<Boxes className="size-3.5" />}>
        <Seg
          label="SHS post size"
          value={design.postSize}
          options={[
            { value: 40, label: "40×40" },
            { value: 50, label: "50×50" },
            { value: 60, label: "60×60" },
            { value: 80, label: "80×80" },
          ]}
          onChange={(v) => set("postSize", v)}
        />
        <Dim
          label="Perimeter posts (incl. corners)"
          value={design.postCount}
          min={4}
          max={60}
          step={1}
          unit="no."
          onChange={(v) => set("postCount", Math.round(v))}
          hint="Evenly spread around the perimeter; the four corners are always included."
        />
        <Dim
          label="SHS wall thickness"
          value={design.postGauge}
          min={2}
          max={6}
          step={0.5}
          unit="mm"
          onChange={(v) => set("postGauge", v)}
        />
        <Seg
          label="C purlin ring"
          value={design.ringDepth}
          options={[
            { value: 75, label: "C75" },
            { value: 100, label: "C100" },
            { value: 125, label: "C125" },
            { value: 150, label: "C150" },
          ]}
          onChange={(v) => set("ringDepth", v)}
        />
        <Dim
          label="C purlin wall thickness"
          value={design.ringGauge}
          min={1}
          max={4}
          step={0.1}
          unit="mm"
          onChange={(v) => set("ringGauge", v)}
        />
        <Seg
          label="Front & back ring build"
          value={design.ringBuildFrontBack}
          options={[
            { value: "single" as RingBuild, label: "Single" },
            { value: "double" as RingBuild, label: "Doubled" },
          ]}
          onChange={(v) => set("ringBuildFrontBack", v)}
        />
      </Section>

      <Section
        title="Roof Z frame"
        icon={<Boxes className="size-3.5" />}
        defaultOpen={true}
      >
        <Seg
          label="Z purlin section"
          value={design.roofPurlinDepth}
          options={[
            { value: 100, label: "Z100" },
            { value: 150, label: "Z150" },
            { value: 175, label: "Z175" },
            { value: 200, label: "Z200" },
            { value: 250, label: "Z250" },
          ]}
          onChange={(v) => set("roofPurlinDepth", v)}
        />
        <Dim
          label="Z purlin wall thickness"
          value={design.roofPurlinGauge}
          min={1}
          max={4}
          step={0.1}
          unit="mm"
          onChange={(v) => set("roofPurlinGauge", v)}
        />
        <Dim
          label="Purlin centres"
          value={design.roofPurlinSpacing}
          min={0.3}
          max={1.5}
          step={0.05}
          onChange={(v) => set("roofPurlinSpacing", v)}
          hint="600 mm is the usual maximum for twinwall on a purlin."
        />
        <Seg
          label="Primary Z girders (front↔back)"
          value={design.girderCount}
          options={[
            { value: 0, label: "None" },
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
            { value: 4, label: "4" },
          ]}
          onChange={(v) => set("girderCount", v)}
        />
        <Dim
          label="Downward roof load"
          value={design.roofLoadKpa}
          min={0.1}
          max={5}
          step={0.05}
          unit="kN/m²"
          onChange={(v) => set("roofLoadKpa", v)}
          hint="Screening pressure in kN/m²; get site-specific snow/dead load from an engineer."
        />
        <Dim
          label="Steel yield strength"
          value={design.steelYieldMpa}
          min={200}
          max={550}
          step={10}
          unit="MPa"
          onChange={(v) => set("steelYieldMpa", v)}
          hint="MPa from the actual steel certificate; not a substitute for section capacity."
        />
        <p className="font-mono text-[10px] leading-relaxed text-slate-bark-500">
          Girders land on the front and skew rear ring rails. Roof checks use a
          simple elastic beam screen only; they do not include wind uplift,
          buckling, connections or manufacturer section properties.
        </p>
      </Section>

      <Section
        title="Polycarbonate & fixings"
        icon={<Layers className="size-3.5" />}
      >
        <Seg
          label="Sheet type"
          value={design.polyWall}
          options={[
            { value: "twin" as PolyWall, label: "Twinwall" },
            { value: "triple" as PolyWall, label: "Triplewall" },
          ]}
          onChange={(v) => set("polyWall", v)}
        />
        <Seg
          label="Thickness"
          value={design.polyThickness}
          options={[
            { value: 4, label: "4mm" },
            { value: 6, label: "6mm" },
            { value: 10, label: "10mm" },
            { value: 16, label: "16mm" },
          ]}
          onChange={(v) => set("polyThickness", v)}
        />
        <p className="font-mono text-[10px] leading-relaxed text-slate-bark-500">
          Sheets are 2438 × 1219 mm (8 × 4 ft). Door leaves use one whole sheet each.
        </p>
        <Dim
          label="Sheet fixing spacing"
          value={design.fixingSpacing}
          min={0.2}
          max={1.2}
          step={0.05}
          onChange={(v) => set("fixingSpacing", v)}
          hint="Illustrative roof fixing centres; follow the sheet manufacturer's schedule."
        />
        <Dim
          label="Tek screw / bolt head size"
          value={design.fixingDiameter}
          min={4}
          max={12}
          step={1}
          unit="mm"
          onChange={(v) => set("fixingDiameter", v)}
        />
        <Dim
          label="Door U-channel face width"
          value={design.aluminiumTrimSize}
          min={15}
          max={50}
          step={1}
          unit="mm"
          onChange={(v) => set("aluminiumTrimSize", v)}
        />
        <Dim
          label="Door U-channel return depth"
          value={design.doorTrimDepth}
          min={10}
          max={35}
          step={1}
          unit="mm"
          onChange={(v) => set("doorTrimDepth", v)}
        />
        <Dim
          label="Door U-channel wall thickness"
          value={design.doorTrimGauge}
          min={1}
          max={4}
          step={0.1}
          unit="mm"
          onChange={(v) => set("doorTrimGauge", v)}
        />
        <Toggle
          label="Knee braces at every post"
          checked={design.kneeBraces}
          onChange={(v) => set("kneeBraces", v)}
        />
        {design.kneeBraces && (
          <>
            <Dim
              label="Brace projection"
              value={design.kneeBraceLength}
              min={0.3}
              max={1.6}
              step={0.05}
              onChange={(v) => set("kneeBraceLength", v)}
              hint="Halves the front and back ring span without an internal post."
            />
            <Seg
              label="Knee brace section"
              value={design.kneeBraceSize}
              options={[
                { value: 50, label: "C50" },
                { value: 60, label: "C60" },
                { value: 75, label: "C75" },
                { value: 100, label: "C100" },
              ]}
              onChange={(v) => set("kneeBraceSize", v)}
            />
            <Dim
              label="Knee brace wall thickness"
              value={design.kneeBraceGauge}
              min={1}
              max={4}
              step={0.1}
              unit="mm"
              onChange={(v) => set("kneeBraceGauge", v)}
            />
          </>
        )}
      </Section>

      <Section title="Sliding doors" icon={<DoorOpen className="size-3.5" />}>
        <div className="rounded-md border border-brass-400/30 bg-brass-400/5 px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brass-300">
            Leaf is fixed
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-bark-300">
            One whole 8 × 4 ft sheet per leaf, in aluminium U-channel casing.
            Leaves stay side by side while the run has room; extra leaves overlap
            on alternating parallel lanes. The two-lane floor channel is schematic —
            confirm the complete hardware arrangement with the supplier.
          </p>
        </div>
        <Dim
          label="Front — leaves"
          value={design.frontDoors}
          min={0}
          max={10}
          step={1}
          unit="no."
          onChange={(v) => set("frontDoors", Math.round(v))}
        />
        <Dim
          label="Front — offset from left corner"
          hint="Measured from the front-left corner. The model limits the door set to the run; excess leaves overlap on two lanes."
          value={design.frontDoorOffset}
          min={0}
          max={10}
          step={0.05}
          onChange={(v) => set("frontDoorOffset", v)}
        />
        <Dim
          label="Right — leaves"
          value={design.rightDoors}
          min={0}
          max={10}
          step={1}
          unit="no."
          onChange={(v) => set("rightDoors", Math.round(v))}
        />
        <Dim
          label="Right — offset from front corner"
          hint="Measured back from the front-right corner. The model limits the door set to the run; excess leaves overlap on two lanes."
          value={design.rightDoorOffset}
          min={0}
          max={10}
          step={0.05}
          onChange={(v) => set("rightDoorOffset", v)}
        />
        <div>
          <Label>Door position</Label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={design.doorOpen}
            onChange={(e) => set("doorOpen", Number(e.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-bark-800 accent-brass-400"
          />
          <p className="mt-1 font-mono text-[10px] text-slate-bark-500">
            {design.doorOpen > 0.5 ? "Parked open" : "Closed"} — preview only
          </p>
        </div>
      </Section>

      <Section
        title="Corner fixings"
        icon={<TriangleAlert className="size-3.5" />}
        badge={
          design.depthLeft === design.depthRight ? (
            <Badge tone="green">all square</Badge>
          ) : (
            <Badge tone="brass">back skewed</Badge>
          )
        }
      >
        {(
          [
            ["fl", "Front-left", "doors, straight front", 90],
            ["fr", "Front-right", "doors, straight front", 90],
            ["br", "Back-right", "against wall/fence", backRightAngle],
            ["bl", "Back-left", "against wall/fence", backLeftAngle],
          ] as [CornerId, string, string, number][]
        ).map(([id, label, sub, angle]) => {
          const fix = design.corners[id];
          const square = Math.abs(angle - 90) < 0.25;
          const ok = fix === "adjustable" || square;
          return (
            <div
              key={id}
              className={cn(
                "rounded-md border p-2.5 transition-colors",
                ok
                  ? "border-slate-bark-800 bg-slate-bark-950/60"
                  : "border-red-500/40 bg-red-500/5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-bark-200">
                    {label}
                  </p>
                  <p className="font-mono text-[10px] text-slate-bark-500">
                    {sub} · {angle.toFixed(1)}°
                  </p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-1 rounded-md bg-slate-bark-900 p-0.5">
                  <button
                    type="button"
                    onClick={() => setCorner(id, "rigid90")}
                    className={cn(
                      "rounded px-2 py-1 font-mono text-[10px] transition-colors",
                      fix === "rigid90"
                        ? "bg-canopy-500 text-slate-bark-950"
                        : "text-slate-bark-400 hover:text-slate-bark-200",
                    )}
                  >
                    90°
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorner(id, "adjustable")}
                    className={cn(
                      "rounded px-2 py-1 font-mono text-[10px] transition-colors",
                      fix === "adjustable"
                        ? "bg-brass-400 text-slate-bark-950"
                        : "text-slate-bark-400 hover:text-slate-bark-200",
                    )}
                  >
                    adj
                  </button>
                </div>
              </div>
              {!ok && (
                <p className="mt-1.5 font-mono text-[10px] leading-tight text-red-300">
                  Rigid 90° cannot close a {angle.toFixed(1)}° corner — switch to
                  adjustable, or make both depths equal.
                </p>
              )}
            </div>
          );
        })}
      </Section>

      <Section
        title="Provenance"
        icon={<Factory className="size-3.5" />}
        defaultOpen={false}
      >
        <p className="font-mono text-[10px] leading-relaxed text-slate-bark-500">
          Door leaves are fixed-size whole 8 × 4 ft polycarbonate sheets edged
          in aluminium U-channel. Their slight brush-seal overlap and recessed
          floor-channel roller arrangement are schematic; confirm supplier hardware
          and structural details before construction.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onReset}
        >
          Restore the briefed 8.5 × 8.0 / 7.0 m layout
        </Button>
      </Section>

      <div className="px-4 py-3">
        <p className="font-mono text-[10px] leading-relaxed text-slate-bark-600">
          Preliminary roof-beam screening only—not a code check or build approval.
          Obtain site wind/snow loads, exact manufacturer properties, connection
          and foundation checks, and structural sign-off before construction.
        </p>
      </div>
    </div>
  );
}
