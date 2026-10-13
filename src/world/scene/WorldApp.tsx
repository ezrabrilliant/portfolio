import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useWorld } from "@/world/state/store";
import { hasWebGL } from "@/world/state/quality";
import { Hud } from "@/world/ui/Hud";
import { NoWebGL } from "@/world/ui/NoWebGL";
import { SeoMirror } from "@/world/ui/SeoMirror";
import { MobileControls } from "@/world/ui/MobileControls";
import { Loader } from "@/world/ui/Loader";
import { TourScrollTrack } from "@/world/ui/TourScrollTrack";
import { WorldBoundary, WorldLoadFailed } from "@/world/ui/WorldBoundary";
import { useModeTransitions } from "./useModeTransitions";
import { useTabCycling } from "./useTabCycling";

// the 3D world (three, R3F, drei and every island) loads as its own chunk; the shell below renders at once and
// the Loader covers the page until the world reports ready
const WorldCanvas = lazy(() => import("./WorldCanvas"));

/**
 * "Try again" reloads the page. Re-running import() in place cannot work: the browser caches a failed module
 * fetch under its URL and rejects every later import of it without asking the network again (checked in Chrome,
 * for the WorldCanvas chunk and for a vendor chunk it imports). A reload also picks up a new deploy's chunk names.
 */
const reload = () => window.location.reload();

export default function WorldApp() {
  const webgl = useMemo(() => hasWebGL(), []);
  // the world's chunk failed to download (network, blocker, stale deploy) or the world threw: the page swaps to
  // its text version instead of React unmounting everything
  const [failed, setFailed] = useState(false);
  useModeTransitions(webgl && !failed);
  const wrap = useRef<HTMLDivElement>(null);
  useTabCycling(wrap);
  useEffect(() => {
    if (failed) window.scrollTo(0, 0);
  }, [failed]);
  if (!webgl) return <NoWebGL />;
  if (failed) return <WorldLoadFailed onRetry={reload} />;
  const onWorldError = () => {
    useWorld.getState().setMode("tour"); // leaving Play frees the page scroll
    document.documentElement.classList.remove("world-playing");
    setFailed(true);
  };
  return (
    <>
      <div className="world-canvas-wrap" ref={wrap} tabIndex={0} aria-label="Ezra Brilliant's voxel world">
        <WorldBoundary onError={onWorldError}>
          <Suspense fallback={null}>
            <WorldCanvas />
          </Suspense>
        </WorldBoundary>
      </div>
      <TourScrollTrack />
      <Hud />
      <MobileControls />
      <Loader />
      <SeoMirror />
    </>
  );
}
