# Voxel World — Phase 2A World Content Implementation Plan (master)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Web & Apps district (plaza + POS Monosuko, Bee Furniture CRM and PeduliPasal mini islands with live, clickable program screens), a closeup camera for reading screens, three year milestones with a graduation moment, and a map board on every island for fast travel.

**Architecture:** Pure logic stays framework-free and unit-tested: layout placement in `src/world/engine/`, screen-app models and the closeup pose maths as plain TypeScript next to their scene code. Each program screen is a `ScreenApp` (state + actions + a canvas draw that returns hit regions) rendered by one shared `LiveScreen` component. Closeup is a camera layer that runs after the existing Tour/Play cameras and blends their pose toward the target, so neither existing camera changes. Islands are hand-built modules registered in one island registry, as the star islands already are.

**Tech Stack:** Vite 7, React 19, TypeScript 5.8 (strict, `verbatimModuleSyntax`), three, @react-three/fiber 9, @react-three/drei 10, zustand 5, zzfx, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-voxel-phase2a-world-content-design.md`. Read it before starting any task.
**Visual reference:** the approved sketch https://claude.ai/artifact/9uVPRD3CSYiHeFaQUh9wgg (its island and screen code is the starting point the part plans port to TypeScript).

## Execution order

This master defines the shared contracts; the work is in three part-plans, executed in order:

1. **Part A: Data, layout and tour** · `docs/superpowers/plans/2026-10-14-voxel-phase2a-a-layout.md`
2. **Part B: Live screens and closeup** · `docs/superpowers/plans/2026-10-14-voxel-phase2a-b-screens.md`
3. **Part C: Islands, milestones and map boards** · `docs/superpowers/plans/2026-10-14-voxel-phase2a-c-islands.md`

Each part ends in a working, tested state:
- After A, the plaza and the three mini islands exist as terrain, are reached by the Ezra Bot → plaza minecart and chain bridges, and the tour visits them.
- After B, any island can host a `LiveScreen`, the closeup works, and the three apps are unit-tested.
- After C, the islands are dressed, the screens are live on them, the milestones and graduation moment work, and every island has a map board.

## Global Constraints

- Work only on branch `voxel-world` in `portfolio/portfolio`. Never commit to `main`. The pre-existing deletions under `gsap-splittext-kinetic-typography-experiment-gsapchallenge-1/` are not ours: never stage them (always `git add` explicit paths, never `git add -A` / `git add .`).
- Commit messages: the repo's conventional style (`feat: …`, `test: …`, `fix: …`, `chore: …`), each ending with these two lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z`
- Engine code (`src/world/engine/**`) must not import `react`, `three`, `@react-three/*`, `zustand` or DOM APIs. Plain `{ x, y, z }` objects only.
- Screen-app models (`src/world/scene/screens/<app>/<app>.ts`) must not import `react`, `three` or touch the DOM; only their `*Draw.ts` uses `CanvasRenderingContext2D`.
- Imports use the `@/` alias. Type-only imports use `import type`. Tests are Vitest files next to the module (`*.test.ts`), run with `npx vitest run <path>`.
- Paths in shell commands: this is Windows with Git Bash. Never pass `/c/...` paths to Node, Python or Playwright (use `C:/Users/...`); write only inside the repo or the session scratchpad; never kill Chrome by name (only PIDs you started); list before deleting anything.
- Screenshots: `npm run build` then `npm run shot -- "<query>" shots/<name>.png <WxH>` (scripts/shot.mjs). Desktop 1280x720, phone 520x940. `shots/` is gitignored.
- **All on-site text is English**, including the redrawn program UIs. Proper names (Ayam Bakar Banjar Monosuko, Petak Umpet, PeduliPasal) and the currency (`Rp`, English digit grouping: `Rp 30,000`) stay as they are. Format rupiah with `formatRupiah` (Part B contract below), never `toLocaleString("id-ID")`.
- Copy rules: describe results, never process ("solo", "end-to-end", "self-hosted", "self-managed", "Dockerized"); real numbers only; no testing figures (UAT, SUS) for Monosuko; Bangkit is "graduated with Distinction" (never "top graduate"); translations of app content stay faithful to the source and add no legal or product claims.
- Performance (spec §11): ≤ 200 draw calls in the widest view; canvases ≤ 2048 px; live screens redraw ≤ 15 fps and only while visible and changing; never call React `setState` inside `useFrame`.
- `prefers-reduced-motion`: camera cuts instead of glides, no idle demos, no ambient bobbing, fewer particles.
- Prop coordinates are island-local (`islandFrame(p)`: local y = 0 is the walkable grass surface, fronts face +z, the tour camera looks from the front-left). Prop blocks give their **centre** y (a 1-tall block on the grass has y = 0.5).

