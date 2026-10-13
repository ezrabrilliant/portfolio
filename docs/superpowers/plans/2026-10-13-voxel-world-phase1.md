# Voxel World — Phase 1 Implementation Plan (master)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn ezrabrilliant.com (on branch `voxel-world`) into a playable voxel archipelago with a scroll tour, a Play mode as voxel Ezra, and the hero + four star islands (GTID, Petak Umpet, Orbit Store, Ezra Bot) showing their real programs.

**Architecture:** A framework-free TypeScript engine (`src/world/engine/`, no React, no three.js imports) owns voxels, world generation, physics, crossings, tour/follow camera math, particles, interaction lookup and SFX. React Three Fiber components (`src/world/scene/`) render and wire it; hot paths mutate three.js objects inside `useFrame` and read a transient runtime singleton, never React state per frame. Content lives in `src/config/portfolio.ts`.

**Tech Stack:** Vite 7, React 19, TypeScript 5.8 (strict), Tailwind 4 (existing) + three, @react-three/fiber 9, @react-three/drei 10, zustand 5, zzfx, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-voxel-world-design.md` — read it before starting any task.

## Execution order

This master defines shared contracts; the work itself is in three part-plans, executed in order:

1. **Part A — Engine** · `docs/superpowers/plans/2026-10-13-voxel-world-phase1-a-engine.md`
2. **Part B — Scene, modes, controls** · `docs/superpowers/plans/2026-10-13-voxel-world-phase1-b-scene.md`
3. **Part C — Islands and live data** · `docs/superpowers/plans/2026-10-13-voxel-world-phase1-c-islands.md`

Each part ends with a working, testable state. Part B renders placeholder islands from the layout; Part C replaces them with the real islands.

Each part-plan lists its **Contract additions** (extra exports beyond this master) at its top; later parts rely on them, so read the earlier parts' additions before starting a part. Cross-part conventions checked during planning: heading = `atan2(dir.x, dir.z)` (facing `(sin h, 0, cos h)`); batch and particle colours are sRGB 0..1; `"barrier"` is solid and invisible; Vitest resolves `@/`; island Components render without a parent transform; `<Interactable>` takes world-space positions; Part B's TourCamera already honours `?stop=N`.

## Global Constraints

- Work only on branch `voxel-world` (created in Part A Task 1). Never commit to `main`. The pre-existing deleted files under `gsap-splittext-kinetic-typography-experiment-gsapchallenge-1/` in the working tree are NOT ours: never stage them (always `git add` explicit paths, never `git add -A` / `git add .`).
- Commit messages: conventional style used by the repo (`feat: …`, `test: …`, `chore: …`), each ending with these two lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z`
- Engine code (`src/world/engine/**`) must not import `react`, `three`, `@react-three/*`, `zustand` or DOM APIs (except `audio/sfx.ts`, which may call zzfx). Plain `{ x, y, z }` objects only.
- Imports use the existing `@/` alias (`@/world/engine/...`). TypeScript strict; `verbatimModuleSyntax` is on, so type-only imports must use `import type`.
- Tests: Vitest, files next to the module as `*.test.ts`. Run with `npx vitest run <path>`.
- All on-page text is English. Copy rules (spec §18): describe what things are and do with real numbers; no process claims ("solo", "end-to-end", "self-hosted", "Dockerized"); GTID is a price tracker + info site, never trading; Orbit: no rupiah, fictional products, logo and rings always white; Ezra Bot: other users' messages are grey skeleton bars, only bot messages readable, chat times "Today at HH:MM"; no POS Monosuko in Phase 1.
- Facts allowed on boards: GTID 2,600 visitors / day · 16,000+ items (also 14,500 requests / day, 51,900+ Discord members); Petak Umpet 3.1M+ visits · 2.6K peak players; Orbit Store 2,200+ orders · 890+ buyers (61,000+ items delivered); Ezra Bot 1,000+ members.
- Brand colours: GTID `#FA5D19`; Orbit `#3D62F8`, tile gradient `#3D62F8 → #2C0B77`; Orbit mark/ring `#FFFFFF`.
- Performance budget (spec §14): ≤ ~200 draw calls; canvases ≤ 2048 px; DPR ≤ 1.75 high / ≤ 1.25 low; one sun shadow map on high tier only; never call React `setState` inside `useFrame`.
- `prefers-reduced-motion`: camera cuts instead of flights, no shake, fewer particles, no ambient bobbing.
- The old site's components (`src/components/**`, `src/App.tsx`) stay in the repo untouched in Phase 1.

