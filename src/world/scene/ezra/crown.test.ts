import { describe, expect, it } from "vitest";
import { MODEL_TOP } from "@/world/engine/physics/character";
import { EZRA_HEAD } from "@/world/engine/physics/ezraModel";
import { CROWN } from "./crown";

describe("gold crown", () => {
  it("stays under the model's top (the mortarboard's), so every head-clearance rule still holds", () => {
    const top = EZRA_HEAD.pivot + CROWN.y + CROWN.band / 2 + CROWN.prong;
    expect(top).toBeLessThanOrEqual(MODEL_TOP + 1e-9);
  });
});
