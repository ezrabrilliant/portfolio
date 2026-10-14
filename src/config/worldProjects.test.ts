import { describe, expect, it } from "vitest";
import { milestones, worldProjects } from "./portfolio";

const byId = Object.fromEntries(worldProjects.map((p) => [p.id, p]));

describe("worldProjects content for the star islands", () => {
  it("has the four star islands", () => {
    expect(worldProjects.filter((p) => p.tier === "star").map((p) => p.id).sort()).toEqual(["ezra-bot", "gtid", "orbit-store", "petak-umpet"]);
  });
  it("carries the real numbers", () => {
    expect(byId.gtid.stats).toEqual(["2,600 visitors / day", "16,000+ items"]);
    expect(byId["petak-umpet"].stats).toEqual(["3.1M+ visits", "2.6K peak players"]);
    expect(byId["orbit-store"].stats).toEqual(["2,200+ orders", "890+ buyers"]);
    expect(byId["ezra-bot"].stats).toEqual(["1,000+ members"]);
  });
  it("has the signpost links", () => {
    expect(byId.gtid.links.demo).toBe("https://gtid.pro");
    expect(byId["petak-umpet"].links.roblox).toBe("https://www.roblox.com/games/91179701802837/Petak-Umpet");
    expect(byId["orbit-store"].links).toEqual({ demo: "https://orbit.ezrabrilliant.com" });
    expect(byId["ezra-bot"].links.discord).toBe("https://discord.com/oauth2/authorize?client_id=1127105994766426122");
  });
});

describe("worldProjects content for the Web & Apps minis", () => {
  const minis = worldProjects.filter((p) => p.tier === "mini");

  it("has exactly the three web minis, in chain order", () => {
    expect(minis.map((p) => p.id)).toEqual(["pos-monosuko", "bee-furniture-crm", "pedulipasal"]);
    expect(minis.every((p) => p.district === "web")).toBe(true);
  });
  it("carries the board copy: title, line, year and tags", () => {
    expect(minis.map((p) => [p.title, p.year, p.tags])).toEqual([
      ["POS Monosuko", 2026, ["React", "Express", "MySQL"]],
      ["Bee Furniture CRM", 2025, ["React", "PostgreSQL"]],
      ["PeduliPasal", 2024, ["Kotlin", "TensorFlow", "Gemini"]],
    ]);
    expect(byId["pos-monosuko"].line).toBe("A point-of-sale for a grilled-chicken restaurant: orders, tables, bills and portion stock.");
    expect(byId["bee-furniture-crm"].line).toBe("A CRM for a furniture maker: customers, products, sales and promos in one dashboard.");
    expect(byId.pedulipasal.line).toBe("An Android chatbot that names the article of Indonesian criminal law that fits a described offence.");
  });
  it("shows no stats (no testing figures for Monosuko)", () => {
    for (const p of minis) expect(p.stats, p.id).toBeUndefined();
  });
  it("keeps the demo links inactive until the demo builds ship; PeduliPasal links its APK release", () => {
    expect(byId["pos-monosuko"].links).toEqual({ demo: "" });
    expect(byId["bee-furniture-crm"].links).toEqual({ demo: "" });
    expect(byId.pedulipasal.links).toEqual({ demo: "https://github.com/aliefauzan/Bangkit-Project-PeduliPasal/releases/tag/1.5.3" });
  });
});

describe("milestones", () => {
  it("are the three education years, the last one the graduation", () => {
    expect(milestones).toEqual([
      { year: 2022, title: "Started Business Information Systems", line: "Petra Christian University" },
      { year: 2024, title: "Bangkit Academy", line: "Mobile Development, graduated with Distinction" },
      { year: 2026, title: "Graduated", line: "Business Information Systems, Petra Christian University", moment: "graduation" },
    ]);
  });
  it("never use the old 'top graduate' wording", () => {
    for (const m of milestones) expect(`${m.title} ${m.line}`).not.toMatch(/top (graduate|student)/i);
  });
});
