import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useWorld } from "@/world/state/store";

import { FPS_METER } from "@/world/state/fpsFlag";

/**
 * With ?fps, writes the frame rate, the slowest frames, draw calls, the quality tier and the pixel ratio into the
 * #fps-meter element (WorldApp) twice a second.
 */
export function FpsMeter() {
  const gl = useThree((s) => s.gl);
  const st = useRef({ frames: [] as number[], acc: 0 });
  useFrame((_, dt) => {
    if (!FPS_METER) return;
    const s = st.current;
    s.frames.push(dt * 1000);
    s.acc += dt;
    if (s.acc < 0.5) return;
    const sorted = [...s.frames].sort((a, b) => a - b);
    const fps = s.frames.length / s.acc;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const el = document.getElementById("fps-meter");
    if (el) el.textContent = `${fps.toFixed(0)} fps · p95 ${p95.toFixed(0)} ms · ${gl.info.render.calls} draws · ${useWorld.getState().quality} · dpr ${gl.getPixelRatio().toFixed(2)}`;
    s.frames.length = 0;
    s.acc = 0;
  });
  return null;
}
