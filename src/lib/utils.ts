import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Metres -> "8,500mm" style dimension string used all over the drawings. */
export function mm(metres: number, dp = 0): string {
  const v = metres * 1000;
  return `${v.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}mm`;
}

/** Bare millimetre number, grouped, no unit suffix. */
export function mmNum(metres: number, dp = 0): string {
  return (metres * 1000)
    .toFixed(dp)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function metres(m: number, dp = 2): string {
  return `${m.toFixed(dp)} m`;
}

export function deg(radians: number, dp = 1): string {
  return `${((radians * 180) / Math.PI).toFixed(dp)}\u00b0`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Round to a sane increment so dragging a slider snaps to real-world units. */
export function snap(v: number, step: number): number {
  return Math.round(v / step) * step;
}
