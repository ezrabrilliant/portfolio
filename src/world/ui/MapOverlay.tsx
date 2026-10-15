import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { playSfx } from "@/world/engine/audio/sfx";
import { sharedKeyboard } from "@/world/input/keyboard";
import { resetTouch } from "@/world/input/touch";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { mapApp, type MapState } from "@/world/scene/screens/map";
import type { HitRegion } from "@/world/scene/screens/types";
import { startTravel } from "@/world/scene/travel";

/** Device px per logical map px: sharp on a 2× phone at the overlay's largest size. */
const PIXEL_RATIO = 3;

/**
 * The island map from anywhere (spec: voxel controls §6): the map boards' screen app drawn in an overlay. Tap or click an
 * island (or ‹ › / arrows, then Travel / Enter) to travel there: Play runs the fast travel, the tour glides to its stop.
 * Esc, M, the close button or a tap on the backdrop closes it. Opening it lets go of held keys and the stick, and keys go
 * to the map only while it is open.
 */
export function MapOverlay() {
  const open = useWorld((s) => s.mapOpen);
  const setOpen = useWorld((s) => s.setMapOpen);
  const here = useWorld((s) => s.activeIsland);
  const canvas = useRef<HTMLCanvasElement>(null);
  const regions = useRef<HitRegion[]>([]);
  const app = useMemo(
    () =>
      mapApp(runtime.layout, here, (id) => {
        setOpen(false);
        startTravel(id);
      }),
    [here, setOpen],
  );
  const [state, setState] = useState<MapState>(() => app.init(new Date()));
  useEffect(() => setState(app.init(new Date())), [app]);

  useEffect(() => {
    if (!open) return;
    sharedKeyboard.release();
    resetTouch();
    playSfx("click");
    // keys belong to the map while it is open: caught before the world's listeners (window, bubble) ever see them
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.code === "Tab") return;
      e.stopPropagation();
      if (e.code === "Escape" || e.code === "KeyM") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      const next = app.key?.(state, e.code, performance.now());
      if (next) {
        e.preventDefault();
        setState(next);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, app, state, setOpen]);

  useEffect(() => {
    const c = canvas.current;
    if (!open || !c) return;
    const { w, h } = app.logical;
    c.width = w * PIXEL_RATIO;
    c.height = h * PIXEL_RATIO;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
    regions.current = app.draw(ctx, state, performance.now());
  }, [open, app, state]);

  if (!open) return null;
  const press = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * app.logical.w;
    const y = ((e.clientY - r.top) / r.height) * app.logical.h;
    const hit = regions.current.find((g) => x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h);
    if (!hit) return;
    playSfx("click");
    setState((s) => app.act(s, hit.action, hit.arg, performance.now()));
  };
  return (
    <div className="map-overlay" role="dialog" aria-modal="true" aria-label="Island map" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="map-card">
        <canvas ref={canvas} className="map-canvas" onPointerDown={press} aria-label="Tap an island to travel there" />
        <button type="button" className="map-close" onClick={() => setOpen(false)} aria-label="Close the map">
          ×
        </button>
      </div>
    </div>
  );
}
