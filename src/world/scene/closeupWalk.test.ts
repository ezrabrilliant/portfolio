import { describe, expect, it } from "vitest";
import { createCloseupWalk, walkedSinceOpen } from "./closeupWalk";

const keys = (...codes: string[]): ReadonlySet<string> => new Set(codes);
const NONE = keys();

describe("walkedSinceOpen", () => {
  it("keeps a closeup opened mid-walk open while the move key held at the open stays held", () => {
    const w = createCloseupWalk();
    const open = { id: "pos" };
    expect(walkedSinceOpen(w, open, true, keys("KeyW"), 0, 0)).toBe(false); // the frame it opened
    for (let i = 0; i < 5; i++) expect(walkedSinceOpen(w, open, true, keys("KeyW"), 0, 0)).toBe(false);
  });

  it("closes once that key is released and pressed again", () => {
    const w = createCloseupWalk();
    const open = { id: "pos" };
    walkedSinceOpen(w, open, true, keys("KeyW", "ShiftLeft"), 0, 0);
    expect(walkedSinceOpen(w, open, true, NONE, 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, true, keys("KeyW"), 0, 0)).toBe(true);
  });

  it("closes on a fresh press of another move key while the first is still held", () => {
    const w = createCloseupWalk();
    const open = { id: "pos" };
    walkedSinceOpen(w, open, true, keys("KeyW"), 0, 0);
    expect(walkedSinceOpen(w, open, true, keys("KeyW", "KeyA"), 0, 0)).toBe(true);
    const v = createCloseupWalk();
    walkedSinceOpen(v, open, true, keys("KeyW"), 0, 0);
    expect(walkedSinceOpen(v, open, true, keys("KeyW", "ArrowDown"), 0, 0)).toBe(true);
  });

  it("closes on any move key pressed after an open with nothing held, never on other keys", () => {
    const w = createCloseupWalk();
    const open = { id: "pos" };
    expect(walkedSinceOpen(w, open, true, NONE, 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, true, keys("KeyE", "Space", "ShiftLeft", "Tab"), 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, true, keys("ArrowRight"), 0, 0)).toBe(true);
  });

  it("keeps the closeup open while the stick pushed at the open stays pushed, and closes on a push after it rested", () => {
    const w = createCloseupWalk();
    const open = { id: "chat" };
    expect(walkedSinceOpen(w, open, true, NONE, 0.5, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, true, NONE, 0.7, 0.2)).toBe(false);
    expect(walkedSinceOpen(w, open, true, NONE, 0, -0.4)).toBe(false);
    expect(walkedSinceOpen(w, open, true, NONE, 0, 0)).toBe(false); // back at rest (inside the dead zone)
    expect(walkedSinceOpen(w, open, true, NONE, 0.3, 0)).toBe(true);
  });

  it("closes on a stick push after an open at rest", () => {
    const w = createCloseupWalk();
    const open = { id: "chat" };
    walkedSinceOpen(w, open, true, NONE, 0, 0);
    expect(walkedSinceOpen(w, open, true, NONE, 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, true, NONE, 0, 0.2)).toBe(true);
  });

  it("never reports walking in the tour (a move key switches to Play there, which closes the closeup)", () => {
    const w = createCloseupWalk();
    const open = { id: "pos" };
    walkedSinceOpen(w, open, false, NONE, 0, 0);
    expect(walkedSinceOpen(w, open, false, keys("KeyW"), 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, open, false, keys("KeyW", "KeyD"), 0.6, 0)).toBe(false);
  });

  it("never reports walking with no closeup open", () => {
    const w = createCloseupWalk();
    expect(walkedSinceOpen(w, null, true, keys("KeyW"), 0.5, 0)).toBe(false);
    expect(walkedSinceOpen(w, null, true, keys("KeyW", "KeyA"), 0.5, 0.5)).toBe(false);
  });

  it("takes a new snapshot for each open, even of the same screen", () => {
    const w = createCloseupWalk();
    const first = { id: "pos" };
    walkedSinceOpen(w, first, true, NONE, 0, 0);
    expect(walkedSinceOpen(w, null, true, keys("KeyW"), 0, 0)).toBe(false); // closed; W pressed meanwhile
    const again = { id: "pos" }; // openCloseup makes a new runtime.closeup object every time
    expect(walkedSinceOpen(w, again, true, keys("KeyW"), 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, again, true, keys("KeyW"), 0, 0)).toBe(false);
    // reopened straight away without a frame in between: the held key is still the old open's, re-snapshotted
    const third = { id: "pos" };
    expect(walkedSinceOpen(w, third, true, keys("KeyW"), 0, 0)).toBe(false);
    expect(walkedSinceOpen(w, third, true, keys("KeyW"), 0, 0)).toBe(false);
  });
});
