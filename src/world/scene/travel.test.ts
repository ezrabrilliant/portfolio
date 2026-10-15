import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ scrollToIsland: vi.fn(), closeCloseup: vi.fn() }));
vi.mock("./tour/scrollToIsland", () => ({ scrollToIsland: mocks.scrollToIsland }));
vi.mock("./closeupState", () => ({ closeCloseup: mocks.closeCloseup }));

import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { buildWorld } from "@/world/engine/worldBuild";
import { islandTop } from "./islands/types";
import { TRAVEL_IN, TRAVEL_OUT, arrivalSpot, startTravel, stepTravel, travelFade } from "./travel";

const standOn = (id: string) => {
  const p = runtime.islandById(id);
  Object.assign(runtime.player.pos, { x: p.origin.x + 0.5, y: p.origin.y + 1, z: p.origin.z + 0.5 });
};

describe("startTravel", () => {
  beforeEach(() => {
    mocks.scrollToIsland.mockClear();
    mocks.closeCloseup.mockClear();
    runtime.travel = null;
    useWorld.setState({ mode: "tour" });
  });

  it("Tour: closes the closeup and scrolls to the island's stop", () => {
    startTravel("orbit-store");
    expect(mocks.closeCloseup).toHaveBeenCalledOnce();
    expect(mocks.scrollToIsland).toHaveBeenCalledWith("orbit-store", "map");
    expect(runtime.travel).toBeNull();
  });

  it("Play: closes the closeup and starts the puff-away phase toward the island", () => {
    useWorld.setState({ mode: "play" });
    standOn("hero");
    startTravel("pedulipasal");
    expect(mocks.closeCloseup).toHaveBeenCalledOnce();
    expect(mocks.scrollToIsland).not.toHaveBeenCalled();
    expect(runtime.travel).toEqual({ to: "pedulipasal", phase: "out", t: 0 });
  });

  it("Play: ignores a second pick while travelling", () => {
    useWorld.setState({ mode: "play" });
    standOn("hero");
    startTravel("gtid");
    startTravel("orbit-store");
    expect(runtime.travel?.to).toBe("gtid");
    expect(mocks.closeCloseup).toHaveBeenCalledOnce();
  });

  it("Play: the island Ezra already stands on is a no-op that leaves the map open (\"You are here\", Enter on it)", () => {
    useWorld.setState({ mode: "play" });
    standOn("hero");
    startTravel("hero");
    expect(runtime.travel).toBeNull();
    expect(mocks.closeCloseup).not.toHaveBeenCalled();
    expect(mocks.scrollToIsland).not.toHaveBeenCalled();
  });

  it("Tour: the island in view still closes the map and re-centres on its stop", () => {
    standOn("hero");
    startTravel("hero");
    expect(mocks.closeCloseup).toHaveBeenCalledOnce();
    expect(mocks.scrollToIsland).toHaveBeenCalledWith("hero", "map");
  });

  it("ignores ids that are not islands", () => {
    startTravel("nope");
    expect(mocks.closeCloseup).not.toHaveBeenCalled();
    expect(mocks.scrollToIsland).not.toHaveBeenCalled();
  });
});

describe("stepTravel", () => {
  it("vanishes on the first step, arrives when the out phase ends, and is done after the in phase", () => {
    const tr = { phase: "out" as "out" | "in", t: 0 };
    const events: string[] = [];
    for (let k = 0; k < 60 && events[events.length - 1] !== "done"; k++) {
      const e = stepTravel(tr, 1 / 60);
      if (e) events.push(e);
    }
    expect(events).toEqual(["vanish", "arrive", "done"]);
  });

  it("still vanishes first when one frame is longer than the whole out phase", () => {
    const tr = { phase: "out" as "out" | "in", t: 0 };
    expect(stepTravel(tr, 1)).toBe("vanish");
    expect(stepTravel(tr, 1)).toBe("arrive");
    expect(stepTravel(tr, 1)).toBe("done");
  });

  it("fades the screen to black just before the move and back after it", () => {
    expect(travelFade({ phase: "out", t: 0.05 })).toBe(0);
    expect(travelFade({ phase: "out", t: TRAVEL_OUT })).toBe(1);
    expect(travelFade({ phase: "in", t: 0 })).toBe(1);
    expect(travelFade({ phase: "in", t: TRAVEL_IN })).toBe(0);
  });
});

describe("arrivalSpot", () => {
  const built = buildWorld(runtime.layout);
  it("lands on open grass of the island, feet on its walking surface, facing away from the stop's camera", () => {
    for (const id of ["gtid", "pedulipasal"]) {
      const island = runtime.islandById(id);
      const top = islandTop(island);
      const camera = { x: top.x - 4, y: top.y + 6, z: top.z + 12 };
      const { pos, heading } = arrivalSpot(built.grid.isSolid, island, { camera, target: top });
      expect(pos.y).toBe(island.origin.y + 1);
      expect(built.grid.isSolid(Math.floor(pos.x), island.origin.y, Math.floor(pos.z))).toBe(true);
      expect(built.grid.isSolid(Math.floor(pos.x), island.origin.y + 1, Math.floor(pos.z))).toBe(false);
      expect(Math.hypot(pos.x - top.x, pos.z - top.z)).toBeLessThan(island.radius);
      expect(heading).toBeCloseTo(Math.atan2(pos.x - camera.x, pos.z - camera.z), 9);
    }
  });
});
