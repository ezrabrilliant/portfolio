import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeBrowser } from "./testAudio";

const load = () => import("./core");

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

describe("the sound switch", () => {
  it("is off on a first visit, and keeps the visitor's choice in this browser", async () => {
    const b = installFakeBrowser();
    const core = await load();
    expect(core.restoreSoundPref()).toBe(true);
    core.setMuted(false);
    expect(b.store.get("voxel.sound")).toBe("1");
    core.setMuted(true);
    expect(b.store.get("voxel.sound")).toBe("0");
  });

  it("a saved 'on' shows on at once but waits for the first gesture to start the audio", async () => {
    const b = installFakeBrowser({ "voxel.sound": "1" });
    const core = await load();
    expect(core.restoreSoundPref()).toBe(false);
    expect(core.isMuted()).toBe(false);
    expect(b.ctx()).toBeUndefined();
    const heard = vi.fn();
    core.subscribeAudio(heard);
    b.gesture("keydown");
    expect(b.ctx().resume).toHaveBeenCalledTimes(1);
    expect(core.liveMixer()).not.toBeNull();
    expect(heard).toHaveBeenCalled();
  });

  it("a saved 'off' arms nothing: a gesture leaves the audio alone", async () => {
    const b = installFakeBrowser({ "voxel.sound": "0" });
    const core = await load();
    expect(core.restoreSoundPref()).toBe(true);
    b.gesture();
    expect(b.ctx()).toBeUndefined();
  });

  it("wakes a context the system put to sleep (iOS 'interrupted') on the next gesture", async () => {
    const b = installFakeBrowser();
    const core = await load();
    core.setMuted(false);
    const ctx = b.ctx();
    ctx.state = "interrupted";
    expect(core.liveMixer()).toBeNull();
    b.gesture("touchend");
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(core.liveMixer()).not.toBeNull();
  });

  it("whenRunning waits for the context to actually run (resume() changes the state only later)", async () => {
    const b = installFakeBrowser();
    const core = await load();
    core.setMuted(false);
    const ctx = b.ctx();
    // the audio thread has not confirmed yet: the state lags the resume() call
    ctx.state = "suspended";
    let ran = false;
    void core.whenRunning().then(() => {
      ran = true;
    });
    await Promise.resolve();
    expect(ran).toBe(false);
    ctx.state = "running";
    ctx.listeners.get("statechange")?.();
    await Promise.resolve();
    expect(ran).toBe(true);
    await expect(core.whenRunning()).resolves.toBeUndefined();
  });

  it("tells listeners when the context changes state", async () => {
    const b = installFakeBrowser();
    const core = await load();
    core.setMuted(false);
    const heard = vi.fn();
    core.subscribeAudio(heard);
    void b.ctx().suspend();
    expect(heard).toHaveBeenCalled();
  });
});

describe("a hidden tab", () => {
  it("fades out and sleeps while hidden, and wakes when shown with the sound on", async () => {
    const b = installFakeBrowser();
    const core = await load();
    core.setMuted(false);
    const ctx = b.ctx();
    b.setHidden(true);
    expect(core.isHidden()).toBe(true);
    expect(core.liveMixer()).toBeNull();
    expect(core.getMixer()!.master.gain.value).toBe(0);
    vi.advanceTimersByTime(400);
    expect(ctx.suspend).toHaveBeenCalled();
    // a gesture while hidden (unlikely, but) does not wake it
    b.gesture();
    expect(ctx.state).toBe("suspended");
    b.setHidden(false);
    expect(ctx.state).toBe("running");
    expect(core.liveMixer()).not.toBeNull();
  });

  it("stays asleep when shown again with the sound off", async () => {
    const b = installFakeBrowser();
    const core = await load();
    core.setMuted(false);
    core.setMuted(true);
    vi.advanceTimersByTime(400);
    const ctx = b.ctx();
    b.setHidden(true);
    b.setHidden(false);
    expect(ctx.state).toBe("suspended");
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });
});

describe("the mixer", () => {
  it("runs music, effects and ambience into a master through a limiter, not straight to the speakers", async () => {
    const b = installFakeBrowser();
    const core = await load();
    core.setMuted(false);
    const m = core.getMixer()!;
    const ctx = b.ctx();
    const comp = ctx.nodes.find((n) => n.kind === "compressor")!;
    expect(comp.connected).toContain(ctx.destination);
    const into = (n: unknown) => (n as { connected: unknown[] }).connected[0];
    expect(into(m.master)).toBe(comp);
    expect(into(m.sfx)).toBe(m.master);
    expect(into(m.ambient)).toBe(m.master);
    expect(into(m.music)).toBe(m.duck);
    expect(into(m.duck)).toBe(m.master);
  });

  it("shares one noise buffer between every noise source", async () => {
    const b = installFakeBrowser();
    const core = await load();
    core.setMuted(false);
    const ctx = b.ctx();
    const spy = vi.spyOn(ctx, "createBuffer");
    core.noiseSource(ctx as unknown as AudioContext);
    core.noiseSource(ctx as unknown as AudioContext);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
