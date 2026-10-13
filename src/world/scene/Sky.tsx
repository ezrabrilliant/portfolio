import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/world/engine/gen/rng";
import { useWorld } from "@/world/state/store";

const SKY_TOP = new THREE.Color("#8ab3d1");
const SKY_MID = new THREE.Color("#cbdce4");
const SKY_LOW = new THREE.Color("#d8e2e3");

function skyGeometry(): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(400, 32, 20);
  const pos = geo.attributes.position;
  const cols: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 400;
    if (y >= 0) c.copy(SKY_MID).lerp(SKY_TOP, Math.pow(Math.min(1, y * 1.35), 0.75));
    else c.copy(SKY_MID).lerp(SKY_LOW, Math.min(1, -y * 3));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  return geo;
}

function CloudSea() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reduced = useWorld((s) => s.reducedMotion);
  const clouds = useMemo(() => {
    const r = mulberry32(7);
    return Array.from({ length: 70 }, () => ({
      x: -40 + r() * 170,
      y: -16 - r() * 5,
      z: -50 + r() * 70,
      sx: 4 + r() * 9,
      sz: 3 + r() * 7,
      speed: 0.2 + r() * 0.3,
    }));
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const write = (t: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    clouds.forEach((c, i) => {
      const x = ((c.x + t * c.speed + 40) % 170) - 40;
      m.makeScale(c.sx, 1.2, c.sz).setPosition(x, c.y, c.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => write(0));
  useFrame((state) => {
    if (!reduced) write(state.clock.elapsedTime);
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, clouds.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f4f6f5" roughness={1} />
    </instancedMesh>
  );
}

export function Sky() {
  const sphere = useRef<THREE.Mesh>(null);
  const geometry = useMemo(skyGeometry, []);
  useFrame(({ camera }) => {
    sphere.current?.position.copy(camera.position);
  });
  return (
    <>
      <color attach="background" args={["#cbdce4"]} />
      <fog attach="fog" args={["#cbdce4", 70, 210]} />
      <mesh ref={sphere} geometry={geometry} renderOrder={-1}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <CloudSea />
    </>
  );
}
