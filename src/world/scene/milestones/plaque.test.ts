import { describe, expect, it } from "vitest";
import { milestones } from "@/config/portfolio";
import { PLAQUE, plaqueRows } from "./plaque";

describe("milestone plaques", () => {
  it("fit every configured milestone inside the slab, rows within their character limits", () => {
    for (const m of milestones) {
      const r = plaqueRows(m);
      expect(r.height, `${m.year}`).toBeLessThanOrEqual(PLAQUE.h);
      for (const row of r.title) expect(row.length, row).toBeLessThanOrEqual(PLAQUE.titleChars);
      for (const row of r.line) expect(row.length, row).toBeLessThanOrEqual(PLAQUE.lineChars);
      expect(r.title.join(" ")).toBe(m.title);
      expect(r.line.join(" ")).toBe(m.line);
    }
  });

  it("stacks year, title and line top to bottom", () => {
    const r = plaqueRows(milestones[2]);
    expect(r.line).toEqual(["Business Information", "Systems, Petra Christian", "University"]);
    expect(r.yearY).toBeLessThan(r.titleY[0]);
    expect(r.titleY[r.titleY.length - 1]).toBeLessThan(r.lineY[0]);
  });
});
