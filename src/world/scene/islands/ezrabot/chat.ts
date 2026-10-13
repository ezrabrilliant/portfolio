import { CANVAS_FONTS } from "../shared/canvasFonts";
import { todayAt } from "../shared/time";

/** Members' messages are host chrome (grey skeleton bars); only the bot's replies are readable. */
export type ChatMessage = { kind: "user"; bars: readonly number[] } | { kind: "bot"; text: string };

export const CHAT_SCRIPT: readonly ChatMessage[] = [
  { kind: "user", bars: [0.62, 0.38] },
  { kind: "bot", text: "Found it in #guides, pinned on Friday." },
  { kind: "user", bars: [0.7, 0.45] },
  { kind: "bot", text: "Event starts Saturday 19:00. Rules are in #announcements." },
  { kind: "user", bars: [0.5] },
  { kind: "bot", text: "Mods online right now are listed on gtid.pro." },
];

/** Indices of the `size` messages ending at `latest`, oldest first, wrapping around the script. */
export function visibleWindow(latest: number, size = 3, length = CHAT_SCRIPT.length): number[] {
  const out: number[] = [];
  for (let k = size - 1; k >= 0; k--) out.push((((latest - k) % length) + length) % length);
  return out;
}

export function messageTime(now: Date, stepsAgo: number, stepMinutes = 2): string {
  return todayAt(new Date(now.getTime() - stepsAgo * stepMinutes * 60_000));
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

/** Greedy word wrap by measured width (current font). */
function wrapToWidth(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** One chat bubble (828 × 207 canvas for a 3.6 × 0.9 panel). */
export function drawBubble(g: CanvasRenderingContext2D, msg: ChatMessage, time: string, w: number, h: number): void {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  if (msg.kind === "user") {
    g.beginPath();
    g.arc(56, 76, 34, 0, Math.PI * 2);
    g.fillStyle = "#d3d7db";
    g.fill();
    bar(g, 112, 52, 150, 22, "#c3c8cd");
    msg.bars.forEach((f, i) => bar(g, 112, 98 + i * 40, (w - 150) * f, 22, "#dde0e3"));
    return;
  }
  // a reply too long for one line wraps to two; the block moves up so both lines stay inside the bubble
  g.font = `500 32px ${CANVAS_FONTS.ui}`;
  const lines = wrapToWidth(g, msg.text, w - 112 - 28);
  g.save();
  if (lines.length > 1) g.translate(0, -14);
  roundRect(g, 22, 40, 70, 70, 16);
  g.fillStyle = "#3e5d3a";
  g.fill();
  g.fillStyle = "#dcf3e4";
  g.fillRect(38, 66, 12, 14);
  g.fillRect(64, 66, 12, 14);
  g.fillStyle = "#13212b";
  g.font = `700 34px ${CANVAS_FONTS.ui}`;
  g.fillText("Ezra Bot", 112, 78);
  const nameW = g.measureText("Ezra Bot").width;
  roundRect(g, 112 + nameW + 12, 52, 54, 28, 6);
  g.fillStyle = "#5865f2";
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = `500 17px ${CANVAS_FONTS.mono}`;
  g.fillText("BOT", 112 + nameW + 22, 72);
  g.fillStyle = "#6f767d";
  g.font = `500 20px ${CANVAS_FONTS.mono}`;
  g.fillText(time, 112 + nameW + 80, 74);
  g.fillStyle = "#2f3940";
  g.font = `500 32px ${CANVAS_FONTS.ui}`;
  lines.forEach((line, i) => g.fillText(line, 112, 136 + i * 40));
  g.restore();
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
