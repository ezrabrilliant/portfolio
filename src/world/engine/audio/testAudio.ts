/**
 * A stand-in Web Audio and browser (window, document, localStorage) for the audio engine's tests, which run in Node:
 * just enough of each to build the graph, and a record of what was started, stopped and disconnected.
 */
import { vi } from "vitest";

export class FakeParam {
  value: number;
  calls: string[] = [];
  constructor(v = 0) {
    this.value = v;
  }
  setValueAtTime(v: number) {
    this.calls.push("set");
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number) {
    this.calls.push("ramp");
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number) {
    // a browser throws here: an exponential ramp cannot reach zero
    if (v <= 0) throw new RangeError(`exponentialRampToValueAtTime(${v})`);
    this.calls.push("exp");
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number) {
    this.calls.push("target");
    this.value = v;
    return this;
  }
  cancelScheduledValues() {
    this.calls.push("cancel");
    return this;
  }
}

export class FakeNode {
  kind: string;
  connected: FakeNode[] = [];
  disconnected = 0;
  started: number | null = null;
  stopped: number | null = null;
  onended: (() => void) | null = null;
  gain = new FakeParam(1);
  pan = new FakeParam(0);
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
  Q = new FakeParam(1);
  delayTime = new FakeParam(0);
  playbackRate = new FakeParam(1);
  threshold = new FakeParam(0);
  knee = new FakeParam(0);
  ratio = new FakeParam(1);
  attack = new FakeParam(0);
  release = new FakeParam(0);
  type = "";
  loop = false;
  buffer: { duration: number } | null = null;
  constructor(kind: string) {
    this.kind = kind;
  }
  connect<T>(to: T): T {
    this.connected.push(to as unknown as FakeNode);
    return to;
  }
  disconnect() {
    this.disconnected++;
  }
  start(at = 0) {
    // a browser throws here too: a source starts once
    if (this.started !== null) throw new Error("start twice");
    this.started = at;
  }
  stop(at = 0) {
    if (this.started === null) throw new Error("stop before start");
    this.stopped = at;
  }
}

export class FakeAudioContext {
  static all: FakeAudioContext[] = [];
  currentTime = 0;
  sampleRate = 8000;
  state: string = "suspended";
  destination = new FakeNode("destination");
  nodes: FakeNode[] = [];
  listeners = new Map<string, () => void>();
  resume = vi.fn(() => {
    this.state = "running";
    this.listeners.get("statechange")?.();
    return Promise.resolve();
  });
  suspend = vi.fn(() => {
    this.state = "suspended";
    this.listeners.get("statechange")?.();
    return Promise.resolve();
  });
  close = vi.fn(() => Promise.resolve());
  constructor() {
    FakeAudioContext.all.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, fn);
  }
  private make(kind: string) {
    const n = new FakeNode(kind);
    this.nodes.push(n);
    return n;
  }
  createGain() {
    return this.make("gain");
  }
  createBiquadFilter() {
    return this.make("filter");
  }
  createDelay() {
    return this.make("delay");
  }
  createOscillator() {
    return this.make("osc");
  }
  createBufferSource() {
    return this.make("buffer");
  }
  createStereoPanner() {
    return this.make("panner");
  }
  createDynamicsCompressor() {
    return this.make("compressor");
  }
  createBuffer(_ch: number, length: number, rate: number) {
    const data = new Float32Array(length);
    return { length, duration: length / rate, getChannelData: () => data };
  }
  /** Sources started and not yet stopped. */
  playing(kind?: string) {
    return this.nodes.filter((n) => n.started !== null && n.stopped === null && (!kind || n.kind === kind));
  }
}

/** A window, document and localStorage of our own (Node has none), and the fake AudioContext as the global one. */
export function installFakeBrowser(saved: Record<string, string> = {}) {
  FakeAudioContext.all = [];
  const win = new EventTarget() as EventTarget & Record<string, unknown>;
  win.setTimeout = (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number;
  win.clearTimeout = (id: number) => clearTimeout(id);
  win.setInterval = (fn: () => void, ms: number) => setInterval(fn, ms) as unknown as number;
  win.clearInterval = (id: number) => clearInterval(id);
  const doc = new EventTarget() as EventTarget & { visibilityState: string };
  doc.visibilityState = "visible";
  const store = new Map(Object.entries(saved));
  const localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  return {
    store,
    /** a click, key or touch somewhere on the page */
    gesture: (type = "pointerdown") => win.dispatchEvent(new Event(type)),
    /** the tab hidden (true) or shown again */
    setHidden: (hidden: boolean) => {
      doc.visibilityState = hidden ? "hidden" : "visible";
      doc.dispatchEvent(new Event("visibilitychange"));
    },
    ctx: () => FakeAudioContext.all[0],
  };
}
