import { useMemo } from "react";
import { buildWorld } from "@/world/engine/worldBuild";
import type { BuiltWorld } from "@/world/engine/worldBuild";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { STAR_ISLANDS } from "./islands";
import { IslandTerrain } from "./IslandTerrain";
import { InitialView } from "./InitialView";
import { Lights } from "./Lights";
import { RoomEnv } from "./RoomEnv";
import { Sky } from "./Sky";

function build(): BuiltWorld {
  const stamps: Array<(grid: VoxelGrid) => void> = runtime.layout.islands.map(
    (p) => (grid: VoxelGrid) => STAR_ISLANDS[p.id]?.stamp?.(grid, p),
  );
  const built = buildWorld(runtime.layout, stamps);
  runtime.built = built;
  return built;
}

export function World() {
  const quality = useWorld((s) => s.quality);
  const built = useMemo(build, []);
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
        const M = STAR_ISLANDS[p.id];
        return M ? <M.Component key={`island-${p.id}`} placement={p} /> : null;
      })}
    </>
  );
}
