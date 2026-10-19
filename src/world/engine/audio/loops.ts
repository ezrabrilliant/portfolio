import { liveMixer, noiseSource, type Mixer } from "./core";

/**
 * Continuous effects that follow a level each frame instead of playing once: the wind rushing past Ezra as he falls,
 * and the cart's rattle on its rail. Each is built on the effects bus the first time its level rises, and taken down
 * (sources stopped, nodes disconnected) once it has been silent for a while.
 */
export type LoopName = "fall" | "rail";

interface Loop { ctx: AudioContext; out: GainNode; filter: BiquadFilterNode; sources: AudioScheduledSourceNode[]; nodes: AudioNode[]; clack?: OscillatorNode; quiet: number }

/** Seconds a loop may sit silent before it is taken down. */
const IDLE = 1.5;
const loops = new Map<LoopName, Loop>();

function build(m: Mixer, name: LoopName): Loop {
  const ctx = m.ctx;
  const noise = noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  const out = ctx.createGain();
  out.gain.value = 0;
  const loop: Loop = { ctx, out, filter, sources: [noise], nodes: [noise, filter, out], quiet: 0 };
  if (name === "fall") {
    // rushing air: band-passed noise whose band climbs with the speed
    filter.type = "bandpass";
    filter.frequency.value = 300;
    filter.Q.value = 0.7;
    noise.connect(filter).connect(out);
  } else {
    // rail: a low rumble, and a clack each time a wheel crosses a joint (noise gated by a pulse at the cart's pace)
    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.Q.value = 0.8;
    noise.connect(filter).connect(out);
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 1800;
    hp.Q.value = 2;
    // the gate swings 0..0.36 with the square: the clack is on half of each pulse
    const gate = ctx.createGain();
    gate.gain.value = 0.18;
    const clack = ctx.createOscillator();
    clack.type = "square";
    clack.frequency.value = 4;
    const depth = ctx.createGain();
    depth.gain.value = 0.18;
    clack.connect(depth).connect(gate.gain);
    noise.connect(hp).connect(gate).connect(out);
    clack.start();
    loop.clack = clack;
    loop.sources.push(clack);
    loop.nodes.push(hp, gate, clack, depth);
  }
  out.connect(m.sfx);
  noise.start(0, Math.random() * 1.9);
  return loop;
}

function teardown(name: LoopName, l: Loop): void {
  loops.delete(name);
  const t = l.ctx.currentTime;
  l.out.gain.cancelScheduledValues(t);
  l.out.gain.setTargetAtTime(0, t, 0.05);
  for (const s of l.sources) {
    try {
      s.stop(t + 0.3);
    } catch {
      // already stopped
    }
  }
  window.setTimeout(() => l.nodes.forEach((n) => n.disconnect()), 500);
}

/**
 * Each frame: a loop's level (0..1) and, for the rail, the cart's speed in blocks a second. A level of 0 lets it fall
 * silent (and come down after a while); `dt` is the frame's seconds.
 */
export function setLoop(name: LoopName, level: number, dt: number, speed = 0): void {
  let l = loops.get(name);
  const m = liveMixer();
  if (!m || (l && l.ctx !== m.ctx)) {
    if (l) teardown(name, l);
    return;
  }
  if (!l) {
    if (level <= 0.01) return;
    l = build(m, name);
    loops.set(name, l);
  }
  const t = l.ctx.currentTime;
  const k = Math.max(0, Math.min(1, level));
  if (name === "fall") {
    l.filter.frequency.setTargetAtTime(300 + 1700 * k, t, 0.1);
    l.out.gain.setTargetAtTime(0.32 * k ** 1.5, t, 0.08);
  } else {
    l.out.gain.setTargetAtTime(0.5 * k, t, 0.15);
    l.clack?.frequency.setTargetAtTime(Math.max(1.5, speed * 1.4), t, 0.2);
    l.filter.frequency.setTargetAtTime(180 + speed * 25, t, 0.2);
  }
  l.quiet = k > 0.01 ? 0 : l.quiet + dt;
  if (l.quiet > IDLE) teardown(name, l);
}

/** Takes every loop down at once (the sound switched off). */
export function stopLoops(): void {
  for (const [name, l] of loops) teardown(name, l);
}

/** For tests: how many loops are up. */
export function loopCount(): number {
  return loops.size;
}
