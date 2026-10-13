import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { loadCanvasFonts } from "./canvasFonts";

/** A CanvasTexture redrawn whenever `deps` change, after the canvas fonts have loaded. */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: readonly unknown[],
): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [width, height]);

  useEffect(() => {
    let alive = true;
    void loadCanvasFonts().then(() => {
      if (!alive) return;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height);
      texture.needsUpdate = true;
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, ...deps]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
