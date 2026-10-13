import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { LEG, pickAnim, poseFor } from "./ezra/anim";

// colours from the approved sketch and the avatar photo: black tee, short black hair, jeans, light shoes
const C = {
  jeans: "#4b5a6e",
  shirt: "#2e3336",
  skin: "#d6ab88",
  hair: "#1e1b19",
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

// model faces +Z, its left is +X; limbs are symmetric about their own pivot
const GEO = {
  // pivot at the hip; runs half a leg past the knee so a bent knee stays square
  thigh: part([[0.22, 0.41, 0.22, 0, -0.185, 0, C.jeans]]),
  // pivot at the knee (LEG.knee below the hip); sole bottom at −LEG.shin, heel at LEG.back, toe at LEG.toe
  shin: part([
    [0.22, 0.26, 0.22, 0, -0.11, 0, C.jeans],
    [0.24, 0.09, 0.3, 0, -0.265, 0.04, C.shoe],
    [0.25, 0.035, 0.31, 0, -0.3225, 0.04, C.sole],
  ]),
  // body group origin (feet); the hips reach below the hip pivot so a seated Ezra has no gap under him
  body: part([
    [0.5, 0.2, 0.3, 0, 0.66, 0, C.jeans],
    [0.56, 0.58, 0.32, 0, 1.04, 0, C.shirt],
    [0.2, 0.08, 0.2, 0, 1.35, 0, C.skin],
  ]),
  // pivot at the shoulder
  arm: part([
    [0.18, 0.22, 0.2, 0, -0.09, 0, C.shirt],
    [0.15, 0.36, 0.16, 0, -0.37, 0, C.skin],
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
    // short hair as one mass: pieces share outer planes and overlap past their rounded edges so no seams
    // show; the hairline dips at his right temple and the volume sweeps up at the front
    [0.54, 0.11, 0.52, 0, 0.495, -0.005, C.hair, 0.012],
    [0.54, 0.35, 0.08, 0, 0.345, -0.225, C.hair, 0.012],
    [0.05, 0.22, 0.52, 0.245, 0.41, -0.005, C.hair, 0.012],
    [0.05, 0.22, 0.52, -0.245, 0.41, -0.005, C.hair, 0.012],
    [0.54, 0.13, 0.07, 0, 0.435, 0.22, C.hair, 0.012],
    [0.16, 0.08, 0.07, -0.17, 0.385, 0.22, C.hair, 0.012],
    [0.44, 0.11, 0.3, -0.03, 0.545, 0.105, C.hair, 0.012],
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

  useFrame((state) => {
    if (!root.current || !body.current || !legL.current || !legR.current || !kneeL.current || !kneeR.current) return;
    if (!armL.current || !armR.current || !head.current) return;
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
        {/* legs pivot at the hips, knees LEG.knee lower (the rim-clearance tests use the same rig) */}
        <group ref={legL} position={[LEG.hipX, LEG.hipY, 0]}>
          <mesh geometry={GEO.thigh} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={kneeL} position={[0, -LEG.knee, 0]}>
            <mesh geometry={GEO.shin} material={MAT} castShadow={cast} receiveShadow={cast} />
          </group>
        </group>
        <group ref={legR} position={[-LEG.hipX, LEG.hipY, 0]}>
          <mesh geometry={GEO.thigh} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={kneeR} position={[0, -LEG.knee, 0]}>
            <mesh geometry={GEO.shin} material={MAT} castShadow={cast} receiveShadow={cast} />
          </group>
        </group>
        <group ref={armL} position={[0.37, 1.28, 0]}>
          <mesh geometry={GEO.arm} material={MAT} castShadow={cast} receiveShadow={cast} />
        </group>
        <group ref={armR} position={[-0.37, 1.28, 0]}>
          <mesh geometry={GEO.arm} material={MAT} castShadow={cast} receiveShadow={cast} />
        </group>
        <group ref={head} position={[0, 1.36, 0]}>
          <mesh geometry={GEO.head} material={MAT} castShadow={cast} receiveShadow={cast} />
        </group>
      </group>
    </group>
  );
}
