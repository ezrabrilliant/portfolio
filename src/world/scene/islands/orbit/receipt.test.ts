import { describe, expect, it } from "vitest";
import { FIRST_ORDER_NO, RECEIPT_ITEMS, nextOrder, receiptLines } from "./receipt";

const at = new Date(2026, 9, 13, 19, 42);

describe("Orbit receipt", () => {
  it("starts at #2201 and cycles the fictional items", () => {
    const o = nextOrder(null, at);
    expect(o.no).toBe(FIRST_ORDER_NO);
    expect(o.no).toBe(2201);
    expect(o.item).toBe(RECEIPT_ITEMS[0]);
    expect(nextOrder(2201, at).no).toBe(2202);
    expect(nextOrder(2204, at).item).toBe(RECEIPT_ITEMS[0]);
  });

  it("follows Orbit's real flow: order, QRIS paid, delivered by DM", () => {
    const texts = receiptLines(nextOrder(null, at)).map((l) => l.text);
    expect(texts).toEqual(
      expect.arrayContaining(["ORBIT STORE", "Order #2201", "Today at 19:42", "QRIS · paid", "delivered via DM"]),
    );
  });

  it("never shows money", () => {
    for (let n = 2200; n < 2210; n++) {
      for (const l of receiptLines(nextOrder(n, at))) expect(l.text).not.toMatch(/\brp\b|idr|rupiah|\d[.,]\d{3}/i);
    }
  });
});
