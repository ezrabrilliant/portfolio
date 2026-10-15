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
import { mulberry32 } from "@/world/engine/gen/rng";

// planks, their beams, the posts and caps are one instanced draw, coloured per instance; the deck's ends lie on the
// islands' grass with their tops flush with it, so pull the whole deck forward in depth
const deckMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const PLANK_SIZE: [number, number, number] = [2.1, 0.18, 0.42];
/** Every third plank is a little shorter, and each lies a hair askew: a hand-laid deck, still square blocks. */
const SHORT_PLANK = 1.86;
const PLANK_SKEW = 0.05;
/** Three tones of plank wood, picked per plank. */
const PLANK_TONES = [PLANK, "#ad8458", "#c69d6e"] as const;
/** The two beams under the plank ends (one short segment per plank, so they sway with it). */
const BEAM = { side: 0.9, size: 0.16, drop: 0.16, color: "#7a5a3c" } as const;
const POST_SIDE = 1.05;
/** The end posts: taller than the rail rope, each with a cap block. */
const POST = { h: 1.45, w: 0.18, cap: 0.26, capColor: "#5a4130" } as const;
/** The rail ropes' height over the deck at the posts, their sag at mid-span, and a hanger down to the deck every this many planks. */
const RAIL = { h: 1.15, sag: 0.35, hangerEvery: 2, hangerR: 0.018 } as const;
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
  // per plank: its length, its skew and its tone, the same on every visit (seeded by the bridge's anchors)
  const looks = useMemo(() => {
    const r = mulberry32(Math.floor(Math.abs(crossing.a.x * 73 + crossing.a.z * 31 + crossing.b.x * 17 + crossing.b.z * 7)) + 1);
    return planks.map((_, i) => ({ w: i % 3 === 1 ? SHORT_PLANK : PLANK_SIZE[0], skew: (r() * 2 - 1) * PLANK_SKEW, tone: PLANK_TONES[Math.floor(r() * PLANK_TONES.length)] }));
  }, [planks, crossing]);
  // planks, then two beam segments per plank, then the four posts and their caps
  const n = planks.length;
  const count = 3 * n + 8;
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, "YXZ"), p: new THREE.Vector3(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dirty: true }),
    [],
  );

  /** Writes the planks and their beam segments (the only instances that move); posts are written once. */
  const writeDeck = () => {
    const mesh = ref.current;
    if (!mesh) return;
    const px = -uz, pz = ux;
    for (let i = 0; i < n; i++) {
      const pl = planks[i];
      const y = pl.y + offsets[i];
      // turned along the bridge (a hair askew) and tilted with its ramp (a turn of -pitch about x lifts the far end)
      tmp.q.setFromEuler(tmp.e.set(-pl.pitch, pl.yaw + looks[i].skew, 0));
      tmp.p.set(pl.x, y, pl.z);
      tmp.s.set(looks[i].w, PLANK_SIZE[1], PLANK_SIZE[2]);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
      tmp.q.setFromEuler(tmp.e.set(-pl.pitch, pl.yaw, 0));
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? BEAM.side : -BEAM.side;
        tmp.p.set(pl.x + px * side, y - BEAM.drop, pl.z + pz * side);
        tmp.s.set(BEAM.size, BEAM.size, 0.52);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(n + 2 * i + k, tmp.m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    const yaw = Math.atan2(ux, uz);
    for (let i = 0; i < n; i++) {
      mesh.setColorAt(i, color.set(looks[i].tone));
      mesh.setColorAt(n + 2 * i, color.set(BEAM.color));
      mesh.setColorAt(n + 2 * i + 1, color);
    }
    let k = 3 * n;
    for (const e of [crossing.a, crossing.b]) {
      for (const side of [POST_SIDE, -POST_SIDE]) {
        tmp.q.setFromAxisAngle(tmp.up, yaw);
        tmp.p.set(e.x - uz * side, e.y + POST.h / 2 - 0.1, e.z + ux * side);
        tmp.s.set(POST.w, POST.h, POST.w);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(k, tmp.m);
        mesh.setColorAt(k++, color.set(WOOD));
        tmp.p.set(e.x - uz * side, e.y + POST.h - 0.1 + POST.cap / 2, e.z + ux * side);
        tmp.s.set(POST.cap, POST.cap, POST.cap);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(k, tmp.m);
        mesh.setColorAt(k++, color.set(POST.capColor));
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
    const at = (s: number, side: number) =>
      new THREE.Vector3(
        crossing.a.x + (crossing.b.x - crossing.a.x) * s - uz * side,
        crossing.a.y + (crossing.b.y - crossing.a.y) * s + RAIL.h - RAIL.sag * Math.sin(Math.PI * s),
        crossing.a.z + (crossing.b.z - crossing.a.z) * s + ux * side,
      );
    const rail = (side: number) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => at(i / 12, side))), 24, 0.035, 5, false);
    const parts: THREE.BufferGeometry[] = [rail(POST_SIDE), rail(-POST_SIDE)];
    // hangers: a rope from each rail down to the beam under it, every few planks over the gap
    for (let i = RAIL.hangerEvery; i < n - 1; i += RAIL.hangerEvery) {
      const pl = planks[i];
      if (pl.grounded) continue;
      for (const side of [POST_SIDE, -POST_SIDE]) {
        const top = at(pl.s, side);
        const bottom = pl.y - BEAM.drop;
        const h = top.y - bottom;
        if (h < 0.2) continue;
        const g = new THREE.CylinderGeometry(RAIL.hangerR, RAIL.hangerR, h, 4);
        g.translate(top.x, bottom + h / 2, top.z);
        parts.push(g);
      }
    }
    const merged = mergeGeometries(parts, false)!;
    for (const g of parts) g.dispose();
    return merged;
  }, [crossing, ux, uz, planks, n]);
  useEffect(() => () => ropes.dispose(), [ropes]);

  return (
    <group>
      <instancedMesh ref={ref} args={[unitBox, deckMat, count]} castShadow={cast} receiveShadow />
      <mesh geometry={ropes} material={ropeMat} />
    </group>
  );
}
