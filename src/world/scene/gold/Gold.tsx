import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { coinRate, playJingle, playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { bakeBoxes } from "@/world/scene/shared/bake";
import { paintMat } from "@/world/scene/crossings/materials";
import { announceCard } from "@/world/ui/islandAnnounce";
import { collectGold, goldFound } from "./progress";
import { GOLD_TOTAL, goldInReach, goldInWorld } from "./spots";

/** A gold block: a bevelled cube with a lighter top edge and a darker base, half a block wide. */
const GOLD_GEO = bakeBoxes(
  [
    [0.34, 0.34, 0.34, 0, 0, 0, "#f2c14e"],
    [0.36, 0.06, 0.36, 0, 0.15, 0, "#ffe9a6"],
    [0.36, 0.06, 0.36, 0, -0.15, 0, "#c9902a"],
  ],
  "a gold block",
);

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The hidden gold blocks (spots.ts): turning and bobbing where they hide, glinting now and then. In Play, walking
 * into one picks it up (a chime, a gold burst, a card "3 / 9"); the last one crowns Ezra. Found ones stay found
 * (progress.ts) and are not drawn again.
 */
export function Gold() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const golds = useMemo(() => goldInWorld(runtime.layout.islands), []);
  const st = useMemo(() => ({ pop: new Map<string, number>(), glint: 0 }), []);
  useFrame(({ clock }, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const world = useWorld.getState();
    const reduced = world.reducedMotion;
    const found = goldFound();
    runtime.crownOn = found.size >= GOLD_TOTAL;
    st.glint += dt;
    golds.forEach((g, i) => {
      let scale = found.has(g.id) ? 0 : 1;
      // a picked-up block shrinks away over a fifth of a second
      const popped = st.pop.get(g.id);
      if (popped !== undefined) {
        const k = Math.max(0, 1 - (t - popped) / 0.2);
        scale = k * 1.3;
      }
      if (scale > 0 && world.mode === "play" && !runtime.travel && !runtime.hidden && goldInReach(g.pos, runtime.player.pos) && popped === undefined) {
        const n = collectGold(g.id);
        if (n !== null) {
          st.pop.set(g.id, t);
          // each block rings a step higher up the scale; the last one gets a fanfare
          playSfx("coin", { rate: coinRate(n) });
          if (n >= GOLD_TOTAL) playJingle("fanfare");
          runtime.particles.burst({ x: g.pos.x, y: g.pos.y + 0.2, z: g.pos.z }, "confetti", { count: n >= GOLD_TOTAL ? 60 : 18, color: "#f2c14e" });
          if (n >= GOLD_TOTAL) announceCard("All gold found!", "A crown for you", true);
          else announceCard(`Gold block ${n} / ${GOLD_TOTAL}`, "Keep exploring", true);
        }
      }
      const bob = reduced ? 0 : 0.08 * Math.sin(t * 2 + i);
      q.setFromAxisAngle(UP, reduced ? 0.6 : t * 1.4 + i);
      mesh.setMatrixAt(i, m4.compose(v.set(g.pos.x, g.pos.y + bob, g.pos.z), q, s.setScalar(scale)));
      // a glint off it every second or so while it waits
      if (scale === 1 && st.glint > 0.9 && i === Math.floor(t * 7) % golds.length) {
        runtime.particles.burst({ x: g.pos.x + (Math.random() - 0.5) * 0.3, y: g.pos.y + 0.2, z: g.pos.z + (Math.random() - 0.5) * 0.3 }, "glint", { count: 1 });
        st.glint = 0;
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[GOLD_GEO, paintMat, golds.length]} castShadow frustumCulled={false} />;
}
