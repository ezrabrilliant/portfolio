import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { bakeBoxes } from "@/world/scene/shared/bake";
import { paintMat } from "@/world/scene/crossings/materials";
import { islandTop } from "@/world/scene/islands/types";
import { ORBIT } from "@/world/scene/islands/layouts";
import { islandFrame } from "@/world/scene/islands/shared/local";
import { birdPerches, chickenHome } from "./places";
import { birdOffset, butterflyAt, chickenAt, createBird, stepBird, wingFlap, type Bird } from "./motion";

/** Drawn sizes: small enough to be critters, big enough to read from the tour. */
const SIZE = { bird: 1.3, chicken: 1.4, cat: 1.5 } as const;
/** Seconds of standing still before a butterfly settles on Ezra's head. */
const LAND_AFTER = 7;
/** Islands with butterflies, and how many over each. */
const BUTTERFLY_ISLANDS: Record<string, number> = { hero: 3, "petak-umpet": 3, "web-plaza": 2, gtid: 2, pedulipasal: 2 };
const WING_COLORS = ["#f6f1e3", "#f2c14e", "#f08a4b", "#9cc7ef"];
/** A wing: a thin plate whose root sits on the body's centre line. */
const WING_GEO = new THREE.BoxGeometry(0.14, 0.012, 0.11).translate(0.07, 0, 0);
const WING_MAT = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, side: THREE.DoubleSide });

/** A small blocky bird, beak to +z, feet at 0. */
const BIRD_GEO = bakeBoxes(
  [
    [0.16, 0.14, 0.24, 0, 0.12, 0, "#5d6f86"],
    [0.13, 0.12, 0.12, 0, 0.23, 0.1, "#5d6f86"],
    [0.05, 0.04, 0.07, 0, 0.22, 0.19, "#e0a53c"],
    [0.1, 0.03, 0.12, 0, 0.14, -0.17, "#4b5a6e"],
    [0.13, 0.04, 0.1, 0, 0.15, 0.02, "#e9e4d8"],
  ],
  "a bird",
);
const BIRD_WING_GEO = new THREE.BoxGeometry(0.16, 0.025, 0.14).translate(0.08, 0, 0);
const BIRD_WING_MAT = new THREE.MeshStandardMaterial({ color: "#4b5a6e", roughness: 0.9 });

/** The chicken: body and legs (the head pecks on its own). */
const CHICKEN_BODY = bakeBoxes(
  [
    [0.26, 0.22, 0.32, 0, 0.24, 0, "#f6f3ea"],
    [0.18, 0.16, 0.08, 0, 0.3, -0.18, "#ece6d8"],
    [0.04, 0.12, 0.04, 0.06, 0.06, 0, "#e0a53c"],
    [0.04, 0.12, 0.04, -0.06, 0.06, 0, "#e0a53c"],
  ],
  "a chicken",
);
const CHICKEN_HEAD = bakeBoxes(
  [
    [0.13, 0.14, 0.13, 0, 0.07, 0.04, "#f6f3ea"],
    [0.04, 0.07, 0.09, 0, 0.17, 0.04, "#d8473b"],
    [0.05, 0.04, 0.06, 0, 0.06, 0.13, "#e0a53c"],
    [0.03, 0.05, 0.03, 0, 0.0, 0.09, "#d8473b"],
  ],
  "a chicken's head",
);

/** The cat curled up asleep: body, head, ears (the tail swishes on its own). */
const CAT_BODY = bakeBoxes(
  [
    [0.34, 0.16, 0.22, 0, 0.08, 0, "#e19a52"],
    [0.18, 0.15, 0.17, 0.2, 0.09, 0.03, "#e19a52"],
    [0.05, 0.06, 0.04, 0.25, 0.19, 0.08, "#c47c3a"],
    [0.05, 0.06, 0.04, 0.25, 0.19, -0.02, "#c47c3a"],
    [0.12, 0.03, 0.2, -0.05, 0.165, 0, "#c47c3a"],
  ],
  "a cat",
);
const CAT_TAIL = bakeBoxes([[0.26, 0.05, 0.05, -0.13, 0.03, 0, "#c47c3a"]], "a cat's tail");

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const scale = new THREE.Vector3();
/** Half a turn about the body's axis: the right wing's plate becomes the left one. */
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

