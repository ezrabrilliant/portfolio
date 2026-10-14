import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/world/engine/audio/sfx", () => ({
  setMuted: vi.fn(),
  playSfx: vi.fn(),
  isMuted: vi.fn(() => true),
}));

import { runtime } from "@/world/state/runtime";
import type { CloseupTarget } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { CLOSEUP_SCROLL_EXIT, closeCloseup, closeupPan, openCloseup, scrolledAway } from "./closeupState";

const target = (id: string): CloseupTarget => ({
  id,
  island: "pos-monosuko",
  center: () => ({ x: 0, y: 0, z: 0 }),
  normal: () => ({ x: 0, y: 0, z: 1 }),
  size: { w: 3.4, h: 2.125 },
  input: () => undefined,
  hit: () => null,
});

describe("closeupState", () => {
  beforeEach(() => {
    runtime.closeups.clear();
    runtime.closeup = null;
    runtime.hoverId = null;
    useWorld.setState({ closeupId: null, hoveredId: null });
    runtime.closeups.set("pos-screen", target("pos-screen"));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("openCloseup writes the runtime and the store together and drops the hover", () => {
    runtime.hoverId = "pos-screen";
    useWorld.setState({ hoveredId: "pos-screen" });
    openCloseup("pos-screen");
    expect(runtime.closeup).toEqual({ id: "pos-screen" });
    expect(useWorld.getState().closeupId).toBe("pos-screen");
    expect(runtime.hoverId).toBeNull();
    expect(useWorld.getState().hoveredId).toBeNull();
  });

  it("opens every closeup centred (no pan left over from the last one)", () => {
    closeupPan.offset = 0.7;
    openCloseup("pos-screen");
    expect(closeupPan.offset).toBe(0);
  });

  it("ignores ids without a registered target", () => {
    openCloseup("nope");
    expect(runtime.closeup).toBeNull();
    expect(useWorld.getState().closeupId).toBeNull();
  });

  it("closeCloseup clears both and is a no-op when nothing is open", () => {
    openCloseup("pos-screen");
    closeCloseup();
    expect(runtime.closeup).toBeNull();
    expect(useWorld.getState().closeupId).toBeNull();
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    closeCloseup();
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("Tour exit: scrolledAway once the page moved more than CLOSEUP_SCROLL_EXIT px since opening", () => {
    vi.stubGlobal("window", { scrollY: 500 });
    openCloseup("pos-screen");
    expect(scrolledAway(500 + CLOSEUP_SCROLL_EXIT)).toBe(false);
    expect(scrolledAway(500 + CLOSEUP_SCROLL_EXIT + 1)).toBe(true);
    expect(scrolledAway(500 - CLOSEUP_SCROLL_EXIT - 1)).toBe(true);
    closeCloseup();
    expect(scrolledAway(10_000)).toBe(false);
  });
});
