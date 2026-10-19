import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { respawn, stepCharacter } from "@/world/engine/physics/character";
import { cloudCatchRide, shouldCloudCatch } from "@/world/engine/physics/edge";
import type { CharacterInput } from "@/world/engine/physics/character";
import { playSfx, type SfxName } from "@/world/engine/audio/sfx";
import { setLoop, stopLoops } from "@/world/engine/audio/loops";
import { runtime } from "@/world/state/runtime";
import { TITLE_DELAY, announceIsland } from "@/world/ui/islandAnnounce";
import type { Ride } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { axisFromKeys, cameraRelative, sharedKeyboard } from "@/world/input/keyboard";
import { consumeTouch, touchInput } from "@/world/input/touch";
import { advanceRide, rideHeading } from "./crossings/ride";
import { cutsStandUp, holdDropInput, islandUnder } from "./modes";
import { arrivalSpot, stepTravel, travelFade } from "./travel";
import { RUN_TRAIL_EVERY, fallWind, footfalls, landingRing, landingWeight, surfaceOfBlock, type Surface } from "./ezra/footfall";
import { blockDef } from "@/world/engine/voxel/blocks";
import type { BuiltWorld } from "@/world/engine/worldBuild";
import type { Vec3 } from "@/world/engine/types";

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

/** Ezra stands on a bridge's ramp (its planks). */
function onBridge(built: BuiltWorld, pos: Vec3): boolean {
  const ramp = built.ramps.surfaceAt(pos.x, pos.z, pos.y);
  return ramp !== null && Math.abs(ramp - pos.y) < 0.05;
}

/** Each surface's footfall and landing. */
const STEP_SOUND: Record<Surface, SfxName> = { grass: "stepGrass", stone: "stepStone", wood: "stepWood" };
const LAND_SOUND: Record<Surface, SfxName> = { grass: "land", stone: "landStone", wood: "landWood" };

/** What Ezra stands on: a bridge's ramp is wood, a prop's top wood, else the drawn block under his feet. */
function surfaceUnder(built: BuiltWorld, pos: Vec3): Surface {
  if (onBridge(built, pos)) return "wood";
  const id = built.grid.get(Math.floor(pos.x), Math.floor(pos.y - 0.05), Math.floor(pos.z));
  const def = id ? blockDef(id) : undefined;
  if (!def) return "wood"; // nothing drawn under him: a prop's top (a crate, a table, a gentong)
  return def.visible ? surfaceOfBlock(def.name) : "stone"; // invisible: the stepping stones
}

