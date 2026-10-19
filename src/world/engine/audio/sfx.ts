import { audioAwake, duckMusic, isHidden, isMuted, liveMixer, onAudioWake, placeSound, reportAudioFailure, whenRunning, type Mixer } from "./core";

export { audioAwake, falloff, isMuted, setListener, setMuted, subscribeAudio } from "./core";

export type SfxName =
  // the interface
  | "click" | "hover" | "toggle" | "tick" | "uiOpen" | "uiClose" | "travel" | "rise" | "note" | "bell"
  | "type" | "send" | "error" | "chat" | "link" | "print"
  // Ezra
  | "jump" | "stepGrass" | "stepStone" | "stepWood" | "creak" | "land" | "landStone" | "landWood" | "landHeavy"
  | "teeter" | "dropIn" | "fallAway" | "appear" | "poof"
  // the world's toys and animals
  | "boing" | "whump" | "kick" | "thud" | "cart" | "brake" | "clunk" | "coin" | "pop" | "count" | "punch" | "burst"
  | "purr" | "cluck" | "chirp" | "tweet";

// ZzFX parameter order: volume, randomness, frequency, attack, sustain, release, shape (0 sine, 1 triangle, 2 saw, 3 tan,
// 4 noise, 5 square), shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush,
// delay, sustainVolume, decay, tremolo, filter (Hz; negative a low-pass, positive a high-pass)
export const SFX_PRESETS: Record<SfxName, (number | undefined)[]> = {
  click: [0.5, 0, 900, 0, 0.01, 0.04, 1, 1.5],
  // a mouse-over: the faintest tick
  hover: [0.16, 0, 1250, 0, 0.004, 0.02, 0],
  // a switch flipped (help, Tour / Play): a short two-step square click
  toggle: [0.3, 0, 620, 0, 0.008, 0.04, 5, 1, 0, 0, 240, 0.018, 0, 0, 0, 0, 0, 1, 0, 0, -3000],
  // something in Play comes into reach: a soft high blip
  tick: [0.16, 0, 1480, 0, 0.006, 0.05, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -4000],
  // a panel opening (a closeup, the map, the chat): airy noise sweeping up; closing is its mirror, sweeping down
  uiOpen: [0.22, 0, 420, 0.05, 0.03, 0.09, 4, 1, 9, 0, 0, 0, 0, 0.6, 0, 0, 0, 1, 0, 0, 900],
  uiClose: [0.22, 0, 900, 0.02, 0.03, 0.12, 4, 1, -9, 0, 0, 0, 0, 0.6, 0, 0, 0, 1, 0, 0, 700],
  // the tour flying to another island: a long rising whoosh
  travel: [0.26, 0, 220, 0.25, 0.15, 0.45, 4, 1, 2.5, 0, 0, 0, 0, 0.9, 0, 0, 0, 1, 0, 0, 350],
  // leaving Play: the camera lifts away, a soft whoosh up and out
  rise: [0.2, 0, 300, 0.12, 0.08, 0.3, 4, 1, 5, 0, 0, 0, 0, 0.8, 0, 0, 0, 1, 0, 0, 600],
  // a soft mallet note (C5): jingles play it at other pitches
  note: [0.35, 0, 523.25, 0.004, 0.05, 0.38, 1, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.09, 0.7, 0.04],
  // a small bell (C6) with a shimmer: the title card's and the gold's jingles
  bell: [0.3, 0, 1046.5, 0, 0.02, 0.6, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.12, 0.6, 0.05, 0.08],
  // a key pressed in the chat: a tiny dry tick
  type: [0.1, 0.1, 2000, 0, 0.002, 0.012, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1500],
  // a message sent: a quick swoop up
  send: [0.32, 0, 520, 0, 0.04, 0.12, 0, 1, 16, 0, 260, 0.04],
  // didn't go through: two low buzzes
  error: [0.3, 0, 150, 0, 0.14, 0.06, 2, 1, 0, 0, 0, 0, 0.09, 0, 0, 0, 0, 1, 0, 0.7, -1600],
  chat: [0.4, 0, 880, 0.01, 0.05, 0.1, 0, 1, 0, 0, 440, 0.05],
  link: [0.4, 0, 660, 0, 0.06, 0.15, 0, 1, 0, 0, 220, 0.06],
  print: [0.4, 0, 520, 0, 0.3, 0.05, 2, 1, 0, 0, 0, 0, 0.05, 0.5],
  jump: [0.42, 0, 300, 0, 0.04, 0.12, 0, 1, 12],
  // footfalls: grass a soft brush, stone a dry tock, a plank a hollow knock (variants and pitch jitter keep them alive)
  stepGrass: [0.34, 0.15, 900, 0.004, 0.012, 0.05, 4, 1, -6, 0, 0, 0, 0, 0.4, 0, 0, 0, 1, 0, 0, -2600],
  stepStone: [0.3, 0.1, 300, 0, 0.004, 0.045, 1, 2, -12, 0, 0, 0, 0, 0.25, 0, 0, 0, 1, 0, 0, -3500],
  stepWood: [0.3, 0.08, 330, 0, 0.004, 0.06, 1, 1.4, -6],
  // a bridge plank giving a little under him
  creak: [0.14, 0, 170, 0.06, 0.12, 0.1, 2, 1, -1, 0, 0, 0, 0.014, 0, 0, 0, 0, 1, 0, 0, -1100],
  // landings by surface; a big drop adds a deep thump
  land: [0.5, 0, 110, 0, 0.02, 0.09, 4, 1, -2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -1400],
  landStone: [0.48, 0, 190, 0, 0.012, 0.08, 1, 2, -8, 0, 0, 0, 0, 0.4, 0, 0, 0, 1, 0, 0, -3000],
  landWood: [0.45, 0, 230, 0, 0.006, 0.11, 1, 1.4, -5],
  landHeavy: [0.8, 0, 58, 0, 0.05, 0.28, 0, 1, -1.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 0, 0, -700],
  // held at a rim: a short wobbly "whoa", a tone with a fast vibrato that sags
  teeter: [0.3, 0, 460, 0.01, 0.1, 0.12, 0, 1, -4, 0, 0, 0, 0, 0, 14],
  // dropping into Play from the sky: a long breathy whoosh falling in
  dropIn: [0.34, 0, 700, 0.1, 0.25, 0.35, 4, 1, -3, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 500],
  // fallen past the cloud sea: a whistle falling away ...
  fallAway: [0.3, 0, 900, 0.02, 0.18, 0.2, 0, 1, -7, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0.15],
  // ... and back at his last footing: a sparkly rise
  appear: [0.3, 0, 440, 0.01, 0.06, 0.25, 0, 1, 0, 0, 220, 0.05, 0.1, 0, 0, 0, 0, 1, 0, 0, -5000],
  // a fast-travel dust puff: a quiet noise burst falling away
  poof: [0.3, 0.1, 150, 0.01, 0.04, 0.2, 4, 1, -3, 0, 0, 0, 0, 0.6],
  // a bounce pad: a springy boing that wobbles up
  boing: [0.55, 0, 170, 0.005, 0.12, 0.26, 0, 1, 15, 0, 0, 0, 0, 0, 8],
  // caught by the cloud sea: a soft fluffy whump that lifts
  whump: [0.5, 0, 120, 0.03, 0.08, 0.32, 4, 1, 4, 0, 0, 0, 0, 0.9, 0, 0, 0, 1, 0, 0, -900],
  // the plaza ball kicked, and the ball hitting the ground or a wall
  kick: [0.55, 0, 150, 0, 0.012, 0.09, 0, 1, -14, 0, 0, 0, 0, 0.25, 0, 0, 0, 1, 0, 0, -2500],
  thud: [0.42, 0, 120, 0, 0.006, 0.06, 0, 1, -9, 0, 0, 0, 0, 0.15],
  cart: [0.4, 0.1, 90, 0.05, 0.4, 0.2, 2, 1, 0, 0, 0, 0, 0.08, 0.3],
  // the cart arriving: a brake's thin squeal, then the clunk of the buffer
  brake: [0.22, 0, 1500, 0.03, 0.3, 0.18, 2, 1, -2.5, 0, 0, 0, 0, 0.08, 0, 0, 0, 1, 0, 0.3, 1100],
  clunk: [0.5, 0, 85, 0, 0.02, 0.13, 1, 1, -4, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 0, 0, -1500],
  // a gold block picked up: a bright two-step chime (its pitch climbs with each one found)
  coin: [0.45, 0, 988, 0, 0.04, 0.22, 0, 1.6, 0, 0, 330, 0.06],
  // the graduation cap popping on (or the toss): a short soft blip sliding up
  pop: [0.4, 0.02, 520, 0, 0.02, 0.08, 0, 1.6, 18],
  // hide and seek: the kid counting
  count: [0.28, 0, 660, 0, 0.03, 0.09, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -3000],
  punch: [0.8, 0.05, 160, 0, 0.02, 0.12, 4, 1, -8, 0, 0, 0, 0, 1.5],
  burst: [0.7, 0.1, 220, 0, 0.05, 0.3, 4, 1, -3, 0, 0, 0, 0, 2],
  // a petted cat's purr: a low, rough rumble
  purr: [0.35, 0.05, 60, 0.1, 0.5, 0.3, 4, 1, 0, 0, 0, 0, 0.04, 0.4],
  // a chicken's cluck: a short dropping squawk
  cluck: [0.35, 0.1, 620, 0, 0.03, 0.08, 2, 1.5, -12],
  // a bird's chirp as it takes off: two quick high blips
  chirp: [0.25, 0, 2200, 0, 0.02, 0.05, 0, 1, 30, 0, 0, 0, 0.07],
  // a bird singing by day: a quick falling trill
  tweet: [0.16, 0.1, 3100, 0.01, 0.05, 0.05, 0, 1, -30, 0, 0, 0, 0.045, 0, 0, 0, 0, 1, 0, 0.3],
};

