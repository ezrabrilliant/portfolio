import { describe, expect, it } from "vitest";
import { CHAIN_DIR, STAR_TOUR, WEB_PLAZA_ID, buildLayout } from "@/world/engine/gen/layout";
import { worldProjects } from "@/config/portfolio";
import type { TourStop } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";
import { islandFrame } from "./shared/local";
import { FRAMING, PORTRAIT_ASPECT, PORTRAIT_MIN_PITCH, PORTRAIT_YAW, TOUR_FOV, portraitFitPoints, portraitStop, tourStopFor } from "./framing";
import { defaultTourStop } from "./types";

const layout = buildLayout(worldProjects);

/** NDC of `pt` seen from `s` (fov TOUR_FOV, the given aspect); z = depth in front of the camera. */
function ndc(s: TourStop, pt: Vec3, aspect: number) {
  const f = { x: s.target.x - s.camera.x, y: s.target.y - s.camera.y, z: s.target.z - s.camera.z };
  const fl = Math.hypot(f.x, f.y, f.z);
  f.x /= fl; f.y /= fl; f.z /= fl;
  const rl = Math.hypot(f.z, f.x);
  const r = { x: -f.z / rl, y: 0, z: f.x / rl }; // forward × +Y
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const v = { x: pt.x - s.camera.x, y: pt.y - s.camera.y, z: pt.z - s.camera.z };
  const z = v.x * f.x + v.y * f.y + v.z * f.z;
  const t = Math.tan(((TOUR_FOV / 2) * Math.PI) / 180);
  return { x: (v.x * r.x + v.y * r.y + v.z * r.z) / (z * t * aspect), y: (v.x * u.x + v.y * u.y + v.z * u.z) / (z * t), z };
}

const dirOf = (s: TourStop) => {
  const d = Math.hypot(s.camera.x - s.target.x, s.camera.y - s.target.y, s.camera.z - s.target.z);
  return { x: (s.camera.x - s.target.x) / d, y: (s.camera.y - s.target.y) / d, z: (s.camera.z - s.target.z) / d, d };
};

describe("tour framing", () => {
  it("views every island from the +z side with the subject right of centre", () => {
    for (const p of layout.islands.filter((i) => layout.tourOrder.includes(i.id))) {
      const s = tourStopFor(p);
      const [fx, , fz] = islandFrame(p);
      expect(s.id).toBe(p.id);
      expect(s.camera.z).toBeGreaterThan(fz + 8);
      expect(s.target.x).toBeLessThan(fx); // looking left of the subject puts the subject right of centre
      const d = Math.hypot(s.camera.x - s.target.x, s.camera.y - s.target.y, s.camera.z - s.target.z);
      expect(d).toBeGreaterThan(10);
      expect(d).toBeLessThan(20);
    }
  });
  it("throws for an island without framing", () => {
    expect(() => tourStopFor({ ...layout.islands[0], id: "nope" })).toThrow("No framing for island nope");
  });
});

