import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { formatRupiah, roundRect, wrapText } from "../format";
import { loadScreenImage } from "../images";
import type { ScreenImage } from "../images";
import type { HitRegion } from "../types";
import { MENU, OCCUPIED, POS_LOGICAL, TABLE_COUNT, orderCount, paying, stockBadge, subtotal } from "./pos";
import type { PosState } from "./pos";
import { POS_STRINGS as S } from "./strings";

/** The restaurant's own pictures: the menu sprite (one 200 × 200 tile per item, in menu order) and its logo badge. */
export const POS_IMAGES = { menu: "/world/monosuko/menu.webp", logo: "/world/monosuko/logo.webp" } as const;
const TILE = 200;

/** The real app's light theme (spec §5.2). */
const C = {
  green: "#1f7a4d",
  price: "#1a623e",
  tint: "#f0faf3",
  tint2: "#ddf3e5",
  ink: "#1a201c",
  ink2: "#5a655e",
  ink3: "#6c756f",
  line: "#e8ece9",
  page: "#f4f4f3",
  white: "#ffffff",
  amberBg: "#fef3c7",
  amber: "#92400e",
  amberDot: "#d97706",
  payOff: "#87d0a5",
};
const BADGE: Record<"ok" | "low" | "out", readonly [string, string]> = {
  ok: ["#dcfce7", "#166534"],
  low: [C.amberBg, C.amber],
  out: ["#fee2e2", "#991b1b"],
};
/** Inter as in the app; the site's self-hosted grotesk where Inter isn't installed. */
const font = (weight: number, size: number) => `${weight} ${size}px Inter, ${CANVAS_FONTS.ui}`;
const TAU = Math.PI * 2;
const SIDEBAR = 118;
/** Left edge of the order panel. */
const PANEL = 420;
const CARD = { x: 130, y: 90, w: 89.3, h: 151, gap: 6 };
/** The app's 12 px card and 6 px button radii, at this screen's half scale. */
const RADIUS = { card: 6, button: 3 };

/** The "Input Order" page (sketch part-mono.js monoLive.draw, in English). */
export function drawPos(g: CanvasRenderingContext2D, s: PosState, t: number): HitRegion[] {
  const hits: HitRegion[] = [];
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.lineWidth = 1;
  g.globalAlpha = 1;
  g.fillStyle = C.page;
  g.fillRect(0, 0, POS_LOGICAL.w, POS_LOGICAL.h);
  sidebar(g, loadScreenImage(POS_IMAGES.logo));
  header(g);
  menuGrid(g, s, loadScreenImage(POS_IMAGES.menu), hits);
  orderPanel(g, s, hits);
  if (s.payment && paying(s, t)) confirmation(g, s.payment.table, s.payment.total);
  return hits;
}

function sidebar(g: CanvasRenderingContext2D, logo: ScreenImage) {
  const h = POS_LOGICAL.h;
  g.fillStyle = C.white;
  g.fillRect(0, 0, SIDEBAR, h);
  g.fillStyle = C.line;
  g.fillRect(SIDEBAR, 0, 1, h);
  // the restaurant's round badge on a white tile
  g.save();
  roundRect(g, 10, 10, 28, 28, 5);
  g.clip();
  g.fillStyle = C.white;
  g.fillRect(10, 10, 28, 28);
  if (logo.ready) g.drawImage(logo.img, 10, 10, 28, 28);
  g.restore();
  g.strokeStyle = C.line;
  roundRect(g, 10, 10, 28, 28, 5);
  g.stroke();
  g.fillStyle = C.ink;
  g.font = font(700, 7.8);
  g.fillText(S.brand[0], 43, 21);
  g.fillText(S.brand[1], 43, 31);
  g.fillStyle = C.ink3;
  g.font = font(400, 7);
  g.fillText(S.product, 43, 40);
  S.nav.forEach((label, i) => {
    const y = 58 + i * 22;
    const on = i === S.navActive;
    if (on) {
      g.fillStyle = C.tint;
      roundRect(g, 8, y, 102, 18, 4);
      g.fill();
      g.fillStyle = C.green;
      g.fillRect(8, y + 3, 2.2, 12);
    }
    g.fillStyle = on ? C.price : C.ink2;
    g.font = font(on ? 600 : 500, 8.6);
    g.fillText(label, 18, y + 12);
  });
}

