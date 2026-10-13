import { CANVAS_FONTS } from "../shared/canvasFonts";
import { todayAt } from "../shared/time";

/** Members' messages are host chrome (grey skeleton bars); only the bot's replies are readable. */
export type ChatMessage = { kind: "user"; bars: readonly number[] } | { kind: "bot"; text: string };

/** Each answer is short enough to read from the tour camera and points at where the community keeps it. */
export const CHAT_SCRIPT: readonly ChatMessage[] = [
  { kind: "user", bars: [0.62, 0.38] },
  { kind: "bot", text: "Pinned in #guides, Friday." },
  { kind: "user", bars: [0.7, 0.45] },
  { kind: "bot", text: "Posted in #announcements" },
  { kind: "user", bars: [0.5] },
  { kind: "bot", text: "Mods online: see gtid.pro" },
];

/** Indices of the `size` messages ending at `latest`, oldest first, wrapping around the script. */
export function visibleWindow(latest: number, size = 3, length = CHAT_SCRIPT.length): number[] {
  const out: number[] = [];
  for (let k = size - 1; k >= 0; k--) out.push((((latest - k) % length) + length) % length);
  return out;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today at HH:MM" for `stepsAgo` messages before `now`; never earlier than today's midnight (it is always today). */
export function messageTime(now: Date, stepsAgo: number, stepMinutes = 2): string {
  return todayAt(new Date(Math.max(now.getTime() - stepsAgo * stepMinutes * 60_000, startOfDay(now))));
}

/** The visible chat: the newest message's script position and each visible message's time, oldest first. */
export interface ChatLog {
  latest: number;
  times: readonly string[];
}

/** The chat as the page opens: `size` messages two minutes apart, the newest at `now`. */
export function startLog(now: Date, latest = 1, size = 3): ChatLog {
  return { latest, times: Array.from({ length: size }, (_, k) => messageTime(now, size - 1 - k)) };
}

/** Pushes the next script message, stamped `now`; older messages keep the times they were stamped with. */
export function pushMessage(log: ChatLog, now: Date): ChatLog {
  return { latest: log.latest + 1, times: [...log.times.slice(1), todayAt(now)] };
}

export type RichToken = { kind: "text" | "mention" | "link"; text: string };

/** Splits a reply into plain text, #channel mentions (drawn as Discord's blurple pills) and site names (links). */
export function richTokens(text: string): RichToken[] {
  const out: RichToken[] = [];
  const re = /(#[a-z0-9-]+)|([a-z0-9-]+(?:\.[a-z]{2,})+)/gi;
  let at = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > at) out.push({ kind: "text", text: text.slice(at, m.index) });
    out.push({ kind: m[1] ? "mention" : "link", text: m[0] });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
}

/** Greedy word wrap: lines no wider than `maxW` by `measure` (a single over-long word keeps its own line). */
export function wrapToWidth(text: string, maxW: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  roundRect(g, x, y, w, h, h / 2);
  g.fillStyle = c;
  g.fill();
}

const PAD = 28;
const PILL_X = 6;
/** Reply text: one big line (readable from the tour camera), or two smaller lines if it would not fit. */
const BIG = { size: 60, baselines: [146] };
const SMALL = { size: 44, baselines: [112, 162] };

/** One line of a reply, left to right, with mention pills and link colour. */
function drawRichLine(g: CanvasRenderingContext2D, line: string, x: number, baseline: number, size: number) {
  for (const t of richTokens(line)) {
    const tw = g.measureText(t.text).width;
    if (t.kind === "mention") {
      roundRect(g, x - PILL_X, baseline - size * 0.82, tw + PILL_X * 2, size * 1.06, size * 0.18);
      g.fillStyle = "rgba(88, 101, 242, 0.2)";
      g.fill();
    }
    // a shade darker than Discord's #5865f2 / #006ce7: the bubble's emissive glow lifts them back to it
    g.fillStyle = t.kind === "mention" ? "#4752c4" : t.kind === "link" ? "#0058c4" : "#2f3940";
    g.fillText(t.text, x, baseline);
    x += tw;
  }
}

/**
 * One chat bubble (230 canvas px per world unit, e.g. 874 × 207 for a 3.8 × 0.9 panel): a small header line
 * (avatar, name, BOT tag, time) over the reply in big type. A member's message is the same shape in grey bars.
 */
export function drawBubble(g: CanvasRenderingContext2D, msg: ChatMessage, time: string, w: number, h: number): void {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  if (msg.kind === "user") {
    g.beginPath();
    g.arc(PAD + 16, 36, 20, 0, Math.PI * 2);
    g.fillStyle = "#d3d7db";
    g.fill();
    bar(g, 80, 27, 120, 18, "#c3c8cd");
    msg.bars.forEach((f, i) => bar(g, PAD, 100 + i * 46, (w - PAD * 2) * f, 34, "#dde0e3"));
    return;
  }
  roundRect(g, PAD - 4, 16, 40, 40, 10);
  g.fillStyle = "#3e5d3a";
  g.fill();
  g.fillStyle = "#dcf3e4";
  g.fillRect(PAD + 6, 30, 7, 10);
  g.fillRect(PAD + 19, 30, 7, 10);
  g.fillStyle = "#13212b";
  g.font = `700 26px ${CANVAS_FONTS.ui}`;
  g.fillText("Ezra Bot", 80, 45);
  const tagX = 80 + g.measureText("Ezra Bot").width + 10;
  roundRect(g, tagX, 27, 42, 22, 5);
  g.fillStyle = "#5865f2";
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = `500 14px ${CANVAS_FONTS.mono}`;
  g.fillText("BOT", tagX + 8, 43);
  g.fillStyle = "#6f767d";
  g.font = `500 18px ${CANVAS_FONTS.mono}`;
  g.fillText(time, tagX + 54, 44);

  const maxW = w - PAD * 2 - PILL_X * 2;
  const measure = (s: string) => g.measureText(s).width;
  g.font = `500 ${BIG.size}px ${CANVAS_FONTS.ui}`;
  let lines = wrapToWidth(msg.text, maxW, measure);
  let style = BIG;
  if (lines.length > 1) {
    style = SMALL;
    g.font = `500 ${SMALL.size}px ${CANVAS_FONTS.ui}`;
    lines = wrapToWidth(msg.text, maxW, measure).slice(0, SMALL.baselines.length);
  }
  lines.forEach((line, i) => drawRichLine(g, line, PAD + PILL_X, style.baselines[i], style.size));
}

/** The island's title board: the bot's name, its BOT tag and an online dot (640 × 246 canvas). */
export function drawBotScreen(g: CanvasRenderingContext2D, w: number, h: number): void {
  g.fillStyle = "#1e2328";
  g.fillRect(0, 0, w, h);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#f2f3f5";
  g.font = `700 72px ${CANVAS_FONTS.ui}`;
  g.fillText("Ezra Bot", 40, 120);
  const nameW = g.measureText("Ezra Bot").width;
  roundRect(g, 40 + nameW + 18, 70, 84, 40, 8);
  g.fillStyle = "#5865f2";
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = `500 26px ${CANVAS_FONTS.mono}`;
  g.fillText("BOT", 40 + nameW + 34, 99);
  g.beginPath();
  g.arc(52, 182, 12, 0, Math.PI * 2);
  g.fillStyle = "#4fbf6c";
  g.fill();
  g.fillStyle = "#b5bac1";
  g.font = `500 30px ${CANVAS_FONTS.mono}`;
  g.fillText("online", 76, 192);
}
