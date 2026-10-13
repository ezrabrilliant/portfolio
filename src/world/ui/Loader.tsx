import { useEffect, useState } from "react";
import { useWorld } from "@/world/state/store";

// a tiny island silhouette: grass row on top, earth, then a tapering stone tip
const BLOCKS: Array<[number, number, string]> = [
  [0, 0, "#8ea769"], [1, 0, "#97ae73"], [2, 0, "#86a062"], [3, 0, "#8ea769"], [4, 0, "#7f995d"],
  [0, 1, "#94714f"], [1, 1, "#8a6849"], [2, 1, "#9d7a57"], [3, 1, "#94714f"], [4, 1, "#8a6849"],
  [1, 2, "#b5afa5"], [2, 2, "#a9a399"], [3, 2, "#bfb9af"],
  [2, 3, "#a9a399"],
];

/** If the world still isn't ready by then, say so and get out of the way (HUD and page stay usable). */
const STUCK_MS = 20000;

export function Loader() {
  const ready = useWorld((s) => s.ready);
  const [gone, setGone] = useState(false);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (ready) {
      const id = window.setTimeout(() => setGone(true), 700);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setStuck(true), STUCK_MS);
    return () => window.clearTimeout(id);
  }, [ready]);
  if (gone) return null;
  const className = `loader${stuck ? " loader--stuck" : ""}${ready ? " loader--done" : ""}`;
  return (
    <div className={className} role="status" aria-live="polite">
      <div className="loader-island" aria-hidden="true">
        {BLOCKS.map(([x, y, c], i) => (
          // assembles once, bottom-up: the stone tip lands first, the grass row last
          <span
            key={i}
            className="loader-block"
            style={{ left: x * 18, top: y * 18, background: c, animationDelay: `${(3 - y) * 0.16 + x * 0.05}s` }}
          />
        ))}
      </div>
      <p className="loader-text">
        {ready ? "Ready" : stuck ? "Still building… the world may not load on this device." : "Building the islands…"}
      </p>
    </div>
  );
}
