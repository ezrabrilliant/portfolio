import { blockId } from "@/world/engine/voxel/blocks";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { Interactable } from "../Interactable";
import { WorldText } from "../WorldText";
import { VIEW_F, defaultTourStop, islandTop } from "./types";
import type { StarIslandModule } from "./types";

/** Stand-in island used until Part C: a 3-block stone pillar and the island's name. */
export function placeholderIsland(id: string, title: string, dwell = 1): StarIslandModule {
  function PlaceholderComponent({ placement }: { placement: IslandPlacement }) {
    const top = islandTop(placement);
    return (
      <>
        <WorldText
          text={title}
          position={[top.x, top.y + 4.2, top.z]}
          rotationY={Math.atan2(-VIEW_F.x, -VIEW_F.z)}
          size={1.1}
        />
        <Interactable
          id={`${id}-pillar`}
          island={id}
          label={`${title} pillar`}
          position={[placement.origin.x + 0.5, top.y + 1.5, placement.origin.z + 0.5]}
          size={[1.2, 3.2, 1.2]}
          onActivate={() => undefined}
        />
      </>
    );
  }
  return {
    id,
    Component: PlaceholderComponent,
    stamp: (grid: VoxelGrid, p: IslandPlacement) => {
      for (let y = 1; y <= 3; y++) grid.set(p.origin.x, p.origin.y + y, p.origin.z, blockId("stone"));
    },
    tourStop: (p: IslandPlacement) => defaultTourStop(p, { dwell }),
  };
}
