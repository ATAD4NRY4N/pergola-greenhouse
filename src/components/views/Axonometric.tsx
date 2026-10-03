import { useMemo, useRef, useState } from "react";
import { TRACK_LIP, TRACK_WIDTH } from "../../lib/model";
import type { Model, Vec3 } from "../../lib/model";
import { centroid3, fitPointsStable, polyPoints } from "../../lib/draw";

const KIND_STYLE: Record<
  string,
  { stroke: string; width: number; opacity: number; dash?: string }
> = {
  post: { stroke: "#cfe3d8", width: 5, opacity: 0.98 },
  "ring-heavy": { stroke: "#8fd9ab", width: 4, opacity: 0.95 },
  ring: { stroke: "#8fd9ab", width: 3, opacity: 0.9 },
  "level-ring": { stroke: "#e0b05c", width: 3.4, opacity: 0.95 },
  stud: { stroke: "#6fbf95", width: 2, opacity: 0.85 },
  sill: { stroke: "#6fbf95", width: 2.5, opacity: 0.85 },
  girder: { stroke: "#7ecfb0", width: 3.4, opacity: 0.92 },
  purlin: { stroke: "#5da989", width: 1.9, opacity: 0.8 },
  track: { stroke: "#e0b05c", width: 3.2, opacity: 0.95 },
  doorframe: { stroke: "#f2d08a", width: 2.6, opacity: 0.98 },
  brace: { stroke: "#6fbf95", width: 1.8, opacity: 0.6 },
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
  onTilt,
  pan,
  onPan,
}: {
  model: Model;
  showSheets: boolean;
  showSteel: boolean;
  width: number;
  height: number;
  yaw: number;
  tilt: number;
  onYaw?: (y: number) => void;
  onTilt?: (t: number) => void;
  /** World-space offset in metres, so the model can be moved in X, Y and Z. */
  pan?: Vec3;
  onPan?: (p: Vec3) => void;
}) {
  type Drag =
    | { mode: "orbit"; x: number; y: number; yaw: number; tilt: number }
    | { mode: "pan"; x: number; y: number; pan: Vec3 }
    | null;
  const drag = useRef<Drag>(null);
  const [localYaw, setLocalYaw] = useState(yaw);
  const [localTilt, setLocalTilt] = useState(tilt);
  const [localPan, setLocalPan] = useState<Vec3>({ x: 0, y: 0, z: 0 });

  const yawValue = onYaw ? yaw : localYaw;
  const tiltValue = onTilt ? tilt : localTilt;
  const panValue = pan ?? localPan;

  const setYawValue = (v: number) => {
    if (onYaw) onYaw(v);
    else setLocalYaw(v);
  };
  const setTiltValue = (v: number) => {
    if (onTilt) onTilt(v);
    else setLocalTilt(v);
  };
  const setPanValue = (v: Vec3) => {
    if (onPan) onPan(v);
    else setLocalPan(v);
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
    return fitPointsStable(pts, yawValue, tiltValue, width, height, 64);
  }, [model, yawValue, tiltValue, width, height]);

  /* Pan is applied after the fit, so moving the model never rescales it. */
  const baseProject = fit.project;
  const project = useMemo(() => {
    const { x: dx, y: dy, z: dz } = panValue;
    if (dx === 0 && dy === 0 && dz === 0) return baseProject;
    return (p: Vec3) => baseProject({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
  }, [baseProject, panValue]);

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

  /* How many metres of world travel one pixel of drag is worth. */
  const panScale = 0.012;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block select-none"
      style={{
        touchAction: "none",
        cursor: drag.current
          ? "grabbing"
          : panValue.x || panValue.y || panValue.z
            ? "move"
            : "grab",
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        // Right button, middle button or Shift = pan in the view plane.
        const panning = e.button === 2 || e.button === 1 || e.shiftKey;
        drag.current = panning
          ? { mode: "pan", x: e.clientX, y: e.clientY, pan: panValue }
          : { mode: "orbit", x: e.clientX, y: e.clientY, yaw: yawValue, tilt: tiltValue };
      }}
      onPointerMove={(e) => {
        const g = drag.current;
        if (!g) return;
        const dx = e.clientX - g.x;
        const dy = e.clientY - g.y;
        if (g.mode === "orbit") {
          setYawValue((g.yaw + dx * 0.45) % 360);
          setTiltValue(Math.min(88, Math.max(18, g.tilt - dy * 0.35)));
        } else {
          // Horizontal drag slides along the model's X/Y, vertical along Z.
          setPanValue({
            x: g.pan.x + dx * panScale,
            y: g.pan.y - dx * panScale * 0.5,
            z: g.pan.z + dy * panScale,
          });
        }
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onPointerLeave={() => {
        drag.current = null;
      }}
      onDoubleClick={() => setPanValue({ x: 0, y: 0, z: 0 })}
      role="img"
      aria-label="Axonometric view of the pergola greenhouse structure. Drag to orbit, shift-drag or right-drag to move in X, Y and Z."
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

      {/* context: wall/fence (back) and log cabin (left) */}
      <ContextWall
        a={{ x: P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).x, y: P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).y }}
        b={{ x: P({ x: model.plan.br.x, y: model.plan.br.y, z: 0 }).x, y: P({ x: model.plan.br.x, y: model.plan.br.y, z: 0 }).y }}
        heightPx={(z: number) => P({ x: model.plan.bl.x, y: model.plan.bl.y, z }).y - P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).y}
        label="WALL / FENCE"
        color="#b0bab5"
      />
      <ContextWall
        a={{ x: P({ x: model.plan.fl.x, y: model.plan.fl.y, z: 0 }).x, y: P({ x: model.plan.fl.x, y: model.plan.fl.y, z: 0 }).y }}
        b={{ x: P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).x, y: P({ x: model.plan.bl.x, y: model.plan.bl.y, z: 0 }).y }}
        heightPx={(z: number) => P({ x: model.plan.fl.x, y: model.plan.fl.y, z }).y - P({ x: model.plan.fl.x, y: model.plan.fl.y, z: 0 }).y}
        label="LOG CABIN"
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

      {/* Open-bottom C-channel profiles on the four level perimeter runs. */}
      {model.members
        .filter((member) => showSteel && member.kind === "level-ring")
        .map((member) => {
          const halfDepth = Math.max(0.05, model.design.ringDepth / 1000) / 2;
          const halfWidth = TRACK_WIDTH / 2;
          const dx = member.b.x - member.a.x;
          const dy = member.b.y - member.a.y;
          const length = Math.hypot(dx, dy) || 1;
          const nx = dy / length;
          const ny = -dx / length;
          const section = [
            [[-halfWidth, halfDepth], [halfWidth, halfDepth]],
            [[-halfWidth, halfDepth], [-halfWidth, -halfDepth]],
            [[halfWidth, halfDepth], [halfWidth, -halfDepth]],
            [[-halfWidth, -halfDepth], [-halfWidth + TRACK_LIP, -halfDepth]],
            [[halfWidth, -halfDepth], [halfWidth - TRACK_LIP, -halfDepth]],
          ] as const;
          const at = (base: Vec3, lateral: number, vertical: number) =>
            P({
              x: base.x + nx * lateral,
              y: base.y + ny * lateral,
              z: base.z + vertical,
            });
          const lines = [
            ...section.flatMap(([start, end]) => [
              [at(member.a, start[0], start[1]), at(member.a, end[0], end[1])],
              [at(member.b, start[0], start[1]), at(member.b, end[0], end[1])],
            ]),
            ...section.flatMap(([start]) => [
              [at(member.a, start[0], start[1]), at(member.b, start[0], start[1])],
            ]),
          ];
          return (
            <g key={`channel-${member.id}`} fill="none" stroke="#f2d08a" strokeWidth={1.8} strokeLinejoin="round">
              {lines.map(([a, b], index) => <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
            </g>
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

      {/* Two four-wheel trolley carriages support each leaf inside its channel. */}
      {model.doors.flatMap((leaf) =>
        leaf.trolleys.map((trolley) => {
          const mix = (a: Vec3, b: Vec3): Vec3 => ({
            x: a.x + (b.x - a.x) * model.design.doorOpen,
            y: a.y + (b.y - a.y) * model.design.doorOpen,
            z: a.z + (b.z - a.z) * model.design.doorOpen,
          });
          const wheels = trolley.wheelCentres.map((p, i) => P(mix(p, trolley.parkedWheelCentres[i])));
          const hanger = {
            a: P(mix(trolley.hanger.a, trolley.parkedHanger.a)),
            b: P(mix(trolley.hanger.b, trolley.parkedHanger.b)),
          };
          return (
            <g key={trolley.id}>
              <line x1={hanger.a.x} y1={hanger.a.y} x2={hanger.b.x} y2={hanger.b.y} stroke="#f2d08a" strokeWidth={2.2} />
              {wheels.map((wheel, i) => (
                <circle key={`${trolley.id}-wheel-${i}`} cx={wheel.x} cy={wheel.y} r={3.2} fill="#f2d08a" stroke="#513d20" strokeWidth={1} />
              ))}
            </g>
          );
        }),
      )}

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
