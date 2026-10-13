import { describe, expect, it } from "vitest";
import { runtime } from "./runtime";

describe("runtime", () => {
  it("has a layout with the hero and the four star islands", () => {
    const ids = runtime.layout.islands.map((i) => i.id);
    for (const id of ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]) expect(ids).toContain(id);
  });

  it("islandById returns the placement and throws for unknown ids", () => {
    expect(runtime.islandById("gtid").id).toBe("gtid");
    expect(() => runtime.islandById("nope")).toThrow(/unknown island/);
  });

  it("puts killY below every island", () => {
    for (const i of runtime.layout.islands) expect(runtime.killY).toBeLessThan(i.origin.y - i.depth);
  });

  it("starts with Ezra seated, no ride, no world built yet", () => {
    expect(runtime.seated).toBe(true);
    expect(runtime.ride).toBeNull();
    expect(runtime.built).toBeNull();
  });
});
