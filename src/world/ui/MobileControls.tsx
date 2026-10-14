import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clampKnob, joystickVector, resetTouch, stickOrigin, touchInput } from "@/world/input/touch";
import { orbitInput } from "@/world/input/orbit";
import { useWorld } from "@/world/state/store";

const RADIUS = 56;

/**
 * Phone controls. One joystick, drawn the same in both modes: it rests at the bottom left. In the tour, pressing it
 * enters Play and the same drag already walks (the stick element persists across the mode switch, so it keeps the
 * pointer). In Play, a touch on the resting stick grabs it; a touch elsewhere on the left half floats it to the thumb;
 * letting go returns it to rest. The right half orbits the camera.
 */
export function MobileControls() {
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const prompt = useWorld((s) => s.prompt);
  const closeupId = useWorld((s) => s.closeupId);
  const ready = useWorld((s) => s.ready);
  const [coarse] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [stick, setStick] = useState<{ ox: number; oy: number; kx: number; ky: number } | null>(null);
  const stickId = useRef<number | null>(null);
  const orbitId = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const rest = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // leaving Play, or a closeup opening, drops a held stick (Ezra must not walk on, nor close the closeup at once)
    if (mode !== "play" || closeupId) {
      resetTouch();
      stickId.current = null;
      setStick(null);
    }
  }, [mode, closeupId]);

  if (!coarse || !ready) return null;
  // a closeup owns the screen: taps go to the program on it; the HUD's Back button or a tap beside it leaves
  if (closeupId) return null;

  const onStickDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = rest.current?.getBoundingClientRect();
    const origin = r
      ? stickOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }, { x: e.clientX, y: e.clientY })
      : { x: e.clientX, y: e.clientY };
    stickId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (mode !== "play") setMode("play");
    touchInput.active = true;
    const knob = clampKnob(origin, { x: e.clientX, y: e.clientY }, RADIUS);
    setStick({ ox: origin.x, oy: origin.y, kx: knob.x, ky: knob.y });
    const v = joystickVector(origin, { x: e.clientX, y: e.clientY }, RADIUS);
    touchInput.moveForward = v.y;
    touchInput.moveRight = v.x;
  };
  const onStickMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickId.current || !stick) return;
    const origin = { x: stick.ox, y: stick.oy };
    const v = joystickVector(origin, { x: e.clientX, y: e.clientY }, RADIUS);
    touchInput.moveForward = v.y;
    touchInput.moveRight = v.x;
    const knob = clampKnob(origin, { x: e.clientX, y: e.clientY }, RADIUS);
    setStick({ ...stick, kx: knob.x, ky: knob.y });
  };
  const onStickUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickId.current) return;
    stickId.current = null;
    touchInput.moveForward = 0;
    touchInput.moveRight = 0;
    touchInput.active = false;
    setStick(null);
  };
  const onOrbitDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    orbitId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onOrbitMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== orbitId.current) return;
    orbitInput.add((e.clientX - last.current.x) * 1.2, (e.clientY - last.current.y) * 1.2);
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onOrbitUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId === orbitId.current) orbitId.current = null;
  };

  const play = mode === "play";
  return (
    <div className="mobile-controls">
      {/* the same element in both modes: in the tour it is only the resting stick (the page still scrolls elsewhere) */}
      <div
        className={play ? "mc-zone mc-zone--stick" : "mc-zone mc-zone--rest"}
        role={play ? undefined : "button"}
        aria-label={play ? undefined : "Walk around: drag the stick"}
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
      >
        <span ref={rest} className={stick ? "mc-rest mc-rest--off" : "mc-rest"}>
          <span className="mc-rest-knob" />
        </span>
        {stick && (
          <>
            <span className="mc-base" style={{ left: stick.ox, top: stick.oy }} />
            <span className="mc-knob" style={{ left: stick.kx, top: stick.ky }} />
          </>
        )}
      </div>
      {play && (
        <>
          <div className="mc-zone mc-zone--orbit" onPointerDown={onOrbitDown} onPointerMove={onOrbitMove} onPointerUp={onOrbitUp} onPointerCancel={onOrbitUp} />
          <div className="mc-buttons">
            <button type="button" className="mc-btn" onPointerDown={() => (touchInput.interact = true)} disabled={!prompt} aria-label={prompt ? prompt.label : "Nothing to interact with"}>
              {prompt ? prompt.label : "Use"}
            </button>
            <button type="button" className="mc-btn mc-btn--jump" onPointerDown={() => (touchInput.jump = true)} aria-label="Jump">
              Jump
            </button>
          </div>
        </>
      )}
    </div>
  );
}
