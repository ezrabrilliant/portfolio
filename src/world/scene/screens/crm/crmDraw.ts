import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { formatRupiah, roundRect, wrapText } from "../format";
import type { HitRegion } from "../types";
import { CRM_LOGICAL, PULSE_SECONDS, chartMax, dayLabel, dueLabel, pulsing } from "./crm";
import type { CrmState } from "./crm";
import { CRM_STRINGS as S } from "./strings";

/** The real DashboardHome's palette (spec §5.3). */
const C = {
  indigo: "#4F46E5",
  active: "#3E37F7",
  activeBg: "#f5f5ff",
  page: "#f9fafb",
  heading: "#1F2937",
  card: "#4B5563",
  muted: "#6b7280",
  side: "#64748b",
  line: "#e5e7eb",
  divider: "#f0f0f0",
  white: "#ffffff",
  logout: "#ef4444",
  avatar: "#1E3A8A",
  fresh: "#10B981",
};
const KPI_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6"];
const TASK = { doneDot: "#28a745", pendingDot: "#ffc107", doneBg: "#d4edda", doneFg: "#155724", pendingBg: "#fff3cd", pendingFg: "#856404" };
/**
 * The site's self-hosted grotesk (canvasFonts), the same for every visitor. The app itself uses Inter, which the world
 * does not load: listing it first drew the screen in Inter only where it happened to be installed.
 */
const font = (weight: number, size: number) => `${weight} ${size}px ${CANVAS_FONTS.ui}`;
const EMOJI_FONT = '12px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const TAU = Math.PI * 2;
const CHART = { x: 132, y: 142, w: 326, h: 246 };
const TASKS = { x: 466, y: 142, w: 164, h: 246 };

/** A white card with the app's shadow (0 4px 12px rgba(0,0,0,.08); shadows are in canvas pixels). */
function card(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.save();
  g.shadowColor = "rgba(0,0,0,0.08)";
  g.shadowBlur = 12;
  g.shadowOffsetY = 4;
  g.fillStyle = C.white;
  roundRect(g, x, y, w, h, 6);
  g.fill();
  g.restore();
}

/** The admin dashboard (sketch part-bee.js beeLive.draw). */
export function drawCrm(g: CanvasRenderingContext2D, s: CrmState, t: number): HitRegion[] {
  const hits: HitRegion[] = [];
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.lineWidth = 1;
  g.setLineDash([]);
  g.fillStyle = C.page;
  g.fillRect(0, 0, CRM_LOGICAL.w, CRM_LOGICAL.h);
  sidebar(g);
  header(g);
  kpis(g, s, t);
  chart(g, s, t, hits);
  tasks(g, s, hits);
  return hits;
}

function sidebar(g: CanvasRenderingContext2D) {
  g.fillStyle = C.white;
  g.fillRect(0, 0, 120, CRM_LOGICAL.h);
  g.fillStyle = C.divider;
  g.fillRect(120, 0, 1, CRM_LOGICAL.h);
  // the indigo circle with the bee
  g.fillStyle = C.active;
  g.beginPath();
  g.arc(22, 22, 11, 0, TAU);
  g.fill();
  g.font = EMOJI_FONT;
  g.textAlign = "center";
  g.textBaseline = "middle";
  // colour emoji fonts ignore this; a monochrome one would draw the bee in the disc's own indigo
  g.fillStyle = C.white;
  g.fillText(S.logoEmoji, 22, 23);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = C.heading;
  g.font = font(700, 9.2);
  g.fillText(S.brand[0], 39, 20);
  g.fillText(S.brand[1], 39, 31);
  S.nav.forEach((label, i) => {
    const y = 50 + i * 20;
    const on = i === 0;
    if (on) {
      g.fillStyle = C.activeBg;
      g.fillRect(0, y, 120, 18);
      g.fillStyle = C.active;
      g.fillRect(0, y, 1.5, 18); // the app's 3 px bar at half scale
    }
    g.fillStyle = on ? C.active : C.side;
    g.font = font(on ? 600 : 500, 8.6);
    g.fillText(label, 16, y + 12);
  });
}