export function PlayerController() {
  const camera = useThree((s) => s.camera);
  const tmp = useMemo(
    () => ({
      dir: new THREE.Vector3(),
      input: { moveX: 0, moveZ: 0, run: false, jump: false } as CharacterInput,
      stepTimer: 0,
      /** the highest his feet reached since he last stood (a landing's ring grows with the drop) */
      peak: 0,
      fade: 0,
      fading: false as false | "out" | "in",
      ride: null as Ride | null,
      exitHeading: null as number | null,
      /** which foot steps next (-1 left, 1 right): footfalls lean a touch to that side */
      foot: 1,
      /** this frame's continuous sounds (engine/audio/loops): the rush of a fall, the cart's rattle and its speed */
      fall: 0,
      rail: 0,
      railSpeed: 0,
    }),
    [],
  );

  const frame = (dt: number) => {
    const built = runtime.built;
    if (!built) return;
    const p = runtime.player;
    if (runtime.landTimer > 0) runtime.landTimer = Math.max(0, runtime.landTimer - dt);
    if (runtime.teeter > 0) runtime.teeter = Math.max(0, runtime.teeter - dt);
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
          playSfx("appear");
          runtime.stepOffset = 0;
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
        runtime.stepOffset = 0;
        announceIsland(tr.to, TITLE_DELAY.travel);
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
      const railing = ride.kind === "rail";
      const was = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      const done = advanceRide(ride, p, dt);
      // the cart rattles along at its pace; at the far station it brakes and knocks the buffer
      if (railing && ride.kind === "rail") {
        tmp.rail = 1;
        tmp.railSpeed = Math.hypot(p.pos.x - was.x, p.pos.y - was.y, p.pos.z - was.z) / Math.max(dt, 1e-3);
      } else if (railing) {
        playSfx("brake");
        playSfx("clunk", { delay: 0.1 });
      }
      if (ride.kind === "arc" && !done) tmp.fall = fallWind(p.vel.y);
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
        playSfx(LAND_SOUND[surfaceUnder(built, p.pos)]);
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

    const before = p.pos.y;
    const r = stepCharacter(p, input, dt, {
      isSolid: built.grid.isSolid,
      colliders: built.props,
      ramps: built.ramps,
      killY: runtime.killY,
      // walking never leaves an island (engine/physics/edge.ts); a drop into Play is already in the air
      edgeGuard: true,
    });
    if (runtime.dropping && p.onGround) runtime.dropping = false;

    // a missed jump: the cloud sea catches him and throws him back onto his last footing (an arc ride, landed like a
    // bounce pad's), instead of the respawn fade, which stays only as the net under it (killY)
    if (shouldCloudCatch(p) && !tmp.fading) {
      runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.4, z: p.pos.z }, "cloud");
      playSfx("whump");
      runtime.ride = cloudCatchRide(p);
      p.locked = true;
      p.vel.x = p.vel.y = p.vel.z = 0;
      runtime.teeter = 0;
      return;
    }

    // held at a rim: he teeters (anim.ts) while the push lasts; the first hold drops a few grains over the rim and
    // makes a wobbly "whoa"
    if (r.teetered && !r.jumped && Math.hypot(input.moveX, input.moveZ) > 0.05) {
      if (runtime.teeter === 0) {
        const out = { x: p.pos.x + input.moveX * 0.35, y: p.pos.y - 0.05, z: p.pos.z + input.moveZ * 0.35 };
        runtime.particles.burst(out, "grit", { count: 4 });
        playSfx("teeter");
      }
      runtime.teeter = 0.3;
    }
    if (p.onGround) {
      // the island he stands on is the active one in Play too (the tour camera only sets it while touring)
      const island = islandUnder(runtime.layout.islands, p.pos.x, p.pos.z);
      if (island) useWorld.getState().setActiveIsland(island.id); // change-guarded in the store
    }

    if (!p.locked && Math.hypot(input.moveX, input.moveZ) > 0.05) runtime.heading = dampAngle(runtime.heading, Math.atan2(input.moveX, input.moveZ), 12, dt);
    // at a rim the guard holds his step but keeps his velocity (so a jump still carries him): he is not walking
    runtime.speed = runtime.teeter > 0 && p.onGround ? 0 : Math.hypot(p.vel.x, p.vel.z);
    runtime.moving = runtime.speed > 0.3;
    const prevPhase = runtime.animPhase;
    runtime.animPhase += runtime.speed * dt * 1.7;

    // a step up climbs at once in the physics; the model catches up (Ezra.tsx), never more than a block behind
    if (r.stepped && !r.jumped) runtime.stepOffset = Math.max(-1.2, runtime.stepOffset - Math.max(0, p.pos.y - before));
    runtime.airTime = r.jumped ? 0 : runtime.airTime + dt;
    if (r.jumped) playSfx("jump");
    if (!p.onGround) {
      tmp.peak = Math.max(tmp.peak, p.pos.y);
      tmp.fall = fallWind(p.vel.y);
    }
    const surface = p.onGround || r.landed ? surfaceUnder(built, p.pos) : "grass";
    const puff = surface === "wood" ? "chips" : surface === "stone" ? "grit" : "grass";
    const feet = { x: p.pos.x, y: p.pos.y + 0.05, z: p.pos.z };
    if (r.landed) {
      runtime.landTimer = 0.14;
      // a dust ring that grows with the drop (footfall.ts), and bits of what he landed on
      const ring = landingRing(tmp.peak - p.pos.y);
      if (ring) runtime.particles.burst(feet, "dust", { count: ring.count, ring: true, speedScale: ring.speed });
      runtime.particles.burst(feet, puff, { count: 4 });
      // louder and lower the higher the drop, with a deep thump under a big one
      const w = landingWeight(tmp.peak - p.pos.y);
      playSfx(LAND_SOUND[surface], { volume: w.volume, rate: w.rate });
      if (w.heavy > 0) playSfx("landHeavy", { volume: w.heavy });
    }
    if (p.onGround) tmp.peak = p.pos.y;
    // a puff of what he walks on at every footfall, and its sound: softer and a touch lower walking, left and right
    // feet a little apart; a bridge's planks creak now and then
    if (p.onGround && runtime.moving && footfalls(prevPhase, runtime.animPhase) > 0) {
      const running = runtime.speed > 5.5;
      runtime.particles.burst(feet, puff, { count: running ? 3 : 2 });
      tmp.foot = -tmp.foot;
      playSfx(STEP_SOUND[surface], { volume: running ? 1 : 0.6, rate: running ? 1.04 : 0.96, pan: tmp.foot * 0.12 });
      if (surface === "wood" && Math.random() < 0.18 && onBridge(built, p.pos)) playSfx("creak");
    }
    // running: a thin trail of dust behind his heels
    if (p.onGround && runtime.speed > 5.5) {
      tmp.stepTimer -= dt;
      if (tmp.stepTimer <= 0) {
        tmp.stepTimer = RUN_TRAIL_EVERY;
        const back = 0.25;
        runtime.particles.burst(
          { x: p.pos.x - Math.sin(runtime.heading) * back, y: p.pos.y + 0.04, z: p.pos.z - Math.cos(runtime.heading) * back },
          "dust",
          { count: 1, speedScale: 0.4 },
        );
      }
    }
    if (r.fellOut && !tmp.fading) {
      tmp.fading = "out";
      playSfx("fallAway");
    }
  };
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    tmp.fall = 0;
    tmp.rail = 0;
    frame(dt);
    setLoop("fall", tmp.fall, dt);
    setLoop("rail", tmp.rail, dt, tmp.railSpeed);
  });
  // the loops are this frame's: none may keep rushing or rattling after the controller is gone
  useEffect(() => () => stopLoops(), []);
  return null;
}
