import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { milestones } from "@/config/portfolio";
import type { Milestone } from "@/config/schema";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "@/world/scene/Interactable";
import { WorldText } from "@/world/scene/WorldText";
import { PILLAR_H, milestoneSpotsFor, type MilestoneSpot } from "./placement";
import { PLAQUE, plaqueRows } from "./plaque";

const STONE = "#b5afa5";
const STONE_DARK = "#a19b91";
const SLAB = "#d3ccbf";
const CARVED = "#4a4036";
const PLAQUE_TOP = 1.58; // the slab's top edge above the pillar's ground (just under the cap stone at 1.6)
const PLAQUE_Z = 0.33; // slab centre in front of the column (column front face at 0.3)

/** Plinth, column, cap stone and the plaque slab, one vertex-coloured geometry shared by every pillar (the plaque faces +z). */
const PILLAR_GEO = (() => {
  const c = new THREE.Color();
  const parts = (
    [
      [1.0, 0.16, 0.74, 0, 0.08, 0, STONE_DARK],
      [0.86, 1.44, 0.6, 0, 0.88, 0, STONE],
      [0.98, 0.12, 0.72, 0, PILLAR_H - 0.06, 0, STONE_DARK],
      [PLAQUE.w, PLAQUE.h, 0.06, 0, PLAQUE_TOP - PLAQUE.h / 2, PLAQUE_Z, SLAB],
    ] as const
  ).map(([w, h, d, x, y, z, colour]) => {
    const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    c.set(colour);
    const n = g.attributes.position.count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return g;
  });
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  if (!merged) throw new Error("Milestones: could not merge the pillar geometry");
  return merged;
})();
const PILLAR_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });

/** Squash on a click: down 12 % and back over this many seconds. */
const SQUASH_S = 0.3;

function Pillar({ spot, m, onPress }: { spot: MilestoneSpot; m: Milestone; onPress: () => void }) {
  const group = useRef<THREE.Group>(null);
  const squash = useRef(SQUASH_S);
  const cast = useWorld((s) => s.quality === "high");
  const rows = useMemo(() => plaqueRows(m), [m]);
  const textZ = PLAQUE_Z + 0.035;
  useFrame((_, dt) => {
    const g = group.current;
    if (!g || squash.current >= SQUASH_S) return;
    squash.current = Math.min(SQUASH_S, squash.current + dt);
    g.scale.y = 1 - 0.12 * Math.sin((Math.PI * squash.current) / SQUASH_S);
  });
  const press = () => {
    if (!useWorld.getState().reducedMotion) squash.current = 0;
    onPress();
  };
  const isFirstHalf = spot.year <= (milestones[0].year + milestones[milestones.length - 1].year) / 2;
  return (
    <>
      <group position={[spot.pos.x, spot.pos.y, spot.pos.z]} rotation={[0, spot.ry, 0]}>
        <group ref={group}>
          <mesh geometry={PILLAR_GEO} material={PILLAR_MAT} castShadow={cast} receiveShadow />
          <WorldText text={String(m.year)} position={[0, PLAQUE_TOP - rows.yearY, textZ]} size={PLAQUE.yearSize} color={CARVED} font="pixel" />
          <WorldText text={rows.title.join("\n")} position={[0, PLAQUE_TOP - (rows.titleY[0] + rows.titleY[rows.titleY.length - 1]) / 2, textZ]} size={PLAQUE.titleSize} color={CARVED} font="ui" maxWidth={PLAQUE.w - 0.04} />
          <WorldText text={rows.line.join("\n")} position={[0, PLAQUE_TOP - (rows.lineY[0] + rows.lineY[rows.lineY.length - 1]) / 2, textZ]} size={PLAQUE.lineSize} color={CARVED} font="ui" maxWidth={PLAQUE.w - 0.04} />
        </group>
      </group>
      <Interactable
        id={`milestone-${m.year}`}
        island={isFirstHalf ? "hero" : "gtid"}
        label={`${m.year} · ${m.title}`}
        position={[spot.pos.x, spot.pos.y + PILLAR_H / 2, spot.pos.z]}
        size={[1.1, PILLAR_H, 1.1]}
        radius={2.5}
        onActivate={press}
      />
    </>
  );
}

/** The year milestones along the Hero → GTID bridge (spec §7.1). */
export function Milestones() {
  const spots = useMemo(() => milestoneSpotsFor(runtime.layout, milestones.map((m) => m.year)), []);
  return (
    <>
      {spots.map((spot, i) => (
        <Pillar key={spot.year} spot={spot} m={milestones[i]} onPress={() => undefined} />
      ))}
    </>
  );
}
