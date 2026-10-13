import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { hashString, mulberry32 } from "@/world/engine/gen/rng";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { islandFrame, worldOf } from "./shared/local";
import { useHoverLift } from "./shared/useHoverLift";
import { layoutLines } from "./voxelFont";
import { createTitleSim, scatterTitle, squashTitle, stepTitle, type TitleSim } from "./voxelTitleSim";

const DEBRIS = 24; // particles per punch, spread over the title (the pool thins bursts under reduced motion)
const REACH = 4; // furthest a block flies from home, added to the culling sphere
const BOX = new THREE.BoxGeometry(0.92, 0.92, 0.92);
const m4 = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();

function writeTitle(mesh: THREE.InstancedMesh, sim: TitleSim): void {
  const { off, ang, restX, restY, size, scaleY } = sim;
  for (let i = 0; i < sim.count; i++) {
    const j = i * 3;
    pos.set(restX[i] + off[j], restY[i] * scaleY + off[j + 1], off[j + 2]);
    quat.setFromEuler(euler.set(ang[j], ang[j + 1], ang[j + 2]));
    scl.set(size, size * scaleY, size);
    mesh.setMatrixAt(i, m4.compose(pos, quat, scl));
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Voxel letters on an island (one InstancedMesh). A punch bursts the blocks out of the title's front (+z, the side the
 * layouts keep clear); they land on the grass and fly home in a left-to-right wave (voxelTitleSim.ts). Reduced motion:
 * a short squash only.
 */
export function VoxelTitle({
  id, placement, at, lines, cell, color, rotationY = 0, label = "Punch the letters",
}: {
  id: string;
  placement: IslandPlacement;
  at: { x: number; z: number };
  lines: readonly string[];
  cell: number;
  color: string;
  rotationY?: number;
  label?: string;
}) {
  const text = lines.join("\n");
  const layout = useMemo(() => layoutLines(text.split("\n")), [text]);
  const count = layout.cells.length;
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.75 }), [color]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const sim = useRef<TitleSim | null>(null);
  const lift = useHoverLift(id);

  // a new layout or size starts a fresh sim; a new colour rebuilds the mesh (args), which needs its matrices again
  useLayoutEffect(() => {
    const s = createTitleSim(layout.cells, cell);
    sim.current = s;
    const mesh = ref.current;
    if (!mesh) return;
    writeTitle(mesh, s);
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius += REACH;
  }, [layout, cell, material]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    const mesh = ref.current;
    return () => mesh?.dispose(); // instance buffers; BOX and the material are shared / disposed above
  }, [material, count]);

  useFrame((_, dt) => {
    const s = sim.current;
    const mesh = ref.current;
    if (!s || !mesh || s.phase === "rest") return;
    // the grass under the lifted (hovered) group stays where it is
    stepTitle(s, Math.min(dt, 0.1), cell / 2 - (lift.current?.position.y ?? 0));
    writeTitle(mesh, s);
  });

  const width = layout.width * cell;
  const height = layout.height * cell;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const centre = worldOf(placement, at.x, height / 2, at.z);
  const depth = cell * 4;

  const punch = () => {
    const s = sim.current;
    if (!s || s.phase === "scatter") return;
    playSfx("punch");
    // debris from a few points along the letters, not one puff in the middle
    const puffs = Math.max(1, Math.min(4, Math.round(width / 2.5)));
    for (let k = 0; k < puffs; k++) {
      const lx = ((k + 0.5) / puffs - 0.5) * width;
      runtime.particles.burst(worldOf(placement, at.x + lx * cos, height / 2, at.z - lx * sin), "debris", {
        color,
        count: Math.round(DEBRIS / puffs),
      });
    }
    if (useWorld.getState().reducedMotion) {
      squashTitle(s);
      return;
    }
    scatterTitle(s, mulberry32(hashString(id) ^ Math.floor(performance.now())));
    playSfx("burst");
  };

  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]}>
          <group ref={lift}>
            <instancedMesh ref={ref} args={[BOX, material, count]} castShadow receiveShadow dispose={null} />
          </group>
        </group>
      </group>
      <Interactable
        id={id}
        island={placement.id}
        label={label}
        position={[centre.x, centre.y, centre.z]}
        size={[Math.abs(cos) * width + Math.abs(sin) * depth, height, Math.abs(sin) * width + Math.abs(cos) * depth]}
        radius={3}
        onActivate={punch}
      />
    </>
  );
}
