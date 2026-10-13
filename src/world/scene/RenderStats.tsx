import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Dev-only: logs draw calls every 120 frames and warns above the 200-call budget. */
export function RenderStats() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    if (!import.meta.env.DEV) return;
    frames.current += 1;
    if (frames.current % 120 !== 0) return;
    const { calls, triangles } = gl.info.render;
    if (calls > 200) console.warn(`[world] ${calls} draw calls (budget 200), ${triangles} triangles`);
    else console.info(`[world] ${calls} draw calls, ${triangles} triangles`);
  });
  return null;
}
