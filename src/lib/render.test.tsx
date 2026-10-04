/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Axonometric } from "../components/views/Axonometric";
import { PlanView } from "../components/views/PlanView";
import { ElevationView, SectionView } from "../components/views/ElevationView";
import { DoorDetailView } from "../components/views/DoorDetailView";
import { BuildPlanPanel, ChecksPanel } from "../components/panels";
import { Landing } from "../pages/Landing";
import { Designer } from "../components/Designer";
import { XyzPad, OrbitControls } from "../components/ViewControls";
import {
  DEFAULT_COMPONENT_VISIBILITY,
  DEFAULT_DESIGN,
  buildModel,
  type Design,
} from "./model";
import { fitPointsStable } from "./draw";

const variants: [string, Partial<Design>][] = [
  ["default brief", {}],
  ["square plan", { depthRight: 8.0 }],
  ["tiny", { width: 3, depthLeft: 2.5, depthRight: 2.5, eaveLeft: 2.2, eaveRight: 2.4 }],
  [
    "large",
    {
      width: 14,
      depthLeft: 12,
      depthRight: 9,
      eaveLeft: 2.6,
      eaveRight: 4.2,
      girderCount: 4,
      frontDoors: 4,
      rightDoors: 3,
      postCount: 18,
    },
  ],
  ["no doors", { frontDoors: 0, rightDoors: 0 }],
  ["low eaves", { eaveLeft: 2.4, eaveRight: 2.7 }],
  [
    "flat roof, low bays",
    { eaveLeft: 2.5, eaveRight: 2.5, postCount: 12, roofPurlinSpacing: 1.4 },
  ],
];

describe("views render without throwing", () => {
  for (const [name, patch] of variants) {
    test(name, () => {
      const model = buildModel({ ...DEFAULT_DESIGN, ...patch });

      const axon = renderToStaticMarkup(
        <Axonometric
          model={model}
          showSheets
          showSteel
          width={640}
          height={420}
          yaw={-38}
          tilt={58}
        />,
      );
      expect(axon).toContain("<svg");
      expect(axon).toContain("<polygon");
      expect(axon).toContain("#ed806c");

      const plan = renderToStaticMarkup(
        <PlanView model={model} width={640} height={420} showSheets showFrame />,
      );
      expect(plan).toContain("<svg");

      const front = renderToStaticMarkup(
        <ElevationView
          model={model}
          side="front"
          width={640}
          height={360}
          showSteel
        />,
      );
      expect(front).toContain("<svg");

      const right = renderToStaticMarkup(
        <ElevationView model={model} side="right" width={640} height={360} showSteel />,
      );
      const back = renderToStaticMarkup(
        <ElevationView model={model} side="back" width={640} height={360} showSteel />,
      );
      const left = renderToStaticMarkup(
        <ElevationView model={model} side="left" width={640} height={360} showSteel />,
      );
      expect(right).toContain('aria-label="right elevation"');
      expect(back).toContain('aria-label="back elevation"');
      expect(left).toContain('aria-label="left elevation"');

      const section = renderToStaticMarkup(
        <SectionView model={model} width={640} height={360} />,
      );
      expect(section).toContain("<svg");

      const checks = renderToStaticMarkup(<ChecksPanel model={model} />);
      expect(checks.length).toBeGreaterThan(100);
    });
  }
});

describe("single sliding-door detail sheet", () => {
  test("renders the floor-roller arrangement, SHS junction and U-channel trim details", () => {
    const model = buildModel({ ...DEFAULT_DESIGN, frontDoors: 1, rightDoors: 0 });
    const html = renderToStaticMarkup(
      <DoorDetailView model={model} width={900} height={620} />,
    );
    expect(html).toContain('aria-label="Single sliding door and enlarged connection details"');
    expect(html).toContain("COMPLETE LEAF");
    expect(html).toContain("RECESSED FLOOR CHANNEL");
    expect(html).toContain("SHS-TO-PURLIN JUNCTION");
    expect(html).toContain("aluminium U-channel");
    expect(html).toContain("NO OVERHEAD TROLLEY");
    expect(model.doors).toHaveLength(1);
  });
});

describe("full pages render without throwing", () => {
  test("landing page", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(html).toContain("Polyframe");
    expect(html).toContain("<svg");
    expect(html).toContain("/auth?returnTo=/designer");
    expect(html.length).toBeGreaterThan(2000);
  });

  test("designer workspace", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Designer />
      </MemoryRouter>,
    );
    expect(html).toContain("Dimensions");
    expect(html).toContain("Cut list");
    expect(html).toContain("Front");
    expect(html).toContain("Sourcing");
    expect(html).toContain("Build plan");
    expect(html).toContain("Perimeter ring");
    expect(html).toContain("<svg");
  });
});