## Coordinate conventions (all parts)

- 1 block = 1 world unit. Y is up.
- Block `(x, y, z)` (integers) occupies the cube `[x, x+1) × [y, y+1) × [z, z+1)`; its render centre is `(x+0.5, y+0.5, z+0.5)`.
- An island's `origin` is the integer world position of its centre column; its grass top layer is block row `origin.y` (so the walkable surface height is `origin.y + 1`).
- The character position is the centre of its feet (bottom of the AABB).
- Islands are static in Phase 1 (no bobbing), so collision and rendering share one world grid.

## File structure

```
src/config/
  schema.ts                       Part A  WorldProject types + validateProjects()
  portfolio.ts                    Part A adds `worldProjects`, `worldCopy` (old `config` untouched)
src/types/zzfx.d.ts               Part A  module declaration for zzfx
src/world/engine/
  gen/rng.ts                      Part A
  voxel/blocks.ts                 Part A
  voxel/grid.ts                   Part A
  voxel/blueprint.ts              Part A
  voxel/mesher.ts                 Part A
  gen/islandGen.ts                Part A
  gen/layout.ts                   Part A
  worldBuild.ts                   Part A
  physics/character.ts            Part A
  traversal/ballistic.ts          Part A
  traversal/rail.ts               Part A
  camera/tourPath.ts              Part A
  camera/followCam.ts             Part A
  particles/particles.ts          Part A
  interaction/registry.ts         Part A
  audio/sfx.ts                    Part A
src/world/state/
  store.ts                        Part B  zustand UI state
  runtime.ts                      Part B  transient singleton (player, grid, particles, layout)
src/world/scene/
  WorldApp.tsx                    Part B  root (Canvas + DOM UI); src/main.tsx renders it
  World.tsx, Sky.tsx, Lights.tsx  Part B
  IslandTerrain.tsx               Part B
  WorldText.tsx                   Part B
  Interactable.tsx                Part B
  Ezra.tsx                        Part B  model + procedural animation + player controller
  TourCamera.tsx, PlayCamera.tsx  Part B
  ParticlesRenderer.tsx           Part B
  crossings/Bridge.tsx, SteppingStones.tsx, BouncePad.tsx, Minecart.tsx   Part B
  islands/types.ts                Part B  StarIslandModule contract
  islands/index.ts                Part B creates (placeholders), Part C fills
  islands/Hero.tsx, Gtid.tsx, PetakUmpet.tsx, OrbitStore.tsx, EzraBot.tsx   Part C
  islands/gtid/useGtidData.ts, islands/gtid/board.ts                         Part C
  islands/orbit/logo.ts, islands/orbit/receipt.ts                            Part C
  islands/ezrabot/chat.ts                                                    Part C
src/world/ui/
  Hud.tsx, MobileControls.tsx, SeoMirror.tsx, Loader.tsx, NoWebGL.tsx       Part B
src/world/input/
  keyboard.ts, touch.ts           Part B
public/fonts/                     Part B  self-hosted .woff for world text
server.js                         Part C  /api/gtid/* proxy
server/gtidProxy.js               Part C  proxy + cache module (unit-tested)
```

## Shared contracts

Every name below is exact. A later part may rely on it; an earlier part must export it with this signature.

### Part A exports