## Coordinate conventions (unchanged from Phase 1)

1 block = 1 world unit, Y up. Block `(x, y, z)` occupies `[x, x+1) × [y, y+1) × [z, z+1)`. An island's `origin` is the integer centre column; its grass row is `origin.y` and its walkable surface is `origin.y + 1`. The character position is the centre of its feet.

## File structure

```
src/config/
  schema.ts                         A  drop screenshot/template, site-path links, Milestone + validateMilestones
  portfolio.ts                      A  3 mini projects (config order: pos-monosuko, bee-furniture-crm, pedulipasal), milestones
src/world/engine/gen/layout.ts      A  "hub" kind, web chain, derived tour order
src/world/scene/islands/
  types.ts                          A  IslandModule (renamed from StarIslandModule, type alias kept)
  index.ts                          A  ISLANDS registry (renamed from STAR_ISLANDS, no alias); C swaps in the real components
  framing.ts                        A  FRAMING for web-plaza + 3 minis (C retunes)
  layouts.ts                        C  PLAZA, MONOSUKO, BEE, PEDULI prop positions + FOOTPRINTS
  Plaza.tsx                         C
  PosMonosuko.tsx, BeeCrm.tsx, PeduliPasal.tsx   C
src/world/ui/SeoMirror.tsx          A  minis + Education section
src/world/scene/screens/
  types.ts                          B  ScreenApp, HitRegion, hitAt, uvToLogical
  format.ts                         B  formatRupiah, roundRect, wrapText
  images.ts                         B  loadScreenImage (+ redraw notification)
  LiveScreen.tsx                    B
  pos/strings.ts, pos/pos.ts, pos/posDraw.ts, pos/index.ts       B
  crm/strings.ts, crm/crm.ts, crm/crmDraw.ts, crm/index.ts       B
  chat/strings.ts, chat/chat.ts, chat/chatDraw.ts, chat/index.ts B
  map/mapModel.ts, map/mapDraw.ts, map/index.ts                  C
src/world/engine/camera/closeup.ts  B  closeupPose (pure)
src/world/scene/CloseupCamera.tsx   B
src/world/scene/CloseupController.tsx  B
src/world/scene/travel.ts           C  startTravel
src/world/scene/milestones/placement.ts, Milestones.tsx, stamp.ts   C
src/world/scene/GraduationCap.tsx   C  (cap model shared by Ezra's head and the tour toss)
public/world/monosuko/menu.webp, logo.webp   B
```

## Shared contracts

Every name below is exact. A later part relies on it; the part that creates it must export it with this signature.

### Part A exports

```ts
// src/config/schema.ts
export interface ProjectLinks { demo?: string; github?: string; discord?: string; roblox?: string }
export interface WorldProject {
  id: string; title: string; year: number; line: string; stats?: string[]; tags: string[];
  district: District; tier: "star" | "mini"; links: ProjectLinks; island?: { accent?: string };
}   // `screenshot` and `island.template` are removed
export interface Milestone { year: number; title: string; line: string; moment?: "graduation" }
export function isSiteLink(url: string): boolean;   // true for "https://…" or a path starting with exactly one "/"
export function validateMilestones(list: readonly Milestone[]): ValidationIssue[];

// src/config/portfolio.ts
export const milestones: Milestone[];
// = [
//   { year: 2022, title: "Started Business Information Systems", line: "Petra Christian University" },
//   { year: 2024, title: "Bangkit Academy", line: "Mobile Development, graduated with Distinction" },
//   { year: 2026, title: "Graduated", line: "Business Information Systems, Petra Christian University", moment: "graduation" },
// ]

// src/world/engine/gen/layout.ts
export type IslandKind = "hero" | "star" | "mini" | "hub";
export const WEB_PLAZA_ID = "web-plaza";
export const HUB_RADIUS = 5;
export const HUB_DEPTH = 5;
export const STAR_TOUR: readonly string[];          // ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]
export const CHAIN_DIR: { x: number; z: number };   // the tour framings' real screen-right: 12° from +x toward +z = (0.9781, 0.2079)
export const CHAIN_HEIGHTS: readonly number[];      // y offsets from the hub per chain index: [1, 2, 1]
export function webChain(hub: IslandPlacement, radii: readonly number[], taken: readonly IslandPlacement[], seeds?: readonly number[]): Vec3i[];
// seeds: keep only columns where both bridge ends land on grass
// buildLayout: emits the hub (kind "hub", district "web", origin DISTRICT_HUBS.web.origin = (120, 8, -6): after Ezra Bot
// along CHAIN_DIR, 31.5-block minecart) when any web project exists. Minis: pos-monosuko (134, 9, 0),
// bee-furniture-crm (147, 10, -3), pedulipasal (158, 9, 5). edgeAnchor measures hub/mini islands from their true centre;
// places web minis with webChain in config order; tourOrder = STAR_TOUR (present ones) + [WEB_PLAZA_ID] + web minis.

// src/world/scene/islands/types.ts
export interface IslandModule {
  id: string;
  Component: FC<{ placement: IslandPlacement }>;
  stamp?: (grid: VoxelGrid, placement: IslandPlacement) => void;
  tourStop: (placement: IslandPlacement) => TourStop;
}
export type StarIslandModule = IslandModule;        // alias for existing imports

// src/world/scene/islands/index.ts
export const ISLANDS: Record<string, IslandModule>;  // hero, 4 stars, web-plaza, pos-monosuko, bee-furniture-crm, pedulipasal
// Part A registers web-plaza and the minis with a placeholder Component (renders null) and FRAMING-based tourStop;
// Part C replaces each placeholder with its real component and stamp. World.tsx and TourCamera.tsx use ISLANDS.
```

