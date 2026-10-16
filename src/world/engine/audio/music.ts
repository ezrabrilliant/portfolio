/**
 * The world's music (polish #8): a calm generative piece, built from the WebAudio graph (no files). A warm pad on a
 * four-chord loop, a soft bass, and a plucked pentatonic melody whose voice follows the island in view (a chiptune
 * square on GTID, a gamelan-like bell on Petak Umpet, a soft triangle elsewhere). Toward golden hour the low-pass closes
 * and everything warms. It plays only with the sound on.
 */

/** Beats a minute; a bar is four beats. */
export const BPM = 80;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

/** F major: Fmaj7, Dm7, B♭maj7, C6, as MIDI notes (pad voicing). */
export const CHORDS: readonly (readonly number[])[] = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [46, 50, 53, 57],
  [48, 52, 55, 57],
];
/** The melody's notes: F major pentatonic over two octaves. */
export const SCALE: readonly number[] = [65, 67, 69, 72, 74, 77, 79, 81, 84];

export type Voice = "soft" | "chip" | "bell";

/** The melody voice for an island. */
export function voiceFor(island: string): Voice {
  if (island === "gtid") return "chip";
  if (island === "petak-umpet") return "bell";
  return "soft";
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** The chord for bar `n` of the loop. */
export function chordAt(n: number): readonly number[] {
  return CHORDS[((n % CHORDS.length) + CHORDS.length) % CHORDS.length];
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

interface Engine {
  ctx: AudioContext;
  out: GainNode;
  filter: BiquadFilterNode;
  echo: DelayNode;
  timer: number;
  nextBar: number;
  nextStep: number;
  bar: number;
  note: number;
}

let engine: Engine | null = null;
let mood = { island: "hero", golden: 0 };

/** Island in view and golden-hour amount (0..1): the melody's voice and the music's warmth follow them. */
export function setMusicMood(island: string, golden: number): void {
  mood = { island, golden };
  if (engine) engine.filter.frequency.setTargetAtTime(2600 - 1300 * golden, engine.ctx.currentTime, 2);
}

function pad(e: Engine, at: number, notes: readonly number[]): void {
  for (const m of notes) {
    for (const detune of [-6, 6]) {
      const o = e.ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = midiHz(m);
      o.detune.value = detune;
      const g = e.ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.028, at + 1.2);
      g.gain.setValueAtTime(0.028, at + BAR - 0.2);
      g.gain.linearRampToValueAtTime(0, at + BAR + 1.2);
      o.connect(g).connect(e.filter);
      o.start(at);
      o.stop(at + BAR + 1.3);
    }
  }
  // the bass: the chord's root an octave down, on beats one and three
  for (const beat of [0, 2]) {
    const o = e.ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = midiHz(notes[0] - 12);
    const g = e.ctx.createGain();
    const t = at + beat * BEAT;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 1.8);
    o.connect(g).connect(e.filter);
    o.start(t);
    o.stop(t + BEAT * 2);
  }
}

function pluck(e: Engine, at: number, m: number, voice: Voice): void {
  const g = e.ctx.createGain();
  const len = voice === "bell" ? 1.6 : 0.7;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(voice === "chip" ? 0.035 : 0.06, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, at + len);
  g.connect(e.filter);
  g.connect(e.echo);
  const partials = voice === "bell" ? [[1, 1], [2.76, 0.35], [5.4, 0.12]] : [[1, 1]];
  for (const [ratio, amp] of partials) {
    const o = e.ctx.createOscillator();
    o.type = voice === "chip" ? "square" : voice === "bell" ? "sine" : "triangle";
    o.frequency.value = midiHz(m) * ratio;
    const pg = e.ctx.createGain();
    pg.gain.value = amp;
    o.connect(pg).connect(g);
    o.start(at);
    o.stop(at + len + 0.05);
  }
}

/** Schedules what falls in the next half second (called every 120 ms). */
function tick(e: Engine): void {
  const until = e.ctx.currentTime + 0.5;
  while (e.nextBar < until) {
    pad(e, e.nextBar, chordAt(e.bar));
    e.bar += 1;
    e.nextBar += BAR;
  }
  while (e.nextStep < until) {
    e.note = nextNote(e.note, Math.random(), Math.random());
    if (e.note >= 0) pluck(e, e.nextStep, SCALE[e.note], voiceFor(mood.island));
    e.nextStep += BEAT / 2;
  }
}

/** Starts (fading in) or stops (fading out) the music on `ctx`. */
export function setMusicOn(ctx: AudioContext | null, on: boolean): void {
  if (on && ctx && !engine) {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600 - 1300 * mood.golden;
    filter.Q.value = 0.4;
    filter.connect(out);
    // a soft echo on the melody
    const echo = ctx.createDelay(1);
    echo.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    echo.connect(fb).connect(echo);
    echo.connect(filter);
    const now = ctx.currentTime + 0.1;
    engine = { ctx, out, filter, echo, timer: 0, nextBar: now, nextStep: now + BEAT, bar: 0, note: -1 };
    out.gain.linearRampToValueAtTime(0.5, now + 3);
    const e = engine;
    e.timer = window.setInterval(() => tick(e), 120);
    tick(e);
  } else if (!on && engine) {
    const e = engine;
    engine = null;
    e.out.gain.cancelScheduledValues(e.ctx.currentTime);
    e.out.gain.setTargetAtTime(0, e.ctx.currentTime, 0.4);
    window.clearInterval(e.timer);
    window.setTimeout(() => e.out.disconnect(), 2500);
  }
}
