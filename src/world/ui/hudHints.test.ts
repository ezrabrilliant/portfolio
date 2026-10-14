import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLOSEUP_HUD_PX } from "@/world/engine/camera/closeup";
import { HINTS, promptPill } from "./hudHints";

/**
 * The hint line's box, read from world.css itself (the base .hud-hint rule and its small-phone rule), so these budgets
 * follow the stylesheet: a change there that breaks them fails here.
 */
const css = readFileSync(new URL("../world.css", import.meta.url), "utf8");
function rule(re: RegExp, what: string): string {
  const m = css.match(re);
  if (!m) throw new Error(`world.css: ${what} not found`);
  return m[1];
}
function num(body: string, re: RegExp, what: string): number[] {
  const m = body.match(re);
  if (!m) throw new Error(`world.css .hud-hint: ${what} not found`);
  return m.slice(1).map(Number);
}
const base = rule(/^\.hud-hint \{([^}]*)\}/m, "the .hud-hint rule");
const [smallMax, smallBody] = (() => {
  const m = css.match(/@media \(max-width: (\d+)px\) \{\s*\.hud-hint \{([^}]*)\}/);
  if (!m) throw new Error("world.css: the small-phone .hud-hint rule not found");
  return [Number(m[1]), m[2]] as const;
})();
const [barTop, belowBar] = num(base, /top: calc\(max\((\d+)px, env\(safe-area-inset-top\)\) \+ (\d+)px\)/, "top");
const [fontPx, lineHeight] = num(base, /font: \d+ (\d+(?:\.\d+)?)px\/(\d+(?:\.\d+)?)/, "font size / line height");
const [padY, padX] = num(base, /padding: (\d+)px (\d+)px/, "padding");
const [gutters] = num(base, /max-width: calc\(100% - (\d+)px\)/, "max-width");
const [smallFontPx] = num(smallBody, /font-size: (\d+(?:\.\d+)?)px/, "small-phone font-size");
const [smallPadY, smallPadX] = num(smallBody, /padding: (\d+)px (\d+)px/, "small-phone padding");
/** SF Mono and Droid Sans Mono, the phones' monospace: every glyph advances 0.6 em. */
const MONO_ADVANCE = 0.6;
/** Characters of one line at viewport width `vw` (border-box: the max-width takes the padding in). */
const fits = (vw: number, px: number, pad: number) => Math.floor((vw - gutters - 2 * pad) / (MONO_ADVANCE * px));
const closeupLines = [HINTS.touch.closeup, HINTS.touch.closeupPan];

describe("HUD hints against world.css's .hud-hint box", () => {
  it("is a border-box, so its max-width holds the padding", () => {
    expect(base).toMatch(/box-sizing: border-box/);
  });

  it("every touch line fits one line on a 360 px phone (the base rule)", () => {
    expect(smallMax).toBeLessThan(360);
    for (const line of Object.values(HINTS.touch)) expect(line.length, line).toBeLessThanOrEqual(fits(360, fontPx, padX));
  });

  it("a closeup's touch lines fit one line on a 320 px phone (the small-phone rule)", () => {
    expect(smallMax).toBeGreaterThanOrEqual(320);
    for (const line of closeupLines) expect(line.length, line).toBeLessThanOrEqual(fits(320, smallFontPx, smallPadX));
  });

  it("one hint line ends inside the band a closeup leaves free (CLOSEUP_HUD_PX), at both sizes", () => {
    expect(barTop + belowBar + fontPx * lineHeight + 2 * padY).toBeLessThanOrEqual(CLOSEUP_HUD_PX);
    expect(barTop + belowBar + smallFontPx * lineHeight + 2 * smallPadY).toBeLessThanOrEqual(CLOSEUP_HUD_PX);
  });

  it("has a line for every state on both kinds of device", () => {
    expect(Object.keys(HINTS.touch).sort()).toEqual(Object.keys(HINTS.keys).sort());
  });
});

describe("promptPill (the prompt at the bottom of the HUD)", () => {
  it("Play on a keyboard: the pill, with the E key cap", () => {
    expect(promptPill("play", false)).toEqual({ key: "E" });
  });

  it("Play on touch: no pill, the Use button beside the stick already shows the same label", () => {
    expect(promptPill("play", true)).toBeNull();
  });

  it("the tour: the pill without a key cap, on both kinds of device (a tap or click, or Enter on what Tab focused)", () => {
    expect(promptPill("tour", false)).toEqual({ key: null });
    expect(promptPill("tour", true)).toEqual({ key: null });
  });
});
