/**
 * Ambient sound (polish #7): wind over the sea of clouds everywhere, and a few sources with a place, each as loud as
 * it is near (the camera in the tour, Ezra in Play): the POS grill's sizzle and the Bee island's buzzing bee. Built from
 * noise and oscillators (no files); it plays only with the sound on.
 */

/** A placed sound's loudness at `dist` blocks: full within `near`, gone past `far`. */
export function falloff(dist: number, near: number, far: number): number {
  if (dist <= near) return 1;
  if (dist >= far) return 0;
  const u = (dist - near) / (far - near);
  return (1 - u) * (1 - u);
}

export interface AmbientSource { kind: "sizzle" | "buzz"; x: number; y: number; z: number }

interface Layer { gain: GainNode; src: AmbientSource | null; base: number }
let layers: Layer[] = [];
let ctxRef: AudioContext | null = null;

function noise(ctx: AudioContext): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  n.loop = true;
  return n;
}

/** Starts the ambient layers for `sources` on `ctx`, or stops them all. */
export function setAmbientOn(ctx: AudioContext | null, on: boolean, sources: readonly AmbientSource[] = []): void {
  if (on && ctx && !ctxRef) {
    ctxRef = ctx;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(ctx.destination);
    // wind: band-passed noise, its level breathing slowly
    const wind = noise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 0.6;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 0.012;
    lfo.connect(lg).connect(wg.gain);
    wind.connect(bp).connect(wg).connect(out);
    wind.start();
    lfo.start();
    wg.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 3);
    layers = [{ gain: wg, src: null, base: 0.03 }];
    for (const s of sources) {
      const g = ctx.createGain();
      g.gain.value = 0;
      if (s.kind === "sizzle") {
        const n = noise(ctx);
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 3500;
        n.connect(hp).connect(g).connect(out);
        n.start();
        layers.push({ gain: g, src: s, base: 0.05 });
      } else {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = 190;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        const trem = ctx.createOscillator();
        trem.frequency.value = 28;
        const tg = ctx.createGain();
        tg.gain.value = 0.4;
        const body = ctx.createGain();
        body.gain.value = 0.6;
        trem.connect(tg).connect(body.gain);
        o.connect(lp).connect(body).connect(g).connect(out);
        o.start();
        trem.start();
        layers.push({ gain: g, src: s, base: 0.025 });
      }
    }
  } else if (!on && ctxRef) {
    const ctx = ctxRef;
    for (const l of layers) l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    const old = layers;
    window.setTimeout(() => old.forEach((l) => l.gain.disconnect()), 2000);
    layers = [];
    ctxRef = null;
  }
}

/** Each frame: the placed layers' levels for a listener at (x, y, z). */
export function updateAmbient(x: number, y: number, z: number): void {
  if (!ctxRef) return;
  for (const l of layers) {
    if (!l.src) continue;
    const d = Math.hypot(l.src.x - x, l.src.y - y, l.src.z - z);
    l.gain.gain.setTargetAtTime(l.base * falloff(d, 3, 22), ctxRef.currentTime, 0.25);
  }
}
