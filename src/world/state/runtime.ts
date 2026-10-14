import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement, WorldLayout } from "@/world/engine/gen/layout";
import type { BuiltWorld } from "@/world/engine/worldBuild";
import { createRegistry } from "@/world/engine/interaction/registry";
import type { InteractionRegistry } from "@/world/engine/interaction/registry";
import { createParticlePool } from "@/world/engine/particles/particles";
import type { ParticlePool } from "@/world/engine/particles/particles";
import { withFewerParticles } from "./fewerParticles";
import { createCharacter } from "@/world/engine/physics/character";
import type { CharacterState } from "@/world/engine/physics/character";
import type { TourPath } from "@/world/engine/camera/tourPath";
import type { Rail } from "@/world/engine/traversal/rail";
import type { Vec3 } from "@/world/engine/types";

export type Ride =
  | { kind: "arc"; t: number; from: Vec3; to: Vec3; vel: Vec3; time: number }
  | { kind: "rail"; t: number; duration: number; rail: Rail; reverse: boolean; exit: Vec3; exitHeading: number };

/** A screen (or board) the closeup camera can frame. LiveScreen registers one per screen in runtime.closeups. */
export interface CloseupTarget {
  id: string;
  island: string;
  /** World centre of the face, re-read every frame (the returned object is reused between calls). */
  center: () => Vec3;
  /** World unit normal the face looks along (the returned object is reused between calls). */
  normal: () => Vec3;
  /** World units of the visible face. */
  size: { w: number; h: number };
  /** A tap at logical coordinates. */
  input: (x: number, y: number) => void;
  /** World ray → logical point on the face, or null when the ray misses the face. */
  hit: (origin: Vec3, dir: Vec3) => { x: number; y: number } | null;
  /** Keyboard while in closeup: true when the screen used the key (nothing else then sees it). */
  key?: (code: string) => boolean;
}

const reducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const layout: WorldLayout = buildLayout(worldProjects);
const hero = layout.islands.find((i) => i.kind === "hero");
if (!hero) throw new Error("layout has no hero island");

const killY = Math.min(...layout.islands.map((i) => i.origin.y - i.depth)) - 20;

export const runtime = {
  layout,
  built: null as BuiltWorld | null,
  registry: createRegistry() as InteractionRegistry,
  // reduced motion: a smaller pool and every burst a third the size
  particles: (reducedMotion ? withFewerParticles(createParticlePool(240)) : createParticlePool(800)) as ParticlePool,
  player: createCharacter({ x: hero.origin.x + 0.5, y: hero.origin.y + 1, z: hero.origin.z + 0.5 }) as CharacterState,
  heading: 0,
  cameraPos: { x: 0, y: 0, z: 0 } as Vec3,
  islandById(id: string): IslandPlacement {
    const p = layout.islands.find((i) => i.id === id);
    if (!p) throw new Error(`unknown island "${id}"`);
    return p;
  },
  killY,
  tourPath: null as TourPath | null,
  tourProgress: 0,
  tourBlend: 0,
  seat: null as { pos: Vec3; heading: number; viewerHeading: number } | null,
  seated: true,
  standUp: 0,
  /** Ezra is falling into Play from the sky: input is ignored until he lands (PlayerController, modes.holdDropInput). */
  dropping: false,
  ride: null as Ride | null,
  hoverId: null as string | null,
  focusId: null as string | null,
  moving: false,
  speed: 0,
  animPhase: 0,
  landTimer: 0,
  /** Closeup targets by id (each LiveScreen registers itself). */
  closeups: new Map<string, CloseupTarget>(),
  /** The open closeup; openCloseup / closeCloseup write it together with the store's closeupId. */
  closeup: null as { id: string } | null,
  /** Fast travel in Play (travel.ts startTravel): PlayerController puffs Ezra away, moves him to `to`, puffs him back. */
  travel: null as { to: string; phase: "out" | "in"; t: number } | null,
  /** Ezra's model is hidden (between the two puffs of a fast travel). */
  hidden: false,
  /** Ezra wears the graduation cap and regalia (the Play graduation moment, once per session). */
  capOn: false,
  /** Clock time the tour's cap toss started (first pass of the 2026 milestone per page load, or a click), or null. */
  capToss: null as number | null,
};
