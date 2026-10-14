import { describe, expect, it } from "vitest";
import { axisFromKeys, createKeyboard } from "@/world/input/keyboard";
import { createCloseupWalk, walkedSinceOpen } from "./closeupWalk";

/** A keyboard on its own event target, with helpers that dispatch key events the way the browser does. */
function rig() {
  const target = new EventTarget();
  const kb = createKeyboard(target, null);
  const send = (type: string, code: string, repeat = false) => target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
  return {
    kb,
    down: (code: string) => send("keydown", code),
    repeat: (code: string) => send("keydown", code, true),
    up: (code: string) => send("keyup", code),
    /** the walk input PlayerController reads this frame */
    walkInput: () => axisFromKeys(kb.keys),
  };
}
const STILL = { forward: 0, right: 0 };

describe("walkedSinceOpen", () => {
  it("stops Ezra when a closeup opens in Play: a move key held at the open walks nothing and keeps it open while held", () => {
    const r = rig();
    const w = createCloseupWalk();
    const open = { id: "pos" };
    r.down("KeyW");
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(false); // the frame it opened
    expect(r.walkInput()).toEqual(STILL);
    for (let i = 0; i < 5; i++) {
      r.repeat("KeyW"); // OS auto-repeat of the key still held
      expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(false);
      expect(r.walkInput()).toEqual(STILL);
    }
  });

  it("closes once that key is released and pressed again, and the new press walks", () => {
    const r = rig();
    const w = createCloseupWalk();
    const open = { id: "pos" };
    r.down("KeyW");
    r.down("ShiftLeft");
    walkedSinceOpen(w, open, true, r.kb, 0, 0);
    r.up("KeyW");
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(false);
    r.down("KeyW");
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(true);
    expect(r.walkInput()).toEqual({ forward: 1, right: 0 });
  });

  it("closes on a fresh press of another move key while the first is still held (which still walks nothing)", () => {
    const r = rig();
    const w = createCloseupWalk();
    const open = { id: "pos" };
    r.down("KeyW");
    walkedSinceOpen(w, open, true, r.kb, 0, 0);
    r.repeat("KeyW");
    r.down("KeyA");
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(true);
    expect(r.walkInput()).toEqual({ forward: 0, right: -1 });
  });

  it("closes on any move key pressed after an open with nothing held, never on other keys", () => {
    const r = rig();
    const w = createCloseupWalk();
    const open = { id: "pos" };
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(false);
    for (const code of ["KeyE", "Space", "ShiftLeft", "Tab"]) r.down(code);
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(false);
    r.down("ArrowRight");
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(true);
  });

  it("keeps the closeup open while the stick pushed at the open stays pushed, and closes on a push after it rested", () => {
    const r = rig();
    const w = createCloseupWalk();
    const open = { id: "chat" };
    expect(walkedSinceOpen(w, open, true, r.kb, 0.5, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, true, r.kb, 0.7, 0.2)).toBe(false);
    expect(walkedSinceOpen(w, open, true, r.kb, 0, -0.4)).toBe(false);
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(false); // back at rest (inside the dead zone)
    expect(walkedSinceOpen(w, open, true, r.kb, 0.3, 0)).toBe(true);
  });

  it("closes on a stick push after an open at rest", () => {
    const r = rig();
    const w = createCloseupWalk();
    const open = { id: "chat" };
    walkedSinceOpen(w, open, true, r.kb, 0, 0);
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, true, r.kb, 0, 0.2)).toBe(true);
  });

  it("leaves the tour alone: no keys released, never reports walking (a move key switches to Play there instead)", () => {
    const r = rig();
    const w = createCloseupWalk();
    const open = { id: "pos" };
    r.down("ShiftLeft");
    walkedSinceOpen(w, open, false, r.kb, 0, 0);
    expect(r.kb.keys.has("ShiftLeft")).toBe(true);
    r.down("KeyW");
    expect(walkedSinceOpen(w, open, false, r.kb, 0, 0)).toBe(false);
    r.down("KeyD");
    expect(walkedSinceOpen(w, open, false, r.kb, 0.6, 0)).toBe(false);
  });

  it("does nothing with no closeup open: keys stay held, no walking reported", () => {
    const r = rig();
    const w = createCloseupWalk();
    r.down("KeyW");
    expect(walkedSinceOpen(w, null, true, r.kb, 0.5, 0)).toBe(false);
    expect(r.walkInput()).toEqual({ forward: 1, right: 0 });
  });

  it("takes a new snapshot for each open, even of the same screen", () => {
    const r = rig();
    const w = createCloseupWalk();
    walkedSinceOpen(w, { id: "pos" }, true, r.kb, 0, 0);
    r.down("KeyW");
    expect(walkedSinceOpen(w, null, true, r.kb, 0, 0)).toBe(false); // closed by that press; he walks on
    expect(r.walkInput()).toEqual({ forward: 1, right: 0 });
    const again = { id: "pos" }; // openCloseup makes a new runtime.closeup object every time
    expect(walkedSinceOpen(w, again, true, r.kb, 0, 0)).toBe(false);
    expect(r.walkInput()).toEqual(STILL);
    r.repeat("KeyW");
    expect(walkedSinceOpen(w, again, true, r.kb, 0, 0)).toBe(false);
    // reopened straight away without a frame in between: a new open, so it stops him again
    const third = { id: "pos" };
    r.up("KeyW");
    r.down("KeyW");
    expect(walkedSinceOpen(w, third, true, r.kb, 0, 0)).toBe(false);
    expect(r.walkInput()).toEqual(STILL);
  });
});
