import { useEffect, useMemo } from "react";
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
import { InteractionController } from "./InteractionController";
import { Lights } from "./Lights";
import { ParticlesRenderer } from "./ParticlesRenderer";
import { PlayCamera } from "./PlayCamera";
import { PlayerController } from "./PlayerController";
import { RoomEnv } from "./RoomEnv";
import { Sky } from "./Sky";
import { TourCamera } from "./TourCamera";
import { Bridge } from "./crossings/Bridge";
import { BouncePad } from "./crossings/BouncePad";
import { Minecart } from "./crossings/Minecart";
import { SteppingStones } from "./crossings/SteppingStones";
import { stampCrossings } from "./crossings/stamp";

function build(): BuiltWorld {
  const stamps: Array<(grid: VoxelGrid) => void> = runtime.layout.islands.map(
    (p) => (grid: VoxelGrid) => ISLANDS[p.id]?.stamp?.(grid, p),
  );
  const built = buildWorld(runtime.layout, [...stamps, (grid: VoxelGrid) => stampCrossings(grid, runtime.layout)]);
  runtime.built = built;
  // Ezra sits on the hero island's rim on the side of the hero's tour camera, clear of stamped props (so this runs
  // after the island and crossing stamps); seated, he turns his head toward that camera (seat.viewerHeading)
  const hero = runtime.islandById("hero");
  const shape = built.shapes.hero;
  if (shape) {
    const top = islandTop(hero);
    const cam = ISLANDS.hero?.tourStop(hero).camera;
    const toViewer = cam ? { x: cam.x - top.x, z: cam.z - top.z } : { x: -VIEW_F.x, z: -VIEW_F.z };
    runtime.seat = findSeat(shape, hero.origin, toViewer, built.grid.isSolid);
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
      <ParticlesRenderer />
      <InteractionController />
      <PlayerController />
      <PlayCamera />
      <TourCamera />
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
