/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { fitPointsStable } from "./draw";

describe("stable axonometric fit", () => {
  test("keeps the same scale and centers the model while the camera rotates", () => {
    const points = [
      { x: -4, y: -3, z: 0 },
      { x: 4, y: -3, z: 0 },
      { x: 4, y: 3, z: 4 },
      { x: -4, y: 3, z: 4 },
    ];
    const initial = fitPointsStable(points, -38, 58, 500, 320, 64);
    const rotated = fitPointsStable(points, 140, 24, 500, 320, 64);

    expect(rotated.scale).toBe(initial.scale);
    expect(rotated.project({ x: 0, y: 0, z: 2 })).toEqual({ x: 250, y: 160 });
  });
});