/**
 * How a sound behaves when played: `gap` the least seconds between two of it (anti-spam), `jitter` the random speed
 * (and so pitch) spread, `vary` the random loudness spread, `near` / `far` its reach when placed in the world.
 */
interface Mix { gap: number; jitter: number; vary: number; near: number; far: number }
const MIX_DEFAULT: Mix = { gap: 0.04, jitter: 0.05, vary: 0.1, near: 3, far: 26 };
const STEP: Partial<Mix> = { gap: 0.07, jitter: 0.08, vary: 0.2 };
const UI: Partial<Mix> = { jitter: 0.015, vary: 0.04 };
export const SFX_MIX: Partial<Record<SfxName, Partial<Mix>>> = {
  click: UI,
  hover: { ...UI, gap: 0.09 },
  toggle: UI,
  tick: { ...UI, gap: 0.6 },
  uiOpen: { ...UI, gap: 0.15 },
  uiClose: { ...UI, gap: 0.15 },
  travel: { gap: 0.6, jitter: 0.03 },
  note: { gap: 0, jitter: 0, vary: 0.05 },
  bell: { gap: 0, jitter: 0, vary: 0.05 },
  type: { gap: 0.05, jitter: 0.1, vary: 0.3 },
  stepGrass: STEP,
  stepStone: STEP,
  stepWood: STEP,
  creak: { gap: 1.2, jitter: 0.1 },
  coin: { gap: 0.05, jitter: 0, vary: 0 },
  thud: { gap: 0.09, jitter: 0.1, vary: 0.15 },
  cluck: { gap: 0.3, jitter: 0.08, near: 2, far: 18 },
  chirp: { gap: 0.15, jitter: 0.1, near: 2, far: 22 },
  tweet: { gap: 0.4, jitter: 0.12, near: 3, far: 24 },
  purr: { gap: 1, near: 2, far: 16 },
  count: { gap: 0.2, jitter: 0 },
};
const mixOf = (name: SfxName): Mix => ({ ...MIX_DEFAULT, ...SFX_MIX[name] });

