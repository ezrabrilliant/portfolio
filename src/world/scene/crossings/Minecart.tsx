import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Crossing } from "@/world/engine/gen/layout";
import { railPoint, railTangent, rideProgress } from "@/world/engine/traversal/rail";
import { stopProgress } from "@/world/engine/camera/tourPath";
import type { TourPath } from "@/world/engine/camera/tourPath";
import { playSfx } from "@/world/engine/audio/sfx";
import { worldProjects } from "@/config/portfolio";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "../Interactable";
import { WorldText } from "../WorldText";
import { scrollToIsland } from "../tour/scrollToIsland";
import { cartTourTable, sampleTable } from "./cartFollow";
import { minecartRail, railEnds, railLength } from "./geometry";

const ironMat = new THREE.MeshStandardMaterial({ color: "#4a4b4e", roughness: 0.5, metalness: 0.6 });
const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4f37", roughness: 0.9 });
const plankMat = new THREE.MeshStandardMaterial({ color: "#b98f62", roughness: 0.9 });
const unit = new THREE.BoxGeometry(1, 1, 1);
const titleOf = (id: string) => worldProjects.find((p) => p.id === id)?.title ?? id;
const CART_SAMPLES = 128;

export function Minecart({ crossing }: { crossing: Crossing }) {
  const from = runtime.islandById(crossing.from);
  const to = runtime.islandById(crossing.to);
  const ends = useMemo(() => railEnds(crossing, from, to), [crossing, from, to]);
  // laid against the islands' real terrain (World builds the grid before its children render)
  const rail = useMemo(() => minecartRail(ends, runtime.built?.grid.isSolid ?? (() => false)), [ends]);
  const duration = useMemo(() => Math.min(6, Math.max(4, railLength(rail) / 6)), [rail]);
  const cast = useWorld((s) => s.quality === "high");
  const sleepers = useRef<THREE.InstancedMesh>(null);
  const rails = useRef<THREE.InstancedMesh>(null);
  const pillars = useRef<THREE.InstancedMesh>(null);
  const cart = useRef<THREE.Group>(null);
  const SAMPLES = useMemo(() => Math.max(24, Math.round(railLength(rail) * 1.4)), [rail]);
  const PILLARS = Math.floor((SAMPLES + 2) / 6); // one per sample i with i % 6 === 3
  const segIndex = runtime.layout.tourOrder.indexOf(crossing.from);
  // dense rail samples so the cart moves without allocating per frame; the rail runs straight in x/z
  const dense = useMemo(() => {
    const pts = new Float32Array((CART_SAMPLES + 1) * 3);
    for (let i = 0; i <= CART_SAMPLES; i++) {
      const c = railPoint(rail, i / CART_SAMPLES);
      pts[i * 3] = c.x;
      pts[i * 3 + 1] = c.y;
      pts[i * 3 + 2] = c.z;
    }
    return pts;
  }, [rail]);
  const yaw = Math.atan2(ends.stationB.x - ends.stationA.x, ends.stationB.z - ends.stationA.z);
  const ux = Math.sin(yaw);
  const uz = Math.cos(yaw);
  // tour: where the cart rides as the camera crosses this leg (built on first use, once the tour path exists)
  const tour = useMemo(() => ({ path: null as TourPath | null, table: null as Float32Array | null }), []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const look = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const isSolid = runtime.built?.grid.isSolid ?? (() => false);
    for (let i = 0; i < SAMPLES; i++) {
      const u = (i + 0.5) / SAMPLES;
      const c = railPoint(rail, u);
      const t = railTangent(rail, u);
      look.lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(t.x, t.y, t.z), up);
      q.setFromRotationMatrix(look);
      p.set(c.x, c.y - 0.12, c.z);
      s.set(1.5, 0.12, 0.28);
      m.compose(p, q, s);
      sleepers.current?.setMatrixAt(i, m);
      const a = railPoint(rail, i / SAMPLES);
      const b = railPoint(rail, (i + 1) / SAMPLES);
      const segLen = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      for (const side of [-0.45, 0.45]) {
        const off = new THREE.Vector3(side, 0, 0).applyQuaternion(q);
        p.set(c.x + off.x, c.y - 0.02, c.z + off.z);
        s.set(0.08, 0.08, segLen + 0.02);
        m.compose(p, q, s);
        rails.current?.setMatrixAt(i * 2 + (side < 0 ? 0 : 1), m);
      }
      if (i % 6 === 3) {
        // trestle legs stand on the island under them; out over the gap they drop into the clouds
        let ground = -14;
        for (let y = Math.floor(c.y - 0.3); y > -14; y--) {
          if (isSolid(Math.floor(c.x), y, Math.floor(c.z))) {
            ground = y + 1;
            break;
          }
        }
        const h = Math.max(0, c.y - 0.2 - ground);
        p.set(c.x, c.y - 0.2 - h / 2, c.z);
        s.set(0.3, h, 0.3);
        m.compose(p, new THREE.Quaternion(), s);
        pillars.current?.setMatrixAt(Math.floor(i / 6), m);
      }
    }
    for (const r of [sleepers, rails, pillars]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  }, [rail, SAMPLES]);

  const startRide = (reverse: boolean) => {
    const p = runtime.player;
    const exit = reverse ? ends.standA : ends.standB;
    const island = reverse ? from : to;
    runtime.ride = {
      kind: "rail",
      t: 0,
      duration,
      rail,
      reverse,
      exit: { ...exit },
      exitHeading: Math.atan2(island.origin.x + 0.5 - exit.x, island.origin.z + 0.5 - exit.z),
    };
    p.locked = true;
    playSfx("cart");
  };

  useFrame(() => {
    const g = cart.current;
    if (!g) return;
    let u: number;
    const ride = runtime.ride;
    const world = useWorld.getState();
    const path = runtime.tourPath;
    if (ride && ride.kind === "rail" && ride.rail === rail) {
      // same easing as the ride itself (crossings/ride.ts), so Ezra stays in the cart
      const e = rideProgress(ride.t, ride.duration);
      u = ride.reverse ? 1 - e : e;
    } else if (world.mode === "tour" && path && segIndex >= 0 && segIndex + 1 < path.stops.length) {
      if (tour.path !== path) {
        tour.path = path;
        tour.table = cartTourTable(path, segIndex, rail);
      }
      const a = stopProgress(path, segIndex);
      const b = stopProgress(path, segIndex + 1);
      u = sampleTable(tour.table!, (runtime.tourProgress - a) / (b - a));
    } else {
      // parked at the station on Ezra's side of the gap
      const p = runtime.player.pos;
      const A = ends.stationA;
      const B = ends.stationB;
      u = Math.hypot(p.x - A.x, p.y - A.y, p.z - A.z) <= Math.hypot(p.x - B.x, p.y - B.y, p.z - B.z) ? 0 : 1;
    }
    const x = u * CART_SAMPLES;
    const i = Math.min(CART_SAMPLES - 1, Math.floor(x));
    const f = x - i;
    const a = i * 3;
    const b = a + 3;
    g.position.set(
      dense[a] + (dense[b] - dense[a]) * f,
      dense[a + 1] + (dense[b + 1] - dense[a + 1]) * f + 0.05,
      dense[a + 2] + (dense[b + 2] - dense[a + 2]) * f,
    );
    // tilt with the slope (order YXZ: pitch about the cart's own axis, then yaw along the rail)
    g.rotation.set(-Math.atan2(dense[b + 1] - dense[a + 1], Math.hypot(dense[b] - dense[a], dense[b + 2] - dense[a + 2])), yaw, 0);
  });

  return (
    <group>
      <instancedMesh ref={sleepers} args={[unit, woodMat, SAMPLES]} castShadow={cast} />
      <instancedMesh ref={rails} args={[unit, ironMat, SAMPLES * 2]} />
      <instancedMesh ref={pillars} args={[unit, woodMat, PILLARS]} castShadow={cast} />
      <group ref={cart} rotation-order="YXZ">
        <mesh position={[0, 0.38, 0]} material={ironMat} castShadow={cast}>
          <boxGeometry args={[1.0, 0.56, 1.3]} />
        </mesh>
        {[-0.42, 0.42].flatMap((x) =>
          [-0.4, 0.4].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]} material={woodMat}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 10]} />
            </mesh>
          )),
        )}
      </group>
      {([
        [ends.stationA, crossing.to, false, crossing.from],
        [ends.stationB, crossing.from, true, crossing.to],
      ] as const).map(([st, dest, reverse, island]) => (
        <Interactable
          key={island}
          id={`cart-${crossing.from}-${crossing.to}-${reverse ? "b" : "a"}`}
          island={island}
          label={`Ride to ${titleOf(dest)}`}
          position={[st.x, st.y + 0.6, st.z]}
          size={[2.4, 1.2, 2.4]}
          radius={2.6}
          onActivate={() => {
            if (useWorld.getState().mode === "play") {
              if (!runtime.ride) startRide(reverse);
            } else scrollToIsland(dest);
          }}
        >
          <mesh position={[st.x, st.y + 0.08, st.z]} material={plankMat} receiveShadow>
            <boxGeometry args={[2.4, 0.16, 2.4]} />
          </mesh>
          {/* sign beside the track, its board facing along it (text on both faces) */}
          <group position={[st.x - uz * 1.45, st.y, st.z + ux * 1.45]} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0.66, 0]} material={woodMat} castShadow={cast}>
              <boxGeometry args={[0.14, 1.32, 0.14]} />
            </mesh>
            <mesh position={[0, 1.62, 0]} material={plankMat} castShadow={cast}>
              <boxGeometry args={[1.7, 0.66, 0.08]} />
            </mesh>
            {[0, Math.PI].map((r) => (
              <group key={r} rotation={[0, r, 0]}>
                <WorldText text={`Minecart\n→ ${titleOf(dest)}`} position={[0, 1.62, 0.05]} size={0.2} color="#3a2a1c" />
              </group>
            ))}
          </group>
        </Interactable>
      ))}
    </group>
  );
}
