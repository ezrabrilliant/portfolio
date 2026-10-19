import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeBrowser, type FakeAudioContext, type FakeNode } from "./testAudio";

const mocks = vi.hoisted(() => ({ build: vi.fn(() => new Float32Array(800)), close: vi.fn(() => Promise.resolve()) }));
vi.mock("zzfx", () => ({ zzfx: vi.fn(), ZZFX: { volume: 0.3, sampleRate: 8000, audioContext: { close: mocks.close }, buildSamples: mocks.build } }));

const load = () => import("./sfx");
type Sfx = Awaited<ReturnType<typeof load>>;

let browser: ReturnType<typeof installFakeBrowser>;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  mocks.build.mockClear();
  browser = installFakeBrowser();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Switches the sound on and waits for the synth. */
async function on(): Promise<{ sfx: Sfx; ctx: FakeAudioContext }> {
  const sfx = await load();
  sfx.setMuted(false);
  await sfx.whenAudioReady();
  return { sfx, ctx: browser.ctx() };
}
const sources = (ctx: FakeAudioContext) => ctx.nodes.filter((n) => n.kind === "buffer" && n.buffer);

describe("sfx", () => {
  it("starts muted, makes no audio context, and stays silent", async () => {
    const sfx = await load();
    expect(sfx.isMuted()).toBe(true);
    sfx.playSfx("click");
    expect(browser.ctx()).toBeUndefined();
  });

  it("wakes the context inside the switching click itself, before any await (iOS)", async () => {
    const sfx = await load();
    sfx.setMuted(false);
    expect(browser.ctx().resume).toHaveBeenCalledTimes(1);
    expect(browser.ctx().state).toBe("running");
  });

  it("plays a rendered preset through a voice gain into the effects bus", async () => {
    const { sfx, ctx } = await on();
    sfx.playSfx("jump");
    expect(mocks.build).toHaveBeenCalledWith(...sfx.SFX_PRESETS.jump);
    const [src] = sources(ctx);
    expect(src.started).toBe(0);
    const voice = src.connected[0] as FakeNode;
    expect(voice.kind).toBe("gain");
    // and the voice reaches a bus (a gain) that is not the context's destination
    expect(voice.connected[0]).not.toBe(ctx.destination);
  });

  it("caches the rendered sound: playing it again renders nothing new", async () => {
    const { sfx, ctx } = await on();
    sfx.playSfx("click");
    ctx.currentTime = 1;
    sfx.playSfx("click");
    expect(mocks.build).toHaveBeenCalledTimes(1);
    expect(sources(ctx)).toHaveLength(2);
  });

  it("varies each play a little in pitch, and takes a caller's rate", async () => {
    const { sfx, ctx } = await on();
    const rates = new Set<number>();
    for (let i = 0; i < 6; i++) {
      ctx.currentTime = i;
      sfx.playSfx("stepGrass");
    }
    for (const s of sources(ctx)) rates.add(s.playbackRate.value);
    expect(rates.size).toBeGreaterThan(1);
    for (const r of rates) expect(Math.abs(r - 1)).toBeLessThanOrEqual(0.08 + 1e-9);
    ctx.currentTime = 10;
    sfx.playSfx("coin", { rate: 2 });
    expect(sources(ctx).at(-1)!.playbackRate.value).toBe(2);
  });

  it("goes silent again when muted, and lets the context sleep", async () => {
    const { sfx, ctx } = await on();
    sfx.setMuted(true);
    sfx.playSfx("land");
    expect(sources(ctx)).toHaveLength(0);
    vi.advanceTimersByTime(400);
    expect(ctx.suspend).toHaveBeenCalled();
  });

  it("has a usable preset for every sound name, and a jingle only of known sounds", async () => {
    const sfx = await load();
    for (const params of Object.values(sfx.SFX_PRESETS)) {
      expect(params.length).toBeGreaterThanOrEqual(3);
      expect(params[0]).toBeGreaterThan(0);
      expect(params[0]).toBeLessThanOrEqual(1);
    }
    for (const j of Object.values(sfx.JINGLES)) for (const [name] of j.notes) expect(sfx.SFX_PRESETS[name]).toBeDefined();
  });

  it("goes back off and says so when the synth fails to load", async () => {
    vi.doMock("zzfx", () => {
      throw new Error("zzfx load failed");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const sfx = await load();
      const heard = vi.fn();
      sfx.subscribeAudio(heard);
      expect(() => sfx.setMuted(false)).not.toThrow();
      await expect(sfx.whenAudioReady()).resolves.toBeUndefined();
      expect(() => sfx.playSfx("click")).not.toThrow();
      expect(sfx.isMuted()).toBe(true);
      expect(heard).toHaveBeenCalled();
      expect(String(warn.mock.calls[0][0])).toContain("[sfx] audio failed to load");
    } finally {
      warn.mockRestore();
      vi.doUnmock("zzfx");
    }
  });
});

describe("sfx anti-spam", () => {
  it("lets a sound through at most once per its gap", async () => {
    const { sfx, ctx } = await on();
    sfx.playSfx("hover");
    sfx.playSfx("hover");
    ctx.currentTime = 0.05;
    sfx.playSfx("hover");
    expect(sources(ctx)).toHaveLength(1);
    ctx.currentTime = 0.2;
    sfx.playSfx("hover");
    expect(sources(ctx)).toHaveLength(2);
  });

  it("admit keeps its own clock per key", async () => {
    const { admit } = await load();
    const last = new Map<string, number>();
    expect(admit("a", 0, 0.5, last)).toBe(true);
    expect(admit("a", 0.2, 0.5, last)).toBe(false);
    expect(admit("b", 0.2, 0.5, last)).toBe(true);
    expect(admit("a", 0.6, 0.5, last)).toBe(true);
  });

  it("caps the voices playing at once, cutting the oldest", async () => {
    const { sfx, ctx } = await on();
    const names = Object.keys(sfx.SFX_PRESETS) as (keyof typeof sfx.SFX_PRESETS)[];
    for (let i = 0; i < sfx.MAX_VOICES + 5; i++) sfx.playSfx(names[i]);
    const all = sources(ctx);
    expect(all).toHaveLength(sfx.MAX_VOICES + 5);
    expect(all.filter((s) => s.stopped === null)).toHaveLength(sfx.MAX_VOICES);
    expect(all[0].stopped).not.toBeNull();
  });
});

describe("placed sounds", () => {
  it("fall off with distance and pan to the listener's side", async () => {
    const { placeSound } = await import("./core");
    const ears = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
    expect(placeSound({ x: 1, y: 0, z: 0 }, 3, 20, ears).gain).toBe(1);
    expect(placeSound({ x: 30, y: 0, z: 0 }, 3, 20, ears).gain).toBe(0);
    const right = placeSound({ x: 8, y: 0, z: 0 }, 3, 20, ears);
    const left = placeSound({ x: -8, y: 0, z: 0 }, 3, 20, ears);
    expect(right.gain).toBeGreaterThan(0);
    expect(right.gain).toBeLessThan(1);
    expect(right.pan).toBeGreaterThan(0.5);
    expect(left.pan).toBeCloseTo(-right.pan, 9);
    // straight ahead: centred; never hard to one side
    expect(placeSound({ x: 0, y: 0, z: 8 }, 3, 20, ears).pan).toBeCloseTo(0, 9);
    expect(Math.abs(placeSound({ x: 0.5, y: 0, z: 0 }, 3, 20, ears).pan)).toBeLessThanOrEqual(0.8);
  });

  it("still play, unpanned, where there is no StereoPanner (older Safari)", async () => {
    const { sfx, ctx } = await on();
    (ctx as unknown as { createStereoPanner?: unknown }).createStereoPanner = undefined;
    sfx.setListener(0, 0, 0, 1, 0);
    sfx.playSfx("purr", { at: { x: 6, y: 0, z: 0 } });
    const [src] = sources(ctx);
    const voice = src.connected[0] as FakeNode;
    expect(voice.kind).toBe("gain");
    expect(voice.connected[0].kind).toBe("gain");
  });

  it("play quieter and to the side, and not at all out of reach", async () => {
    const { sfx, ctx } = await on();
    sfx.setListener(0, 0, 0, 1, 0);
    sfx.playSfx("purr", { at: { x: 100, y: 0, z: 0 } });
    expect(sources(ctx)).toHaveLength(0);
    sfx.playSfx("purr", { at: { x: 6, y: 0, z: 0 } });
    const [src] = sources(ctx);
    const voice = src.connected[0] as FakeNode;
    expect(voice.gain.value).toBeLessThan(0.32);
    const panner = voice.connected[0] as FakeNode;
    expect(panner.kind).toBe("panner");
    expect(panner.pan.value).toBeGreaterThan(0);
  });
});

describe("gold", () => {
  it("rings each block found a step higher", async () => {
    const { coinRate } = await load();
    expect(coinRate(1)).toBe(1);
    for (let n = 2; n <= 9; n++) expect(coinRate(n)).toBeGreaterThan(coinRate(n - 1));
    expect(coinRate(8)).toBeCloseTo(2, 9);
  });

  it("dips the music under the fanfare", async () => {
    const { sfx } = await on();
    const { getMixer } = await import("./core");
    sfx.playJingle("fanfare");
    const duck = getMixer()!.duck.gain as unknown as { calls: string[]; value: number };
    expect(duck.calls).toContain("target");
  });
});
