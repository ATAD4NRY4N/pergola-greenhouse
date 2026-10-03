/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Axonometric } from "../components/views/Axonometric";
import { PlanView } from "../components/views/PlanView";
import { ElevationView, SectionView } from "../components/views/ElevationView";
import { DoorDetailView } from "../components/views/DoorDetailView";
import { ChecksPanel } from "../components/panels";
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

      const left = renderToStaticMarkup(
        <ElevationView
          model={model}
          side="right"
          width={640}
          height={360}
          showSteel
        />,
      );
      expect(left).toContain("<svg");

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
  test("renders the leaf, trolley hanger, SHS junction and U-channel trim details", () => {
    const model = buildModel({ ...DEFAULT_DESIGN, frontDoors: 1, rightDoors: 0 });
    const html = renderToStaticMarkup(
      <DoorDetailView model={model} width={900} height={620} />,
    );
    expect(html).toContain('aria-label="Single sliding door and enlarged connection details"');
    expect(html).toContain("COMPLETE LEAF");
    expect(html).toContain("HANGER + TRACK");
    expect(html).toContain("SHS-TO-PURLIN JUNCTION");
    expect(html).toContain("aluminium U-channel");
    expect(html).toContain("U-CHANNEL-CAPTURED 4-WHEEL TROLLEY");
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
        onYaw={() => {}}
        onTilt={() => {}}
        onReset={() => {}}
      />,
    );
    expect(html).toContain('aria-label="Spin"');
    expect(html).toContain('aria-label="Tilt"');
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

  test("the axonometric honours a tilt change", () => {
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
        tilt={80}
      />,
    );
    expect(flat).not.toBe(steep);
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
    expect(elevation).not.toContain("#f1c877");
    expect(elevation).not.toContain("#ed806c");

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