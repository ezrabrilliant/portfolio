import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/world/engine/types";
import {
  CLOSEUP_FILL, CLOSEUP_GLIDE, CLOSEUP_HUD_PX, CLOSEUP_NEAR_MARGIN, clampPan, closeupExitCut, closeupNear, closeupPanLimit,
  closeupPans, closeupPose, closeupWeight, stepCloseupBlend,
} from "./closeup";

const FOV = 40; // the world camera's vertical fov (WorldCanvas, framing.ts TOUR_FOV)
const TAN = Math.tan((FOV * Math.PI) / 360);
const LANDSCAPE = 16 / 9;
const PHONE = 9 / 19.5;
const INSET_DESKTOP = CLOSEUP_HUD_PX / 720; // 1280 × 720
const INSET_PHONE = CLOSEUP_HUD_PX / 845; // 390 × 845
const POS = { w: 3.4, h: 2.125 }; // landscape screens (POS, CRM)
const CHAT = { w: 1.25, h: 2.708 }; // the PeduliPasal phone
const MAP = { w: 1.5, h: 0.9375 }; // a map board
const center: Vec3 = { x: 70, y: 9.4, z: 18 };
const normal: Vec3 = { x: Math.sin(0.4), y: 0, z: Math.cos(0.4) };

const sub = (a: Vec3, b: Vec3) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const unit = (a: Vec3) => {
  const l = Math.hypot(a.x, a.y, a.z);
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};
const cross = (a: Vec3, b: Vec3) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
/** World Y made perpendicular to `n` (unit), and the matching right vector up × n. */
const axes = (n: Vec3) => {
  const up = unit({ x: -n.y * n.x, y: 1 - n.y * n.y, z: -n.y * n.z });
  return { up, right: cross(up, n) };
};
const FACE = axes(normal);

/** The face's corners in NDC (−1..1, y up) as seen from a pose's camera looking at its target. */
function projectFace(pose: { camera: Vec3; target: Vec3 }, size: { w: number; h: number }, aspect: number) {
  const f = unit(sub(pose.target, pose.camera));
  const { up, right } = axes({ x: -f.x, y: -f.y, z: -f.z });
  const xs: number[] = [];
  const ys: number[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const p = {
        x: center.x + FACE.right.x * (sx * size.w) / 2 + FACE.up.x * (sy * size.h) / 2,
        y: center.y + FACE.right.y * (sx * size.w) / 2 + FACE.up.y * (sy * size.h) / 2,
        z: center.z + FACE.right.z * (sx * size.w) / 2 + FACE.up.z * (sy * size.h) / 2,
      };
      const v = sub(p, pose.camera);
      const depth = dot(v, f);
      xs.push(dot(v, right) / (depth * TAN * aspect));
      ys.push(dot(v, up) / (depth * TAN));
    }
  }
  return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) };
}

