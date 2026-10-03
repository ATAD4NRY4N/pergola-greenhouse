import { useMemo } from "react";
import { componentVisible } from "../../lib/model";
import type { ComponentVisibility, Model, Vec2 } from "../../lib/model";
import { DimLine, polyPoints } from "../../lib/draw";
import { mmNum } from "../../lib/utils";

export interface PlanTransform {
  sx: (x: number) => number;
  sy: (y: number) => number;
  scale: number;
}

function usePlanTransform(
  model: Model,
  width: number,
  height: number,
  pad: number,
): PlanTransform {
  return useMemo(() => {
    const W = model.design.width;
    const D = Math.max(model.design.depthLeft, model.design.depthRight);
    const ov = model.design.roofOverhang;
    const availW = width - pad * 2;
    const availH = height - pad * 2;
    const scale = Math.min(availW / (W + 2 * ov), availH / (D + 2 * ov));
    const ox = (width - (W + 2 * ov) * scale) / 2 + ov * scale;
    const oy = (height - (D + 2 * ov) * scale) / 2 + ov * scale;
    return {
      scale,
      sx: (x: number) => ox + (x + ov) * scale,
      sy: (y: number) => oy + (y + ov) * scale,
    };
  }, [model, width, height, pad]);
}

export function PlanView({
  model,
  width,
  height,
  showSheets,
  showFrame,
  visibility,
  pad = 72,
}: {
  model: Model;
  width: number;
  height: number;
  showSheets: boolean;
  showFrame: boolean;
  visibility?: Partial<ComponentVisibility>;
  pad?: number;
}) {
  const t = usePlanTransform(model, width, height, pad);
  const d = model.design;
  const { sx, sy } = t;
  const S = (p: Vec2) => ({ x: sx(p.x), y: sy(p.y) });

  const ringInset = d.ringDepth / 1000;
  const outline = (["bl", "br", "fr", "fl"] as const).map((c) => S(model.plan[c]));
  const innerOutline = [
    S({ x: ringInset, y: model.plan.bl.y + ringInset }),
    S({ x: d.width - ringInset, y: model.plan.br.y + ringInset }),
    S({ x: d.width - ringInset, y: model.plan.fr.y - ringInset }),
    S({ x: ringInset, y: model.plan.fl.y - ringInset }),
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      role="img"
      aria-label="Plan view of the structure"
    >
      {/* roof sheeting grid */}
      {showSheets && componentVisible(visibility, "sheets") &&
        model.roofSheets.map((s) => {
          const pts = s.poly.map((p) => S(p));
          return (
            <polygon
              key={s.id}
              points={polyPoints(pts)}
              fill="#67cbe3"
              fillOpacity={s.full ? 0.13 : 0.18}
              stroke="#67cbe3"
              strokeOpacity={s.full ? 0.45 : 0.75}
              strokeWidth={0.8}
            />
          );
        })}

      {/* roof outline + overhang */}
      {componentVisible(visibility, "sheets") && (
        <polygon
          points={polyPoints([
            S({ x: -d.roofOverhang, y: model.plan.bl.y - d.roofOverhang }),
            S({ x: d.width + d.roofOverhang, y: model.plan.br.y - d.roofOverhang }),
            S({ x: d.width + d.roofOverhang, y: model.plan.fr.y + d.roofOverhang }),
            S({ x: -d.roofOverhang, y: model.plan.fl.y + d.roofOverhang }),
          ])}
          fill="none"
          stroke="#67cbe3"
          strokeOpacity={0.52}
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />
      )}

      {/* C purlin perimeter ring */}
      {componentVisible(visibility, "c-purlins") && (
        <>
          <polygon
            points={polyPoints(innerOutline)}
            fill="none"
            stroke="#49c2a7"
            strokeOpacity={0.72}
            strokeWidth={d.ringBuildFrontBack === "double" ? 4 : 2.5}
            strokeLinejoin="round"
          />
          <polygon
            points={polyPoints(outline)}
            fill="none"
            stroke="#49c2a7"
            strokeOpacity={0.38}
            strokeWidth={1.4}
          />
        </>
      )}

      {showFrame && (
        <>
          {/* roof Z purlins, left to right */}
          {componentVisible(visibility, "z-purlins") && model.members
            .filter((m) => m.kind === "purlin")
            .map((m) => {
              const a = S({ x: m.a.x, y: m.a.y });
              const b = S({ x: m.b.x, y: m.b.y });
              return (
                <line
                  key={m.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#e4a747"
                  strokeOpacity={0.78}
                  strokeWidth={1}
                  strokeDasharray="8 4"
                />
              );
            })}
          {/* primary Z girders, back to front */}
          {componentVisible(visibility, "z-purlins") && model.members
            .filter((m) => m.kind === "girder")
            .map((m) => (
              <line
                key={m.id}
                x1={sx(m.a.x)}
                y1={sy(m.a.y)}
                x2={sx(m.b.x)}
                y2={sy(m.b.y)}
                stroke="#e4a747"
                strokeOpacity={0.8}
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
          {/* level C-purlin perimeter, with the door-running front/right lengths highlighted */}
          {componentVisible(visibility, "c-purlins") && model.members
            .filter((m) => m.kind === "level-ring")
            .map((m) => {
              const a = S({ x: m.a.x, y: m.a.y });
              const b = S({ x: m.b.x, y: m.b.y });
              return (
                <g key={m.id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#49c2a7"
                    strokeWidth={3.4}
                    strokeLinecap="round"
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#a2eadb"
                    strokeWidth={3.4}
                    strokeLinecap="round"
                    strokeDasharray="2 9"
                  />
                </g>
              );
            })}
          {/* wall studs on the two glazed runs */}
          {componentVisible(visibility, "wall-framing") && model.members
            .filter((m) => m.kind === "stud")
            .map((m) => {
              const p = S({ x: m.a.x, y: m.a.y });
              const onFront = Math.abs(m.a.y - model.plan.fl.y) < 0.01;
              const onRight = Math.abs(m.a.x - d.width) < 0.01;
              return (
                <g key={m.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={3.2}
                    fill="var(--color-slate-bark-900)"
                    stroke="#99bd70"
                    strokeWidth={1.4}
                  />
                  {(onFront || onRight) && (
                    <circle cx={p.x} cy={p.y} r={1.2} fill="#99bd70" />
                  )}
                </g>
              );
            })}
        </>
      )}

      {/* knee brace footprints */}
      {componentVisible(visibility, "braces") && model.members.filter((m) => m.kind === "brace").map((member) => {
        const a = S({ x: member.a.x, y: member.a.y });
        const b = S({ x: member.b.x, y: member.b.y });
        return <line key={member.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#80aee0" strokeWidth={4} strokeLinecap="round" />;
      })}

      {/* posts */}
      {componentVisible(visibility, "posts") && model.posts.map((p) => {
        const c = S(p.at);
        const s = (d.postSize / 1000) * t.scale;
        return (
          <rect
            key={p.id}
            x={c.x - s / 2}
            y={c.y - s / 2}
            width={s}
            height={s}
            fill="#8494a5"
            stroke="#dce5ef"
            strokeWidth={1.8}
          />
        );
      })}

      {/* fixing heads */}
      {componentVisible(visibility, "fixings") && model.fixings
        .filter((fixing) => fixing.kind !== "tek-screw")
        .map((fixing) => {
        const p = S(fixing.at);
        return <g key={fixing.id}><circle cx={p.x} cy={p.y} r={2.8} fill="#ed806c" stroke="#fff0e9" strokeWidth={0.7} /><path d={`M ${p.x - 1.5} ${p.y} H ${p.x + 1.5}`} stroke="#563e37" strokeWidth={0.7} /></g>;
      })}

      {/* corner fixing symbols */}
      {componentVisible(visibility, "fixings") && componentVisible(visibility, "c-purlins") && model.corners.map((c) => {
        const p = S(c.at);
        const col = c.ok ? (c.fix === "rigid90" ? "#8fd9ab" : "#e0b05c") : "#f87171";
        const off = 22;
        const dir =
          c.id === "bl" ? [-1, -1] : c.id === "br" ? [1, -1] : c.id === "fr" ? [1, 1] : [-1, 1];
        return (
          <g key={c.id}>
            <circle cx={p.x} cy={p.y} r={7} fill="var(--color-slate-bark-950)" stroke={col} strokeWidth={1.5} />
            {c.fix === "rigid90" ? (
              <path
                d={`M ${p.x - 3.4} ${p.y - 3.4} L ${p.x + 3.4} ${p.y + 3.4} M ${p.x + 3.4} ${p.y - 3.4} L ${p.x - 3.4} ${p.y + 3.4}`}
                stroke={col}
                strokeWidth={1.5}
              />
            ) : (
              <path
                d={`M ${p.x - 4} ${p.y + 2.6} A 4.6 4.6 0 0 1 ${p.x + 4} ${p.y + 2.6}`}
                fill="none"
                stroke={col}
                strokeWidth={1.5}
              />
            )}
            <text
              x={p.x + dir[0] * off}
              y={p.y + dir[1] * off}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={col}
              fontSize={9.5}
              fontFamily="var(--font-mono)"
              className="tnum"
            >
              {c.angleDeg.toFixed(1)}°
            </text>
          </g>
        );
      })}

      {/* context labels */}
      <EdgeLabel
        from={S(model.plan.bl)}
        to={S(model.plan.br)}
        dy={-26}
        text="BACK — against wall/fence"
        color="var(--color-slate-bark-300)"
      />
      <EdgeLabel
        from={S(model.plan.fl)}
        to={S(model.plan.bl)}
        dx={-30}
        text="LEFT — against log cabin"
        color="var(--color-brass-400)"
      />
      <EdgeLabel
        from={S(model.plan.br)}
        to={S(model.plan.fr)}
        dx={30}
        text="RIGHT — sliding doors"
        color="var(--color-brass-300)"
      />
      <EdgeLabel
        from={S(model.plan.fr)}
        to={S(model.plan.fl)}
        dy={26}
        text="FRONT — sliding doors"
        color="var(--color-brass-300)"
      />

      {/* dimensions */}
      <DimLine
        x1={sx(0)}
        y1={sy(model.plan.fl.y)}
        x2={sx(d.width)}
        y2={sy(model.plan.fr.y)}
        label={mmNum(d.width)}
        color="var(--color-canopy-300)"
      />
      <DimLine
        x1={sx(0)}
        y1={sy(model.plan.bl.y)}
        x2={sx(0)}
        y2={sy(model.plan.fl.y)}
        label={mmNum(d.depthLeft)}
        color="var(--color-canopy-300)"
      />
      <DimLine
        x1={sx(d.width)}
        y1={sy(model.plan.br.y)}
        x2={sx(d.width)}
        y2={sy(model.plan.fr.y)}
        label={mmNum(d.depthRight)}
        color="var(--color-canopy-300)"
      />

      {/* bay spacing callout */}
      {componentVisible(visibility, "posts") && showFrame && model.posts.length > 4 && (
        <text
          x={sx(d.width / 2)}
          y={sy(model.plan.fl.y)}
          textAnchor="middle"
          fill="var(--color-slate-bark-300)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          className="tnum"
        >
          {model.posts.length} perimeter posts · max bay {mmNum(model.stats.maximumPostSpacing)}
        </text>
      )}
    </svg>
  );
}

function EdgeLabel({
  from,
  to,
  text,
  color,
  dy = 0,
  dx = 0,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  text: string;
  color: string;
  dy?: number;
  dx?: number;
}) {
  const midX = (from.x + to.x) / 2 + dx;
  const midY = (from.y + to.y) / 2 + dy;
  const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const flipped = Math.abs(ang) > 90;
  return (
    <text
      x={midX}
      y={midY}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={color}
      fontSize={9.5}
      letterSpacing="0.14em"
      fontFamily="var(--font-mono)"
      opacity={0.75}
      transform={`rotate(${(flipped ? ang + 180 : ang) * -1} ${midX} ${midY})`}
    >
      {text}
    </text>
  );
}
