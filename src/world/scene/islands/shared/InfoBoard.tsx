import type { IslandPlacement } from "@/world/engine/gen/layout";
import { WorldText } from "@/world/scene/WorldText";
import { INFO_BOARD, infoBoardTop } from "./boardGeometry";
import { islandFrame } from "./local";
import { PALETTE } from "./props";
import { infoBoardRows } from "./text";

// shared with layouts.ts (INFO_HALF_SPAN, the mini boards' barrier rows) and the tour-view rules
const { width: WIDTH, postH: POST_H, postInset: POST_INSET } = INFO_BOARD;

/**
 * Wooden board on two posts: a title and short lines of copy. Rendered in island-local space. `scale` shrinks the whole
 * board (posts, panel and text) about its foot: the radius-4 minis use MINI_BOARD_SCALE (layouts.ts).
 */
export function InfoBoard({
  placement, at, title, lines, rotationY = 0, scale = 1,
}: {
  placement: IslandPlacement;
  at: { x: number; z: number };
  title: string;
  lines: readonly string[];
  rotationY?: number;
  scale?: number;
}) {
  const rows = infoBoardRows(title, lines); // a long title wraps and the board grows to keep it clear of the body
  const boardH = rows.height;
  const top = infoBoardTop(rows);
  return (
    <group position={islandFrame(placement)}>
      <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]} scale={scale}>
        {[-1, 1].map((s) => (
          // post front face (z = -0.05 + 0.07) stays behind the board's front face (z = 0.05): no z-fighting
          <mesh key={s} position={[s * (WIDTH / 2 - POST_INSET), (POST_H + 0.3) / 2, -0.05]} castShadow>
            <boxGeometry args={[0.14, POST_H + 0.3, 0.14]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, POST_H + boardH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WIDTH, boardH, 0.1]} />
          <meshStandardMaterial color={PALETTE.plank[0]} roughness={0.85} />
        </mesh>
        {rows.title.map((row, i) => (
          <WorldText key={`t${i}-${row}`} text={row} position={[0, top - rows.titleY[i], 0.06]} size={0.26} color="#3a2a1c" font="ui" anchorX="center" maxWidth={WIDTH - 0.2} />
        ))}
        {rows.body.map((row, i) => (
          <WorldText key={`b${i}-${row}`} text={row} position={[0, top - rows.bodyY[i], 0.06]} size={0.2} color="#4a3626" font="ui" anchorX="center" maxWidth={WIDTH - 0.2} />
        ))}
      </group>
    </group>
  );
}
