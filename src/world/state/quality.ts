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

export function dprCap(q: "high" | "low"): number {
  return q === "high" ? 1.75 : 1.25;
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

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
