import { useMemo } from "react";
import { componentVisible } from "../../lib/model";
import type { ComponentVisibility, Model } from "../../lib/model";
import { LEAF_GAP } from "../../lib/model";
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
  visibility,
  pad = 64,
}: {
  model: Model;
  side: Side;
  width: number;
  height: number;
  showSteel: boolean;
  visibility?: Partial<ComponentVisibility>;
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

  /* Door leaves hang from the level perimeter C-purlin, not the roof ring. */
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

  // Draw the front/right section of the full level perimeter member.
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
      {componentVisible(visibility, "sheets") && model.wallBays
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
                stroke={b.type === "glazed" ? "#67cbe3" : "var(--color-slate-bark-500)"}
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
      {componentVisible(visibility, "sheets") && leaves.map((leaf) => {
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
              fill="#67cbe3"
              fillOpacity={0.2}
              stroke="#67cbe3"
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
                  stroke="#d9f5fb"
                  strokeWidth={0.7}
                />
              ))}
            </g>
            <text
              x={(x0 + x1) / 2}
              y={(sy(top) + sy(bot)) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#d9f5fb"
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
              stroke="#f1c877"
              strokeWidth={1.2}
              opacity={0.8}
            />
          </g>
        );
      })}

      {/* the track itself, drawn once behind the leaves */}
      {showSteel && supportRail && componentVisible(visibility, "c-purlins") && (
        <g>
          {/* Simplified open-bottom C-channel section: back web, two legs and
              inward lower lips. Exact dimensions depend on the selected track. */}
          {(() => {
            const x0 = sx(trackFrom);
            const x1 = sx(trackTo);
            const top0 = sy(trackTopOf(trackFrom));
            const top1 = sy(trackTopOf(trackTo));
            const bottom0 = sy(trackBottomOf(trackFrom));
            const bottom1 = sy(trackBottomOf(trackTo));
            const lip = Math.max(3, Math.min(7, (x1 - x0) * 0.004));
            return (
              <g fill="none" stroke="#49c2a7" strokeWidth={2.8} strokeLinejoin="round">
                <line x1={x0} y1={top0} x2={x1} y2={top1} />
                <line x1={x0} y1={top0} x2={x0} y2={bottom0} />
                <line x1={x1} y1={top1} x2={x1} y2={bottom1} />
                <line x1={x0} y1={bottom0} x2={x0 + lip} y2={bottom0} />
                <line x1={x1} y1={bottom1} x2={x1 - lip} y2={bottom1} />
              </g>
            );
          })()}
          <text
            x={sx((trackFrom + trackTo) / 2)}
            y={sy(trackTopOf((trackFrom + trackTo) / 2)) - 5}
            textAnchor="middle"
            fill="#49c2a7"
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
          {componentVisible(visibility, "fixings") && componentVisible(visibility, "sheets") && leaves.map((leaf) =>
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
              const axlePairs = [
                [wheels[0], wheels[1]],
                [wheels[2], wheels[3]],
              ];
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
                    stroke="#ed806c"
                    strokeWidth={1.5}
                  />
                  {wheels.map((wheel, index) => (
                    <circle
                      key={`${trolley.id}-wheel-${index}`}
                      cx={sx(wheel.u)}
                      cy={sy(wheel.z)}
                      r={3.2}
                    fill="#dce4e8"
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
          {componentVisible(visibility, "c-purlins") && <line
            x1={sx(0)}
            y1={sy(headOf(0) + d.ringDepth / 2000)}
            x2={sx(runLen)}
            y2={sy(headOf(runLen) + d.ringDepth / 2000)}
            stroke="#49c2a7"
            strokeWidth={Math.max(2, (d.ringDepth / 1000) * t.scale)}
          />}
          {/* sill rail */}
          {componentVisible(visibility, "wall-framing") && <line
            x1={sx(0)}
            y1={sy(d.sillHeight)}
            x2={sx(runLen)}
            y2={sy(d.sillHeight)}
            stroke="#99bd70"
            strokeWidth={2.6}
          />}
          {/* studs */}
          {componentVisible(visibility, "wall-framing") && model.members
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
                  stroke="#99bd70"
                  strokeOpacity={0.85}
                  strokeWidth={1.6}
                />
              );
            })}
          {/* posts */}
          {componentVisible(visibility, "posts") && model.posts
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
                  fill="#8494a5"
                  stroke="#dce5ef"
                  strokeWidth={1.6}
                />
              );
            })}
          {componentVisible(visibility, "braces") && model.members
            .filter((member) => member.kind === "brace")
            .filter((member) => side === "front"
              ? Math.abs(member.a.y - model.plan.fl.y) < 0.02
              : Math.abs(member.a.x - d.width) < 0.02)
            .map((member) => {
              const u0 = runOf(member.a);
              const u1 = runOf(member.b);
              return (
                <polygon
                  key={member.id}
                  points={polyPoints([
                    { x: sx(u0), y: sy(member.a.z) },
                    { x: sx(u1), y: sy(member.b.z) },
                    { x: sx(u1), y: sy(member.b.z) + Math.max(2, (d.kneeBraceSize / 1000) * t.scale * 0.55) },
                    { x: sx(u0), y: sy(member.a.z) + Math.max(2, (d.kneeBraceSize / 1000) * t.scale * 0.55) },
                  ])}
                  fill="#80aee0"
                  fillOpacity={0.8}
                  stroke="#c4dcf7"
                  strokeWidth={0.8}
                />
              );
            })}
          {componentVisible(visibility, "fixings") && componentVisible(visibility, "c-purlins") && model.fixings
            .filter((fixing) => fixing.kind !== "tek-screw")
            .filter((fixing) => side === "front"
              ? Math.abs(fixing.at.y - model.plan.fl.y) < 0.02
              : Math.abs(fixing.at.x - d.width) < 0.02)
            .map((fixing) => {
              const u = runOf(fixing.at);
              const y = fixing.at.z < 0.05 ? sy(0) - 2 : sy(fixing.at.z);
              return <circle key={fixing.id} cx={sx(u)} cy={y} r={2.4} fill="#ed806c" stroke="#fff0e9" strokeWidth={0.7} />;
            })}
        </>
      )}

      {/* aluminium door casing, separate from the translucent sheet */}
      {showSteel && componentVisible(visibility, "aluminium-trim") && componentVisible(visibility, "sheets") && leaves.map((leaf) => {
        const slide = d.doorOpen * leaf.travel;
        const u0 = leaf.runStart + slide * leaf.slideDir;
        const u1 = u0 + leaf.width;
        const uMid = (u0 + u1) / 2;
        const top = leafTopOf(u0);
        const bottom = top - leaf.height;
        const trim = Math.max(2, (d.aluminiumTrimSize / 1000) * t.scale);
        return (
          <g key={`trim-${leaf.id}`} fill="none" stroke="#f1c877" strokeWidth={trim}>
            <rect x={sx(u0)} y={sy(top)} width={sx(u1) - sx(u0)} height={sy(bottom) - sy(top)} />
            <line x1={sx(uMid)} y1={sy(top)} x2={sx(uMid)} y2={sy(bottom)} stroke="#ffe4a9" strokeWidth={Math.max(1, trim * 0.55)} />
          </g>
        );
      })}

      {/* roof-edge aluminium flashing */}
      {showSteel && componentVisible(visibility, "aluminium-trim") && (
        <g fill="none" stroke="#f1c877" strokeWidth={2} strokeDasharray="8 2">
          <line x1={sx(0)} y1={sy(model.eaveAt(toWorld(0).x) - 0.025)} x2={sx(runLen)} y2={sy(model.eaveAt(toWorld(runLen).x) - 0.025)} />
          <line x1={sx(0)} y1={sy(headOf(0) - 0.018)} x2={sx(runLen)} y2={sy(headOf(runLen) - 0.018)} />
        </g>
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
  visibility,
  pad = 64,
}: {
  model: Model;
  width: number;
  height: number;
  visibility?: Partial<ComponentVisibility>;
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
      {componentVisible(visibility, "posts") && [0, d.width].map((x) => (
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

      {/* roof Z purlins in the width section */}
      {componentVisible(visibility, "z-purlins") && model.members
        .filter((member) => member.kind === "purlin")
        .sort((a, b) => Math.abs(a.a.y - (D + model.backAt(d.width / 2)) / 2) - Math.abs(b.a.y - (D + model.backAt(d.width / 2)) / 2))
        .slice(0, 1)
        .map((member) => {
          const depth = d.roofPurlinDepth / 1000;
          const topA = member.a.z + depth / 2;
          const topB = member.b.z + depth / 2;
          return (
            <polygon
              key={member.id}
              points={polyPoints([
                { x: sx(member.a.x), y: sy(topA) },
                { x: sx(member.b.x), y: sy(topB) },
                { x: sx(member.b.x), y: sy(topB - depth) },
                { x: sx(member.a.x), y: sy(topA - depth) },
              ])}
              fill="#a96d20"
              fillOpacity={0.82}
              stroke="#e4a747"
              strokeOpacity={0.8}
              strokeWidth={1.1}
            />
          );
        })}

      {/* C-purlin eave sections at each end of the cross-section. */}
      {componentVisible(visibility, "c-purlins") && [0, d.width].map((x) => {
        const halfWidth = 0.04;
        const depth = d.ringDepth / 1000;
        const thickness = Math.max(0.003, d.ringGauge / 1000);
        const top = model.eaveAt(x);
        return (
          <polygon
            key={`ring-section-${x}`}
            points={polyPoints([
              { x: sx(x - halfWidth), y: sy(top) },
              { x: sx(x + halfWidth), y: sy(top) },
              { x: sx(x + halfWidth), y: sy(top - depth) },
              { x: sx(x + halfWidth - thickness), y: sy(top - depth) },
              { x: sx(x + halfWidth - thickness), y: sy(top - thickness) },
              { x: sx(x - halfWidth), y: sy(top - thickness) },
            ])}
            fill="#247c6d"
            stroke="#49c2a7"
            strokeWidth={1.1}
          />
        );
      })}

      {/* Wall framing and front/back knee braces visible in section. */}
      {componentVisible(visibility, "wall-framing") && (
        <>
          {model.members.filter((member) => member.kind === "sill").map((member) => (
            <line key={member.id} x1={sx(member.a.x)} y1={sy(d.sillHeight)} x2={sx(member.b.x)} y2={sy(d.sillHeight)} stroke="#99bd70" strokeWidth={2.5} />
          ))}
          {model.members.filter((member) => member.kind === "stud" && Math.abs(member.a.y - model.plan.fl.y) < 0.02).map((member) => (
            <rect key={member.id} x={sx(member.a.x) - 1.5} y={sy(member.b.z)} width={3} height={sy(member.a.z) - sy(member.b.z)} fill="#99bd70" fillOpacity={0.75} />
          ))}
        </>
      )}
      {componentVisible(visibility, "braces") && model.members
        .filter((member) => member.kind === "brace" && Math.abs(member.a.y - member.b.y) < 0.02)
        .map((member) => {
          const halfWidth = Math.max(1.5, (d.kneeBraceGauge / 1000) * scale);
          return (
            <polygon
              key={member.id}
              points={polyPoints([
                { x: sx(member.a.x), y: sy(member.a.z) },
                { x: sx(member.b.x), y: sy(member.b.z) },
                { x: sx(member.b.x) + halfWidth, y: sy(member.b.z) },
                { x: sx(member.a.x) + halfWidth, y: sy(member.a.z) },
              ])}
              fill="#80aee0"
              stroke="#c4dcf7"
              strokeWidth={0.7}
            />
          );
        })}

      {/* roof plane */}
      {componentVisible(visibility, "sheets") && <polygon
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
      />}

      {/* roof-edge flashing and fixings */}
      {componentVisible(visibility, "aluminium-trim") && (
        <path d={`M ${sx(-d.roofOverhang)} ${sy(model.eaveAt(0) + 0.025)} L ${sx(d.width + d.roofOverhang)} ${sy(model.eaveAt(d.width) + 0.025)}`} stroke="#f1c877" strokeWidth={2} strokeDasharray="8 2" />
      )}
      {componentVisible(visibility, "fixings") && componentVisible(visibility, "sheets") && [0.2, 0.4, 0.6, 0.8].map((fraction) => {
        const x = d.width * fraction;
        return <circle key={fraction} cx={sx(x)} cy={sy(model.eaveAt(x) + 0.012)} r={2.2} fill="#ed806c" stroke="#fff0e9" strokeWidth={0.7} />;
      })}

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
