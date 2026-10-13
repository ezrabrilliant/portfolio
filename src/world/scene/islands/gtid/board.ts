import type { GtidData } from "./types";
import { CANVAS_FONTS } from "../shared/canvasFonts";

export type BoardView = "chart" | "mods";
export interface BoardRow { label: string; buy: string; sell: string }
export interface BoardMod { name: string; status: string; online: boolean }
export interface BoardModel {
  view: BoardView;
  rows: BoardRow[];
  chart: { x: number; y: number }[];
  chartLow: string;
  chartHigh: string;
  mods: BoardMod[];
  moreMods: number;
  footer: string;
}

const thousands = new Intl.NumberFormat("en-US");

export function formatRp(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `Rp ${thousands.format(n)}` : "—";
}

export function normalizeSeries(points: readonly { t: string; v: number }[]): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs);
  const span = Math.max(...vs) - lo;
  return points.map((p, i) => ({
    x: points.length === 1 ? 0.5 : i / (points.length - 1),
    y: span === 0 ? 0.5 : (p.v - lo) / span,
  }));
}

const RANK: Record<string, number> = { Online: 0, Idle: 1, Undercover: 2 };

export function buildBoardModel(data: GtidData, view: BoardView, maxMods = 6): BoardModel {
  const vs = data.history.points.map((p) => p.v);
  const sorted = [...data.mods.online].sort((a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3));
  return {
    view,
    rows: [
      { label: "DL", buy: formatRp(data.price.buy), sell: formatRp(data.price.sell) },
      { label: "BGL", buy: formatRp(data.price.buyBgl), sell: formatRp(data.price.sellBgl) },
    ],
    chart: normalizeSeries(data.history.points),
    chartLow: vs.length ? formatRp(Math.min(...vs)) : "—",
    chartHigh: vs.length ? formatRp(Math.max(...vs)) : "—",
    mods: sorted.slice(0, maxMods).map((m) => ({ name: m.name, status: m.status.toLowerCase(), online: m.status === "Online" })),
    moreMods: Math.max(0, sorted.length - maxMods),
    footer: !data.live ? "Saved snapshot from gtid.pro" : data.stale ? "Last update from gtid.pro" : "Live from gtid.pro",
  };
}

const C = { bg: "#0C0C0C", card: "#141414", line: "#262626", text: "#F2F2F2", muted: "#8a8a8a", accent: "#FA5D19", online: "#4fbf6c", idle: "#e2a24a", hidden: "#6b6b6b" };

/** Draws the board in GTID's own dark theme (accent #FA5D19). Price info only: no offers, no trading UI. */
export function drawBoard(ctx: CanvasRenderingContext2D, m: BoardModel, w: number, h: number): void {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = C.accent;
  ctx.font = `700 54px ${CANVAS_FONTS.ui}`;
  ctx.fillText("GTID.", 48, 86);
  ctx.fillStyle = C.muted;
  ctx.font = `500 24px ${CANVAS_FONTS.mono}`;
  ctx.fillText("DL · BGL prices", 220, 82);

  const cols = [48, 300, 640];
  ctx.fillText("BUY", cols[1], 140);
  ctx.fillText("SELL", cols[2], 140);
  m.rows.forEach((r, i) => {
    const y = 196 + i * 62;
    ctx.fillStyle = C.text;
    ctx.font = `700 34px ${CANVAS_FONTS.ui}`;
    ctx.fillText(r.label, cols[0], y);
    ctx.font = `500 34px ${CANVAS_FONTS.mono}`;
    ctx.fillText(r.buy, cols[1], y);
    ctx.fillText(r.sell, cols[2], y);
  });

  const px = 40, py = 300, pw = w - 80, ph = h - 300 - 70;
  ctx.fillStyle = C.card;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);
  ctx.font = `500 22px ${CANVAS_FONTS.mono}`;

  if (m.view === "chart") {
    ctx.fillStyle = C.muted;
    ctx.fillText("DL · buy · 24 h", px + 20, py + 36);
    ctx.textAlign = "right";
    ctx.fillText(m.chartHigh, px + pw - 20, py + 36);
    ctx.fillText(m.chartLow, px + pw - 20, py + ph - 16);
    ctx.textAlign = "left";
    if (m.chart.length > 1) {
      const cx = px + 24, cy = py + 56, cw = pw - 48 - 140, ch = ph - 90;
      const at = (p: { x: number; y: number }): [number, number] => [cx + p.x * cw, cy + (1 - p.y) * ch];
      ctx.beginPath();
      m.chart.forEach((p, i) => {
        const [x, y] = at(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(cx + cw, cy + ch);
      ctx.lineTo(cx, cy + ch);
      ctx.closePath();
      ctx.fillStyle = "rgba(250, 93, 25, 0.16)";
      ctx.fill();
      ctx.beginPath();
      m.chart.forEach((p, i) => {
        const [x, y] = at(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4;
      ctx.stroke();
      const [lx, ly] = at(m.chart[m.chart.length - 1]);
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = C.muted;
    ctx.fillText("Mods online", px + 20, py + 36);
    if (m.mods.length === 0) {
      ctx.fillStyle = C.text;
      ctx.font = `500 28px ${CANVAS_FONTS.ui}`;
      ctx.fillText("No mods online right now", px + 20, py + 96);
    }
    m.mods.forEach((mod, i) => {
      const x = px + 20 + (i % 2) * (pw / 2);
      const y = py + 90 + Math.floor(i / 2) * 54;
      ctx.fillStyle = mod.online ? C.online : mod.status === "idle" ? C.idle : C.hidden;
      ctx.beginPath();
      ctx.arc(x + 10, y - 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.text;
      ctx.font = `500 30px ${CANVAS_FONTS.mono}`;
      ctx.fillText(mod.name, x + 32, y);
      ctx.fillStyle = C.muted;
      ctx.font = `500 20px ${CANVAS_FONTS.mono}`;
      ctx.fillText(mod.status, x + pw / 2 - 150, y);
    });
    if (m.moreMods > 0) {
      ctx.fillStyle = C.muted;
      ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
      ctx.fillText(`+${m.moreMods} more`, px + 20, py + ph - 18);
    }
  }

  ctx.fillStyle = C.muted;
  ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
  ctx.fillText(m.footer, 48, h - 26);
}
