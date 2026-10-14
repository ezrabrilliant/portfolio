import { describe, expect, it } from "vitest";
import { worldProjects } from "./portfolio";

const byId = Object.fromEntries(worldProjects.map((p) => [p.id, p]));

describe("worldProjects content for the star islands", () => {
  it("has exactly the four star islands", () => {
    expect(worldProjects.map((p) => p.id).sort()).toEqual(["ezra-bot", "gtid", "orbit-store", "petak-umpet"]);
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
