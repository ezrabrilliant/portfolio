import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/world/engine/audio/sfx", () => ({
  setMuted: vi.fn(),
  playSfx: vi.fn(),
  isMuted: vi.fn(() => true),
}));

import { setMuted } from "@/world/engine/audio/sfx";
import { useWorld } from "./store";

describe("useWorld", () => {
  beforeEach(() => {
    useWorld.setState({ mode: "tour", activeIsland: "hero", muted: true, hoveredId: null, prompt: null, ready: false });
    vi.mocked(setMuted).mockClear();
  });

  it("starts in tour mode, muted, on the hero island", () => {
    const s = useWorld.getState();
    expect(s.mode).toBe("tour");
    expect(s.muted).toBe(true);
    expect(s.activeIsland).toBe("hero");
  });

  it("toggleMuted flips the flag and tells the audio engine", () => {
    useWorld.getState().toggleMuted();
    expect(useWorld.getState().muted).toBe(false);
    expect(setMuted).toHaveBeenCalledWith(false);
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
});