```ts
// src/world/engine/types.ts  (Part A Task 2 creates it)
export type Vec3 = { x: number; y: number; z: number };
export type Vec3i = Vec3;                     // integer-valued
export type IsSolid = (x: number, y: number, z: number) => boolean;   // integer block coords

// src/world/engine/gen/rng.ts
export type Rng = () => number;               // uniform in [0, 1)
export function mulberry32(seed: number): Rng;
export function hashString(s: string): number; // FNV-1a 32-bit, unsigned
export function rngFor(id: string): Rng;       // mulberry32(hashString(id))

// src/config/schema.ts
export type District = "game" | "discord" | "web";
export type IslandTemplate = "workshop" | "shop" | "tower" | "garden" | "lab";
export interface ProjectLinks { demo?: string; github?: string; discord?: string; roblox?: string }
export interface WorldProject {
  id: string; title: string; year: number; line: string; stats?: string[]; tags: string[];
  district: District; tier: "star" | "mini"; links: ProjectLinks; screenshot?: string;
  island?: { template?: IslandTemplate; accent?: string };
}
export interface ValidationIssue { id: string; message: string }
export const DISTRICTS: readonly District[];
export function validateProjects(list: readonly WorldProject[]): ValidationIssue[];

// src/config/portfolio.ts (added exports; existing `config` unchanged)
export const worldProjects: WorldProject[];   // ids: "gtid", "petak-umpet", "orbit-store", "ezra-bot"
export const worldCopy: { heroName: string; heroLine: string; location: string };

// src/world/engine/voxel/blocks.ts
export type BlockName = "grass" | "earth" | "stone" | "plank" | "wood" | "roof" | "leaf" | "crate"
  | "orange" | "blue" | "white" | "iron" | "barrier";
export type BlockId = number;                 // 0 = air
export interface BlockDef { id: BlockId; name: BlockName; colors: string[]; solid: boolean; visible: boolean }
export function blockId(name: BlockName): BlockId;
export function blockDef(id: BlockId): BlockDef | undefined;   // undefined for air

// src/world/engine/voxel/grid.ts
export class VoxelGrid {
  set(x: number, y: number, z: number, id: BlockId): void;     // id 0 deletes
  get(x: number, y: number, z: number): BlockId;               // 0 when empty
  isSolid: IsSolid;                                             // bound arrow property
  forEach(cb: (x: number, y: number, z: number, id: BlockId) => void): void;
  get size(): number;
}

// src/world/engine/voxel/blueprint.ts
export interface Blueprint {
  layers: { y: number; rows: string[] }[];   // each row = one z line, one char per x; '.' or ' ' = air
  legend: Record<string, BlockName>;
}
export function stampBlueprint(grid: VoxelGrid, bp: Blueprint, origin: Vec3i): void; // row/char centred on origin x/z

// src/world/engine/voxel/mesher.ts
export interface InstanceBatch { count: number; positions: Float32Array; colors: Float32Array } // centres xyz; sRGB 0..1 rgb
export function buildBatch(grid: VoxelGrid, filter: (x: number, y: number, z: number) => boolean, rng: Rng): InstanceBatch;
// includes only visible blocks with at least one exposed face; per-block colour picked from BlockDef.colors with jitter

// src/world/engine/gen/islandGen.ts
export interface IslandSpec { radius: number; depth: number; seed: number }
export interface IslandShape {
  cells: Array<{ x: number; y: number; z: number; block: BlockName }>; // local coords, grass top at y = 0
  surface: (x: number, z: number) => number | null;                    // local y of the top solid block, null off-island
}
export function generateIsland(spec: IslandSpec): IslandShape;

// src/world/engine/gen/layout.ts
export type IslandKind = "hero" | "star" | "mini";
export interface IslandPlacement {
  id: string; kind: IslandKind; district: District | "hero";
  origin: Vec3i; radius: number; depth: number; seed: number;
}
export type CrossingKind = "bridge" | "bouncePads" | "minecart";
export interface Crossing { kind: CrossingKind; from: string; to: string; a: Vec3; b: Vec3 } // a/b = top-surface anchors on each island's edge facing the other
export interface WorldLayout { islands: IslandPlacement[]; crossings: Crossing[]; tourOrder: string[] }
export const STAR_ANCHORS: Record<string, { origin: Vec3i; radius: number; depth: number }>;
//   hero: (0,0,0) r6 d6 · gtid: (22,2,-8) r9 d7 · petak-umpet: (44,3,-2) r9 d7
//   orbit-store: (64,10,-18) r8 d6 · ezra-bot: (84,14,-12) r8 d6
export function chooseCrossing(from: IslandPlacement, to: IslandPlacement): CrossingKind;
//   different districts and neither is "hero" → "minecart"; else |Δy| > 2 → "bouncePads"; else "bridge"
export function edgeAnchor(from: IslandPlacement, to: IslandPlacement): Vec3;   // point on `from`'s rim toward `to`, y = from.origin.y + 1
export function buildLayout(projects: readonly WorldProject[]): WorldLayout;
//   tourOrder = ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]; crossings link consecutive tourOrder islands

// src/world/engine/worldBuild.ts
export interface BuiltWorld { grid: VoxelGrid; batches: Record<string, InstanceBatch>; shapes: Record<string, IslandShape> }
export function buildWorld(layout: WorldLayout, extraStamps?: Array<(grid: VoxelGrid) => void>): BuiltWorld;
//   stamps every island's terrain at its origin, runs extraStamps (island props, crossings colliders), then meshes one batch per island

// src/world/engine/physics/character.ts
export interface CharacterParams {
  width: number; height: number; walkSpeed: number; runSpeed: number; accel: number;
  gravity: number; jumpSpeed: number; stepHeight: number; coyoteTime: number; jumpBuffer: number;
}
export const DEFAULT_PARAMS: CharacterParams;
//   { width: 0.6, height: 1.8, walkSpeed: 4.5, runSpeed: 7.5, accel: 30, gravity: 30, jumpSpeed: 9.5,
//     stepHeight: 1, coyoteTime: 0.1, jumpBuffer: 0.12 }
export interface CharacterState {
  pos: Vec3; vel: Vec3; onGround: boolean; sinceGround: number; jumpTimer: number;
  lastSafe: Vec3; locked: boolean;            // locked = ignore input (bounce arcs, minecart)
}
export interface CharacterInput { moveX: number; moveZ: number; run: boolean; jump: boolean } // world-space dir, |v| ≤ 1; jump = pressed this frame
export interface StepResult { landed: boolean; jumped: boolean; fellOut: boolean; stepped: boolean }
export function createCharacter(pos: Vec3): CharacterState;
export function stepCharacter(s: CharacterState, input: CharacterInput, dt: number,
  world: { isSolid: IsSolid; killY: number }, p?: CharacterParams): StepResult;   // mutates s
export function respawn(s: CharacterState): void;   // pos = lastSafe, vel = 0

// src/world/engine/traversal/ballistic.ts
export function solveLaunch(from: Vec3, to: Vec3, gravity: number, apexAbove: number): { vel: Vec3; time: number };
//   apex = max(from.y, to.y) + apexAbove
export function positionAt(from: Vec3, vel: Vec3, gravity: number, t: number): Vec3;

// src/world/engine/traversal/rail.ts
export interface Rail { points: Vec3[] }
export function buildRail(a: Vec3, b: Vec3, dip: number, segments?: number): Rail;   // gentle dip of `dip` blocks mid-way
export function railPoint(rail: Rail, u: number): Vec3;      // u ∈ [0,1], Catmull-Rom through points
export function railTangent(rail: Rail, u: number): Vec3;    // normalised
export function rideProgress(t: number, duration: number): number;   // eased 0..1 (ease in/out), clamps

// src/world/engine/camera/tourPath.ts
export interface TourStop { id: string; camera: Vec3; target: Vec3; dwell: number }   // dwell = scroll weight of the slow zone
export interface TourSample { camera: Vec3; target: Vec3; chapter: number; chapterProgress: number }
export interface TourPath { stops: TourStop[]; via: Vec3[][]; totalWeight: number }
export function buildTourPath(stops: TourStop[], via?: Vec3[][]): TourPath;   // via[i] = extra camera points between stop i and i+1
export function samplePath(path: TourPath, progress: number): TourSample;     // progress ∈ [0,1], continuous, never stationary inside dwell
export function stopProgress(path: TourPath, index: number): number;          // progress at the centre of stop `index`
export function nearestProgress(path: TourPath, point: Vec3): number;

// src/world/engine/camera/followCam.ts
export interface FollowCam { yaw: number; pitch: number; distance: number }
export function createFollowCam(): FollowCam;                 // yaw 0, pitch 0.35, distance 7
export function updateFollowCam(cam: FollowCam, target: Vec3, heading: number, moving: boolean, dt: number,
  input: { orbitX: number; orbitY: number; zoom: number }): { position: Vec3; lookAt: Vec3 };

// src/world/engine/particles/particles.ts
export type ParticlePreset = "debris" | "dust" | "confetti" | "leaves" | "sparkle";
export interface ParticlePool {
  readonly capacity: number; alive: number;
  positions: Float32Array; scales: Float32Array; colors: Float32Array;   // length capacity*3, capacity, capacity*3
  burst(at: Vec3, preset: ParticlePreset, opts?: { color?: string; count?: number }): void;
  step(dt: number): void;
}
export function createParticlePool(capacity?: number, rng?: Rng): ParticlePool;   // default 800

// src/world/engine/interaction/registry.ts
export interface Interactable {
  id: string; island: string; label: string; position: Vec3;
  hitbox: { min: Vec3; max: Vec3 }; radius: number;
  onActivate: () => void; enabled?: () => boolean;
}
export interface InteractionRegistry {
  register(item: Interactable): () => void;          // returns unregister
  all(): Interactable[];
  get(id: string): Interactable | undefined;
  nearest(pos: Vec3, facing: Vec3): Interactable | null;   // within radius, in front (dot > 0.2), enabled
  raycast(origin: Vec3, dir: Vec3): Interactable | null;  // closest hitbox hit, enabled only
  onIsland(island: string): Interactable[];
}
export function createRegistry(): InteractionRegistry;

// src/world/engine/audio/sfx.ts
export type SfxName = "click" | "hover" | "punch" | "burst" | "jump" | "land" | "step" | "print" | "chat" | "link" | "bounce" | "cart";
export const SFX_PRESETS: Record<SfxName, (number | undefined)[]>;
export function playSfx(name: SfxName): void;       // no-op while muted (default muted)
export function setMuted(muted: boolean): void;
export function isMuted(): boolean;
```

