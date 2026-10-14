import { describe, expect, it, vi } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { islandTitle } from "@/world/scene/islands/shared/project";
import { hitAt } from "../types";
import { fakeCtx } from "../testing/fakeCtx";
import { LABEL_CHAR_W, MAP_AREA, MAP_BUTTONS, buildMapModel, initialCursor, mapKeyButton, mapRegions, projectTopDown, stepIsland } from "./mapModel";
import { mapApp } from "./index";

const layout = buildLayout(worldProjects);
const NOW = new Date(2026, 9, 14, 9, 0, 0);
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("map model", () => {
  const model = buildMapModel(layout, "gtid");

  it("has every island of the layout, in tour order, named like the rest of the world", () => {
    expect(model.islands.map((i) => i.id)).toEqual(layout.tourOrder);
    for (const i of model.islands) expect(i.name).toBe(islandTitle(i.id));
  });

  it("reads like the tour: each next stop further right, and further from the tour camera means higher up", () => {
    const xs = model.islands.map((i) => i.c.x);
    for (let k = 1; k < xs.length; k++) expect(xs[k], layout.tourOrder[k]).toBeGreaterThan(xs[k - 1]);
    const byId = Object.fromEntries(layout.islands.map((p) => [p.id, p]));
    const v = (id: string) => projectTopDown({ x: byId[id].origin.x + 0.5, z: byId[id].origin.z + 0.5 }).v;
    const c = (id: string) => model.islands.find((i) => i.id === id)!.c;
    for (const [a, b] of [["orbit-store", "petak-umpet"], ["gtid", "hero"]] as const) {
      expect(v(a)).toBeGreaterThan(v(b));
      expect(c(a).y).toBeLessThan(c(b).y);
    }
  });

  it("gives every island one hit region that travels there, none overlapping, all inside the map area", () => {
    const regions = model.islands.map((i) => i.region);
    regions.forEach((r, i) => {
      expect(r.action).toBe("go");
      expect(r.arg).toBe(i);
      expect(r.x).toBeGreaterThanOrEqual(MAP_AREA.x);
      expect(r.y).toBeGreaterThanOrEqual(MAP_AREA.y);
      expect(r.x + r.w).toBeLessThanOrEqual(MAP_AREA.x + MAP_AREA.w);
      expect(r.y + r.h).toBeLessThanOrEqual(MAP_AREA.y + MAP_AREA.h);
      expect(r.w).toBeGreaterThanOrEqual(8);
      for (let j = i + 1; j < regions.length; j++) expect(overlaps(r, regions[j]), `${model.islands[i].id} vs ${model.islands[j].id}`).toBe(false);
      for (const b of Object.values(MAP_BUTTONS)) expect(overlaps(r, b)).toBe(false);
    });
  });

  it("keeps every name inside the map area and clear of every other name", () => {
    const boxes = model.islands.map((i) => {
      const w = i.name.length * LABEL_CHAR_W;
      return { id: i.id, x0: i.label.x - w / 2, x1: i.label.x + w / 2, y0: i.label.y - 9, y1: i.label.y + 2 };
    });
    for (const [k, b] of boxes.entries()) {
      expect(b.x0, b.id).toBeGreaterThanOrEqual(MAP_AREA.x);
      expect(b.x1, b.id).toBeLessThanOrEqual(MAP_AREA.x + MAP_AREA.w);
      expect(b.y0, b.id).toBeGreaterThanOrEqual(MAP_AREA.y);
      expect(b.y1, b.id).toBeLessThanOrEqual(MAP_AREA.y + MAP_AREA.h);
      for (const o of boxes.slice(k + 1)) expect(b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1, `${b.id} vs ${o.id}`).toBe(false);
    }
  });

  it("marks the board's own island as here, for every island", () => {
    for (const [i, id] of layout.tourOrder.entries()) expect(buildMapModel(layout, id).here).toBe(i);
  });

  it("draws one line per crossing, with its kind", () => {
    expect(model.links.map((l) => l.kind)).toEqual(layout.crossings.map((c) => c.kind));
  });

  it("steps the cursor in tour order, wrapping, and starts it on the next stop", () => {
    const last = model.islands.length - 1;
    expect(stepIsland(model, 0, -1)).toBe(last);
    expect(stepIsland(model, last, 1)).toBe(0);
    expect(initialCursor(model)).toBe(model.here + 1);
    expect(initialCursor(buildMapModel(layout, layout.tourOrder[last]))).toBe(0);
  });

  it("maps the arrow keys and Enter to the button bar", () => {
    expect(mapKeyButton("ArrowLeft")).toBe("prev");
    expect(mapKeyButton("ArrowUp")).toBe("prev");
    expect(mapKeyButton("ArrowRight")).toBe("next");
    expect(mapKeyButton("ArrowDown")).toBe("next");
    expect(mapKeyButton("Enter")).toBe("go");
    expect(mapKeyButton("NumpadEnter")).toBe("go");
    expect(mapKeyButton("KeyW")).toBeNull();
  });
});

describe("mapApp", () => {
  it("is a 480 × 300 board whose taps on an island travel to it", () => {
    const travel = vi.fn();
    const app = mapApp(layout, "hero", travel);
    expect(app.logical).toEqual({ w: 480, h: 300 });
    const model = buildMapModel(layout, "hero");
    const regions = app.draw(fakeCtx(), app.init(NOW), 0);
    expect(regions).toEqual(mapRegions(model));
    for (const isl of model.islands) {
      const r = hitAt(regions, isl.c.x, isl.c.y);
      expect(r?.action, isl.id).toBe("go");
      app.act(app.init(NOW), r!.action, r!.arg, 0);
      expect(travel).toHaveBeenLastCalledWith(isl.id);
    }
    expect(travel).toHaveBeenCalledTimes(model.islands.length);
  });

  it("moves the cursor with ‹ › and the arrow keys, and Enter or 'Travel to' goes to the cursor island", () => {
    const travel = vi.fn();
    const app = mapApp(layout, "hero", travel);
    const s0 = app.init(NOW);
    expect(s0.cursor).toBe(1);
    const s1 = app.key!(s0, "ArrowRight", 0)!;
    expect(s1.cursor).toBe(2);
    expect(app.key!(s1, "ArrowLeft", 0)!.cursor).toBe(1);
    expect(app.act(s1, "prev", undefined, 0).cursor).toBe(1);
    expect(app.act(s1, "next", undefined, 0).cursor).toBe(3);
    expect(app.key!(s1, "KeyQ", 0)).toBeNull();
    expect(travel).not.toHaveBeenCalled();
    expect(app.key!(s1, "Enter", 0)).toEqual(s1);
    expect(travel).toHaveBeenLastCalledWith(layout.tourOrder[2]);
    app.act(s1, "go", undefined, 0);
    expect(travel).toHaveBeenLastCalledWith(layout.tourOrder[2]);
    const goCentre = { x: MAP_BUTTONS.go.x + MAP_BUTTONS.go.w / 2, y: MAP_BUTTONS.go.y + MAP_BUTTONS.go.h / 2 };
    expect(hitAt(app.draw(fakeCtx(), s1, 0), goCentre.x, goCentre.y)?.action).toBe("go");
  });

  it("never animates or runs an idle demo", () => {
    const app = mapApp(layout, "gtid", () => undefined);
    const s = app.init(NOW);
    expect(app.busy(s, 5)).toBe(false);
    expect(app.auto(s, 5)).toBeNull();
  });
});
