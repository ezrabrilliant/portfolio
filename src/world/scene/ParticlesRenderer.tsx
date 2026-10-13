import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });

export function ParticlesRenderer() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pool = runtime.particles;
  const prevN = useRef(0);
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      c: new THREE.Color(),
      q: new THREE.Quaternion(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      e: new THREE.Euler(),
    }),
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
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (mesh.instanceColor) {
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [pool, tmp]);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    pool.step(Math.min(dt, 1 / 30));
    const n = pool.alive;
    mesh.count = n;
    for (let i = 0; i < n; i++) {
      const sc = pool.scales[i];
      const px = pool.positions[i * 3];
      const py = pool.positions[i * 3 + 1];
      const pz = pool.positions[i * 3 + 2];
      tmp.p.set(px, py, pz);
      tmp.s.setScalar(sc);
      tmp.e.set(px * 2.1, py * 1.7, pz * 2.3);
      tmp.q.setFromEuler(tmp.e);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
      if (sc > 0) {
        tmp.c.setRGB(pool.colors[i * 3], pool.colors[i * 3 + 1], pool.colors[i * 3 + 2], THREE.SRGBColorSpace);
        mesh.setColorAt(i, tmp.c);
      }
    }
    if (n > 0 || prevN.current > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    prevN.current = n;
  });

  return <instancedMesh ref={ref} args={[geometry, material, pool.capacity]} frustumCulled={false} />;
}
