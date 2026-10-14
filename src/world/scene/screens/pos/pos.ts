import { stepRandom } from "../random";
import { POS_STRINGS } from "./strings";

/** A menu item: seed price (rupiah) and portion stock with its low-stock minimum (null stock = not a portion item). */
export interface MenuItem {
  price: number;
  stock: number | null;
  min: number;
}

/** The six cards of the "Input Order" page in menu order, with the POS seed prices (spec §5.2). Names: strings.ts. */
export const MENU: readonly MenuItem[] = [
  { price: 30000, stock: 12, min: 5 }, // Grilled Chicken Piece (Variant)
  { price: 50000, stock: 6, min: 3 }, // Combo A (1 pax) (Combo)
  { price: 35000, stock: 5, min: 4 }, // Chicken Tauco Soup
  { price: 25000, stock: 9, min: 4 }, // Smashed Beef Empal
  { price: 10000, stock: null, min: 0 }, // Steamed Rice
  { price: 8000, stock: null, min: 0 }, // Iced Tea (Variant)
];
export const TABLE_COUNT = 9;
export const OCCUPIED: readonly number[] = [2, 7];
/** Seconds the payment confirmation stays up (input is ignored meanwhile). */
export const PAY_SECONDS = 1.6;
/** Idle demo: seconds between added items, the pause after paying, and the order size it pays at. */
export const AUTO_ADD_GAP = 1.3;
export const AUTO_PAY_GAP = 2.4;
export const AUTO_PAY_AT = 4;
export const POS_LOGICAL = { w: 640, h: 400 } as const;

export interface PosLine {
  item: number;
  qty: number;
}

export interface PosPayment {
  total: number;
  table: number;
  /** The confirmation shows while t < until. */
  until: number;
}

export interface PosState {
  /** Portions left per menu item (null = not a portion item). */
  stock: readonly (number | null)[];
  /** The open order, in the order items were first added. */
  lines: readonly PosLine[];
  table: number;
  payment: PosPayment | null;
  /** Clock time of the next idle-demo step. */
  next: number;
  /** Seed of the demo's picks (stepRandom). */
  seed: number;
}

export type StockBadge = { tone: "ok" | "low" | "out"; text: string } | null;

export function initPos(now: Date): PosState {
  return {
    stock: MENU.map((m) => m.stock),
    lines: [],
    table: 4,
    payment: null,
    next: 0,
    seed: Math.floor(now.getTime() / 1000) >>> 0,
  };
}

export function qtyOf(s: PosState, item: number): number {
  return s.lines.find((l) => l.item === item)?.qty ?? 0;
}

/** Portions still free to order: stock minus what the open order already holds (Infinity for non-portion items). */
export function portionsLeft(s: PosState, item: number): number {
  const stock = s.stock[item];
  return stock === null ? Infinity : Math.max(0, stock - qtyOf(s, item));
}

/** The card's stock badge: green count, amber "N left" below the minimum, red "Sold out"; null without portion stock. */
export function stockBadge(s: PosState, item: number): StockBadge {
  if (s.stock[item] === null) return null;
  const left = portionsLeft(s, item);
  if (left <= 0) return { tone: "out", text: POS_STRINGS.soldOut };
  return left < MENU[item].min ? { tone: "low", text: POS_STRINGS.left(left) } : { tone: "ok", text: String(left) };
}

export function addItem(s: PosState, item: number): PosState {
  if (!Number.isInteger(item) || item < 0 || item >= MENU.length || portionsLeft(s, item) <= 0) return s;
  const has = s.lines.some((l) => l.item === item);
  const lines = has
    ? s.lines.map((l) => (l.item === item ? { item, qty: l.qty + 1 } : l))
    : [...s.lines, { item, qty: 1 }];
  return { ...s, lines };
}

export function selectTable(s: PosState, n: number): PosState {
  if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT || OCCUPIED.includes(n) || n === s.table) return s;
  return { ...s, table: n };
}

export function orderCount(s: PosState): number {
  return s.lines.reduce((a, l) => a + l.qty, 0);
}

export function subtotal(s: PosState): number {
  return s.lines.reduce((a, l) => a + MENU[l.item].price * l.qty, 0);
}

/** Commits the order: stock drops (never below 0), the order clears, the confirmation shows for PAY_SECONDS. */
export function payOrder(s: PosState, t: number): PosState {
  if (s.lines.length === 0) return s;
  const sold = s.stock.map((v, i) => (v === null ? null : Math.max(0, v - qtyOf(s, i))));
  // the shift restocks once every portion item is below its minimum, so the demo never runs dry
  const allLow = MENU.every((m, i) => {
    const v = sold[i];
    return v === null || v < m.min;
  });
  return {
    ...s,
    stock: allLow ? MENU.map((m) => m.stock) : sold,
    lines: [],
    payment: { total: subtotal(s), table: s.table, until: t + PAY_SECONDS },
  };
}

export function paying(s: PosState, t: number): boolean {
  return s.payment !== null && t < s.payment.until;
}

/** Visitor taps: "add" (arg = menu index), "table" (arg = table number), "pay". Ignored while the confirmation shows. */
export function actPos(s: PosState, action: string, arg: number | undefined, t: number): PosState {
  if (paying(s, t)) return s;
  if (action === "add" && arg !== undefined) return addItem(s, arg);
  if (action === "table" && arg !== undefined) return selectTable(s, arg);
  if (action === "pay") return payOrder(s, t);
  return s;
}

/** Idle demo: a random addable item every AUTO_ADD_GAP s, Pay once the order holds AUTO_PAY_AT items. */
export function autoPos(s: PosState, t: number): PosState | null {
  if (t < s.next || paying(s, t)) return null;
  if (orderCount(s) >= AUTO_PAY_AT) return { ...payOrder(s, t), next: t + AUTO_PAY_GAP };
  const open = MENU.map((_, i) => i).filter((i) => portionsLeft(s, i) > 0);
  if (open.length === 0) return s.lines.length > 0 ? { ...payOrder(s, t), next: t + AUTO_PAY_GAP } : null;
  const r = stepRandom(s.seed);
  return { ...addItem(s, open[Math.floor(r.value * open.length)]), seed: r.seed, next: t + AUTO_ADD_GAP };
}

/** Animating while the confirmation shows, plus a moment after so it is drawn away. */
export function busyPos(s: PosState, t: number): boolean {
  return s.payment !== null && t < s.payment.until + 0.2;
}
