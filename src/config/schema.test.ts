import { describe, expect, it } from "vitest";
import { DISTRICTS, isSiteLink, validateMilestones, validateProjects, type Milestone, type WorldProject } from "@/config/schema";
import { milestones, worldCopy, worldProjects } from "@/config/portfolio";

const base: WorldProject = {
  id: "sample-app", title: "Sample", year: 2025, line: "A sample app.", tags: ["React"],
  district: "web", tier: "mini", links: {},
};

describe("validateProjects", () => {
  it("accepts the shipped world projects", () => {
    expect(validateProjects(worldProjects)).toEqual([]);
  });

  it("ships the four stars in tour order, then the three web minis in chain order", () => {
    expect(worldProjects.map((p) => p.id)).toEqual([
      "gtid", "petak-umpet", "orbit-store", "ezra-bot", "pos-monosuko", "bee-furniture-crm", "pedulipasal",
    ]);
    expect(worldProjects.slice(0, 4).every((p) => p.tier === "star")).toBe(true);
    expect(worldProjects.slice(4).every((p) => p.tier === "mini" && p.district === "web")).toBe(true);
    expect(worldCopy.heroName).toBe("Ezra Brilliant");
    expect(worldCopy.webDistrict).toBe("Web & Apps");
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

  it("accepts https links, site paths and empty links; rejects anything else", () => {
    expect(validateProjects([{ ...base, links: { discord: "" } }])).toEqual([]);
    expect(validateProjects([{ ...base, links: { demo: "/demo/monosuko/", github: "https://github.com/x/y" } }])).toEqual([]);
    for (const demo of ["http://x.dev", "//evil.dev/x", "demo/monosuko/", "javascript:alert(1)"]) {
      const messages = validateProjects([{ ...base, links: { demo } }]).map((i) => i.message);
      expect(messages, demo).toContain("links.demo must be an https:// URL or a site path starting with one /");
    }
  });

  it("checks the island accent format", () => {
    const messages = validateProjects([{ ...base, island: { accent: "blue" } }]).map((i) => i.message);
    expect(messages).toContain("island.accent must be #RRGGBB");
    expect(validateProjects([{ ...base, island: { accent: "#1f7a4d" } }])).toEqual([]);
  });

  it("lists the three districts", () => {
    expect(DISTRICTS).toEqual(["game", "discord", "web"]);
  });
});

describe("isSiteLink", () => {
  it("accepts https URLs and paths that start with exactly one slash", () => {
    for (const url of ["https://gtid.pro", "https://github.com/a/b/releases/tag/1.5.3", "/demo/monosuko/", "/demo/bee/", "/"]) {
      expect(isSiteLink(url), url).toBe(true);
    }
  });
  it("rejects http, protocol-relative, relative, script and whitespace links", () => {
    for (const url of ["", "http://x.dev", "https://", "//evil.dev", "demo/bee/", "javascript:alert(1)", "/demo bee/", "https://a b"]) {
      expect(isSiteLink(url), url).toBe(false);
    }
  });
});

describe("validateMilestones", () => {
  it("accepts the shipped milestones", () => {
    expect(validateMilestones(milestones)).toEqual([]);
  });

  const ok: Milestone[] = [
    { year: 2022, title: "Started", line: "A university" },
    { year: 2026, title: "Graduated", line: "A university", moment: "graduation" },
  ];

  it("accepts ascending milestones with one graduation moment", () => {
    expect(validateMilestones(ok)).toEqual([]);
    expect(validateMilestones([])).toEqual([]);
  });

  it("flags years out of order, repeated or outside 2000–2100", () => {
    const messages = validateMilestones([ok[1], ok[0]]).map((i) => i.message);
    expect(messages).toContain("years must be in ascending order");
    expect(validateMilestones([ok[0], { ...ok[0] }]).map((i) => i.message)).toContain("years must be in ascending order");
    expect(validateMilestones([{ ...ok[0], year: 1999 }]).map((i) => i.message)).toContain("year must be a 4-digit year");
    expect(validateMilestones([{ ...ok[0], year: 2101 }]).map((i) => i.message)).toContain("year must be a 4-digit year");
    expect(validateMilestones([{ ...ok[0], year: 2024.5 }]).map((i) => i.message)).toContain("year must be a 4-digit year");
  });

  it("requires a title and a line", () => {
    const issues = validateMilestones([{ year: 2024, title: " ", line: "" }]);
    expect(issues).toContainEqual({ id: "milestone 2024", message: "title is required" });
    expect(issues).toContainEqual({ id: "milestone 2024", message: "line is required" });
  });

  it("rejects process claims (copy rule)", () => {
    const messages = validateMilestones([{ year: 2024, title: "Solo capstone", line: "Built end-to-end" }]).map((i) => i.message);
    expect(messages).toContain("milestone must describe the result, not the process");
  });

  it("allows at most one graduation moment and no unknown moments", () => {
    const two = validateMilestones([{ ...ok[1], year: 2025 }, ok[1]]);
    expect(two).toContainEqual({ id: "milestones", message: "at most one graduation moment" });
    const odd = { year: 2024, title: "Bangkit", line: "Mobile", moment: "party" } as unknown as Milestone;
    expect(validateMilestones([odd]).map((i) => i.message)).toContain('unknown moment "party"');
  });
});
