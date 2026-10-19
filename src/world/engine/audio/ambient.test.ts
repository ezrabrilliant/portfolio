import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeBrowser } from "./testAudio";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function awake() {
  const b = installFakeBrowser();
  const core = await import("./core");
  core.setMuted(false);
  return { b, ctx: b.ctx(), core, mixer: core.getMixer()! };
}

describe("ambience", () => {
  const sources = [
    { kind: "sizzle" as const, x: 10, y: 0, z: 0 },
    { kind: "buzz" as const, x: -10, y: 0, z: 0 },
  ];

  it("stopping actually stops every source it started and lets go of its nodes (no leak)", async () => {
    const { ctx, mixer } = await awake();
    const amb = await import("./ambient");
    amb.setAmbientOn(mixer, true, sources);
    const started = ctx.playing();
    expect(started.length).toBeGreaterThan(5);
    amb.setAmbientOn(null, false);
    expect(amb.ambientOn()).toBe(false);
    for (const s of started) expect(s.stopped).not.toBeNull();
    vi.advanceTimersByTime(2000);
    for (const s of started) expect(s.disconnected).toBeGreaterThan(0);
  });

  it("starts again cleanly after a stop", async () => {
    const { ctx, mixer } = await awake();
    const amb = await import("./ambient");
    amb.setAmbientOn(mixer, true, sources);
    amb.setAmbientOn(null, false);
    amb.setAmbientOn(mixer, true, sources);
    expect(amb.ambientOn()).toBe(true);
    expect(ctx.playing().length).toBeGreaterThan(5);
  });

  it("all its noise plays from one shared buffer", async () => {
    const { ctx, mixer } = await awake();
    const spy = vi.spyOn(ctx, "createBuffer");
    const amb = await import("./ambient");
    amb.setAmbientOn(mixer, true, sources);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("hears a placed source from its side", async () => {
    const { ctx, core, mixer } = await awake();
    const amb = await import("./ambient");
    amb.setAmbientOn(mixer, true, sources);
    core.setListener(0, 0, 0, 1, 0);
    amb.updateAmbient(0.016, 0);
    const pans = ctx.nodes.filter((n) => n.kind === "panner").map((n) => n.pan.value);
    // the crickets' two fixed sides, then the sizzle (to the right) and the buzz (to the left)
    expect(pans.some((p) => p > 0.5)).toBe(true);
    expect(pans.some((p) => p < -0.5)).toBe(true);
  });
});

describe("loops", () => {
  it("builds a loop when its level rises, and takes it down after a quiet while", async () => {
    const { ctx } = await awake();
    const loops = await import("./loops");
    loops.setLoop("fall", 0, 0.016);
    expect(loops.loopCount()).toBe(0);
    loops.setLoop("rail", 1, 0.016, 6);
    expect(loops.loopCount()).toBe(1);
    const started = ctx.playing();
    expect(started.length).toBe(2);
    for (let i = 0; i < 120; i++) loops.setLoop("rail", 0, 0.016);
    expect(loops.loopCount()).toBe(0);
    for (const s of started) expect(s.stopped).not.toBeNull();
    vi.advanceTimersByTime(600);
    for (const s of started) expect(s.disconnected).toBeGreaterThan(0);
  });

  it("comes down at once with the sound off", async () => {
    const { core } = await awake();
    const loops = await import("./loops");
    loops.setLoop("fall", 0.8, 0.016);
    expect(loops.loopCount()).toBe(1);
    core.setMuted(true);
    loops.setLoop("fall", 0.8, 0.016);
    expect(loops.loopCount()).toBe(0);
  });
});
