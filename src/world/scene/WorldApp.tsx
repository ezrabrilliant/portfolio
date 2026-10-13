import { Suspense, lazy, useMemo, useRef } from "react";
import { hasWebGL } from "@/world/state/quality";
import { Hud } from "@/world/ui/Hud";
import { NoWebGL } from "@/world/ui/NoWebGL";
import { SeoMirror } from "@/world/ui/SeoMirror";
import { MobileControls } from "@/world/ui/MobileControls";
import { Loader } from "@/world/ui/Loader";
import { TourScrollTrack } from "@/world/ui/TourScrollTrack";
import { useModeTransitions } from "./useModeTransitions";
import { useTabCycling } from "./useTabCycling";

// the 3D world (three, R3F, drei and every island) loads as its own chunk; the shell below renders at once and
// the Loader covers the page until the world reports ready
const WorldCanvas = lazy(() => import("./WorldCanvas"));

export default function WorldApp() {
  const webgl = useMemo(() => hasWebGL(), []);
  useModeTransitions(webgl);
  const wrap = useRef<HTMLDivElement>(null);
  useTabCycling(wrap);
  if (!webgl) return <NoWebGL />;
  return (
    <>
      <div className="world-canvas-wrap" ref={wrap} tabIndex={0} aria-label="Ezra Brilliant's voxel world">
        <Suspense fallback={null}>
          <WorldCanvas />
        </Suspense>
      </div>
      <TourScrollTrack />
      <Hud />
      <MobileControls />
      <Loader />
      <SeoMirror />
    </>
  );
}
