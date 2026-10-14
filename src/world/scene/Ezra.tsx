import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { LEG, pickAnim, poseFor } from "./ezra/anim";
import { CAP_ON_HEAD_Y, EZRA_FIT, GOWN_POP_Y } from "./graduation";
import { GownSkirt, GownSleeve, GraduationCap, GraduationGown } from "./GraduationCap";
import { capPopScale } from "./milestones/moment";

// colours from the approved sketch and the avatar photo: black tee, short black hair, jeans, light shoes
const C = {
  jeans: "#4b5a6e",
  shirt: "#2e3336",
  skin: "#d09676",
  hair: "#1e1b19",
  // the clipper-short sides and back: skin shows through, so they read lighter than the top, lightest at the nape
  fade: "#463830",
  nape: "#624a3e",
  shoe: "#e7e2d8",
  sole: "#b3ab9e",
};

/** [width, height, depth, x, y, z, colour, corner radius?] relative to the part's pivot. */
type Box = readonly [number, number, number, number, number, number, string, number?];

/** Bakes a rig part into one rounded, vertex-coloured geometry (one draw call per part). */
function part(boxes: readonly Box[]): THREE.BufferGeometry {
  const c = new THREE.Color();
  const pieces = boxes.map(([w, h, d, x, y, z, colour, radius = 0.035]) => {
    const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, Math.min(w, h, d) * 0.3));
    g.translate(x, y, z);
    c.set(colour);
    const n = g.attributes.position.count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return g;
  });
  const merged = mergeGeometries(pieces);
  for (const g of pieces) g.dispose();
  if (!merged) throw new Error("Ezra: could not merge part geometry");
  return merged;
}

/** A box `halfW` / `halfD` either side of its part's pivot axis (centred `z` forward), from height `bottom` up to `top`. */
function slab(halfW: number, halfD: number, bottom: number, top: number, colour: string, z = 0): Box {
  return [2 * halfW, top - bottom, 2 * halfD, 0, (top + bottom) / 2, z, colour];
}

