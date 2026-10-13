import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Crossing } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { bridgePlanks } from "./geometry";

const plankGeo = new THREE.BoxGeometry(2.1, 0.18, 0.42);
const unitGeo = new THREE.BoxGeometry(1, 1, 1);
// the deck's ends lie on the islands' grass, top flush with it: pull the planks forward in depth
const plankMat = new THREE.MeshStandardMaterial({ color: "#b98f62", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4f37", roughness: 0.9 });
const ropeMat = new THREE.MeshStandardMaterial({ color: "#c9b48a", roughness: 1 });

export function Bridge({ crossing }: { crossing: Crossing }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const riserRef = useRef<THREE.InstancedMesh>(null);
  const reduced = useWorld((s) => s.reducedMotion);
  const cast = useWorld((s) => s.quality === "high");
  const planks = useMemo(() => bridgePlanks(crossing.a, crossing.b), [crossing]);
  const offsets = useMemo(() => new Float32Array(planks.length), [planks]);
  // a board standing in the gap wherever the deck steps up a block, so the stairs read as one bridge
  const risers = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i + 1 < planks.length; i++) if (Math.abs(planks[i + 1].y - planks[i].y) > 0.5) out.push(i);
    return out;
  }, [planks]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), r: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);
  const len = Math.hypot(crossing.b.x - crossing.a.x, crossing.b.z - crossing.a.z);
  const ux = (crossing.b.x - crossing.a.x) / len;
  const uz = (crossing.b.z - crossing.a.z) / len;

  const write = () => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < planks.length; i++) {
      const pl = planks[i];
      tmp.q.setFromAxisAngle(tmp.up, pl.yaw);
      tmp.p.set(pl.x, pl.y + offsets[i], pl.z);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    const rm = riserRef.current;
    if (!rm) return;
    for (let k = 0; k < risers.length; k++) {
      const i = risers[k];
      const lo = planks[i].y < planks[i + 1].y ? i : i + 1;
      const hi = lo === i ? i + 1 : i;
      const bottom = planks[lo].y - 0.09 + offsets[lo];
      const top = planks[hi].y + 0.09 + offsets[hi];
      tmp.q.setFromAxisAngle(tmp.up, planks[i].yaw);
      tmp.p.set((planks[i].x + planks[i + 1].x) / 2, (bottom + top) / 2, (planks[i].z + planks[i + 1].z) / 2);
      tmp.r.set(2.1, top - bottom, 0.08);
      tmp.m.compose(tmp.p, tmp.q, tmp.r);
      rm.setMatrixAt(k, tmp.m);
    }
    rm.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(write);

  useFrame((state, dt) => {
    // sway: a spring dip under Ezra while he walks on it, plus a faint idle breathing
    const p = runtime.player.pos;
    const rx = p.x - crossing.a.x;
    const rz = p.z - crossing.a.z;
    const along = (rx * ux + rz * uz) / len;
    const across = Math.abs(rx * -uz + rz * ux);
    const onIt = useWorld.getState().mode === "play" && across < 1.3 && along > 0 && along < 1;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < planks.length; i++) {
      const pl = planks[i];
      const dip = onIt ? -0.12 * Math.max(0, 1 - Math.abs(pl.s - along) * 5) : 0;
      const idle = reduced ? 0 : 0.015 * Math.sin(t * 1.3 + i * 0.35) * Math.sin(Math.PI * pl.s);
      offsets[i] = THREE.MathUtils.damp(offsets[i], dip + idle, 10, dt);
    }
    write();
  });

  const ends = [crossing.a, crossing.b];
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
  const ropes = useMemo(() => [sag(1.05), sag(-1.05)], [crossing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      <instancedMesh ref={ref} args={[plankGeo, plankMat, planks.length]} castShadow={cast} receiveShadow />
      {risers.length > 0 && <instancedMesh ref={riserRef} args={[unitGeo, plankMat, risers.length]} castShadow={cast} receiveShadow />}
      {ends.flatMap((e, k) =>
        [1.05, -1.05].map((side) => (
          <mesh key={`${k}-${side}`} position={[e.x - uz * side, e.y + 0.6, e.z + ux * side]} material={woodMat} castShadow={cast}>
            <boxGeometry args={[0.16, 1.2, 0.16]} />
          </mesh>
        )),
      )}
      {ropes.map((g, i) => (
        <mesh key={i} geometry={g} material={ropeMat} />
      ))}
    </group>
  );
}