### Part B exports

```ts
// src/world/scene/screens/types.ts
export interface HitRegion { x: number; y: number; w: number; h: number; action: string; arg?: number }
export interface ScreenApp<S> {
  logical: { w: number; h: number };               // drawing units; the canvas is logical × SCREEN_SCALE
  init(now: Date): S;
  act(s: S, action: string, arg: number | undefined, t: number): S;   // visitor input (t = seconds, clock time)
  auto(s: S, t: number): S | null;                 // idle demo step; null = nothing happened
  busy(s: S, t: number): boolean;                  // animating: keep redrawing
  draw(ctx: CanvasRenderingContext2D, s: S, t: number): HitRegion[];  // ctx is already scaled to logical units
}
export const SCREEN_SCALE = 2;
export function hitAt(regions: readonly HitRegion[], x: number, y: number): HitRegion | null;  // last match wins (topmost)
export function uvToLogical(uv: { x: number; y: number }, logical: { w: number; h: number }): { x: number; y: number };

// src/world/scene/screens/format.ts
export function formatRupiah(n: number): string;   // 30000 → "Rp 30,000"
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void;
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[];

// src/world/scene/screens/images.ts
export interface ScreenImage { img: HTMLImageElement; ready: boolean }
export function loadScreenImage(url: string): ScreenImage;   // cached per url; marks every LiveScreen dirty on load

// src/world/scene/screens/LiveScreen.tsx
export interface LiveScreenProps<S> {
  id: string;                         // also the Interactable id and the closeup target id
  placement: IslandPlacement;
  app: ScreenApp<S>;
  label: string;                      // Interactable label, e.g. "Use the POS"
  at: { x: number; y: number; z: number };   // island-local centre of the screen face
  rotationY?: number;
  size: { w: number; h: number };     // world units of the visible face
  frame?: "bezel" | "none";           // default "bezel": a rounded dark frame behind the face
  bezelColor?: string;                // default "#22262b"
}
export function LiveScreen<S>(props: LiveScreenProps<S>): JSX.Element;
export function markScreensDirty(): void;

// src/world/state/runtime.ts (Part B adds)
export interface CloseupTarget {
  id: string; island: string;
  center: () => Vec3;                 // world centre of the face (re-read each frame)
  normal: () => Vec3;                 // world unit normal the face looks along
  size: { w: number; h: number };
  input: (x: number, y: number) => void;            // logical coordinates
  hit: (origin: Vec3, dir: Vec3) => { x: number; y: number } | null;   // ray → logical point on the face, or null
}
// runtime.closeups: Map<string, CloseupTarget>   — LiveScreen registers/unregisters itself
// runtime.closeup: { id: string } | null        — the active closeup

// src/world/state/store.ts (Part B adds)
// closeupId: string | null; setCloseup(id: string | null): void   — openCloseup/closeCloseup write both runtime and store

// src/world/scene/CloseupController.tsx
export function openCloseup(id: string): void;
export function closeCloseup(): void;

// src/world/engine/camera/closeup.ts
export const CLOSEUP_FILL = { h: 0.85, w: 0.9 };
export function closeupPose(
  center: Vec3, normal: Vec3, size: { w: number; h: number }, aspect: number, fovDeg: number,
): { camera: Vec3; target: Vec3 };

// src/world/scene/screens/pos/index.ts   export const posApp: ScreenApp<PosState>;
// src/world/scene/screens/crm/index.ts   export const crmApp: ScreenApp<CrmState>;
// src/world/scene/screens/chat/index.ts  export const chatApp: ScreenApp<ChatState>;
// Logical sizes: posApp and crmApp { w: 640, h: 400 } (landscape 16:10); chatApp { w: 240, h: 520 } (phone).
```

