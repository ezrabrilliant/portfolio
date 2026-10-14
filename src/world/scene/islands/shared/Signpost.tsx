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
// Hit area in the sign's local frame: board x -0.85..1.15 plus the arrow tip at 1.27 + 0.36/√2 ≈ 1.53,
// padded to x -1.0..1.6 and z -0.2..0.4 (centre (0.3, 0.1), half extents 1.3 × 0.3).
const HIT_CX = 0.3;
const HIT_CZ = 0.1;
const HIT_HX = 1.3;
const HIT_HZ = 0.3;

/**
 * Arrow signpost that opens a project's real site (or its demo path) in a new tab. Greyed out and inactive while `url`
 * is empty. `scale` shrinks the whole sign about its foot (MINI_SIGN_SCALE on the minis).
 */
export function Signpost({
  id, placement, at, label, url, rotationY = 0, scale = 1,
}: {
  id: string;
  placement: IslandPlacement;
  at: { x: number; z: number };
  label: string;
  url: string | undefined;
  rotationY?: number;
  scale?: number;
}) {
  const enabled = Boolean(url);
  const lift = useHoverLift(id);
  const wood = enabled ? PALETTE.plank[0] : OFF;
  const open = () => {
    if (!url) return;
    playSfx("link");
    window.open(url, "_blank", "noopener,noreferrer");
  };
  // the registry's hitbox is axis-aligned: rotate the local centre by rotationY and cover the rotated footprint
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const hitX = at.x + (HIT_CX * cos + HIT_CZ * sin) * scale;
  const hitZ = at.z + (-HIT_CX * sin + HIT_CZ * cos) * scale;
  const hitW = 2 * (Math.abs(cos) * HIT_HX + Math.abs(sin) * HIT_HZ) * scale;
  const hitD = 2 * (Math.abs(sin) * HIT_HX + Math.abs(cos) * HIT_HZ) * scale;
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]} scale={scale}>
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
        position={worldTuple(placement, hitX, BOARD_Y * scale, hitZ)}
        size={[hitW, 0.8 * scale, hitD]}
        radius={2.4}
        onActivate={open}
        enabled={() => enabled}
      />
    </>
  );
}
