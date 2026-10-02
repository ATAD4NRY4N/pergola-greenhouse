import type { ReactNode } from "react";
import type { Vec2, Vec3 } from "./model";

/* ------------------------------------------------------------------ */
/* Axonometric projection                                              */
/* ------------------------------------------------------------------ */

export interface Projector {
  (p: Vec3): { u: number; v: number };
}

export function makeProjector(yawDeg: number, tiltDeg: number): Projector {
  const yaw = (yawDeg * Math.PI) / 180;
  const tilt = (tiltDeg * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  return (p: Vec3) => ({
    u: p.x * cy - p.y * sy,
    v: (p.x * sy + p.y * cy) * st - p.z * ct,
  });
}

export interface Fit {
  project: (p: Vec3) => { x: number; y: number };
  scale: number;
}

export function fitPoints(
  points: Vec3[],
  yawDeg: number,
  tiltDeg: number,
  width: number,
  height: number,
  pad = 56,
): Fit {
  const raw = makeProjector(yawDeg, tiltDeg);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of points) {
    const q = raw(p);
    if (q.u < minU) minU = q.u;
    if (q.u > maxU) maxU = q.u;
    if (q.v < minV) minV = q.v;
    if (q.v > maxV) maxV = q.v;
  }
  const spanU = Math.max(maxU - minU, 0.001);
  const spanV = Math.max(maxV - minV, 0.001);
  const scale = Math.min((width - pad * 2) / spanU, (height - pad * 2) / spanV);
  const offU = (width - spanU * scale) / 2;
  const offV = (height - spanV * scale) / 2;
  return {
    scale,
    project: (p: Vec3) => {
      const q = raw(p);
      return { x: offU + (q.u - minU) * scale, y: offV + (q.v - minV) * scale };
    },
  };
}

/** Fit inside a camera-independent bound so orbiting never changes model scale. */
export function fitPointsStable(
  points: Vec3[],
  yawDeg: number,
  tiltDeg: number,
  width: number,
  height: number,
  pad = 56,
): Fit {
  const pts = points.length > 0 ? points : [{ x: 0, y: 0, z: 0 }];
  const minX = Math.min(...pts.map((point) => point.x));
  const maxX = Math.max(...pts.map((point) => point.x));
  const minY = Math.min(...pts.map((point) => point.y));
  const maxY = Math.max(...pts.map((point) => point.y));
  const minZ = Math.min(...pts.map((point) => point.z));
  const maxZ = Math.max(...pts.map((point) => point.z));
  const centre = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };
  const radius = Math.max(
    0.001,
    Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2,
  );
  const scale =
    Math.min(Math.max(1, width - pad * 2), Math.max(1, height - pad * 2)) /
    (radius * 2);
  const raw = makeProjector(yawDeg, tiltDeg);
  const projectedCentre = raw(centre);
  return {
    scale,
    project: (point: Vec3) => {
      const projected = raw(point);
      return {
        x: width / 2 + (projected.u - projectedCentre.u) * scale,
        y: height / 2 + (projected.v - projectedCentre.v) * scale,
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/* SVG helpers                                                         */
/* ------------------------------------------------------------------ */

export function polyPoints(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function centroid3(poly: Vec3[]): Vec3 {
  const n = poly.length || 1;
  return poly.reduce<Vec3>(
    (acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n, z: acc.z + p.z / n }),
    { x: 0, y: 0, z: 0 },
  );
}

/** Interpolate between two same-length vertex lists, e.g. a door on its track. */
export function lerpPoly(a: Vec3[], b: Vec3[], t: number): Vec3[] {
  const k = Math.min(1, Math.max(0, t));
  return a.map((p, i) => {
    const q = b[i] ?? p;
    return {
      x: p.x + (q.x - p.x) * k,
      y: p.y + (q.y - p.y) * k,
      z: p.z + (q.z - p.z) * k,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Dimension line component                                            */
/* ------------------------------------------------------------------ */

export interface DimLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  /** Extra label shown under the main one. */
  sub?: string;
  color?: string;
  flip?: boolean;
  fontSize?: number;
}

/** Engineering-style dimension line with arrow ticks at both ends. */
export function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  sub,
  color = "var(--color-canopy-300)",
  flip = false,
  fontSize = 12,
}: DimLineProps) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const tx = 4.5;
  const dy = flip ? -1 : 1;
  return (
    <g pointerEvents="none">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="6 3"
        opacity={0.85}
      />
      {/* 45-degree tick marks, architectural convention */}
      <line
        x1={x1 - tx * dy}
        y1={y1 - tx * dy}
        x2={x1 + tx * dy}
        y2={y1 + tx * dy}
        stroke={color}
        strokeWidth={1.4}
        opacity={0.95}
      />
      <line
        x1={x2 - tx * dy}
        y1={y2 - tx * dy}
        x2={x2 + tx * dy}
        y2={y2 + tx * dy}
        stroke={color}
        strokeWidth={1.4}
        opacity={0.95}
      />
      <text
        x={midX}
        y={midY + (flip ? -7 : 16)}
        textAnchor="middle"
        fill={color}
        fontSize={fontSize}
        fontFamily="var(--font-mono)"
        className="tnum"
        style={{ paintOrder: "stroke" }}
        stroke="var(--color-slate-bark-950)"
        strokeWidth={4}
        strokeLinejoin="round"
      >
        {label}
      </text>
      {sub && (
        <text
          x={midX}
          y={midY + (flip ? -20 : 29)}
          textAnchor="middle"
          fill={color}
          opacity={0.65}
          fontSize={fontSize - 2}
          fontFamily="var(--font-mono)"
          className="tnum"
          style={{ paintOrder: "stroke" }}
          stroke="var(--color-slate-bark-950)"
          strokeWidth={4}
          strokeLinejoin="round"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

/** Leader line with a label at the end. */
export function Leader({
  x1,
  y1,
  x2,
  y2,
  label,
  color = "var(--color-slate-bark-300)",
  anchor = "start",
  fontSize = 10,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  color?: string;
  anchor?: "start" | "end" | "middle";
  fontSize?: number;
}) {
  return (
    <g pointerEvents="none">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1}
        opacity={0.7}
      />
      <circle cx={x1} cy={y1} r={2} fill={color} />
      <text
        x={x2}
        y={y2}
        textAnchor={anchor}
        dominantBaseline="middle"
        fill={color}
        fontSize={fontSize}
        fontFamily="var(--font-mono)"
        style={{ paintOrder: "stroke" }}
        stroke="var(--color-slate-bark-950)"
        strokeWidth={4}
        strokeLinejoin="round"
      >
        {label}
      </text>
    </g>
  );
}

export function Tag({
  children,
  color = "var(--color-slate-bark-300)",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <g>
      <text
        x={0}
        y={0}
        fill={color}
        fontSize={9}
        fontFamily="var(--font-mono)"
        letterSpacing="0.08em"
        style={{ paintOrder: "stroke" }}
        stroke="var(--color-slate-bark-950)"
        strokeWidth={4}
        strokeLinejoin="round"
      >
        {children}
      </text>
    </g>
  );
}

/** Orthonormal basis for a wall run, used to place offsets along a run. */
export function wallBasis(a: Vec2, b: Vec2) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    len,
    ux: dx / len,
    uy: dy / len,
    nx: -dy / len,
    ny: dx / len,
  };
}