/** Effects playing at once, at most (beyond it the oldest is cut short). */
export const MAX_VOICES = 14;
/** Rendered takes of each sound: footsteps cycle them, so no two steps in a row are quite alike. */
const TAKES = 3;
/** Each effect's level on the effects bus (the presets' own volumes ride on it). */
const SFX_GAIN = 0.32;

type ZzfxModule = typeof import("zzfx");

let zz: ZzfxModule | null = null;
let loading: Promise<void> | null = null;
const buffers = new Map<SfxName, AudioBuffer[]>();
const lastAt = new Map<string, number>();
const takeIndex = new Map<SfxName, number>();
interface VoiceNode { src: AudioBufferSourceNode; gain: GainNode; end: number }
let voices: VoiceNode[] = [];

function load(): Promise<void> {
  if (!loading) {
    loading = import("zzfx")
      .then((m) => {
        zz = m;
        // zzfx makes its own context when it loads; we only use its synth (buildSamples), so let that one go
        void m.ZZFX.audioContext?.close?.().catch(() => {});
      })
      .catch((err: unknown) => {
        loading = null;
        reportAudioFailure("the synth did not load", err);
      });
  }
  return loading;
}

onAudioWake(() => void load());

/** Resolves once the synth has loaded (or failed to) and the context runs: a sound played after switching on waits for it. */
export function whenAudioReady(): Promise<void> {
  return (loading ?? Promise.resolve()).then(whenRunning);
}