// model faces +Z, its left is +X; limbs are symmetric about their own pivot. The torso, hips, arms, legs and shoes are
// built from EZRA_FIT (graduation.ts), the measurements the graduation gown is cut to, so the two cannot drift apart
const F = EZRA_FIT;
/** The shoe's top below the knee (the sole's bottom is LEG.shin below it). */
const SHOE_TOP = -(LEG.shin - F.shoe);
const GEO = {
  // pivot at the hip; runs half a leg past the knee so a bent knee stays square
  thigh: part([slab(F.thigh.half, F.thigh.half, -F.thigh.bottom, F.thigh.top, C.jeans)]),
  // pivot at the knee (LEG.knee below the hip); sole bottom at −LEG.shin, heel at LEG.back, toe at LEG.toe
  shin: part([
    slab(F.thigh.half, F.thigh.half, SHOE_TOP - 0.02, F.thigh.top, C.jeans),
    slab(0.12, 0.15, SHOE_TOP - 0.09, SHOE_TOP, C.shoe, 0.04),
    slab(0.125, 0.155, -LEG.shin, -LEG.shin + 0.035, C.sole, 0.04),
  ]),
  // body group origin (feet); the hips reach below the hip pivot so a seated Ezra has no gap under him
  body: part([
    slab(F.hips.halfW, F.hips.halfD, F.hips.bottom, F.hips.top, C.jeans),
    slab(F.torso.halfW, F.torso.halfD, F.torso.bottom, F.torso.top, C.shirt),
    [0.2, 0.08, 0.2, 0, 1.35, 0, C.skin],
  ]),
  // pivot at the shoulder: the tee sleeve, then the forearm and hand
  arm: part([
    slab(F.arm.halfW, F.arm.halfD, -F.arm.sleeve, F.arm.top, C.shirt),
    slab(F.arm.skin.halfW, F.arm.skin.halfD, -F.arm.hand, -F.arm.skin.top, C.skin),
  ]),
  // pivot at the base of the head
  head: part([
    [0.5, 0.46, 0.46, 0, 0.23, 0, C.skin],
    [0.05, 0.11, 0.09, 0.265, 0.2, -0.01, C.skin],
    [0.05, 0.11, 0.09, -0.265, 0.2, -0.01, C.skin],
    // face: two eyes and brows
    [0.065, 0.085, 0.02, 0.11, 0.19, 0.235, C.hair],
    [0.065, 0.085, 0.02, -0.11, 0.19, 0.235, C.hair],
    [0.11, 0.03, 0.02, 0.11, 0.275, 0.235, C.hair],
    [0.11, 0.03, 0.02, -0.11, 0.275, 0.235, C.hair],
    // tapered sides and back sit flush on the head so the ears show; only the top stands proud of them, and
    // that step is what reads as a haircut instead of a helmet
    [0.53, 0.25, 0.03, 0, 0.335, -0.238, C.fade, 0.01],
    [0.53, 0.14, 0.03, 0, 0.15, -0.238, C.nape, 0.01],
    [0.03, 0.17, 0.4, 0.258, 0.375, -0.03, C.fade, 0.01],
    [0.03, 0.17, 0.4, -0.258, 0.375, -0.03, C.fade, 0.01],
    [0.03, 0.08, 0.17, 0.258, 0.25, -0.155, C.fade, 0.01],
    [0.03, 0.08, 0.17, -0.258, 0.25, -0.155, C.fade, 0.01],
    [0.03, 0.14, 0.17, 0.258, 0.15, -0.155, C.nape, 0.01],
    [0.03, 0.14, 0.17, -0.258, 0.15, -0.155, C.nape, 0.01],
    [0.03, 0.07, 0.05, 0.258, 0.27, 0.105, C.fade, 0.01],
    [0.03, 0.07, 0.05, -0.258, 0.27, 0.105, C.fade, 0.01],
    // the top: a high hairline with his left temple lower, then messy volume pushed up and forward, one strand
    // flaring out at his right
    [0.54, 0.12, 0.49, 0, 0.5, 0.005, C.hair, 0.012],
    [0.54, 0.06, 0.05, 0, 0.445, 0.23, C.hair, 0.012],
    [0.15, 0.08, 0.05, 0.185, 0.4, 0.228, C.hair, 0.012],
    [0.05, 0.12, 0.12, 0.248, 0.43, 0.18, C.hair, 0.012],
    [0.26, 0.11, 0.24, -0.12, 0.595, 0.12, C.hair, 0.012],
    [0.2, 0.08, 0.18, 0.11, 0.575, 0.15, C.hair, 0.012],
    [0.3, 0.06, 0.2, 0, 0.57, -0.1, C.hair, 0.012],
    [0.06, 0.08, 0.14, -0.265, 0.55, 0.13, C.hair, 0.012],
  ]),
};
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
/** Head height above the feet; the model hides while a camera is inside this radius of it (play-camera wall clamp). */
const HEAD_Y = 1.6;
const HIDE_NEAR = 0.6;
const SHOW_FAR = 0.7;

