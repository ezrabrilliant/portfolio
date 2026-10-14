import { describe, expect, it, vi } from "vitest";
import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { FakeImage, fakeCtx } from "./testing/fakeCtx";
import { addItem, initPos, payOrder } from "./pos/pos";
import { posApp } from "./pos";
import { initCrm, recordSale } from "./crm/crm";
import { crmApp } from "./crm";

vi.stubGlobal("Image", FakeImage);

const NOW = new Date(2026, 9, 14, 9, 0, 0);

/** fakeCtx, recording every font the draw sets. */
function recordingCtx() {
  const fonts = new Set<string>();
  const g = fakeCtx();
  const ctx = new Proxy(g, {
    set: (target, key, value) => {
      if (key === "font") fonts.add(String(value));
      return Reflect.set(target, key, value);
    },
  });
  return { ctx, fonts };
}

/** The family list after "<weight> <size>px ". */
const family = (font: string) => font.replace(/^(\d+ )?\d+(\.\d+)?px /, "");

describe("canvas font stacks of the POS and CRM screens", () => {
  it("draw only in the fonts the world loads (no Inter first: it is never loaded, so it showed only where installed)", () => {
    const { ctx, fonts } = recordingCtx();
    posApp.draw(ctx, initPos(NOW), 0);
    posApp.draw(ctx, payOrder(addItem(addItem(initPos(NOW), 0), 5), 1), 1);
    crmApp.draw(ctx, initCrm(NOW), 0);
    crmApp.draw(ctx, recordSale(initCrm(NOW), 2), 1);
    expect(fonts.size).toBeGreaterThan(0);
    for (const f of fonts) {
      expect(f, f).not.toMatch(/Inter/);
      // the screens' text is the self-hosted grotesk; the CRM's bee is an emoji font
      if (!/Emoji/.test(f)) expect(family(f), f).toBe(CANVAS_FONTS.ui);
    }
  });
});
