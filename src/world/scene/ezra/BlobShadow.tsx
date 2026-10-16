import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";

const GEO = new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2);
const MAT = new THREE.MeshBasicMaterial({ color: "#13212b", transparent: true, opacity: 0.3, depthWrite: false });

/** The ground under (x, z) at or below `fromY`: the top of the first solid block, ramp or prop under him. */
function groundUnder(x: number, z: number, fromY: number): number | null {
  const built = runtime.built;
  if (!built) return null;
  let best: number | null = null;
  for (let y = Math.floor(fromY); y > fromY - 12; y--) {
    if (built.grid.isSolid(x, y, z)) {
      best = y + 1;
      break;
    }
  }
  const ramp = built.ramps.surfaceAt(x, z, fromY);
  if (ramp !== null && (best === null || ramp > best)) best = ramp;
  const prop = built.props.topOf({ x0: x - 0.05, y0: fromY - 12, z0: z - 0.05, x1: x + 0.05, y1: fromY, z1: z + 0.05 });
  if (prop > -Infinity && prop <= fromY + 0.01 && (best === null || prop > best)) best = prop;
  return best;
}

/**
 * A soft round shadow on the ground under Ezra (polish #5): smaller and fainter the higher he jumps, so a jump's height
 * reads. On the low tier (no shadow maps) it is his only shadow; on the high tier it shows only while he is off the
 * ground, under the real one.
 */
export function BlobShadow() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const w = useWorld.getState();
    const p = runtime.player;
    const show = w.mode === "play" && !runtime.hidden && !runtime.seated && (w.quality === "low" || !p.onGround);
    m.visible = show;
    if (!show) return;
    const g = groundUnder(p.pos.x, p.pos.z, p.pos.y + 0.01);
    if (g === null) {
      m.visible = false;
      return;
    }
    const h = Math.max(0, p.pos.y - g);
    const k = 1 / (1 + h * 0.45);
    m.position.set(p.pos.x, g + 0.02, p.pos.z);
    m.scale.setScalar(k);
    MAT.opacity = 0.32 * k;
  });
  return <mesh ref={ref} geometry={GEO} material={MAT} renderOrder={1} userData={{ noSeeThrough: true }} />;
}
