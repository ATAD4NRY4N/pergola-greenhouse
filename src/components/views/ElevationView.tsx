import { useMemo } from "react";
import type { Model } from "../../lib/model";
import { DimLine, Leader, polyPoints } from "../../lib/draw";
import { mmNum } from "../../lib/utils";

type Side = "front" | "left";

/**
 * True elevation looking at one of the two glazed runs. The left run shows
 * the roof fall (because it runs along x), the front run is against the
 * constant-height left ring at its end and rises to the right.
 */
export function ElevationView({
  model,
  side,
  width,
  height,
  showSteel,
  pad = 64,
}: {
  model: Model;
  side: Side;
  width: number;
  height: number;
  showSteel: boolean;
  pad?: number;
}) {
  const d = model.design;
  const runLen = side === "front" ? Math.hypot(d.width, d.depthRight - d.depthLeft) : d.depthLeft;
  const maxH = Math.max(d.eaveLeft, d.eaveRight) + 0.55;

  const t = useMemo(() => {
    const scale = Math.min(
      (width - pad * 2) / runLen,
      (height - pad * 2) / maxH,
    );
    const ox = pad;
    const oy = height - pad;
    return {
      scale,
      // u runs along the wall, z is height
      sx: (u: number) => ox + u * scale,
      sy: (z: number) => oy - z * scale,
    };
  }, [width, height, runLen, maxH, pad]);

  const { sx, sy } = t;

  // Along-wall coordinate -> world position on this run.
  const toWorld = (u: number) => {
    if (side === "left") {
      // measured from the front-left corner back towards the back-left corner
      return { x: 0, y: d.depthLeft - u };
    }
    // front: measured from the front-left corner towards the front-right corner
    const len = Math.hypot(d.width, d.depthRight - d.depthLeft);
    const frac = u / len;
    return { x: d.width * frac, y: model.depthAt(d.width * frac) };
  };

  const headOf = (u: number) => {
    const p = toWorld(u);
    return model.eaveAt(p.x) - d.ringDepth / 1000 - 0.25;
  };

  const leaves = model.doors.filter((dl) => dl.side === side);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      role="img"
      aria-label={`${side} elevation`}
    >
      <defs>
        <linearGradient id={`${side}-glaze`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8ad7e3" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#36a56c" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* ground */}
      <line
        x1={pad - 20}
        y1={sy(0)}
        x2={width - pad + 20}
        y2={sy(0)}
        stroke="var(--color-slate-bark-400)"
        strokeWidth={1.5}
      />
      <g stroke="var(--color-slate-bark-600)" strokeWidth={1} opacity={0.55}>
        {Array.from({ length: 40 }).map((_, i) => {
          const x = pad - 20 + i * ((width - 2 * pad + 40) / 39);
          return <line key={i} x1={x} y1={sy(0)} x2={x - 8} y2={sy(0) + 8} />;
        })}
      </g>

      {/* roof line above the wall head */}
      <polyline
        points={`${sx(0)},${sy(model.eaveAt(toWorld(0).x))} ${sx(runLen)},${sy(model.eaveAt(toWorld(runLen).x))}`}
        fill="none"
        stroke="var(--color-canopy-300)"
        strokeOpacity={0.75}
        strokeWidth={2}
        strokeDasharray="10 5"
      />

      {/* glazed bays */}
      {model.wallBays
        .filter((b) => b.side === side)
        .map((b) => {
          const x0 = sx(b.centre - b.width / 2);
          const x1 = sx(b.centre + b.width / 2);
          const top = headOf(b.centre);
          const doorish = leaves.some(
            (dl) => b.centre > dl.runStart - 0.01 && b.centre < dl.runEnd + 0.01,
          );
          if (doorish) return null;
          return (
            <g key={b.id}>
              <rect
                x={x0}
                y={sy(top)}
                width={x1 - x0}
                height={sy(d.sillHeight) - sy(top)}
                fill={b.type === "glazed" ? `url(#${side}-glaze)` : "none"}
                stroke={b.type === "glazed" ? "#8ad7e3" : "var(--color-slate-bark-500)"}
                strokeOpacity={b.type === "glazed" ? 0.5 : 0.35}
                strokeWidth={1}
              />
              {b.type === "glazed" && (
                <text
                  x={(x0 + x1) / 2}
                  y={(sy(top) + sy(d.sillHeight)) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--color-glass-200)"
                  fontSize={8.5}
                  fontFamily="var(--font-mono)"
                  opacity={0.6}
                >
                  {mmNum(b.width)}
                </text>
              )}
            </g>
          );
        })}

      {/* sliding doors on their track */}
      {leaves.map((leaf) => {
        const slide = d.doorOpen * leaf.width;
        const dir = side === "left" ? -1 : 1;
        const u0 = leaf.runStart + slide * dir;
        const u1 = u0 + leaf.width;
        const x0 = sx(u0);
        const x1 = sx(u1);
        const bot = headOf(u0) - leaf.height;
        const top = headOf(u0);
        const clipId = `clip-${side}-${leaf.id}`;
        return (
          <g key={leaf.id}>
            <defs>
              <clipPath id={clipId}>
                <rect x={x0} y={sy(top)} width={x1 - x0} height={sy(bot) - sy(top)} />
              </clipPath>
            </defs>
            <rect
              x={x0}
              y={sy(top)}
              width={x1 - x0}
              height={sy(bot) - sy(top)}
              fill="#e0b05c"
              fillOpacity={0.16}
              stroke="#e0b05c"
              strokeWidth={1.4}
            />
            {/* polycarb ribs */}
            <g clipPath={`url(#${clipId})`} opacity={0.4}>
              {Array.from({ length: 9 }).map((_, i) => (
                <line
                  key={i}
                  x1={x0 + ((x1 - x0) * i) / 8}
                  y1={sy(top)}
                  x2={x0 + ((x1 - x0) * i) / 8}
                  y2={sy(bot)}
                  stroke="#f2d08a"
                  strokeWidth={0.7}
                />
              ))}
            </g>
            <text
              x={(x0 + x1) / 2}
              y={(sy(top) + sy(bot)) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f2d08a"
              fontSize={9}
              fontFamily="var(--font-mono)"
              opacity={0.9}
            >
              {mmNum(leaf.width)}×{mmNum(leaf.height)}
            </text>
            {/* slide direction */}
            <path
              d={`M ${sx(u1) + 5} ${sy(bot) - 10} l 11 0 m -4.5 -4 l 4.5 4 l -4.5 4`}
              fill="none"
              stroke="#f2d08a"
              strokeWidth={1.2}
              opacity={0.8}
            />
          </g>
        );
      })}

      {/* the track itself, drawn once behind the leaves */}
      {leaves.length > 0 && (
        <g>
          <line
            x1={sx(0)}
            y1={sy(headOf(0) + 0.14)}
            x2={sx(runLen)}
            y2={sy(headOf(runLen) + 0.14)}
            stroke="var(--color-brass-400)"
            strokeWidth={3.4}
            opacity={0.95}
          />
          {leaves.map((leaf) => {
            const slide = d.doorOpen * leaf.width;
            const dir = side === "left" ? -1 : 1;
            const u0 = leaf.runStart + slide * dir;
            const top = headOf(u0);
            return [0.25, 0.75].map((f) => (
              <circle
                key={`${leaf.id}-${f}`}
                cx={sx(u0 + leaf.width * f)}
                cy={sy(top + 0.09)}
                r={3.4}
                fill="#f2d08a"
                stroke="var(--color-slate-bark-950)"
                strokeWidth={1}
              />
            ));
          })}
        </g>
      )}

      {/* frame */}
      {showSteel && (
        <>
          {/* head rail */}
          <line
            x1={sx(0)}
            y1={sy(headOf(0) + 0.16)}
            x2={sx(runLen)}
            y2={sy(headOf(runLen) + 0.16)}
            stroke="var(--color-canopy-400)"
            strokeWidth={3}
          />
          {/* sill rail */}
          <line
            x1={sx(0)}
            y1={sy(d.sillHeight)}
            x2={sx(runLen)}
            y2={sy(d.sillHeight)}
            stroke="var(--color-canopy-400)"
            strokeWidth={2.6}
          />
          {/* studs */}
          {model.members
            .filter((m) => m.kind === "stud")
            .map((m) => {
              const u = side === "left" ? d.depthLeft - m.a.y : m.a.x * (runLen / d.width);
              return (
                <line
                  key={m.id}
                  x1={sx(u)}
                  y1={sy(d.sillHeight)}
                  x2={sx(u)}
                  y2={sy(headOf(u))}
                  stroke="var(--color-canopy-300)"
                  strokeOpacity={0.65}
                  strokeWidth={1.6}
                />
              );
            })}
          {/* posts */}
          {model.posts
            .filter((p) =>
              side === "left"
                ? Math.abs(p.at.x) < 1e-6
                : Math.abs(p.at.y - model.depthAt(p.at.x)) < 0.02,
            )
            .map((p) => {
              const u = side === "left" ? d.depthLeft - p.at.y : p.at.x * (runLen / d.width);
              const w = (d.postSize / 1000) * t.scale;
              return (
                <rect
                  key={p.id}
                  x={sx(u) - w / 2}
                  y={sy(model.eaveAt(p.at.x))}
                  width={w}
                  height={sy(0) - sy(model.eaveAt(p.at.x))}
                  fill="#1c2b26"
                  stroke="#cfe3d8"
                  strokeWidth={1.6}
                />
              );
            })}
        </>
      )}

      {/* dimensions */}
      <DimLine
        x1={sx(0)}
        y1={sy(0)}
        x2={sx(runLen)}
        y2={sy(0)}
        label={mmNum(runLen)}
        color="var(--color-canopy-300)"
      />
      <DimLine
        x1={sx(runLen) + 18}
        y1={sy(0)}
        x2={sx(runLen) + 18}
        y2={sy(model.eaveAt(toWorld(runLen).x))}
        label={mmNum(model.eaveAt(toWorld(runLen).x))}
        color="var(--color-canopy-300)"
      />
      {side === "front" && (
        <DimLine
          x1={sx(0) - 18}
          y1={sy(0)}
          x2={sx(0) - 18}
          y2={sy(model.eaveAt(toWorld(0).x))}
          label={mmNum(model.eaveAt(toWorld(0).x))}
          color="var(--color-canopy-300)"
        />
      )}

      {/* leaders */}
      {leaves.length > 0 && (
        <Leader
          x1={sx(leaves[0].runStart + leaves[0].width / 2)}
          y1={sy(headOf(leaves[0].runStart) - leaves[0].height / 2)}
          x2={sx(leaves[0].runStart + leaves[0].width / 2) + 30}
          y2={sy(0) - 46}
          label="polycarb door\nhung on 2 track wheels"
          color="var(--color-brass-300)"
          fontSize={9}
        />
      )}
      <text
        x={pad}
        y={24}
        fill="var(--color-slate-bark-300)"
        fontSize={10}
        letterSpacing="0.18em"
        fontFamily="var(--font-mono)"
      >
        {side === "front" ? "FRONT ELEVATION" : "LEFT ELEVATION"} · looking inside
      </text>
    </svg>
  );
}

