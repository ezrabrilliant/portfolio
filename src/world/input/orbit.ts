export interface OrbitInput {
  orbitX: number;
  orbitY: number;
  zoom: number;
}

const DRAG_TO_RAD = 0.005;
const WHEEL_TO_ZOOM = 0.002;

export function createOrbitAccumulator() {
  const acc: OrbitInput = { orbitX: 0, orbitY: 0, zoom: 0 };
  return {
    add(dxPx: number, dyPx: number) {
      acc.orbitX += dxPx * DRAG_TO_RAD;
      acc.orbitY += dyPx * DRAG_TO_RAD;
    },
    addZoom(deltaY: number) {
      acc.zoom += deltaY * WHEEL_TO_ZOOM;
    },
    take(): OrbitInput {
      const out = { ...acc };
      acc.orbitX = 0;
      acc.orbitY = 0;
      acc.zoom = 0;
      return out;
    },
  };
}

export const orbitInput = createOrbitAccumulator();
