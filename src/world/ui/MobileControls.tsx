import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { joystickVector, resetTouch, touchInput } from "@/world/input/touch";
import { orbitInput } from "@/world/input/orbit";
import { useWorld } from "@/world/state/store";

const RADIUS = 56;

export function MobileControls() {
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const prompt = useWorld((s) => s.prompt);
  const [coarse] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [stick, setStick] = useState<{ ox: number; oy: number; kx: number; ky: number } | null>(null);
  const stickId = useRef<number | null>(null);
  const orbitId = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (mode !== "play") {
      resetTouch();
      setStick(null);
    }
  }, [mode]);

  if (!coarse) return null;

  if (mode === "tour") {
    return (
      <div className="mobile-controls">
        <button type="button" className="mc-start" aria-label="Play: walk around the world" onClick={() => setMode("play")}>
          <span className="mc-start-knob" />
        </button>
      </div>
    );
  }

  const onStickDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    stickId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    touchInput.active = true;
    setStick({ ox: e.clientX, oy: e.clientY, kx: e.clientX, ky: e.clientY });
  };
  const onStickMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickId.current || !stick) return;
    const v = joystickVector({ x: stick.ox, y: stick.oy }, { x: e.clientX, y: e.clientY }, RADIUS);
    touchInput.moveForward = v.y;
    touchInput.moveRight = v.x;
    const dx = e.clientX - stick.ox;
    const dy = e.clientY - stick.oy;
    const d = Math.hypot(dx, dy);
    const k = d > RADIUS ? RADIUS / d : 1;
    setStick({ ...stick, kx: stick.ox + dx * k, ky: stick.oy + dy * k });
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

  return (
    <div className="mobile-controls">
      <div className="mc-zone mc-zone--stick" onPointerDown={onStickDown} onPointerMove={onStickMove} onPointerUp={onStickUp} onPointerCancel={onStickUp}>
        {stick && (
          <>
            <span className="mc-base" style={{ left: stick.ox, top: stick.oy }} />
            <span className="mc-knob" style={{ left: stick.kx, top: stick.ky }} />
          </>
        )}
      </div>
      <div className="mc-zone mc-zone--orbit" onPointerDown={onOrbitDown} onPointerMove={onOrbitMove} onPointerUp={onOrbitUp} onPointerCancel={onOrbitUp} />
      <div className="mc-buttons">
        <button type="button" className="mc-btn" onPointerDown={() => (touchInput.interact = true)} disabled={!prompt} aria-label={prompt ? prompt.label : "Nothing to interact with"}>
          {prompt ? prompt.label : "Use"}
        </button>
        <button type="button" className="mc-btn mc-btn--jump" onPointerDown={() => (touchInput.jump = true)} aria-label="Jump">
          Jump
        </button>
      </div>
    </div>
  );
}
