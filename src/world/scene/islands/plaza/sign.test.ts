import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { projectsAheadLine } from "./sign";

const isle = (id: string, kind: IslandPlacement["kind"], district: IslandPlacement["district"]) =>
  ({ id, kind, district, origin: { x: 0, y: 0, z: 0 }, radius: 4, depth: 3, seed: 1 }) as IslandPlacement;

describe("projectsAheadLine (the plaza sign under WEB & APPS)", () => {
  it("counts the Web & Apps minis chained from the plaza in the live layout", () => {
    const islands = buildLayout(worldProjects).islands;
    const minis = islands.filter((i) => i.kind === "mini" && i.district === "web").length;
    expect(minis).toBe(3);
    expect(projectsAheadLine(islands)).toBe("Three projects ahead");
  });

  it("follows the count: a fourth mini reads Four, one reads One project", () => {
    const base = [isle("hero", "hero", "hero"), isle("web-plaza", "hub", "web"), isle("gtid", "star", "game")];
    const minis = (n: number) => Array.from({ length: n }, (_, i) => isle(`m${i}`, "mini", "web"));
    expect(projectsAheadLine([...base, ...minis(4)])).toBe("Four projects ahead");
    expect(projectsAheadLine([...base, ...minis(1)])).toBe("One project ahead");
    expect(projectsAheadLine([...base, ...minis(14)])).toBe("14 projects ahead");
  });

  it("does not count minis of other districts, stars or the plaza itself", () => {
    const islands = [isle("web-plaza", "hub", "web"), isle("a", "mini", "web"), isle("b", "mini", "game"), isle("c", "star", "web")];
    expect(projectsAheadLine(islands)).toBe("One project ahead");
  });
});