describe("the Web & Apps district continues the tour to the right", () => {
  /** Horizontal unit forward of a camera → target heading and its screen-right (−f.z, f.x). */
  const axes = (cam: readonly number[], target: readonly number[]) => {
    const fx = target[0] - cam[0], fz = target[2] - cam[2];
    const l = Math.hypot(fx, fz);
    return { f: { x: fx / l, z: fz / l }, r: { x: -fz / l, z: fx / l } };
  };

  it("lays the chain along the star framings' screen-right (the engine's CHAIN_DIR, within 3°)", () => {
    let x = 0, z = 0;
    for (const id of STAR_TOUR) {
      const { r } = axes(FRAMING[id].cam, FRAMING[id].target);
      x += r.x;
      z += r.z;
    }
    const off = Math.atan2(CHAIN_DIR.z, CHAIN_DIR.x) - Math.atan2(z, x);
    expect(Math.abs((off * 180) / Math.PI)).toBeLessThan(3);
  });

  it("moves the tour camera right from Ezra Bot to PeduliPasal, never mostly toward the viewer", () => {
    const ids = layout.tourOrder.slice(layout.tourOrder.indexOf("ezra-bot"));
    expect(ids).toEqual(["ezra-bot", WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm", "pedulipasal"]);
    const stop = (id: string) => tourStopFor(layout.islands.find((i) => i.id === id)!);
    for (let i = 0; i + 1 < ids.length; i++) {
      const a = stop(ids[i]), b = stop(ids[i + 1]);
      const { f, r } = axes([a.camera.x, 0, a.camera.z], [a.target.x, 0, a.target.z]);
      const dx = b.camera.x - a.camera.x, dz = b.camera.z - a.camera.z;
      const move = Math.hypot(dx, dz);
      const right = dx * r.x + dz * r.z;
      const toward = -(dx * f.x + dz * f.z);
      expect(right, `${ids[i]} → ${ids[i + 1]}`).toBeGreaterThan(0.5 * move);
      expect(toward, `${ids[i]} → ${ids[i + 1]}`).toBeLessThanOrEqual(0.4 * move);
    }
  });
});

describe("portrait tour framing", () => {
  const tourIslands = layout.islands.filter((i) => layout.tourOrder.includes(i.id));
  const cases: Array<[string, (p: (typeof tourIslands)[number]) => TourStop]> = [
    ["island framing", (p) => tourStopFor(p)],
    ["placeholder framing", (p) => defaultTourStop(p)],
  ];

  for (const [name, base] of cases) {
    it(`${name}: keeps the id, dwell and heading (+ the island's nudge), looks down at least 35°, and pulls the camera back`, () => {
      for (const p of tourIslands) {
        const b = base(p);
        const s = portraitStop(p, b);
        expect(s.id).toBe(b.id);
        expect(s.dwell).toBe(b.dwell);
        const db = dirOf(b), ds = dirOf(s);
        expect(Math.atan2(ds.x, ds.z)).toBeCloseTo(Math.atan2(db.x, db.z) + (PORTRAIT_YAW[p.id] ?? 0), 9);
        expect(Math.asin(ds.y)).toBeCloseTo(Math.max(PORTRAIT_MIN_PITCH, Math.asin(db.y)), 9);
        expect(PORTRAIT_MIN_PITCH).toBeCloseTo((35 * Math.PI) / 180, 9);
        expect(ds.d).toBeGreaterThan(db.d);
      }
    });

    it(`${name}: fits the whole island top and its props in a ${PORTRAIT_ASPECT} portrait frame, centred`, () => {
      for (const p of tourIslands) {
        const s = portraitStop(p, base(p));
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const pt of portraitFitPoints(p)) {
          const n = ndc(s, pt, PORTRAIT_ASPECT);
          expect(n.z).toBeGreaterThan(1);
          x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x);
          y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y);
        }
        // inside the frame with a margin, and the content box centred
        expect(Math.max(-x0, x1, -y0, y1), p.id).toBeLessThanOrEqual(0.92);
        expect(Math.abs(x0 + x1), p.id).toBeLessThan(0.02);
        expect(Math.abs(y0 + y1), p.id).toBeLessThan(0.02);
        // the island's width is what binds on a tall screen: it fills the frame across
        expect(x1 - x0, p.id).toBeGreaterThan(1.7);
        // the island's own centre column sits on the vertical centre line
        const [fx, fy, fz] = islandFrame(p);
        expect(Math.abs(ndc(s, { x: fx, y: fy, z: fz }, PORTRAIT_ASPECT).x), p.id).toBeLessThan(0.12);
      }
    });
  }

  it("fit points cover the island's real grass top, out past its nominal radius", () => {
    for (const p of tourIslands) {
      const [fx, , fz] = islandFrame(p);
      const reach = Math.max(...portraitFitPoints(p).map((q) => Math.hypot(q.x - fx, q.z - fz)));
      expect(reach).toBeGreaterThan(p.radius);
      expect(reach).toBeLessThan(p.radius * 1.2 + 1.5);
    }
  });
});
