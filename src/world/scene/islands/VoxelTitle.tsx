import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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

const SCATTER = 0.75; // s of free flight
const RETURN = 0.9; // s to fly home, the whole title
const STAGGER = 0.3; // s between the left and the right edge setting off home: the title rebuilds as a wave
const GRAVITY = 16;
const BOUNCE = 0.35; // share of the fall speed kept when a block hits the grass
const SLIDE = 0.55; // share of the sideways speed and spin kept on that impact
const SQUASH = 0.3; // s of the reduced-motion squash
const DEBRIS = 24; // particles per punch, spread over the title (the pool thins bursts under reduced motion)
const REACH = 4; // furthest a block flies from home, added to the culling sphere
const BOX = new THREE.BoxGeometry(0.92, 0.92, 0.92);

type Phase = "rest" | "scatter" | "return" | "squash";

/** Voxel letters on an island (one InstancedMesh). Punching scatters the blocks onto the grass and they fly home. */
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
  const lift = useHoverLift(id);
  const sim = useMemo(() => {
    const xs = layout.cells.map((c) => c.x);
    const minX = Math.min(...xs);
    const spanX = Math.max(...xs) - minX || 1;
    return {
      phase: "rest" as Phase,
      t: 0,
      off: new Float32Array(count * 3),
      from: new Float32Array(count * 3),
      vel: new Float32Array(count * 3),
      spin: new Float32Array(count * 3),
      ang: new Float32Array(count * 3),
      fromAng: new Float32Array(count * 3),
      delay: Float32Array.from(xs, (x) => (STAGGER * (x - minX)) / spanX),
    };
  }, [layout, count]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);

  const write = useCallback(
    (scaleY: number) => {
      const mesh = ref.current;
      if (!mesh) return;
      const { off, ang } = sim;
      const cells = layout.cells;
      for (let i = 0; i < cells.length; i++) {
        const j = i * 3;
        tmp.p.set(cells[i].x * cell + off[j], cells[i].y * cell * scaleY + off[j + 1], off[j + 2]);
        tmp.q.setFromEuler(tmp.e.set(ang[j], ang[j + 1], ang[j + 2]));
        tmp.s.set(cell, cell * scaleY, cell);
        mesh.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    [sim, layout, cell, tmp],
  );

  useLayoutEffect(() => {
    write(1);
    const mesh = ref.current;
    if (!mesh) return;
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius += REACH;
  }, [write]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, frameDt) => {
    const s = sim;
    if (s.phase === "rest") return;
    const dt = Math.min(frameDt, 0.1);
    s.t += dt;
    if (s.phase === "squash") {
      const k = Math.min(1, s.t / SQUASH);
      write(1 - 0.18 * Math.sin(Math.PI * k));
      if (k >= 1) {
        s.phase = "rest";
        write(1);
      }
      return;
    }
    const n = count * 3;
    if (s.phase === "scatter") {
      // the grass under the lifted (hovered) group stays where it is
      const floor = cell / 2 - (lift.current?.position.y ?? 0);
      const cells = layout.cells;
      for (let j = 0; j < n; j += 3) {
        s.vel[j + 1] -= GRAVITY * dt;
        s.off[j] += s.vel[j] * dt;
        s.off[j + 1] += s.vel[j + 1] * dt;
        s.off[j + 2] += s.vel[j + 2] * dt;
        s.ang[j] += s.spin[j] * dt;
        s.ang[j + 1] += s.spin[j + 1] * dt;
        s.ang[j + 2] += s.spin[j + 2] * dt;
        const below = floor - (cells[j / 3].y * cell + s.off[j + 1]);
        if (below > 0) {
          const vy = s.vel[j + 1];
          const keep = vy < -1 ? SLIDE : Math.exp(-10 * dt); // an impact, or resting contact
          s.off[j + 1] += below;
          s.vel[j + 1] = vy < -1 ? -vy * BOUNCE : 0;
          s.vel[j] *= keep;
          s.vel[j + 2] *= keep;
          s.spin[j] *= keep;
          s.spin[j + 1] *= keep;
          s.spin[j + 2] *= keep;
        }
      }
      write(1);
      if (s.t >= SCATTER) {
        s.from.set(s.off);
        s.fromAng.set(s.ang);
        s.phase = "return";
        s.t = 0;
      }
      return;
    }
    const span = RETURN - STAGGER;
    for (let j = 0; j < n; j += 3) {
      const k = Math.min(1, Math.max(0, (s.t - s.delay[j / 3]) / span));
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2; // ease in-out: lift off, then settle
      for (let a = j; a < j + 3; a++) {
        s.off[a] = s.from[a] * (1 - e);
        s.ang[a] = s.fromAng[a] * (1 - e);
      }
    }
    write(1);
    if (s.t >= RETURN) {
      s.phase = "rest";
      s.off.fill(0);
      s.ang.fill(0);
      write(1);
    }
  });

  const width = layout.width * cell;
  const height = layout.height * cell;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const centre = worldOf(placement, at.x, height / 2, at.z);
  const depth = cell * 4;

  const punch = () => {
    const s = sim;
    if (s.phase === "scatter" || s.phase === "return") return;
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
    const world = useWorld.getState();
    if (world.reducedMotion) {
      s.phase = "squash";
      s.t = 0;
      return;
    }
    // blocks fly out of the front (+z, toward the tour camera); in play mode away from Ezra's fist
    let dx = 0;
    let dz = 1;
    if (world.mode === "play") {
      const wx = centre.x - runtime.player.pos.x;
      const wz = centre.z - runtime.player.pos.z;
      const len = Math.hypot(wx, wz);
      if (len > 1e-3) {
        dx = (wx * cos - wz * sin) / len;
        dz = (wx * sin + wz * cos) / len;
      }
    }
    const r = mulberry32(hashString(id) ^ Math.floor(performance.now()));
    for (let j = 0; j < count * 3; j += 3) {
      const side = (r() - 0.5) * 6;
      const out = 1 + r() * 3;
      s.off[j] = s.off[j + 1] = s.off[j + 2] = 0;
      s.ang[j] = s.ang[j + 1] = s.ang[j + 2] = 0;
      s.vel[j] = dx * out + dz * side;
      s.vel[j + 1] = 2 + r() * 5;
      s.vel[j + 2] = dz * out - dx * side;
      s.spin[j] = (r() - 0.5) * 8;
      s.spin[j + 1] = (r() - 0.5) * 8;
      s.spin[j + 2] = (r() - 0.5) * 8;
    }
    s.phase = "scatter";
    s.t = 0;
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
