import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { milestones } from "@/config/portfolio";
import type { Milestone } from "@/config/schema";
import type { TourPath } from "@/world/engine/camera/tourPath";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { GraduationCap } from "@/world/scene/GraduationCap";
import { Interactable } from "@/world/scene/Interactable";
import { WorldText } from "@/world/scene/WorldText";
import { watchPoint } from "@/world/scene/modes";
import { bakeBoxes } from "@/world/scene/shared/bake";
import { nearestTrackProgress, trackFor } from "@/world/scene/tour/tourMotion";
import { TOSS, crossedForward, nearMilestone, tossPose } from "./moment";
import { MILESTONE_BRIDGE, PILLAR_H, milestoneSpotsFor, type MilestoneSpot } from "./placement";
import { PLAQUE, plaqueRows } from "./plaque";

const STONE = "#b5afa5";
const STONE_DARK = "#a19b91";
const SLAB = "#d3ccbf";
const CARVED = "#4a4036";
const PLAQUE_TOP = 1.58; // the slab's top edge above the pillar's ground (just under the cap stone at 1.6)
const PLAQUE_Z = 0.33; // slab centre in front of the column (column front face at 0.3)

/** Plinth, column, cap stone and the plaque slab, one vertex-coloured geometry shared by every pillar (the plaque faces +z). */
const PILLAR_GEO = bakeBoxes(
  [
    [1.0, 0.16, 0.74, 0, 0.08, 0, STONE_DARK],
    [0.86, 1.44, 0.6, 0, 0.88, 0, STONE],
    [0.98, 0.12, 0.72, 0, PILLAR_H - 0.06, 0, STONE_DARK],
    [PLAQUE.w, PLAQUE.h, 0.06, 0, PLAQUE_TOP - PLAQUE.h / 2, PLAQUE_Z, SLAB],
  ],
  "a milestone pillar",
);
const PILLAR_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });

/** Squash on a click: down 12 % and back over this many seconds. */
const SQUASH_S = 0.3;

/**
 * The island a pillar's Interactable belongs to (Tab cycles the island in view): of the milestone bridge's two islands,
 * the one whose centre column is nearest the spot. The end pillars stand on their island; a middle one on its own stone
 * goes to the nearer side.
 */
function islandOf(spot: MilestoneSpot): string {
  const away = (id: string) => {
    const o = runtime.islandById(id).origin;
    return Math.hypot(spot.pos.x - (o.x + 0.5), spot.pos.z - (o.z + 0.5));
  };
  return away(MILESTONE_BRIDGE.from) <= away(MILESTONE_BRIDGE.to) ? MILESTONE_BRIDGE.from : MILESTONE_BRIDGE.to;
}

function Pillar({ spot, m, onPress }: { spot: MilestoneSpot; m: Milestone; onPress: () => void }) {
  const group = useRef<THREE.Group>(null);
  const squash = useRef(SQUASH_S);
  const cast = useWorld((s) => s.quality === "high");
  const rows = useMemo(() => plaqueRows(m), [m]);
  const island = useMemo(() => islandOf(spot), [spot]);
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
        island={island}
        label={`${m.year} · ${m.title}`}
        position={[spot.pos.x, spot.pos.y + PILLAR_H / 2, spot.pos.z]}
        size={[1.1, PILLAR_H, 1.1]}
        radius={2.5}
        onActivate={press}
      />
    </>
  );
}

/** Confetti and a pop at a world point (the graduation moment's celebration). */
function celebrate(x: number, y: number, z: number): void {
  runtime.particles.burst({ x, y, z }, "confetti");
  playSfx("pop");
}

/** The tossed cap's pose once it has landed back on the pillar (computed once: no allocation while it rests). */
const REST = tossPose(TOSS.duration);

/**
 * The graduation moment (spec §7.2). Play: the first time Ezra comes within CAP_RADIUS of the graduation pillar he gets
 * the cap and gown (runtime.capOn, Ezra.tsx), with confetti and a pop. Tour: the first time a page load's tour
 * passes the pillar (its progress from the track point that watches it), a cap is tossed up off the pillar and lands
 * back on it; clicking the pillar replays the toss (Tour) or the confetti (Play).
 */
function GraduationMoment({ spot, replay }: { spot: MilestoneSpot; replay: { current: boolean } }) {
  const cap = useRef<THREE.Group>(null);
  const st = useMemo(
    () => ({ path: null as TourPath | null, at: 2, prev: -1, top: { x: spot.pos.x, y: spot.pos.y + PILLAR_H, z: spot.pos.z } }),
    [spot],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const world = useWorld.getState();
    if (world.mode === "play") {
      st.prev = -1;
      const p = runtime.player.pos;
      if (!runtime.capOn && !runtime.travel && nearMilestone(p, spot.pos)) {
        runtime.capOn = true;
        celebrate(p.x, p.y + 2.1, p.z);
      }
      if (replay.current) {
        replay.current = false;
        celebrate(p.x, p.y + 2.1, p.z);
      }
    } else {
      const path = runtime.tourPath;
      if (path && path !== st.path) {
        st.path = path;
        st.at = nearestTrackProgress(trackFor(path), watchPoint(path.stops, st.top));
        st.prev = -1;
      }
      // tourProgress is the tour's only once the tour camera has run its first frame (it writes cameraPos with it, and a
      // ?stop deep link seeds the progress there); this runs before it, so until then there is no frame to cross from
      const c = runtime.cameraPos;
      const prog = c.x === 0 && c.y === 0 && c.z === 0 ? -1 : runtime.tourProgress;
      if (replay.current || (runtime.capToss === null && crossedForward(st.prev, prog, st.at))) {
        replay.current = false;
        runtime.capToss = t;
        celebrate(st.top.x, st.top.y + 0.3, st.top.z);
      }
      st.prev = prog;
    }
    const g = cap.current;
    if (!g) return;
    // hidden before the first toss, and resting on the pillar only while Ezra isn't wearing his own
    const age = runtime.capToss === null ? -1 : t - runtime.capToss;
    const flying = age >= 0 && age < TOSS.duration && !world.reducedMotion;
    g.visible = age >= 0 && (flying || !runtime.capOn);
    if (!g.visible) return;
    const pose = flying ? tossPose(age) : REST;
    g.position.set(st.top.x, st.top.y + pose.y, st.top.z);
    g.rotation.set(pose.tilt, spot.ry + pose.spin, 0);
  });
  return (
    <group ref={cap} visible={false}>
      <GraduationCap />
    </group>
  );
}

/** The year milestones along the Hero → GTID bridge (spec §7.1), and the graduation moment at the graduation pillar. */
export function Milestones() {
  const spots = useMemo(() => milestoneSpotsFor(runtime.layout, milestones.map((m) => m.year)), []);
  const replay = useRef(false);
  const gradYear = milestones.find((m) => m.moment === "graduation")?.year;
  const gradSpot = spots.find((s) => s.year === gradYear);
  return (
    <>
      {spots.map((spot, i) => (
        <Pillar
          key={spot.year}
          spot={spot}
          m={milestones[i]}
          onPress={() => {
            if (spot.year === gradYear) replay.current = true;
          }}
        />
      ))}
      {gradSpot && <GraduationMoment spot={gradSpot} replay={replay} />}
    </>
  );
}
