/**
 * The world's music (polish #8): a calm generative piece, built from the WebAudio graph (no files). A warm pad on a
 * four-chord loop (with a B section now and then), a soft bass, and a plucked pentatonic melody whose voice follows the
 * island in view (a chiptune square on GTID, a gamelan-like bell on Petak Umpet, a soft triangle elsewhere), crossfading
 * as you move. Each island also has its own mix of the layers (a soft shaker and kick, a high arpeggio), faded in and out
 * as it comes into view; Play brings the percussion in. Notes are humanised a little in time and weight. Toward golden
 * hour the low-pass closes and everything warms. It plays on the mixer's music bus, only with the sound on.
 */
import { noiseSource, type Mixer } from "./core";

/** Beats a minute; a bar is four beats. */
export const BPM = 80;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const EIGHTH = BEAT / 2;

/** F major: Fmaj7, Dm7, B♭maj7, C6, as MIDI notes (pad voicing). */
export const CHORDS: readonly (readonly number[])[] = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [46, 50, 53, 57],
  [48, 52, 55, 57],
];
/** The B section: B♭maj7, C7, Am7, Dm7, the last four bars of every SECTION. */
export const CHORDS_B: readonly (readonly number[])[] = [
  [46, 50, 53, 57],
  [48, 52, 55, 58],
  [45, 48, 52, 55],
  [50, 53, 57, 60],
];
/** Bars in a full cycle: three passes of the A loop, then one of B. */
export const SECTION = 16;
/** The melody's notes: F major pentatonic over two octaves. */
export const SCALE: readonly number[] = [65, 67, 69, 72, 74, 77, 79, 81, 84];

export type Voice = "soft" | "chip" | "bell";
const VOICES: readonly Voice[] = ["soft", "chip", "bell"];

/** The melody voice for an island. */
export function voiceFor(island: string): Voice {
  if (island === "gtid") return "chip";
  if (island === "petak-umpet") return "bell";
  return "soft";
}

/** How loud each layer is (0..1+). */
export interface LayerMix { pad: number; bass: number; lead: number; perc: number; arp: number }
type Layer = keyof LayerMix;
const LAYERS: readonly Layer[] = ["pad", "bass", "lead", "perc", "arp"];
const BASE_MIX: LayerMix = { pad: 1, bass: 1, lead: 1, perc: 0, arp: 0 };
/** Each island's remix of the layers (anything not named keeps BASE_MIX). */
export const ISLAND_MIX: Record<string, Partial<LayerMix>> = {
  hero: { bass: 0.8, lead: 0.9 },
  gtid: { perc: 0.8, arp: 0.6 },
  "petak-umpet": { pad: 0.85, perc: 0.5 },
  "web-plaza": { perc: 0.6, arp: 0.4 },
  "orbit-store": { arp: 0.7, bass: 0.9 },
  "pos-monosuko": { perc: 0.45 },
  "bee-furniture-crm": { arp: 0.5, lead: 0.8 },
  "ezra-bot": { arp: 0.8, perc: 0.35 },
  pedulipasal: { pad: 1.1, lead: 0.8 },
};