describe("3D movement controls", () => {
  test("axonometric fit keeps the same scale while the camera rotates", () => {
    const points = [
      { x: -4, y: -3, z: 0 },
      { x: 4, y: -3, z: 0 },
      { x: 4, y: 3, z: 4 },
      { x: -4, y: 3, z: 4 },
    ];
    const initial = fitPointsStable(points, -38, 58, 500, 320, 64);
    const rotated = fitPointsStable(points, 140, 24, 500, 320, 64);
    expect(rotated.scale).toBe(initial.scale);
    const centre = { x: 0, y: 0, z: 2 };
    expect(rotated.project(centre)).toEqual({ x: 250, y: 160 });
  });

  test("axis pad renders each axis and its offset", () => {
    const html = renderToStaticMarkup(
      <XyzPad
        pan={{ x: 1.25, y: -0.5, z: 0 }}
        onChange={() => {}}
        onReset={() => {}}
      />,
    );
    expect(html).toContain("X");
    expect(html).toContain("Y");
    expect(html).toContain("Z");
    expect(html).toContain("+1.25");
    expect(html).toContain("-0.50");
    expect(html).toContain('aria-label="Move along X"');
    expect(html).toContain('aria-label="Move along Y"');
    expect(html).toContain('aria-label="Move along Z"');
  });

  test("orbit controls expose spin and tilt", () => {
    const html = renderToStaticMarkup(
      <OrbitControls
        yaw={-38}
        tilt={58}
        zoom={1}
        onYaw={() => {}}
        onTilt={() => {}}
        onZoom={() => {}}
        onReset={() => {}}
      />,
    );
    expect(html).toContain('aria-label="Spin"');
    expect(html).toContain('aria-label="Tilt"');
    expect(html).toContain('aria-label="Zoom"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="90"');
  });

  test("the axonometric pans without changing the model", () => {
    const model = buildModel(DEFAULT_DESIGN);
    const base = renderToStaticMarkup(
      <Axonometric
        model={model}
        showSheets
        showSteel
        width={500}
        height={320}
        yaw={-38}
        tilt={58}
      />,
    );
    const panned = renderToStaticMarkup(
      <Axonometric
        model={model}
        showSheets
        showSteel
        width={500}
        height={320}
        yaw={-38}
        tilt={58}
        pan={{ x: 2, y: -1, z: 3 }}
      />,
    );
    // Same number of members, but drawn somewhere else.
    expect(panned).not.toBe(base);
    expect((panned.match(/<line/g) ?? []).length).toBe(
      (base.match(/<line/g) ?? []).length,
    );
  });

  test("the axonometric honours eye-level tilt and zoom changes", () => {
    const model = buildModel(DEFAULT_DESIGN);
    const flat = renderToStaticMarkup(
      <Axonometric
        model={model}
        showSheets
        showSteel
        width={500}
        height={320}
        yaw={-38}
        tilt={20}
      />,
    );
    const steep = renderToStaticMarkup(
      <Axonometric
        model={model}
        showSheets
        showSteel
        width={500}
        height={320}
        yaw={-38}
        tilt={0}
      />,
    );
    const zoomed = renderToStaticMarkup(
      <Axonometric model={model} showSheets showSteel width={500} height={320} yaw={-38} tilt={58} zoom={2} />,
    );
    expect(flat).not.toBe(steep);
    expect(flat).not.toBe(zoomed);
    expect(zoomed).toContain("<svg");
  });

  test("set-out guide reports the skewed footprint, diagonals and post coordinates", () => {
    const model = buildModel(DEFAULT_DESIGN);
    const html = renderToStaticMarkup(<BuildPlanPanel model={model} />);
    expect(html).toContain("Ground set-out &amp; build plan");
    expect(html).toContain("FL–BR");
    expect(html).toContain("FR–BL");
    expect(html).toContain("X 8,500 · Y 7,000");
    expect(html).toContain("8,559 mm");
    expect(html).toContain("Solo-friendly assembly sequence");
    expect(html).toContain("not construction or structural instructions");
  });
});