### Additions recorded in the part plans

Each part plan lists its own **Contract additions** at its top; read the earlier parts' additions before starting a part.
Highlights a later part relies on:
- Part A: `islandTitle(id)` (`scene/islands/shared/project.ts`), `worldCopy.webDistrict`, `CHAIN_DEPTH`, `CHAIN_BRIDGE`,
  `seoLink` (`ui/seoLinks.ts`); `TOUR_ORDER` is removed (use `runtime.layout.tourOrder`).
- Part B: optional `ScreenApp.key?(s, code, t)` and `CloseupTarget.key?(code)` (keyboard while in closeup — the map board
  uses these); `LiveScreen` `radius?` prop and a **stable** `app` object (memoise app factories); `openCloseup` /
  `closeCloseup` live in `scene/closeupState.ts` (re-exported from `CloseupController.tsx`), `markScreensDirty` in
  `screens/dirty.ts`; `MobileControls` hides during a closeup.
- Part C: Ezra is hidden while a closeup is open (he could block a low screen in Play).

### Part C exports

```ts
// src/world/scene/screens/map/index.ts
export function mapApp(layout: WorldLayout, here: string, travel: (id: string) => void): ScreenApp<MapState>;

// src/world/scene/travel.ts
export function startTravel(to: string): void;
// Play: closes the closeup, sets runtime.travel; PlayerController runs out (puff + hide, 0.35 s) → move to a landing
// column on `to` (landingColumn) → in (puff + show). Tour: closes the closeup and calls scrollToIsland(to).
// runtime.travel: { to: string; phase: "out" | "in"; t: number } | null
// runtime.hidden: boolean   — Ezra.tsx hides the model while true

// graduation
// runtime.capOn: boolean         — Ezra wears the cap (Play moment, once per session)
// runtime.capToss: number | null — clock time a tour toss started (once per page load; a click replays it)
// SfxName gains "pop" and "poof"

// src/world/scene/milestones/placement.ts
export interface MilestoneSpot { year: number; pos: Vec3; ry: number; ownStone: boolean }
export function milestoneSpots(bridge: Crossing, from: IslandPlacement, to: IslandPlacement, years: readonly number[]): MilestoneSpot[];
```

## Task index

| Part | Task | Deliverable |
|---|---|---|
| A | A1 | Schema: drop `screenshot`/`island.template`, `isSiteLink`, `Milestone` + `validateMilestones` (tests) |
| A | A2 | Config: three mini projects, `milestones`; config tests updated |
| A | A3 | Island registry rename + placeholder modules + FRAMING for the new islands (before the layout: TourCamera needs a module for every tour stop) |
| A | A4 | Layout: `hub` kind, `webChain`, derived tour order; world and tour run end to end (tests: bridge rule, no overlap, chain direction, camera moves sideways on web legs, tour order, crossing kinds; headless shots) |
| A | A5 | SEO mirror: minis + Education section |
| B | B1 | `screens/types.ts`, `format.ts`, `images.ts` (tests for hitAt, uvToLogical, formatRupiah) |
| B | B2 | `LiveScreen` (canvas, redraw policy, idle demo + 7 s pause, visibility, Interactable → closeup registration) |
| B | B3 | Closeup: `closeupPose` (tests), store/runtime state, `CloseupCamera`, `CloseupController` (pointer routing, exits), HUD Back, Esc/Tab/E integration |
| B | B4 | POS app: strings, model (tests), draw, assets in `public/world/monosuko/` |
| B | B5 | CRM app: strings, model (tests), draw |
| B | B6 | Chat app: strings, model (tests), draw |
| C | C1 | Plaza island (district sign, lamps, tree; footprints; layouts tests) |
| C | C2 | POS Monosuko island with its LiveScreen, board, inactive sign |
| C | C3 | Bee Furniture CRM island |
| C | C4 | PeduliPasal island |
| C | C5 | Milestones: placement (tests), pillars + plaques, collision |
| C | C6 | Graduation moment: cap model, Play trigger, tour toss, SFX |
| C | C7 | Map boards: map model (tests), draw, board per island, fast travel (Play + Tour) |
| C | C8 | Performance measurement, visual shots, manual checklist |