/** The layer mix for an island; Play brings the percussion in everywhere. */
export function mixFor(island: string, play: boolean): LayerMix {
  const m = { ...BASE_MIX, ...ISLAND_MIX[island] };
  if (play) m.perc = Math.max(m.perc, 0.6);
  return m;
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** The chord for bar `n` of the A loop. */
export function chordAt(n: number): readonly number[] {
  return CHORDS[((n % CHORDS.length) + CHORDS.length) % CHORDS.length];
}

/** The chord for bar `n` of the whole piece: the A loop, and the B section in the last four bars of each SECTION. */
export function progressionAt(n: number): readonly number[] {
  const inCycle = ((n % SECTION) + SECTION) % SECTION;
  return inCycle >= SECTION - CHORDS_B.length ? CHORDS_B[inCycle - (SECTION - CHORDS_B.length)] : chordAt(n);
}

/**
 * The next melody note from `prev` (an index into SCALE): mostly a step or two away, sometimes a rest (-1). `r` is a
 * number in [0, 1).
 */
export function nextNote(prev: number, r: number, r2: number): number {
  if (r < 0.42) return -1;
  const step = r2 < 0.35 ? -1 : r2 < 0.7 ? 1 : r2 < 0.85 ? -2 : 2;
  const from = prev < 0 ? 3 : prev;
  return Math.max(0, Math.min(SCALE.length - 1, from + step));
}

/** A scheduled time that has fallen behind `now` (the tab was hidden, the timer throttled) moves to `now + lead`. */
export function resync(next: number, now: number, lead = 0.1): number {
  return next < now ? now + lead : next;
}

interface Note { src: AudioScheduledSourceNode; gain: GainNode; end: number }
interface Engine {
  ctx: AudioContext;
  out: GainNode;
  filter: BiquadFilterNode;
  echo: DelayNode;
  fb: GainNode;
  layers: Record<Layer, GainNode>;
  mix: LayerMix;
  timer: number;
  nextBar: number;
  nextStep: number;
  bar: number;
  /** eighths since the bar began */
  step: number;
  note: number;
  /** each melody voice's share (crossfading on an island change) */
  fade: Record<Voice, number>;
  notes: Note[];
}

let engine: Engine | null = null;
let mood = { island: "hero", golden: 0, play: false };

function applyMix(e: Engine, slow: boolean): void {
  e.mix = mixFor(mood.island, mood.play);
  const t = e.ctx.currentTime;
  for (const l of LAYERS) e.layers[l].gain.setTargetAtTime(e.mix[l], t, slow ? 1.4 : 0.01);
}

/** Island in view, golden-hour amount (0..1) and Play: the voice, the layers and the warmth follow them. */
export function setMusicMood(island: string, golden: number, play = false): void {
  const moved = island !== mood.island || play !== mood.play;
  const warmer = Math.abs(golden - mood.golden) > 0.005;
  mood = { island, golden, play };
  if (!engine) return;
  if (warmer) engine.filter.frequency.setTargetAtTime(2600 - 1300 * golden, engine.ctx.currentTime, 2);
  if (moved) applyMix(engine, true);
}

/** One enveloped note: a source into its own gain into `to`, remembered so a stop can silence it. */
function voice(e: Engine, src: AudioScheduledSourceNode, to: AudioNode, at: number, peak: number, attack: number, len: number, hold = 0): GainNode {
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  if (hold > 0) {
    g.gain.setValueAtTime(peak, at + hold);
    g.gain.linearRampToValueAtTime(0, at + len);
  } else g.gain.exponentialRampToValueAtTime(0.0008, at + len);
  src.connect(g).connect(to);
  src.start(at);
  src.stop(at + len + 0.05);
  e.notes.push({ src, gain: g, end: at + len + 0.05 });
  return g;
}

function osc(e: Engine, type: OscillatorType, hz: number, detune = 0): OscillatorNode {
  const o = e.ctx.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.detune.value = detune;
  return o;
}

function pad(e: Engine, at: number, notes: readonly number[]): void {
  if (e.mix.pad > 0.01) {
    for (const m of notes) for (const detune of [-6, 6]) voice(e, osc(e, "triangle", midiHz(m), detune), e.layers.pad, at, 0.028, 1.2, BAR + 1.2, BAR - 0.2);
  }
  // the bass: the chord's root an octave down, on beats one and three
  if (e.mix.bass > 0.01) {
    for (const beat of [0, 2]) voice(e, osc(e, "sine", midiHz(notes[0] - 12)), e.layers.bass, at + beat * BEAT, 0.09 * (0.9 + 0.1 * Math.random()), 0.05, BEAT * 1.8);
  }
}

function pluck(e: Engine, at: number, m: number, v: Voice, vel: number): void {
  const len = v === "bell" ? 1.6 : 0.7;
  const peak = (v === "chip" ? 0.035 : 0.06) * vel * e.fade[v];
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, at + len);
  g.connect(e.layers.lead);
  g.connect(e.echo);
  const partials = v === "bell" ? [[1, 1], [2.76, 0.35], [5.4, 0.12]] : [[1, 1]];
  for (const [ratio, amp] of partials) {
    const o = osc(e, v === "chip" ? "square" : v === "bell" ? "sine" : "triangle", midiHz(m) * ratio);
    const pg = e.ctx.createGain();
    pg.gain.value = amp;
    o.connect(pg).connect(g);
    o.start(at);
    o.stop(at + len + 0.05);
    e.notes.push({ src: o, gain: g, end: at + len + 0.05 });
  }
}

/** The soft percussion: a round kick on beats one and three, a shaker on the off-beats. */
function perc(e: Engine, at: number, step: number): void {
  if (step % 4 === 0) {
    const o = osc(e, "sine", 95);
    o.frequency.setValueAtTime(95, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.18);
    voice(e, o, e.layers.perc, at, 0.11 * (0.85 + 0.15 * Math.random()), 0.005, 0.28);
  }
  if (step % 2 === 1) {
    const n = noiseSource(e.ctx);
    const hp = e.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6500;
    n.connect(hp);
    const accent = step % 4 === 3 ? 1 : 0.6;
    const g = e.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.022 * accent * (0.8 + 0.2 * Math.random()), at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 0.07);
    hp.connect(g).connect(e.layers.perc);
    n.start(at, Math.random() * 1.8);
    n.stop(at + 0.1);
    e.notes.push({ src: n, gain: g, end: at + 0.1 });
  }
}