function header(g: CanvasRenderingContext2D) {
  g.fillStyle = C.white;
  g.fillRect(121, 0, 519, 34);
  g.fillStyle = C.line;
  g.fillRect(121, 34, 519, 1);
  g.fillStyle = C.heading;
  g.font = font(600, 10.5);
  g.fillText(S.header, 132, 21);
  g.font = font(600, 7.4);
  g.textAlign = "center";
  g.fillStyle = C.indigo;
  roundRect(g, 470, 9, 58, 16, 8);
  g.fill();
  g.fillStyle = C.white;
  g.fillText(S.addNew, 499, 20);
  g.fillStyle = C.logout;
  roundRect(g, 532, 9, 40, 16, 8);
  g.fill();
  g.fillStyle = C.white;
  g.fillText(S.logout, 552, 20);
  g.textAlign = "left";
  // search icon
  g.strokeStyle = C.muted;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(586, 16, 4, 0, TAU);
  g.moveTo(589, 19);
  g.lineTo(592, 22);
  g.stroke();
  g.lineWidth = 1;
  // avatar
  g.fillStyle = C.avatar;
  g.beginPath();
  g.arc(612, 17, 9, 0, TAU);
  g.fill();
  g.fillStyle = C.white;
  g.font = font(700, 7);
  g.textAlign = "center";
  g.fillText(S.avatar, 612, 19.5);
  g.textAlign = "left";
  // page title
  g.fillStyle = C.heading;
  g.font = font(700, 13.5);
  g.fillText(S.title, 132, 56);
  g.fillStyle = C.muted;
  g.font = font(400, 8);
  g.fillText(S.subtitle, 132, 68);
}

function kpis(g: CanvasRenderingContext2D, s: CrmState, t: number) {
  const values = [formatRupiah(s.revenue), String(s.customers), String(s.transactions), String(s.promos)];
  const fresh = pulsing(s, t);
  S.kpis.forEach((title, i) => {
    const x = 132 + i * 126;
    const y = 78;
    card(g, x, y, 118, 54);
    g.fillStyle = C.card;
    g.font = font(500, 7.6);
    g.fillText(title, x + 10, y + 15);
    g.fillStyle = `${KPI_COLORS[i]}1A`;
    g.beginPath();
    g.arc(x + 102, y + 14, 8, 0, TAU);
    g.fill();
    g.fillStyle = KPI_COLORS[i];
    g.beginPath();
    g.arc(x + 102, y + 14, 3, 0, TAU);
    g.fill();
    // revenue and transactions flash green right after a sale
    g.fillStyle = fresh && (i === 0 || i === 2) ? C.fresh : C.heading;
    g.font = font(700, i === 0 ? 13 : 15);
    g.fillText(values[i], x + 10, y + 42);
  });
}

