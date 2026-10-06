import { useMemo, useRef, useState } from "react";
import { componentVisible, memberComponent, panelComponent, FLOOR_TRACK_DEPTH, FLOOR_TRACK_WIDTH, TRACK_LIP, TRACK_WIDTH } from "../../lib/model";
import type { Model, Vec3, ComponentVisibility } from "../../lib/model";
import { centroid3, fitPointsStable, polyPoints } from "../../lib/draw";

const KIND_STYLE: Record<
  string,
  { stroke: string; width: number; opacity: number; dash?: string }
> = {
  post: { stroke: "#c9d5e2", width: 5, opacity: 0.98 },
  "ring-heavy": { stroke: "#49c2a7", width: 4, opacity: 0.95 },
  ring: { stroke: "#49c2a7", width: 3, opacity: 0.9 },
  "level-ring": { stroke: "#49c2a7", width: 3.4, opacity: 0.95 },
  "floor-track": { stroke: "#49c2a7", width: 3, opacity: 0.9 },
  stud: { stroke: "#99bd70", width: 2, opacity: 0.85 },
  sill: { stroke: "#99bd70", width: 2.5, opacity: 0.85 },
  girder: { stroke: "#e4a747", width: 3.4, opacity: 0.92 },
  purlin: { stroke: "#e4a747", width: 1.9, opacity: 0.8 },
  track: { stroke: "#ed806c", width: 3.2, opacity: 0.95 },
  doorframe: { stroke: "#f1c877", width: 2.6, opacity: 0.98 },
  brace: { stroke: "#80aee0", width: 1.8, opacity: 0.85 },
};

