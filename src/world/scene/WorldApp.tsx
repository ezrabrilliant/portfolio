import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useWorld } from "@/world/state/store";
import { dprCap, hasWebGL } from "@/world/state/quality";
import { Hud } from "@/world/ui/Hud";
import { NoWebGL } from "@/world/ui/NoWebGL";
import { SeoMirror } from "@/world/ui/SeoMirror";
import { MobileControls } from "@/world/ui/MobileControls";
import { Loader } from "@/world/ui/Loader";
import { TourScrollTrack } from "@/world/ui/TourScrollTrack";
import { World } from "./World";
import { useModeTransitions } from "./useModeTransitions";
import { useTabCycling } from "./useTabCycling";

export default function WorldApp() {
  const webgl = useMemo(() => hasWebGL(), []);
  const quality = useWorld((s) => s.quality);
  useModeTransitions(webgl);
  const wrap = useRef<HTMLDivElement>(null);
  useTabCycling(wrap);
  if (!webgl) return <NoWebGL />;
  return (
    <>
      <div className="world-canvas-wrap" ref={wrap} tabIndex={0} aria-label="Ezra Brilliant's voxel world">
        <Canvas
          shadows={quality === "high" ? "soft" : false}
          dpr={[1, dprCap(quality)]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: 40, near: 0.1, far: 600, position: [-12, 14, 22] }}
          onCreated={({ gl, camera }) => {
            gl.toneMappingExposure = 1.05;
            camera.lookAt(0, 0, 0);
          }}
        >
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </Canvas>
      </div>
      <TourScrollTrack />
      <Hud />
      <MobileControls />
      <Loader />
      <SeoMirror />
    </>
  );
}
