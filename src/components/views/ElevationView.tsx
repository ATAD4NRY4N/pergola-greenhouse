import { useMemo } from "react";
import type { Model } from "../../lib/model";
import {
  LEAF_GAP,
  TRACK_WIDTH,
} from "../../lib/model";
import { DimLine, Leader, polyPoints } from "../../lib/draw";
import { mmNum } from "../../lib/utils";

type Side = "front" | "right";

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
  const runLen = side === "front" ? d.width : d.depthRight;
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
    if (side === "right") {
      // measured from the front-right corner back towards the back-right corner
      return { x: d.width, y: model.plan.fr.y - u };
    }
    // front: measured from the front-left corner towards the front-right corner
    return { x: u, y: model.plan.fl.y };
  };

  const headOf = (u: number) => {
    const p = toWorld(u);
    return model.eaveAt(p.x) - d.ringDepth / 1000;
  };

  /* Doors hang directly from the level perimeter C-purlin, not the roof ring. */
  const trackD = Math.max(0.05, d.ringDepth / 1000);
  const supportRail = model.members.find(
    (member) => member.kind === "level-ring" && member.label?.endsWith(side),
  );
  const trackTop = supportRail ? supportRail.a.z + trackD / 2 : 0;
  const trackBottom = trackTop - trackD;
  const railElevation = supportRail?.a.z ?? 0;
  const trackTopOf = (_u: number) => trackTop;
  const trackBottomOf = (_u: number) => trackBottom;
  const leafTop = trackBottom - LEAF_GAP;
  const leafTopOf = (_u: number) => leafTop;

  const leaves = model.doors.filter((dl) => dl.side === side);

  /* Map a point on this run to its along-wall coordinate, 0 at the front-left
     corner running away from it. */
  const runOf = (p: { x: number; y: number }) =>
    side === "right" ? model.plan.fr.y - p.y : p.x;

  // Door running length follows the full front/right segment of the perimeter rail.
  const trackFrom = 0;
  const trackTo = runLen;

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
          const top = leafTopOf(b.centre);
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
        const slide = d.doorOpen * leaf.travel;
        const u0 = leaf.runStart + slide * leaf.slideDir;
        const u1 = u0 + leaf.width;
        const x0 = sx(u0);
        const x1 = sx(u1);
        const bot = leafTopOf(u0) - leaf.height;
        const top = leafTopOf(u0);
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
      {supportRail && (
        <g>
          {/* Open-bottom C profile, with inward lips capturing the trolley wheels. */}
          {(() => {
            const x0 = sx(trackFrom);
            const x1 = sx(trackTo);
            const top0 = sy(trackTopOf(trackFrom));
            const top1 = sy(trackTopOf(trackTo));
            const bottom0 = sy(trackBottomOf(trackFrom));
            const bottom1 = sy(trackBottomOf(trackTo));
            const lipPx = Math.max(2, TRACK_WIDTH * t.scale * 0.2);
            return (
              <g fill="none" stroke="var(--color-brass-300)" strokeWidth={2.4} strokeLinejoin="round">
                <line x1={x0} y1={top0} x2={x1} y2={top1} />
                <line x1={x0} y1={top0} x2={x0} y2={bottom0} />
                <line x1={x1} y1={top1} x2={x1} y2={bottom1} />
                <line x1={x0} y1={bottom0} x2={x0 + lipPx} y2={bottom0} />
                <line x1={x1} y1={bottom1} x2={x1 - lipPx} y2={bottom1} />
              </g>
            );
          })()}
          <text
            x={sx((trackFrom + trackTo) / 2)}
            y={sy(trackTopOf((trackFrom + trackTo) / 2)) - 5}
            textAnchor="middle"
            fill="var(--color-brass-300)"
            fontSize={8.5}
            fontFamily="var(--font-mono)"
            opacity={0.85}
          >
            level perimeter C-purlin · door rail
          </text>
          <line
            x1={sx(trackFrom)}
            y1={sy(railElevation)}
            x2={sx(trackTo)}
            y2={sy(railElevation)}
            stroke="var(--color-canopy-400)"
            strokeWidth={Math.max(2, (d.ringDepth / 1000) * t.scale)}
            opacity={0.9}
          />
          {leaves.map((leaf) =>
            leaf.trolleys.map((trolley) => {
              const mix = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => ({
                x: a.x + (b.x - a.x) * d.doorOpen,
                y: a.y + (b.y - a.y) * d.doorOpen,
                z: a.z + (b.z - a.z) * d.doorOpen,
              });
              const wheels = trolley.wheelCentres.map((wheel, index) => {
                const point = mix(wheel, trolley.parkedWheelCentres[index]);
                return { u: runOf(point), z: point.z };
              });
              const hanger = mix(trolley.hanger.a, trolley.parkedHanger.a);
              const hangerEnd = mix(trolley.hanger.b, trolley.parkedHanger.b);
              const axlePairs = [[wheels[0], wheels[1]], [wheels[2], wheels[3]]];
              return (
                <g key={trolley.id}>
                  {axlePairs.map((pair, index) => pair[0] && pair[1] ? (
                    <line key={`${trolley.id}-axle-${index}`} x1={sx(pair[0].u)} y1={sy(pair[0].z)} x2={sx(pair[1].u)} y2={sy(pair[1].z)} stroke="#d69e49" strokeWidth={2.6} />
                  ) : null)}
                  <line
                    x1={sx(runOf(hanger))}
                    y1={sy(hanger.z)}
                    x2={sx(runOf(hangerEnd))}
                    y2={sy(hangerEnd.z)}
                    stroke="var(--color-brass-300)"
                    strokeWidth={1.5}
                  />
                  {wheels.map((wheel, index) => (
                    <circle
                      key={`${trolley.id}-wheel-${index}`}
                      cx={sx(wheel.u)}
                      cy={sy(wheel.z)}
                      r={3.2}
                      fill="#f2d08a"
                      stroke="var(--color-slate-bark-950)"
                      strokeWidth={1}
                    />
                  ))}
                </g>
              );
            }),
          )}
        </g>
      )}

      {/* frame */}
      {showSteel && (
        <>
          {/* head rail */}
          <line
            x1={sx(0)}
            y1={sy(headOf(0) + d.ringDepth / 2000)}
            x2={sx(runLen)}
            y2={sy(headOf(runLen) + d.ringDepth / 2000)}
            stroke="var(--color-canopy-400)"
            strokeWidth={Math.max(2, (d.ringDepth / 1000) * t.scale)}
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
              const u = side === "right" ? model.plan.fr.y - m.a.y : m.a.x;
              return (
                <line
                  key={m.id}
                  x1={sx(u)}
                  y1={sy(d.sillHeight)}
                  x2={sx(u)}
                  y2={sy(leafTopOf(u))}
                  stroke="var(--color-canopy-300)"
                  strokeOpacity={0.65}
                  strokeWidth={1.6}
                />
              );
            })}
          {/* posts */}
          {model.posts
            .filter((p) =>
              side === "right"
                ? Math.abs(p.at.x - d.width) < 1e-6
                : Math.abs(p.at.y - model.plan.fl.y) < 0.02,
            )
            .map((p) => {
              const u = side === "right" ? model.plan.fr.y - p.at.y : p.at.x;
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
          label="polycarb door\nhung on 2 × 4-wheel channel trolleys"
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
        {side === "front" ? "FRONT ELEVATION" : "RIGHT ELEVATION"} · looking inside
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