export function Axonometric({
  model,
  showSheets,
  showSteel,
  visibility,
  width,
  height,
  yaw,
  tilt,
  zoom = 1,
  onYaw,
  onTilt,
  onZoom,
  pan,
  onPan,
}: {
  model: Model;
  showSheets: boolean;
  showSteel: boolean;
  visibility?: Partial<ComponentVisibility>;
  width: number;
  height: number;
  yaw: number;
  tilt: number;
  zoom?: number;
  onYaw?: (y: number) => void;
  onTilt?: (t: number) => void;
  onZoom?: (z: number) => void;
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
  const [localZoom, setLocalZoom] = useState(zoom);
  const [localPan, setLocalPan] = useState<Vec3>({ x: 0, y: 0, z: 0 });

  const yawValue = onYaw ? yaw : localYaw;
  const tiltValue = onTilt ? tilt : localTilt;
  const zoomValue = onZoom ? zoom : localZoom;
  const panValue = pan ?? localPan;

  const setYawValue = (v: number) => {
    if (onYaw) onYaw(v);
    else setLocalYaw(v);
  };
  const setTiltValue = (v: number) => {
    if (onTilt) onTilt(v);
    else setLocalTilt(v);
  };
  const setZoomValue = (v: number) => {
    const next = Math.min(2.5, Math.max(0.65, v));
    if (onZoom) onZoom(next);
    else setLocalZoom(next);
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
    return (p: Vec3) => {
      const projected = baseProject({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
      return { x: width / 2 + (projected.x - width / 2) * zoomValue, y: height / 2 + (projected.y - height / 2) * zoomValue };
    };
  }, [baseProject, panValue, zoomValue, width, height]);

  const P = (p: Vec3) => project(p);

  const sortedPanels = useMemo(() => {
    const list = model.panels.filter(
      (panel) => showSheets && componentVisible(visibility, panelComponent(panel.kind)),
    );
    return [...list].sort(
      (a, b) => centroid3(a.poly).y * 0.2 + centroid3(a.poly).x - (centroid3(b.poly).y * 0.2 + centroid3(b.poly).x),
    );
  }, [model.panels, showSheets, visibility]);

  const sortedMembers = useMemo(() => {
    const m = model.members.filter(
      (member) => showSteel && componentVisible(visibility, memberComponent(member.kind)),
    );
    return [...m].sort(
      (a, b) =>
        (a.a.y + a.a.x + a.b.y + a.b.x) - (b.a.y + b.a.x + b.b.y + b.b.x),
    );
  }, [model.members, showSteel, visibility]);

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
          setTiltValue(Math.min(90, Math.max(0, g.tilt - dy * 0.35)));
        } else {
          // Horizontal drag slides along the model's X/Y, vertical along Z.
          setPanValue({
            x: g.pan.x + dx * panScale,
            y: g.pan.y - dx * panScale * 0.5,
            z: g.pan.z + dy * panScale,
          });
        }
      }}
      onWheel={(e) => {
        e.preventDefault();
        setZoomValue(zoomValue * Math.exp(-e.deltaY * 0.001));
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
      aria-label="Axonometric view of the pergola greenhouse structure. Drag to orbit, shift-drag or right-drag to move in X, Y and Z, and use the mouse wheel to zoom."
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
          <stop offset="0%" stopColor="#f2d08a" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#c8903a" stopOpacity="0.38" />
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
        const stroke = "#67cbe3";
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

      {/* Illustrative open-bottom C-channel sections on structural perimeter members. */}
      {showSteel && componentVisible(visibility, "c-purlins") && model.members
        .filter((member) => member.kind === "level-ring")
        .map((member) => {
          const isTrack = member.kind === "level-ring";
          const halfDepth = Math.max(0.05, model.design.ringDepth / 1000) / 2;
          const halfWidth = isTrack ? TRACK_WIDTH / 2 : 0.055;
          const dx = member.b.x - member.a.x;
          const dy = member.b.y - member.a.y;
          const length = Math.hypot(dx, dy) || 1;
          const nx = dy / length;
          const ny = -dx / length;
          const section = isTrack
            ? [
                [[-halfWidth, halfDepth], [halfWidth, halfDepth]],
                [[-halfWidth, halfDepth], [-halfWidth, -halfDepth]],
                [[halfWidth, halfDepth], [halfWidth, -halfDepth]],
                [[-halfWidth, -halfDepth], [-halfWidth + TRACK_LIP, -halfDepth]],
                [[halfWidth, -halfDepth], [halfWidth - TRACK_LIP, -halfDepth]],
              ] as const
            : [
                [[-halfWidth, halfDepth], [halfWidth, halfDepth]],
                [[-halfWidth, -halfDepth], [-halfWidth, halfDepth]],
                [[halfWidth, -halfDepth], [halfWidth, halfDepth]],
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
            <g key={`channel-${member.id}`} fill="none" stroke="#49c2a7" strokeWidth={isTrack ? 1.8 : 2.4} strokeLinejoin="round">
              {lines.map(([a, b], index) => <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
            </g>
          );
        })}

      {/* Schematic recessed door channels; dimensions and exact profile remain unverified. */}
      {showSteel && componentVisible(visibility, "c-purlins") && model.members.filter((member) => member.kind === "floor-track").map((member) => {
        const dx = member.b.x - member.a.x;
        const dy = member.b.y - member.a.y;
        const length = Math.hypot(dx, dy) || 1;
        const nx = dy / length;
        const ny = -dx / length;
        const at = (base: Vec3, lateral: number, z: number) => P({ x: base.x + nx * lateral, y: base.y + ny * lateral, z });
        const halfWidth = FLOOR_TRACK_WIDTH / 2;
        const lines = [
          [at(member.a, -halfWidth, 0), at(member.b, -halfWidth, 0)],
          [at(member.a, halfWidth, 0), at(member.b, halfWidth, 0)],
          [at(member.a, -halfWidth, -FLOOR_TRACK_DEPTH), at(member.b, -halfWidth, -FLOOR_TRACK_DEPTH)],
          [at(member.a, halfWidth, -FLOOR_TRACK_DEPTH), at(member.b, halfWidth, -FLOOR_TRACK_DEPTH)],
          [at(member.a, -halfWidth, 0), at(member.a, -halfWidth, -FLOOR_TRACK_DEPTH)],
          [at(member.a, halfWidth, 0), at(member.a, halfWidth, -FLOOR_TRACK_DEPTH)],
          [at(member.b, -halfWidth, 0), at(member.b, -halfWidth, -FLOOR_TRACK_DEPTH)],
          [at(member.b, halfWidth, 0), at(member.b, halfWidth, -FLOOR_TRACK_DEPTH)],
        ];
        return <g key={`floor-track-${member.id}`} fill="none" stroke="#49c2a7" strokeWidth={1.6}>{lines.map(([a, b], index) => <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}</g>;
      })}

      {/* Extruded section solids: SHS boxes, open C-channels and Z sections. */}
      {sortedMembers.filter((member) => member.kind !== "floor-track").map((member) => {
        const style = KIND_STYLE[member.kind] ?? KIND_STYLE.ring;
        const direction = {
          x: member.b.x - member.a.x,
          y: member.b.y - member.a.y,
          z: member.b.z - member.a.z,
        };
        const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
        const axis = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
        let lateral = { x: axis.y, y: -axis.x, z: 0 };
        let vertical = { x: 0, y: 0, z: 0 };
        if (member.kind === "doorframe" && member.profileNormal && member.profileFacing) {
          const removeAxis = (vector: Vec3) => {
            const dot = vector.x * axis.x + vector.y * axis.y + vector.z * axis.z;
            const projected = { x: vector.x - axis.x * dot, y: vector.y - axis.y * dot, z: vector.z - axis.z * dot };
            const magnitude = Math.hypot(projected.x, projected.y, projected.z) || 1;
            return { x: projected.x / magnitude, y: projected.y / magnitude, z: projected.z / magnitude };
          };
          // The trim face spans across the sheet normal; the open U mouth
          // follows the sheet plane, toward the leaf centre.
          lateral = removeAxis(member.profileNormal);
          vertical = removeAxis(member.profileFacing);
        } else {
          const lateralLength = Math.hypot(lateral.x, lateral.y, lateral.z) || 1;
          lateral = { x: lateral.x / lateralLength, y: lateral.y / lateralLength, z: lateral.z / lateralLength };
          vertical = {
            x: axis.y * lateral.z - axis.z * lateral.y,
            y: axis.z * lateral.x - axis.x * lateral.z,
            z: axis.x * lateral.y - axis.y * lateral.x,
          };
          if (Math.hypot(axis.x, axis.y) < 1e-5) {
            lateral = { x: 1, y: 0, z: 0 };
            vertical = { x: 0, y: 1, z: 0 };
          }
          if (vertical.z < 0) vertical = { x: -vertical.x, y: -vertical.y, z: -vertical.z };
        }

        const width = member.kind === "post" ? model.design.postSize / 1000
          : member.kind === "ring-heavy" ? 0.12
          : member.kind === "ring" || member.kind === "level-ring" ? TRACK_WIDTH
          : member.kind === "girder" || member.kind === "purlin" ? 0.08
          : member.kind === "doorframe" ? model.design.aluminiumTrimSize / 1000
          : member.kind === "brace" ? Math.max(0.02, model.design.kneeBraceSize * 0.4 / 1000)
          : 0.05;
        const depth = member.kind === "brace" ? model.design.kneeBraceSize / 1000
          : member.kind === "doorframe" ? model.design.doorTrimDepth / 1000
          : member.kind === "post" ? width
          : member.kind === "ring" || member.kind === "ring-heavy" || member.kind === "level-ring" ? model.design.ringDepth / 1000
          : model.design.roofPurlinDepth / 1000;
        const sectionGauge = member.kind === "post" ? model.design.postGauge
          : member.kind === "brace" ? model.design.kneeBraceGauge
          : member.kind === "ring" || member.kind === "ring-heavy" || member.kind === "level-ring" ? model.design.ringGauge
          : member.kind === "doorframe" ? model.design.doorTrimGauge
          : model.design.roofPurlinGauge;
        const thickness = Math.max(0.0015, sectionGauge / 1000);
        const channel = member.kind === "ring" || member.kind === "ring-heavy" || member.kind === "level-ring" || member.kind === "stud" || member.kind === "sill" || member.kind === "brace" || member.kind === "doorframe";
        const zSection = member.kind === "girder" || member.kind === "purlin";
        const halfW = width / 2;
        const halfD = depth / 2;
        const profile: [number, number][] = member.kind === "doorframe"
          ? [[-halfW, halfD], [-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [halfW - thickness, halfD], [halfW - thickness, -halfD + thickness], [-halfW + thickness, -halfD + thickness], [-halfW + thickness, halfD]]
          : channel
            ? [[-halfW, -halfD], [halfW, -halfD], [halfW, -halfD + thickness], [-halfW + thickness, -halfD + thickness], [-halfW + thickness, halfD - thickness], [halfW, halfD - thickness], [halfW, halfD], [-halfW, halfD]]
            : zSection
            ? [[-halfW, halfD], [halfW, halfD], [halfW, halfD - thickness], [-halfW + thickness, halfD - thickness], [-halfW + thickness, -halfD + thickness], [halfW, -halfD + thickness], [halfW, -halfD], [-halfW, -halfD]]
            : [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]];
        const vertex = (base: Vec3, point: [number, number]) => P({
          x: base.x + lateral.x * point[0] + vertical.x * point[1],
          y: base.y + lateral.y * point[0] + vertical.y * point[1],
          z: base.z + lateral.z * point[0] + vertical.z * point[1],
        });
        const start = profile.map((point) => vertex(member.a, point));
        const end = profile.map((point) => vertex(member.b, point));
        return (
          <g key={member.id} opacity={style.opacity}>
            {profile.map((_, index) => {
              const next = (index + 1) % profile.length;
              return (
                <polygon
                  key={`${member.id}-face-${index}`}
                  points={polyPoints([start[index], start[next], end[next], end[index]])}
                  fill={index % 3 === 0 ? "#101714" : style.stroke}
                  fillOpacity={index % 3 === 0 ? 0.92 : 0.66}
                  stroke={style.stroke}
                  strokeWidth={0.65}
                />
              );
            })}
          {(() => {
            const innerRatio = Math.max(0.45, 1 - (2 * sectionGauge) / (width * 1000));
            const cap = (base: Vec3) => {
              const outer = polyPoints(profile.map((point) => vertex(base, point)));
              if (member.kind !== "post") return `M ${outer} Z`;
              const inner = polyPoints(profile.map((point) => vertex(base, [point[0] * innerRatio, point[1] * innerRatio])));
              return `M ${outer} Z M ${inner} Z`;
            };
            return (
              <>
                <path d={cap(member.a)} fill={style.stroke} fillOpacity={0.8} fillRule="evenodd" stroke={style.stroke} strokeWidth={0.8} />
                <path d={cap(member.b)} fill={style.stroke} fillOpacity={0.7} fillRule="evenodd" stroke={style.stroke} strokeWidth={0.8} />
              </>
            );
          })()}
          </g>
        );
      })}

      {/* fixing heads: anchors, structural bolts and sheet tek screws */}
      {showSteel && componentVisible(visibility, "fixings") && model.fixings
        .filter((fixing) => fixing.kind !== "tek-screw" || componentVisible(visibility, "sheets"))
        .map((fixing) => {
          const p = P(fixing.at);
          const radius = Math.max(1.5, fixing.diameter * fit.scale * 0.45);
          const color = fixing.kind === "tek-screw" ? "#ed806c" : "#dce4e8";
          return (
            <g key={fixing.id}>
              <circle cx={p.x} cy={p.y} r={radius} fill={color} stroke="#452d28" strokeWidth={0.7} />
              <path d={`M ${p.x - radius * 0.55} ${p.y} H ${p.x + radius * 0.55} M ${p.x} ${p.y - radius * 0.55} V ${p.y + radius * 0.55}`} stroke="#563e37" strokeWidth={0.65} />
            </g>
          );
        })}

      {/* Illustrative floor-level roller carriages, with the leaf load carried at the floor. */}
      {showSteel && componentVisible(visibility, "fixings") && model.doors.flatMap((leaf) =>
        leaf.carriages.map((carriage) => {
          const mix = (a: Vec3, b: Vec3): Vec3 => ({
            x: a.x + (b.x - a.x) * model.design.doorOpen,
            y: a.y + (b.y - a.y) * model.design.doorOpen,
            z: a.z + (b.z - a.z) * model.design.doorOpen,
          });
          const wheels = carriage.rollerCentres.map((point, index) => P(mix(point, carriage.parkedRollerCentres[index])));
          const carrier = { a: P(mix(carriage.carrier.a, carriage.parkedCarrier.a)), b: P(mix(carriage.carrier.b, carriage.parkedCarrier.b)) };
          return (
            <g key={carriage.id}>
              <line x1={carrier.a.x} y1={carrier.a.y} x2={carrier.b.x} y2={carrier.b.y} stroke="#d69e49" strokeWidth={2} />
              {wheels.map((wheel, index) => <circle key={`${carriage.id}-roller-${index}`} cx={wheel.x} cy={wheel.y} r={3.2} fill="#dce4e8" stroke="#4a5157" strokeWidth={1} />)}
            </g>
          );
        }),
      )}

      {/* corner fixing markers */}
      {showSteel && componentVisible(visibility, "fixings") && model.corners.map((c) => {
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
