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
  seat: null as { pos: Vec3; heading: number } | null,
  seated: true,
  standUp: 0,
  ride: null as Ride | null,
  hoverId: null as string | null,
  focusId: null as string | null,
  moving: false,
  speed: 0,
  animPhase: 0,
  landTimer: 0,
};
