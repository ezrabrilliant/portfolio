/**
 * Ambient sound (polish #7): wind over the sea of clouds everywhere, swelling in slow gusts, crickets that come in with
 * the golden hour, and a few sources with a place, each as loud as it is near and heard from its side (the camera in
 * the tour, Ezra in Play): the POS grill's sizzle and the Bee island's buzzing bee. Built from noise and oscillators
 * (no files) on the ambience bus; it plays only with the sound on.
 */
import { falloff, listener, noiseSource, placeSound, type Mixer } from "./core";

export { falloff };

export interface AmbientSource { kind: "sizzle" | "buzz"; x: number; y: number; z: number }

interface Placed { gain: GainNode; pan: StereoPannerNode | null; src: AmbientSource; base: number }
interface Bed {
  ctx: AudioContext;
  out: GainNode;
  wind: GainNode;
  band: BiquadFilterNode;
  crickets: GainNode;
  placed: Placed[];
  /** every source started (stopped on the way out) and every node made (disconnected after) */
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  /** seconds to the next gust */
  gust: number;
}

/** The wind's resting level; a gust swells it to 1.6..2.6 times this. */
export const WIND = 0.026;
/** The crickets' level at full golden hour. */
const CRICKETS = 0.011;

let bed: Bed | null = null;

/** Seconds between gusts (random in this range). */
const GUST_EVERY = [7, 16] as const;

function osc(b: Bed, type: OscillatorType, hz: number): OscillatorNode {
  const o = b.ctx.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.start();
  b.sources.push(o);
  b.nodes.push(o);
  return o;
}

function gain(b: Bed, value: number): GainNode {
  const g = b.ctx.createGain();
  g.gain.value = value;
  b.nodes.push(g);
  return g;
}

function panner(b: Bed, value: number): StereoPannerNode | null {
  if (typeof b.ctx.createStereoPanner !== "function") return null;
  const p = b.ctx.createStereoPanner();
  p.pan.value = value;
  b.nodes.push(p);
  return p;
}

function noise(b: Bed): AudioBufferSourceNode {
  const n = noiseSource(b.ctx);
  n.start(0, Math.random() * 1.9);
  b.sources.push(n);
  b.nodes.push(n);
  return n;
}

function filter(b: Bed, type: BiquadFilterType, hz: number, q = 0.7): BiquadFilterNode {
  const f = b.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  f.Q.value = q;
  b.nodes.push(f);
  return f;
}

/** A cricket: a high tone pulsed fast (the wing's teeth), gated into chirps at a slower pace, off to one side. */
function cricket(b: Bed, hz: number, pulse: number, chirp: number, side: number): void {
  const tone = osc(b, "sine", hz);
  const teeth = gain(b, 0.5);
  const lfo = osc(b, "square", pulse);
  lfo.connect(gain(b, 0.5)).connect(teeth.gain);
  const gate = gain(b, 0.5);
  const lfo2 = osc(b, "square", chirp);
  lfo2.connect(gain(b, 0.5)).connect(gate.gain);
  const p = panner(b, side);
  tone.connect(teeth).connect(gate);
  if (p) gate.connect(p).connect(b.crickets);
  else gate.connect(b.crickets);
}

/** Starts the ambient layers for `sources` on the mixer's ambience bus, or stops them all (and frees them). */
export function setAmbientOn(m: Mixer | null, on: boolean, sources: readonly AmbientSource[] = []): void {
  if (on && m && !bed) {
    const ctx = m.ctx;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(m.ambient);
    const b: Bed = { ctx, out, wind: null!, band: null!, crickets: null!, placed: [], sources: [], nodes: [out], gust: GUST_EVERY[0] };
    bed = b;
    // wind: band-passed noise, breathing slowly, swelling in gusts (updateAmbient)
    b.band = filter(b, "bandpass", 420, 0.6);
    b.wind = gain(b, 0);
    const lfo = osc(b, "sine", 0.07);
    lfo.connect(gain(b, WIND * 0.25)).connect(b.wind.gain);
    noise(b).connect(b.band).connect(b.wind).connect(out);
    b.wind.gain.setValueAtTime(0, ctx.currentTime);
    b.wind.gain.linearRampToValueAtTime(WIND, ctx.currentTime + 3);
    // crickets, two of them a little apart, silent until the golden hour
    b.crickets = gain(b, 0);
    b.crickets.connect(out);
    cricket(b, 4300, 29, 1.7, -0.45);
    cricket(b, 4750, 33, 2.3, 0.5);
    for (const s of sources) {
      const g = gain(b, 0);
      const p = panner(b, 0);
      if (p) g.connect(p).connect(out);
      else g.connect(out);
      if (s.kind === "sizzle") {
        noise(b).connect(filter(b, "highpass", 3500)).connect(g);
        b.placed.push({ gain: g, pan: p, src: s, base: 0.05 });
      } else {
        const tone = osc(b, "sawtooth", 190);
        const body = gain(b, 0.6);
        osc(b, "sine", 28).connect(gain(b, 0.4)).connect(body.gain);
        tone.connect(filter(b, "lowpass", 900)).connect(body).connect(g);
        b.placed.push({ gain: g, pan: p, src: s, base: 0.025 });
      }
    }
  } else if (!on && bed) {
    const b = bed;
    bed = null;
    const t = b.ctx.currentTime;
    b.out.gain.cancelScheduledValues(t);
    b.out.gain.setTargetAtTime(0, t, 0.3);
    // stop every source after the fade, then let go of the graph
    for (const s of b.sources) {
      try {
        s.stop(t + 1.5);
      } catch {
        // already stopped
      }
    }
    window.setTimeout(() => b.nodes.forEach((n) => n.disconnect()), 1800);
  }
}

/** Is the ambience up (for tests)? */
export function ambientOn(): boolean {
  return bed !== null;
}

/**
 * Each frame (`dt` seconds): the placed layers' levels and sides for the listener (core.setListener), the gusts, and
 * the crickets at `night` (0 = day .. 1 = full golden hour).
 */
export function updateAmbient(dt: number, night: number): void {
  const b = bed;
  if (!b) return;
  const t = b.ctx.currentTime;
  for (const l of b.placed) {
    const heard = placeSound(l.src, 3, 22, listener);
    l.gain.gain.setTargetAtTime(l.base * heard.gain, t, 0.25);
    l.pan?.pan.setTargetAtTime(heard.pan, t, 0.2);
  }
  b.crickets.gain.setTargetAtTime(CRICKETS * Math.max(0, Math.min(1, night)), t, 1.5);
  b.gust -= dt;
  if (b.gust <= 0) {
    b.gust = GUST_EVERY[0] + Math.random() * (GUST_EVERY[1] - GUST_EVERY[0]);
    const peak = WIND * (1.6 + Math.random());
    const hold = 2 + Math.random() * 2;
    b.wind.gain.cancelScheduledValues(t);
    b.wind.gain.setTargetAtTime(peak, t, 1.1);
    b.wind.gain.setTargetAtTime(WIND, t + hold, 1.8);
    b.band.frequency.cancelScheduledValues(t);
    b.band.frequency.setTargetAtTime(560 + Math.random() * 160, t, 1.1);
    b.band.frequency.setTargetAtTime(420, t + hold, 1.8);
  }
}
