import { stepRandom } from "../random";

/*
 * EXAMPLE DATA, not real figures. The KPI seeds are the CRM's seed-database values as its dashboard shows them; the
 * 7-day series is made of the seed products' prices (Rp 1,250,000 / 950,000 / 175,000).
 */
export const SEED_KPIS = { revenue: 4781000, customers: 3, transactions: 6, promos: 2 } as const;
export const PRODUCT_PRICES: readonly number[] = [1250000, 950000, 175000];
/** Oldest first; index 6 is today. */
export const SEED_DAYS: readonly number[] = [175000, 0, 950000, 1250000, 0, 1425000, 175000];
/** A sale that would take today's total past this moves the series on a day first. */
export const DAY_CAP = 3600000;
/** Idle demo: seconds between sales. */
export const SALE_GAP = 3.2;
/** Seconds the new point pulses and the raised KPIs show green. */
export const PULSE_SECONDS = 1.2;
export const CRM_LOGICAL = { w: 640, h: 400 } as const;

export interface CrmTask {
  /** Days from today (negative = past). */
  due: number;
  done: boolean;
}

export const SEED_TASKS: readonly CrmTask[] = [
  { due: 0, done: false }, // Prepare the monthly report: due today, pending
  { due: 2, done: false }, // Check ergonomic chair stock: due in 2 days, pending
  { due: -7, done: true }, // Follow up with customer Budi: last week, completed
];

export interface CrmState {
  /** Local date of `now` at init (m is 0-based, as Date uses it). */
  today: { y: number; m: number; d: number };
  revenue: number;
  customers: number;
  transactions: number;
  promos: number;
  /** Seven daily totals, oldest first; index 6 is today. */
  days: readonly number[];
  tasks: readonly CrmTask[];
  /** Clock time of the latest sale (-Infinity before the first). */
  pulse: number;
  /** Clock time of the next idle-demo sale. */
  next: number;
  /** Seed of the product picks (stepRandom). */
  seed: number;
}

export function initCrm(now: Date): CrmState {
  return {
    today: { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() },
    revenue: SEED_KPIS.revenue,
    customers: SEED_KPIS.customers,
    transactions: SEED_KPIS.transactions,
    promos: SEED_KPIS.promos,
    days: [...SEED_DAYS],
    tasks: SEED_TASKS.map((task) => ({ ...task })),
    pulse: -Infinity,
    next: 0,
    seed: Math.floor(now.getTime() / 1000) >>> 0,
  };
}

/** A sale of one seed product: revenue, transactions and today's point rise by its price, and the point pulses. */
export function recordSale(s: CrmState, t: number): CrmState {
  const r = stepRandom(s.seed);
  const price = PRODUCT_PRICES[Math.floor(r.value * PRODUCT_PRICES.length)];
  const today = s.days[6];
  const days = today + price > DAY_CAP ? [...s.days.slice(1), price] : [...s.days.slice(0, 6), today + price];
  return { ...s, revenue: s.revenue + price, transactions: s.transactions + 1, days, pulse: t, seed: r.seed };
}

export function toggleTask(s: CrmState, i: number): CrmState {
  if (!Number.isInteger(i) || i < 0 || i >= s.tasks.length) return s;
  return { ...s, tasks: s.tasks.map((task, k) => (k === i ? { ...task, done: !task.done } : task)) };
}

/** Visitor taps: "sale" (the chart card), "task" (arg = task index). */
export function actCrm(s: CrmState, action: string, arg: number | undefined, t: number): CrmState {
  if (action === "sale") return recordSale(s, t);
  if (action === "task" && arg !== undefined) return toggleTask(s, arg);
  return s;
}

export function autoCrm(s: CrmState, t: number): CrmState | null {
  if (t < s.next) return null;
  return { ...recordSale(s, t), next: t + SALE_GAP };
}

export function busyCrm(s: CrmState, t: number): boolean {
  return t < s.pulse + PULSE_SECONDS;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const dateAt = (s: CrmState, offset: number) => new Date(s.today.y, s.today.m, s.today.d + offset);

/** The chart's date under point `index` (6 = today): "YYYY-MM-DD", local calendar. */
export function dayLabel(s: CrmState, index: number): string {
  const d = dateAt(s, index - 6);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** A task's due date as the app writes it: "Oct 14, 2026". */
export function dueLabel(s: CrmState, task: CrmTask): string {
  const d = dateAt(s, task.due);
  return `${MONTHS[d.getMonth()]} ${pad2(d.getDate())}, ${d.getFullYear()}`;
}

/** Top of the chart's axis: at least Rp 1,500,000, in Rp 500,000 steps. */
export function chartMax(days: readonly number[]): number {
  return Math.max(1500000, Math.ceil(Math.max(...days) / 500000) * 500000);
}
