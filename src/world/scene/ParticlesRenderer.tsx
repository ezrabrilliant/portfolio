import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });

export function ParticlesRenderer() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pool = runtime.particles;
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), c: new THREE.Color(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }),
    [],
  );

  // create instanceColor before the first render so the shader compiles with per-instance colour
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    tmp.c.set("#ffffff");
    tmp.m.makeScale(0, 0, 0);
    for (let i = 0; i < pool.capacity; i++) {
      mesh.setColorAt(i, tmp.c);
      mesh.setMatrixAt(i, tmp.m);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  }, [pool, tmp]);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    pool.step(Math.min(dt, 1 / 30));
    for (let i = 0; i < pool.capacity; i++) {
      const sc = pool.scales[i];
      tmp.p.set(pool.positions[i * 3], pool.positions[i * 3 + 1], pool.positions[i * 3 + 2]);
      tmp.s.setScalar(sc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
      if (sc > 0) {
        tmp.c.setRGB(pool.colors[i * 3], pool.colors[i * 3 + 1], pool.colors[i * 3 + 2], THREE.SRGBColorSpace);
        mesh.setColorAt(i, tmp.c);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, pool.capacity]} frustumCulled={false} />;
}