function chart(g: CanvasRenderingContext2D, s: CrmState, t: number, hits: HitRegion[]) {
  const { x: cx, y: cy, w: cw, h: ch } = CHART;
  card(g, cx, cy, cw, ch);
  g.fillStyle = C.heading;
  g.font = font(600, 9.4);
  g.fillText(S.chartTitle, cx + 12, cy + 18);
  const px0 = cx + 62;
  const px1 = cx + cw - 14;
  const py0 = cy + 34;
  const py1 = cy + ch - 40;
  const max = chartMax(s.days);
  // dashed grid with the Rp axis
  g.setLineDash([3, 3]);
  g.strokeStyle = C.line;
  for (let k = 0; k <= 4; k++) {
    const y = py1 - (py1 - py0) * (k / 4);
    g.beginPath();
    g.moveTo(px0, y);
    g.lineTo(px1, y);
    g.stroke();
    g.fillStyle = C.muted;
    g.font = font(400, 6.4);
    g.textAlign = "right";
    g.fillText(formatRupiah(Math.round((max * k) / 4)), px0 - 4, y + 2);
    g.textAlign = "left";
  }
  g.setLineDash([]);
  const xs = s.days.map((_, i) => px0 + ((px1 - px0) * i) / 6);
  const ys = s.days.map((v) => py1 - (py1 - py0) * (v / max));
  g.strokeStyle = C.indigo;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i++) g.lineTo(xs[i], ys[i]);
  g.stroke();
  g.lineWidth = 1;
  for (let i = 0; i < xs.length; i++) {
    g.fillStyle = C.white;
    g.beginPath();
    g.arc(xs[i], ys[i], 2.6, 0, TAU);
    g.fill();
    g.strokeStyle = C.indigo;
    g.stroke();
    g.fillStyle = C.muted;
    g.font = font(400, 5.8);
    g.textAlign = "center";
    g.fillText(dayLabel(s, i), xs[i], py1 + 11);
    g.textAlign = "left";
  }
  // today's point pulses after a sale: a ring that grows and fades, never past the chart card's right edge (point is 14 in)
  if (pulsing(s, t)) {
    const k = (t - s.pulse) / PULSE_SECONDS;
    const reach = cx + cw - xs[6] - 1.5;
    g.strokeStyle = `rgba(79,70,229,${1 - k})`;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(xs[6], ys[6], 3 + (reach - 3) * k, 0, TAU);
    g.stroke();
    g.lineWidth = 1;
  }
  // legend
  g.strokeStyle = C.indigo;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(cx + cw / 2 - 52, cy + ch - 14);
  g.lineTo(cx + cw / 2 - 40, cy + ch - 14);
  g.stroke();
  g.lineWidth = 1;
  g.fillStyle = C.indigo;
  g.font = font(500, 7);
  g.fillText(S.legend, cx + cw / 2 - 36, cy + ch - 11.5);
  hits.push({ x: cx, y: cy, w: cw, h: ch, action: "sale" });
}

function tasks(g: CanvasRenderingContext2D, s: CrmState, hits: HitRegion[]) {
  const { x: tx, y: ty, w: tw, h: th } = TASKS;
  card(g, tx, ty, tw, th);
  g.fillStyle = C.heading;
  g.font = font(600, 9.4);
  g.fillText(S.tasksTitle, tx + 12, ty + 18);
  g.fillStyle = C.indigo;
  g.font = font(500, 7.2);
  g.textAlign = "right";
  g.fillText(S.viewAll, tx + tw - 10, ty + 18);
  g.textAlign = "left";
  s.tasks.forEach((task, i) => {
    const y = ty + 32 + i * 62;
    g.fillStyle = task.done ? TASK.doneDot : TASK.pendingDot;
    g.beginPath();
    g.arc(tx + 15, y + 8, 3, 0, TAU);
    g.fill();
    g.fillStyle = C.heading;
    g.font = font(500, 8);
    wrapText(g, S.tasks[i], tw - 36)
      .slice(0, 2)
      .forEach((row, j) => g.fillText(row, tx + 24, y + 11 + j * 10.5));
    g.fillStyle = C.muted;
    g.font = font(400, 6.6);
    g.fillText(S.due(dueLabel(s, task)), tx + 24, y + 36);
    const label = task.done ? S.completed : S.pending;
    g.font = font(600, 6.4);
    const bw = g.measureText(label).width + 10;
    g.fillStyle = task.done ? TASK.doneBg : TASK.pendingBg;
    roundRect(g, tx + 24, y + 41, bw, 11, 5.5);
    g.fill();
    g.fillStyle = task.done ? TASK.doneFg : TASK.pendingFg;
    g.fillText(label, tx + 29, y + 49);
    if (i < s.tasks.length - 1) {
      g.fillStyle = C.divider;
      g.fillRect(tx + 12, y + 58, tw - 24, 1);
    }
    hits.push({ x: tx, y, w: tw, h: 58, action: "task", arg: i });
  });
}
