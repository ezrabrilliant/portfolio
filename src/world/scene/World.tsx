import { useEffect, useMemo } from "react";
import { milestones } from "@/config/portfolio";
import { buildWorld } from "@/world/engine/worldBuild";
import type { BuiltWorld } from "@/world/engine/worldBuild";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { ISLANDS } from "./islands";
import { VIEW_F, islandTop } from "./islands/types";
import { Ezra } from "./Ezra";
import { ReadySignal } from "./ReadySignal";
import { findSeat } from "./ezra/seat";
import { IslandTerrain } from "./IslandTerrain";
import { InitialView } from "./InitialView";
import { CloseupCamera } from "./CloseupCamera";
import { CloseupController } from "./CloseupController";
import { InteractionController } from "./InteractionController";
import { Lights } from "./Lights";
import { ParticlesRenderer } from "./ParticlesRenderer";
import { openCloseup } from "./closeupState";
import { PlayCamera } from "./PlayCamera";
import { SeeThrough } from "./SeeThrough";
import { PlayerController } from "./PlayerController";
import { RoomEnv } from "./RoomEnv";
import { Sky } from "./Sky";
import { TourCamera } from "./TourCamera";
import { Bridge } from "./crossings/Bridge";
import { BouncePad } from "./crossings/BouncePad";
import { Minecart } from "./crossings/Minecart";
import { SteppingStones } from "./crossings/SteppingStones";
import { stampCrossings } from "./crossings/stamp";
import { bridgeRamp } from "./crossings/geometry";
import { Milestones } from "./milestones/Milestones";
import { Critters } from "./critters/Critters";
import { Gold } from "./gold/Gold";
import { stampMilestones } from "./milestones/stamp";
import { milestoneSpotsFor, pillarCollider } from "./milestones/placement";
import { islandColliders } from "./islands/colliders";

function build(): BuiltWorld {
  const stamps: Array<(grid: VoxelGrid) => void> = runtime.layout.islands.map(
    (p) => (grid: VoxelGrid) => ISLANDS[p.id]?.stamp?.(grid, p),
  );
  const built = buildWorld(runtime.layout, [
    ...stamps,
    (grid: VoxelGrid) => stampCrossings(grid, runtime.layout),
    // after the crossings: the pillars and the floating stone never take a bridge or stepping-stone cell
    (grid: VoxelGrid) => stampMilestones(grid, runtime.layout, milestones.map((m) => m.year)),
  ], [
    ...runtime.layout.islands.flatMap((p) => islandColliders(p.id, p)),
    ...milestoneSpotsFor(runtime.layout, milestones.map((m) => m.year)).map(pillarCollider),
  ], runtime.layout.crossings.filter((c) => c.kind === "bridge").map((c) => bridgeRamp(c.a, c.b)));
  runtime.built = built;
  // Ezra sits on the hero island's rim on the side of the hero's tour camera, clear of stamped props (so this runs
  // after the island and crossing stamps); seated, he turns his head toward that camera (seat.viewerHeading)
  const hero = runtime.islandById("hero");
  const shape = built.shapes.hero;
  if (shape) {
    const top = islandTop(hero);
    const cam = ISLANDS.hero?.tourStop(hero).camera;
    const toViewer = cam ? { x: cam.x - top.x, z: cam.z - top.z } : { x: -VIEW_F.x, z: -VIEW_F.z };
    runtime.seat = findSeat(shape, hero.origin, toViewer, built.blocked);
    Object.assign(runtime.player.pos, runtime.seat.pos);
    Object.assign(runtime.player.lastSafe, islandTop(hero));
    runtime.heading = runtime.seat.heading;
  }
  return built;
}

export function World() {
  const quality = useWorld((s) => s.quality);
  const built = useMemo(build, []);

  // ?burst debug hook: confetti over the hero island every 0.6 s (used by screenshots)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("burst")) return;
    const top = islandTop(runtime.islandById("hero"));
    const id = window.setInterval(() => runtime.particles.burst({ x: top.x, y: top.y + 2.5, z: top.z }, "confetti"), 600);
    return () => window.clearInterval(id);
  }, []);

  // ?closeup=<screen id> debug hook (screenshots): open that screen's closeup once it has registered and the world is ready
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("closeup");
    if (!id) return;
    let raf = 0;
    const tick = () => {
      if (useWorld.getState().ready && runtime.closeups.has(id)) openCloseup(id);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <Sky />
      <Lights />
      <RoomEnv />
      <InitialView />
      {runtime.layout.islands.map((p) => {
        const batch = built.batches[p.id];
        return batch ? <IslandTerrain key={`terrain-${p.id}`} batch={batch} quality={quality} /> : null;
      })}
      {runtime.layout.islands.map((p) => {
        const M = ISLANDS[p.id];
        return M ? <M.Component key={`island-${p.id}`} placement={p} /> : null;
      })}
      <Milestones />
      <Critters />
      <Gold />
      <ParticlesRenderer />
      <InteractionController />
      <CloseupController />
      <PlayerController />
      <PlayCamera />
      <TourCamera />
      {/* after both cameras (and before crossings and Ezra): blends their pose toward the screen in closeup and back */}
      <CloseupCamera />
      {/* after every camera: fades props on the camera → Ezra line */}
      <SeeThrough />
      {/* crossings after the controllers and cameras: the minecart and pads read this frame's ride and tour progress */}
      {runtime.layout.crossings.map((c) => {
        const key = `crossing-${c.from}-${c.to}`;
        if (c.kind === "bridge")
          return (
            <group key={key}>
              <Bridge crossing={c} />
              <SteppingStones crossing={c} />
            </group>
          );
        if (c.kind === "bouncePads") return <BouncePad key={key} crossing={c} />;
        return <Minecart key={key} crossing={c} />;
      })}
      {/* keep Ezra after PlayerController and the cameras: his frame callback reads this frame's player
          position (no one-frame lag) and the final camera position (hides the model when it's inside his head) */}
      <Ezra />
      <ReadySignal />
    </>
  );
}