### Part B exports (consumed by Part C)

```ts
// src/world/state/store.ts
export type Mode = "tour" | "play";
export type Quality = "high" | "low";
export interface WorldState {
  mode: Mode; setMode(m: Mode): void;
  activeIsland: string; setActiveIsland(id: string): void;
  muted: boolean; toggleMuted(): void;
  quality: Quality; setQuality(q: Quality): void;
  hoveredId: string | null; setHovered(id: string | null): void;
  prompt: { id: string; label: string } | null; setPrompt(p: { id: string; label: string } | null): void;
  reducedMotion: boolean;
  ready: boolean; setReady(r: boolean): void;
}
export const useWorld: import("zustand").UseBoundStore<import("zustand").StoreApi<WorldState>>;

// src/world/state/runtime.ts   (transient singleton, mutated in useFrame; never React state)
export const runtime: {
  layout: WorldLayout; built: BuiltWorld | null; registry: InteractionRegistry; particles: ParticlePool;
  player: CharacterState; heading: number; cameraPos: Vec3;
  islandById(id: string): IslandPlacement;
};

// src/world/scene/islands/types.ts
export interface StarIslandModule {
  id: string;                                                   // "hero" | WorldProject.id
  Component: React.FC<{ placement: IslandPlacement }>;          // renders props at world coords (placement.origin)
  stamp?: (grid: VoxelGrid, placement: IslandPlacement) => void; // solid prop blocks ("barrier"/visible) for collision
  tourStop: (placement: IslandPlacement) => TourStop;           // artistic framing; subject centre-right
}
// src/world/scene/islands/index.ts
export const STAR_ISLANDS: Record<string, StarIslandModule>;    // Part B: placeholder modules; Part C: real ones

// src/world/scene/WorldText.tsx
export function WorldText(props: {
  text: string; position: [number, number, number]; rotationY?: number; size?: number;
  color?: string; font?: "ui" | "pixel"; anchorX?: "left" | "center" | "right"; maxWidth?: number;
}): JSX.Element;

// src/world/scene/Interactable.tsx   (registers into runtime.registry; lifts children 0.1 on hover; shows label)
export function Interactable(props: {
  id: string; island: string; label: string; position: [number, number, number];
  size: [number, number, number];            // hitbox extents centred on position
  radius?: number; onActivate: () => void; enabled?: () => boolean; children?: React.ReactNode;
}): JSX.Element;
```

## Done for Phase 1

- `npx vitest run` passes; `npm run build` succeeds with no type errors.
- Headless screenshots of all five tour stops (desktop 1280×720 and phone 520×940) look like the spec; Play mode reaches every island through every crossing in both directions.
- Spec §16 manual checklist completed and noted in the final commit message of Part C.
