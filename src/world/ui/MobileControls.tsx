import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clampKnob, inStickZone, joystickVector, pinchWheel, resetTouch, stickOrigin, touchInput } from "@/world/input/touch";
import { orbitInput } from "@/world/input/orbit";
import { useWorld } from "@/world/state/store";

const RADIUS = 56;
/** One-finger look: CSS px of drag → orbit drag px (the mouse's scale). */
const LOOK_GAIN = 1.2;

type Stick = { ox: number; oy: number; kx: number; ky: number };

/**
 * Phone controls (spec: voxel controls §3). Tour: the resting stick at the bottom left; pressing it enters Play and the
 * same drag already walks (the element persists across the switch, so it keeps the pointer). Play: a finger landing in
 * the lower-left zone floats the stick to it; any other finger looks: one drags to turn and tilt, two pinch to zoom.
 * The action button shows only next to something usable, above Jump.
 */
export function MobileControls() {
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const prompt = useWorld((s) => s.prompt);
  const closeupId = useWorld((s) => s.closeupId);
  const ready = useWorld((s) => s.ready);
  const [coarse] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [stick, setStick] = useState<Stick | null>(null);
  /** the stick has walked once: its resting ring then stays hidden in Play until a finger lands in its zone */
  const [used, setUsed] = useState(false);
  const stickId = useRef<number | null>(null);
  /** look fingers: their last positions, by pointer id */
  const looks = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const rest = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // leaving Play, or a closeup opening, drops a held stick (Ezra must not walk on, nor close the closeup at once)
    if (mode !== "play" || closeupId) {
      resetTouch();
      stickId.current = null;
      looks.current.clear();
      pinch.current = null;
      setStick(null);
    }
  }, [mode, closeupId]);

  if (!coarse || !ready) return null;
  // a closeup owns the screen: taps go to the program on it; the HUD's Back button or a tap beside it leaves
  if (closeupId) return null;

  const play = mode === "play";

  const grabStick = (e: ReactPointerEvent<HTMLElement>, origin: { x: number; y: number }) => {
    stickId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    touchInput.active = true;
    moveStick({ ox: origin.x, oy: origin.y, kx: origin.x, ky: origin.y }, e.clientX, e.clientY);
  };
  const moveStick = (s: Stick, x: number, y: number) => {
    const origin = { x: s.ox, y: s.oy };
    const v = joystickVector(origin, { x, y }, RADIUS);
    touchInput.moveForward = v.y;
    touchInput.moveRight = v.x;
    if (v.magnitude > 0) setUsed(true);
    const knob = clampKnob(origin, { x, y }, RADIUS);
    setStick({ ...s, kx: knob.x, ky: knob.y });
  };
  const releaseStick = () => {
    stickId.current = null;
    touchInput.moveForward = 0;
    touchInput.moveRight = 0;
    touchInput.active = false;
    setStick(null);
  };

  // the resting stick (Tour: the way into Play)
  const onRestDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = rest.current?.getBoundingClientRect();
    const origin = r
      ? stickOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }, { x: e.clientX, y: e.clientY })
      : { x: e.clientX, y: e.clientY };
    if (!play) setMode("play");
    grabStick(e, origin);
  };

  // Play: the whole screen under the buttons
  const onLayerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stickId.current === null && inStickZone(e.clientX, e.clientY, window.innerWidth, window.innerHeight)) {
      grabStick(e, { x: e.clientX, y: e.clientY });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    looks.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch.current = null;
  };
  const onLayerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerId === stickId.current) {
      if (stick) moveStick(stick, e.clientX, e.clientY);
      return;
    }
    const last = looks.current.get(e.pointerId);
    if (!last) return;
    const prev = { ...last };
    last.x = e.clientX;
    last.y = e.clientY;
    if (looks.current.size >= 2) {
      // two look fingers: their spread zooms (the first two down)
      const [a, b] = [...looks.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current !== null) orbitInput.addZoom(pinchWheel(pinch.current, d));
      pinch.current = d;
      return;
    }
    orbitInput.add((e.clientX - prev.x) * LOOK_GAIN, (e.clientY - prev.y) * LOOK_GAIN);
  };
  const onLayerUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerId === stickId.current) {
      releaseStick();
      return;
    }
    looks.current.delete(e.pointerId);
    pinch.current = null;
  };

  const showRest = !play || (!used && !stick);
  return (
    <div className="mobile-controls">
      {play && (
        <div className="mc-layer" onPointerDown={onLayerDown} onPointerMove={onLayerMove} onPointerUp={onLayerUp} onPointerCancel={onLayerUp} />
      )}
      {/* the same element in both modes (it keeps a pointer that entered Play from the tour); in the tour it is only the
          resting stick, so the page still scrolls elsewhere */}
      <div
        className={showRest ? "mc-rest-zone" : "mc-rest-zone mc-rest-zone--off"}
        role={play ? undefined : "button"}
        aria-label={play ? undefined : "Walk around: drag the stick"}
        onPointerDown={onRestDown}
        onPointerMove={onLayerMove}
        onPointerUp={onLayerUp}
        onPointerCancel={onLayerUp}
      >
        <span ref={rest} className={stick ? "mc-rest mc-rest--off" : "mc-rest"}>
          <span className="mc-rest-knob" />
        </span>
      </div>
      {stick && (
        <>
          <span className="mc-base" style={{ left: stick.ox, top: stick.oy }} />
          <span className="mc-knob" style={{ left: stick.kx, top: stick.ky }} />
        </>
      )}
      {play && (
        <div className="mc-buttons">
          {prompt && (
            <button type="button" className="mc-btn mc-act" onPointerDown={() => (touchInput.interact = true)}>
              {prompt.label}
            </button>
          )}
          <button type="button" className="mc-btn mc-btn--jump" onPointerDown={() => (touchInput.jump = true)} aria-label="Jump">
            Jump
          </button>
        </div>
      )}
    </div>
  );
}
