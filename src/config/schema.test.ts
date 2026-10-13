import { describe, expect, it } from "vitest";
import { DISTRICTS, validateProjects, type WorldProject } from "@/config/schema";
import { worldCopy, worldProjects } from "@/config/portfolio";

const base: WorldProject = {
  id: "sample-app", title: "Sample", year: 2025, line: "A sample app.", tags: ["React"],
  district: "web", tier: "mini", links: {},
};

describe("validateProjects", () => {
  it("accepts the shipped world projects", () => {
    expect(validateProjects(worldProjects)).toEqual([]);
  });

  it("ships the four star projects in tour order", () => {
    expect(worldProjects.map((p) => p.id)).toEqual(["gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    expect(worldProjects.every((p) => p.tier === "star")).toBe(true);
    expect(worldCopy.heroName).toBe("Ezra Brilliant");
  });

  it("flags duplicate ids", () => {
    const issues = validateProjects([base, { ...base }]);
    expect(issues).toContainEqual({ id: "sample-app", message: "duplicate id" });
  });

  it("flags non-slug ids, unknown districts and bad tiers", () => {
    const bad = { ...base, id: "Bad Id", district: "space", tier: "huge" } as unknown as WorldProject;
    const messages = validateProjects([bad]).map((i) => i.message);
    expect(messages).toContain("id must be a lowercase slug");
    expect(messages).toContain('unknown district "space"');
    expect(messages).toContain('tier must be "star" or "mini"');
  });

  it("flags empty title/line and impossible years", () => {
    const messages = validateProjects([{ ...base, title: " ", line: "", year: 99 }]).map((i) => i.message);
    expect(messages).toContain("title is required");
    expect(messages).toContain("line is required");
    expect(messages).toContain("year must be a 4-digit year");
  });

  it("rejects process claims in the line (copy rule)", () => {
    const messages = validateProjects([{ ...base, line: "Solo developer, Dockerized end-to-end." }]).map((i) => i.message);
    expect(messages).toContain("line must describe the result, not the process");
  });

  it("requires https links but allows empty ones", () => {
    expect(validateProjects([{ ...base, links: { discord: "" } }])).toEqual([]);
    const messages = validateProjects([{ ...base, links: { demo: "http://x.dev" } }]).map((i) => i.message);
    expect(messages).toContain("links.demo must start with https://");
  });

  it("checks island template and accent format", () => {
    const bad = { ...base, island: { template: "castle", accent: "blue" } } as unknown as WorldProject;
    const messages = validateProjects([bad]).map((i) => i.message);
    expect(messages).toContain('unknown island template "castle"');
    expect(messages).toContain("island.accent must be #RRGGBB");
  });

  it("lists the three districts", () => {
    expect(DISTRICTS).toEqual(["game", "discord", "web"]);
  });
});
