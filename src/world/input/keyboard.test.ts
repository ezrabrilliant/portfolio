import { describe, expect, it } from "vitest";
import { axisFromKeys, cameraRelative, createKeyboard, isMoveCode, isTypingTarget } from "./keyboard";

const key = (type: string, code: string, repeat = false) => Object.assign(new Event(type), { code, repeat });

describe("axisFromKeys", () => {
  it("is zero with no keys", () => {
    expect(axisFromKeys(new Set())).toEqual({ forward: 0, right: 0 });
  });
  it("maps WASD and arrows", () => {
    expect(axisFromKeys(new Set(["KeyW"]))).toEqual({ forward: 1, right: 0 });
    expect(axisFromKeys(new Set(["ArrowDown"]))).toEqual({ forward: -1, right: 0 });
    expect(axisFromKeys(new Set(["KeyD"]))).toEqual({ forward: 0, right: 1 });
    expect(axisFromKeys(new Set(["ArrowLeft"]))).toEqual({ forward: 0, right: -1 });
  });
  it("normalises diagonals to length 1", () => {
    const a = axisFromKeys(new Set(["KeyW", "KeyD"]));
    expect(Math.hypot(a.forward, a.right)).toBeCloseTo(1, 6);
  });
  it("cancels opposite keys", () => {
    expect(axisFromKeys(new Set(["KeyW", "KeyS"]))).toEqual({ forward: 0, right: 0 });
  });
});

describe("isMoveCode", () => {
  it("knows movement keys", () => {
    expect(isMoveCode("KeyA")).toBe(true);
    expect(isMoveCode("ArrowUp")).toBe(true);
    expect(isMoveCode("KeyE")).toBe(false);
  });
});

describe("cameraRelative", () => {
  it("forward follows the camera's horizontal forward", () => {
    const v = cameraRelative(1, 0, { x: 0, z: -1 });
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.z).toBeCloseTo(-1, 6);
  });
  it("right is forward × up", () => {
    const v = cameraRelative(0, 1, { x: 0, z: -1 });
    expect(v.x).toBeCloseTo(1, 6);
    expect(v.z).toBeCloseTo(0, 6);
  });
  it("normalises an unnormalised camera vector and clamps length to 1", () => {
    const v = cameraRelative(1, 1, { x: 0, z: -5 });
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(1, 6);
  });
  it("returns zero when the camera looks straight down", () => {
    expect(cameraRelative(1, 0, { x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
  });
});

describe("createKeyboard", () => {
  it("tracks held keys and one-shot presses", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target);
    target.dispatchEvent(key("keydown", "Space"));
    expect(kb.keys.has("Space")).toBe(true);
    expect(kb.consume("Space")).toBe(true);
    expect(kb.consume("Space")).toBe(false);
    target.dispatchEvent(key("keydown", "Space", true));
    expect(kb.consume("Space")).toBe(false);
    target.dispatchEvent(key("keyup", "Space"));
    expect(kb.keys.has("Space")).toBe(false);
    kb.dispose();
  });
  it("clears everything on blur", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target);
    target.dispatchEvent(key("keydown", "KeyW"));
    target.dispatchEvent(new Event("blur"));
    expect(kb.keys.size).toBe(0);
    kb.dispose();
  });
  it("clears held keys when a context menu opens: its key-ups never reach the page", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target);
    target.dispatchEvent(key("keydown", "KeyW"));
    target.dispatchEvent(new Event("contextmenu"));
    expect(kb.keys.size).toBe(0);
    kb.dispose();
  });
  it("keeps held keys when the context menu was blocked (no menu opened, so the key-up still arrives)", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target);
    target.dispatchEvent(key("keydown", "KeyW"));
    const menu = new Event("contextmenu", { cancelable: true });
    menu.preventDefault();
    target.dispatchEvent(menu);
    expect(kb.keys.has("KeyW")).toBe(true);
    kb.dispose();
  });
  it("clears held keys when the page is hidden (tab switch, app switch on a phone)", () => {
    const target = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    const kb = createKeyboard(target, doc);
    target.dispatchEvent(key("keydown", "KeyW"));
    doc.dispatchEvent(new Event("visibilitychange")); // still visible: nothing happens
    expect(kb.keys.has("KeyW")).toBe(true);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(kb.keys.size).toBe(0);
    kb.dispose();
  });
  it("release() lets go of held keys: one still down comes back only as a new press after its key-up, never by auto-repeat", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target, null);
    target.dispatchEvent(key("keydown", "KeyW"));
    target.dispatchEvent(key("keydown", "ShiftLeft"));
    kb.release();
    expect(kb.keys.size).toBe(0);
    expect(kb.consume("KeyW")).toBe(false); // its pending press went too
    target.dispatchEvent(key("keydown", "KeyW", true)); // the OS keeps repeating the key still held
    target.dispatchEvent(key("keydown", "KeyW", true));
    expect(kb.keys.has("KeyW")).toBe(false);
    expect(kb.consume("KeyW")).toBe(false);
    target.dispatchEvent(key("keyup", "KeyW"));
    target.dispatchEvent(key("keydown", "KeyW"));
    expect(kb.keys.has("KeyW")).toBe(true);
    expect(kb.consume("KeyW")).toBe(true);
    target.dispatchEvent(key("keydown", "KeyW", true)); // a held key's own repeats are normal again
    expect(kb.keys.has("KeyW")).toBe(true);
    kb.dispose();
  });
  it("release() leaves keys pressed afterwards alone, and a fresh press of a released key counts even if its key-up was lost", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target, null);
    target.dispatchEvent(key("keydown", "KeyW"));
    kb.release();
    target.dispatchEvent(key("keydown", "KeyA"));
    target.dispatchEvent(key("keydown", "KeyA", true));
    expect(kb.keys.has("KeyA")).toBe(true);
    target.dispatchEvent(key("keydown", "KeyW")); // not a repeat: a new press
    expect(kb.keys.has("KeyW")).toBe(true);
    kb.dispose();
  });
});

describe("isWaiting", () => {
  it("is true for a key let go of by release() until its key-up or a new press, never for other keys", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target, null);
    const send = (type: string, code: string, repeat = false) => target.dispatchEvent(key(type, code, repeat));
    send("keydown", "KeyW");
    send("keydown", "ArrowUp");
    expect(kb.isWaiting("KeyW")).toBe(false); // held, not released
    kb.release();
    expect(kb.isWaiting("KeyW")).toBe(true);
    expect(kb.isWaiting("KeyA")).toBe(false);
    send("keydown", "KeyW", true);
    expect(kb.isWaiting("KeyW")).toBe(true); // auto-repeat keeps it waiting
    send("keyup", "KeyW");
    expect(kb.isWaiting("KeyW")).toBe(false);
    send("keydown", "ArrowUp"); // a new press (its key-up was lost)
    expect(kb.isWaiting("ArrowUp")).toBe(false);
    kb.dispose();
  });
});

describe("isTypingTarget", () => {
  it("knows text fields, selects and editable content", () => {
    expect(isTypingTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON", isContentEditable: false } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(new EventTarget())).toBe(false);
  });
});