function takes(name: SfxName, ctx: BaseAudioContext): AudioBuffer[] {
  let list = buffers.get(name);
  if (list || !zz) return list ?? [];
  list = [];
  const params = [...SFX_PRESETS[name]];
  // the preset's own randomness becomes the spread between takes, not a fresh render per play
  const n = (params[1] ?? 0) > 0 ? TAKES : 1;
  for (let i = 0; i < n; i++) {
    const samples = zz.ZZFX.buildSamples(...params);
    if (!samples.length) continue;
    const buf = ctx.createBuffer(1, samples.length, zz.ZZFX.sampleRate);
    buf.getChannelData(0).set(samples);
    list.push(buf);
  }
  buffers.set(name, list);
  return list;
}

export interface SfxOptions {
  /** loudness scale (1 = the preset's) */
  volume?: number;
  /** playback speed (and pitch): 2 is an octave up */
  rate?: number;
  /** -1 left .. 1 right (a placed sound pans itself) */
  pan?: number;
  /** a place in the world: the sound falls off with distance from the listener and pans to its side */
  at?: { x: number; y: number; z: number };
  /** seconds from now */
  delay?: number;
  /** no random pitch or loudness (jingle notes) */
  exact?: boolean;
}

/** Can `key` play at time `t`, at least `gap` seconds after its last one? Records the play when it can. */
export function admit(key: string, t: number, gap: number, last = lastAt): boolean {
  const prev = last.get(key);
  if (prev !== undefined && t - prev < gap && t >= prev) return false;
  last.set(key, t);
  return true;
}

