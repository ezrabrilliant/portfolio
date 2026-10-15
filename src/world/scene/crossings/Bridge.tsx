import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Crossing } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { bridgeDeck, bridgePlanks } from "./geometry";
import type { DeckPlank } from "./geometry";
import { PLANK, WOOD, ropeMat, unitBox } from "./materials";

// planks and posts are one instanced draw, coloured per instance; the deck's ends lie on the
// islands' grass with their tops flush with it, so pull the whole deck forward in depth
const deckMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const PLANK_SIZE: [number, number, number] = [2.1, 0.18, 0.42];
const POST_SIDE = 1.05;
const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function Bridge({ crossing }: { crossing: Crossing }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reduced = useWorld((s) => s.reducedMotion);
  const cast = useWorld((s) => s.quality === "high");
  const len = Math.hypot(crossing.b.x - crossing.a.x, crossing.b.z - crossing.a.z);
  const ux = (crossing.b.x - crossing.a.x) / len;
  const uz = (crossing.b.z - crossing.a.z) / len;
  // planks sit where Ezra stands in the stamped grid (World builds it before its children render)
  const planks: DeckPlank[] = useMemo(() => {
    const grid = runtime.built?.grid;
    return grid ? bridgeDeck(crossing.a, crossing.b, grid) : bridgePlanks(crossing.a, crossing.b).map((p) => ({ ...p, grounded: false }));
  }, [crossing]);
  // sway only over the gap: 0 on planks lying on island grass, easing to 1 within 1.5 blocks of them
  const sway = useMemo(
    () =>
      Float32Array.from(planks, (p) => {
        let d = Infinity;
        for (const q of planks) if (q.grounded) d = Math.min(d, Math.abs(p.s - q.s) * len);
        return smoothstep(d / 1.5);
      }),
    [planks, len],
  );
  const offsets = useMemo(() => new Float32Array(planks.length), [planks]);
  const count = planks.length + 4;
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, "YXZ"), p: new THREE.Vector3(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dirty: true }),
    [],
  );

  /** Writes the planks (the only instances that move); posts are written once. */
  const writeDeck = () => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < planks.length; i++) {
      const pl = planks[i];
      // turned along the bridge and tilted with its ramp (a turn of -pitch about x lifts the plank's far end)
      tmp.q.setFromEuler(tmp.e.set(-pl.pitch, pl.yaw, 0));
      tmp.p.set(pl.x, pl.y + offsets[i], pl.z);
      tmp.s.set(PLANK_SIZE[0], PLANK_SIZE[1], PLANK_SIZE[2]);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    const yaw = Math.atan2(ux, uz);
    for (let i = 0; i < planks.length; i++) mesh.setColorAt(i, color.set(PLANK));
    color.set(WOOD);
    let k = planks.length;
    for (const e of [crossing.a, crossing.b]) {
      for (const side of [POST_SIDE, -POST_SIDE]) {
        tmp.q.setFromAxisAngle(tmp.up, yaw);
        tmp.p.set(e.x - uz * side, e.y + 0.6, e.z + ux * side);
        tmp.s.set(0.16, 1.2, 0.16);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(k, tmp.m);
        mesh.setColorAt(k++, color);
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    writeDeck();
    mesh.computeBoundingSphere();
  });

  useFrame((state, dt) => {
    // sway: a spring dip under Ezra while he walks on it, plus a faint idle breathing
    const p = runtime.player.pos;
    const rx = p.x - crossing.a.x;
    const rz = p.z - crossing.a.z;
    const along = (rx * ux + rz * uz) / len;
    const across = Math.abs(rx * -uz + rz * ux);
    const onIt = useWorld.getState().mode === "play" && across < 1.3 && along > 0 && along < 1;
    const t = state.clock.elapsedTime;
    let moved = false;
    for (let i = 0; i < planks.length; i++) {
      const pl = planks[i];
      const dip = onIt ? -0.12 * Math.max(0, 1 - Math.abs(pl.s - along) * 5) : 0;
      const idle = reduced ? 0 : 0.015 * Math.sin(t * 1.3 + i * 0.35) * Math.sin(Math.PI * pl.s);
      const next = THREE.MathUtils.damp(offsets[i], (dip + idle) * sway[i], 10, dt);
      if (Math.abs(next - offsets[i]) > 1e-5) moved = true;
      offsets[i] = next;
    }
    // a settled deck (reduced motion, nobody on it) uploads nothing
    if (moved || tmp.dirty) {
      tmp.dirty = moved;
      writeDeck();
    }
  });

  const ropes = useMemo(() => {
    const sag = (side: number) => {
      const px = -uz * side;
      const pz = ux * side;
      const pts = Array.from({ length: 13 }, (_, i) => {
        const s = i / 12;
        return new THREE.Vector3(
          crossing.a.x + (crossing.b.x - crossing.a.x) * s + px,
          crossing.a.y + (crossing.b.y - crossing.a.y) * s + 1.05 - 0.35 * Math.sin(Math.PI * s),
          crossing.a.z + (crossing.b.z - crossing.a.z) * s + pz,
        );
      });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.035, 5, false);
    };
    const parts = [sag(POST_SIDE), sag(-POST_SIDE)];
    const merged = mergeGeometries(parts, false)!;
    for (const g of parts) g.dispose();
    return merged;
  }, [crossing, ux, uz]);
  useEffect(() => () => ropes.dispose(), [ropes]);

  return (
    <group>
      <instancedMesh ref={ref} args={[unitBox, deckMat, count]} castShadow={cast} receiveShadow />
      <mesh geometry={ropes} material={ropeMat} />
    </group>
  );
}
