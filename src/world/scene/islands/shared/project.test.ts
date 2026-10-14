import { describe, expect, it } from "vitest";
import { islandTitle, projectById } from "./project";

describe("islandTitle", () => {
  it("names the hero, the Web & Apps plaza and every project island", () => {
    expect(islandTitle("hero")).toBe("Ezra Brilliant");
    expect(islandTitle("web-plaza")).toBe("Web & Apps");
    expect(islandTitle("orbit-store")).toBe("Orbit Store");
    expect(islandTitle("ezra-bot")).toBe("Ezra Bot");
    expect(islandTitle("pos-monosuko")).toBe("POS Monosuko");
    expect(islandTitle("pedulipasal")).toBe("PeduliPasal");
  });
  it("falls back to the id for an unknown island", () => {
    expect(islandTitle("nope")).toBe("nope");
  });
});

describe("projectById", () => {
  it("finds a project and throws for an unknown id", () => {
    expect(projectById("bee-furniture-crm").title).toBe("Bee Furniture CRM");
    expect(() => projectById("nope")).toThrow("Unknown world project: nope");
  });
});
