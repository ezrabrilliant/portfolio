import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { daylight } from "@/world/scene/daylight";
import { HERO, PEDULI, PETAK, PLAZA } from "@/world/scene/islands/layouts";
import { worldOf } from "@/world/scene/islands/shared/local";

/** Trees that drop a leaf now and then: island, crown centre (island-local, y = crown middle). */
const LEAF_TREES: { island: string; x: number; z: number; h: number }[] = [
  { island: "hero", ...HERO.tree },
  ...PETAK.trees.map((t) => ({ island: "petak-umpet", ...t })),
  { island: "web-plaza", ...PLAZA.tree },
  { island: "pedulipasal", ...PEDULI.tree },
];
/** Seconds between leaves from a tree (random in this range). */
const LEAF_EVERY = [1.6, 3.6] as const;

/** Fireflies over the lanterns and lamps at golden hour: where, and how many round each. */
const FIREFLY_SPOTS: { island: string; x: number; z: number; y: number }[] = [
  ...PETAK.lanterns.map((l) => ({ island: "petak-umpet", x: l.x + 0.4, z: l.z, y: 1.7 })),
  ...PLAZA.lamps.map((l) => ({ island: "web-plaza", x: l.x, z: l.z, y: 1.8 })),
];
const PER_SPOT = 5;
const FLY_GEO = new THREE.BoxGeometry(0.05, 0.05, 0.05);
const FLY_MAT = new THREE.MeshBasicMaterial({ color: "#fff1a6", toneMapped: false, transparent: true });

/** Leaves dropping from the crowns, and fireflies round the lights as the day turns golden. */
export function Ambient() {
  const leaves = useMemo(
    () =>
      LEAF_TREES.map((t) => {
        const p = runtime.islandById(t.island);
        return { at: worldOf(p, t.x, t.h + 0.6, t.z), next: Math.random() * LEAF_EVERY[1] };
      }),
    [],
  );
  const flies = useMemo(
    () =>
      FIREFLY_SPOTS.flatMap((s) => {
        const c = worldOf(runtime.islandById(s.island), s.x, s.y, s.z);
        return Array.from({ length: PER_SPOT }, (_, i) => ({ c, phase: i * 1.37 + c.x }));
      }),
    [],
  );
  const ref = useRef<THREE.InstancedMesh>(null);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    const reduced = useWorld.getState().reducedMotion;
    // leaves: only from trees near the camera (no particles spent out of view)
    if (!reduced) {
      for (const l of leaves) {
        l.next -= dt;
        if (l.next > 0) continue;
        l.next = LEAF_EVERY[0] + Math.random() * (LEAF_EVERY[1] - LEAF_EVERY[0]);
        const c = camera.position;
        if (Math.hypot(c.x - l.at.x, c.y - l.at.y, c.z - l.at.z) > 45) continue;
        runtime.particles.burst({ x: l.at.x + (Math.random() - 0.5) * 2, y: l.at.y, z: l.at.z + (Math.random() - 0.5) * 2 }, "leaves", { count: 1 });
      }
    }
    // fireflies fade in past the middle of the golden hour's approach
    const mesh = ref.current;
    if (!mesh) return;
    const glow = Math.max(0, Math.min(1, (daylight.k - 0.35) / 0.4));
    mesh.visible = glow > 0.01 && !reduced;
    if (!mesh.visible) return;
    FLY_MAT.opacity = glow;
    flies.forEach((f, i) => {
      const a = t * 0.5 + f.phase;
      const blink = 0.6 + 0.4 * Math.sin(t * 3.1 + f.phase * 2);
      m4.makeScale(blink, blink, blink).setPosition(
        f.c.x + Math.sin(a) * 0.9 + 0.2 * Math.sin(a * 2.3),
        f.c.y + 0.4 * Math.sin(a * 1.7),
        f.c.z + Math.cos(a * 0.8) * 0.9,
      );
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[FLY_GEO, FLY_MAT, flies.length]} frustumCulled={false} />;
}
