import { useMemo } from "react";
import { componentVisible, DOOR_FLOOR_CLEARANCE, DOOR_LEAF_H, FLOOR_TRACK_DEPTH } from "../../lib/model";
import type { ComponentVisibility, Model } from "../../lib/model";
import { DimLine, Leader, polyPoints } from "../../lib/draw";
import { mmNum } from "../../lib/utils";

type Side = "front" | "right" | "back" | "left";
type GlazedSide = "front" | "right";

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
  if (side === "back" || side === "left") {
    return <StructureElevationView model={model} side={side} width={width} height={height} showSteel={showSteel} visibility={visibility} pad={pad} />;
  }
  return <GlazedElevationView model={model} side={side} width={width} height={height} showSteel={showSteel} visibility={visibility} pad={pad} />;
}

/** Elevation of the two glazed runs, including their doors and wall bays. */
function GlazedElevationView({
  model,
  side,
  width,
  height,
  showSteel,
  visibility,
  pad = 64,
}: {
  model: Model;
  side: GlazedSide;
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

  /* Door leaves sit just above the finished floor on recessed floor rollers. */
  const leafBottom = DOOR_FLOOR_CLEARANCE;
  const leafTop = leafBottom + DOOR_LEAF_H;
  const leafTopOf = (_u: number) => leafTop;
  const floorTrack = model.members.find(
    (member) => member.kind === "floor-track" && member.label?.endsWith(side),
  );

  const leaves = model.doors.filter((dl) => dl.side === side);

  /* Map a point on this run to its along-wall coordinate, 0 at the front-left
     corner running away from it. */
  const runOf = (p: { x: number; y: number }) =>
    side === "right" ? model.plan.fr.y - p.y : p.x;

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

      {/* Only actual fixed glazed bays are polycarbonate; open bays stay empty. */}
      {componentVisible(visibility, "sheets") && model.wallBays
        .filter((b) => b.side === side && b.type === "glazed")
        .map((b) => {
          const x0 = sx(b.centre - b.width / 2);
          const x1 = sx(b.centre + b.width / 2);
          const top = headOf(b.centre);
          return (
            <g key={b.id}>
              <rect
                x={x0}
                y={sy(top)}
                width={x1 - x0}
                height={sy(d.sillHeight) - sy(top)}
                fill={`url(#${side}-glaze)`}
                stroke="#67cbe3"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
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
              fillOpacity={0.32}
              stroke="#67cbe3"
              strokeWidth={1.4}
            />
            {/* polycarb ribs */}
            <g clipPath={`url(#${clipId})`} opacity={0.52}>
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

      {/* Recessed floor channel and its illustrative rollers, separately toggled from sheets. */}
      {showSteel && floorTrack && componentVisible(visibility, "c-purlins") && (
        <g aria-label="schematic recessed floor channel">
          <line x1={sx(trackFrom)} y1={sy(0)} x2={sx(trackTo)} y2={sy(0)} stroke="#49c2a7" strokeWidth={2} />
          <line x1={sx(trackFrom)} y1={sy(-FLOOR_TRACK_DEPTH)} x2={sx(trackTo)} y2={sy(-FLOOR_TRACK_DEPTH)} stroke="#49c2a7" strokeWidth={2} />
          <text x={sx((trackFrom + trackTo) / 2)} y={sy(-FLOOR_TRACK_DEPTH) + 12} textAnchor="middle" fill="#49c2a7" fontSize={8} fontFamily="var(--font-mono)">schematic recessed floor channel · dimensions to confirm</text>
        </g>
      )}
      {showSteel && componentVisible(visibility, "fixings") && componentVisible(visibility, "sheets") && leaves.map((leaf) =>
        leaf.carriages.map((carriage) => {
          const wheels = carriage.rollerCentres.map((wheel, index) => {
            const parked = carriage.parkedRollerCentres[index];
            const u = runOf({ x: wheel.x + (parked.x - wheel.x) * d.doorOpen, y: wheel.y + (parked.y - wheel.y) * d.doorOpen });
            return { u, z: wheel.z + (parked.z - wheel.z) * d.doorOpen };
          });
          const interpolate = (start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }) => ({
            x: start.x + (end.x - start.x) * d.doorOpen,
            y: start.y + (end.y - start.y) * d.doorOpen,
            z: start.z + (end.z - start.z) * d.doorOpen,
          });
          const carrierTop = interpolate(carriage.carrier.a, carriage.parkedCarrier.a);
          const carrierBottom = interpolate(carriage.carrier.b, carriage.parkedCarrier.b);
          return (
            <g key={carriage.id}>
              {wheels.map((wheel, index) => <circle key={`${carriage.id}-roller-${index}`} cx={sx(wheel.u)} cy={sy(wheel.z)} r={3.2} fill="#dce4e8" stroke="#4a5157" strokeWidth={1} />)}
              <line x1={sx(runOf(carrierTop))} y1={sy(carrierTop.z)} x2={sx(runOf(carrierBottom))} y2={sy(carrierBottom.z)} stroke="#d69e49" strokeWidth={1.5} />
            </g>
          );
        }),
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
        const top = leafTopOf(u0);
        const bottom = top - leaf.height;
        const trim = Math.max(2, (d.aluminiumTrimSize / 1000) * t.scale);
        return (
          <g key={`trim-${leaf.id}`} fill="none" stroke="#f1c877" strokeWidth={trim}>
            <rect x={sx(u0)} y={sy(top)} width={sx(u1) - sx(u0)} height={sy(bottom) - sy(top)} />
          </g>
        );
      })}



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
          label="8 × 4 ft polycarbonate leaf\nU-channel casing · floor-level rollers"
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

/** True structural elevation of the solid rear and left perimeter runs. */
function StructureElevationView({
  model,
  side,
  width,
  height,
  showSteel,
  visibility,
  pad,
}: {
  model: Model;
  side: "back" | "left";
  width: number;
  height: number;
  showSteel: boolean;
  visibility?: Partial<ComponentVisibility>;
  pad: number;
}) {
  const d = model.design;
  const start = side === "back" ? model.plan.bl : model.plan.fl;
  const end = side === "back" ? model.plan.br : model.plan.bl;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const runLen = Math.hypot(dx, dy);
  const tx = dx / runLen;
  const ty = dy / runLen;
  const station = (p: { x: number; y: number }) => (p.x - start.x) * tx + (p.y - start.y) * ty;
  const offset = (p: { x: number; y: number }) => Math.abs((p.x - start.x) * ty - (p.y - start.y) * tx);
  const maxH = Math.max(d.eaveLeft, d.eaveRight) + 0.55;
  const scale = Math.min((width - pad * 2) / runLen, (height - pad * 2) / maxH);
  const sx = (u: number) => pad + u * scale;
  const sy = (z: number) => height - pad - z * scale;
  const worldAt = (u: number) => ({ x: start.x + tx * u, y: start.y + ty * u });
  const eaveAt = (u: number) => model.eaveAt(worldAt(u).x);
  const edgePosts = model.posts.filter((post) => offset(post.at) < 0.025 && station(post.at) >= -0.01 && station(post.at) <= runLen + 0.01);
  const edgeBraces = model.members.filter((member) => member.kind === "brace" && offset(member.a) < 0.12 && offset(member.b) < 0.12 && station(member.a) >= -0.01 && station(member.a) <= runLen + 0.01 && station(member.b) >= -0.01 && station(member.b) <= runLen + 0.01);
  const rail = model.members.find((member) => member.kind === "level-ring" && member.label?.endsWith(side));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img" aria-label={`${side} elevation`}>
      <line x1={pad - 20} y1={sy(0)} x2={width - pad + 20} y2={sy(0)} stroke="var(--color-slate-bark-400)" strokeWidth={1.5} />
      <g stroke="var(--color-slate-bark-600)" strokeWidth={1} opacity={0.55}>
        {Array.from({ length: 40 }).map((_, i) => {
          const x = pad - 20 + i * ((width - 2 * pad + 40) / 39);
          return <line key={i} x1={x} y1={sy(0)} x2={x - 8} y2={sy(0) + 8} />;
        })}
      </g>
      {showSteel && <>
        {componentVisible(visibility, "c-purlins") && <>
          <line x1={sx(0)} y1={sy(eaveAt(0) - d.ringDepth / 1000)} x2={sx(runLen)} y2={sy(eaveAt(runLen) - d.ringDepth / 1000)} stroke="#49c2a7" strokeWidth={Math.max(2, d.ringDepth / 1000 * scale)} />
          {rail && <line x1={sx(0)} y1={sy(rail.a.z)} x2={sx(runLen)} y2={sy(rail.a.z)} stroke="#49c2a7" strokeWidth={Math.max(2, d.ringDepth / 1000 * scale)} strokeDasharray="7 4" />}
        </>}
        {componentVisible(visibility, "posts") && edgePosts.map((post) => {
          const u = station(post.at);
          const postWidth = d.postSize / 1000 * scale;
          return <g key={post.id}>
            <rect x={sx(u) - postWidth / 2} y={sy(post.height)} width={postWidth} height={sy(0) - sy(post.height)} fill="#8494a5" stroke="#dce5ef" strokeWidth={1.2} />
            {post.corner && <text x={sx(u)} y={sy(0) + 17} textAnchor="middle" fill="var(--color-slate-bark-400)" fontSize={8} fontFamily="var(--font-mono)">{post.corner.toUpperCase()}</text>}
          </g>;
        })}
        {componentVisible(visibility, "braces") && edgeBraces.map((brace) => (
          <line key={brace.id} x1={sx(station(brace.a))} y1={sy(brace.a.z)} x2={sx(station(brace.b))} y2={sy(brace.b.z)} stroke="#80aee0" strokeWidth={Math.max(3, d.kneeBraceSize / 1000 * scale * 0.45)} opacity={0.9} />
        ))}
      </>}
      <polyline points={`${sx(0)},${sy(eaveAt(0))} ${sx(runLen)},${sy(eaveAt(runLen))}`} fill="none" stroke="var(--color-canopy-300)" strokeWidth={1.5} strokeDasharray="8 4" />
      <DimLine x1={sx(0)} y1={sy(0)} x2={sx(runLen)} y2={sy(0)} label={mmNum(runLen)} color="var(--color-canopy-300)" />
      <DimLine x1={sx(runLen) + 18} y1={sy(0)} x2={sx(runLen) + 18} y2={sy(eaveAt(runLen))} label={mmNum(eaveAt(runLen))} color="var(--color-canopy-300)" />
      <text x={pad} y={24} fill="var(--color-slate-bark-300)" fontSize={10} letterSpacing="0.18em" fontFamily="var(--font-mono)">
        {side === "back" ? "BACK ELEVATION · CABIN SIDE" : "LEFT ELEVATION · BOUNDARY SIDE"} · looking inside
      </text>
      <text x={width - pad} y={24} textAnchor="end" fill="var(--color-slate-bark-500)" fontSize={9} fontFamily="var(--font-mono)">
        {side === "back" ? "sloping rear edge" : "constant-x side run"}
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

      {/* Roof flashing is not aluminium door trim; only door casing uses that toggle. */}
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
