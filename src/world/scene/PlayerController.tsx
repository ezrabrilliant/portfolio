import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { respawn, stepCharacter } from "@/world/engine/physics/character";
import type { CharacterInput } from "@/world/engine/physics/character";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import type { Ride } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { axisFromKeys, cameraRelative, sharedKeyboard } from "@/world/input/keyboard";
import { consumeTouch, touchInput } from "@/world/input/touch";
import { advanceRide, rideHeading } from "./crossings/ride";
import { cutsStandUp, holdDropInput, islandUnder } from "./modes";
import { arrivalSpot, stepTravel, travelFade } from "./travel";

const TAU = Math.PI * 2;
function dampAngle(a: number, b: number, lambda: number, dt: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-lambda * dt));
}

/** Drops jump presses made while Ezra can't act on them (tour scroll, ride, respawn), so they don't fire later. */
function drainJump() {
  sharedKeyboard.consume("Space");
  consumeTouch("jump");
}

function setFade(opacity: number) {
  const el = document.getElementById("world-fade");
  if (el) el.style.opacity = String(opacity);
}

export function PlayerController() {
  const camera = useThree((s) => s.camera);
  const tmp = useMemo(
    () => ({
      dir: new THREE.Vector3(),
      input: { moveX: 0, moveZ: 0, run: false, jump: false } as CharacterInput,
      stepTimer: 0,
      fade: 0,
      fading: false as false | "out" | "in",
      ride: null as Ride | null,
      exitHeading: null as number | null,
    }),
    [],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const built = runtime.built;
    if (!built) return;
    const p = runtime.player;
    if (runtime.landTimer > 0) runtime.landTimer = Math.max(0, runtime.landTimer - dt);
    if (runtime.standUp > 0) {
      runtime.standUp = Math.max(0, runtime.standUp - dt);
      if (runtime.standUp === 0) p.locked = false;
    }
    if (useWorld.getState().mode !== "play") {
      runtime.moving = false;
      runtime.speed = 0;
      drainJump();
      // leaving Play mid-respawn must not leave the screen dimmed (entering Play re-places the player)
      if (tmp.fading) {
        tmp.fading = false;
        tmp.fade = 0;
        setFade(0);
      }
      // the same for a fast travel: Ezra shows again where he is
      if (runtime.travel) {
        runtime.travel = null;
        runtime.hidden = false;
        setFade(0);
      }
      return;
    }

    // respawn fade: out (0.25 s) → teleport → in (0.35 s)
    if (tmp.fading) {
      if (tmp.fading === "out") {
        tmp.fade = Math.min(1, tmp.fade + dt / 0.25);
        if (tmp.fade === 1) {
          respawn(p);
          runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.2, z: p.pos.z }, "dust", { count: 14 });
          tmp.fading = "in";
        }
      } else {
        tmp.fade = Math.max(0, tmp.fade - dt / 0.35);
        if (tmp.fade === 0) tmp.fading = false;
      }
      setFade(tmp.fade);
      if (tmp.fading === "out") {
        drainJump();
        return;
      }
    }

    // fast travel from a map board (travel.ts): puff away, fade, move to a landing column, puff back; no input meanwhile
    const tr = runtime.travel;
    if (tr) {
      drainJump();
      runtime.moving = false;
      runtime.speed = 0;
      const event = stepTravel(tr, dt);
      if (event === "vanish") {
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z }, "dust", { count: 18 });
        playSfx("poof");
        runtime.hidden = true;
      } else if (event === "arrive") {
        const island = runtime.islandById(tr.to);
        const spot = arrivalSpot(built.blocked, island, runtime.tourPath?.stops.find((s) => s.id === tr.to));
        Object.assign(p.pos, spot.pos);
        Object.assign(p.lastSafe, spot.pos);
        p.vel.x = p.vel.y = p.vel.z = 0;
        p.onGround = true;
        p.sinceGround = 0;
        p.locked = false;
        runtime.heading = spot.heading;
        runtime.landTimer = 0.14;
        useWorld.getState().setActiveIsland(island.id);
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z }, "dust", { count: 18 });
        playSfx("poof");
        runtime.hidden = false;
      } else if (event === "done") {
        runtime.travel = null;
      }
      setFade(runtime.travel ? travelFade(tr) : 0);
      return;
    }

    if (runtime.ride) {
      drainJump();
      const ride = runtime.ride;
      if (ride !== tmp.ride) {
        // a new ride: a cart ride ends in a hop-out arc and should leave Ezra facing into the island
        tmp.ride = ride;
        tmp.exitHeading = ride.kind === "rail" ? ride.exitHeading : null;
      }
      const done = advanceRide(ride, p, dt);
      // read ride.kind only now: advanceRide turns a finished cart ride into its hop arc in place
      if (ride.kind === "rail") runtime.heading = rideHeading(ride);
      else if (tmp.exitHeading !== null) runtime.heading = done ? tmp.exitHeading : dampAngle(runtime.heading, tmp.exitHeading, 14, dt);
      else runtime.heading = Math.atan2(ride.to.x - ride.from.x, ride.to.z - ride.from.z);
      runtime.speed = 0;
      runtime.moving = true;
      if (done) {
        runtime.ride = null;
        tmp.ride = null;
        tmp.exitHeading = null;
        p.locked = false;
        p.vel.x = p.vel.y = p.vel.z = 0;
        p.onGround = true;
        runtime.landTimer = 0.14;
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.1, z: p.pos.z }, "dust", { count: 10 });
        playSfx("land");
      }
      return;
    }

    const ax = axisFromKeys(sharedKeyboard.keys);
    const forward = THREE.MathUtils.clamp(ax.forward + touchInput.moveForward, -1, 1);
    const right = THREE.MathUtils.clamp(ax.right + touchInput.moveRight, -1, 1);
    camera.getWorldDirection(tmp.dir);
    const move = cameraRelative(forward, right, tmp.dir);
    const input = tmp.input;
    input.moveX = move.x;
    input.moveZ = move.z;
    input.jump = sharedKeyboard.consume("Space") || consumeTouch("jump");
    input.run = sharedKeyboard.keys.has("ShiftLeft") || sharedKeyboard.keys.has("ShiftRight");
    // dropping into Play: no steering or jump until he lands (a held W would carry him onto a prop)
    holdDropInput(input, runtime.dropping);
    // moving cuts the stand-up stretch short: the first push already walks
    if (cutsStandUp(runtime.standUp, { x: input.moveX, z: input.moveZ })) {
      runtime.standUp = 0;
      p.locked = false;
    }

    const r = stepCharacter(p, input, dt, {
      isSolid: built.grid.isSolid,
      colliders: built.props,
      killY: runtime.killY,
    });
    if (runtime.dropping && p.onGround) runtime.dropping = false;
    if (p.onGround) {
      // the island he stands on is the active one in Play too (the tour camera only sets it while touring)
      const island = islandUnder(runtime.layout.islands, p.pos.x, p.pos.z);
      if (island) useWorld.getState().setActiveIsland(island.id); // change-guarded in the store
    }

    if (!p.locked && Math.hypot(input.moveX, input.moveZ) > 0.05) runtime.heading = dampAngle(runtime.heading, Math.atan2(input.moveX, input.moveZ), 12, dt);
    runtime.speed = Math.hypot(p.vel.x, p.vel.z);
    runtime.moving = runtime.speed > 0.3;
    runtime.animPhase += runtime.speed * dt * 1.7;

    if (r.jumped) playSfx("jump");
    if (r.landed) {
      runtime.landTimer = 0.14;
      runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.1, z: p.pos.z }, "dust", { count: 8 });
      playSfx("land");
    }
    if (p.onGround && runtime.speed > 5.5) {
      tmp.stepTimer -= dt;
      if (tmp.stepTimer <= 0) {
        tmp.stepTimer = 0.28;
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.05, z: p.pos.z }, "dust", { count: 3 });
        playSfx("step");
      }
    }
    if (r.fellOut && !tmp.fading) tmp.fading = "out";
  });
  return null;
}
