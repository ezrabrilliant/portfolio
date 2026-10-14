import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { roundRect, wrapText } from "../format";
import type { HitRegion } from "../types";
import { CHAT_LOGICAL, clockStamp, loading, topicTitle, visibleLines } from "./chat";
import type { ChatState } from "./chat";
import { CHAT_STRINGS as S } from "./strings";

/** PeduliPasal's night theme (spec §5.4). */
const C = {
  bg: "#111318",
  on: "#E2E2E9",
  primary: "#AAC7FF",
  user: "#284777",
  bot: "#44474E",
  stamp: "#C4C6D0",
  field: "#33353A",
  track: "rgba(170,199,255,.25)",
  navBar: "#0c0d10",
  navIcon: "#c9c9c9",
  /** ≡ FAB (capstone screenshots): dark circle, light icon. */
  fabMenu: "#2b2d33",
  fabMenuIcon: "#E2E2E9",
  /** ↓ FAB: pale circle, dark arrow-in-a-circle icon. */
  fabDown: "#d9dce8",
  fabDownIcon: "#1d2a44",
  chip: "#ffffff",
};
/** Roboto as on Android; the site's self-hosted grotesk elsewhere. */
const font = (weight: number, size: number) => `${weight} ${size}px Roboto, ${CANVAS_FONTS.ui}`;
const TAU = Math.PI * 2;
/** The message list's band, between the toolbar's progress line and the chips. */
const LIST = { top: 60, bottom: 418 };
const BUBBLE_MAX = 168;
const ROW = 12.5;
const SHARE_DOTS: readonly (readonly [number, number])[] = [
  [214, 32],
  [224, 27],
  [224, 39],
];

/** The chat screen (sketch part-peduli.js pdLive.draw, in English, with the FABs from the capstone screenshots). */
export function drawChat(g: CanvasRenderingContext2D, s: ChatState, t: number): HitRegion[] {
  const { w, h } = CHAT_LOGICAL;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.lineWidth = 1;
  g.fillStyle = C.bg;
  g.fillRect(0, 0, w, h);
  statusBar(g, clockStamp(s.originMs, t));
  toolbar(g, topicTitle(s));
  if (loading(s, t)) progress(g, t);
  messages(g, s, t);
  fab(g, 26, 400, "menu");
  fab(g, 214, 400, "down");
  chips(g);
  inputRow(g);
  navBar(g);
  // the whole phone advances the chat
  return [{ x: 0, y: 0, w, h, action: "advance" }];
}

function statusBar(g: CanvasRenderingContext2D, time: string) {
  g.fillStyle = C.on;
  g.font = font(500, 8);
  g.fillText(time, 14, 13);
  // battery
  g.fillRect(212, 6, 14, 7);
  g.fillRect(226, 8, 1.5, 3);
}

function toolbar(g: CanvasRenderingContext2D, title: string) {
  // back arrow
  g.strokeStyle = C.on;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(22, 36);
  g.lineTo(14, 36);
  g.moveTo(18, 31);
  g.lineTo(13.5, 36);
  g.lineTo(18, 41);
  g.stroke();
  g.fillStyle = C.on;
  g.font = font(500, 12);
  g.fillText(title, 38, 40);
  // share icon: three joined dots
  for (const [x, y] of SHARE_DOTS) {
    g.beginPath();
    g.arc(x, y, 2.2, 0, TAU);
    g.fill();
  }
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(214, 32);
  g.lineTo(224, 27);
  g.moveTo(214, 32);
  g.lineTo(224, 39);
  g.stroke();
  g.lineWidth = 1;
}

/** Indeterminate progress line under the toolbar while the bot answers. */
function progress(g: CanvasRenderingContext2D, t: number) {
  const w = CHAT_LOGICAL.w;
  g.fillStyle = C.track;
  g.fillRect(0, 54, w, 2);
  const k = (t * 1.3) % 1;
  g.fillStyle = C.primary;
  g.fillRect(w * (k * 1.4 - 0.4), 54, w * 0.4, 2);
}

