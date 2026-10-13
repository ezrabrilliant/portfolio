import type { IslandPlacement } from "@/world/engine/gen/layout";
import { WorldText } from "@/world/scene/WorldText";
import { islandFrame } from "./local";
import { PALETTE } from "./props";
import { wrapWords } from "./text";

const WIDTH = 2.4; // keep in sync with INFO_HALF_SPAN in layouts.ts (posts at ±(WIDTH / 2 − 0.2))
const POST_H = 1.0;
const ROW = 0.3;

/** Wooden board on two posts: a title and short lines of real numbers. Rendered in island-local space. */
export function InfoBoard({
  placement, at, title, lines, rotationY = 0,
}: {
  placement: IslandPlacement;
  at: { x: number; z: number };
  title: string;
  lines: readonly string[];
  rotationY?: number;
}) {
  const rows = lines.flatMap((l) => wrapWords(l, Math.floor(WIDTH * 9)));
  const boardH = 0.62 + ROW * rows.length;
  const top = POST_H + boardH;
  return (
    <group position={islandFrame(placement)}>
      <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]}>
        {[-1, 1].map((s) => (
          // post front face (z = -0.05 + 0.07) stays behind the board's front face (z = 0.05): no z-fighting
          <mesh key={s} position={[s * (WIDTH / 2 - 0.2), (POST_H + 0.3) / 2, -0.05]} castShadow>
            <boxGeometry args={[0.14, POST_H + 0.3, 0.14]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, POST_H + boardH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WIDTH, boardH, 0.1]} />
          <meshStandardMaterial color={PALETTE.plank[0]} roughness={0.85} />
        </mesh>
        <WorldText text={title} position={[0, top - 0.28, 0.06]} size={0.26} color="#3a2a1c" font="ui" anchorX="center" maxWidth={WIDTH - 0.2} />
        {rows.map((row, i) => (
          <WorldText key={`${i}-${row}`} text={row} position={[0, top - 0.62 - i * ROW, 0.06]} size={0.2} color="#4a3626" font="ui" anchorX="center" maxWidth={WIDTH - 0.2} />
        ))}
      </group>
    </group>
  );
}
