import { describe, expect, it } from "vitest";
import { formatRupiah, roundRect, wrapText } from "./format";

describe("formatRupiah", () => {
  it("groups thousands with commas after 'Rp '", () => {
    expect(formatRupiah(30000)).toBe("Rp 30,000");
    expect(formatRupiah(4781000)).toBe("Rp 4,781,000");
    expect(formatRupiah(8000)).toBe("Rp 8,000");
    expect(formatRupiah(900)).toBe("Rp 900");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("rounds to whole rupiah and keeps the sign", () => {
    expect(formatRupiah(1249999.6)).toBe("Rp 1,250,000");
    expect(formatRupiah(-5000)).toBe("-Rp 5,000");
  });
});

describe("wrapText", () => {
  // 5 units per character, like the draw tests' fake context
  const ctx = { measureText: (s: string) => ({ width: s.length * 5 }) } as unknown as CanvasRenderingContext2D;

  it("breaks between words so no line is wider than maxW", () => {
    expect(wrapText(ctx, "Grilled Chicken Piece", 80)).toEqual(["Grilled Chicken", "Piece"]);
  });

  it("keeps an over-long word on its own line", () => {
    expect(wrapText(ctx, "a extraordinarily b", 40)).toEqual(["a", "extraordinarily", "b"]);
  });

  it("returns no lines for blank text", () => {
    expect(wrapText(ctx, "   ", 40)).toEqual([]);
  });
});

describe("roundRect", () => {
  it("draws one closed path with the radius clamped to half the shorter side", () => {
    const calls: unknown[][] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_target, key) => (...args: unknown[]) => {
          calls.push([key, ...args]);
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    roundRect(ctx, 0, 0, 10, 4, 6);
    expect(calls[0]).toEqual(["beginPath"]);
    expect(calls[1]).toEqual(["moveTo", 2, 0]);
    expect(calls.at(-1)).toEqual(["closePath"]);
  });
});