describe("closeupPose", () => {
  it("fills at least 80 % of the frame without cropping wherever the target fits (no inset)", () => {
    for (const [size, aspect] of [[POS, LANDSCAPE], [CHAT, LANDSCAPE], [MAP, LANDSCAPE], [CHAT, PHONE]] as const) {
      const box = projectFace(closeupPose(center, normal, size, aspect, FOV), size, aspect);
      const h = (box.top - box.bottom) / 2;
      const w = (box.right - box.left) / 2;
      expect(Math.max(h, w)).toBeGreaterThanOrEqual(0.8);
      expect(h).toBeLessThanOrEqual(CLOSEUP_FILL.h + 1e-9);
      expect(w).toBeLessThanOrEqual(CLOSEUP_FILL.w + 1e-9);
    }
  });

  it("fits the height on a wide frame and the width of a portrait target too wide for a narrow one", () => {
    const pos = projectFace(closeupPose(center, normal, POS, LANDSCAPE, FOV), POS, LANDSCAPE);
    expect((pos.top - pos.bottom) / 2).toBeCloseTo(CLOSEUP_FILL.h, 6);
    const tall = { w: 1.25, h: 1.5 };
    const box = projectFace(closeupPose(center, normal, tall, PHONE, FOV), tall, PHONE);
    expect((box.right - box.left) / 2).toBeCloseTo(CLOSEUP_FILL.w, 6);
  });

  it("keeps the target below the HUD inset and centres it in the rest of the frame, at 16:9 and 9:19.5", () => {
    const cases = [
      [POS, LANDSCAPE, INSET_DESKTOP], [CHAT, LANDSCAPE, INSET_DESKTOP], [MAP, LANDSCAPE, INSET_DESKTOP],
      [POS, PHONE, INSET_PHONE], [CHAT, PHONE, INSET_PHONE], [MAP, PHONE, INSET_PHONE],
    ] as const;
    for (const [size, aspect, inset] of cases) {
      const box = projectFace(closeupPose(center, normal, size, aspect, FOV, undefined, { inset }), size, aspect);
      // the HUD covers NDC y 1 − 2 × inset .. 1
      expect(box.top, `${size.w} × ${size.h} at ${aspect.toFixed(2)}`).toBeLessThanOrEqual(1 - 2 * inset + 1e-9);
      expect(box.bottom).toBeGreaterThanOrEqual(-1);
      expect((box.top + box.bottom) / 2).toBeCloseTo(-inset, 9);
      if (!closeupPans(size, aspect)) {
        expect(box.left).toBeGreaterThanOrEqual(-1);
        expect(box.right).toBeLessThanOrEqual(1);
      }
    }
    // a height-bound target fills CLOSEUP_FILL.h of the free frame
    const pos = projectFace(closeupPose(center, normal, POS, LANDSCAPE, FOV, undefined, { inset: INSET_DESKTOP }), POS, LANDSCAPE);
    expect((pos.top - pos.bottom) / 2).toBeCloseTo(CLOSEUP_FILL.h * (1 - INSET_DESKTOP), 9);
  });

  it("fits a landscape target by its height on a portrait viewport, and pans it edge to edge", () => {
    expect(closeupPans(POS, PHONE)).toBe(true);
    const view = { inset: INSET_PHONE };
    const centred = projectFace(closeupPose(center, normal, POS, PHONE, FOV, undefined, view), POS, PHONE);
    expect((centred.top - centred.bottom) / 2).toBeCloseTo(CLOSEUP_FILL.h * (1 - INSET_PHONE), 9);
    expect(centred.right).toBeGreaterThan(1); // wider than the frame: the visitor pans
    expect(centred.left + centred.right).toBeCloseTo(0, 9); // starts centred
    const limit = closeupPanLimit(POS, PHONE, FOV, INSET_PHONE);
    expect(limit).toBeGreaterThan(0);
    const right = projectFace(closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: limit }), POS, PHONE);
    expect(right.right).toBeCloseTo(1, 9);
    const left = projectFace(closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: -limit }), POS, PHONE);
    expect(left.left).toBeCloseTo(-1, 9);
    // a pan past the limit stops at the edge
    expect(closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: limit + 5 })).toEqual(
      closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: limit }),
    );
  });

  it("keeps portrait targets on the fit-both rule: no pan on any viewport, none for a landscape target on a wide one", () => {
    expect(closeupPans(CHAT, PHONE)).toBe(false);
    expect(closeupPans(POS, LANDSCAPE)).toBe(false);
    expect(closeupPanLimit(CHAT, PHONE, FOV, INSET_PHONE)).toBe(0);
    expect(closeupPanLimit(POS, LANDSCAPE, FOV, INSET_DESKTOP)).toBe(0);
    expect(closeupPose(center, normal, CHAT, PHONE, FOV, undefined, { inset: INSET_PHONE, pan: 1 })).toEqual(
      closeupPose(center, normal, CHAT, PHONE, FOV, undefined, { inset: INSET_PHONE }),
    );
  });

  it("looks square on along the normal, with the look target in the face's plane", () => {
    for (const view of [{}, { inset: INSET_PHONE, pan: 0.4 }]) {
      const { camera, target } = closeupPose(center, normal, POS, PHONE, FOV, undefined, view);
      const back = unit(sub(camera, target));
      expect(dot(back, normal)).toBeCloseTo(1, 9);
      expect(dot(sub(target, center), normal)).toBeCloseTo(0, 9);
    }
    expect(closeupPose(center, normal, POS, LANDSCAPE, FOV).target).toEqual(center);
  });

  it("normalises a normal that is not unit length", () => {
    const a = closeupPose(center, normal, POS, LANDSCAPE, FOV, undefined, { inset: INSET_DESKTOP }).camera;
    const b = closeupPose(center, { x: normal.x * 5, y: 0, z: normal.z * 5 }, POS, LANDSCAPE, FOV, undefined, { inset: INSET_DESKTOP }).camera;
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
    expect(b.z).toBeCloseTo(a.z, 9);
  });

  it("fills and returns `out` when given one", () => {
    const out = { camera: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
    expect(closeupPose(center, normal, POS, LANDSCAPE, FOV, out)).toBe(out);
    expect(out.target).toEqual(center);
  });

  it("clamps a pan to ±limit", () => {
    expect(clampPan(2, 0.5)).toBe(0.5);
    expect(clampPan(-2, 0.5)).toBe(-0.5);
    expect(clampPan(0.2, 0.5)).toBe(0.2);
    expect(clampPan(0.2, 0)).toBe(0);
  });
});