function header(g: CanvasRenderingContext2D) {
  g.fillStyle = C.white;
  g.fillRect(SIDEBAR + 1, 0, PANEL - SIDEBAR - 1, 36);
  g.fillStyle = C.line;
  g.fillRect(SIDEBAR + 1, 36, PANEL - SIDEBAR - 1, 1);
  g.fillStyle = C.ink;
  g.font = font(700, 13);
  g.fillText(S.title, 130, 19);
  g.fillStyle = C.ink3;
  g.font = font(400, 7.5);
  g.fillText(S.shift, 130, 30);
  // search field, then the category pills with "All" selected
  g.fillStyle = C.white;
  roundRect(g, 130, 44, 280, 17, 5);
  g.fill();
  g.strokeStyle = C.line;
  g.stroke();
  g.fillStyle = C.ink3;
  g.font = font(400, 8);
  g.fillText(S.search, 140, 55.5);
  g.fillStyle = C.line;
  roundRect(g, 130, 66, 280, 17, 6);
  g.fill();
  let x = 133;
  g.font = font(600, 7.4);
  S.pills.forEach((label, i) => {
    const w = g.measureText(label).width + 12;
    if (i === 0) {
      g.fillStyle = C.white;
      roundRect(g, x, 68.5, w, 12, 5);
      g.fill();
    }
    g.fillStyle = i === 0 ? C.ink : C.ink2;
    g.fillText(label, x + 6, 77.3);
    x += w + 3;
  });
}

function menuGrid(g: CanvasRenderingContext2D, s: PosState, sprite: ScreenImage, hits: HitRegion[]) {
  const pw = CARD.w - 8;
  const ph = 80;
  // centre crop of the square tile to the photo box's aspect
  const aspect = pw / ph;
  const sw = aspect >= 1 ? TILE : TILE * aspect;
  const sh = aspect >= 1 ? TILE / aspect : TILE;
  MENU.forEach((item, i) => {
    const cx = CARD.x + (i % 3) * (CARD.w + CARD.gap);
    const cy = CARD.y + Math.floor(i / 3) * (CARD.h + CARD.gap);
    const badge = stockBadge(s, i);
    g.globalAlpha = badge?.tone === "out" ? 0.6 : 1;
    g.fillStyle = C.white;
    roundRect(g, cx, cy, CARD.w, CARD.h, RADIUS.card);
    g.fill();
    g.strokeStyle = "rgba(232,236,233,.9)";
    g.stroke();
    g.save();
    roundRect(g, cx + 4, cy + 4, pw, ph, 4);
    g.clip();
    if (sprite.ready) g.drawImage(sprite.img, i * TILE + (TILE - sw) / 2, (TILE - sh) / 2, sw, sh, cx + 4, cy + 4, pw, ph);
    else {
      g.fillStyle = C.line;
      g.fillRect(cx + 4, cy + 4, pw, ph);
    }
    g.restore();
    if (badge) {
      const [bg, fg] = BADGE[badge.tone];
      g.font = font(700, 7);
      const bw = g.measureText(badge.text).width + 9;
      g.fillStyle = bg;
      roundRect(g, cx + CARD.w - 8 - bw, cy + 8, bw, 12, 6);
      g.fill();
      g.fillStyle = fg;
      g.fillText(badge.text, cx + CARD.w - 8 - bw + 4.5, cy + 16.5);
    }
    const text = S.menu[i];
    g.fillStyle = C.ink;
    g.font = font(600, 8.6);
    wrapText(g, text.name, CARD.w - 12)
      .slice(0, 2)
      .forEach((row, k) => g.fillText(row, cx + 6, cy + 98 + k * 11));
    if (text.badge) {
      g.font = font(600, 6.6);
      const bw = g.measureText(text.badge).width + 8;
      g.fillStyle = C.tint;
      roundRect(g, cx + 6, cy + 118, bw, 11, 5);
      g.fill();
      g.fillStyle = C.price;
      g.fillText(text.badge, cx + 10, cy + 126);
    }
    g.fillStyle = C.price;
    g.font = font(700, 9.4);
    g.fillText(formatRupiah(item.price), cx + 6, cy + 143);
    g.globalAlpha = 1;
    hits.push({ x: cx, y: cy, w: CARD.w, h: CARD.h, action: "add", arg: i });
  });
}