function voice(m: Mixer, name: SfxName, o: SfxOptions, mix: Mix): boolean {
  const ctx = m.ctx;
  const list = takes(name, ctx);
  if (!list.length) return false;
  let gain = SFX_GAIN * (o.volume ?? 1);
  let pan = o.pan ?? 0;
  if (o.at) {
    const placed = placeSound(o.at, mix.near, mix.far);
    if (placed.gain < 0.02) return false;
    gain *= placed.gain;
    pan = placed.pan;
  }
  const r = (spread: number) => (o.exact ? 1 : 1 + spread * (Math.random() * 2 - 1));
  const k = ((takeIndex.get(name) ?? -1) + 1) % list.length;
  takeIndex.set(name, k);
  const buf = list[k];
  const t = ctx.currentTime + (o.delay ?? 0);
  // the voice cap: the oldest still sounding is faded and cut
  voices = voices.filter((v) => v.end > ctx.currentTime);
  while (voices.length >= MAX_VOICES) {
    const old = voices.shift()!;
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    try {
      old.src.stop(ctx.currentTime + 0.05);
    } catch {
      // already stopped
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const rate = (o.rate ?? 1) * r(mix.jitter);
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain * r(mix.vary);
  src.connect(g);
  let tail: AudioNode = g;
  if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    tail = p;
  }
  tail.connect(m.sfx);
  src.onended = () => {
    src.disconnect();
    g.disconnect();
    if (tail !== g) tail.disconnect();
  };
  src.start(t);
  voices.push({ src, gain: g, end: t + buf.duration / rate });
  return true;
}

/** How long a sound asked for while the audio wakes may wait for it; later than this it would sound out of step. */
export const WAKE_WAIT_MS = 600;
/** At most this many sounds wait for the waking audio. */
const WAKE_QUEUE = 4;
let waiting: (() => void)[] = [];
let waitingSince = 0;

/**
 * The audio is on and its context built (a gesture woke it) but not playing yet: the synth still loads, or the context
 * has not confirmed it runs. This is the very first gesture's own sound (the click that woke the audio).
 */
function waking(): boolean {
  return !!audioAwake() && !isHidden() && (!zz || !liveMixer());
}

/** Holds `play` until the audio is ready, played once then (unless it took longer than WAKE_WAIT_MS), never twice. */
function playWhenAwake(play: () => void): void {
  if (waiting.length >= WAKE_QUEUE) return;
  if (!waiting.length) {
    waitingSince = Date.now();
    void whenAudioReady().then(() => {
      const late = Date.now() - waitingSince > WAKE_WAIT_MS;
      const queue = waiting;
      waiting = [];
      if (!late && liveMixer() && zz) for (const p of queue) p();
    });
  }
  waiting.push(play);
}

/**
 * Plays an effect (nothing while the sound is off or the tab hidden). An unplaced sound asked for while the audio wakes
 * (the click that woke it) waits a moment for it rather than being lost.
 */
export function playSfx(name: SfxName, o: SfxOptions = {}): void {
  if (isMuted()) return;
  if (!o.at && waking()) return playWhenAwake(() => playSfx(name, o));
  const m = liveMixer();
  if (!m || !zz) return;
  const mix = mixOf(name);
  // a placed sound too far to hear spends no slot of its gap
  if (o.at && placeSound(o.at, mix.near, mix.far).gain < 0.02) return;
  if (!admit(name, m.ctx.currentTime + (o.delay ?? 0), mix.gap)) return;
  voice(m, name, o, mix);
}

/** Semitones up the major scale for the nth gold block found (1-based): each find rings a step higher. */
const COIN_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
export function coinRate(n: number): number {
  const i = Math.max(0, Math.min(COIN_STEPS.length - 1, n - 1));
  return 2 ** (COIN_STEPS[i] / 12);
}

export type JingleName = "chime" | "stinger" | "fanfare" | "found" | "seek" | "count3" | "sent";

/** A jingle: notes of a sound at semitone offsets and times (s), and how far it dips the music while it plays. */
interface Jingle { notes: readonly (readonly [SfxName, number, number, number?])[]; duck?: number; length?: number }
export const JINGLES: Record<JingleName, Jingle> = {
  // the sound switched on: a small rising triad
  chime: { notes: [["note", 0, 0, 0.6], ["note", 4, 0.07, 0.6], ["note", 7, 0.14, 0.7]] },
  // an island's name on the title card: two soft bells, a fifth apart
  stinger: { notes: [["bell", -5, 0, 0.45], ["bell", 0, 0.16, 0.5]], duck: 0.15, length: 1 },
  // every gold block found
  fanfare: {
    notes: [["note", 0, 0, 0.8], ["note", 4, 0.11, 0.8], ["note", 7, 0.22, 0.8], ["note", 12, 0.33, 0.9], ["note", 7, 0.5, 0.7], ["note", 12, 0.6, 1], ["bell", 0, 0.6, 0.7], ["bell", 4, 0.9, 0.5]],
    duck: 0.55,
    length: 1.8,
  },
  // the hiding kid found
  found: { notes: [["note", 7, 0, 0.7], ["note", 11, 0.08, 0.7], ["note", 14, 0.16, 0.8], ["bell", 7, 0.26, 0.5]], duck: 0.35, length: 0.9 },
  // hide and seek starts: one, two, three ... go!
  seek: { notes: [["count", 0, 0], ["count", 0, 0.45], ["count", 0, 0.9], ["count", 7, 1.35, 1.2]] },
  // the next round: he counts again
  count3: { notes: [["count", 0, 0, 0.7], ["count", 2, 0.35, 0.7], ["count", 4, 0.7, 0.8]] },
  // the contact form went out
  sent: { notes: [["note", 7, 0, 0.6], ["note", 12, 0.09, 0.7]] },
};

/** Plays a jingle (once a second at most per jingle), dipping the music under it if it says so. */
export function playJingle(name: JingleName, o: Pick<SfxOptions, "volume" | "at"> = {}): void {
  if (isMuted()) return;
  if (!o.at && waking()) return playWhenAwake(() => playJingle(name, o));
  const m = liveMixer();
  if (!m || !zz) return;
  if (!admit(`jingle:${name}`, m.ctx.currentTime, 1)) return;
  const j = JINGLES[name];
  for (const [sound, semis, at, vol = 1] of j.notes) {
    voice(m, sound, { ...o, volume: (o.volume ?? 1) * vol, rate: 2 ** (semis / 12), delay: at, exact: true }, mixOf(sound));
  }
  if (j.duck) duckMusic(j.duck, j.length ?? 1);
}