/** The arpeggio: the bar's chord an octave up, one tone on each beat's first half, quiet and short. */
function arp(e: Engine, at: number, step: number, chord: readonly number[]): void {
  if (step % 2 !== 0) return;
  const m = chord[(step / 2) % chord.length] + 12;
  voice(e, osc(e, "sine", midiHz(m)), e.layers.arp, at, 0.022 * (0.85 + 0.15 * Math.random()), 0.006, 0.35);
}

/** Schedules what falls in the next half second (called every 120 ms). */
function tick(e: Engine): void {
  const now = e.ctx.currentTime;
  // a sleeping context (tab hidden, sound off) schedules nothing
  if (e.ctx.state !== "running") return;
  e.notes = e.notes.filter((n) => n.end > now);
  // back from a hidden tab: start again from now instead of bursting through every note it missed
  if (e.nextBar < now) {
    e.nextBar = resync(e.nextBar, now);
    e.nextStep = e.nextBar;
    e.step = 0;
  } else if (e.nextStep < now) {
    // a shorter stall (a heavy frame): skip the missed eighths and keep the groove on the bar's grid, rather than
    // waiting silent for the next bar
    const skipped = Math.ceil((now + 0.1 - e.nextStep) / EIGHTH);
    e.nextStep += skipped * EIGHTH;
    e.step = (e.step + skipped) % 8;
  }
  for (const v of VOICES) {
    const target = v === voiceFor(mood.island) ? 1 : 0;
    e.fade[v] += (target - e.fade[v]) * (1 - Math.exp(-0.12 / 0.8));
  }
  const until = now + 0.5;
  while (e.nextBar < until) {
    pad(e, e.nextBar, progressionAt(e.bar));
    e.bar += 1;
    e.nextBar += BAR;
  }
  while (e.nextStep < until) {
    const at = e.nextStep + (Math.random() - 0.5) * 0.016;
    const chord = progressionAt(e.bar - 1);
    if (e.mix.lead > 0.01) {
      e.note = nextNote(e.note, Math.random(), Math.random());
      if (e.note >= 0) for (const v of VOICES) if (e.fade[v] > 0.03) pluck(e, Math.max(now, at), SCALE[e.note], v, 0.8 + 0.2 * Math.random());
    }
    if (e.mix.perc > 0.01) perc(e, e.nextStep, e.step);
    if (e.mix.arp > 0.01) arp(e, Math.max(now, at), e.step, chord);
    e.step = (e.step + 1) % 8;
    e.nextStep += EIGHTH;
  }
}

/** Starts (fading in) or stops (fading out, silencing what was already scheduled) the music on the mixer's music bus. */
export function setMusicOn(m: Mixer | null, on: boolean): void {
  if (on && m && !engine) {
    const ctx = m.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(m.music);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600 - 1300 * mood.golden;
    filter.Q.value = 0.4;
    filter.connect(out);
    const layers = {} as Record<Layer, GainNode>;
    for (const l of LAYERS) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(filter);
      layers[l] = g;
    }
    // a soft echo on the melody
    const echo = ctx.createDelay(1);
    echo.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    echo.connect(fb).connect(echo);
    echo.connect(layers.lead);
    const now = ctx.currentTime + 0.1;
    const fade = { soft: 0, chip: 0, bell: 0 };
    fade[voiceFor(mood.island)] = 1;
    engine = { ctx, out, filter, echo, fb, layers, mix: BASE_MIX, timer: 0, nextBar: now, nextStep: now + BEAT, bar: 0, step: 2, note: -1, fade, notes: [] };
    const e = engine;
    applyMix(e, false);
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(0.5, now + 3);
    e.timer = window.setInterval(() => tick(e), 120);
    tick(e);
  } else if (!on && engine) {
    const e = engine;
    engine = null;
    window.clearInterval(e.timer);
    const t = e.ctx.currentTime;
    e.out.gain.cancelScheduledValues(t);
    e.out.gain.setTargetAtTime(0, t, 0.4);
    // notes already scheduled ahead are silenced and cut, so none starts during the fade
    for (const n of e.notes) {
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setTargetAtTime(0, t, 0.15);
      try {
        n.src.stop(t + 1);
      } catch {
        // already stopped
      }
    }
    e.notes = [];
    window.setTimeout(() => {
      e.echo.disconnect();
      e.fb.disconnect();
      for (const l of LAYERS) e.layers[l].disconnect();
      e.filter.disconnect();
      e.out.disconnect();
    }, 2500);
  }
}

/** Is the music up, and how many notes are scheduled (for tests)? */
export function musicState(): { on: boolean; notes: number; nextBar: number } {
  return { on: engine !== null, notes: engine?.notes.length ?? 0, nextBar: engine?.nextBar ?? 0 };
}