describe("Front elevation door-only sheet visibility", () => {
  test("shows only two fixed-size front door sheets and their casing, without fixed bays or roof flashing", () => {
    const model = buildModel({ ...DEFAULT_DESIGN, glazeFront: true });
    const html = renderToStaticMarkup(
      <ElevationView
        model={model}
        side="front"
        width={900}
        height={500}
        showSteel
        visibility={{ ...DEFAULT_COMPONENT_VISIBILITY, sheets: true, "aluminium-trim": true, "c-purlins": false, "wall-framing": false, posts: false, braces: false, fixings: false, "z-purlins": false }}
      />,
    );
    expect(model.doors.filter((leaf) => leaf.side === "front")).toHaveLength(2);
    expect(model.wallBays.filter((bay) => bay.side === "front" && bay.type === "glazed")).toHaveLength(0);
    expect(html.match(/1,219×2,438/g)).toHaveLength(2);
    expect(html).not.toContain("1,063");
    expect(html).not.toContain("roof-edge");
    expect(html).toContain("floor-level rollers");
    const dimensionLabels = [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
    expect(dimensionLabels.filter((label) => label === "1,219×2,438")).toHaveLength(2);
    expect(html.match(/<g[^>]*stroke="#f1c877"/g)).toHaveLength(2);
  });
});

describe("views handle missing sheets and steel", () => {
  test("component visibility hides its geometry in every drawing", () => {
    const model = buildModel(DEFAULT_DESIGN);
    const onlyGlass = {
      ...DEFAULT_COMPONENT_VISIBILITY,
      posts: false,
      "c-purlins": false,
      "z-purlins": false,
      braces: false,
      "wall-framing": false,
      "aluminium-trim": false,
      fixings: false,
    };
    const axon = renderToStaticMarkup(
      <Axonometric model={model} showSheets showSteel width={500} height={320} yaw={0} tilt={58} visibility={onlyGlass} />,
    );
    expect(axon).not.toContain("#c9d5e2");
    expect(axon).toContain("#67cbe3");
    const plan = renderToStaticMarkup(
      <PlanView model={model} width={500} height={320} showSheets showFrame visibility={{ ...onlyGlass, sheets: false }} />,
    );
    expect(plan).not.toContain("#49c2a7");
    const elevation = renderToStaticMarkup(
      <ElevationView model={model} side="front" width={500} height={320} showSteel visibility={{ ...onlyGlass, sheets: false }} />,
    );
    const rearElevation = renderToStaticMarkup(
      <ElevationView model={model} side="back" width={500} height={320} showSteel visibility={{ ...onlyGlass, sheets: false }} />,
    );
    const leftElevation = renderToStaticMarkup(
      <ElevationView model={model} side="left" width={500} height={320} showSteel visibility={{ ...onlyGlass, sheets: false }} />,
    );
    expect(elevation).not.toContain("#f1c877");
    expect(elevation).not.toContain("#ed806c");
    expect(rearElevation).not.toContain("#49c2a7");
    expect(rearElevation).not.toContain("#8494a5");
    expect(leftElevation).not.toContain("#49c2a7");
    expect(leftElevation).not.toContain("#8494a5");

    const section = renderToStaticMarkup(
      <SectionView model={model} width={500} height={320} visibility={{ ...onlyGlass, sheets: false }} />,
    );
    expect(section).not.toContain("#49c2a7");
    expect(section).not.toContain("#e4a747");
    expect(section).not.toContain("#80aee0");
    expect(section).not.toContain("#ed806c");

    const withFixings = renderToStaticMarkup(
      <Axonometric model={model} showSheets showSteel width={500} height={320} yaw={0} tilt={58} visibility={DEFAULT_COMPONENT_VISIBILITY} />,
    );
    const noFixings = renderToStaticMarkup(
      <Axonometric model={model} showSheets showSteel width={500} height={320} yaw={0} tilt={58} visibility={{ ...DEFAULT_COMPONENT_VISIBILITY, fixings: false }} />,
    );
    expect((noFixings.match(/<circle/g) ?? []).length).toBeLessThan(
      (withFixings.match(/<circle/g) ?? []).length,
    );

    const noGlass = renderToStaticMarkup(
      <Axonometric model={model} showSheets showSteel width={500} height={320} yaw={0} tilt={58} visibility={{ ...DEFAULT_COMPONENT_VISIBILITY, sheets: false }} />,
    );
    expect(noGlass).not.toContain('fill="#ed806c"');
  });

  test("toggling overlays off still renders", () => {
    const model = buildModel(DEFAULT_DESIGN);
    const axon = renderToStaticMarkup(
      <Axonometric
        model={model}
        showSheets={false}
        showSteel={false}
        width={500}
        height={320}
        yaw={0}
        tilt={58}
      />,
    );
    expect(axon).toContain("<svg");
    const plan = renderToStaticMarkup(
      <PlanView model={model} width={500} height={320} showSheets={false} showFrame={false} />,
    );
    expect(plan).toContain("<svg");
  });

  test("doors open without breaking the plan", () => {
    const model = buildModel({ ...DEFAULT_DESIGN, doorOpen: 1 });
    expect(model.doors).toHaveLength(4);
    const plan = renderToStaticMarkup(
      <PlanView model={model} width={500} height={320} showSheets showFrame />,
    );
    expect(plan).toContain("<svg");
  });
});