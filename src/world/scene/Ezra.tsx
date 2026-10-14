import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { LEG, pickAnim, poseFor } from "./ezra/anim";
import { EZRA_CAP, EZRA_FIT, EZRA_HEAD } from "@/world/engine/physics/ezraModel";
import { EZRA_GEOMETRY as GEO } from "./ezra/geometry";
import { GOWN_POP_Y } from "./graduation";
import { GownSkirt, GownSleeve, GraduationCap, GraduationGown } from "./GraduationCap";
import { capPopScale } from "./milestones/moment";

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
        <group ref={head} position={[0, EZRA_HEAD.pivot, 0]}>
          <mesh geometry={GEO.head} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={cap} position={[0, EZRA_CAP.base, 0]} visible={false}>
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
