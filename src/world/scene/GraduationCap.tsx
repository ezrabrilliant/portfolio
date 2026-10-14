import { CAP_GEOMETRY, GRAD_MATERIAL, REGALIA_GEOMETRY } from "./graduation";

/** The mortarboard (one draw call), its base at the group origin: on Ezra's head part and in the tour's cap toss. */
export function GraduationCap({ cast = true }: { cast?: boolean }) {
  return <mesh geometry={CAP_GEOMETRY} material={GRAD_MATERIAL} castShadow={cast} />;
}

/** Collar band and medal (one draw call), in Ezra's body space. */
export function GraduationRegalia({ cast = true }: { cast?: boolean }) {
  return <mesh geometry={REGALIA_GEOMETRY} material={GRAD_MATERIAL} castShadow={cast} receiveShadow={cast} />;
}
