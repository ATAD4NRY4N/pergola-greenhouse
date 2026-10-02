import { useRef } from "react";
import { Move3d, RotateCcw } from "lucide-react";
import type { Vec3 } from "../lib/model";
import { cn } from "../lib/utils";

const AXES: { key: keyof Vec3; label: string; tint: string }[] = [
  { key: "x", label: "X", tint: "text-red-400" },
  { key: "y", label: "Y", tint: "text-canopy-300" },
  { key: "z", label: "Z", tint: "text-glass-300" },
];

const LIMIT = 6;

/**
 * Three draggable tracks that slide the model along each world axis.
 * Drag anywhere on a strip, or click its number to type an exact offset.
 */
export function XyzPad({
  pan,
  onChange,
  onReset,
}: {
  pan: Vec3;
  onChange: (p: Vec3) => void;
  onReset: () => void;
}) {
  const drag = useRef<{
    key: keyof Vec3;
    startX: number;
    startY: number;
    start: number;
  } | null>(null);

  const moved = pan.x !== 0 || pan.y !== 0 || pan.z !== 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-bark-800 bg-slate-bark-950/60 px-2 py-1.5">
      <Move3d className="size-3.5 shrink-0 text-canopy-400" />

      {AXES.map((a) => {
        const value = pan[a.key];
        return (
          <div key={a.key} className="flex items-center gap-1">
            <span className={cn("w-3 font-mono text-[10px] font-bold", a.tint)}>
              {a.label}
            </span>
            <div
              role="slider"
              tabIndex={0}
              aria-label={`Move along ${a.label}`}
              aria-valuenow={Math.round(value * 1000)}
              aria-valuemin={-LIMIT * 1000}
              aria-valuemax={LIMIT * 1000}
              title="Drag left and right to move along this axis"
              className="pf-scrub flex h-7 w-24 cursor-ew-resize items-center rounded border border-slate-bark-700 bg-slate-bark-900 px-1.5 outline-none transition-colors focus:border-canopy-500"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                drag.current = {
                  key: a.key,
                  startX: e.clientX,
                  startY: e.clientY,
                  start: value,
                };
              }}
              onPointerMove={(e) => {
                const g = drag.current;
                if (!g || g.key !== a.key) return;
                const next = g.start + (e.clientX - g.startX) * 0.02;
                onChange({ ...pan, [a.key]: Math.round(next * 100) / 100 });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 0.5 : 0.1;
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  onChange({
                    ...pan,
                    [a.key]: Math.round((pan[a.key] - step) * 100) / 100,
                  });
                }
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  onChange({
                    ...pan,
                    [a.key]: Math.round((pan[a.key] + step) * 100) / 100,
                  });
                }
              }}
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  value !== 0 ? "bg-canopy-400" : "bg-slate-bark-700",
                )}
                style={{ width: `${Math.min(100, (Math.abs(value) / LIMIT) * 100)}%` }}
              />
              <span className="pointer-events-none ml-auto pr-1 font-mono text-[10px] text-slate-bark-200 tnum">
                {value > 0 ? "+" : ""}
                {value.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onReset}
        disabled={!moved}
        title="Centre the model again"
        className="flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-bark-700 bg-slate-bark-900 text-slate-bark-400 transition-colors hover:border-canopy-700 hover:text-canopy-200 disabled:pointer-events-none disabled:opacity-30"
      >
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  );
}

/** Horizontal orbit and tilt sliders. */
export function OrbitControls({
  yaw,
  tilt,
  onYaw,
  onTilt,
  onReset,
}: {
  yaw: number;
  tilt: number;
  onYaw: (v: number) => void;
  onTilt: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-slate-bark-500">spin</span>
        <input
          type="range"
          className="pf-slider !h-6 !w-24"
          min={-180}
          max={180}
          step={1}
          value={yaw}
          onChange={(e) => onYaw(Number(e.target.value))}
          aria-label="Spin"
        />
      </label>
      <label className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-slate-bark-500">tilt</span>
        <input
          type="range"
          className="pf-slider !h-6 !w-20"
          min={18}
          max={88}
          step={1}
          value={tilt}
          onChange={(e) => onTilt(Number(e.target.value))}
          aria-label="Tilt"
        />
      </label>
      <button
        type="button"
        onClick={onReset}
        title="Reset the view"
        className="flex size-7 items-center justify-center rounded-md border border-slate-bark-700 bg-slate-bark-900 text-slate-bark-400 transition-colors hover:border-canopy-700 hover:text-canopy-200"
      >
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  );
}