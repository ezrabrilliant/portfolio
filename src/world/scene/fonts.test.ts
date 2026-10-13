import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FONT_URLS } from "./fonts";

describe("FONT_URLS", () => {
  for (const [name, url] of Object.entries(FONT_URLS)) {
    it(`${name} points at a real WOFF file in public/`, () => {
      const bytes = readFileSync(resolve(process.cwd(), "public" + url));
      expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOFF");
      expect(bytes.length).toBeGreaterThan(5000);
    });
  }
});