describe("closeupNear", () => {
  it("eases the near plane from its default to just in front of the face, never below the default", () => {
    expect(closeupNear(0.1, 3.4, 0)).toBe(0.1);
    expect(closeupNear(0.1, 3.4, 1)).toBeCloseTo(3.4 - CLOSEUP_NEAR_MARGIN, 9);
    expect(closeupNear(0.1, 0.2, 1)).toBe(0.1);
    expect(closeupNear(0.1, -2, 1)).toBe(0.1);
    let prev = 0;
    for (let w = 0; w <= 1; w += 0.1) {
      const near = closeupNear(0.1, 9.4, w);
      expect(near).toBeGreaterThanOrEqual(prev);
      expect(near).toBeLessThanOrEqual(9.4 - CLOSEUP_NEAR_MARGIN);
      prev = near;
    }
  });
});

describe("closeup blend", () => {
  it("glides in over CLOSEUP_GLIDE seconds and back out", () => {
    let k = 0;
    for (let i = 0; i < 10; i++) k = stepCloseupBlend(k, true, CLOSEUP_GLIDE / 10, false);
    expect(k).toBeCloseTo(1, 9);
    expect(stepCloseupBlend(1, true, 0.1, false)).toBe(1);
    expect(stepCloseupBlend(1, false, CLOSEUP_GLIDE / 2, false)).toBeCloseTo(0.5, 9);
    expect(stepCloseupBlend(0.01, false, 0.1, false)).toBe(0);
  });

  it("cuts under reduced motion", () => {
    expect(stepCloseupBlend(0, true, 0.016, true)).toBe(1);
    expect(stepCloseupBlend(1, false, 0.016, true)).toBe(0);
  });

  it("eases the weight: starts and lands softly and never goes back", () => {
    expect(closeupWeight(0)).toBe(0);
    expect(closeupWeight(1)).toBe(1);
    expect(closeupWeight(0.5)).toBeCloseTo(0.5, 9);
    expect(closeupWeight(0.1)).toBeLessThan(0.1);
    let prev = 0;
    for (let k = 0.05; k <= 1; k += 0.05) {
      expect(closeupWeight(k)).toBeGreaterThanOrEqual(prev);
      prev = closeupWeight(k);
    }
    expect(closeupWeight(-1)).toBe(0);
    expect(closeupWeight(2)).toBe(1);
  });
});

describe("closeupExitCut", () => {
  it("cuts the base camera on the one frame a closeup ends, under reduced motion", () => {
    const last = { open: false };
    expect(closeupExitCut(last, false, true)).toBe(false); // nothing open
    expect(closeupExitCut(last, true, true)).toBe(false); // opened: CloseupCamera cuts in by itself
    expect(closeupExitCut(last, true, true)).toBe(false); // still open
    expect(closeupExitCut(last, false, true)).toBe(true); // just ended
    expect(closeupExitCut(last, false, true)).toBe(false); // only that frame
  });

  it("never cuts with full motion (the follow camera's ease is part of the glide back), but still tracks the edge", () => {
    const last = { open: false };
    expect(closeupExitCut(last, true, false)).toBe(false);
    expect(closeupExitCut(last, false, false)).toBe(false);
    expect(last.open).toBe(false);
    // the edge was consumed: turning reduced motion on afterwards does not cut late
    expect(closeupExitCut(last, false, true)).toBe(false);
  });
});
