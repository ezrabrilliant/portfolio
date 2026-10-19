import { beforeEach, describe, expect, it, vi } from "vitest";

// the audio engine owns the switch: a small stand-in that holds it and tells its listeners
const audio = vi.hoisted(() => {
  const subs = new Set<() => void>();
  const s = { muted: false, subs };
  return {
    s,
    setMuted: vi.fn((next: boolean) => {
      s.muted = next;
      subs.forEach((f) => f());
    }),
  };
});
vi.mock("@/world/engine/audio/core", () => ({
  setMuted: audio.setMuted,
  isMuted: () => audio.s.muted,
  restoreSoundPref: () => audio.s.muted,
  subscribeAudio: (f: () => void) => {
    audio.s.subs.add(f);
    return () => audio.s.subs.delete(f);
  },
}));

import { setMuted } from "@/world/engine/audio/core";
import { useWorld } from "./store";

// what the store started with: the engine's restored choice (on, with nothing saved)
const startedMuted = useWorld.getState().muted;

describe("useWorld", () => {
  beforeEach(() => {
    useWorld.setState({ mode: "tour", activeIsland: "hero", muted: false, hoveredId: null, prompt: null, ready: false, closeupId: null });
    vi.mocked(setMuted).mockClear();
    audio.s.muted = false;
  });

  it("starts in tour mode, sound on, on the hero island", () => {
    const s = useWorld.getState();
    expect(s.mode).toBe("tour");
    expect(startedMuted).toBe(false);
    expect(s.activeIsland).toBe("hero");
  });

  it("toggleMuted asks the audio engine, and shows what it says", () => {
    useWorld.getState().toggleMuted();
    expect(setMuted).toHaveBeenCalledWith(true);
    expect(useWorld.getState().muted).toBe(true);
    useWorld.getState().toggleMuted();
    expect(setMuted).toHaveBeenLastCalledWith(false);
    expect(useWorld.getState().muted).toBe(false);
  });

  it("follows the engine when it switches the sound off by itself (a synth that failed to load)", () => {
    expect(useWorld.getState().muted).toBe(false);
    audio.setMuted(true);
    expect(useWorld.getState().muted).toBe(true);
  });

  it("has no light-mode switch: the quality is the device's (and the frame-rate monitor's)", () => {
    const s = useWorld.getState() as unknown as Record<string, unknown>;
    expect(s.powerSave).toBeUndefined();
    expect(s.togglePowerSave).toBeUndefined();
  });

  it("change-guarded setters do not notify when the value is unchanged", () => {
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    useWorld.getState().setActiveIsland("hero");
    useWorld.getState().setHovered(null);
    useWorld.getState().setPrompt(null);
    expect(listener).not.toHaveBeenCalled();
    useWorld.getState().setActiveIsland("gtid");
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("Play waits for the built world: setMode('play') is a no-op until ready", () => {
    useWorld.getState().setMode("play");
    expect(useWorld.getState().mode).toBe("tour");
    useWorld.getState().setReady(true);
    useWorld.getState().setMode("play");
    expect(useWorld.getState().mode).toBe("play");
    useWorld.getState().setMode("tour");
    expect(useWorld.getState().mode).toBe("tour");
  });

  it("setPrompt compares by id and label", () => {
    useWorld.getState().setPrompt({ id: "a", label: "Print a receipt" });
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    useWorld.getState().setPrompt({ id: "a", label: "Print a receipt" });
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("setPrompt updates when only the label changes on the same id", () => {
    useWorld.getState().setPrompt({ id: "gtid-board", label: "Show mods online" });
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    useWorld.getState().setPrompt({ id: "gtid-board", label: "Show price chart" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useWorld.getState().prompt).toEqual({ id: "gtid-board", label: "Show price chart" });
    unsub();
  });

  it("setCloseup is change-guarded", () => {
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    useWorld.getState().setCloseup(null);
    expect(listener).not.toHaveBeenCalled();
    useWorld.getState().setCloseup("pos-screen");
    useWorld.getState().setCloseup("pos-screen");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useWorld.getState().closeupId).toBe("pos-screen");
    unsub();
  });
});