export function Ezra() {
  const cast = useWorld((s) => s.quality === "high");
  const reduced = useWorld((s) => s.reducedMotion);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const thighL = useRef<THREE.Mesh>(null);
  const thighR = useRef<THREE.Mesh>(null);
  const cap = useRef<THREE.Group>(null);
  const gown = useRef<THREE.Group>(null);
  const sleeveL = useRef<THREE.Group>(null);
  const sleeveR = useRef<THREE.Group>(null);
  const skirtL = useRef<THREE.Group>(null);
  const skirtR = useRef<THREE.Group>(null);
  const capAge = useRef(0);
  // everything the graduation moment puts on him: shown, and popped, together
  const outfit = [cap, gown, sleeveL, sleeveR, skirtL, skirtR];

  useFrame((state, dt) => {
    if (!root.current || !body.current || !legL.current || !legR.current || !kneeL.current || !kneeR.current) return;
    if (!armL.current || !armR.current || !head.current) return;
    // between a fast travel's two puffs he is gone; in a closeup he would stand in front of a low screen
    if (runtime.hidden || runtime.closeup !== null) {
      root.current.visible = false;
      return;
    }
    const p = runtime.player;
    const seated = runtime.seated && runtime.seat !== null;
    const anim = pickAnim({
      onGround: p.onGround,
      speed: runtime.speed,
      vy: p.vel.y,
      landTimer: runtime.landTimer,
      seated,
      standUp: runtime.standUp,
      riding: runtime.ride?.kind === "rail",
    });
    const seat = runtime.seat;
    // seated, he turns his head half way toward the hero's tour camera (World aims the seat at it)
    const toViewer = seat ? seat.viewerHeading - seat.heading : 0;
    const look = 0.5 * Math.atan2(Math.sin(toViewer), Math.cos(toViewer));
    const pose = poseFor(anim, state.clock.elapsedTime, runtime.animPhase, { standUp: runtime.standUp, reduced, look });
    if (seated && runtime.seat) {
      root.current.position.set(runtime.seat.pos.x, runtime.seat.pos.y, runtime.seat.pos.z);
      root.current.rotation.y = runtime.seat.heading;
    } else {
      root.current.position.set(p.pos.x, p.pos.y, p.pos.z);
      root.current.rotation.y = runtime.heading;
    }
    body.current.position.y = pose.bodyY;
    body.current.position.z = pose.bodyZ;
    body.current.scale.y = pose.squash;
    body.current.rotation.x = pose.lean;
    legL.current.rotation.x = pose.legL;
    legR.current.rotation.x = pose.legR;
    kneeL.current.rotation.x = pose.kneeL;
    kneeR.current.rotation.x = pose.kneeR;
    armL.current.rotation.set(pose.armL, 0, pose.armSpread);
    armR.current.rotation.set(pose.armR, 0, -pose.armSpread);
    head.current.rotation.set(pose.headPitch, pose.headYaw, 0);
    // the graduation outfit (Play moment): cap and gown pop on together with a small overshoot (reduced motion: they
    // are simply there). Each piece grows from its own pivot: the sleeves from the shoulders, the skirt halves from the
    // hips, the gown body from his chest. Once the gown is fully on, the thighs it wraps are not drawn
    const on = runtime.capOn;
    capAge.current = on ? capAge.current + dt : 0;
    const s = on && !reduced ? Math.max(0.001, capPopScale(capAge.current)) : 1;
    for (let i = 0; i < outfit.length; i++) {
      const o = outfit[i].current;
      if (!o) continue;
      o.visible = on;
      o.scale.setScalar(s);
    }
    if (gown.current) gown.current.position.y = GOWN_POP_Y * (1 - s);
    const bare = !on || s !== 1;
    if (thighL.current) thighL.current.visible = bare;
    if (thighR.current) thighR.current.visible = bare;

    // a camera pressed against his head (wall clamp) would see the model from inside: hide it until it backs off
    const cam = state.camera.position;
    const r = root.current.position;
    const dy = cam.y - (r.y + HEAD_Y + pose.bodyY);
    const d2 = (cam.x - r.x) ** 2 + dy * dy + (cam.z - r.z) ** 2;
    if (root.current.visible ? d2 < HIDE_NEAR * HIDE_NEAR : d2 > SHOW_FAR * SHOW_FAR) root.current.visible = !root.current.visible;
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh geometry={GEO.body} material={MAT} castShadow={cast} receiveShadow={cast} />
        {/* legs pivot at the hips, knees LEG.knee lower (the rim-clearance tests use the same rig); each gown skirt
            half rides on its leg, so no stride can push a leg through it */}
        <group ref={legL} position={[LEG.hipX, LEG.hipY, 0]}>
          <mesh ref={thighL} geometry={GEO.thigh} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={kneeL} position={[0, -LEG.knee, 0]}>
            <mesh geometry={GEO.shin} material={MAT} castShadow={cast} receiveShadow={cast} />
          </group>
          <group ref={skirtL} visible={false}>
            <GownSkirt side="left" cast={cast} />
          </group>
        </group>
        <group ref={legR} position={[-LEG.hipX, LEG.hipY, 0]}>
          <mesh ref={thighR} geometry={GEO.thigh} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={kneeR} position={[0, -LEG.knee, 0]}>
            <mesh geometry={GEO.shin} material={MAT} castShadow={cast} receiveShadow={cast} />
          </group>
          <group ref={skirtR} visible={false}>
            <GownSkirt side="right" cast={cast} />
          </group>
        </group>
        <group ref={armL} position={[EZRA_FIT.shoulder.x, EZRA_FIT.shoulder.y, 0]}>
          <mesh geometry={GEO.arm} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={sleeveL} visible={false}>
            <GownSleeve side="left" cast={cast} />
          </group>
        </group>
        <group ref={armR} position={[-EZRA_FIT.shoulder.x, EZRA_FIT.shoulder.y, 0]}>
          <mesh geometry={GEO.arm} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={sleeveR} visible={false}>
            <GownSleeve side="right" cast={cast} />
          </group>
        </group>
        <group ref={head} position={[0, 1.36, 0]}>
          <mesh geometry={GEO.head} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={cap} position={[0, CAP_ON_HEAD_Y, 0]} visible={false}>
            <GraduationCap cast={cast} />
          </group>
        </group>
        <group ref={gown} visible={false}>
          <GraduationGown cast={cast} />
        </group>
      </group>
    </group>
  );
}
