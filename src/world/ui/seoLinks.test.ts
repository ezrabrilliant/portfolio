import { describe, expect, it } from "vitest";
import { seoLink } from "./seoLinks";

describe("seoLink", () => {
  it("keeps the label of an https link and opens it in a new tab", () => {
    expect(seoLink("demo", "https://gtid.pro", "GTID")).toEqual({ href: "https://gtid.pro", label: "Visit GTID", external: true });
    expect(seoLink("roblox", "https://www.roblox.com/games/1/x", "Petak Umpet")?.label).toBe("Play on Roblox Petak Umpet");
    expect(seoLink("discord", "https://discord.com/x", "Ezra Bot")?.label).toBe("Discord Ezra Bot");
    expect(seoLink("github", "https://github.com/x/y", "Sample")?.label).toBe("Source code Sample");
  });
  it("labels a site path 'Try' and keeps it in the same tab", () => {
    expect(seoLink("demo", "/demo/monosuko/", "POS Monosuko")).toEqual({ href: "/demo/monosuko/", label: "Try POS Monosuko", external: false });
  });
  it("drops empty links (inactive signs) and anything that is not a site link", () => {
    expect(seoLink("demo", "", "Bee Furniture CRM")).toBeNull();
    expect(seoLink("demo", undefined, "Bee Furniture CRM")).toBeNull();
    expect(seoLink("demo", "//evil.dev", "X")).toBeNull();
    expect(seoLink("demo", "http://x.dev", "X")).toBeNull();
  });
});
