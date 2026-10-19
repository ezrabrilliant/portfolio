/**
 * The audio engine's core: one AudioContext and its mixer (music, effects and ambience buses → master → a soft limiter →
 * the speakers), the sound switch (the one source of truth for "muted", kept in this browser), waking the context inside
 * a user gesture (iOS resumes only there), going quiet while the tab is hidden, and the listener (where the ears are and
 * which way is right) that placed sounds are heard from. Everything else in engine/audio plays through it.
 */

export interface Mixer {
  ctx: AudioContext;
  master: GainNode;
  /** music → duck (dipped under a fanfare) → master */
  music: GainNode;
  duck: GainNode;
  sfx: GainNode;
  ambient: GainNode;
}

/** Bus levels: effects sit a little forward of the music, the ambience under both. */
export const LEVELS = { master: 0.9, music: 0.8, sfx: 1, ambient: 0.9 } as const;

const SOUND_KEY = "voxel.sound";
const inBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

let mixer: Mixer | null = null;
let muted = true;
let hidden = false;
let armed = false;
let quietTimer = 0;
const subs = new Set<() => void>();
const wakeHooks = new Set<(m: Mixer) => void>();

function emit(): void {
  for (const s of subs) s();
}

/** Listens for any change: the switch, the context waking or sleeping, the tab hiding. */
export function subscribeAudio(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** Runs `fn` each time the context wakes (and at once if it is awake): the effects load their synth on it. */
export function onAudioWake(fn: (m: Mixer) => void): void {
  wakeHooks.add(fn);
  if (mixer && !muted) fn(mixer);
}

export function isMuted(): boolean {
  return muted;
}

export function isHidden(): boolean {
  return hidden;
}

/** The mixer once the sound has been on in this visit (it is never torn down), else null. */
export function getMixer(): Mixer | null {
  return mixer;
}

/** The mixer while sound can be heard right now (on, tab shown, context running), else null. */
export function liveMixer(): Mixer | null {
  return mixer && !muted && !hidden && mixer.ctx.state === "running" ? mixer : null;
}

/** The mixer while the sound is on (it may still be waiting for a gesture or the tab): music and ambience run on it. */
export function audioAwake(): Mixer | null {
  return mixer && !muted ? mixer : null;
}

/**
 * Resolves once the context is running (at once if it is, or there is none yet). `resume()` changes the state only
 * after the audio thread has started, so a sound played right after switching on would otherwise be dropped.
 */
export function whenRunning(): Promise<void> {
  const m = mixer;
  if (!m || m.ctx.state === "running") return Promise.resolve();
  return new Promise((resolve) => {
    const off = subscribeAudio(() => {
      if (m.ctx.state !== "running") return;
      off();
      resolve();
    });
  });
}

/** Something the sound needs did not load: it goes back off (and says why in the console), so the button never lies. */
export function reportAudioFailure(why: string, err?: unknown): void {
  console.warn(`[sfx] audio failed to load (${why}); sound stays off`, err);
  muted = true;
  quiet();
  emit();
}

function buildMixer(): Mixer | null {
  // older iOS / Safari (< 14.1) only has the prefixed constructor
  const Ctor = typeof AudioContext !== "undefined" ? AudioContext : (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const comp = ctx.createDynamicsCompressor();
  // a soft limiter: only peaks (a fanfare over the music) are pressed
  comp.threshold.value = -10;
  comp.knee.value = 8;
  comp.ratio.value = 10;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  comp.connect(ctx.destination);
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp);
  const bus = (level: number, to: AudioNode) => {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(to);
    return g;
  };
  const duck = bus(1, master);
  const m: Mixer = { ctx, master, duck, music: bus(LEVELS.music, duck), sfx: bus(LEVELS.sfx, master), ambient: bus(LEVELS.ambient, master) };
  ctx.addEventListener?.("statechange", emit);
  return m;
}

/** Wakes the context: call it inside a user gesture (synchronously, or iOS keeps it asleep). */
function wake(): void {
  if (muted) return;
  if (!mixer) {
    try {
      mixer = buildMixer();
    } catch (err) {
      reportAudioFailure("no audio context", err);
      return;
    }
    if (!mixer) {
      reportAudioFailure("no Web Audio");
      return;
    }
  }
  if (hidden) return;
  const m = mixer;
  window.clearTimeout(quietTimer);
  if (m.ctx.state !== "running") void m.ctx.resume().catch(() => {});
  m.master.gain.cancelScheduledValues(m.ctx.currentTime);
  m.master.gain.setTargetAtTime(LEVELS.master, m.ctx.currentTime, 0.08);
  for (const h of wakeHooks) h(m);
  emit();
}

/** Fades the master out and then lets the context sleep (muted, or the tab hidden). */
function quiet(): void {
  const m = mixer;
  if (!m) return;
  m.master.gain.cancelScheduledValues(m.ctx.currentTime);
  m.master.gain.setTargetAtTime(0, m.ctx.currentTime, 0.05);
  window.clearTimeout(quietTimer);
  quietTimer = window.setTimeout(() => {
    if ((muted || hidden) && m.ctx.state === "running") void m.ctx.suspend().catch(() => {});
  }, 300);
}

const onGesture = () => {
  if (muted || hidden) return;
  const state: string | undefined = mixer?.ctx.state;
  if (!mixer || state === "suspended" || state === "interrupted") wake();
};

const onVisibility = () => {
  const now = document.visibilityState === "hidden";
  if (now === hidden) return;
  hidden = now;
  if (hidden) quiet();
  else if (!muted) wake();
  emit();
};

/** Listens (once) for the gestures that may wake the context and for the tab hiding and showing. */
function armGestures(): void {
  if (armed || !inBrowser()) return;
  armed = true;
  for (const type of ["pointerdown", "pointerup", "keydown", "touchend", "click"]) window.addEventListener(type, onGesture, { capture: true, passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  hidden = document.visibilityState === "hidden";
}

/**
 * The visitor's saved choice (first visit: off). A saved "on" cannot start the sound without a gesture, so it arms the
 * gesture listeners: the first click, key or touch anywhere wakes it. Returns whether the sound is off.
 */
export function restoreSoundPref(): boolean {
  if (!inBrowser()) return muted;
  try {
    if (localStorage.getItem(SOUND_KEY) === "1") muted = false;
  } catch {
    // storage blocked: off for this visit
  }
  armGestures();
  return muted;
}

/** The sound switch. Call it from the click itself: switching on wakes the context in that gesture. */
export function setMuted(next: boolean): void {
  if (next === muted && (next || mixer)) return;
  muted = next;
  try {
    if (inBrowser()) localStorage.setItem(SOUND_KEY, next ? "0" : "1");
  } catch {
    // storage blocked: it holds for this visit
  }
  if (!inBrowser()) {
    emit();
    return;
  }
  armGestures();
  if (next) quiet();
  else wake();
  emit();
}

/** Dips the music by `depth` (0..1) for `seconds`, then lets it back (a stinger, a fanfare). */
export function duckMusic(depth: number, seconds: number): void {
  const m = liveMixer();
  if (!m) return;
  const t = m.ctx.currentTime;
  m.duck.gain.cancelScheduledValues(t);
  m.duck.gain.setTargetAtTime(1 - depth, t, 0.04);
  m.duck.gain.setTargetAtTime(1, t + seconds, 0.5);
}

// ---------------------------------------------------------------------------------------------------------------------
// the listener and placed sounds

/** Where the ears are (Ezra in Play, the camera in the tour) and the camera's right, flat on the ground. */
export const listener = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };

export function setListener(x: number, y: number, z: number, rightX: number, rightZ: number): void {
  listener.x = x;
  listener.y = y;
  listener.z = z;
  const l = Math.hypot(rightX, rightZ) || 1;
  listener.rx = rightX / l;
  listener.rz = rightZ / l;
}

/** A placed sound's loudness at `dist` blocks: full within `near`, gone past `far`. */
export function falloff(dist: number, near: number, far: number): number {
  if (dist <= near) return 1;
  if (dist >= far) return 0;
  const u = (dist - near) / (far - near);
  return (1 - u) * (1 - u);
}

/** How loud (0..1) and where in the stereo field (-1 left .. 1 right) a sound at `p` is for the listener. */
export function placeSound(p: { x: number; y: number; z: number }, near = 3, far = 26, l = listener): { gain: number; pan: number } {
  const dx = p.x - l.x, dy = p.y - l.y, dz = p.z - l.z;
  const flat = Math.hypot(dx, dz);
  // never hard-panned: a source right beside the ears still reaches both
  const side = flat > 1e-3 ? (dx * l.rx + dz * l.rz) / Math.max(flat, 1.5) : 0;
  return { gain: falloff(Math.hypot(dx, dy, dz), near, far), pan: Math.max(-0.8, Math.min(0.8, side * 0.8)) };
}


const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, made once per context and shared by every noise source (wind, sizzle, rattle, shaker). */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

/** A looping noise source on the shared buffer (start it at a random offset, so two of them never line up). */
export function noiseSource(ctx: BaseAudioContext): AudioBufferSourceNode {
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx);
  n.loop = true;
  return n;
}
