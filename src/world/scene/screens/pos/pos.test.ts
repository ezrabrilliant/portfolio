import { describe, expect, it } from "vitest";
import {
  AUTO_PAY_GAP,
  MENU,
  OCCUPIED,
  PAY_SECONDS,
  actPos,
  addItem,
  autoPos,
  busyPos,
  initPos,
  orderCount,
  payOrder,
  portionsLeft,
  selectTable,
  stockBadge,
  subtotal,
  type PosState,
} from "./pos";

const NOW = new Date(2026, 9, 14, 9, 0, 0);
const fresh = (): PosState => initPos(NOW);
const withStock = (stock: (number | null)[]): PosState => ({ ...fresh(), stock });
const addN = (s: PosState, item: number, n: number): PosState => {
  let out = s;
  for (let i = 0; i < n; i++) out = addItem(out, item);
  return out;
};
/** Every portion item exactly at its minimum. */
const atMinimum = () => withStock(MENU.map((m) => (m.stock === null ? null : m.min)));
const step = (s: PosState, t: number): PosState => {
  const next = autoPos(s, t);
  if (!next) throw new Error(`no demo step at t=${t}`);
  return next;
};

describe("POS stock badges", () => {
  it("shows the portions left in green at or above the item's minimum", () => {
    // Grilled Chicken Piece: 12 portions, minimum 5
    expect(stockBadge(fresh(), 0)).toEqual({ tone: "ok", text: "12" });
    expect(stockBadge(addN(fresh(), 0, 7), 0)).toEqual({ tone: "ok", text: "5" });
  });

  it("turns amber 'N left' below the minimum, counting what is already in the order", () => {
    expect(stockBadge(addN(fresh(), 0, 8), 0)).toEqual({ tone: "low", text: "4 left" });
  });

  it("turns red 'Sold out' at zero", () => {
    expect(stockBadge(addN(fresh(), 0, 12), 0)).toEqual({ tone: "out", text: "Sold out" });
  });

  it("has no badge for items without portion stock (rice, iced tea)", () => {
    expect(stockBadge(fresh(), 4)).toBeNull();
    expect(stockBadge(fresh(), 5)).toBeNull();
  });
});

describe("POS order", () => {
  it("adds items as order lines in the order they were first picked", () => {
    const s = addItem(addItem(addItem(fresh(), 3), 0), 3);
    expect(s.lines).toEqual([
      { item: 3, qty: 2 },
      { item: 0, qty: 1 },
    ]);
    expect(orderCount(s)).toBe(3);
    expect(subtotal(s)).toBe(2 * 25000 + 30000);
  });

  it("sold-out cards are not addable and the order never takes more than the stock", () => {
    const s = withStock([1, 6, 0, 9, null, null]);
    expect(addItem(s, 2)).toBe(s);
    const one = addItem(s, 0);
    expect(addItem(one, 0)).toBe(one);
    expect(portionsLeft(one, 0)).toBe(0);
    expect(portionsLeft(one, 4)).toBe(Infinity);
  });

  it("ignores unknown menu items", () => {
    const s = fresh();
    expect(addItem(s, -1)).toBe(s);
    expect(addItem(s, 6)).toBe(s);
    expect(actPos(s, "add", undefined, 0)).toBe(s);
  });

  it("selects a free table and ignores occupied or unknown ones", () => {
    const s = fresh();
    expect(selectTable(s, 5).table).toBe(5);
    expect(actPos(s, "table", 9, 0).table).toBe(9);
    for (const n of OCCUPIED) expect(selectTable(s, n)).toBe(s);
    expect(selectTable(s, 0)).toBe(s);
    expect(selectTable(s, 10)).toBe(s);
  });
});

describe("POS payment", () => {
  it("Pay clears the order, lowers the stock and confirms for PAY_SECONDS", () => {
    const s = addItem(addN(selectTable(fresh(), 5), 0, 2), 4);
    const paid = actPos(s, "pay", undefined, 10);
    expect(paid.lines).toEqual([]);
    expect(paid.stock).toEqual([10, 6, 5, 9, null, null]);
    expect(paid.payment).toEqual({ total: 2 * 30000 + 10000, table: 5, until: 10 + PAY_SECONDS });
    expect(busyPos(paid, 10 + PAY_SECONDS - 0.01)).toBe(true);
    expect(busyPos(paid, 10 + PAY_SECONDS + 0.3)).toBe(false);
  });

  it("does nothing with an empty order", () => {
    const s = fresh();
    expect(payOrder(s, 1)).toBe(s);
  });

  it("ignores input while the confirmation shows", () => {
    const paid = payOrder(addItem(fresh(), 0), 10);
    expect(actPos(paid, "add", 1, 10.5)).toBe(paid);
    expect(actPos(paid, "add", 1, 10 + PAY_SECONDS).lines).toEqual([{ item: 1, qty: 1 }]);
  });

  it("stock never goes negative", () => {
    const sold = payOrder(addN(withStock([2, 6, 5, 9, null, null]), 0, 3), 1);
    expect(sold.stock[0]).toBe(0);
    const forced = payOrder({ ...withStock([2, 6, 5, 9, null, null]), lines: [{ item: 0, qty: 5 }] }, 1);
    expect(forced.stock[0]).toBe(0);
  });

  it("restocks the shift once every portion item is below its minimum", () => {
    const s = [0, 1, 2, 3].reduce((acc, i) => addItem(acc, i), atMinimum());
    expect(payOrder(s, 1).stock).toEqual(MENU.map((m) => m.stock));
  });

  it("does not restock while any portion item is still at or above its minimum", () => {
    const s = [0, 1, 2].reduce((acc, i) => addItem(acc, i), atMinimum());
    expect(payOrder(s, 1).stock).toEqual([4, 2, 3, 4, null, null]);
  });
});

describe("POS idle demo", () => {
  it("adds an item per step and pays once four items are in", () => {
    let s = fresh();
    let t = 0;
    for (let i = 1; i <= 4; i++) {
      s = step(s, t);
      expect(orderCount(s)).toBe(i);
      t = s.next;
    }
    expect(autoPos(s, t - 0.01)).toBeNull();
    const paid = step(s, t);
    expect(paid.lines).toEqual([]);
    expect(paid.payment?.total).toBe(subtotal(s));
    expect(paid.next).toBe(t + AUTO_PAY_GAP);
    expect(autoPos(paid, t + 1)).toBeNull();
  });

  it("is deterministic for a seed and only picks addable items", () => {
    const run = () => {
      let s = withStock([0, 0, 0, 0, null, null]);
      let t = 0;
      for (let i = 0; i < 3; i++) {
        s = step(s, t);
        t = s.next;
      }
      return s.lines;
    };
    expect(run()).toEqual(run());
    for (const line of run()) expect([4, 5]).toContain(line.item);
  });
});