function messages(g: CanvasRenderingContext2D, s: ChatState, t: number) {
  const w = CHAT_LOGICAL.w;
  g.font = font(400, 9);
  const laid = visibleLines(s, t).map(({ line, text }) => {
    const rows = wrapText(g, text, BUBBLE_MAX - 16);
    // whitespace-only text wraps to no rows: width 0, not Math.max()'s -Infinity
    const widest = rows.length > 0 ? Math.max(...rows.map((r) => g.measureText(r).width)) : 0;
    const bw = Math.min(BUBBLE_MAX, widest + 16);
    return { line, rows, bw, bh: rows.length * ROW + 12 };
  });
  if (laid.length === 0) return;
  // newest at the bottom; older bubbles scroll off the top of the list
  const total = laid.reduce((a, l) => a + l.bh + 10, 0);
  let y = Math.min(LIST.top + 6, LIST.bottom - total);
  g.save();
  g.beginPath();
  g.rect(0, LIST.top, w, LIST.bottom - LIST.top);
  g.clip();
  for (const l of laid) {
    const user = l.line.who === "user";
    const x = user ? w - 12 - l.bw : 12;
    g.fillStyle = user ? C.user : C.bot;
    roundRect(g, x, y, l.bw, l.bh, 5);
    g.fill();
    g.fillStyle = C.on;
    g.font = font(400, 9);
    l.rows.forEach((row, k) => g.fillText(row, x + 8, y + 15 + k * ROW));
    // the time beside the bubble's inner side
    g.fillStyle = C.stamp;
    g.font = font(400, 7);
    g.textAlign = user ? "right" : "left";
    g.fillText(l.line.stamp, user ? x - 5 : x + l.bw + 5, y + l.bh - 3);
    g.textAlign = "left";
    y += l.bh + 10;
  }
  g.restore();
}

/** The two round FABs from the capstone screenshots: ≡ bottom-left (dark), ↓ bottom-right (pale, circled arrow). */
function fab(g: CanvasRenderingContext2D, x: number, y: number, icon: "menu" | "down") {
  const menu = icon === "menu";
  g.fillStyle = menu ? C.fabMenu : C.fabDown;
  g.beginPath();
  g.arc(x, y, 12, 0, TAU);
  g.fill();
  g.strokeStyle = menu ? C.fabMenuIcon : C.fabDownIcon;
  g.lineWidth = 1.5;
  g.beginPath();
  if (menu) {
    for (const dy of [-4, 0, 4]) {
      g.moveTo(x - 5, y + dy);
      g.lineTo(x + 5, y + dy);
    }
  } else {
    g.arc(x, y, 6, 0, TAU);
    g.moveTo(x, y - 3.2);
    g.lineTo(x, y + 3);
    g.moveTo(x - 2.6, y + 0.6);
    g.lineTo(x, y + 3);
    g.lineTo(x + 2.6, y + 0.6);
  }
  g.stroke();
  g.lineWidth = 1;
}

/** Outlined suggestion pills; the row runs off the right edge like the app's horizontally scrolling chip group. */
function chips(g: CanvasRenderingContext2D) {
  let x = 10;
  g.font = font(400, 8.4);
  g.lineWidth = 1.2;
  for (const chip of S.chips) {
    const cw = g.measureText(chip).width + 20;
    g.strokeStyle = C.chip;
    roundRect(g, x, 426, cw, 22, 11);
    g.stroke();
    g.fillStyle = C.on;
    g.fillText(chip, x + 10, 440);
    x += cw + 6;
  }
  g.lineWidth = 1;
}

function inputRow(g: CanvasRenderingContext2D) {
  g.fillStyle = C.field;
  roundRect(g, 10, 458, 188, 32, 4);
  g.fill();
  g.fillStyle = C.stamp;
  g.fillRect(10, 489, 188, 1);
  g.font = font(400, 9);
  g.fillText(S.input, 20, 477);
  // paper-plane send
  g.fillStyle = C.primary;
  g.beginPath();
  g.moveTo(210, 466);
  g.lineTo(230, 474);
  g.lineTo(210, 482);
  g.lineTo(212, 475.5);
  g.lineTo(222, 474);
  g.lineTo(212, 472.5);
  g.closePath();
  g.fill();
}

/** Android's nav bar: back, home, recents. */
function navBar(g: CanvasRenderingContext2D) {
  g.fillStyle = C.navBar;
  g.fillRect(0, 498, CHAT_LOGICAL.w, 22);
  g.fillStyle = C.navIcon;
  g.beginPath();
  g.moveTo(72, 509);
  g.lineTo(80, 504);
  g.lineTo(80, 514);
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(120, 509, 4.6, 0, TAU);
  g.fill();
  g.fillRect(156, 505, 8, 8);
}
