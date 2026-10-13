import { runtime } from "@/world/state/runtime";
import { TRACK_VH_PER_STOP } from "@/world/scene/tour/tourMath";

/** Invisible tall element: native page scroll over it drives the tour progress. */
export function TourScrollTrack() {
  return <div className="tour-track" style={{ height: `${runtime.layout.tourOrder.length * TRACK_VH_PER_STOP}vh` }} aria-hidden="true" />;
}
