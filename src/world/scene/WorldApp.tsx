import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useWorld } from "@/world/state/store";
import { dprCap, hasWebGL } from "@/world/state/quality";
import { NoWebGL } from "@/world/ui/NoWebGL";
import { SeoMirror } from "@/world/ui/SeoMirror";
import { MobileControls } from "@/world/ui/MobileControls";
import { World } from "./World";

export default function WorldApp() {
  const webgl = useMemo(() => hasWebGL(), []);
  const quality = useWorld((s) => s.quality);
  if (!webgl) return <NoWebGL />;
  return (
    <>
      <div className="world-canvas-wrap" tabIndex={0} aria-label="Ezra Brilliant's voxel world">
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
      <MobileControls />
      <SeoMirror />
    </>
  );
}
