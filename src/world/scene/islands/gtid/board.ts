import type { GtidData, GtidKey } from "./types";
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
  /** Mods in the roster, with gtid.pro's wording beside the count: "mods in-game", "mod in-game", "no mods in-game". */
  modsInGame: number;
  modsCaption: string;
  /** "just now" while the roster is a fresh proxy answer; empty when it is stale or saved (we keep no per-mod times). */
  modsSeen: string;
  moreMods: number;
  /** Sections still showing the bundled snapshot while others are live (the footer covers the all-snapshot case). */
  snapshot: Record<GtidKey, boolean>;
  footer: string;
}

// gtid.pro writes "Rp 78.500": a space after Rp and dots between thousands
const thousands = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

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

export function buildBoardModel(data: GtidData, view: BoardView, maxMods = 3): BoardModel {
  const vs = data.history.points.map((p) => p.v);
  const sorted = [...data.mods.online].sort((a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3));
  const n = sorted.length;
  const onSnapshot = (k: GtidKey) => data.live && data.sources[k] === "snapshot";
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
    modsInGame: n,
    modsCaption: n === 0 ? "no mods in-game" : n === 1 ? "mod in-game" : "mods in-game",
    modsSeen: data.sources.mods === "live" ? "just now" : "",
    moreMods: Math.max(0, n - maxMods),
    snapshot: { price: onSnapshot("price"), history: onSnapshot("history"), mods: onSnapshot("mods") },
    footer: !data.live ? "Saved snapshot from gtid.pro" : data.stale ? "Last update from gtid.pro" : "Live from gtid.pro",
  };
}

// gtid.pro's dark theme: ink #F2F2F2 / #A3A3A3, live dot #4ADE80, status tag #D97706, accent #FA5D19
const C = { bg: "#0C0C0C", card: "#141414", line: "#262626", text: "#F2F2F2", ink2: "#A3A3A3", muted: "#8a8a8a", accent: "#FA5D19", live: "#4ADE80", tag: "#D97706" };
const SAVED = " · saved snapshot";

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A price the way gtid.pro sets it: a muted "Rp", then the number in ink. */
function drawPrice(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.font = `500 34px ${CANVAS_FONTS.mono}`;
  ctx.fillStyle = C.muted;
  if (!text.startsWith("Rp ")) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.fillText("Rp", x, y);
  ctx.fillStyle = C.text;
  ctx.fillText(text.slice(3), x + ctx.measureText("Rp ").width, y);
}

/** Draws the board in GTID's own dark theme. Price info only: no offers, no trading UI. */
export function drawBoard(ctx: CanvasRenderingContext2D, m: BoardModel, w: number, h: number): void {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = C.text; // the site's wordmark is white (its orange is the mascot beside it)
  ctx.font = `700 54px ${CANVAS_FONTS.ui}`;
  ctx.fillText("GTID.", 48, 86);
  ctx.fillStyle = C.muted;
  ctx.font = `500 24px ${CANVAS_FONTS.mono}`;
  ctx.fillText(`DL · BGL prices${m.snapshot.price ? SAVED : ""}`, 220, 82);

  const cols = [48, 300, 640];
  ctx.fillText("BUY", cols[1], 140);
  ctx.fillText("SELL", cols[2], 140);
  m.rows.forEach((r, i) => {
    const y = 196 + i * 62;
    ctx.fillStyle = C.text;
    ctx.font = `700 34px ${CANVAS_FONTS.ui}`;
    ctx.fillText(r.label, cols[0], y);
    drawPrice(ctx, r.buy, cols[1], y);
    drawPrice(ctx, r.sell, cols[2], y);
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
    ctx.fillText(`DL · buy · 24 h${m.snapshot.history ? SAVED : ""}`, px + 20, py + 36);
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
      dot(ctx, lx, ly, 7, C.accent);
    }
  } else {
    // gtid.pro's moderators card: caption, big count with a live dot, then one row per mod
    ctx.fillStyle = C.muted;
    ctx.fillText(`MODERATORS${m.snapshot.mods ? SAVED.toUpperCase() : ""}`, px + 20, py + 36);
    const cy = py + 98;
    const count = String(m.modsInGame);
    ctx.fillStyle = C.text;
    ctx.font = `700 52px ${CANVAS_FONTS.ui}`;
    ctx.fillText(count, px + 20, cy);
    let x = px + 20 + ctx.measureText(count).width + 20;
    if (m.modsInGame > 0) {
      dot(ctx, x + 6, cy - 16, 7, C.live);
      x += 26;
    }
    ctx.fillStyle = C.ink2;
    ctx.font = `500 28px ${CANVAS_FONTS.ui}`;
    ctx.fillText(m.modsCaption, x, cy - 6);
    if (m.moreMods > 0) {
      ctx.textAlign = "right";
      ctx.fillStyle = C.muted;
      ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
      ctx.fillText(`+${m.moreMods} more`, px + pw - 20, cy - 6);
      ctx.textAlign = "left";
    }
    m.mods.forEach((mod, i) => {
      const top = py + 124 + i * 44;
      const y = top + 32;
      ctx.fillStyle = C.line;
      ctx.fillRect(px + 20, top, pw - 40, 2);
      dot(ctx, px + 27, y - 9, 6, C.live);
      ctx.fillStyle = C.text;
      ctx.font = `500 28px ${CANVAS_FONTS.mono}`;
      ctx.fillText(mod.name, px + 44, y);
      if (!mod.online) {
        const tx = px + 44 + ctx.measureText(mod.name).width + 14;
        ctx.fillStyle = C.tag;
        ctx.font = `500 18px ${CANVAS_FONTS.mono}`;
        ctx.fillText(mod.status.toUpperCase(), tx, y - 3);
      }
      if (m.modsSeen) {
        ctx.textAlign = "right";
        ctx.fillStyle = C.muted;
        ctx.font = `500 20px ${CANVAS_FONTS.mono}`;
        ctx.fillText(m.modsSeen, px + pw - 20, y);
        ctx.textAlign = "left";
      }
    });
  }

  // where the numbers come from: large enough to read at the tour stop
  ctx.fillStyle = C.ink2;
  ctx.font = `500 28px ${CANVAS_FONTS.mono}`;
  ctx.fillText(m.footer, 48, h - 22);
}
