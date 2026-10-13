import type { IslandPlacement } from "@/world/engine/gen/layout";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { WorldText } from "@/world/scene/WorldText";
import { islandFrame, worldTuple } from "./local";
import { PALETTE } from "./props";
import { useHoverLift } from "./useHoverLift";

const POST_H = 2.1;
const BOARD_Y = POST_H - 0.25;
const OFF = "#9b938a";

/** Arrow signpost that opens a project's real site in a new tab. Greyed out and inactive while `url` is empty. */
export function Signpost({
  id, placement, at, label, url, rotationY = 0,
}: {
  id: string;
  placement: IslandPlacement;
  at: { x: number; z: number };
  label: string;
  url: string | undefined;
  rotationY?: number;
}) {
  const enabled = Boolean(url);
  const lift = useHoverLift(id);
  const wood = enabled ? PALETTE.plank[0] : OFF;
  const open = () => {
    if (!url) return;
    playSfx("link");
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]}>
          <mesh position={[0, POST_H / 2, 0]} castShadow>
            <boxGeometry args={[0.16, POST_H, 0.16]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
          <group ref={lift}>
            <mesh position={[0.15, BOARD_Y, 0.1]} castShadow>
              <boxGeometry args={[2.0, 0.5, 0.08]} />
              <meshStandardMaterial color={wood} roughness={0.85} />
            </mesh>
            <mesh position={[1.27, BOARD_Y, 0.1]} rotation={[0, 0, Math.PI / 4]} castShadow>
              <boxGeometry args={[0.36, 0.36, 0.08]} />
              <meshStandardMaterial color={wood} roughness={0.85} />
            </mesh>
            <WorldText text={label} position={[0.12, BOARD_Y, 0.16]} size={0.2} color={enabled ? "#3a2a1c" : "#6e6760"} font="ui" anchorX="center" maxWidth={1.9} />
          </group>
        </group>
      </group>
      <Interactable
        id={id}
        island={placement.id}
        label={label}
        position={worldTuple(placement, at.x + 0.15, BOARD_Y, at.z + 0.1)}
        size={[2.3, 0.8, 0.6]}
        radius={2.4}
        onActivate={open}
        enabled={() => enabled}
      />
    </>
  );
}