/** Long section across the width showing the mono-pitch and the two eaves. */
export function SectionView({
  model,
  width,
  height,
  pad = 64,
}: {
  model: Model;
  width: number;
  height: number;
  pad?: number;
}) {
  const d = model.design;
  const maxH = Math.max(d.eaveLeft, d.eaveRight) + 0.6;
  const scale = Math.min((width - pad * 2) / d.width, (height - pad * 2) / maxH);
  const ox = pad;
  const oy = height - pad;
  const sx = (x: number) => ox + x * scale;
  const sy = (z: number) => oy - z * scale;
  const D = model.depthAt(d.width / 2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      role="img"
      aria-label="Cross section"
    >
      <line x1={pad - 20} y1={sy(0)} x2={width - pad + 20} y2={sy(0)} stroke="var(--color-slate-bark-400)" strokeWidth={1.5} />
      <g stroke="var(--color-slate-bark-600)" strokeWidth={1} opacity={0.55}>
        {Array.from({ length: 40 }).map((_, i) => {
          const x = pad - 20 + i * ((width - 2 * pad + 40) / 39);
          return <line key={i} x1={x} y1={sy(0)} x2={x - 8} y2={sy(0) + 8} />;
        })}
      </g>

      {/* hatched ground */}
      <rect
        x={pad - 24}
        y={sy(0)}
        width={d.width * scale + 48}
        height={16}
        fill="var(--color-slate-bark-900)"
        opacity={0.6}
      />

      {/* posts */}
      {[0, d.width].map((x) => (
        <rect
          key={x}
          x={sx(x) - (d.postSize / 1000) * scale * 0.5}
          y={sy(model.eaveAt(x))}
          width={(d.postSize / 1000) * scale}
          height={sy(0) - sy(model.eaveAt(x))}
          fill="#1c2b26"
          stroke="#cfe3d8"
          strokeWidth={1.6}
        />
      ))}

      {/* roof purlins in section */}
      {model.members
        .filter((m) => m.kind === "purlin")
        .map((m, i) => {
          if (i % 3 !== 0) return null;
          const depth = d.roofPurlinDepth / 1000;
          return (
            <polygon
              key={m.id}
              points={polyPoints([
                { x: sx(m.a.x), y: sy(m.a.z) },
                { x: sx(m.b.x), y: sy(m.b.z) },
                { x: sx(m.b.x), y: sy(m.b.z - depth) },
                { x: sx(m.a.x), y: sy(m.a.z - depth) },
              ])}
              fill="var(--color-canopy-800)"
              stroke="var(--color-canopy-300)"
              strokeOpacity={0.75}
              strokeWidth={1.2}
            />
          );
        })}

      {/* roof plane */}
      <polygon
        points={polyPoints([
          { x: sx(-d.roofOverhang), y: sy(model.eaveAt(0)) },
          { x: sx(d.width + d.roofOverhang), y: sy(model.eaveAt(d.width)) },
          { x: sx(d.width + d.roofOverhang), y: sy(model.eaveAt(d.width) - 0.04) },
          { x: sx(-d.roofOverhang), y: sy(model.eaveAt(0) - 0.04) },
        ])}
        fill="#8ad7e3"
        fillOpacity={0.2}
        stroke="#8ad7e3"
        strokeWidth={1.4}
      />

      {/* fall indicator */}
      <line
        x1={sx(0)}
        y1={sy(d.eaveRight + 0.45)}
        x2={sx(d.width)}
        y2={sy(d.eaveRight + 0.45)}
        stroke="var(--color-glass-300)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.6}
      />
      <text
        x={sx(d.width / 2)}
        y={sy(d.eaveRight + 0.45) - 7}
        textAnchor="middle"
        fill="var(--color-glass-300)"
        fontSize={10}
        fontFamily="var(--font-mono)"
        className="tnum"
      >
        {Math.abs(model.roofPitchDeg).toFixed(1)}° fall to the left
      </text>

      <DimLine
        x1={sx(0)}
        y1={sy(0)}
        x2={sx(d.width)}
        y2={sy(0)}
        label={mmNum(d.width)}
        color="var(--color-canopy-300)"
      />
      <DimLine
        x1={sx(d.width) + 20}
        y1={sy(0)}
        x2={sx(d.width) + 20}
        y2={sy(model.eaveAt(d.width))}
        label={mmNum(model.eaveAt(d.width))}
        color="var(--color-canopy-300)"
      />
      <DimLine
        x1={sx(0) - 20}
        y1={sy(0)}
        x2={sx(0) - 20}
        y2={sy(model.eaveAt(0))}
        label={mmNum(model.eaveAt(0))}
        color="var(--color-canopy-300)"
      />
      <text
        x={sx(d.width / 2)}
        y={sy(0) - 30}
        textAnchor="middle"
        fill="var(--color-slate-bark-400)"
        fontSize={9}
        fontFamily="var(--font-mono)"
      >
        ridge-to-eave section · depth at centre {mmNum(D)}
      </text>
    </svg>
  );
}
