import { useMemo, useRef, useState } from "react";
import type { Model, Vec3 } from "../../lib/model";
import { centroid3, fitPoints, polyPoints } from "../../lib/draw";

const KIND_STYLE: Record<
  string,
  { stroke: string; width: number; opacity: number; dash?: string }
> = {
  post: { stroke: "#cfe3d8", width: 5, opacity: 0.98 },
  "ring-heavy": { stroke: "#8fd9ab", width: 4, opacity: 0.95 },
  ring: { stroke: "#8fd9ab", width: 3, opacity: 0.9 },
  stud: { stroke: "#6fbf95", width: 2, opacity: 0.85 },
  sill: { stroke: "#6fbf95", width: 2.5, opacity: 0.85 },
  girder: { stroke: "#7ecfb0", width: 3.4, opacity: 0.92 },
  purlin: { stroke: "#5da989", width: 1.9, opacity: 0.8 },
  track: { stroke: "#e0b05c", width: 2.4, opacity: 0.95 },
  doorframe: { stroke: "#f2d08a", width: 2.6, opacity: 0.98 },
  brace: { stroke: "#8fd9ab", width: 2, opacity: 0.7, dash: "6 4" },
};

export function Axonometric({
  model,
  showSheets,
  showSteel,
  width,
  height,
  yaw,
  tilt,
  onYaw,
}: {
  model: Model;
  showSheets: boolean;
  showSteel: boolean;
  width: number;
  height: number;
  yaw: number;
  tilt: number;
  onYaw?: (y: number) => void;
}) {
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const [localYaw, setLocalYaw] = useState(yaw);

  const yawValue = onYaw ? yaw : localYaw;
  const setYawValue = (v: number) => {
    if (onYaw) onYaw(v);
    else setLocalYaw(v);
  };

  const fit = useMemo(() => {
    const pts: Vec3[] = [];
    for (const m of model.members) {
      pts.push(m.a, m.b);
    }
    for (const p of model.panels) {
      pts.push(...p.poly);
    }
    for (const c of model.corners) pts.push({ x: c.at.x, y: c.at.y, z: 0 });
    if (pts.length === 0) pts.push({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    return fitPoints(pts, yawValue, tilt, width, height, 64);
  }, [model, yawValue, tilt, width, height]);

  const project = fit.project;
  const P = (p: Vec3) => project(p);

  const sortedPanels = useMemo(() => {
    const list = showSheets ? model.panels : model.panels.filter((p) => p.kind !== "wall");
    return [...list].sort(
      (a, b) => centroid3(a.poly).y * 0.2 + centroid3(a.poly).x - (centroid3(b.poly).y * 0.2 + centroid3(b.poly).x),
    );
  }, [model.panels, showSheets]);

  const sortedMembers = useMemo(() => {
    const m = showSteel
      ? model.members
      : model.members.filter((x) => x.kind === "post");
    return [...m].sort(
      (a, b) =>
        (a.a.y + a.a.x + a.b.y + a.b.x) - (b.a.y + b.a.x + b.b.y + b.b.x),
    );
  }, [model.members, showSteel]);

  const planPts = (["bl", "br", "fr", "fl"] as const).map(
    (c) => P({ x: model.plan[c].x, y: model.plan[c].y, z: 0 }),
  );

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block select-none"
      style={{ touchAction: "none", cursor: drag.current ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, yaw: yawValue };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        setYawValue((drag.current.yaw + dx * 0.45) % 360);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerLeave={() => {
        drag.current = null;
      }}
      role="img"
      aria-label="Axonometric view of the pergola greenhouse structure"
    >
      <defs>
        <linearGradient id="roofSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bde9ef" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#8ad7e3" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#36a56c" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id="wallSheen" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8ad7e3" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#36a56c" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id="doorSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2d08a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c8903a" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* ground plane */}
      <polygon
        points={polyPoints(planPts)}
        fill="#0a1210"
        opacity={0.85}
        stroke="var(--color-canopy-400)"
        strokeOpacity={0.25}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* context: log cabin (back) and brick wall (right) */}
      <ContextWall
        a={{ x: P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).x, y: P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).y }}
        b={{ x: P({ x: model.plan.br.x, y: model.plan.br.y, z: 0 }).x, y: P({ x: model.plan.br.x, y: model.plan.br.y, z: 0 }).y }}
        heightPx={(z: number) => P({ x: model.plan.bl.x, y: model.plan.bl.y, z }).y - P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).y}
        label="LOG CABIN"
        color="#b0bab5"
      />
      <ContextWall
        a={{ x: P({ x: model.plan.br.x, y: model.plan.br.y, z: 0 }).x, y: P({ x: model.plan.br.x, y: model.plan.br.y, z: 0 }).y }}
        b={{ x: P({ x: model.plan.fr.x, y: model.plan.fr.y, z: 0 }).x, y: P({ x: model.plan.fr.x, y: model.plan.fr.y, z: 0 }).y }}
        heightPx={(z: number) => P({ x: model.plan.br.x, y: model.plan.br.y, z }).y - P({ x: model.plan.br.x, y: model.plan.br.y, z: 0 }).y}
        label="BRICK WALL"
        color="#e0b05c"
      />

      {/* translucent surfaces, far to near */}
      {sortedPanels.map((p) => {
        const pts = p.poly.map(P);
        const fill =
          p.kind === "roof"
            ? "url(#roofSheen)"
            : p.kind === "door"
              ? "url(#doorSheen)"
              : "url(#wallSheen)";
        const stroke =
          p.kind === "roof" ? "#bde9ef" : p.kind === "door" ? "#e0b05c" : "#8ad7e3";
        return (
          <polygon
            key={p.id}
            points={polyPoints(pts)}
            fill={fill}
            stroke={stroke}
            strokeOpacity={p.kind === "door" ? 0.65 : 0.3}
            strokeWidth={p.kind === "door" ? 1.2 : 0.8}
          />
        );
      })}

      {/* steel */}
      {sortedMembers.map((m) => {
        const s = KIND_STYLE[m.kind] ?? KIND_STYLE.ring;
        const a = P(m.a);
        const b = P(m.b);
        return (
          <line
            key={m.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={s.stroke}
            strokeWidth={s.width}
            strokeOpacity={s.opacity}
            strokeDasharray={s.dash}
            strokeLinecap="round"
          />
        );
      })}

      {/* door track wheels highlighted at the head of each leaf */}
      {model.doors.map((leaf) => {
        const poly = (model.design.doorOpen > 0.5 ? leaf.parkedPoly : leaf.poly).map(P);
        const xs = poly.map((p) => p.x);
        const ys = poly.map((p) => p.y);
        return (
          <rect
            key={`w-${leaf.id}`}
            x={Math.min(...xs) - 2}
            y={Math.min(...ys) - 2}
            width={Math.max(...xs) - Math.min(...xs) + 4}
            height={3}
            fill="#f2d08a"
            opacity={0.9}
          />
        );
      })}

      {/* corner fixing markers */}
      {model.corners.map((c) => {
        const p = P({ x: c.at.x, y: c.at.y, z: 0 });
        const col = c.ok ? (c.fix === "rigid90" ? "#8fd9ab" : "#e0b05c") : "#f87171";
        return (
          <g key={c.id}>
            <circle cx={p.x} cy={p.y} r={5.5} fill="none" stroke={col} strokeWidth={1.6} />
            {c.fix === "rigid90" ? (
              <path
                d={`M ${p.x - 2.6} ${p.y - 2.6} L ${p.x + 2.6} ${p.y + 2.6} M ${p.x + 2.6} ${p.y - 2.6} L ${p.x - 2.6} ${p.y + 2.6}`}
                stroke={col}
                strokeWidth={1.4}
              />
            ) : (
              <path
                d={`M ${p.x - 3} ${p.y + 2} A 4 4 0 0 1 ${p.x + 3} ${p.y + 2}`}
                fill="none"
                stroke={col}
                strokeWidth={1.4}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ContextWall({
  a,
  b,
  heightPx,
  label,
  color,
}: {
  a: { x: number; y: number };
  b: { x: number; y: number };
  heightPx: (z: number) => number;
  label: string;
  color: string;
}) {
  const h = Math.min(heightPx(3.6), 260);
  const ang = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
  return (
    <g opacity={0.32} pointerEvents="none">
      <polygon
        points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y - h} ${a.x},${a.y - h}`}
        fill={color}
        opacity={0.16}
        stroke={color}
        strokeWidth={1.2}
        strokeDasharray="5 4"
      />
      <text
        x={(a.x + b.x) / 2}
        y={(a.y + b.y) / 2 - h - 8}
        textAnchor="middle"
        fill={color}
        fontSize={9}
        letterSpacing="0.16em"
        fontFamily="var(--font-mono)"
        transform={`rotate(${ang} ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - h - 8})`}
      >
        {label}
      </text>
    </g>
  );
}
