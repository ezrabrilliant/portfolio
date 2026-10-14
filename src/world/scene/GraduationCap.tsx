import { CAP_GEOMETRY, GOWN_GEOMETRY, GRAD_MATERIAL, SKIRT_GEOMETRY, SLEEVE_GEOMETRY } from "./graduation";

type Side = "left" | "right";

/** The mortarboard (one draw call), its base at the group origin: on Ezra's head part and in the tour's cap toss. */
export function GraduationCap({ cast = true }: { cast?: boolean }) {
  return <mesh geometry={CAP_GEOMETRY} material={GRAD_MATERIAL} castShadow={cast} />;
}

/** The gown body with its hood band, ribbon and medal (one draw call), in Ezra's body space. */
export function GraduationGown({ cast = true }: { cast?: boolean }) {
  return <mesh geometry={GOWN_GEOMETRY} material={GRAD_MATERIAL} castShadow={cast} receiveShadow={cast} />;
}

/** One gown sleeve with its black cuff (one draw call), in its arm's shoulder-pivot space: it swings with the arm. */
export function GownSleeve({ side, cast = true }: { side: Side; cast?: boolean }) {
  return <mesh geometry={SLEEVE_GEOMETRY[side]} material={GRAD_MATERIAL} castShadow={cast} receiveShadow={cast} />;
}

/** One half of the gown's skirt (one draw call), in its leg's hip-pivot space: it swings with the leg. */
export function GownSkirt({ side, cast = true }: { side: Side; cast?: boolean }) {
  return <mesh geometry={SKIRT_GEOMETRY[side]} material={GRAD_MATERIAL} castShadow={cast} receiveShadow={cast} />;
}
