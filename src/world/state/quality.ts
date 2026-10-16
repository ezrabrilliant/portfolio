export interface DeviceInfo {
  width: number;
  height: number;
  cores: number;
  coarsePointer: boolean;
  saveData: boolean;
}

export function pickQuality(d: DeviceInfo): "high" | "low" {
  if (d.saveData) return "low";
  if (d.cores <= 4) return "low";
  if (d.coarsePointer && Math.min(d.width, d.height) < 700) return "low";
  return "high";
}

/** The pixel ratio to render at: the screen's own, capped by the tier (a number fixes it exactly, so never above the screen's). */
export function dprCap(q: "high" | "low", device: number = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1): number {
  return Math.min(device, q === "high" ? 1.75 : 1.25);
}

/** The pixel ratio while frames run slow: 1 on the high tier, below it on the low tier (fewer pixels to fill). */
export function slowDpr(q: "high" | "low"): number {
  return q === "high" ? 1 : 0.8;
}

export function readDevice(): DeviceInfo {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    cores: navigator.hardwareConcurrency || 8,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    saveData: nav.connection?.saveData === true,
  };
}

/** Probes for WebGL on a throwaway canvas, then releases that context (browsers cap live WebGL contexts). */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
