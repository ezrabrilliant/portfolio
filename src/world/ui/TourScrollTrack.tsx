import { runtime } from "@/world/state/runtime";
import { PROBE_CLASS, TRACK_CLASS, TRACK_VH_PER_STOP, VIEWPORT_UNIT } from "@/world/scene/tour/tourMath";

/**
 * Invisible tall element: native page scroll over it drives the tour progress. Sized in large-viewport
 * units with a 100-unit probe inside, read by `scrollMeasure()` (tourMath).
 */
export function TourScrollTrack() {
  const height = runtime.layout.tourOrder.length * TRACK_VH_PER_STOP;
  return (
    <div className={TRACK_CLASS} style={{ height: `${height}${VIEWPORT_UNIT}` }} aria-hidden="true">
      <div
        className={PROBE_CLASS}
        style={{ position: "absolute", top: 0, left: 0, width: 1, height: `100${VIEWPORT_UNIT}`, visibility: "hidden" }}
      />
    </div>
  );
}
