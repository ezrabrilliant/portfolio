import { CHAT_STRINGS } from "./strings";

/** Seconds of the progress line before an answer starts typing. */
export const LOADING_SECONDS = 1.1;
/** Characters typed per second. */
export const TYPE_RATE = 110;
/** Idle demo: seconds a finished answer stays readable before the next question. */
export const READ_PAUSE = 3;
/** Idle demo: seconds the opening exchange stays readable after load before the first demo step. */
export const INITIAL_READ = 4;
/** The opening exchange is seeded this many seconds before load, so it is fully typed at t = 0. */
const SEED_AGO = 60;
export const CHAT_LOGICAL = { w: 240, h: 520 } as const;

export interface ChatLine {
  who: "user" | "bot";
  text: string;
  /** "HH.mm" when it appears. */
  stamp: string;
  /** Clock time it appears (an answer: when it starts typing). */
  at: number;
}

export interface ChatState {
  /** Wall-clock ms at clock time 0 (init's `now`), for the stamps and the status-bar clock. */
  originMs: number;
  /** Index into CHAT_STRINGS.conversations. */
  convo: number;
  /** Index of the next script line in this conversation. */
  step: number;
  lines: readonly ChatLine[];
  /** Clock time of the next idle-demo advance. */
  next: number;
}

export interface VisibleLine {
  line: ChatLine;
  /** The text on screen (an answer being typed is cut to the characters typed so far). */
  text: string;
}

const CONVERSATIONS = CHAT_STRINGS.conversations;
const pad2 = (n: number) => String(n).padStart(2, "0");
const lastLine = (s: ChatState): ChatLine | undefined => s.lines[s.lines.length - 1];

/** Clock time a line has fully appeared (an answer once completely typed). */
function doneAt(line: ChatLine): number {
  return line.who === "bot" ? line.at + line.text.length / TYPE_RATE : line.at;
}

/** The chat opens on the first conversation with its exchange already on screen: no empty state. */
export function initChat(now: Date): ChatState {
  const blank: ChatState = { originMs: now.getTime(), convo: 0, step: 0, lines: [], next: INITIAL_READ };
  return advanceChat(blank, -SEED_AGO);
}

/** "HH.mm" (24 h, local clock) at clock time t, as the app stamps its bubbles. */
export function clockStamp(originMs: number, t: number): string {
  const d = new Date(originMs + t * 1000);
  return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`;
}

/** The bot is still loading or typing its latest answer. */
export function answering(s: ChatState, t: number): boolean {
  const last = lastLine(s);
  return last !== undefined && t < doneAt(last);
}

/** The progress line runs: an answer is queued and has not started typing yet. */
export function loading(s: ChatState, t: number): boolean {
  return s.lines.some((l) => l.who === "bot" && t < l.at);
}

/**
 * A tap (or the demo): the next question appears now and its answer is queued LOADING_SECONDS later. Ignored while
 * the bot is answering. After a conversation's last exchange the next tap opens the next conversation (new topic
 * title, empty chat); the conversations loop.
 */
export function advanceChat(s: ChatState, t: number): ChatState {
  if (answering(s, t)) return s;
  let convo = s.convo;
  let step = s.step;
  let lines = s.lines;
  if (step >= CONVERSATIONS[convo].script.length) {
    convo = (convo + 1) % CONVERSATIONS.length;
    step = 0;
    lines = [];
  }
  const script = CONVERSATIONS[convo].script;
  const ask = script[step];
  const added: ChatLine[] = [{ who: ask.who, text: ask.text, stamp: clockStamp(s.originMs, t), at: t }];
  step += 1;
  const reply = step < script.length ? script[step] : null;
  if (reply && reply.who === "bot") {
    const at = t + LOADING_SECONDS;
    added.push({ who: "bot", text: reply.text, stamp: clockStamp(s.originMs, at), at });
    step += 1;
  }
  return { ...s, convo, step, lines: [...lines, ...added] };
}

/** What is on screen at t: lines whose time has come, the answer being typed cut to the characters typed so far. */
export function visibleLines(s: ChatState, t: number): VisibleLine[] {
  const out: VisibleLine[] = [];
  for (const line of s.lines) {
    if (line.at > t) continue;
    const typed = line.who === "bot" ? Math.floor((t - line.at) * TYPE_RATE) : line.text.length;
    if (typed <= 0) continue;
    out.push({ line, text: line.text.slice(0, typed) });
  }
  return out;
}

export function topicTitle(s: ChatState): string {
  return CONVERSATIONS[s.convo].title;
}

/** Visitor taps: "advance" (the whole phone is one region). */
export function actChat(s: ChatState, action: string, _arg: number | undefined, t: number): ChatState {
  return action === "advance" ? advanceChat(s, t) : s;
}

/** Clock time the latest answer has been readable for READ_PAUSE (after its loading line and typing). */
function readUntil(s: ChatState): number {
  for (let i = s.lines.length - 1; i >= 0; i--) {
    if (s.lines[i].who === "bot") return doneAt(s.lines[i]) + READ_PAUSE;
  }
  return -Infinity;
}

/**
 * Idle demo: the next exchange once the last answer has been readable for READ_PAUSE seconds. The read window is
 * checked from the lines themselves as well as `next`, so an answer a visitor's tap started also gets its full read.
 */
export function autoChat(s: ChatState, t: number): ChatState | null {
  if (t < s.next || answering(s, t) || t < readUntil(s)) return null;
  const next = advanceChat(s, t);
  const last = lastLine(next);
  return { ...next, next: (last ? doneAt(last) : t) + READ_PAUSE };
}

/** Animating while the progress line runs or an answer types, plus a moment so the last character is drawn. */
export function busyChat(s: ChatState, t: number): boolean {
  const last = lastLine(s);
  return last !== undefined && last.who === "bot" && t < doneAt(last) + 0.1;
}