function orderPanel(g: CanvasRenderingContext2D, s: PosState, hits: HitRegion[]) {
  const x0 = PANEL;
  const h = POS_LOGICAL.h;
  const count = orderCount(s);
  g.fillStyle = C.white;
  g.fillRect(x0, 0, POS_LOGICAL.w - x0, h);
  g.fillStyle = C.line;
  g.fillRect(x0, 0, 1, h);
  // "Order" with its item-count pill
  g.fillStyle = C.ink;
  g.font = font(700, 11);
  g.fillText(S.order, x0 + 12, 20);
  const titleW = g.measureText(S.order).width;
  g.font = font(600, 7);
  const items = S.items(count);
  const iw = g.measureText(items).width + 10;
  g.fillStyle = C.tint2;
  roundRect(g, x0 + 20 + titleW, 11, iw, 12, 6);
  g.fill();
  g.fillStyle = C.price;
  g.fillText(items, x0 + 25 + titleW, 19.5);
  // Dine-in / Takeaway, Dine-in selected
  g.fillStyle = C.line;
  roundRect(g, x0 + 12, 30, 196, 18, 6);
  g.fill();
  g.fillStyle = C.white;
  roundRect(g, x0 + 14, 32, 96, 14, 5);
  g.fill();
  g.font = font(600, 7.8);
  g.textAlign = "center";
  g.fillStyle = C.ink;
  g.fillText(S.dineIn, x0 + 62, 42);
  g.fillStyle = C.ink2;
  g.fillText(S.takeaway, x0 + 159, 42);
  g.textAlign = "left";
  // tables 1–9: selected green, occupied amber with a dot
  g.fillStyle = C.ink2;
  g.font = font(600, 7.6);
  g.fillText(S.chooseTable, x0 + 12, 62);
  for (let n = 1; n <= TABLE_COUNT; n++) {
    const tx = x0 + 12 + ((n - 1) % 5) * 40;
    const ty = 67 + Math.floor((n - 1) / 5) * 22;
    const selected = n === s.table;
    const occupied = OCCUPIED.includes(n);
    g.fillStyle = selected ? C.green : occupied ? C.amberBg : C.page;
    roundRect(g, tx, ty, 36, 18, 5);
    g.fill();
    g.fillStyle = selected ? C.white : occupied ? C.amber : C.ink2;
    g.font = font(700, 8.4);
    g.textAlign = "center";
    g.fillText(String(n), tx + 18, ty + 12.5);
    g.textAlign = "left";
    if (occupied) {
      g.fillStyle = C.amberDot;
      g.beginPath();
      g.arc(tx + 30, ty + 5, 2, 0, TAU);
      g.fill();
    }
    hits.push({ x: tx, y: ty, w: 36, h: 18, action: "table", arg: n });
  }
  g.fillStyle = C.line;
  g.fillRect(x0 + 12, 117, 196, 1);
  if (count === 0) {
    g.textAlign = "center";
    g.fillStyle = C.ink2;
    g.font = font(600, 9);
    g.fillText(S.emptyTitle, x0 + 110, 200);
    g.fillStyle = C.ink3;
    g.font = font(400, 7.4);
    g.fillText(S.emptyLine, x0 + 110, 213);
    g.textAlign = "left";
  } else {
    let y = 126;
    for (const line of s.lines) {
      const price = MENU[line.item].price;
      g.fillStyle = C.ink;
      g.font = font(600, 8.6);
      g.fillText(S.menu[line.item].name, x0 + 12, y + 10);
      g.fillStyle = C.ink3;
      g.font = font(400, 7.4);
      g.fillText(`${formatRupiah(price)} × ${line.qty}`, x0 + 12, y + 22);
      g.fillStyle = C.ink;
      g.font = font(700, 8.6);
      g.textAlign = "right";
      g.fillText(formatRupiah(price * line.qty), x0 + 208, y + 10);
      g.textAlign = "left";
      y += 32;
      if (y > 300) break;
    }
  }
  // subtotal, the tax note, Save and Pay
  g.fillStyle = C.line;
  g.fillRect(x0, 318, POS_LOGICAL.w - x0, 1);
  g.fillStyle = C.ink2;
  g.font = font(500, 8.4);
  g.fillText(S.subtotal, x0 + 12, 336);
  g.fillStyle = C.ink;
  g.font = font(700, 10);
  g.textAlign = "right";
  g.fillText(formatRupiah(subtotal(s)), x0 + 208, 336);
  g.textAlign = "left";
  g.fillStyle = C.ink3;
  g.font = font(400, 6.8);
  g.fillText(S.taxNote, x0 + 12, 349);
  g.fillStyle = C.white;
  roundRect(g, x0 + 12, 360, 70, 26, RADIUS.button);
  g.fill();
  g.strokeStyle = C.line;
  g.stroke();
  g.font = font(600, 8.6);
  g.textAlign = "center";
  g.fillStyle = C.ink;
  g.fillText(S.save, x0 + 47, 376.5);
  g.fillStyle = count > 0 ? C.green : C.payOff;
  roundRect(g, x0 + 88, 360, 120, 26, RADIUS.button);
  g.fill();
  g.fillStyle = C.white;
  g.fillText(S.pay, x0 + 148, 376.5);
  g.textAlign = "left";
  hits.push({ x: x0 + 88, y: 360, w: 120, h: 26, action: "pay" });
}

/** "Payment / Table N / total / ✓" over a dimmed page. */
function confirmation(g: CanvasRenderingContext2D, table: number, total: number) {
  g.fillStyle = "rgba(26,32,28,.35)";
  g.fillRect(0, 0, POS_LOGICAL.w, POS_LOGICAL.h);
  g.fillStyle = C.white;
  roundRect(g, 220, 130, 200, 120, 10);
  g.fill();
  g.textAlign = "center";
  g.fillStyle = C.ink;
  g.font = font(700, 12);
  g.fillText(S.payment, 320, 158);
  g.fillStyle = C.ink3;
  g.font = font(400, 8);
  g.fillText(S.table(table), 320, 172);
  g.fillStyle = C.price;
  g.font = font(700, 17);
  g.fillText(formatRupiah(total), 320, 200);
  g.textAlign = "left";
  g.fillStyle = C.green;
  g.beginPath();
  g.arc(320, 226, 10, 0, TAU);
  g.fill();
  g.strokeStyle = C.white;
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(315, 226);
  g.lineTo(319, 230);
  g.lineTo(326, 222);
  g.stroke();
  g.lineWidth = 1;
}
