import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useWorld } from "@/world/state/store";
import { dprCap, slowDpr } from "@/world/state/quality";
import { createPerfPolicy, perfStep } from "@/world/state/perfPolicy";
import { TOUR_FOV } from "./islands/framing";
import { RenderStats } from "./RenderStats";
import { FpsMeter } from "./FpsMeter";
import { FPS_METER } from "@/world/state/fpsFlag";
import { World } from "./World";

/**
 * The 3D world: everything that needs three / R3F / drei. WorldApp loads it lazily, so the page shell (HUD,
 * loader, SEO mirror, scroll track) arrives without the ~350 KB of 3D code.
 */
export default function WorldCanvas() {
  const quality = useWorld((s) => s.quality);
  const setQuality = useWorld((s) => s.setQuality);
  // adaptive pixel ratio: capped by the quality tier, and lower while frames run slow (down to 0.8 on the low tier);
  // a sustained slowdown switches to the low tier (state/perfPolicy.ts)
  const policy = useRef(createPerfPolicy());
  const [slow, setSlow] = useState(false);
  // MSAA can only be chosen when the context is made: devices that start on the low tier (phones) go without it
  const [antialias] = useState(() => quality === "high");
  const onPerf = (event: "incline" | "decline") => {
    if (perfStep(policy.current, event)) setQuality("low");
    setSlow(policy.current.slow);
  };
  return (
    <Canvas
      // "percentage" = PCFShadowMap ("soft" asks for PCFSoftShadowMap, which three r18x removed and warns about)
      shadows={quality === "high" ? "percentage" : false}
      dpr={slow ? slowDpr(quality) : dprCap(quality)}
      gl={{ antialias, powerPreference: "high-performance" }}
      camera={{ fov: TOUR_FOV, near: 0.1, far: 600, position: [-12, 14, 22] }}
      onCreated={({ gl, camera }) => {
        gl.toneMappingExposure = 1.05;
        camera.lookAt(0, 0, 0);
      }}
    >
      <PerformanceMonitor onIncline={() => onPerf("incline")} onDecline={() => onPerf("decline")} />
      {import.meta.env.DEV && <RenderStats />}
      {FPS_METER && <FpsMeter />}
      <Suspense fallback={null}>
        <World />
      </Suspense>
    </Canvas>
  );
}
