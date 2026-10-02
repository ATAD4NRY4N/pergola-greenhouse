/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Axonometric } from "../components/views/Axonometric";
import { PlanView } from "../components/views/PlanView";
import { ElevationView, SectionView } from "../components/views/ElevationView";
import { ChecksPanel } from "../components/panels";
import { Landing } from "../pages/Landing";
import { Designer } from "../components/Designer";
import { XyzPad, OrbitControls } from "../components/ViewControls";
import { DEFAULT_DESIGN, buildModel, type Design } from "./model";

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
      baySpacing: 3.4,
    },
  ],
  ["no doors", { frontDoors: 0, rightDoors: 0 }],
  ["low eaves", { eaveLeft: 2.4, eaveRight: 2.7 }],
  [
    "flat roof, low bays",
    { eaveLeft: 2.5, eaveRight: 2.5, baySpacing: 3.5, roofPurlinSpacing: 1.4 },
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