function Butterflies() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const flies = useMemo(() => {
    const out: { anchor: THREE.Vector3; phase: number; color: string }[] = [];
    for (const p of runtime.layout.islands) {
      const n = BUTTERFLY_ISLANDS[p.id] ?? 0;
      const top = islandTop(p);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + p.seed;
        out.push({ anchor: new THREE.Vector3(top.x + Math.cos(a) * 1.8, top.y, top.z + Math.sin(a) * 1.8), phase: a * 1.7, color: WING_COLORS[(i + p.seed) % WING_COLORS.length] });
      }
    }
    return out;
  }, []);
  const pos = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const ahead = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  // per fly: how far it is shooed off (eased), and the one that settles on Ezra's head when he stands still a while
  const st = useMemo(() => ({ flee: flies.map(() => ({ x: 0, y: 0, z: 0 })), still: 0, lander: -1, land: 0 }), [flies]);
  useFrame(({ clock }, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const reduced = useWorld.getState().reducedMotion;
    mesh.visible = !reduced;
    if (reduced) return;
    const t = clock.elapsedTime;
    const play = useWorld.getState().mode === "play";
    const ez = runtime.player.pos;
    // standing still in Play for LAND_AFTER seconds invites the nearest butterfly onto his head; moving sends it off
    st.still = play && runtime.speed < 0.2 ? st.still + dt : 0;
    if (st.still > LAND_AFTER && st.lander < 0) {
      let best = -1, bd = 10;
      flies.forEach((f, i) => {
        const d = Math.hypot(f.anchor.x - ez.x, f.anchor.z - ez.z);
        if (d < bd) { bd = d; best = i; }
      });
      st.lander = best;
    }
    if (st.still === 0 && st.land <= 0.001) st.lander = -1;
    st.land += ((st.still > LAND_AFTER && st.lander >= 0 ? 1 : 0) - st.land) * (1 - Math.exp(-(st.still > 0 ? 0.9 : 3) * dt));
    flies.forEach((f, i) => {
      butterflyAt(f.anchor, f.phase, t, pos);
      butterflyAt(f.anchor, f.phase, t + 0.05, ahead);
      // shooed: Ezra within a block and a bit pushes it up and away
      const fl = st.flee[i];
      const dx = pos.x - ez.x, dz = pos.z - ez.z, dy = pos.y - (ez.y + 1);
      const d = Math.hypot(dx, dy, dz);
      const push = play && d < 1.4 && i !== st.lander ? (1.4 - d) * 2.2 : 0;
      const k = 1 - Math.exp(-(push > 0 ? 6 : 0.8) * dt);
      fl.x += ((push * dx) / (d || 1) - fl.x) * k;
      fl.z += ((push * dz) / (d || 1) - fl.z) * k;
      fl.y += (push * 0.8 - fl.y) * k;
      pos.x += fl.x; pos.y += fl.y; pos.z += fl.z;
      let yaw = Math.atan2(ahead.x - pos.x, ahead.z - pos.z);
      let flap = wingFlap(t, f.phase);
      if (i === st.lander && st.land > 0.001) {
        // settling on his head: it eases onto the top of his hair and fans its wings slowly
        const u = st.land;
        pos.x += (ez.x - pos.x) * u;
        pos.y += (ez.y + 2.12 - pos.y) * u;
        pos.z += (ez.z - pos.z) * u;
        yaw = yaw * (1 - u) + runtime.heading * u;
        flap = flap * (1 - u) + (0.5 + 0.35 * Math.sin(t * 1.6)) * u;
      }
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? 1 : -1;
        q.setFromEuler(e.set(0, yaw, side * flap, "YXZ"));
        // the left wing is the right one turned half round about the body's axis
        if (side < 0) q.multiply(FLIP);
        m4.compose(v.set(pos.x, pos.y, pos.z), q, one);
        mesh.setMatrixAt(i * 2 + k, m4);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  const colored = useRef(false);
  return (
    <instancedMesh
      ref={(m) => {
        ref.current = m;
        if (!m || colored.current) return;
        colored.current = true;
        const c = new THREE.Color();
        flies.forEach((f, i) => {
          m.setColorAt(i * 2, c.set(f.color));
          m.setColorAt(i * 2 + 1, c);
        });
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }}
      args={[WING_GEO, WING_MAT, flies.length * 2]}
      frustumCulled={false}
    />
  );
}

function Birds() {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  // one bird on a post cap at each bridge's first end, facing along the bridge; it flies off away from the island
  const birds = useMemo(() => birdPerches().map((b) => ({ ...b, perch: new THREE.Vector3(b.perch.x, b.perch.y, b.perch.z), state: createBird() as Bird })), []);
  const off = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  useFrame(({ clock }, dt) => {
    const b = bodies.current, w = wings.current;
    if (!b || !w) return;
    const t = clock.elapsedTime;
    const play = useWorld.getState().mode === "play";
    const reduced = useWorld.getState().reducedMotion;
    const p = runtime.player.pos;
    birds.forEach((bird, i) => {
      const d = play ? Math.hypot(p.x - bird.perch.x, p.z - bird.perch.z) + Math.max(0, bird.perch.y - p.y - 2) : 99;
      const was = bird.state.mode;
      if (!reduced) stepBird(bird.state, d, Math.min(dt, 0.1));
      if (was === "perch" && bird.state.mode === "away") playSfx("chirp", { at: bird.perch });
      const shown = birdOffset(bird.state, bird.dir, off);
      const flying = bird.state.mode !== "perch";
      // flying off it faces away; coming back it faces its post; perched it looks about
      const yaw = flying ? Math.atan2(bird.dir.x, bird.dir.z) + (bird.state.mode === "back" ? Math.PI : 0) : bird.yaw + 0.4 * Math.sin(t * 0.7 + i);
      // perched: a little hop of the head now and then (the whole bird bobs); flying: wings beat
      const bob = flying ? 0 : 0.015 * Math.max(0, Math.sin(t * 3 + i * 2)) ** 8;
      const s = shown ? 1 : 0;
      v.set(bird.perch.x + off.x, bird.perch.y + off.y + bob, bird.perch.z + off.z);
      q.setFromEuler(e.set(0, yaw, 0, "YXZ"));
      b.setMatrixAt(i, m4.compose(v, q, scale.setScalar(s * SIZE.bird)));
      const beat = flying ? 0.9 * Math.sin(t * 22 + i) : -0.15;
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? 1 : -1;
        q.setFromEuler(e.set(0, yaw + (side < 0 ? Math.PI : 0), side * beat, "YXZ"));
        m4.compose(v.set(bird.perch.x + off.x, bird.perch.y + off.y + bob + 0.15 * SIZE.bird, bird.perch.z + off.z), q, scale.setScalar(s * SIZE.bird));
        w.setMatrixAt(i * 2 + k, m4);
      }
    });
    b.instanceMatrix.needsUpdate = true;
    w.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bodies} args={[BIRD_GEO, paintMat, birds.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={wings} args={[BIRD_WING_GEO, BIRD_WING_MAT, birds.length * 2]} frustumCulled={false} />
    </>
  );
}

/** The chicken pecks round a spot by the POS stall's table. */
function Chicken() {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const spot = useMemo(() => {
    const h = chickenHome();
    return new THREE.Vector3(h.x, h.y, h.z);
  }, []);
  // fed: it stops to peck fast for a while; startled (Ezra running past): it hops with a flap and a cluck
  const st = useMemo(() => ({ fed: -99, hop: -99, clock: 0 }), []);
  const feed = () => {
    st.fed = st.clock;
    const r = root.current;
    playSfx("cluck", { at: r ? r.position : spot });
    if (r) runtime.particles.burst({ x: r.position.x, y: r.position.y + 0.9, z: r.position.z }, "seeds");
  };
  useFrame(({ clock }) => {
    if (!root.current || !head.current) return;
    const reduced = useWorld.getState().reducedMotion;
    const t = reduced ? 0 : clock.elapsedTime;
    st.clock = clock.elapsedTime;
    const fed = st.clock - st.fed < 4;
    const c = chickenAt(fed ? Math.floor(st.fed / 4) * 4 + 2.5 : t, 0.45);
    const r = root.current;
    // Ezra running close by startles it
    const ez = runtime.player.pos;
    if (useWorld.getState().mode === "play" && runtime.speed > 5.5 && Math.hypot(ez.x - r.position.x, ez.z - r.position.z) < 1.3 && st.clock - st.hop > 1.5) {
      st.hop = st.clock;
      playSfx("cluck", { at: r.position, volume: 1.2 });
      runtime.particles.burst({ x: r.position.x, y: r.position.y + 0.4, z: r.position.z }, "feathers");
    }
    const h = st.clock - st.hop;
    const hop = h < 0.5 && !reduced ? Math.sin((Math.PI * h) / 0.5) * 0.45 : 0;
    r.position.set(spot.x + c.x, spot.y + hop, spot.z + c.z);
    r.rotation.y = c.heading;
    // pecking dips the head down quickly (faster when fed); walking nods it
    head.current.rotation.x = fed ? 0.95 * Math.max(0, Math.sin(st.clock * 14)) : c.pecking ? 0.9 * Math.max(0, Math.sin(t * 9)) : 0.15 * Math.sin(t * 8);
  });
  return (
    <>
      <group ref={root} scale={SIZE.chicken}>
        <mesh geometry={CHICKEN_BODY} material={paintMat} castShadow />
        <mesh ref={head} geometry={CHICKEN_HEAD} material={paintMat} position={[0, 0.3, 0.13]} />
      </group>
      <Interactable id="pos-chicken" island="pos-monosuko" label="Feed the chicken" position={[spot.x, spot.y + 0.4, spot.z]} size={[1.4, 0.9, 1.4]} radius={2.2} onActivate={feed} />
    </>
  );
}

/** The cat asleep on top of Orbit's crate stack: breathing, its tail swishing now and then. */
function Cat() {
  const body = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.Mesh>(null);
  const spot = useMemo(() => {
    const p = runtime.islandById("orbit-store");
    const [fx, fy, fz] = islandFrame(p);
    const top = ORBIT.crates.find((c) => c.stack > 0) ?? ORBIT.crates[0];
    return { pos: new THREE.Vector3(fx + top.x, fy + top.stack + top.s, fz + top.z), ry: top.ry };
  }, []);
  // petted: it wakes, arches up, purrs and sheds little hearts for a few seconds, its tail going
  const st = useMemo(() => ({ pet: -99, clock: 0, heart: 0 }), []);
  const pet = () => {
    if (st.clock - st.pet < 2.5) return;
    st.pet = st.clock;
    playSfx("purr", { at: spot.pos });
  };
  useFrame(({ clock }, dt) => {
    if (!body.current || !tail.current) return;
    const reduced = useWorld.getState().reducedMotion;
    const t = clock.elapsedTime;
    st.clock = t;
    const since = t - st.pet;
    const awake = since < 3 ? Math.sin((Math.PI * Math.min(since, 3)) / 3) : 0;
    body.current.scale.y = (reduced ? 1 : 1 + 0.05 * Math.sin(t * 1.4)) * (1 + 0.35 * awake);
    body.current.position.y = 0.04 * awake;
    tail.current.rotation.y = reduced ? 0.3 : 0.3 + (awake > 0 ? 0.7 * Math.sin(t * 9) * awake : 0.5 * Math.sin(t * 2.2) * Math.max(0, Math.sin(t * 0.4)) ** 4);
    if (awake > 0.2) {
      st.heart -= dt;
      if (st.heart <= 0) {
        st.heart = 0.35;
        runtime.particles.burst({ x: spot.pos.x, y: spot.pos.y + 0.45, z: spot.pos.z }, "hearts", { count: 1 });
      }
    }
  });
  return (
    <>
      <group position={spot.pos} rotation={[0, spot.ry, 0]} scale={SIZE.cat}>
        <mesh ref={body} geometry={CAT_BODY} material={paintMat} castShadow />
        <mesh ref={tail} geometry={CAT_TAIL} material={paintMat} position={[-0.17, 0.02, 0]} />
      </group>
      <Interactable id="orbit-cat" island="orbit-store" label="Pet the cat" position={[spot.pos.x, spot.pos.y + 0.2, spot.pos.z]} size={[0.9, 0.6, 0.9]} radius={2.4} onActivate={pet} />
    </>
  );
}

export function Critters() {
  return (
    <>
      <Butterflies />
      <Birds />
      <Chicken />
      <Cat />
    </>
  );
}

