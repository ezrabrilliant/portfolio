import type { IslandPlacement } from "@/world/engine/gen/layout";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { WorldText } from "@/world/scene/WorldText";
import { SIGNPOST, SIGNPOST_HIT } from "./boardGeometry";
import { islandFrame, worldTuple } from "./local";
import { PALETTE } from "./props";
import { useHoverLift } from "./useHoverLift";

// the sign's extents and hit area are shared with the tour-view rules (boardGeometry.ts)
const { postW: POST_W, postH: POST_H, boardX: BOARD_X, boardY: BOARD_Y, boardW: BOARD_W, boardH: BOARD_H } = SIGNPOST;
const { arrowX: ARROW_X, arrowSize: ARROW, faceZ: FACE_Z, faceDepth: FACE_D } = SIGNPOST;
const { cx: HIT_CX, cz: HIT_CZ, hx: HIT_HX, hz: HIT_HZ } = SIGNPOST_HIT;
const OFF = "#9b938a";

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
      <group position={islandFrame(placement)} userData={{ passable: true }}>
        <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]} scale={scale}>
          <mesh position={[0, POST_H / 2, 0]} castShadow>
            <boxGeometry args={[POST_W, POST_H, POST_W]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
          <group ref={lift}>
            <mesh position={[BOARD_X, BOARD_Y, FACE_Z]} castShadow>
              <boxGeometry args={[BOARD_W, BOARD_H, FACE_D]} />
              <meshStandardMaterial color={wood} roughness={0.85} />
            </mesh>
            <mesh position={[ARROW_X, BOARD_Y, FACE_Z]} rotation={[0, 0, Math.PI / 4]} castShadow>
              <boxGeometry args={[ARROW, ARROW, FACE_D]} />
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
