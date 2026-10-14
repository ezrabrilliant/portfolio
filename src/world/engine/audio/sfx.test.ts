import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ zzfx: vi.fn(), resume: vi.fn(() => Promise.resolve()) }));
vi.mock("zzfx", () => ({ zzfx: mocks.zzfx, ZZFX: { volume: 0.3, audioContext: { resume: mocks.resume } } }));

const load = () => import("@/world/engine/audio/sfx");
const NAMES = ["click", "hover", "punch", "burst", "jump", "land", "step", "print", "chat", "link", "bounce", "cart", "pop", "poof"];

beforeEach(() => {
  vi.resetModules();
  mocks.zzfx.mockClear();
  mocks.resume.mockClear();
});

describe("sfx", () => {
  it("starts muted and stays silent", async () => {
    const sfx = await load();
    expect(sfx.isMuted()).toBe(true);
    sfx.playSfx("click");
    expect(mocks.zzfx).not.toHaveBeenCalled();
  });

  it("plays presets after unmuting and resumes the audio context", async () => {
    const sfx = await load();
    sfx.setMuted(false);
    await sfx.whenAudioReady();
    sfx.playSfx("jump");
    expect(mocks.zzfx).toHaveBeenCalledWith(...sfx.SFX_PRESETS.jump);
    expect(mocks.resume).toHaveBeenCalled();
  });

  it("goes silent again when muted", async () => {
    const sfx = await load();
    sfx.setMuted(false);
    await sfx.whenAudioReady();
    sfx.setMuted(true);
    sfx.playSfx("land");
    expect(mocks.zzfx).not.toHaveBeenCalled();
  });

  it("has a usable preset for every sound name", async () => {
    const sfx = await load();
    expect(Object.keys(sfx.SFX_PRESETS).sort()).toEqual([...NAMES].sort());
    for (const params of Object.values(sfx.SFX_PRESETS)) {
      expect(params.length).toBeGreaterThanOrEqual(3);
      expect(params[0]).toBeGreaterThan(0);
      expect(params[0]).toBeLessThanOrEqual(1);
    }
  });

  it("stays silent and logs when zzfx fails to load", async () => {
    vi.resetModules();
    vi.doMock("zzfx", () => {
      throw new Error("zzfx load failed");
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const sfx = await import("@/world/engine/audio/sfx");

      expect(() => sfx.setMuted(false)).not.toThrow();
      await expect(sfx.whenAudioReady()).resolves.toBeUndefined();
      expect(() => sfx.playSfx("click")).not.toThrow();

      expect(warnSpy).toHaveBeenCalledOnce();
      const [msg] = warnSpy.mock.calls[0];
      expect(String(msg)).toContain("[sfx] audio failed to load");
    } finally {
      warnSpy.mockRestore();
      vi.doUnmock("zzfx");
      vi.resetModules();
    }
  });
});
