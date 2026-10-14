# Voxel World — Phase 2A Part C: Islands, Milestones and Map Boards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dress the Web & Apps district: the plaza and the POS Monosuko, Bee Furniture CRM and PeduliPasal islands, each mini with its live program screen, info board and link sign. Add three year milestones on the Hero → GTID bridge with the graduation moment, and a map board on all nine islands for fast travel in Play and Tour.

**Architecture:**
- Islands are hand-built modules in `src/world/scene/islands/`, registered in the `ISLANDS` registry from Part A.
- Prop positions live in `layouts.ts`, next to the `FOOTPRINTS` collision derived from the same numbers. `layouts.test.ts` checks every placement rule from the data alone: rim, anchors, rope posts, walkways, board collision and tour-view occlusion.
- Screens are Part B `LiveScreen`s. The map board is one more `ScreenApp` (`screens/map/`) whose model is built from the live layout.
- Milestones are placed from the hero → GTID crossing by a pure function and stamped as collision after the crossings. The tour lingers on that leg through a per-leg travel weight in `buildTourPath`.
- Fast travel is a small state machine in `travel.ts`: pure steps that `PlayerController` drives.

**Tech Stack:** TypeScript 5.8 strict (`verbatimModuleSyntax`, `erasableSyntaxOnly`), React 19, three 0.186, @react-three/fiber 9, @react-three/drei 10, zustand 5, zzfx, Vitest (node environment), playwright-core for headless checks. No new dependencies.

**Master plan (binding contracts, global constraints, task index):** `docs/superpowers/plans/2026-10-14-voxel-phase2a.md`
**Spec:** `docs/superpowers/specs/2026-10-14-voxel-phase2a-world-content-design.md`. Part C covers §3.1 (plaza props), §3.3 (mini framings), §4, §7, §8, §11 and the visual and manual parts of §12.
**Read first:** the "Contract additions", "Contract deviations" and "Notes Parts B and C rely on" sections of `2026-10-14-voxel-phase2a-a-layout.md`, and the "Contract additions" and "Contract deviations" of `2026-10-14-voxel-phase2a-b-screens.md`. Part C starts from a branch where Parts A and B are complete.

## Global Constraints

The master's "Global Constraints" and "Coordinate conventions" apply to every task. Part C specifics:

**Where to work**
- All commands run in Git Bash from the app root `C:\Users\ezrak\OneDrive\Documents\Code\react\portfolio\portfolio` (the folder with `package.json`), on branch `voxel-world`.
- Never pass `/c/...` paths to Node, Python or Playwright: use `C:/Users/...`.
- Write only inside the repo or the session scratchpad.
- Never kill Chrome by name: only PIDs you started. The headless scripts close their own browser.

**Commits**
- Never stage the pre-existing ` D gsap-splittext-kinetic-typography-experiment-gsapchallenge-1/…` deletions. Always `git add` the exact paths listed in the step, never `git add -A` / `git add .`.
- Every commit uses this form (only the message line changes):

  ```bash
  git commit -q -F - <<'EOF'
  feat(world): <message>

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
  EOF
  ```

**Code rules**
- `react-refresh/only-export-components` is an **error**: a `.tsx` file exports components only. Constants, geometry and helpers that other modules import live in `.ts` modules: `layouts.ts`, `graduation.ts`, `milestones/*.ts` and `screens/map/*.ts`.
- Island props use island-local coordinates (`islandFrame`). Local y = 0 is the grass top, and fronts face +z toward the tour camera.
- Static blocks go in one `PropBlocks` batch per island. Anything that animates is its own small mesh, updated in `useFrame` through refs: never `setState` in a frame callback.
- Every `ScreenApp` handed to `LiveScreen` must be a stable object (module constant or `useMemo`). LiveScreen keys its state on it.
- `prefers-reduced-motion` freezes the ambient motion: smoke, the bee, the scales, the cap pop and the toss.

**Expected test counts**
- Every code block here ran task by task on a copy of the branch before the plan was written: Part A's verified tree with Part B's contracts in place.
- Part B's three apps were stand-ins with the same exports there. The real `LiveScreen` and `fakeCtx` from Part B's plan were used.
- The per-file test counts in the "Expected" lines are therefore exact. For a whole-suite run, the total depends on Part B, so only "0 failed" is expected.
- The intermediate states (C1 and C3 with bare minis, C5's pillars-only `Milestones.tsx`) were checked with `tsc -b`, `eslint` and their tests.

**Screenshots**
- `npm run build`, then `npm run shots -- <stops>` writes `.shots/stop-<N>-desktop.png` and `.shots/stop-<N>-phone.png`.
- `npm run shot -- "<query>" shots/<name>.png <WxH>` takes a single shot. Both folders are gitignored.
- `vite preview` has no API server, so lines like `[http 500] http://localhost:4173/api/gtid/history` are expected: GTID falls back to its snapshot.
- Look at every shot you take (open the PNG) before moving on.

## Task overview

| Task | Deliverable |
|---|---|
| C1 | District layouts for all four Web & Apps islands, a `map` spot on all nine islands, `FOOTPRINTS`, the full `layouts.test.ts` rule set, `InfoBoard` / `Signpost` `scale`, `metaRows`, the retuned web framings, the plaza island |
| C2 | POS Monosuko island (stall, awning, logo badge, grill with smoke, table) with its POS `LiveScreen`, board and inactive sign; the `?closeup=<id>` deep link; Ezra hidden during a closeup |
| C3 | Bee Furniture CRM island (shed, workbench, half-built chair, logs, buzzing bee, monitor stand) with its CRM `LiveScreen` |
| C4 | PeduliPasal island (pavilion, statute books, tilting scales, tree, phone on a plinth) with its chat `LiveScreen`; the registry's final form; the portrait check |
| C5 | Milestones: placement (tests), plaques (tests), collision stamp (tests), pillars, the tour slowing on the milestone leg |
| C6 | Graduation moment: the outfit geometry (tests), cap and regalia on Ezra, the Play trigger, the tour toss, the `pop` and `poof` SFX, the runtime fields |
| C7 | Map boards: map model (tests), drawing, the map `ScreenApp`, `MapBoard` on all nine islands, fast travel (`travel.ts`, tests) in Play and Tour, keyboard |
| C8 | Draw-call measurement script (with the quality tier in `RenderStats`), mitigations if needed, headless shots, the §12 manual checklist, the final checks |

## Contract additions

Everything in the master's "Part C exports" is created with the exact names and signatures given there. Part C adds:

| Module | Addition | Why |
|---|---|---|
| `scene/islands/layouts.ts` | `MINI_BOARD_SCALE = 0.55`, `MINI_SIGN_SCALE = 0.8` | the radius-4 minis carry scaled-down info boards and signs (a full-size board covered a third of a mini) |
| same | `MAP_BOARD = { w: 1.5, h: 0.9375, y: 1.2 }`, `MAP_HALF_SPAN` | one size for every map board; the 16:10 face matches the map's 480 × 300 canvas |
| same | `PLAZA`, `MONOSUKO`, `BEE`, `PEDULI` (prop positions; every mini has `screen`, `info`, `link`, `map`, `stand`) | spec §3.1 and §4 |
| same | `map: { x, z, ry }` on `HERO`, `GTID`, `PETAK`, `ORBIT`, `EZRA` | spec §8: a board on every island |
| same | `MINI_ANCHOR_CLEARANCE = 1.75` | see "Contract deviations" 1 |
| `scene/islands/shared/InfoBoard.tsx`, `Signpost.tsx` | optional `scale = 1` prop (the whole board or sign scales about its foot; the Signpost hitbox scales with it) | the minis |
| `scene/islands/shared/text.ts` | `metaRows(year, tags, maxChars = BODY_CHARS): string[]` | the "2026 · React · Express · MySQL" board rows, wrapped at a separator |
| `scene/islands/shared/MapBoard.tsx` | `MapBoard({ placement, at })` | one component for all nine boards |
| `scene/islands/{Plaza,PosMonosuko,BeeCrm,PeduliPasal}.tsx` | `PlazaIsland`, `PosMonosukoIsland`, `BeeCrmIsland`, `PeduliPasalIsland` | the island modules |
| `scene/screens/map/mapModel.ts` | `MAP_LOGICAL`, `MAP_AREA`, `MAP_BUTTONS`, `LABEL_CHAR_W`, `projectTopDown`, `islandOutline`, `buildMapModel`, `mapRegions`, `stepIsland`, `initialCursor`, `mapKeyButton`; types `MapModel`, `MapIsland`, `MapLink`, `MapPoint`, `MapButton` | model purity: no DOM, no three |
| `scene/screens/map/mapDraw.ts` | `drawMap(ctx, model, cursor)` | |
| `scene/screens/map/index.ts` | `interface MapState { cursor: number }` (master's `mapApp` returns `ScreenApp<MapState>`) | |
| `scene/travel.ts` | `TRAVEL_OUT = 0.35`, `TRAVEL_IN = 0.35`, `type TravelEvent`, `stepTravel(tr, dt)`, `travelFade(tr)`, `arrivalSpot(isSolid, island, stop?)` | the Play travel as pure, tested steps |
| `scene/milestones/placement.ts` | `MILESTONE_BRIDGE`, `MILESTONE_SIDE`, `MILESTONE_INLAND`, `MID_STONE_SIDE`, `PILLAR_H`, `MILESTONE_LEG_TRAVEL = 1.3`, `PLAQUE_RY`, `milestoneSpotsFor(layout, years)`, `tourTravelWeights(layout)`, `WorldCell`, `milestoneCells(spot)` | beyond the master's `milestoneSpots` / `MilestoneSpot` |
| `scene/milestones/plaque.ts` | `PLAQUE`, `PlaqueRows`, `plaqueRows(m)` | plaque text layout, tested |
| `scene/milestones/moment.ts` | `CAP_RADIUS = 2.5`, `nearMilestone`, `crossedForward`, `TOSS`, `tossPose`, `capPopScale` | the graduation maths, tested |
| `scene/milestones/stamp.ts` | `stampMilestones(grid, layout, years)` | |
| `scene/graduation.ts` | `GRAD_COLORS`, `CAP_ON_HEAD_Y`, `CAP_GEOMETRY`, `REGALIA_GEOMETRY`, `GRAD_MATERIAL` | see "Contract deviations" 2 |
| `scene/GraduationCap.tsx` | `GraduationCap({ cast? })`, `GraduationRegalia({ cast? })` | |
| `engine/camera/tourPath.ts` | `buildTourPath(stops, via?, travel?: readonly number[])`; `TourPath.travel: number[]` (per-leg travel weight, default `TRAVEL_WEIGHT`) | "the camera slows slightly while passing" (§7.1) |
| `scene/World.tsx` | `?closeup=<screen id>` deep link: opens that closeup once the world is ready (screenshots) | headless shots of each screen in closeup (§12) |
| `scene/RenderStats.tsx` | the dev log line gains the quality tier: `[world] N draw calls, M triangles, high quality` | the measurement must know whether shadows were on |
| `scripts/draw-calls.mjs`, `package.json` `"draw-calls"` | peak draw calls per tour stop and at the Hero → GTID midpoint, desktop and phone | §11 "measured, not estimated" |

## Contract deviations

1. **Prop clearance on the minis is 1.75 blocks, not 2.**
   - The coordinator asked for ≥ 2 blocks between props and every bridge anchor.
   - A radius-4 mini's anchors sit 3 blocks from its centre, and two bridges cut both sides. A 2-block ring leaves POS Monosuko 14 usable cells, two of them in its back row: no stall fits, and Bee's boards end up 17–30 % hidden in the tour view.
   - `MINI_ANCHOR_CLEARANCE = 1.75` frees the back and front corners. To compensate, `layouts.test.ts` adds two rules the 2-block ring stood in for:
     - no prop cell within 0.6 of a bridge rope post (±1.05 beside each anchor);
     - a walkway (BFS over free grass) from every bridge head to the other and to the screen's `stand` cell.
   - Hubs and stars keep 2. **Approved by the coordinator** (open question 1, resolved).
2. **`GRAD_COLORS` lives in `scene/graduation.ts`, not `GraduationCap.tsx`.** The react-refresh rule forbids non-component exports in a `.tsx` file. `graduation.ts` holds the colours, the merged geometries and the material. `GraduationCap.tsx` holds only the two components.
3. **The map is drawn along the tour's axes, not plain north-up.**
   - `projectTopDown` maps world x/z to u along `CHAIN_DIR` (the tour framings' screen-right) and v along its forward. The board then reads like the tour: each stop further right, and further from the camera means higher up.
   - Island outlines are convex hulls of their grass-top blocks, so the small islands' ragged rims don't spike.
4. **"You are here" has two marks: a red pin on the island and the island's name in the header.** A tag on the map crowded the minis' names.
5. **The hero's map board stands behind the title, two blocks from the 2022 milestone.** The hero has no arrival point (spec §8). Every spot in front of the title hid a letter from the tour camera.
6. **The tour's slow-down is a scroll weight, not a speed.** `buildTourPath` takes per-leg travel weights, and `tourTravelWeights` gives the hero → GTID leg 1.3. The camera spends 30 % more scroll on that flight, and every other leg keeps its proportions.
7. **Map keyboard goes through Part B's `ScreenApp.key`.** Tab → board → Enter opens the closeup (Part B's flow). The arrows move the cursor, and Enter travels.
8. **Map-board collision lands in C1, the boards in C7.** `FOOTPRINTS` carries each island's map cells from C1, so the placement rules see every island's final free space at once. Until C7 that is two invisible barrier cells per island in Play.
9. **Ezra is hidden while a closeup is open** (Part B's note to Part C). This lands in C2 with the first island screen. C6 extends the same check to the fast travel's `runtime.hidden`.

## Layout notes

Island-local values from `buildLayout(worldProjects)` (Part A). The tests compute them; they are listed here for reading the props.

| Island | Bridge anchors (local x, z) | Kept clear | Screen | `stand` (Ezra uses the screen from here) |
|---|---|---|---|---|
| plaza (r 5) | minecart station (−2, 0), sign (−2.28, 1.42); bridge to POS (3.45, 1.48) | 2 blocks | none | n/a |
| POS Monosuko (r 4) | from plaza (−2.76, −1.18); to Bee (2.92, −0.67) | 1.75 | back wall, centre (0, 3.0, −2.12), 3.4 × 2.125 | (0, 0) |
| Bee Furniture CRM (r 4) | from POS (−2.92, 0.67); to PeduliPasal (2.43, 1.76) | 1.75 | monitor stand (1.8, 2.9, 0.15), 3.4 × 2.125 | (1, 0) |
| PeduliPasal (r 4) | from Bee (−2.43, −1.76) | 1.75 | phone (0.75, 2.25, 0.99), 1.25 × 2.708 | (1, 2) |

- The mini framings keep Part A's ~17° heading, which PeduliPasal's lopsided rim needs for a centred portrait view. They move to about 13 blocks out, centred on the island with its screen whole in view. `framing.test.ts` (portrait |x| < 0.12, web legs mostly rightward) passes unchanged.
- `PROP_RINGS` stays as it is.
- Measured on the verified copy with `scripts/draw-calls.mjs` (C8), on the machine's GPU at high quality:
  - every view is at 77–122 draw calls; the peak is 122 at stop 2 (Petak Umpet);
  - the plaza view is 78;
  - the Hero → GTID midpoint is 103 on desktop and 108 on phone.
- The budget is 200.

## File map

```
src/world/scene/islands/layouts.ts                         C1 modify
src/world/scene/islands/layouts.test.ts                    C1 replace
src/world/scene/islands/shared/InfoBoard.tsx, Signpost.tsx C1 modify
src/world/scene/islands/shared/text.ts, text.test.ts       C1 modify
src/world/scene/islands/framing.ts                         C1 modify
src/world/scene/islands/Plaza.tsx                          C1 create, C7 modify
src/world/scene/islands/index.ts                           C1 replace, C2 + C3 modify, C4 replace
src/world/scene/islands/index.test.ts                      C1 replace, C2 + C3 modify, C4 replace
src/world/scene/islands/PosMonosuko.tsx                    C2 create, C7 modify
src/world/scene/World.tsx                                  C2 modify, C5 modify
src/world/scene/Ezra.tsx                                   C2 modify, C6 modify
src/world/scene/islands/BeeCrm.tsx                         C3 create, C7 modify
src/world/scene/islands/PeduliPasal.tsx                    C4 create, C7 modify
src/world/scene/milestones/placement.ts (+ test)           C5 create
src/world/scene/milestones/plaque.ts (+ test)              C5 create
src/world/scene/milestones/stamp.ts (+ test)               C5 create
src/world/scene/milestones/Milestones.tsx                  C5 create, C6 replace
src/world/engine/camera/tourPath.ts (+ test)               C5 modify
src/world/scene/tour/tourBuild.ts (+ test)                 C5 modify
src/world/state/runtime.ts                                 C6 modify
src/world/engine/audio/sfx.ts (+ test)                     C6 modify
src/world/scene/graduation.ts (+ test)                     C6 create
src/world/scene/GraduationCap.tsx                          C6 create
src/world/scene/milestones/moment.ts (+ test)              C6 create
src/world/scene/screens/map/mapModel.ts (+ test)           C7 create
src/world/scene/screens/map/mapDraw.ts, index.ts           C7 create
src/world/scene/travel.ts (+ test)                         C7 create
src/world/scene/PlayerController.tsx                       C7 modify
src/world/scene/islands/shared/MapBoard.tsx                C7 create
src/world/scene/islands/{Hero,Gtid,PetakUmpet,OrbitStore,EzraBot}.tsx   C7 modify
src/world/scene/RenderStats.tsx                            C8 modify
scripts/draw-calls.mjs                                     C8 create
package.json                                               C8 modify
```

---

### Task C1: District layouts, footprints and rules; board and sign scale; the plaza

All Web & Apps prop positions (plaza and minis) and a map-board spot on every island land at once. `layouts.test.ts` then checks the whole district's free space, walkways and tour views in one place. The minis stay bare in the registry until C2–C4. A bare module has no `stamp`, so their `FOOTPRINTS` stay inert until then. The map cells on the five star islands and the plaza are stamped from now on (see "Contract deviations" 8).

**Files:**
- Modify: `src/world/scene/islands/layouts.ts`, `src/world/scene/islands/shared/InfoBoard.tsx`, `src/world/scene/islands/shared/text.ts`, `src/world/scene/islands/shared/text.test.ts`, `src/world/scene/islands/framing.ts`
- Replace: `src/world/scene/islands/layouts.test.ts`, `src/world/scene/islands/shared/Signpost.tsx`, `src/world/scene/islands/index.ts`, `src/world/scene/islands/index.test.ts`
- Create: `src/world/scene/islands/Plaza.tsx`

**Interfaces:**
- Consumes:
  - `buildLayout`, `WEB_PLAZA_ID`, `CHAIN_DIR` (Part A);
  - `islandFrame`, `boxCells`, `postCells`, `stampCells` (`shared/local`), `PropBlocks`, `treeBlocks`, `PALETTE` (Phase 1);
  - `worldCopy.webDistrict` (Part A), `TOUR_FOV`, `tourStopFor` (`framing.ts`), `infoBoardRows`, `BODY_CHARS` (`shared/text.ts`).
- Produces:
  - `MINI_BOARD_SCALE`, `MINI_SIGN_SCALE`, `MAP_BOARD`, `MAP_HALF_SPAN`, `PLAZA`, `MINI_ANCHOR_CLEARANCE`, `MONOSUKO`, `BEE`, `PEDULI`, `X.map` on the five stars, and the new `FOOTPRINTS` entries;
  - `metaRows`, the `scale` prop on `InfoBoard` and `Signpost`;
  - `PlazaIsland`; `ISLANDS["web-plaza"]` dressed.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/islands/shared/text.test.ts`, the import. Old:
```ts
import { infoBoardRows, wrapWords } from "./text";
```
New:
```ts
import { infoBoardRows, metaRows, wrapWords } from "./text";
```

and at the end of the file, after the last `});`, append:
```ts

describe("metaRows", () => {
  it("packs the year and tags into rows of at most 21 characters, never ending a row on a separator", () => {
    expect(metaRows(2026, ["React", "Express", "MySQL"])).toEqual(["2026 · React", "Express · MySQL"]);
    expect(metaRows(2025, ["React", "PostgreSQL"])).toEqual(["2025 · React", "PostgreSQL"]);
    expect(metaRows(2024, ["Kotlin", "TensorFlow", "Gemini"])).toEqual(["2024 · Kotlin", "TensorFlow · Gemini"]);
    expect(metaRows(2026, [])).toEqual(["2026"]);
  });
});
```

Replace `src/world/scene/islands/layouts.test.ts` with the full rule set. This replaces Part A's `dressed` / `footprint(id)` scoping. "exist for every tour island" is back to the whole `layout.tourOrder`, as Part A's notes ask. The rules:
- rim, interior grass and anchor clearance;
- bridge rope posts;
- stations and pads;
- one owner per cell;
- the walkway BFS;
- board collision for every info board, sign, mini board and map board;
- the Web & Apps tour views: screen whole and unobstructed; boards and signs not mostly hidden.

```ts
import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { characterCollides } from "@/world/engine/physics/character";
import { worldCopy, worldProjects } from "@/config/portfolio";
import type { Vec3 } from "@/world/engine/types";
import { PAD_SIZE, SIGN_OFFSET, SIGN_WIDTH, STATION_SIZE, padPair, railEnds } from "@/world/scene/crossings/geometry";
import {
  BEE, EZRA, FOOTPRINTS, GTID, HERO, INFO_HALF_SPAN, MAP_BOARD, MAP_HALF_SPAN, MINI_ANCHOR_CLEARANCE, MINI_BOARD_SCALE,
  MINI_SIGN_SCALE, MONOSUKO, ORBIT, PEDULI, PETAK, PLAZA,
} from "./layouts";
import { TOUR_FOV, tourStopFor } from "./framing";
import { islandFrame } from "./shared/local";
import { projectById } from "./shared/project";
import { infoBoardRows, metaRows } from "./shared/text";

const layout = buildLayout(worldProjects);
const byId = Object.fromEntries(layout.islands.map((p) => [p.id, p]));
const toLocal = (id: string, v: { x: number; z: number }) => ({
  x: v.x - (byId[id].origin.x + 0.5),
  z: v.z - (byId[id].origin.z + 0.5),
});
const grassOf = (id: string) => {
  const p = byId[id];
  return new Set(generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0).map((c) => `${c.x},${c.z}`));
};
const WEB = ["web-plaza", "pos-monosuko", "bee-furniture-crm", "pedulipasal"];

describe("island prop footprints", () => {
  it("exist for every tour island", () => {
    for (const id of layout.tourOrder) expect(FOOTPRINTS[id]?.length ?? 0, id).toBeGreaterThan(0);
  });

  it("stay on the island (inside 78% of the radius, the narrowest rim after noise)", () => {
    for (const id of layout.tourOrder) {
      const r = byId[id].radius * 0.78;
      for (const [x, , z] of FOOTPRINTS[id]) expect(Math.hypot(x, z), `${id} (${x},${z})`).toBeLessThanOrEqual(r);
    }
  });

  it("stand on the Web & Apps islands on grass with grass on all four sides (never on the rim of the real terrain)", () => {
    for (const id of WEB) {
      const grass = grassOf(id);
      for (const [x, , z] of FOOTPRINTS[id]) {
        const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => grass.has(`${x + dx},${z + dz}`));
        expect(ok, `${id} (${x},${z})`).toBe(true);
      }
    }
  });

  it("leave 2 blocks clear around every crossing anchor (MINI_ANCHOR_CLEARANCE on the radius-4 minis)", () => {
    for (const c of layout.crossings) {
      for (const [id, anchor] of [[c.from, c.a], [c.to, c.b]] as const) {
        const a = toLocal(id, anchor);
        const clear = byId[id].kind === "mini" ? MINI_ANCHOR_CLEARANCE : 2;
        for (const [x, , z] of FOOTPRINTS[id]) {
          expect(Math.hypot(x - a.x, z - a.z), `${id} (${x},${z}) vs ${c.kind}`).toBeGreaterThanOrEqual(clear);
        }
      }
    }
  });

  // Bridge.tsx stands a rope post 1.05 to each side of every bridge anchor
  it("never put a prop cell on a bridge's rope post", () => {
    for (const c of layout.crossings) {
      if (c.kind !== "bridge") continue;
      const len = Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z);
      const side = { x: -(c.b.z - c.a.z) / len, z: (c.b.x - c.a.x) / len };
      for (const [id, anchor] of [[c.from, c.a], [c.to, c.b]] as const) {
        for (const s of [1.05, -1.05]) {
          const post = toLocal(id, { x: anchor.x + side.x * s, z: anchor.z + side.z * s });
          for (const [x, , z] of FOOTPRINTS[id]) {
            const inside = Math.abs(post.x - x) < 0.6 && Math.abs(post.z - z) < 0.6;
            expect(inside, `${id} (${x},${z}) holds a rope post of ${c.from} → ${c.to}`).toBe(false);
          }
        }
      }
    }
  });

  // Part B puts crossing furniture inside the rim, beyond the 2-block anchor clearance: minecart stations
  // (2.4-block platform 1.4 blocks in, a sign 1.45 blocks beside the track with a 1.7-block board) and
  // 1.3-block bounce pads 1.6 blocks in (crossings/geometry.ts, Minecart.tsx, BouncePad.tsx).
  it("never overlap a minecart station, its sign or a bounce pad", () => {
    const furniture: { id: string; what: string; x: number; z: number; half: number }[] = [];
    for (const c of layout.crossings) {
      if (c.kind === "minecart") {
        const e = railEnds(c, byId[c.from], byId[c.to]);
        const dx = e.stationB.x - e.stationA.x;
        const dz = e.stationB.z - e.stationA.z;
        const l = Math.hypot(dx, dz);
        for (const [st, id] of [[e.stationA, c.from], [e.stationB, c.to]] as const) {
          furniture.push({ id, what: "minecart station", ...toLocal(id, st), half: STATION_SIZE / 2 });
          furniture.push({ id, what: "minecart sign", ...toLocal(id, { x: st.x - (dz / l) * SIGN_OFFSET, z: st.z + (dx / l) * SIGN_OFFSET }), half: SIGN_WIDTH / 2 });
        }
      } else if (c.kind === "bouncePads") {
        const p = padPair(c, byId[c.from], byId[c.to]);
        // each pad is turned to face its pair: its axis-aligned half-extent is PAD_SIZE/2 · (|cos yaw| + |sin yaw|)
        const yaw = Math.atan2(p.b.x - p.a.x, p.b.z - p.a.z);
        const half = (PAD_SIZE / 2) * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)));
        furniture.push({ id: c.from, what: "bounce pad", ...toLocal(c.from, p.a), half });
        furniture.push({ id: c.to, what: "bounce pad", ...toLocal(c.to, p.b), half });
      }
    }
    expect(furniture.length).toBeGreaterThan(0);
    for (const f of furniture) {
      for (const [x, , z] of FOOTPRINTS[f.id]) {
        // gap between the cell's square and the furniture's square; negative = they overlap
        const gap = Math.max(Math.abs(x - f.x), Math.abs(z - f.z)) - 0.5 - f.half;
        expect(gap, `${f.id} (${x},${z}) vs ${f.what}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("give every Web & Apps prop its own cells (no two props claim one)", () => {
    for (const id of WEB) {
      const seen = new Set<string>();
      for (const c of FOOTPRINTS[id]) {
        const k = c.join(",");
        expect(seen.has(k), `${id} (${k}) claimed twice`).toBe(false);
        seen.add(k);
      }
    }
  });

  // On the small Web & Apps islands the props fill most of the free ground: Ezra must still get from every bridge head
  // to every other one, and to the spot in front of the island's screen, over free grass (one cell wide is enough).
  it("keep a walkway on the Web & Apps islands: bridge head to bridge head, and to the screen", () => {
    const stands: Record<string, { x: number; z: number } | undefined> = {
      "pos-monosuko": MONOSUKO.stand, "bee-furniture-crm": BEE.stand, pedulipasal: PEDULI.stand,
    };
    for (const id of WEB) {
      const grass = grassOf(id);
      const blocked = new Set(FOOTPRINTS[id].map(([x, , z]) => `${x},${z}`));
      const heads = layout.crossings.flatMap((c) => [[c.from, c.a], [c.to, c.b]] as const).filter(([i]) => i === id).map(([, a]) => toLocal(id, a));
      const goals = [...heads.map((a) => ({ x: Math.round(a.x), z: Math.round(a.z) })), ...(stands[id] ? [stands[id]!] : [])];
      const start = goals[0];
      const seen = new Set([`${start.x},${start.z}`]);
      const queue = [start];
      while (queue.length) {
        const c = queue.shift()!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${c.x + dx},${c.z + dz}`;
          if (seen.has(k) || !grass.has(k) || blocked.has(k)) continue;
          seen.add(k);
          queue.push({ x: c.x + dx, z: c.z + dz });
        }
      }
      for (const g of goals) expect(seen.has(`${g.x},${g.z}`), `${id}: (${g.x},${g.z}) unreachable`).toBe(true);
    }
  });
});

describe("board and sign collision", () => {
  // InfoBoard: posts 1.0 tall, then the text panel (shared/InfoBoard.tsx); its height grows with the wrapped copy and
  // the whole board scales on the minis
  const infoTop = (title: string, lines: readonly string[], scale = 1) => (1.0 + infoBoardRows(title, lines).height) * scale;
  const stats = (id: string) => projectById(id).stats ?? [];
  const miniLines = (id: string) => {
    const p = projectById(id);
    return [p.line, ...metaRows(p.year, p.tags)];
  };
  const g = GTID.board;
  const s = EZRA.screen;
  const mapTop = MAP_BOARD.y + MAP_BOARD.h / 2;
  // every panel on two posts (or one post with a wide panel): where it stands (± half around `at`, turned by ry) and its
  // top edge above the grass
  const boards = [
    { id: "hero", what: "about board", at: HERO.info, half: INFO_HALF_SPAN, ry: HERO.info.ry, top: infoTop(worldCopy.location, [worldCopy.heroLine]) },
    { id: "gtid", what: "price board", at: g, half: g.w / 2 - 0.3, ry: g.ry, top: g.y + g.h / 2 - 0.4 + (g.h + 0.16) / 2 }, // Gtid.tsx PriceBoard
    { id: "gtid", what: "info board", at: GTID.info, half: INFO_HALF_SPAN, ry: GTID.info.ry, top: infoTop("gtid.pro", stats("gtid")) },
    { id: "petak-umpet", what: "title sign", at: PETAK.sign, half: PETAK.sign.w / 2 - 0.3, ry: PETAK.sign.ry, top: 0.55 + PETAK.sign.h }, // PetakUmpet.tsx SIGN_BOTTOM 0.55
    { id: "petak-umpet", what: "info board", at: PETAK.info, half: INFO_HALF_SPAN, ry: PETAK.info.ry, top: infoTop("Roblox", stats("petak-umpet")) },
    { id: "orbit-store", what: "info board", at: ORBIT.info, half: INFO_HALF_SPAN, ry: ORBIT.info.ry, top: infoTop("Orbit Store", stats("orbit-store")) },
    { id: "ezra-bot", what: "screen", at: s, half: s.w / 2 - 0.25, ry: s.ry, top: s.y + s.h / 2 - 0.2 + (s.h + 0.14) / 2 }, // EzraBot.tsx SCREEN_GEO
    { id: "ezra-bot", what: "info board", at: EZRA.info, half: INFO_HALF_SPAN, ry: EZRA.info.ry, top: infoTop("Discord", stats("ezra-bot")) },
    { id: "web-plaza", what: "district sign", at: PLAZA.sign, half: PLAZA.sign.w / 2 - 0.1, ry: PLAZA.sign.ry, top: PLAZA.sign.y + PLAZA.sign.h / 2 },
    ...([
      ["pos-monosuko", MONOSUKO.info],
      ["bee-furniture-crm", BEE.info],
      ["pedulipasal", PEDULI.info],
    ] as const).map(([id, b]) => ({ id, what: "info board", at: b, half: INFO_HALF_SPAN * MINI_BOARD_SCALE, ry: b.ry, top: infoTop(projectById(id).title, miniLines(id), MINI_BOARD_SCALE) })),
    ...([
      ["hero", HERO.map], ["gtid", GTID.map], ["petak-umpet", PETAK.map], ["orbit-store", ORBIT.map], ["ezra-bot", EZRA.map],
      ["web-plaza", PLAZA.map], ["pos-monosuko", MONOSUKO.map], ["bee-furniture-crm", BEE.map], ["pedulipasal", PEDULI.map],
    ] as const).map(([id, m]) => ({ id, what: "map board", at: m, half: MAP_HALF_SPAN, ry: m.ry, top: mapTop })),
  ];
  // an island's footprint as an IsSolid in island-local blocks: local cell x spans [x − 0.5, x + 0.5) around the
  // frame, so a frame position px sits in block floor(px + 0.5)
  const solidOf = (id: string) => {
    const set = new Set(FOOTPRINTS[id].map(([x, y, z]) => `${x},${y},${z}`));
    return (x: number, y: number, z: number) => set.has(`${x},${y},${z}`);
  };
  const along = (b: (typeof boards)[number], t: number) => ({ x: b.at.x + t * Math.cos(b.ry), z: b.at.z - t * Math.sin(b.ry) });

  it("leave no gap between the posts: Ezra (0.6 wide) can't stand anywhere on the post-to-post line", () => {
    const leaks: string[] = [];
    for (const b of boards) {
      const isSolid = solidOf(b.id);
      for (let t = -b.half; t <= b.half + 1e-9; t += 0.05) {
        const p = along(b, t);
        if (!characterCollides(isSolid, p.x + 0.5, 0, p.z + 0.5)) {
          leaks.push(`${b.id} ${b.what} at t=${t.toFixed(2)}`);
          break;
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it("reach the panel's top row, so he can't jump onto the barrier inside the panel", () => {
    const short: string[] = [];
    for (const b of boards) {
      const mid = along(b, 0);
      const cx = Math.round(mid.x), cz = Math.round(mid.z);
      const top = Math.max(-1, ...FOOTPRINTS[b.id].filter(([x, , z]) => x === cx && z === cz).map(([, y]) => y));
      if (top < Math.floor(b.top)) short.push(`${b.id} ${b.what}: panel top ${b.top.toFixed(2)}, barrier top row ${top}`);
    }
    expect(short).toEqual([]);
  });

  it("scale the mini signposts' post to the same footprint (one column)", () => {
    expect(MINI_SIGN_SCALE).toBeGreaterThan(0.5);
    expect(MINI_SIGN_SCALE).toBeLessThanOrEqual(1);
  });
});

/** Screen-space box (NDC, 16:9, TOUR_FOV) and depth of a set of world points seen from a tour stop. */
function projectBox(stop: { camera: Vec3; target: Vec3 }, pts: Vec3[]) {
  const f = { x: stop.target.x - stop.camera.x, y: stop.target.y - stop.camera.y, z: stop.target.z - stop.camera.z };
  const fl = Math.hypot(f.x, f.y, f.z);
  f.x /= fl; f.y /= fl; f.z /= fl;
  const rl = Math.hypot(f.z, f.x);
  const r = { x: -f.z / rl, y: 0, z: f.x / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const t = Math.tan(((TOUR_FOV / 2) * Math.PI) / 180);
  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, depth: 0 };
  for (const p of pts) {
    const v = { x: p.x - stop.camera.x, y: p.y - stop.camera.y, z: p.z - stop.camera.z };
    const z = v.x * f.x + v.y * f.y + v.z * f.z;
    const nx = (v.x * r.x + v.z * r.z) / (z * t * (16 / 9));
    const ny = (v.x * u.x + v.y * u.y + v.z * u.z) / (z * t);
    box.x0 = Math.min(box.x0, nx); box.x1 = Math.max(box.x1, nx);
    box.y0 = Math.min(box.y0, ny); box.y1 = Math.max(box.y1, ny);
    box.depth += z / pts.length;
  }
  return box;
}

describe("Web & Apps tour views", () => {
  /** Corners of a vertical panel: centre (x, z) local, width w turned by ry, from y0 to y1 above the grass. */
  const panel = (id: string, c: { x: number; z: number }, w: number, ry: number, y0: number, y1: number, dx = 0): Vec3[] => {
    const [fx, fy, fz] = islandFrame(byId[id]);
    const out: Vec3[] = [];
    for (const s of [-w / 2 + dx, w / 2 + dx]) for (const y of [y0, y1]) out.push({ x: fx + c.x + s * Math.cos(ry), y: fy + y, z: fz + c.z - s * Math.sin(ry) });
    return out;
  };
  const overlap = (a: ReturnType<typeof projectBox>, b: ReturnType<typeof projectBox>) =>
    (Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))) /
    ((b.x1 - b.x0) * (b.y1 - b.y0));
  const minis = [
    ["pos-monosuko", MONOSUKO],
    ["bee-furniture-crm", BEE],
    ["pedulipasal", PEDULI],
  ] as const;

  it("show each mini's screen whole in its stop, with no board in front of it", () => {
    for (const [id, L] of minis) {
      const stop = tourStopFor(byId[id]);
      const scr = L.screen;
      const screen = projectBox(stop, panel(id, scr, scr.w, 0, scr.y - scr.h / 2, scr.y + scr.h / 2));
      expect(Math.max(-screen.x0, screen.x1, -screen.y0, screen.y1), `${id} screen inside the frame`).toBeLessThan(0.95);
      const p = projectById(id);
      const infoH = infoBoardRows(p.title, [p.line, ...metaRows(p.year, p.tags)]).height;
      const fronts = [
        { what: "info board", box: projectBox(stop, panel(id, L.info, 2.4 * MINI_BOARD_SCALE, L.info.ry, MINI_BOARD_SCALE, (1 + infoH) * MINI_BOARD_SCALE)) },
        // Signpost board: x −0.85..1.53 around its post, 0.5 tall at 1.85 (all × scale)
        { what: "link sign", box: projectBox(stop, panel(id, L.link, 2.38 * MINI_SIGN_SCALE, L.link.ry, 1.6 * MINI_SIGN_SCALE, 2.1 * MINI_SIGN_SCALE, 0.34 * MINI_SIGN_SCALE)) },
        { what: "map board", box: projectBox(stop, panel(id, L.map, MAP_BOARD.w, L.map.ry, MAP_BOARD.y - MAP_BOARD.h / 2, MAP_BOARD.y + MAP_BOARD.h / 2)) },
      ];
      for (const f of fronts) {
        if (f.box.depth >= screen.depth) continue;
        expect(overlap(f.box, screen), `${id}: ${f.what} covers the screen`).toBeLessThan(0.01);
      }
    }
  });

  it("keep each Web & Apps board and sign in view: none mostly hidden behind another or behind the screen", () => {
    for (const [id, L] of [["web-plaza", PLAZA], ...minis] as const) {
      const stop = tourStopFor(byId[id]);
      const map = projectBox(stop, panel(id, L.map, MAP_BOARD.w, L.map.ry, MAP_BOARD.y - MAP_BOARD.h / 2, MAP_BOARD.y + MAP_BOARD.h / 2));
      expect(Math.max(-map.x0, map.x1, -map.y0, map.y1), `${id} map board inside the frame`).toBeLessThan(0.98);
      if (id === "web-plaza") continue;
      const M = L as (typeof minis)[number][1];
      const p = projectById(id);
      const infoH = infoBoardRows(p.title, [p.line, ...metaRows(p.year, p.tags)]).height;
      const boxes = {
        "map board": map,
        "info board": projectBox(stop, panel(id, M.info, 2.4 * MINI_BOARD_SCALE, M.info.ry, MINI_BOARD_SCALE, (1 + infoH) * MINI_BOARD_SCALE)),
        "link sign": projectBox(stop, panel(id, M.link, 2.38 * MINI_SIGN_SCALE, M.link.ry, 1.6 * MINI_SIGN_SCALE, 2.1 * MINI_SIGN_SCALE, 0.34 * MINI_SIGN_SCALE)),
        screen: projectBox(stop, panel(id, M.screen, M.screen.w, 0, M.screen.y - M.screen.h / 2, M.screen.y + M.screen.h / 2)),
      };
      for (const what of ["map board", "info board", "link sign"] as const) {
        for (const [other, b] of Object.entries(boxes)) {
          if (other === what || b.depth >= boxes[what].depth) continue;
          expect(overlap(b, boxes[what]), `${id}: the ${other} hides the ${what}`).toBeLessThan(what === "link sign" ? 0.3 : 0.25);
        }
      }
    }
  });
});
```

Replace `src/world/scene/islands/index.test.ts`. Part A's test "keeps the Web & Apps islands bare for now" becomes a check driven by `DRESSED`: C2 and C3 add their island to the list, and C4 replaces the file with the all-dressed version.

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { WEB_PLAZA_ID, buildLayout } from "@/world/engine/gen/layout";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { ISLANDS } from "./index";
import { FRAMING, tourStopFor } from "./framing";
import { FOOTPRINTS } from "./layouts";

const WEB = [WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm", "pedulipasal"];
/** The Web & Apps islands whose module has landed (C2–C4 add one each; C4 replaces this file). */
const DRESSED = [WEB_PLAZA_ID];

describe("island registry", () => {
  const layout = buildLayout(worldProjects);

  it("holds the hero, the four stars, the Web & Apps plaza and its three minis", () => {
    expect(Object.keys(ISLANDS)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot", ...WEB]);
    for (const [id, m] of Object.entries(ISLANDS)) expect(m.id).toBe(id);
  });

  it("has a module and a tour framing for every island the layout places", () => {
    for (const p of layout.islands) {
      expect(ISLANDS[p.id], p.id).toBeDefined();
      expect(FRAMING[p.id], p.id).toBeDefined();
      expect(ISLANDS[p.id].tourStop(p)).toEqual(tourStopFor(p));
    }
  });

  it("stamps a dressed Web & Apps island's FOOTPRINTS as barriers and keeps the others bare", () => {
    for (const id of WEB) {
      const p = layout.islands.find((i) => i.id === id)!;
      if (!DRESSED.includes(id)) {
        expect(ISLANDS[id].stamp, id).toBeUndefined();
        expect(ISLANDS[id].Component({ placement: p }), id).toBeNull();
        continue;
      }
      const grid = new VoxelGrid();
      ISLANDS[id].stamp?.(grid, p);
      expect(FOOTPRINTS[id].length, id).toBeGreaterThan(0);
      for (const [x, y, z] of FOOTPRINTS[id]) expect(grid.get(p.origin.x + x, p.origin.y + 1 + y, p.origin.z + z), `${id} (${x},${y},${z})`).toBe(blockId("barrier"));
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/islands/shared/text.test.ts src/world/scene/islands/layouts.test.ts src/world/scene/islands/index.test.ts`
Expected: FAIL.
- `text.test.ts`: `TypeError: metaRows is not a function`.
- `layouts.test.ts`: the new constants and the web `FOOTPRINTS` entries don't exist yet (`TypeError: Cannot read properties of undefined`, or a footprint test reporting `web-plaza`).
- `index.test.ts`: the third test fails on `web-plaza` (no `stamp`, no `FOOTPRINTS` entry).

- [ ] **Step 3: `metaRows`**

`src/world/scene/islands/shared/text.ts`: append at the end of the file:
```ts

/**
 * A mini island board's meta rows: the year and the tags joined with " · ", packed greedily into rows of at most
 * `maxChars` (the InfoBoard body limit) so a row never ends on a dangling separator: "2026 · React", "Express · MySQL".
 */
export function metaRows(year: number, tags: readonly string[], maxChars = BODY_CHARS): string[] {
  const rows: string[] = [];
  let current = "";
  for (const item of [String(year), ...tags]) {
    if (!current) current = item;
    else if (current.length + 3 + item.length <= maxChars) current += ` · ${item}`;
    else {
      rows.push(current);
      current = item;
    }
  }
  if (current) rows.push(current);
  return rows;
}
```

- [ ] **Step 4: `scale` on `InfoBoard` and `Signpost`**

`src/world/scene/islands/shared/InfoBoard.tsx`, the doc comment and the props. Old:
```tsx
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
```
New:
```tsx
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
```

The inner group. Old:
```tsx
      <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]}>
```
New:
```tsx
      <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]} scale={scale}>
```

Replace `src/world/scene/islands/shared/Signpost.tsx`. The only changes from Phase 1:
- the `scale` prop and its doc;
- the hitbox centre and size multiplied by `scale`;
- `scale` on the inner group;
- the `Interactable` at `BOARD_Y * scale`, `0.8 * scale` tall.

```tsx
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { WorldText } from "@/world/scene/WorldText";
import { islandFrame, worldTuple } from "./local";
import { PALETTE } from "./props";
import { useHoverLift } from "./useHoverLift";

const POST_H = 2.1;
const BOARD_Y = POST_H - 0.25;
const OFF = "#9b938a";
// Hit area in the sign's local frame: board x -0.85..1.15 plus the arrow tip at 1.27 + 0.36/√2 ≈ 1.53,
// padded to x -1.0..1.6 and z -0.2..0.4 (centre (0.3, 0.1), half extents 1.3 × 0.3).
const HIT_CX = 0.3;
const HIT_CZ = 0.1;
const HIT_HX = 1.3;
const HIT_HZ = 0.3;

/**
 * Arrow signpost that opens a project's real site (or its demo path) in a new tab. Greyed out and inactive while `url`
 * is empty. `scale` shrinks the whole sign about its foot (MINI_SIGN_SCALE on the minis).
 */
export function Signpost({
  id, placement, at, label, url, rotationY = 0, scale = 1,
}: {
  id: string;
  placement: IslandPlacement;
  at: { x: number; z: number };
  label: string;
  url: string | undefined;
  rotationY?: number;
  scale?: number;
}) {
  const enabled = Boolean(url);
  const lift = useHoverLift(id);
  const wood = enabled ? PALETTE.plank[0] : OFF;
  const open = () => {
    if (!url) return;
    playSfx("link");
    window.open(url, "_blank", "noopener,noreferrer");
  };
  // the registry's hitbox is axis-aligned: rotate the local centre by rotationY and cover the rotated footprint
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const hitX = at.x + (HIT_CX * cos + HIT_CZ * sin) * scale;
  const hitZ = at.z + (-HIT_CX * sin + HIT_CZ * cos) * scale;
  const hitW = 2 * (Math.abs(cos) * HIT_HX + Math.abs(sin) * HIT_HZ) * scale;
  const hitD = 2 * (Math.abs(sin) * HIT_HX + Math.abs(cos) * HIT_HZ) * scale;
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]} scale={scale}>
          <mesh position={[0, POST_H / 2, 0]} castShadow>
            <boxGeometry args={[0.16, POST_H, 0.16]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
          <group ref={lift}>
            <mesh position={[0.15, BOARD_Y, 0.1]} castShadow>
              <boxGeometry args={[2.0, 0.5, 0.08]} />
              <meshStandardMaterial color={wood} roughness={0.85} />
            </mesh>
            <mesh position={[1.27, BOARD_Y, 0.1]} rotation={[0, 0, Math.PI / 4]} castShadow>
              <boxGeometry args={[0.36, 0.36, 0.08]} />
              <meshStandardMaterial color={wood} roughness={0.85} />
            </mesh>
            <WorldText text={label} position={[0.12, BOARD_Y, 0.16]} size={0.2} color={enabled ? "#3a2a1c" : "#6e6760"} font="ui" anchorX="center" maxWidth={1.9} />
          </group>
        </group>
      </group>
      <Interactable
        id={id}
        island={placement.id}
        label={label}
        position={worldTuple(placement, hitX, BOARD_Y * scale, hitZ)}
        size={[hitW, 0.8 * scale, hitD]}
        radius={2.4}
        onActivate={open}
        enabled={() => enabled}
      />
    </>
  );
}
```

- [ ] **Step 5: The district layouts and footprints**

`src/world/scene/islands/layouts.ts`, the header comment. Old:
```ts
 * layouts.test.ts checks: inside 78% of the radius, at least 2 blocks from every crossing anchor, and every panel on
 * two posts is closed between its posts up to its top row (boardSpan).
```
New:
```ts
 * layouts.test.ts checks: inside 78% of the radius, at least 2 blocks from every crossing anchor (MINI_ANCHOR_CLEARANCE
 * on the radius-4 minis), and every panel on two posts is closed between its posts up to its top row (boardSpan).
```

A map spot on each star island. `HERO`, old:
```ts
  // integer z: the barrier row (titleCells) holds the letter plane
  title: { x: -1.05, z: -1, cell: 0.12, lines: ["EZRA", "BRILLIANT"] },
} as const;
```
New:
```ts
  // integer z: the barrier row (titleCells) holds the letter plane
  title: { x: -1.05, z: -1, cell: 0.12, lines: ["EZRA", "BRILLIANT"] },
  // behind the title: from the tour camera it shows above "EZRA" and covers no letter (any spot in front of the
  // title hid one); two blocks from the 2022 milestone
  map: { x: -0.4, z: -4.4, ry: 0 },
} as const;
```

`GTID`, old:
```ts
  link: { x: -2.4, z: 5, ry: 0.2 },
} as const;
```
New:
```ts
  link: { x: -2.4, z: 5, ry: 0.2 },
  // between the about board and the price board, low enough to leave the title in view, four blocks from the hero bridge
  map: { x: -2.3, z: 1.5, ry: -0.3 },
} as const;
```

`PETAK`, old:
```ts
  link: { x: 4.6, z: 4, ry: -0.2 },
} as const;
```
New:
```ts
  link: { x: 4.6, z: 4, ry: -0.2 },
  // at the bridge head from GTID, left of the house and clear of the about board in the tour view
  map: { x: -6.8, z: 0, ry: -0.6 },
} as const;
```

`ORBIT`, old:
```ts
  link: { x: 3.4, z: 3.8, ry: -0.25 },
} as const;
```
New:
```ts
  link: { x: 3.4, z: 3.8, ry: -0.25 },
  // left of the minecart station from Petak Umpet, clear of the stall and the about board in the tour view
  map: { x: -6.0, z: 1.0, ry: -0.6 },
} as const;
```

`EZRA`, then the Web & Apps block before `rot`. Old:
```ts
  link: { x: 3.9, z: 4.3, ry: -0.35 },
} as const;

const rot = (dx: number, ry: number) => ({ x: dx * Math.cos(ry), z: -dx * Math.sin(ry) });
```
New:
```ts
  link: { x: 3.9, z: 4.3, ry: -0.35 },
  // beside the bounce pad from Orbit, left of the robot
  map: { x: -5.7, z: -0.5, ry: 0 },
} as const;

/* ---------- Web & Apps district (plaza + three radius-4 minis) ---------- */

/** InfoBoard and Signpost on the radius-4 minis are scaled down whole (posts, panel and text): see shared/InfoBoard.tsx. */
export const MINI_BOARD_SCALE = 0.55;
export const MINI_SIGN_SCALE = 0.8;
/** Map board (shared/MapBoard.tsx): a 480 × 300 map canvas on one post, its face centre MAP_BOARD.y above the grass. */
export const MAP_BOARD = { w: 1.5, h: 0.9375, y: 1.2 } as const;
export const MAP_HALF_SPAN = MAP_BOARD.w / 2 - 0.15;

// The plaza: the minecart from Ezra Bot stops on its west side (station ~(-2, 0)), the bridge to POS Monosuko leaves on
// its east side (~(3.5, 1.5)). The district sign stands at the back facing the tour camera, the map board where the
// cart riders step off.
export const PLAZA = {
  // board 2.6 × 1.1 centred 2.2 above the grass (panel 1.65–2.75), posts at ±(w / 2 − 0.1)
  sign: { x: 0, z: -2.2, ry: -0.3, w: 2.6, h: 1.1, y: 2.2 },
  tree: { x: -2, z: -3, h: 3, seed: 17 },
  lamps: [
    { x: 2.4, z: -1.0 },
    // front right, among the flowers: at (−2, 3) it stood in the map board's phone closeup (the camera backs off ~4 blocks)
    { x: 1.0, z: 3.0 },
  ],
  // decoration only (no footprint)
  flowers: [
    { x: -0.9, z: 2.6, c: "#efe7cf" },
    { x: 1.3, z: 2.4, c: "#e8c9a8" },
    { x: 2.6, z: -2.3, c: "#efe7cf" },
    { x: -2.7, z: -1.6, c: "#d9c37a" },
    { x: 0.4, z: 3.1, c: "#efe7cf" },
  ],
  map: { x: 0, z: 0.25, ry: -0.6 },
} as const;

/**
 * Prop clearance around a bridge anchor on the radius-4 minis (2 everywhere else). Their anchors sit only 3 blocks out
 * (0.75 × radius) and the two bridges cut both sides of the island, so a 2-block ring leaves no room for a building row:
 * 1.75 frees the back and front corners while layouts.test.ts still keeps every rope post clear and a walkway from
 * bridge to bridge. Each mini's `stand` is the free cell Ezra uses the screen from.
 */
export const MINI_ANCHOR_CLEARANCE = 1.75;

// POS Monosuko: the plaza bridge lands on the west (~(-2.8, -1.2)), the bridge to Bee leaves on the east (~(2.9, -0.7)).
// The stall stands at the back: wall row z −2, counter row z −1 (cells x −1..1), the screen on the wall above the counter.
export const MONOSUKO = {
  stall: { x0: -1, x1: 1, wallZ: -2, counterZ: -1, wallRows: 4 },
  screen: { x: 0, y: 3.0, z: -2.12, w: 3.4, h: 2.125 },
  // a tabletop charcoal grill on the counter's right end; smoke rises from it
  grill: { x: 1.05, z: -1.0 },
  logo: { x: 0, y: 5.6, z: -2.3, r: 0.72 },
  table: { x: 0.9, z: 1.9 },
  info: { x: -0.75, z: 2.25, ry: -0.6 },
  link: { x: 0.5, z: -0.45, ry: -0.3 },
  map: { x: -1.75, z: 0.5, ry: 0 },
  stand: { x: 0, z: 0 },
} as const;

// Bee Furniture CRM: the bridge from POS Monosuko lands on the west (~(-2.9, 0.7)), the bridge to PeduliPasal leaves on
// the east-front (~(2.4, 1.8)). The shed (back and left walls, open to the front and right) stands at the back left, the
// monitor on its stand at the front right, in front of the shed's open side.
export const BEE = {
  shed: { x0: -1, x1: 1, z0: -2, z1: -1, rows: 3 },
  bench: { x: -0.4, z: -1.85 },
  logs: { x: -2, z: -1 },
  // the stand's column stands under the screen centre (its cell is (2, 0))
  monitor: { x: 1.8, z: 0 },
  screen: { x: 1.8, y: 2.9, z: 0.15, w: 3.4, h: 2.125 },
  // figure-eight flight over the shed roof (3.2 at the back): centre, half-widths along x / z, bob height
  bee: { x: -0.6, y: 3.6, z: -1.4, ax: 1.2, az: 0.8, ay: 0.25 },
  info: { x: 0, z: 2, ry: -0.6 },
  link: { x: -1.5, z: -0.5, ry: -0.3 },
  map: { x: -1, z: 1, ry: -0.6 },
  stand: { x: 1, z: 0 },
} as const;

// PeduliPasal: one bridge, landing on the west-back (~(-2.4, -1.8)). The pavilion stands at the back right, the phone
// on its plinth in front of it.
export const PEDULI = {
  pavilion: { x0: 0, x1: 2, z0: -2, z1: -1 },
  shelf: { x: 1, z: -2.1, w: 2.6, h: 2.2 },
  scales: { x: 1, z: -1.1 },
  // a stone plinth (x −0.05–1.55, cells 0..1 of row 1) with the phone body standing on it; the screen face sits 0.09
  // in front of the body centre, high enough that the front props stay under it in the tour view
  phone: { x: 0.75, z: 0.9, w: 1.42, h: 2.9, plinth: 0.8 },
  screen: { x: 0.75, y: 2.25, z: 0.99, w: 1.25, h: 2.708 },
  // trunk 4 tall: the crown (4–6 up) clears the pavilion roof (3.2–3.6)
  tree: { x: 3, z: 0, h: 4, seed: 59 },
  // x −1: at −0.75 the board's top corner covered the phone's FAB and chips in the tour view
  info: { x: -1, z: 1.75, ry: -0.3 },
  link: { x: -2.5, z: -0.5, ry: -0.3 },
  map: { x: -2, z: 1, ry: -0.6 },
  stand: { x: 1, z: 2 },
} as const;

const rot = (dx: number, ry: number) => ({ x: dx * Math.cos(ry), z: -dx * Math.sin(ry) });
```

Two footprint helpers. Old:
```ts
const trunk = (t: { x: number; z: number; h: number }): Cell[] => boxCells(t.x, t.x, 0, t.h - 1, t.z, t.z);

export const FOOTPRINTS: Record<string, Cell[]> = {
```
New:
```ts
const trunk = (t: { x: number; z: number; h: number }): Cell[] => boxCells(t.x, t.x, 0, t.h - 1, t.z, t.z);
const mapCells = (m: { x: number; z: number; ry: number }): Cell[] => boardSpan(m, MAP_HALF_SPAN, m.ry, 2);
const miniInfo = (b: { x: number; z: number; ry: number }): Cell[] => boardSpan(b, INFO_HALF_SPAN * MINI_BOARD_SCALE, b.ry, INFO_ROWS);

export const FOOTPRINTS: Record<string, Cell[]> = {
```

The star entries each gain their map cells. Old:
```ts
    ...titleCells(HERO.title),
  ],
```
New:
```ts
    ...titleCells(HERO.title),
    ...mapCells(HERO.map),
  ],
```

Old:
```ts
    ...postCells(GTID.link.x, GTID.link.z),
  ],
```
New:
```ts
    ...postCells(GTID.link.x, GTID.link.z),
    ...mapCells(GTID.map),
  ],
```

Old:
```ts
    ...postCells(PETAK.link.x, PETAK.link.z),
  ],
```
New:
```ts
    ...postCells(PETAK.link.x, PETAK.link.z),
    ...mapCells(PETAK.map),
  ],
```

Old:
```ts
    ...postCells(ORBIT.link.x, ORBIT.link.z),
  ],
```
New:
```ts
    ...postCells(ORBIT.link.x, ORBIT.link.z),
    ...mapCells(ORBIT.map),
  ],
```

The last star entry, then the four Web & Apps entries. Old:
```ts
    ...postCells(EZRA.link.x, EZRA.link.z),
  ],
};
```
New:
```ts
    ...postCells(EZRA.link.x, EZRA.link.z),
    ...mapCells(EZRA.map),
  ],
  "web-plaza": [
    ...boardSpan(PLAZA.sign, PLAZA.sign.w / 2 - 0.1, PLAZA.sign.ry, 3), // the panel spans 1.65–2.75
    ...trunk(PLAZA.tree),
    ...PLAZA.lamps.flatMap((l) => postCells(l.x, l.z)),
    ...mapCells(PLAZA.map),
  ],
  "pos-monosuko": [
    ...boxCells(MONOSUKO.stall.x0, MONOSUKO.stall.x1, 0, MONOSUKO.stall.wallRows - 1, MONOSUKO.stall.wallZ, MONOSUKO.stall.wallZ),
    ...boxCells(MONOSUKO.stall.x0, MONOSUKO.stall.x1, 0, 0, MONOSUKO.stall.counterZ, MONOSUKO.stall.counterZ),
    ...postCells(MONOSUKO.table.x, MONOSUKO.table.z, 1),
    ...miniInfo(MONOSUKO.info),
    ...postCells(MONOSUKO.link.x, MONOSUKO.link.z),
    ...mapCells(MONOSUKO.map),
  ],
  "bee-furniture-crm": [
    ...boxCells(BEE.shed.x0, BEE.shed.x1, 0, BEE.shed.rows - 1, BEE.shed.z0, BEE.shed.z0), // back wall: the bench stands against it
    ...boxCells(BEE.shed.x0, BEE.shed.x0, 0, BEE.shed.rows - 1, BEE.shed.z1, BEE.shed.z1), // left wall's front end
    ...postCells(BEE.shed.x1 + 0.4, BEE.shed.z1 + 0.4, BEE.shed.rows), // front-right roof post
    ...postCells(BEE.logs.x, BEE.logs.z, 1),
    ...postCells(BEE.monitor.x, BEE.monitor.z),
    ...miniInfo(BEE.info),
    ...postCells(BEE.link.x, BEE.link.z),
    ...mapCells(BEE.map),
  ],
  pedulipasal: [
    ...boxCells(PEDULI.pavilion.x0, PEDULI.pavilion.x1, 0, 2, PEDULI.pavilion.z0, PEDULI.pavilion.z0), // the shelf row, back posts at its ends
    ...boxCells(PEDULI.pavilion.x0, PEDULI.pavilion.x0, 0, 2, PEDULI.pavilion.z1, PEDULI.pavilion.z1), // front posts
    ...boxCells(PEDULI.pavilion.x1, PEDULI.pavilion.x1, 0, 2, PEDULI.pavilion.z1, PEDULI.pavilion.z1),
    ...postCells(PEDULI.scales.x, PEDULI.scales.z, 1),
    ...boxCells(0, 1, 0, 3, 1, 1), // the plinth and the phone on it (x −0.05–1.55, 3.7 tall)
    ...trunk(PEDULI.tree),
    ...miniInfo(PEDULI.info),
    ...postCells(PEDULI.link.x, PEDULI.link.z),
    ...mapCells(PEDULI.map),
  ],
};
```

- [ ] **Step 6: Retune the Web & Apps framings**

`src/world/scene/islands/framing.ts`. Old:
```ts
  // Web & Apps: the plaza framed like a small star; the radius-4 minis closer (~12.8 out, ~17° yaw: at the stars' ~10°
  // PeduliPasal's lopsided rim pulls its portrait framing off centre). Starting values until the islands are dressed.
  "web-plaza": { cam: [-4.2, 6.6, 14.4], target: [-1.5, 1.2, -0.8], dwell: 1 },
  "pos-monosuko": { cam: [-4.2, 5.2, 11.2], target: [-0.6, 1.8, -0.6], dwell: 1 },
  "bee-furniture-crm": { cam: [-4.2, 5.2, 11.2], target: [-0.6, 1.8, -0.6], dwell: 1 },
  pedulipasal: { cam: [-4.2, 5.2, 11.2], target: [-0.6, 1.8, -0.6], dwell: 1 },
```
New:
```ts
  // Web & Apps: the same ~17° heading as the starting values (PeduliPasal's lopsided rim needs it for a centred portrait
  // view), ~18° down; the plaza ~14 out, the radius-4 minis ~13 out with the island centred and its screen in view.
  "web-plaza": { cam: [-4.4, 5.7, 12.3], target: [-0.5, 1.4, -0.4], dwell: 1 },
  "pos-monosuko": { cam: [-3.9, 5.8, 11.2], target: [-0.3, 1.8, -0.6], dwell: 1 },
  "bee-furniture-crm": { cam: [-3.8, 5.8, 11.2], target: [-0.2, 1.8, -0.6], dwell: 1 },
  pedulipasal: { cam: [-3.8, 5.8, 11.4], target: [-0.2, 1.8, -0.4], dwell: 1 },
```

- [ ] **Step 7: The plaza island**

Create `src/world/scene/islands/Plaza.tsx`. Its map board comes in C7.

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { worldCopy } from "@/config/portfolio";
import { WorldText } from "@/world/scene/WorldText";
import { PLAZA } from "./layouts";
import { PropBlocks } from "./shared/PropBlocks";
import { islandFrame } from "./shared/local";
import { PALETTE, treeBlocks, type PropBlock } from "./shared/props";

const LANTERN_Y = 1.78;
const LANTERN_GEO = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const LANTERN_MAT = new THREE.MeshStandardMaterial({ color: "#f1dfb0", emissive: "#f3d58e", emissiveIntensity: 0.6, roughness: 0.6 });

/** The district sign (posts, a dark backing and the plank face), the tree, the lamp posts and the flowers: one batch. */
function plazaBlocks(): PropBlock[] {
  const { sign } = PLAZA;
  const out: PropBlock[] = [];
  const along = (s: number) => ({ x: sign.x + Math.cos(sign.ry) * s, z: sign.z - Math.sin(sign.ry) * s });
  for (const s of [-(sign.w / 2 - 0.1), sign.w / 2 - 0.1]) {
    const p = along(s);
    out.push({ x: p.x, y: (sign.y + sign.h / 2) / 2, z: p.z, c: PALETTE.wood, sx: 0.18, sy: sign.y + sign.h / 2, sz: 0.18, ry: sign.ry });
  }
  out.push({ x: sign.x, y: sign.y, z: sign.z, c: PALETTE.woodDark, sx: sign.w + 0.12, sy: sign.h + 0.12, sz: 0.08, ry: sign.ry });
  const face = { x: sign.x + Math.sin(sign.ry) * 0.05, z: sign.z + Math.cos(sign.ry) * 0.05 };
  out.push({ x: face.x, y: sign.y, z: face.z, c: PALETTE.plank[0], sx: sign.w, sy: sign.h, sz: 0.06, ry: sign.ry });
  out.push(...treeBlocks(PLAZA.tree.x, PLAZA.tree.z, PLAZA.tree.h, PLAZA.tree.seed));
  for (const l of PLAZA.lamps) {
    out.push({ x: l.x, y: 0.82, z: l.z, c: PALETTE.wood, sx: 0.16, sy: 1.64, sz: 0.16 });
    out.push({ x: l.x, y: LANTERN_Y + 0.17, z: l.z, c: PALETTE.woodDark, sx: 0.36, sy: 0.06, sz: 0.36 });
  }
  for (const f of PLAZA.flowers) {
    out.push({ x: f.x, y: 0.11, z: f.z, c: PALETTE.leaf[2], sx: 0.05, sy: 0.22, sz: 0.05 });
    out.push({ x: f.x, y: 0.26, z: f.z, c: f.c, sx: 0.2, sy: 0.1, sz: 0.2 });
  }
  return out;
}

/** Both lanterns in one draw call (they glow, so they can't share the props' plain material). */
function Lanterns() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    PLAZA.lamps.forEach((l, i) => mesh.setMatrixAt(i, m.makeTranslation(l.x, LANTERN_Y, l.z)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={ref} args={[LANTERN_GEO, LANTERN_MAT, PLAZA.lamps.length]} />;
}

/**
 * The Web & Apps plaza (spec §3.1): where the minecart from Ezra Bot arrives. A district sign facing the tour camera,
 * a tree, two lamps and flowers; the station itself is drawn by the minecart crossing.
 */
export function PlazaIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(plazaBlocks, []);
  const { sign } = PLAZA;
  const textZ = 0.05 + 0.031;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={505} />
        <Lanterns />
        <group position={[sign.x, 0, sign.z]} rotation={[0, sign.ry, 0]}>
          <WorldText text={worldCopy.webDistrict.toUpperCase()} position={[0, sign.y + 0.12, textZ]} size={0.42} color="#3a2a1c" font="pixel" />
          <WorldText text="Three projects ahead" position={[0, sign.y - 0.33, textZ]} size={0.15} color="#5a4130" font="ui" />
        </group>
      </group>
    </>
  );
}
```

- [ ] **Step 8: Register the plaza**

Replace `src/world/scene/islands/index.ts`. Every island module now comes from one helper, `island` (Part A's `star`, renamed). The three minis stay bare until their task.

```ts
import type { FC } from "react";
import { WEB_PLAZA_ID, type IslandPlacement } from "@/world/engine/gen/layout";
import type { IslandModule } from "./types";
import { FOOTPRINTS } from "./layouts";
import { tourStopFor } from "./framing";
import { stampCells } from "./shared/local";
import { HeroIsland } from "./Hero";
import { GtidIsland } from "./Gtid";
import { PetakUmpetIsland } from "./PetakUmpet";
import { OrbitStoreIsland } from "./OrbitStore";
import { EzraBotIsland } from "./EzraBot";
import { PlazaIsland } from "./Plaza";

/** Every island shares one tour framing (framing.ts) and stamps its FOOTPRINTS cells as barrier collision. */
const island = (id: string, Component: FC<{ placement: IslandPlacement }>): IslandModule => ({
  id,
  Component,
  tourStop: tourStopFor,
  stamp: (grid, p) => stampCells(grid, p, FOOTPRINTS[id]),
});

/** Terrain only: a Web & Apps island before its hand-built module replaces this one (no props, no collision). */
const Bare: FC<{ placement: IslandPlacement }> = () => null;
const bare = (id: string): IslandModule => ({ id, Component: Bare, tourStop: tourStopFor });

/** The island registry: the hero, the four stars, the Web & Apps plaza and its three minis. */
export const ISLANDS: Record<string, IslandModule> = {
  hero: island("hero", HeroIsland),
  gtid: island("gtid", GtidIsland),
  "petak-umpet": island("petak-umpet", PetakUmpetIsland),
  "orbit-store": island("orbit-store", OrbitStoreIsland),
  "ezra-bot": island("ezra-bot", EzraBotIsland),
  [WEB_PLAZA_ID]: island(WEB_PLAZA_ID, PlazaIsland),
  "pos-monosuko": bare("pos-monosuko"),
  "bee-furniture-crm": bare("bee-furniture-crm"),
  pedulipasal: bare("pedulipasal"),
};
```

- [ ] **Step 9: Run the tests, the type check and the linter**

Run: `npx vitest run src/world/scene/islands src/world/scene/tour`
Expected: PASS, `Test Files  19 passed (19)`, `Tests  120 passed (120)`. That includes `layouts.test.ts` 13, `index.test.ts` 3, `text.test.ts` 6, `framing.test.ts` 9 and `tourMotion.test.ts` 19.

Run: `npx tsc -b && npx eslint src/world`
Expected: no output.

- [ ] **Step 10: Look at the plaza**

Run: `npm run build && npm run shots -- 4 5`
Expected: four `shot …` lines (stops 4 and 5, desktop and phone) and no `MISSING`. Open the PNGs and check:
- `stop-5-desktop.png`:
  - the plaza is centred;
  - **WEB & APPS** is readable on the plank sign at the back, with "Three projects ahead" under it;
  - the tree is back left, the two lamps glow, and flowers are on the grass;
  - the minecart station on the west rim and the bridge head on the east rim are clear.
- `stop-5-phone.png`: the same island centred in portrait.
- `stop-4-*`: Ezra Bot looks as before; its map board comes in C7.

- [ ] **Step 11: Commit**

```bash
git add src/world/scene/islands/layouts.ts src/world/scene/islands/layouts.test.ts src/world/scene/islands/shared/InfoBoard.tsx src/world/scene/islands/shared/Signpost.tsx src/world/scene/islands/shared/text.ts src/world/scene/islands/shared/text.test.ts src/world/scene/islands/framing.ts src/world/scene/islands/Plaza.tsx src/world/scene/islands/index.ts src/world/scene/islands/index.test.ts
git commit -q -F - <<'EOF'
feat(world): Web & Apps plaza, district layouts and footprint rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task C2: POS Monosuko island

**Files:**
- Create: `src/world/scene/islands/PosMonosuko.tsx`
- Modify: `src/world/scene/islands/index.ts`, `src/world/scene/islands/index.test.ts`, `src/world/scene/Ezra.tsx`, `src/world/scene/World.tsx`

**Interfaces:**
- Consumes:
  - `MONOSUKO`, `MINI_BOARD_SCALE`, `MINI_SIGN_SCALE` (C1), `metaRows` (C1), `projectById` (Part A);
  - `LiveScreen` and `posApp` (Part B; the logo at `/world/monosuko/logo.webp` is Part B's asset);
  - `openCloseup` (`scene/closeupState.ts`, Part B); `runtime.closeup` (Part B).
- Produces: `PosMonosukoIsland`; the screen's closeup id `pos-monosuko-screen`; the sign's id `pos-monosuko-link`; the `?closeup=<id>` deep link.

The stall:
- a stone floor, a plank back wall (row z −2) and a counter (row z −1);
- four posts carrying a six-stripe awning in POS green and off-white;
- the restaurant's round badge on a post above the awning;
- a tabletop charcoal grill with three chicken pieces at the counter's right end, its smoke a few thin wisps beside the screen;
- a table with two stools in front.

The screen hangs on the back wall above the counter at y 3.0, high enough that the smoke and the counter stay under it. The board shows the project line and the meta rows. The demo link is empty in the config, so "Try the POS" is greyed and inactive (spec §2).

- [ ] **Step 1: Make the registry test expect POS Monosuko dressed**

`src/world/scene/islands/index.test.ts`. Old:
```ts
const DRESSED = [WEB_PLAZA_ID];
```
New:
```ts
const DRESSED = [WEB_PLAZA_ID, "pos-monosuko"];
```

Run: `npx vitest run src/world/scene/islands/index.test.ts`
Expected: FAIL in the third test: `pos-monosuko (…)` reports a cell that is not a barrier (the bare module stamps nothing).

- [ ] **Step 2: The island module**

Create `src/world/scene/islands/PosMonosuko.tsx`. Its map board comes in C7.

```tsx
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { posApp } from "@/world/scene/screens/pos";
import { MINI_BOARD_SCALE, MINI_SIGN_SCALE, MONOSUKO } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { PALETTE, type PropBlock } from "./shared/props";
import { projectById } from "./shared/project";
import { metaRows } from "./shared/text";

const POS_GREEN = "#1f7a4d";
const AWNING_WHITE = "#efede6";
const GRILL_TOP = 1.36; // chicken pieces on the grate, on the counter top (1.0)

/** Stone floor, plank back wall, posts, counter, the green-and-white awning, the grill, the logo post, table and stools. */
function stallBlocks(): PropBlock[] {
  const { stall, grill, logo, table } = MONOSUKO;
  const out: PropBlock[] = [];
  for (let x = stall.x0; x <= stall.x1; x++) for (let z = stall.wallZ; z <= stall.counterZ + 1; z++) {
    out.push({ x, y: 0.06, z, c: PALETTE.stone[0], sy: 0.12 });
  }
  for (let x = stall.x0; x <= stall.x1; x++) for (let row = 0; row < stall.wallRows; row++) {
    out.push({ x, y: row + 0.5, z: stall.wallZ - 0.3, c: PALETTE.plank[0], sz: 0.2 });
  }
  for (const x of [stall.x0 - 0.4, stall.x1 + 0.4]) for (const z of [stall.wallZ - 0.3, stall.counterZ + 0.4]) {
    out.push({ x, y: 2.2, z, c: PALETTE.wood, sx: 0.2, sy: 4.4, sz: 0.2 });
  }
  out.push({ x: 0, y: 0.44, z: stall.counterZ + 0.05, c: PALETTE.plank[1], sx: 3.0, sy: 0.88, sz: 0.7 }); // counter
  out.push({ x: 0, y: 0.94, z: stall.counterZ + 0.05, c: PALETTE.wood, sx: 3.3, sy: 0.12, sz: 0.9 }); // counter top
  for (let i = 0; i < 6; i++) {
    out.push({ x: -1.5 + i * 0.6, y: 4.5, z: -1.2, c: i % 2 ? AWNING_WHITE : POS_GREEN, sx: 0.6, sy: 0.1, sz: 2.8, rx: 0.16 });
  }
  // a tabletop charcoal grill with chicken pieces on the counter's right end
  out.push({ x: grill.x, y: 1.15, z: grill.z, c: "#4a4d52", sx: 0.7, sy: 0.3, sz: 0.45 });
  out.push({ x: grill.x, y: 1.31, z: grill.z, c: "#2b2d30", sx: 0.62, sy: 0.03, sz: 0.38 });
  for (const [dx, dz] of [[-0.18, -0.06], [0.02, 0.06], [0.2, -0.04]] as const) {
    out.push({ x: grill.x + dx, y: GRILL_TOP, z: grill.z + dz, c: "#8a4a22", sx: 0.18, sy: 0.08, sz: 0.12 });
  }
  out.push({ x: logo.x, y: logo.y - 0.65, z: logo.z - 0.12, c: PALETTE.wood, sx: 0.14, sy: 0.7, sz: 0.14 }); // logo post, behind the badge
  out.push({ x: table.x, y: 0.6, z: table.z, c: PALETTE.plank[0], sx: 1.0, sy: 0.08, sz: 0.7 });
  out.push({ x: table.x, y: 0.28, z: table.z, c: PALETTE.wood, sx: 0.12, sy: 0.56, sz: 0.12 });
  for (const dx of [-0.75, 0.75]) {
    out.push({ x: table.x + dx, y: 0.4, z: table.z, c: PALETTE.wood, sx: 0.36, sy: 0.08, sz: 0.36 });
    out.push({ x: table.x + dx, y: 0.18, z: table.z, c: PALETTE.woodDark, sx: 0.1, sy: 0.36, sz: 0.1 });
  }
  return out;
}

const LOGO_URL = "/world/monosuko/logo.webp";
const DISC_GEO = new THREE.CylinderGeometry(MONOSUKO.logo.r, MONOSUKO.logo.r, 0.12, 40);
const DISC_MAT = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });

/** The restaurant's round badge on its post above the awning (the logo Part B ships for the POS screen). */
function LogoBadge() {
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(LOGO_URL);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const { x, y, z, r } = MONOSUKO.logo;
  return (
    <group position={[x, y, z]}>
      <mesh geometry={DISC_GEO} material={DISC_MAT} rotation={[Math.PI / 2, 0, 0]} castShadow />
      {/* logo.webp is transparent around the drawing (WebP keeps junk colours under alpha 0): a cream face, the logo alpha-tested on it */}
      <mesh position={[0, 0, 0.062]}>
        <circleGeometry args={[r - 0.08, 40]} />
        <meshStandardMaterial color="#f7f1e3" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.066]}>
        <circleGeometry args={[r - 0.08, 40]} />
        <meshStandardMaterial map={texture} roughness={0.8} alphaTest={0.35} />
      </mesh>
    </group>
  );
}

const PUFFS = 7;
const PUFF_GEO = new THREE.BoxGeometry(1, 1, 1);
const PUFF_MAT = new THREE.MeshStandardMaterial({ color: "#e9e6e0", roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });

/** Wisps of smoke off the grill: seven small puffs in one instanced draw, rising under the screen and drifting right as they fade. */
function Smoke() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    // reduced motion: the puffs hold still mid-rise
    const t = useWorld.getState().reducedMotion ? 0.4 : clock.elapsedTime;
    const { x, z } = MONOSUKO.grill;
    for (let i = 0; i < PUFFS; i++) {
      const o = i / PUFFS;
      const k = (t * 0.35 + o) % 1;
      tmp.p.set(x + k * 0.45 + Math.sin(k * 7 + o * 9) * 0.08, GRILL_TOP + 0.08 + k * 0.7, z + 0.1 + k * 0.25);
      tmp.s.setScalar((0.08 + k * 0.14) * Math.min(1, (1 - k) * 4));
      mesh.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[PUFF_GEO, PUFF_MAT, PUFFS]} frustumCulled={false} />;
}

/**
 * POS Monosuko (spec §4): a small grilled-chicken stall with the POS cashier screen on its back wall above the counter,
 * the restaurant's badge over the awning, smoke off the grill, a table with two stools, the board and the demo sign
 * (inactive until the demo ships).
 */
export function PosMonosukoIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(stallBlocks, []);
  const project = projectById("pos-monosuko");
  const { screen } = MONOSUKO;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={606} />
        <LogoBadge />
        <Smoke />
      </group>
      <LiveScreen
        id="pos-monosuko-screen"
        placement={placement}
        app={posApp}
        label="Use the POS"
        at={{ x: screen.x, y: screen.y, z: screen.z }}
        size={{ w: screen.w, h: screen.h }}
      />
      <InfoBoard
        placement={placement}
        at={MONOSUKO.info}
        rotationY={MONOSUKO.info.ry}
        scale={MINI_BOARD_SCALE}
        title={project.title}
        lines={[project.line, ...metaRows(project.year, project.tags)]}
      />
      <Signpost id="pos-monosuko-link" placement={placement} at={MONOSUKO.link} rotationY={MONOSUKO.link.ry} scale={MINI_SIGN_SCALE} label="Try the POS" url={project.links.demo} />
    </>
  );
}
```

- [ ] **Step 3: Register it**

`src/world/scene/islands/index.ts`, the import. Old:
```ts
import { PlazaIsland } from "./Plaza";
```
New:
```ts
import { PlazaIsland } from "./Plaza";
import { PosMonosukoIsland } from "./PosMonosuko";
```

The entry. Old:
```ts
  "pos-monosuko": bare("pos-monosuko"),
```
New:
```ts
  "pos-monosuko": island("pos-monosuko", PosMonosukoIsland),
```

- [ ] **Step 4: Hide Ezra while a closeup is open**

He stands about two blocks from the screen in Play and would block a low screen in the closeup (Part B's note to Part C). `src/world/scene/Ezra.tsx`, in the frame callback. Old:
```tsx
    if (!armL.current || !armR.current || !head.current) return;
    const p = runtime.player;
```
New:
```tsx
    if (!armL.current || !armR.current || !head.current) return;
    // in a closeup he would stand in front of a low screen
    if (runtime.closeup !== null) {
      root.current.visible = false;
      return;
    }
    const p = runtime.player;
```

When the closeup ends, the existing camera-distance check below makes him visible again on the next frame: the camera is farther than `SHOW_FAR`.

- [ ] **Step 5: The `?closeup=<id>` deep link**

The screenshots in this part and C8 open a screen's closeup straight from the URL. `src/world/scene/World.tsx`, the import. Old:
```tsx
import { ParticlesRenderer } from "./ParticlesRenderer";
```
New:
```tsx
import { ParticlesRenderer } from "./ParticlesRenderer";
import { openCloseup } from "./closeupState";
```

After the `?burst` effect. Old:
```tsx
    return () => window.clearInterval(id);
  }, []);
```
New:
```tsx
    return () => window.clearInterval(id);
  }, []);

  // ?closeup=<screen id> debug hook (screenshots): open that screen's closeup once it has registered and the world is ready
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("closeup");
    if (!id) return;
    let raf = 0;
    const tick = () => {
      if (useWorld.getState().ready && runtime.closeups.has(id)) openCloseup(id);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
```

- [ ] **Step 6: Run the tests, the type check and the linter**

Run: `npx vitest run src/world/scene/islands`
Expected: PASS, `Test Files  16 passed (16)`, `Tests  87 passed (87)`.

Run: `npx tsc -b && npx eslint src/world`
Expected: no output.

- [ ] **Step 7: Look at the island and its screen**

Run:
```bash
npm run build && npm run shots -- 6
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=6&closeup=pos-monosuko-screen" shots/c2-pos-closeup.png 1280x720
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=6&closeup=pos-monosuko-screen" shots/c2-pos-closeup-phone.png 520x940
```
(`SHOT_SETTLE_MS=25000` on every closeup shot: SwiftShader renders a few frames per second and `CloseupCamera` clamps each frame's step to 1/30 s, so the 0.8 s glide takes many seconds of real time: about 8 s on the minis and over 15 s on Petak Umpet, the heaviest view; at the default 2.5 s the shot catches it barely started.)

Expected: `shot …` lines and no `MISSING`. Check:
- `.shots/stop-6-desktop.png`:
  - the island is centred, and the stall stands at the back with the green and white awning and the round Monosuko badge above it;
  - the POS screen is whole on the back wall: Part B's cashier UI, its idle demo running;
  - thin smoke rises from the grill at the counter's right end, beside the screen, not over it;
  - the table and stools are in front; the small board front left reads "POS Monosuko", the line, "2026 · React" and "Express · MySQL";
  - the greyed "Try the POS" sign stands in front of the counter;
  - both bridge heads are clear.
- `stop-6-phone.png`: the same island centred in portrait.
- The two closeup shots: the POS screen sits below the HUD and fills 85 % of the frame under it. On the phone it fills that height and shows its middle, the rest reached by a sideways swipe. No prop is in front of it (the near plane clips the awning posts) and Ezra is not drawn.

- [ ] **Step 8: Commit**

```bash
git add src/world/scene/islands/PosMonosuko.tsx src/world/scene/islands/index.ts src/world/scene/islands/index.test.ts src/world/scene/Ezra.tsx src/world/scene/World.tsx
git commit -q -F - <<'EOF'
feat(world): POS Monosuko island with its live POS screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task C3: Bee Furniture CRM island

**Files:**
- Create: `src/world/scene/islands/BeeCrm.tsx`
- Modify: `src/world/scene/islands/index.ts`, `src/world/scene/islands/index.test.ts`

**Interfaces:**
- Consumes: `BEE`, `MINI_BOARD_SCALE`, `MINI_SIGN_SCALE`, `metaRows` (C1); `LiveScreen`, `crmApp` (Part B).
- Produces: `BeeCrmIsland`; closeup id `bee-crm-screen`; sign id `bee-crm-link`.

The shed:
- a plank floor, a back wall and a left wall, posts, and a five-plank roof sloping down to the front;
- inside: a workbench against the back wall with a half-built chair and a hand saw;
- outside: three logs to the left.

The CRM dashboard stands on a dark monitor column at the front right, in front of the shed's open side. A small bee flies figure-eights over the roof, its wings flapping (frozen under reduced motion). The demo link is empty, so "Try the CRM" is greyed.

- [ ] **Step 1: Make the registry test expect Bee dressed**

`src/world/scene/islands/index.test.ts`. Old:
```ts
const DRESSED = [WEB_PLAZA_ID, "pos-monosuko"];
```
New:
```ts
const DRESSED = [WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm"];
```

Run: `npx vitest run src/world/scene/islands/index.test.ts`
Expected: FAIL in the third test on `bee-furniture-crm (…)`.

- [ ] **Step 2: The island module**

Create `src/world/scene/islands/BeeCrm.tsx`. Its map board comes in C7.

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { crmApp } from "@/world/scene/screens/crm";
import { BEE, MINI_BOARD_SCALE, MINI_SIGN_SCALE } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { PALETTE, type PropBlock } from "./shared/props";
import { projectById } from "./shared/project";
import { metaRows } from "./shared/text";

const CHAIR = "#c79a62";
const CHAIR_DARK = "#a87b4c";
const STAND = "#2b2e33";

/** Plank floor, back and left walls, posts, the sloped roof, the workbench with a half-built chair and a saw, the logs, the monitor stand. */
function shedBlocks(): PropBlock[] {
  const { shed, bench, logs, monitor, screen } = BEE;
  const out: PropBlock[] = [];
  for (let x = shed.x0; x <= shed.x1; x++) for (let z = shed.z0; z <= shed.z1; z++) out.push({ x, y: 0.06, z, c: PALETTE.plank[1], sy: 0.12 });
  for (let x = shed.x0; x <= shed.x1; x++) for (let row = 0; row < shed.rows; row++) {
    out.push({ x, y: row + 0.5, z: shed.z0 - 0.35, c: PALETTE.plank[0], sz: 0.2 }); // back wall
  }
  for (let z = shed.z0; z <= shed.z1; z++) for (let row = 0; row < shed.rows; row++) {
    out.push({ x: shed.x0 - 0.35, y: row + 0.5, z, c: PALETTE.plank[0], sx: 0.2 }); // left wall
  }
  out.push({ x: shed.x1 + 0.4, y: 1.55, z: shed.z0 - 0.35, c: PALETTE.wood, sx: 0.2, sy: 3.1, sz: 0.2 });
  out.push({ x: shed.x0 - 0.4, y: 1.35, z: shed.z1 + 0.4, c: PALETTE.wood, sx: 0.2, sy: 2.7, sz: 0.2 });
  out.push({ x: shed.x1 + 0.4, y: 1.35, z: shed.z1 + 0.4, c: PALETTE.wood, sx: 0.2, sy: 2.7, sz: 0.2 });
  for (let i = 0; i < 5; i++) {
    out.push({ x: 0, y: 3.2 - i * 0.12, z: shed.z0 - 0.5 + i * 0.5, c: PALETTE.roof[i % 3], sx: 3.4, sy: 0.16, sz: 0.55, rx: 0.2 });
  }
  // workbench against the back wall
  out.push({ x: bench.x, y: 0.86, z: bench.z, c: PALETTE.plank[0], sx: 1.8, sy: 0.12, sz: 0.7 });
  for (const dx of [-0.8, 0.8]) for (const dz of [-0.25, 0.25]) out.push({ x: bench.x + dx, y: 0.4, z: bench.z + dz, c: PALETTE.wood, sx: 0.1, sy: 0.8, sz: 0.1 });
  // a half-built chair on it: seat, legs, two back posts and one rail (the second rail still missing)
  const cx = bench.x - 0.35;
  out.push({ x: cx, y: 1.08, z: bench.z, c: CHAIR, sx: 0.5, sy: 0.06, sz: 0.46 });
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.18, 0.18]) out.push({ x: cx + dx, y: 0.98, z: bench.z + dz, c: CHAIR_DARK, sx: 0.06, sy: 0.2, sz: 0.06 });
  for (const dx of [-0.2, 0.2]) out.push({ x: cx + dx, y: 1.36, z: bench.z - 0.2, c: CHAIR_DARK, sx: 0.06, sy: 0.5, sz: 0.06 });
  out.push({ x: cx, y: 1.5, z: bench.z - 0.2, c: CHAIR, sx: 0.5, sy: 0.08, sz: 0.05 });
  // hand saw: blade and handle
  out.push({ x: bench.x + 0.5, y: 0.94, z: bench.z + 0.1, c: "#9aa0a6", sx: 0.6, sy: 0.03, sz: 0.16, ry: 0.3 });
  out.push({ x: bench.x + 0.17, y: 0.95, z: bench.z + 0.2, c: PALETTE.wood, sx: 0.14, sy: 0.05, sz: 0.1, ry: 0.3 });
  // log pile outside the left wall
  for (const [dx, y] of [[-0.18, 0.19], [0.18, 0.19], [0, 0.53]] as const) {
    out.push({ x: logs.x + dx, y, z: logs.z, c: dx === 0 ? "#86643f" : "#7a5a3c", sx: 0.36, sy: 0.36, sz: 0.9 });
  }
  // monitor stand: base and column up to the screen's bezel
  const bottom = screen.y - screen.h / 2;
  out.push({ x: monitor.x, y: 0.06, z: monitor.z, c: STAND, sx: 0.9, sy: 0.12, sz: 0.5 });
  out.push({ x: monitor.x, y: bottom / 2, z: screen.z - 0.2, c: STAND, sx: 0.14, sy: bottom, sz: 0.14 });
  return out;
}

const BEE_BODY = (() => {
  const c = new THREE.Color();
  const parts = (
    [
      [0.24, 0.17, 0.17, 0, 0, "#e3b23c"],
      [0.04, 0.18, 0.18, -0.04, 0, "#2b2420"],
      [0.04, 0.18, 0.18, 0.06, 0, "#2b2420"],
    ] as const
  ).map(([w, h, d, x, y, colour]) => {
    const g = new THREE.BoxGeometry(w, h, d).translate(x, y, 0);
    c.set(colour);
    const n = g.attributes.position.count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return g;
  });
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  if (!merged) throw new Error("BeeCrm: could not merge the bee");
  return merged;
})();
const BEE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
const WINGS = (() => {
  const a = new THREE.PlaneGeometry(0.14, 0.2).rotateX(Math.PI / 2).translate(0, 0.1, 0.1);
  const b = new THREE.PlaneGeometry(0.14, 0.2).rotateX(Math.PI / 2).translate(0, 0.1, -0.1);
  const merged = mergeGeometries([a, b]);
  a.dispose();
  b.dispose();
  if (!merged) throw new Error("BeeCrm: could not merge the wings");
  return merged;
})();
const WING_MAT = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.75, roughness: 0.4, side: THREE.DoubleSide });

/** The bee: a figure-eight in front of the shed, wings beating (held still under reduced motion). */
function BuzzingBee() {
  const bug = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const g = bug.current;
    if (!g || !wings.current) return;
    const t = useWorld.getState().reducedMotion ? 1.2 : clock.elapsedTime;
    const { x, y, z, ax, az, ay } = BEE.bee;
    g.position.set(x + Math.sin(t * 0.9) * ax, y + Math.sin(t * 2.1) * ay, z + Math.sin(t * 1.8) * az);
    g.rotation.y = -Math.atan2(Math.cos(t * 1.8) * 1.8 * az, Math.cos(t * 0.9) * 0.9 * ax);
    wings.current.scale.z = 0.4 + 0.6 * Math.abs(Math.sin(t * 60));
  });
  return (
    <group ref={bug}>
      <mesh geometry={BEE_BODY} material={BEE_MAT} />
      <mesh ref={wings} geometry={WINGS} material={WING_MAT} />
    </group>
  );
}

/**
 * Bee Furniture CRM (spec §4): a woodworking shed (workbench with a half-built chair and a saw, logs), the CRM admin
 * dashboard on a monitor stand in front of its open side, a bee buzzing about, the board and the demo sign (inactive
 * until the demo ships).
 */
export function BeeCrmIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(shedBlocks, []);
  const project = projectById("bee-furniture-crm");
  const { screen } = BEE;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={707} />
        <BuzzingBee />
      </group>
      <LiveScreen
        id="bee-crm-screen"
        placement={placement}
        app={crmApp}
        label="Use the CRM"
        at={{ x: screen.x, y: screen.y, z: screen.z }}
        size={{ w: screen.w, h: screen.h }}
        bezelColor="#1d2024"
      />
      <InfoBoard
        placement={placement}
        at={BEE.info}
        rotationY={BEE.info.ry}
        scale={MINI_BOARD_SCALE}
        title={project.title}
        lines={[project.line, ...metaRows(project.year, project.tags)]}
      />
      <Signpost id="bee-crm-link" placement={placement} at={BEE.link} rotationY={BEE.link.ry} scale={MINI_SIGN_SCALE} label="Try the CRM" url={project.links.demo} />
    </>
  );
}
```

- [ ] **Step 3: Register it**

`src/world/scene/islands/index.ts`, the import. Old:
```ts
import { PosMonosukoIsland } from "./PosMonosuko";
```
New:
```ts
import { PosMonosukoIsland } from "./PosMonosuko";
import { BeeCrmIsland } from "./BeeCrm";
```

The entry. Old:
```ts
  "bee-furniture-crm": bare("bee-furniture-crm"),
```
New:
```ts
  "bee-furniture-crm": island("bee-furniture-crm", BeeCrmIsland),
```

- [ ] **Step 4: Run the tests, the type check and the linter**

Run: `npx vitest run src/world/scene/islands`
Expected: PASS, `Test Files  16 passed (16)`, `Tests  87 passed (87)`.

Run: `npx tsc -b && npx eslint src/world`
Expected: no output.

- [ ] **Step 5: Look at the island and its screen**

Run:
```bash
npm run build && npm run shots -- 7
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=7&closeup=bee-crm-screen" shots/c3-bee-closeup.png 1280x720
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=7&closeup=bee-crm-screen" shots/c3-bee-closeup-phone.png 520x940
```
(`SHOT_SETTLE_MS=25000` gives the closeup glide time to finish under SwiftShader: see C2 Step 7.)

Check:
- `.shots/stop-7-desktop.png`:
  - the shed is back left with the bench, the half-built chair and the saw visible under the roof, and logs to its left;
  - the CRM dashboard stands whole on its column at the front right;
  - the bee is over the roof;
  - the small board front centre reads "Bee Furniture CRM", the line, "2025 · React" and "PostgreSQL";
  - the greyed "Try the CRM" sign is left; nothing is on the bridge heads.
- `stop-7-phone.png`: the same island centred.
- The closeups: the dashboard sits below the HUD and fills the frame under it (on the phone by its height, panned), and Ezra is not drawn.

- [ ] **Step 6: Commit**

```bash
git add src/world/scene/islands/BeeCrm.tsx src/world/scene/islands/index.ts src/world/scene/islands/index.test.ts
git commit -q -F - <<'EOF'
feat(world): Bee Furniture CRM island with its live dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task C4: PeduliPasal island; the registry's final form

**Files:**
- Create: `src/world/scene/islands/PeduliPasal.tsx`
- Replace: `src/world/scene/islands/index.ts`, `src/world/scene/islands/index.test.ts`

**Interfaces:**
- Consumes: `PEDULI`, `MINI_BOARD_SCALE`, `MINI_SIGN_SCALE`, `metaRows` (C1); `LiveScreen`, `chatApp` (Part B).
- Produces: `PeduliPasalIsland`; closeup id `pedulipasal-screen`; sign id `pedulipasal-link`; `ISLANDS` without the bare helper.

The reading pavilion:
- a stone floor, four posts and a flat two-slab roof;
- a shelf of statute books (spine colours from a seeded random);
- the scales of justice on a small table, tilting gently (frozen under reduced motion);
- a tree on the east side.

In front, a giant phone (a rounded dark body) stands on a stone plinth, its screen the app's chat (`frame="none"`: the phone body is the frame). "Get the APK" opens the GitHub release, which is a real link, so the sign is active.

- [ ] **Step 1: The final registry test**

Replace `src/world/scene/islands/index.test.ts`. All four Web & Apps islands are now dressed, each with a component of its own:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { WEB_PLAZA_ID, buildLayout } from "@/world/engine/gen/layout";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { ISLANDS } from "./index";
import { FRAMING, tourStopFor } from "./framing";
import { FOOTPRINTS } from "./layouts";

const WEB = [WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm", "pedulipasal"];

describe("island registry", () => {
  const layout = buildLayout(worldProjects);

  it("holds the hero, the four stars, the Web & Apps plaza and its three minis", () => {
    expect(Object.keys(ISLANDS)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot", ...WEB]);
    for (const [id, m] of Object.entries(ISLANDS)) expect(m.id).toBe(id);
  });

  it("has a module and a tour framing for every island the layout places", () => {
    for (const p of layout.islands) {
      expect(ISLANDS[p.id], p.id).toBeDefined();
      expect(FRAMING[p.id], p.id).toBeDefined();
      expect(ISLANDS[p.id].tourStop(p)).toEqual(tourStopFor(p));
    }
  });

  it("dresses the Web & Apps islands: a component of their own and their FOOTPRINTS stamped as barriers", () => {
    for (const id of WEB) {
      const p = layout.islands.find((i) => i.id === id)!;
      const grid = new VoxelGrid();
      ISLANDS[id].stamp?.(grid, p);
      expect(FOOTPRINTS[id].length, id).toBeGreaterThan(0);
      for (const [x, y, z] of FOOTPRINTS[id]) expect(grid.get(p.origin.x + x, p.origin.y + 1 + y, p.origin.z + z), `${id} (${x},${y},${z})`).toBe(blockId("barrier"));
    }
    const components = WEB.map((id) => ISLANDS[id].Component);
    expect(new Set(components).size).toBe(WEB.length);
  });
});
```

Run: `npx vitest run src/world/scene/islands/index.test.ts`
Expected: FAIL in the third test on `pedulipasal (…)`.

- [ ] **Step 2: The island module**

Create `src/world/scene/islands/PeduliPasal.tsx`. Its map board comes in C7.

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { chatApp } from "@/world/scene/screens/chat";
import { MINI_BOARD_SCALE, MINI_SIGN_SCALE, PEDULI } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { PALETTE, treeBlocks, type PropBlock } from "./shared/props";
import { projectById } from "./shared/project";
import { metaRows } from "./shared/text";

const SPINES = ["#7a3b34", "#2f4a6b", "#4f6b45", "#8a6a3a", "#5b4a6b", "#a8a296", "#6b3a2e", "#3f5a73"];
const BRASS = "#b8975a";
const SCALES_Y = 1.26; // the beam's pivot above the grass, on its post

/** Stone floor, four posts, the flat roof, the bookshelf of statute books, the scales' table and post, the plinth, the tree. */
function pavilionBlocks(): PropBlock[] {
  const { pavilion, shelf, scales, phone, tree } = PEDULI;
  const out: PropBlock[] = [];
  for (let x = pavilion.x0; x <= pavilion.x1; x++) for (let z = pavilion.z0; z <= pavilion.z1; z++) {
    out.push({ x, y: 0.06, z, c: PALETTE.stone[1], sy: 0.12 });
  }
  for (const x of [pavilion.x0 - 0.4, pavilion.x1 + 0.4]) for (const z of [pavilion.z0 - 0.4, pavilion.z1 + 0.4]) {
    out.push({ x, y: 1.6, z, c: PALETTE.wood, sx: 0.2, sy: 3.2, sz: 0.2 });
  }
  const cx = (pavilion.x0 + pavilion.x1) / 2;
  const cz = (pavilion.z0 + pavilion.z1) / 2;
  out.push({ x: cx, y: 3.31, z: cz, c: "#6f6157", sx: 3.6, sy: 0.22, sz: 2.6 });
  out.push({ x: cx, y: 3.52, z: cz, c: "#83756a", sx: 3.0, sy: 0.2, sz: 2.0 });
  out.push({ x: shelf.x, y: shelf.h / 2, z: shelf.z, c: PALETTE.wood, sx: shelf.w, sy: shelf.h, sz: 0.5 });
  const r = mulberry32(88);
  for (let s = 0; s < 3; s++) {
    let x = shelf.x - shelf.w / 2 + 0.1;
    while (x < shelf.x + shelf.w / 2 - 0.25) {
      const w = 0.12 + r() * 0.1;
      const h = 0.42 + r() * 0.16;
      out.push({ x: x + w / 2, y: 0.3 + s * 0.68 + h / 2, z: shelf.z + 0.12, c: SPINES[Math.floor(r() * SPINES.length)], sx: w, sy: h, sz: 0.32 });
      x += w + 0.02;
    }
  }
  out.push({ x: scales.x, y: 0.55, z: scales.z, c: PALETTE.plank[0], sx: 0.9, sy: 0.1, sz: 0.7 });
  out.push({ x: scales.x, y: 0.25, z: scales.z, c: PALETTE.wood, sx: 0.12, sy: 0.5, sz: 0.12 });
  out.push({ x: scales.x, y: 0.62, z: scales.z, c: BRASS, sx: 0.3, sy: 0.05, sz: 0.2 });
  out.push({ x: scales.x, y: (0.62 + SCALES_Y) / 2, z: scales.z, c: BRASS, sx: 0.06, sy: SCALES_Y - 0.62, sz: 0.06 });
  out.push({ x: phone.x, y: phone.plinth / 2, z: phone.z, c: PALETTE.stone[0], sx: 1.6, sy: phone.plinth, sz: 0.9 });
  out.push(...treeBlocks(tree.x, tree.z, tree.h, tree.seed));
  return out;
}

const BRASS_MAT = new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.4, metalness: 0.5 });
const BEAM_GEO = new THREE.BoxGeometry(0.7, 0.04, 0.04);
const PAN_GEO = new THREE.BoxGeometry(0.22, 0.03, 0.22);
const CORD_GEO = new THREE.BoxGeometry(0.02, 0.22, 0.02);

/** The scales of justice: the beam tilts gently, the pans stay level (still under reduced motion). */
function Scales() {
  const beam = useRef<THREE.Group>(null);
  const pans = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const a = useWorld.getState().reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.8) * 0.12;
    if (beam.current) beam.current.rotation.z = a;
    for (const p of pans.current) if (p) p.rotation.z = -a;
  });
  const { x, z } = PEDULI.scales;
  return (
    <group ref={beam} position={[x, SCALES_Y, z]}>
      <mesh geometry={BEAM_GEO} material={BRASS_MAT} />
      {[-0.33, 0.33].map((px, i) => (
        <group key={px} position={[px, 0, 0]} ref={(g) => { pans.current[i] = g; }}>
          <mesh geometry={CORD_GEO} material={BRASS_MAT} position={[0, -0.11, 0]} />
          <mesh geometry={PAN_GEO} material={BRASS_MAT} position={[0, -0.23, 0]} />
        </group>
      ))}
    </group>
  );
}

const PHONE_GEO = new RoundedBoxGeometry(PEDULI.phone.w, PEDULI.phone.h, 0.16, 3, 0.14);
const PHONE_MAT = new THREE.MeshStandardMaterial({ color: "#1b1c20", roughness: 0.45 });

/**
 * PeduliPasal (spec §4): a reading pavilion with a shelf of statute books and the scales of justice, a giant phone on a
 * stone plinth whose screen is the app's chat, a tree, the board and the "Get the APK" sign.
 */
export function PeduliPasalIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(pavilionBlocks, []);
  const project = projectById("pedulipasal");
  const { phone, screen } = PEDULI;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={808} />
        <Scales />
        <mesh geometry={PHONE_GEO} material={PHONE_MAT} position={[phone.x, phone.plinth + phone.h / 2, phone.z]} castShadow />
      </group>
      <LiveScreen
        id="pedulipasal-screen"
        placement={placement}
        app={chatApp}
        label="Use the app"
        at={{ x: screen.x, y: screen.y, z: screen.z }}
        size={{ w: screen.w, h: screen.h }}
        frame="none"
      />
      <InfoBoard
        placement={placement}
        at={PEDULI.info}
        rotationY={PEDULI.info.ry}
        scale={MINI_BOARD_SCALE}
        title={project.title}
        lines={[project.line, ...metaRows(project.year, project.tags)]}
      />
      <Signpost id="pedulipasal-link" placement={placement} at={PEDULI.link} rotationY={PEDULI.link.ry} scale={MINI_SIGN_SCALE} label="Get the APK" url={project.links.demo} />
    </>
  );
}
```

- [ ] **Step 3: The final registry**

Replace `src/world/scene/islands/index.ts`. It loses the `Bare` / `bare` placeholder:

```ts
import type { FC } from "react";
import { WEB_PLAZA_ID, type IslandPlacement } from "@/world/engine/gen/layout";
import type { IslandModule } from "./types";
import { FOOTPRINTS } from "./layouts";
import { tourStopFor } from "./framing";
import { stampCells } from "./shared/local";
import { HeroIsland } from "./Hero";
import { GtidIsland } from "./Gtid";
import { PetakUmpetIsland } from "./PetakUmpet";
import { OrbitStoreIsland } from "./OrbitStore";
import { EzraBotIsland } from "./EzraBot";
import { PlazaIsland } from "./Plaza";
import { PosMonosukoIsland } from "./PosMonosuko";
import { BeeCrmIsland } from "./BeeCrm";
import { PeduliPasalIsland } from "./PeduliPasal";

/** Every island shares one tour framing (framing.ts) and stamps its FOOTPRINTS cells as barrier collision. */
const island = (id: string, Component: FC<{ placement: IslandPlacement }>): IslandModule => ({
  id,
  Component,
  tourStop: tourStopFor,
  stamp: (grid, p) => stampCells(grid, p, FOOTPRINTS[id]),
});

/** The island registry: the hero, the four stars, the Web & Apps plaza and its three minis. */
export const ISLANDS: Record<string, IslandModule> = {
  hero: island("hero", HeroIsland),
  gtid: island("gtid", GtidIsland),
  "petak-umpet": island("petak-umpet", PetakUmpetIsland),
  "orbit-store": island("orbit-store", OrbitStoreIsland),
  "ezra-bot": island("ezra-bot", EzraBotIsland),
  [WEB_PLAZA_ID]: island(WEB_PLAZA_ID, PlazaIsland),
  "pos-monosuko": island("pos-monosuko", PosMonosukoIsland),
  "bee-furniture-crm": island("bee-furniture-crm", BeeCrmIsland),
  pedulipasal: island("pedulipasal", PeduliPasalIsland),
};
```

- [ ] **Step 4: Run the tests, the type check and the linter**

Run: `npx vitest run src/world/scene/islands src/world/scene/tour`
Expected: PASS, `Test Files  19 passed (19)`, `Tests  120 passed (120)`.

Run: `npx tsc -b && npx eslint src/world`
Expected: no output.

- [ ] **Step 5: Look at the island, its screen and the portrait framings**

Run:
```bash
npm run build && npm run shots -- 5 6 7 8
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=8&closeup=pedulipasal-screen" shots/c4-peduli-closeup.png 1280x720
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=8&closeup=pedulipasal-screen" shots/c4-peduli-closeup-phone.png 520x940
```
(`SHOT_SETTLE_MS=25000` gives the closeup glide time to finish under SwiftShader: see C2 Step 7.)

Check:
- `.shots/stop-8-desktop.png`:
  - the pavilion is back right with the book shelf and the scales under its roof, and the tree on the right;
  - the phone stands whole on its plinth in front, the chat on its screen;
  - the small board front left reads "PeduliPasal", the line, "2024 · Kotlin" and "TensorFlow · Gemini";
  - the "Get the APK" sign is left, in colour (active), and its board is not hidden behind the info board;
  - the bridge head (west-back) is clear.
- Portrait check: in `stop-5-phone.png` … `stop-8-phone.png` each island sits in the middle of the frame. `framing.test.ts` already holds the centre column within |x| < 0.12. Its screen (none on the plaza) is whole.
- The closeups: the phone screen fills the frame height below the HUD (no pan: a portrait screen) and Ezra is not drawn.

- [ ] **Step 6: Commit**

```bash
git add src/world/scene/islands/PeduliPasal.tsx src/world/scene/islands/index.ts src/world/scene/islands/index.test.ts
git commit -q -F - <<'EOF'
feat(world): PeduliPasal island with its chat phone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task C5: Milestones on the Hero → GTID bridge

Three stone pillars with carved plaques facing the tour camera (spec §7.1):
- **2022** on the hero island beside the bridge head;
- **2024** on its own 3 × 3 floating stone beside the bridge's midpoint;
- **2026** on GTID beside the bridge head.

All three stand on the side away from the stepping stones. They are barrier collision and clickable (squash; the press does nothing else until C6), and they are not tour stops. The tour lingers a little on that leg: its travel weight is 1.3, and every other leg keeps 1.

**Files:**
- Create: `src/world/scene/milestones/placement.ts`, `placement.test.ts`, `plaque.ts`, `plaque.test.ts`, `stamp.ts`, `stamp.test.ts`, `Milestones.tsx` (all under `src/world/scene/milestones/`)
- Modify: `src/world/engine/camera/tourPath.ts`, `src/world/engine/camera/tourPath.test.ts`, `src/world/scene/tour/tourBuild.ts`, `src/world/scene/tour/tourBuild.test.ts`, `src/world/scene/World.tsx`

**Interfaces:**
- Consumes:
  - `milestones` and `Milestone` (Part A config and schema);
  - `WorldLayout`, `Crossing`, `IslandPlacement` (layout), `VIEW_F` (`islands/types`), `VoxelGrid`, `BlockName`, `blockId`;
  - `Interactable`, `WorldText`.
- Produces:
  - the master's `milestoneSpots` and `MilestoneSpot`;
  - `milestoneSpotsFor`, `tourTravelWeights`, `milestoneCells`, `PILLAR_H`, `PLAQUE`, `plaqueRows`, `stampMilestones`;
  - `buildTourPath(stops, via?, travel?)` and `TourPath.travel`.

Placement:
- `u` is the bridge's direction from hero to GTID, and "away" is `(u.z, −u.x)`, the side opposite `steppingStones`' offset.
- The island pillars stand 1.2 blocks inland of each bridge head and 2.2 to the side, snapped to a block centre, on the island's walking surface.
- The middle year's stone is centred 4 blocks to the side of the bridge axis at its fraction along it. It is a 3 × 3 stone slab with a keel block under it, its top at the deck's walking height there.
- On the shipped layout:
  - 2022 stands on hero local cell (2, −4);
  - 2026 stands on GTID local cell (−6, −1);
  - the 2024 stone is centred near world (8, −8), its top at y 2.

- [ ] **Step 1: Write the failing tests**

Create `src/world/scene/milestones/placement.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { milestones, worldProjects } from "@/config/portfolio";
import { bridgeCells, steppingStones } from "@/world/scene/crossings/geometry";
import { FOOTPRINTS } from "@/world/scene/islands/layouts";
import { VIEW_F } from "@/world/scene/islands/types";
import { MILESTONE_BRIDGE, MILESTONE_LEG_TRAVEL, PLAQUE_RY, milestoneCells, milestoneSpots, milestoneSpotsFor, tourTravelWeights } from "./placement";

const layout = buildLayout(worldProjects);
const island = (id: string) => layout.islands.find((i) => i.id === id)!;
const bridge = layout.crossings.find((c) => c.from === MILESTONE_BRIDGE.from && c.to === MILESTONE_BRIDGE.to)!;
const years = milestones.map((m) => m.year);
const spots = milestoneSpots(bridge, island("hero"), island("gtid"), years);
const cheb = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
const cellsXZ = (s: (typeof spots)[number]) => milestoneCells(s).map((c) => ({ x: c.x, z: c.z }));

describe("milestone placement", () => {
  it("puts one pillar per year in order: the first on the hero, the last on GTID, the middle one on its own stone", () => {
    expect(bridge.kind).toBe("bridge");
    expect(spots.map((s) => s.year)).toEqual([2022, 2024, 2026]);
    expect(spots.map((s) => s.ownStone)).toEqual([false, true, false]);
    expect(milestoneSpotsFor(layout, years)).toEqual(spots);
  });

  it("stands the island pillars on grass beside the bridge heads, at walking height", () => {
    for (const [s, id, head] of [[spots[0], "hero", bridge.a], [spots[2], "gtid", bridge.b]] as const) {
      const p = island(id);
      const grass = new Set(generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0).map((c) => `${c.x},${c.z}`));
      expect(grass.has(`${Math.floor(s.pos.x) - p.origin.x},${Math.floor(s.pos.z) - p.origin.z}`), `${s.year} on grass`).toBe(true);
      expect(s.pos.y).toBe(p.origin.y + 1);
      const d = Math.hypot(s.pos.x - head.x, s.pos.z - head.z);
      expect(d, `${s.year} beside its bridge head`).toBeGreaterThanOrEqual(2);
      expect(d, `${s.year} beside its bridge head`).toBeLessThan(3.5);
    }
  });

  it("keeps every pillar and stone off the deck and a block clear of it and of the stepping stones", () => {
    const deck = bridgeCells(bridge.a, bridge.b);
    const stones = steppingStones(bridge.a, bridge.b);
    for (const s of spots) {
      for (const c of cellsXZ(s)) {
        for (const d of deck) expect(cheb(c, d), `${s.year} (${c.x},${c.z}) vs deck`).toBeGreaterThanOrEqual(s.ownStone ? 2 : 1);
        for (const st of stones) expect(cheb(c, st), `${s.year} (${c.x},${c.z}) vs stepping stone`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("puts the own stone's top at the deck's walking height there, every pillar on the side away from the stepping stones", () => {
    expect(spots[1].pos.y).toBe(Math.round((bridge.a.y + bridge.b.y) / 2));
    const u = { x: bridge.b.x - bridge.a.x, z: bridge.b.z - bridge.a.z };
    const side = (p: { x: number; z: number }) => Math.sign(u.x * (p.z - bridge.a.z) - u.z * (p.x - bridge.a.x));
    const first = steppingStones(bridge.a, bridge.b)[0];
    const stoneSide = side({ x: first.x + 0.5, z: first.z + 0.5 });
    for (const s of spots) expect(side(s.pos), `${s.year}`).toBe(-stoneSide);
  });

  it("stays clear of the hero's and GTID's props, one free block between", () => {
    for (const [s, id] of [[spots[0], "hero"], [spots[2], "gtid"]] as const) {
      const p = island(id);
      for (const [x, , z] of FOOTPRINTS[id]) {
        expect(cheb({ x: Math.floor(s.pos.x), z: Math.floor(s.pos.z) }, { x: p.origin.x + x, z: p.origin.z + z }), `${s.year} vs ${id} (${x},${z})`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("turns every plaque to face the tour camera", () => {
    for (const s of spots) {
      expect(s.ry).toBe(PLAQUE_RY);
      // a plaque facing +z turned by ry looks along (sin ry, cos ry): straight back along the camera's forward
      expect(Math.sin(s.ry) * VIEW_F.x + Math.cos(s.ry) * VIEW_F.z).toBeCloseTo(-1, 9);
    }
  });

  it("occupies two barrier rows per pillar, plus a 3 × 3 stone slab and a keel block under the own stone", () => {
    const own = milestoneCells(spots[1]);
    expect(own.filter((c) => c.block === "stone")).toHaveLength(10);
    expect(own.filter((c) => c.block === "barrier").map((c) => c.y)).toEqual([spots[1].pos.y, spots[1].pos.y + 1]);
    expect(milestoneCells(spots[0]).every((c) => c.block === "barrier")).toBe(true);
  });

  it("slows the tour only on the milestone bridge's leg", () => {
    const w = tourTravelWeights(layout);
    expect(w).toHaveLength(layout.tourOrder.length - 1);
    expect(w[0]).toBe(MILESTONE_LEG_TRAVEL);
    expect(MILESTONE_LEG_TRAVEL).toBeGreaterThan(1);
    expect(w.slice(1).every((x) => x === 1)).toBe(true);
  });

  it("returns no spots when the layout has no hero → GTID bridge", () => {
    expect(milestoneSpotsFor({ ...layout, crossings: [] }, years)).toEqual([]);
  });
});
```

Create `src/world/scene/milestones/plaque.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { milestones } from "@/config/portfolio";
import { PLAQUE, plaqueRows } from "./plaque";

describe("milestone plaques", () => {
  it("fit every configured milestone inside the slab, rows within their character limits", () => {
    for (const m of milestones) {
      const r = plaqueRows(m);
      expect(r.height, `${m.year}`).toBeLessThanOrEqual(PLAQUE.h);
      for (const row of r.title) expect(row.length, row).toBeLessThanOrEqual(PLAQUE.titleChars);
      for (const row of r.line) expect(row.length, row).toBeLessThanOrEqual(PLAQUE.lineChars);
      expect(r.title.join(" ")).toBe(m.title);
      expect(r.line.join(" ")).toBe(m.line);
    }
  });

  it("stacks year, title and line top to bottom", () => {
    const r = plaqueRows(milestones[2]);
    expect(r.line).toEqual(["Business Information", "Systems, Petra Christian", "University"]);
    expect(r.yearY).toBeLessThan(r.titleY[0]);
    expect(r.titleY[r.titleY.length - 1]).toBeLessThan(r.lineY[0]);
  });
});
```

Create `src/world/scene/milestones/stamp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { milestones, worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { blockId } from "@/world/engine/voxel/blocks";
import { buildWorld } from "@/world/engine/worldBuild";
import { stampCrossings } from "@/world/scene/crossings/stamp";
import { milestoneCells, milestoneSpotsFor } from "./placement";
import { stampMilestones } from "./stamp";

const layout = buildLayout(worldProjects);
const years = milestones.map((m) => m.year);
const built = buildWorld(layout, [(g) => stampCrossings(g, layout), (g) => stampMilestones(g, layout, years)]);
const spots = milestoneSpotsFor(layout, years);

describe("stampMilestones", () => {
  it("makes every pillar solid for two rows above its ground", () => {
    for (const s of spots) {
      const x = Math.floor(s.pos.x), z = Math.floor(s.pos.z);
      expect(built.grid.get(x, s.pos.y, z), `${s.year}`).toBe(blockId("barrier"));
      expect(built.grid.get(x, s.pos.y + 1, z), `${s.year}`).toBe(blockId("barrier"));
      expect(built.grid.isSolid(x, s.pos.y + 2, z), `${s.year}`).toBe(false);
    }
  });

  it("builds the floating stone from real stone that a terrain batch draws, its top at walking height", () => {
    const own = spots.find((s) => s.ownStone)!;
    const stones = milestoneCells(own).filter((c) => c.block === "stone");
    const drawn = new Set<string>();
    for (const b of Object.values(built.batches)) {
      for (let i = 0; i < b.count; i++) drawn.add(`${b.positions[i * 3] - 0.5},${b.positions[i * 3 + 1] - 0.5},${b.positions[i * 3 + 2] - 0.5}`);
    }
    for (const c of stones) {
      expect(built.grid.get(c.x, c.y, c.z)).toBe(blockId("stone"));
      expect(drawn.has(`${c.x},${c.y},${c.z}`), `stone (${c.x},${c.y},${c.z}) drawn`).toBe(true);
    }
    expect(Math.max(...stones.map((c) => c.y)) + 1).toBe(own.pos.y);
  });
});
```

`src/world/engine/camera/tourPath.test.ts`, at the end of the `buildTourPath` describe. Old:
```ts
  it("needs at least two stops", () => {
    expect(() => buildTourPath([stops[0]])).toThrow();
  });
});
```
New:
```ts
  it("needs at least two stops", () => {
    expect(() => buildTourPath([stops[0]])).toThrow();
  });

  it("gives a leg with a heavier travel weight a bigger share of the scroll, keeping the others' proportions", () => {
    const slow = buildTourPath(stops, via, [1.3]);
    expect(slow.travel).toEqual([1.3, 1]);
    expect(path.travel).toEqual([1, 1]);
    expect(slow.totalWeight).toBeCloseTo(path.totalWeight + 0.3, 9);
    const legShare = (p: typeof path, i: number) => stopProgress(p, i + 1) - stopProgress(p, i);
    expect(legShare(slow, 0) / legShare(slow, 1)).toBeGreaterThan(legShare(path, 0) / legShare(path, 1));
    expect(() => buildTourPath(stops, via, [0])).toThrow();
  });
});
```

`src/world/scene/tour/tourBuild.test.ts`, the imports. Old:
```ts
import { defaultTourStop } from "../islands/types";
import { buildTour, isPortrait } from "./tourBuild";
```
New:
```ts
import { defaultTourStop } from "../islands/types";
import { tourTravelWeights } from "../milestones/placement";
import { buildTour, isPortrait } from "./tourBuild";
```

The landscape test. Old:
```ts
      expect(path.via).toEqual(tourVia(layout));
```
New:
```ts
      expect(path.via).toEqual(tourVia(layout));
      expect(path.travel).toEqual(tourTravelWeights(layout));
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/milestones src/world/engine/camera/tourPath.test.ts src/world/scene/tour/tourBuild.test.ts`
Expected: FAIL. The three milestone files: `Failed to resolve import "./placement"` (and `"./plaque"`, `"./stamp"`). `tourBuild.test.ts`: `Failed to resolve import "../milestones/placement"`. `tourPath.test.ts`: the new test fails (`expected undefined to deeply equal [ 1.3, 1 ]`).

- [ ] **Step 3: Per-leg travel weights in the tour path**

`src/world/engine/camera/tourPath.ts`, the interface. Old:
```ts
export interface TourPath { stops: TourStop[]; via: Vec3[][]; totalWeight: number; controls: Vec3[]; stopIndex: number[] }
```
New:
```ts
/** `travel[i]`: scroll weight of the flight from stop i to stop i + 1 (TRAVEL_WEIGHT unless the caller lingers there). */
export interface TourPath { stops: TourStop[]; via: Vec3[][]; totalWeight: number; controls: Vec3[]; stopIndex: number[]; travel: number[] }
```

`buildTourPath`. Old:
```ts
export function buildTourPath(stops: TourStop[], via: Vec3[][] = []): TourPath {
  if (stops.length < 2) throw new Error("tour path needs at least two stops");
  if (stops.some((s) => !(s.dwell > 0))) throw new Error("every tour stop needs a dwell weight > 0");
```
New:
```ts
export function buildTourPath(stops: TourStop[], via: Vec3[][] = [], travel: readonly number[] = []): TourPath {
  if (stops.length < 2) throw new Error("tour path needs at least two stops");
  if (stops.some((s) => !(s.dwell > 0))) throw new Error("every tour stop needs a dwell weight > 0");
  const legs = stops.slice(1).map((_, i) => travel[i] ?? TRAVEL_WEIGHT);
  if (legs.some((w) => !(w > 0))) throw new Error("every travel weight must be > 0");
```

Old:
```ts
  const totalWeight = stops.reduce((sum, s) => sum + s.dwell, 0) + (stops.length - 1) * TRAVEL_WEIGHT;
  return { stops, via, totalWeight, controls, stopIndex };
```
New:
```ts
  const totalWeight = stops.reduce((sum, s) => sum + s.dwell, 0) + legs.reduce((sum, w) => sum + w, 0);
  return { stops, via, totalWeight, controls, stopIndex, travel: legs };
```

In `zones`. Old:
```ts
      out.push({ kind: "travel", index: i, w0: w, w1: w + TRAVEL_WEIGHT, c0: k[i] + DELTA, c1: k[i + 1] - DELTA });
      w += TRAVEL_WEIGHT;
```
New:
```ts
      out.push({ kind: "travel", index: i, w0: w, w1: w + path.travel[i], c0: k[i] + DELTA, c1: k[i + 1] - DELTA });
      w += path.travel[i];
```

- [ ] **Step 4: Placement, plaques and collision**

Create `src/world/scene/milestones/placement.ts`:

```ts
import type { Crossing, IslandPlacement, WorldLayout } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import type { BlockName } from "@/world/engine/voxel/blocks";
import { VIEW_F } from "@/world/scene/islands/types";

/** The crossing the year milestones stand along (spec §7.1): the tour's first bridge. */
export const MILESTONE_BRIDGE = { from: "hero", to: "gtid" } as const;
/** Blocks beside the bridge axis, on the side away from the stepping stones. */
export const MILESTONE_SIDE = 2.2;
/** Blocks from a bridge head onto its island. */
export const MILESTONE_INLAND = 1.2;
/** Blocks from the bridge axis to the centre of a middle milestone's own floating stone (3 × 3, a block clear of the deck). */
export const MID_STONE_SIDE = 4;
/** Pillar height above its ground; collision covers rows 0..1. */
export const PILLAR_H = 1.7;

/** Scroll weight of the tour's flight along the milestone bridge (the others weigh 1): "the camera slows slightly while passing". */
export const MILESTONE_LEG_TRAVEL = 1.3;

export interface MilestoneSpot { year: number; pos: Vec3; ry: number; ownStone: boolean }

/** Heading every plaque faces: back toward the tour camera (−VIEW_F). */
export const PLAQUE_RY = Math.atan2(-VIEW_F.x, -VIEW_F.z);

const centre = (x: number, y: number, z: number): Vec3 => ({ x: Math.floor(x) + 0.5, y, z: Math.floor(z) + 0.5 });

/**
 * Where each year's pillar stands (feet centre, on a block centre). The first year stands on `from` beside the bridge
 * head, the last on `to`, any between on their own floating stones beside the bridge, spread evenly along it; all on
 * the side away from the stepping stones (steppingStones offsets along +(−uz, ux)). `pos.y` is the walking surface the
 * pillar stands on: an own stone's top is the deck's walking height at that point.
 */
export function milestoneSpots(bridge: Crossing, from: IslandPlacement, to: IslandPlacement, years: readonly number[]): MilestoneSpot[] {
  const dx = bridge.b.x - bridge.a.x;
  const dz = bridge.b.z - bridge.a.z;
  const len = Math.hypot(dx, dz) || 1;
  const u = { x: dx / len, z: dz / len };
  const away = { x: u.z, z: -u.x }; // −(−uz, ux): opposite the stepping stones
  const n = years.length;
  return years.map((year, i) => {
    if (i === 0) {
      const pos = centre(bridge.a.x - u.x * MILESTONE_INLAND + away.x * MILESTONE_SIDE, from.origin.y + 1, bridge.a.z - u.z * MILESTONE_INLAND + away.z * MILESTONE_SIDE);
      return { year, pos, ry: PLAQUE_RY, ownStone: false };
    }
    if (i === n - 1) {
      const pos = centre(bridge.b.x + u.x * MILESTONE_INLAND + away.x * MILESTONE_SIDE, to.origin.y + 1, bridge.b.z + u.z * MILESTONE_INLAND + away.z * MILESTONE_SIDE);
      return { year, pos, ry: PLAQUE_RY, ownStone: false };
    }
    const t = i / (n - 1);
    const y = Math.round(bridge.a.y + (bridge.b.y - bridge.a.y) * t);
    const pos = centre(bridge.a.x + dx * t + away.x * MID_STONE_SIDE, y, bridge.a.z + dz * t + away.z * MID_STONE_SIDE);
    return { year, pos, ry: PLAQUE_RY, ownStone: true };
  });
}

/** The milestone spots for this layout ([] when it has no hero → GTID bridge). */
export function milestoneSpotsFor(layout: WorldLayout, years: readonly number[]): MilestoneSpot[] {
  const bridge = layout.crossings.find((c) => c.from === MILESTONE_BRIDGE.from && c.to === MILESTONE_BRIDGE.to && c.kind === "bridge");
  const from = layout.islands.find((i) => i.id === MILESTONE_BRIDGE.from);
  const to = layout.islands.find((i) => i.id === MILESTONE_BRIDGE.to);
  return bridge && from && to ? milestoneSpots(bridge, from, to, years) : [];
}

/** buildTourPath's per-leg travel weights for this layout: MILESTONE_LEG_TRAVEL on the milestone bridge's leg, 1 elsewhere. */
export function tourTravelWeights(layout: WorldLayout): number[] {
  return layout.tourOrder.slice(1).map((to, i) => (layout.tourOrder[i] === MILESTONE_BRIDGE.from && to === MILESTONE_BRIDGE.to ? MILESTONE_LEG_TRAVEL : 1));
}

export interface WorldCell { x: number; y: number; z: number; block: BlockName }

/**
 * World cells a milestone occupies: an own stone's 3 × 3 slab one row under its top plus a keel block under its middle
 * (real stone, meshed with the nearest island's terrain), then the pillar's two barrier rows.
 */
export function milestoneCells(spot: MilestoneSpot): WorldCell[] {
  const x = Math.floor(spot.pos.x);
  const z = Math.floor(spot.pos.z);
  const y = Math.round(spot.pos.y);
  const out: WorldCell[] = [];
  if (spot.ownStone) {
    for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) out.push({ x: x + ix, y: y - 1, z: z + iz, block: "stone" });
    out.push({ x, y: y - 2, z, block: "stone" });
  }
  out.push({ x, y, z, block: "barrier" }, { x, y: y + 1, z, block: "barrier" });
  return out;
}
```

Create `src/world/scene/milestones/plaque.ts`:

```ts
import type { Milestone } from "@/config/schema";
import { wrapWords } from "@/world/scene/islands/shared/text";

/**
 * A milestone plaque (Milestones.tsx): a lighter stone slab on the pillar's front with the year in Pixelify Sans and the
 * title and line in the grotesk. Character limits keep every row inside the slab (≤ 0.53 em per character at these
 * sizes, as InfoBoard measures), so troika never wraps a row on its own.
 */
export const PLAQUE = {
  w: 1.0,
  h: 0.86,
  yearSize: 0.28,
  titleSize: 0.09,
  lineSize: 0.07,
  titleChars: 20,
  lineChars: 26,
} as const;

const YEAR_Y = 0.2; // row centres, measured down from the plaque's top edge
const TITLE_Y = 0.43;
const TITLE_ROW = 0.115;
const LINE_GAP = 0.14;
const LINE_ROW = 0.09;

export interface PlaqueRows {
  title: string[];
  line: string[];
  yearY: number;
  titleY: number[];
  lineY: number[];
  /** height every row needs (≤ PLAQUE.h for the configured milestones) */
  height: number;
}

export function plaqueRows(m: Milestone): PlaqueRows {
  const title = wrapWords(m.title, PLAQUE.titleChars);
  const line = wrapWords(m.line, PLAQUE.lineChars);
  const titleY = title.map((_, i) => TITLE_Y + i * TITLE_ROW);
  const lineTop = titleY[titleY.length - 1] + LINE_GAP;
  const lineY = line.map((_, i) => lineTop + i * LINE_ROW);
  return { title, line, yearY: YEAR_Y, titleY, lineY, height: lineY[lineY.length - 1] + LINE_ROW };
}
```

Create `src/world/scene/milestones/stamp.ts`:

```ts
import type { WorldLayout } from "@/world/engine/gen/layout";
import { blockId } from "@/world/engine/voxel/blocks";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { milestoneCells, milestoneSpotsFor } from "./placement";

/**
 * The milestones in the world grid: each pillar's two barrier rows (its mesh is Milestones.tsx) and the floating
 * stones as real stone blocks, which the nearest island's terrain batch then draws. Runs after the island and crossing
 * stamps and never overwrites a block already there.
 */
export function stampMilestones(grid: VoxelGrid, layout: WorldLayout, years: readonly number[]): void {
  for (const spot of milestoneSpotsFor(layout, years)) {
    for (const c of milestoneCells(spot)) if (grid.get(c.x, c.y, c.z) === 0) grid.set(c.x, c.y, c.z, blockId(c.block));
  }
}
```

- [ ] **Step 5: The tour lingers on the milestone leg**

`src/world/scene/tour/tourBuild.ts`, the imports. Old:
```ts
import { portraitStop } from "../islands/framing";
import { tourVia } from "./tourMath";
```
New:
```ts
import { portraitStop } from "../islands/framing";
import { tourTravelWeights } from "../milestones/placement";
import { tourVia } from "./tourMath";
```

Old:
```ts
  const via = tourVia(layout);
  if (!portrait) return buildTourPath(base, via);
```
New:
```ts
  const via = tourVia(layout);
  // the camera lingers a little on the milestone bridge (spec §7.1)
  const travel = tourTravelWeights(layout);
  if (!portrait) return buildTourPath(base, via, travel);
```

Old:
```ts
  return buildTourPath(stops, moved);
```
New:
```ts
  return buildTourPath(stops, moved, travel);
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/world/scene/milestones src/world/engine/camera/tourPath.test.ts src/world/scene/tour`
Expected: PASS, `Test Files  7 passed (7)`, `Tests  57 passed (57)`:
- `placement.test.ts` 9, `plaque.test.ts` 2, `stamp.test.ts` 2;
- `tourPath.test.ts` 11;
- `tourBuild.test.ts` 6, `tourMotion.test.ts` 19, `tourMath.test.ts` 8.

- [ ] **Step 7: The pillars**

Create `src/world/scene/milestones/Milestones.tsx`:
- One merged, vertex-coloured geometry (plinth, column, cap stone, plaque slab) is shared by all three pillars.
- The carved text is three `WorldText`s: the year in Pixelify Sans, and the title and the line in the grotesk.
- A click squashes the pillar (not under reduced motion).
- The graduation moment joins in C6.

```tsx
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
```

- [ ] **Step 8: Stamp and render them in the world**

`src/world/scene/World.tsx`, the imports. Old:
```tsx
import { useEffect, useMemo } from "react";
```
New:
```tsx
import { useEffect, useMemo } from "react";
import { milestones } from "@/config/portfolio";
```

Old:
```tsx
import { stampCrossings } from "./crossings/stamp";
```
New:
```tsx
import { stampCrossings } from "./crossings/stamp";
import { Milestones } from "./milestones/Milestones";
import { stampMilestones } from "./milestones/stamp";
```

The stamps. Old:
```tsx
  const built = buildWorld(runtime.layout, [...stamps, (grid: VoxelGrid) => stampCrossings(grid, runtime.layout)]);
```
New:
```tsx
  const built = buildWorld(runtime.layout, [
    ...stamps,
    (grid: VoxelGrid) => stampCrossings(grid, runtime.layout),
    // after the crossings: the pillars and the floating stone never take a bridge or stepping-stone cell
    (grid: VoxelGrid) => stampMilestones(grid, runtime.layout, milestones.map((m) => m.year)),
  ]);
```

The render. Old:
```tsx
      <ParticlesRenderer />
```
New:
```tsx
      <Milestones />
      <ParticlesRenderer />
```

- [ ] **Step 9: Type check, lint, look at them**

Run: `npx tsc -b && npx eslint src/world`
Expected: no output.

Run: `npm run build && npm run shots -- 0 1`
Check:
- `stop-0-desktop.png`: the 2022 pillar stands on the hero island's right, beside the bridge head, its plaque facing the camera. "2022", "Started Business Information Systems" and "Petra Christian University" are readable.
- The 2024 pillar stands on its own small floating stone beside the middle of the bridge, clear of the deck and the stepping stones.
- `stop-1-desktop.png`: the 2026 pillar stands on GTID's left beside the bridge head.
- The plaques read "Bangkit Academy" / "Mobile Development, graduated with Distinction" and "Graduated" / "Business Information Systems, Petra Christian University".
- The phone shots show the same, with nothing clipped.

- [ ] **Step 10: Commit**

```bash
git add src/world/scene/milestones/placement.ts src/world/scene/milestones/placement.test.ts src/world/scene/milestones/plaque.ts src/world/scene/milestones/plaque.test.ts src/world/scene/milestones/stamp.ts src/world/scene/milestones/stamp.test.ts src/world/scene/milestones/Milestones.tsx src/world/engine/camera/tourPath.ts src/world/engine/camera/tourPath.test.ts src/world/scene/tour/tourBuild.ts src/world/scene/tour/tourBuild.test.ts src/world/scene/World.tsx
git commit -q -F - <<'EOF'
feat(world): year milestones on the Hero to GTID bridge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task C6: The graduation moment

The outfit follows Ezra's graduation photos and his choice (spec §7.2): accessories over his black tee, no gown.
- **Cap:** a royal-blue mortarboard and skull cap `#1f4fc4`, with a black cord `#1b1e24` from the centre button to the edge and a tassel hanging on **his right** (model −x) beside his face.
- **Collar band:** an orange `#f26a1b` V with a thin black inner edge over both shoulders, meeting low on the chest.
- **Medal:** bronze `#a8907e`, 0.12 across, on a royal-blue ribbon, mid-chest, in front of the V.

Each part is one merged, vertex-coloured geometry: one draw call for the cap and one for the regalia.

**Play:** the first time in a session Ezra comes within 2.5 blocks of the 2026 pillar (and about level with it), the cap pops onto his head and the collar and medal appear. That comes with a `confetti` burst and a `pop`, and he keeps them for the session. Clicking the pillar replays the confetti.

**Tour:** Ezra sits on the hero island, so a separate cap is tossed instead.
- It flies the first time a page load's tour progress moves forward across the pillar. That progress is the point where the camera track's watch point is nearest the pillar top.
- The cap goes up off the pillar with spin and confetti and lands back on it. Clicking replays the toss.
- The tossed cap rests on the pillar afterwards, except while Ezra wears his own.

This task also adds the four runtime fields and both new sounds. `travel` and `hidden` stay inert until C7, but the Play trigger already skips a running travel.

**Files:**
- Create: `src/world/scene/graduation.ts`, `src/world/scene/graduation.test.ts`, `src/world/scene/GraduationCap.tsx`, `src/world/scene/milestones/moment.ts`, `src/world/scene/milestones/moment.test.ts`
- Modify: `src/world/state/runtime.ts`, `src/world/engine/audio/sfx.ts`, `src/world/engine/audio/sfx.test.ts`, `src/world/scene/Ezra.tsx`
- Replace: `src/world/scene/milestones/Milestones.tsx`

**Interfaces:**
- Consumes: C5 (`milestoneSpotsFor`, `PILLAR_H`, `Pillar`); `runtime.tourPath`, `runtime.tourProgress`, `runtime.particles` (Phase 1); `watchPoint` (`scene/modes`), `nearestTrackProgress`, `trackFor` (`scene/tour/tourMotion`).
- Produces: the master's `runtime.capOn`, `runtime.capToss`, `runtime.travel`, `runtime.hidden`, and `SfxName` `"pop"` / `"poof"`; `GRAD_COLORS`, `CAP_ON_HEAD_Y`, `CAP_GEOMETRY`, `REGALIA_GEOMETRY`, `GRAD_MATERIAL`, `GraduationCap`, `GraduationRegalia`; `CAP_RADIUS`, `nearMilestone`, `crossedForward`, `TOSS`, `tossPose`, `capPopScale`.

- [ ] **Step 1: Write the failing tests**

Create `src/world/scene/graduation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CAP_GEOMETRY, CAP_ON_HEAD_Y, GRAD_COLORS, REGALIA_GEOMETRY } from "./graduation";

/** Every vertex colour of a baked geometry, as hex strings. */
const colours = (g: THREE.BufferGeometry) => {
  const c = g.getAttribute("color");
  const out = new Set<string>();
  const tmp = new THREE.Color();
  for (let i = 0; i < c.count; i++) out.add(`#${tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i)).getHexString()}`);
  return out;
};

describe("graduation outfit", () => {
  it("uses Ezra's chosen colours: royal-blue cap and ribbon, black cord, orange collar, bronze medal", () => {
    expect(GRAD_COLORS).toEqual({ cap: "#1f4fc4", cord: "#1b1e24", collar: "#f26a1b", collarEdge: "#1b1e24", medal: "#a8907e", ribbon: "#1f4fc4" });
    expect(colours(CAP_GEOMETRY)).toEqual(new Set([GRAD_COLORS.cap, GRAD_COLORS.cord]));
    expect(colours(REGALIA_GEOMETRY)).toEqual(new Set([GRAD_COLORS.collar, GRAD_COLORS.collarEdge, GRAD_COLORS.medal, GRAD_COLORS.ribbon]));
  });

  it("sits the cap over his hair (top ~0.65 above the head pivot) with the board level above it", () => {
    CAP_GEOMETRY.computeBoundingBox();
    const box = CAP_GEOMETRY.boundingBox!;
    expect(CAP_ON_HEAD_Y + 0.18).toBeGreaterThan(0.65); // the skull cap's top clears the hair
    expect(CAP_ON_HEAD_Y + box.max.y).toBeLessThan(0.8);
    expect(box.max.x - box.min.x).toBeGreaterThan(0.75); // the square board, wider than his head (0.5)
  });

  it("hangs the tassel on his right (model −x), beside the face", () => {
    const pos = CAP_GEOMETRY.getAttribute("position");
    let lowest = { x: 0, y: Infinity };
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < lowest.y) lowest = { x: pos.getX(i), y: pos.getY(i) };
    expect(lowest.x).toBeLessThan(-0.3);
    expect(CAP_ON_HEAD_Y + lowest.y).toBeLessThan(0.35); // down to about eye level (eyes at ~0.19–0.24)
  });

  it("puts the medal in front of the collar, at chest height", () => {
    REGALIA_GEOMETRY.computeBoundingBox();
    const box = REGALIA_GEOMETRY.boundingBox!;
    expect(box.max.z).toBeCloseTo(0.211, 2); // the medal's face, in front of the collar band (0.182)
    expect(box.min.y).toBeGreaterThan(0.95);
    expect(box.max.y).toBeLessThan(1.4);
  });
});
```

Create `src/world/scene/milestones/moment.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CAP_RADIUS, TOSS, capPopScale, crossedForward, nearMilestone, tossPose } from "./moment";

describe("graduation moment maths", () => {
  const foot = { x: 10.5, y: 3, z: -4.5 };

  it("counts Ezra as near within 2.5 blocks horizontally of the pillar's foot, at about its level", () => {
    expect(CAP_RADIUS).toBe(2.5);
    expect(nearMilestone({ x: 12.9, y: 3, z: -4.5 }, foot)).toBe(true);
    expect(nearMilestone({ x: 12.2, y: 3.4, z: -5.9 }, foot)).toBe(true);
    expect(nearMilestone({ x: 13.1, y: 3, z: -4.5 }, foot)).toBe(false);
    expect(nearMilestone({ x: 10.5, y: 7, z: -4.5 }, foot)).toBe(false);
    expect(nearMilestone({ x: 10.5, y: -1, z: -4.5 }, foot)).toBe(false);
  });

  it("fires the tour toss only when the progress moves forward across the pillar's progress", () => {
    expect(crossedForward(0.08, 0.1, 0.09)).toBe(true);
    expect(crossedForward(0.09, 0.1, 0.09)).toBe(false); // already past
    expect(crossedForward(0.1, 0.08, 0.09)).toBe(false); // scrolling back
    expect(crossedForward(-1, 0.5, 0.09)).toBe(false); // first frame (e.g. a ?stop deep link past it)
    expect(crossedForward(0.05, 0.09, 0.09)).toBe(true); // landing exactly on it counts
  });

  it("tosses the cap up and back onto the pillar, spinning, in TOSS.duration seconds", () => {
    expect(tossPose(0)).toEqual({ y: 0, spin: 0, tilt: 0, done: false });
    const top = tossPose(TOSS.duration / 2);
    expect(top.y).toBeCloseTo(TOSS.height, 9);
    expect(top.done).toBe(false);
    const end = tossPose(TOSS.duration);
    expect(end.y).toBeCloseTo(0, 9);
    expect(end.spin).toBeCloseTo(TOSS.turns * Math.PI * 2, 9);
    expect(end.tilt).toBeCloseTo(0, 9);
    expect(end.done).toBe(true);
    expect(tossPose(TOSS.duration + 3)).toEqual(end);
  });

  it("pops the cap on: grows from nothing, overshoots a little, settles at full size by 0.3 s", () => {
    expect(capPopScale(0)).toBe(0);
    const samples = Array.from({ length: 30 }, (_, i) => capPopScale((i + 1) * 0.01));
    expect(Math.max(...samples)).toBeGreaterThan(1.05);
    expect(Math.max(...samples)).toBeLessThan(1.2);
    expect(capPopScale(0.3)).toBe(1);
    expect(capPopScale(2)).toBe(1);
  });
});
```

`src/world/engine/audio/sfx.test.ts`. Old:
```ts
const NAMES = ["click", "hover", "punch", "burst", "jump", "land", "step", "print", "chat", "link", "bounce", "cart"];
```
New:
```ts
const NAMES = ["click", "hover", "punch", "burst", "jump", "land", "step", "print", "chat", "link", "bounce", "cart", "pop", "poof"];
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/graduation.test.ts src/world/scene/milestones/moment.test.ts src/world/engine/audio`
Expected: FAIL: `Failed to resolve import "./graduation"` and `"./moment"`. In `sfx.test.ts`, "has a usable preset for every sound name" fails: the preset keys lack `pop` and `poof`.

- [ ] **Step 3: Runtime fields and sounds**

`src/world/state/runtime.ts`, at the end of the `runtime` object, after Part B's closeup fields. Old:
```ts
  /** The open closeup; openCloseup / closeCloseup write it together with the store's closeupId. */
  closeup: null as { id: string } | null,
};
```
New:
```ts
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
```

`src/world/engine/audio/sfx.ts`, the name union. Old:
```ts
export type SfxName = "click" | "hover" | "punch" | "burst" | "jump" | "land" | "step" | "print" | "chat" | "link" | "bounce" | "cart";
```
New:
```ts
export type SfxName =
  | "click" | "hover" | "punch" | "burst" | "jump" | "land" | "step" | "print" | "chat" | "link" | "bounce" | "cart" | "pop" | "poof";
```

The presets. Old:
```ts
  cart: [0.4, 0.1, 90, 0.05, 0.4, 0.2, 2, 1, 0, 0, 0, 0, 0.08, 0.3],
};
```
New:
```ts
  cart: [0.4, 0.1, 90, 0.05, 0.4, 0.2, 2, 1, 0, 0, 0, 0, 0.08, 0.3],
  // the graduation cap popping on (or the toss): a short soft blip sliding up
  pop: [0.4, 0.02, 520, 0, 0.02, 0.08, 0, 1.6, 18],
  // a fast-travel dust puff: a quiet noise burst falling away
  poof: [0.3, 0.1, 150, 0.01, 0.04, 0.2, 4, 1, -3, 0, 0, 0, 0, 0.6],
};
```

- [ ] **Step 4: The outfit geometry and the moment maths**

Create `src/world/scene/graduation.ts`:
- `bake()` merges non-indexed boxes and discs, each painted with its colour.
- The cap's origin is its base, sitting `CAP_ON_HEAD_Y` above the head pivot.
- The regalia is in body space: the collar V arms tilted ±0.522 rad meet low on the chest, with the black inner edge inside them. The medal's face is 0.211 in front, ahead of the collar (0.182).

```ts
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Ezra's graduation outfit, from his photos (Petra Christian University's 90th graduation, 5 September 2026, Business
 * Information Systems): a royal-blue mortarboard with a black cord and tassel, an orange collar band with a thin black
 * inner edge, and a bronze medal on a royal-blue ribbon, all worn over his usual black tee.
 */
export const GRAD_COLORS = {
  /** the photos read ≈ #0b44b5 under stage light; a touch lighter so it stays royal blue in the warm world light */
  cap: "#1f4fc4",
  cord: "#1b1e24",
  collar: "#f26a1b",
  collarEdge: "#1b1e24",
  medal: "#a8907e",
  ribbon: "#1f4fc4",
} as const;

/** Height of the cap's base (its skull cap's bottom) above Ezra's head pivot: just under his hair top (~0.65). */
export const CAP_ON_HEAD_Y = 0.49;

interface Piece {
  size: readonly [number, number, number];
  at: readonly [number, number, number];
  color: string;
  /** rotation (radians) about z, applied before the move */
  rz?: number;
  /** rotation about y, applied before the move */
  ry?: number;
  /** a disc facing +z instead of a box: size = [diameter, thickness, unused] */
  disc?: boolean;
  radius?: number;
}

/** Bakes pieces into one non-indexed, vertex-coloured geometry: one draw call for the whole part. */
function bake(pieces: readonly Piece[]): THREE.BufferGeometry {
  const c = new THREE.Color();
  const parts = pieces.map((p) => {
    let g: THREE.BufferGeometry;
    if (p.disc) {
      const cyl = new THREE.CylinderGeometry(p.size[0] / 2, p.size[0] / 2, p.size[1], 20);
      g = cyl.toNonIndexed();
      cyl.dispose();
      g.rotateX(Math.PI / 2);
    } else {
      const [w, h, d] = p.size;
      g = new RoundedBoxGeometry(w, h, d, 2, Math.min(p.radius ?? 0.01, Math.min(w, h, d) * 0.3));
    }
    if (p.ry) g.rotateY(p.ry);
    if (p.rz) g.rotateZ(p.rz);
    g.translate(p.at[0], p.at[1], p.at[2]);
    c.set(p.color);
    const n = g.attributes.position.count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return g;
  });
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  if (!merged) throw new Error("graduation: could not merge the outfit geometry");
  return merged;
}

const K = GRAD_COLORS;

/**
 * The mortarboard, its base at the origin (model space: faces +z, Ezra's right is −x): skull cap, square board, centre
 * button, the cord running to the board's right edge and down to a tassel that hangs beside his face.
 */
export const CAP_GEOMETRY = bake([
  { size: [0.6, 0.18, 0.54], at: [0, 0.09, 0], color: K.cap, radius: 0.04 },
  { size: [0.78, 0.035, 0.78], at: [0, 0.1975, 0], color: K.cap, radius: 0.012 },
  { size: [0.07, 0.025, 0.07], at: [0, 0.2275, 0], color: K.cord },
  // from the button to the edge at (−0.39, 0.12): a 0.408 cord turned 0.2985 rad about y
  { size: [0.408, 0.012, 0.018], at: [-0.195, 0.221, 0.06], color: K.cord, ry: 0.2985 },
  { size: [0.014, 0.22, 0.014], at: [-0.395, 0.105, 0.12], color: K.cord },
  { size: [0.05, 0.2, 0.05], at: [-0.395, -0.105, 0.12], color: K.cord, radius: 0.015 },
]);

const side = (s: 1 | -1): Piece[] => [
  // the collar band: a V from each shoulder down to the chest (it meets at y 1.0), with a thin black inner edge
  { size: [0.075, 0.381, 0.02], at: [s * 0.095, 1.165, 0.172], color: K.collar, rz: -s * 0.522 },
  { size: [0.022, 0.34, 0.021], at: [s * 0.053, 1.189, 0.1725], color: K.collarEdge, rz: -s * 0.522 },
  { size: [0.075, 0.022, 0.34], at: [s * 0.2, 1.341, 0], color: K.collar },
  { size: [0.075, 0.24, 0.02], at: [s * 0.19, 1.21, -0.172], color: K.collar },
  // the medal ribbon: from beside the neck down to the medal, over the shoulder and round the back of the neck
  { size: [0.03, 0.218, 0.012], at: [s * 0.0465, 1.235, 0.19], color: K.ribbon, rz: -s * 0.265 },
  { size: [0.03, 0.025, 0.3], at: [s * 0.085, 1.355, 0.04], color: K.ribbon },
];

/** Collar band and medal, in Ezra's body space (feet at the origin; the tee's front is at z 0.16, its top at 1.33). */
export const REGALIA_GEOMETRY = bake([
  ...side(1),
  ...side(-1),
  { size: [0.17, 0.03, 0.012], at: [0, 1.36, -0.11], color: K.ribbon },
  { size: [0.12, 0.022, 0], at: [0, 1.08, 0.2], color: K.medal, disc: true },
]);

/** One material for both parts (vertex colours), a little smoother than the clothes. */
export const GRAD_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
```

Create `src/world/scene/GraduationCap.tsx`:

```tsx
import { CAP_GEOMETRY, GRAD_MATERIAL, REGALIA_GEOMETRY } from "./graduation";

/** The mortarboard (one draw call), its base at the group origin: on Ezra's head part and in the tour's cap toss. */
export function GraduationCap({ cast = true }: { cast?: boolean }) {
  return <mesh geometry={CAP_GEOMETRY} material={GRAD_MATERIAL} castShadow={cast} />;
}

/** Collar band and medal (one draw call), in Ezra's body space. */
export function GraduationRegalia({ cast = true }: { cast?: boolean }) {
  return <mesh geometry={REGALIA_GEOMETRY} material={GRAD_MATERIAL} castShadow={cast} receiveShadow={cast} />;
}
```

Create `src/world/scene/milestones/moment.ts`:

```ts
import type { Vec3 } from "@/world/engine/types";

/** Ezra gets the cap the first time he comes this close (horizontally, blocks) to the graduation pillar (spec §7.2). */
export const CAP_RADIUS = 2.5;
/** …and no more than this far above or below its foot (so the GTID deck above or a fall below doesn't count). */
const CAP_DY = 3;

/** Within CAP_RADIUS of the pillar's foot, horizontally, and about level with it. */
export function nearMilestone(feet: Vec3, foot: Vec3, radius = CAP_RADIUS): boolean {
  return Math.hypot(feet.x - foot.x, feet.z - foot.z) <= radius && Math.abs(feet.y - foot.y) < CAP_DY;
}

/** The tour progress moved forward across `at` this frame (prev < 0 means "no previous frame yet"). */
export function crossedForward(prev: number, now: number, at: number): boolean {
  return prev >= 0 && prev < at && now >= at;
}

/** The tour cap toss: up off the pillar top and back down onto it, spinning. */
export const TOSS = { duration: 1.4, height: 2.6, turns: 2 } as const;

/** Pose of the tossed cap `t` seconds in: height above its rest point, yaw spin, a wobble tilt, and whether it landed. */
export function tossPose(t: number): { y: number; spin: number; tilt: number; done: boolean } {
  const k = Math.min(1, Math.max(0, t / TOSS.duration));
  const ease = 1 - (1 - k) * (1 - k);
  return {
    y: 4 * TOSS.height * k * (1 - k),
    spin: ease * TOSS.turns * Math.PI * 2,
    tilt: 0.35 * Math.sin(Math.PI * k),
    done: k >= 1,
  };
}

/** Scale of the cap popping onto Ezra's head `t` seconds after it appears: 0 → a 15 % overshoot → 1 within 0.3 s. */
export function capPopScale(t: number): number {
  if (t <= 0) return 0;
  if (t >= 0.3) return 1;
  const k = t / 0.3;
  const back = 2.2;
  const s = k - 1;
  return 1 + (back + 1) * s * s * s + back * s * s;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/world/scene/graduation.test.ts src/world/scene/milestones src/world/engine/audio`
Expected: PASS, `Test Files  6 passed (6)`, `Tests  26 passed (26)`:
- `graduation.test.ts` 4, `moment.test.ts` 4;
- `placement.test.ts` 9, `plaque.test.ts` 2, `stamp.test.ts` 2;
- `sfx.test.ts` 5.

- [ ] **Step 6: Ezra wears the outfit**

`src/world/scene/Ezra.tsx`, the imports. Old:
```tsx
import { LEG, pickAnim, poseFor } from "./ezra/anim";
```
New:
```tsx
import { LEG, pickAnim, poseFor } from "./ezra/anim";
import { CAP_ON_HEAD_Y } from "./graduation";
import { GraduationCap, GraduationRegalia } from "./GraduationCap";
import { capPopScale } from "./milestones/moment";
```

The refs and the frame callback's signature. Old:
```tsx
  const head = useRef<THREE.Group>(null);

  useFrame((state) => {
```
New:
```tsx
  const head = useRef<THREE.Group>(null);
  const cap = useRef<THREE.Group>(null);
  const regalia = useRef<THREE.Group>(null);
  const capAge = useRef(0);

  useFrame((state, dt) => {
```

C2's closeup check also covers the fast travel's hidden phase (C7). Old:
```tsx
    // in a closeup he would stand in front of a low screen
    if (runtime.closeup !== null) {
```
New:
```tsx
    // between a fast travel's two puffs he is gone; in a closeup he would stand in front of a low screen
    if (runtime.hidden || runtime.closeup !== null) {
```

The outfit, after the head pose. Old:
```tsx
    head.current.rotation.set(pose.headPitch, pose.headYaw, 0);
```
New:
```tsx
    head.current.rotation.set(pose.headPitch, pose.headYaw, 0);
    // the graduation outfit (Play moment): the cap pops on with a small overshoot, the collar and medal just appear
    if (cap.current && regalia.current) {
      const on = runtime.capOn;
      cap.current.visible = on;
      regalia.current.visible = on;
      capAge.current = on ? capAge.current + dt : 0;
      if (on) cap.current.scale.setScalar(reduced ? 1 : Math.max(0.001, capPopScale(capAge.current)));
    }
```

The model: the cap rides the head group, and the regalia rides the body group. Old:
```tsx
        <group ref={head} position={[0, 1.36, 0]}>
          <mesh geometry={GEO.head} material={MAT} castShadow={cast} receiveShadow={cast} />
        </group>
```
New:
```tsx
        <group ref={head} position={[0, 1.36, 0]}>
          <mesh geometry={GEO.head} material={MAT} castShadow={cast} receiveShadow={cast} />
          <group ref={cap} position={[0, CAP_ON_HEAD_Y, 0]} visible={false}>
            <GraduationCap cast={cast} />
          </group>
        </group>
        <group ref={regalia} visible={false}>
          <GraduationRegalia cast={cast} />
        </group>
```

- [ ] **Step 7: The moment at the graduation pillar**

Replace `src/world/scene/milestones/Milestones.tsx`. `Pillar` is unchanged from C5. The changes:
- `GraduationMoment` is new.
- `Milestones` gains the replay flag that the graduation pillar's click sets.

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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
import { nearestTrackProgress, trackFor } from "@/world/scene/tour/tourMotion";
import { TOSS, crossedForward, nearMilestone, tossPose } from "./moment";
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

/**
 * The graduation moment (spec §7.2). Play: the first time Ezra comes within CAP_RADIUS of the graduation pillar he gets
 * the cap and regalia (runtime.capOn, Ezra.tsx), with confetti and a pop. Tour: the first time a page load's tour
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
    const toss = () => {
      runtime.capToss = t;
      runtime.particles.burst({ x: st.top.x, y: st.top.y + 0.3, z: st.top.z }, "confetti");
      playSfx("pop");
    };
    if (world.mode === "play") {
      st.prev = -1;
      const p = runtime.player.pos;
      const confetti = () => {
        runtime.particles.burst({ x: p.x, y: p.y + 2.1, z: p.z }, "confetti");
        playSfx("pop");
      };
      if (!runtime.capOn && !runtime.travel && nearMilestone(p, spot.pos)) {
        runtime.capOn = true;
        confetti();
      }
      if (replay.current) {
        replay.current = false;
        confetti();
      }
    } else {
      const path = runtime.tourPath;
      if (path && path !== st.path) {
        st.path = path;
        st.at = nearestTrackProgress(trackFor(path), watchPoint(path.stops, st.top));
        st.prev = -1;
      }
      const prog = runtime.tourProgress;
      if (replay.current) {
        replay.current = false;
        toss();
      } else if (runtime.capToss === null && crossedForward(st.prev, prog, st.at)) toss();
      st.prev = prog;
    }
    const g = cap.current;
    if (!g) return;
    // hidden before the first toss, and resting on the pillar only while Ezra isn't wearing his own
    const age = runtime.capToss === null ? -1 : t - runtime.capToss;
    const flying = age >= 0 && age < TOSS.duration && !world.reducedMotion;
    g.visible = age >= 0 && (flying || !runtime.capOn);
    if (!g.visible) return;
    const pose = tossPose(flying ? age : TOSS.duration);
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
```

- [ ] **Step 8: Type check and lint**

Run: `npx tsc -b && npx eslint src/world`
Expected: no output. The moment itself is checked by hand in C8's checklist: the Play trigger needs walking to GTID, and the toss needs scrolling past the bridge.

- [ ] **Step 9: Commit**

```bash
git add src/world/scene/graduation.ts src/world/scene/graduation.test.ts src/world/scene/GraduationCap.tsx src/world/scene/milestones/moment.ts src/world/scene/milestones/moment.test.ts src/world/scene/milestones/Milestones.tsx src/world/state/runtime.ts src/world/engine/audio/sfx.ts src/world/engine/audio/sfx.test.ts src/world/scene/Ezra.tsx
git commit -q -F - <<'EOF'
feat(world): graduation moment with cap, regalia and tour toss

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task C7: Map boards and fast travel

One map board stands on each of the nine islands, near its arrival point (spec §8).

**The board:**
- It is a `LiveScreen` (480 × 300 logical, 1.5 × 0.9375 blocks) in a wooden bezel on one post.
- It draws the live layout from above:
  - islands as grass hulls with an earth sliver under them, laid out along the tour (each stop further right, further from the camera higher up);
  - bridges as plank lines, the minecart as a dashed rail, bounce pads as a dotted arc;
  - island names (`islandTitle`), a red pin on the board's own island and "You are here: <name>" in the header;
  - a white ring on the cursor island;
  - a button bar: ‹, "Travel to <name>" (or "You are here" on the board's own island) and ›.

**Using it:**
- Activating the board opens the closeup (Part B's flow).
- Tapping an island, pressing "Travel to …" or pressing Enter travels; ‹ › and the arrow keys move the cursor in tour order.
- In **Tour**, the closeup closes and the page scrolls to the island's stop (`scrollToIsland`).
- In **Play**, the closeup closes and Ezra travels:
  1. a dust puff and a `poof`, and he vanishes;
  2. the screen fades over the last 0.2 s;
  3. he moves to a landing column on the destination (`landingColumn`, nearest its tour stop's target, facing away from that camera);
  4. a landing puff and a `poof`, and the fade lifts over 0.35 s.

Input is ignored meanwhile. A second pick during a travel, the island he stands on and unknown ids are ignored.

**Files:**
- Create: `src/world/scene/screens/map/mapModel.ts`, `mapModel.test.ts`, `mapDraw.ts`, `index.ts` (under `src/world/scene/screens/map/`); `src/world/scene/travel.ts`, `src/world/scene/travel.test.ts`; `src/world/scene/islands/shared/MapBoard.tsx`
- Modify: `src/world/scene/PlayerController.tsx`; the nine island components `src/world/scene/islands/{Hero,Gtid,PetakUmpet,OrbitStore,EzraBot,Plaza,PosMonosuko,BeeCrm,PeduliPasal}.tsx`

**Interfaces:**
- Consumes:
  - `WorldLayout`, `CrossingKind`, `IslandPlacement`, `CHAIN_DIR` (Part A layout), `generateIsland` (outlines), `islandTitle`;
  - `ScreenApp`, `HitRegion`, `hitAt`, `roundRect`, `fakeCtx`, `LiveScreen` (Part B), `closeCloseup` (`closeupState.ts`);
  - `scrollToIsland` (`tour/scrollToIsland`), `islandUnder` and `landingColumn` (`modes`), `islandTop`;
  - `runtime.travel` / `runtime.hidden` (C6), `MAP_BOARD` and each island's `map` (C1).
- Produces: the master's `mapApp` and `startTravel`; `MapState`, the map model exports, `drawMap`, `stepTravel`, `travelFade`, `arrivalSpot`, `TRAVEL_OUT`, `TRAVEL_IN`, `MapBoard`; the closeup ids `map-<island id>`.

- [ ] **Step 1: Write the failing tests**

Create `src/world/scene/screens/map/mapModel.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { islandTitle } from "@/world/scene/islands/shared/project";
import { hitAt } from "../types";
import { fakeCtx } from "../testing/fakeCtx";
import { LABEL_CHAR_W, MAP_AREA, MAP_BUTTONS, buildMapModel, initialCursor, mapKeyButton, mapRegions, projectTopDown, stepIsland } from "./mapModel";
import { mapApp } from "./index";

const layout = buildLayout(worldProjects);
const NOW = new Date(2026, 9, 14, 9, 0, 0);
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("map model", () => {
  const model = buildMapModel(layout, "gtid");

  it("has every island of the layout, in tour order, named like the rest of the world", () => {
    expect(model.islands.map((i) => i.id)).toEqual(layout.tourOrder);
    for (const i of model.islands) expect(i.name).toBe(islandTitle(i.id));
  });

  it("reads like the tour: each next stop further right, and further from the tour camera means higher up", () => {
    const xs = model.islands.map((i) => i.c.x);
    for (let k = 1; k < xs.length; k++) expect(xs[k], layout.tourOrder[k]).toBeGreaterThan(xs[k - 1]);
    const byId = Object.fromEntries(layout.islands.map((p) => [p.id, p]));
    const v = (id: string) => projectTopDown({ x: byId[id].origin.x + 0.5, z: byId[id].origin.z + 0.5 }).v;
    const c = (id: string) => model.islands.find((i) => i.id === id)!.c;
    for (const [a, b] of [["orbit-store", "petak-umpet"], ["gtid", "hero"]] as const) {
      expect(v(a)).toBeGreaterThan(v(b));
      expect(c(a).y).toBeLessThan(c(b).y);
    }
  });

  it("gives every island one hit region that travels there, none overlapping, all inside the map area", () => {
    const regions = model.islands.map((i) => i.region);
    regions.forEach((r, i) => {
      expect(r.action).toBe("go");
      expect(r.arg).toBe(i);
      expect(r.x).toBeGreaterThanOrEqual(MAP_AREA.x);
      expect(r.y).toBeGreaterThanOrEqual(MAP_AREA.y);
      expect(r.x + r.w).toBeLessThanOrEqual(MAP_AREA.x + MAP_AREA.w);
      expect(r.y + r.h).toBeLessThanOrEqual(MAP_AREA.y + MAP_AREA.h);
      expect(r.w).toBeGreaterThanOrEqual(8);
      for (let j = i + 1; j < regions.length; j++) expect(overlaps(r, regions[j]), `${model.islands[i].id} vs ${model.islands[j].id}`).toBe(false);
      for (const b of Object.values(MAP_BUTTONS)) expect(overlaps(r, b)).toBe(false);
    });
  });

  it("keeps every name inside the map area and clear of every other name", () => {
    const boxes = model.islands.map((i) => {
      const w = i.name.length * LABEL_CHAR_W;
      return { id: i.id, x0: i.label.x - w / 2, x1: i.label.x + w / 2, y0: i.label.y - 9, y1: i.label.y + 2 };
    });
    for (const [k, b] of boxes.entries()) {
      expect(b.x0, b.id).toBeGreaterThanOrEqual(MAP_AREA.x);
      expect(b.x1, b.id).toBeLessThanOrEqual(MAP_AREA.x + MAP_AREA.w);
      expect(b.y0, b.id).toBeGreaterThanOrEqual(MAP_AREA.y);
      expect(b.y1, b.id).toBeLessThanOrEqual(MAP_AREA.y + MAP_AREA.h);
      for (const o of boxes.slice(k + 1)) expect(b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1, `${b.id} vs ${o.id}`).toBe(false);
    }
  });

  it("marks the board's own island as here, for every island", () => {
    for (const [i, id] of layout.tourOrder.entries()) expect(buildMapModel(layout, id).here).toBe(i);
  });

  it("draws one line per crossing, with its kind", () => {
    expect(model.links.map((l) => l.kind)).toEqual(layout.crossings.map((c) => c.kind));
  });

  it("steps the cursor in tour order, wrapping, and starts it on the next stop", () => {
    const last = model.islands.length - 1;
    expect(stepIsland(model, 0, -1)).toBe(last);
    expect(stepIsland(model, last, 1)).toBe(0);
    expect(initialCursor(model)).toBe(model.here + 1);
    expect(initialCursor(buildMapModel(layout, layout.tourOrder[last]))).toBe(0);
  });

  it("maps the arrow keys and Enter to the button bar", () => {
    expect(mapKeyButton("ArrowLeft")).toBe("prev");
    expect(mapKeyButton("ArrowUp")).toBe("prev");
    expect(mapKeyButton("ArrowRight")).toBe("next");
    expect(mapKeyButton("ArrowDown")).toBe("next");
    expect(mapKeyButton("Enter")).toBe("go");
    expect(mapKeyButton("NumpadEnter")).toBe("go");
    expect(mapKeyButton("KeyW")).toBeNull();
  });
});

describe("mapApp", () => {
  it("is a 480 × 300 board whose taps on an island travel to it", () => {
    const travel = vi.fn();
    const app = mapApp(layout, "hero", travel);
    expect(app.logical).toEqual({ w: 480, h: 300 });
    const model = buildMapModel(layout, "hero");
    const regions = app.draw(fakeCtx(), app.init(NOW), 0);
    expect(regions).toEqual(mapRegions(model));
    for (const isl of model.islands) {
      const r = hitAt(regions, isl.c.x, isl.c.y);
      expect(r?.action, isl.id).toBe("go");
      app.act(app.init(NOW), r!.action, r!.arg, 0);
      expect(travel).toHaveBeenLastCalledWith(isl.id);
    }
    expect(travel).toHaveBeenCalledTimes(model.islands.length);
  });

  it("moves the cursor with ‹ › and the arrow keys, and Enter or 'Travel to' goes to the cursor island", () => {
    const travel = vi.fn();
    const app = mapApp(layout, "hero", travel);
    const s0 = app.init(NOW);
    expect(s0.cursor).toBe(1);
    const s1 = app.key!(s0, "ArrowRight", 0)!;
    expect(s1.cursor).toBe(2);
    expect(app.key!(s1, "ArrowLeft", 0)!.cursor).toBe(1);
    expect(app.act(s1, "prev", undefined, 0).cursor).toBe(1);
    expect(app.act(s1, "next", undefined, 0).cursor).toBe(3);
    expect(app.key!(s1, "KeyQ", 0)).toBeNull();
    expect(travel).not.toHaveBeenCalled();
    expect(app.key!(s1, "Enter", 0)).toEqual(s1);
    expect(travel).toHaveBeenLastCalledWith(layout.tourOrder[2]);
    app.act(s1, "go", undefined, 0);
    expect(travel).toHaveBeenLastCalledWith(layout.tourOrder[2]);
    const goCentre = { x: MAP_BUTTONS.go.x + MAP_BUTTONS.go.w / 2, y: MAP_BUTTONS.go.y + MAP_BUTTONS.go.h / 2 };
    expect(hitAt(app.draw(fakeCtx(), s1, 0), goCentre.x, goCentre.y)?.action).toBe("go");
  });

  it("never animates or runs an idle demo", () => {
    const app = mapApp(layout, "gtid", () => undefined);
    const s = app.init(NOW);
    expect(app.busy(s, 5)).toBe(false);
    expect(app.auto(s, 5)).toBeNull();
  });
});
```

Create `src/world/scene/travel.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ scrollToIsland: vi.fn(), closeCloseup: vi.fn() }));
vi.mock("./tour/scrollToIsland", () => ({ scrollToIsland: mocks.scrollToIsland }));
vi.mock("./closeupState", () => ({ closeCloseup: mocks.closeCloseup }));

import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { buildWorld } from "@/world/engine/worldBuild";
import { islandTop } from "./islands/types";
import { TRAVEL_IN, TRAVEL_OUT, arrivalSpot, startTravel, stepTravel, travelFade } from "./travel";

const standOn = (id: string) => {
  const p = runtime.islandById(id);
  Object.assign(runtime.player.pos, { x: p.origin.x + 0.5, y: p.origin.y + 1, z: p.origin.z + 0.5 });
};

describe("startTravel", () => {
  beforeEach(() => {
    mocks.scrollToIsland.mockClear();
    mocks.closeCloseup.mockClear();
    runtime.travel = null;
    useWorld.setState({ mode: "tour" });
  });

  it("Tour: closes the closeup and scrolls to the island's stop", () => {
    startTravel("orbit-store");
    expect(mocks.closeCloseup).toHaveBeenCalledOnce();
    expect(mocks.scrollToIsland).toHaveBeenCalledWith("orbit-store");
    expect(runtime.travel).toBeNull();
  });

  it("Play: closes the closeup and starts the puff-away phase toward the island", () => {
    useWorld.setState({ mode: "play" });
    standOn("hero");
    startTravel("pedulipasal");
    expect(mocks.closeCloseup).toHaveBeenCalledOnce();
    expect(mocks.scrollToIsland).not.toHaveBeenCalled();
    expect(runtime.travel).toEqual({ to: "pedulipasal", phase: "out", t: 0 });
  });

  it("Play: ignores a second pick while travelling, and the island Ezra already stands on", () => {
    useWorld.setState({ mode: "play" });
    standOn("hero");
    startTravel("gtid");
    startTravel("orbit-store");
    expect(runtime.travel?.to).toBe("gtid");
    runtime.travel = null;
    startTravel("hero");
    expect(runtime.travel).toBeNull();
    expect(mocks.closeCloseup).toHaveBeenCalledTimes(2);
  });

  it("ignores ids that are not islands", () => {
    startTravel("nope");
    expect(mocks.closeCloseup).not.toHaveBeenCalled();
    expect(mocks.scrollToIsland).not.toHaveBeenCalled();
  });
});

describe("stepTravel", () => {
  it("vanishes on the first step, arrives when the out phase ends, and is done after the in phase", () => {
    const tr = { phase: "out" as "out" | "in", t: 0 };
    const events: string[] = [];
    for (let k = 0; k < 60 && events[events.length - 1] !== "done"; k++) {
      const e = stepTravel(tr, 1 / 60);
      if (e) events.push(e);
    }
    expect(events).toEqual(["vanish", "arrive", "done"]);
  });

  it("still vanishes first when one frame is longer than the whole out phase", () => {
    const tr = { phase: "out" as "out" | "in", t: 0 };
    expect(stepTravel(tr, 1)).toBe("vanish");
    expect(stepTravel(tr, 1)).toBe("arrive");
    expect(stepTravel(tr, 1)).toBe("done");
  });

  it("fades the screen to black just before the move and back after it", () => {
    expect(travelFade({ phase: "out", t: 0.05 })).toBe(0);
    expect(travelFade({ phase: "out", t: TRAVEL_OUT })).toBe(1);
    expect(travelFade({ phase: "in", t: 0 })).toBe(1);
    expect(travelFade({ phase: "in", t: TRAVEL_IN })).toBe(0);
  });
});

describe("arrivalSpot", () => {
  const built = buildWorld(runtime.layout);
  it("lands on open grass of the island, feet on its walking surface, facing away from the stop's camera", () => {
    for (const id of ["gtid", "pedulipasal"]) {
      const island = runtime.islandById(id);
      const top = islandTop(island);
      const camera = { x: top.x - 4, y: top.y + 6, z: top.z + 12 };
      const { pos, heading } = arrivalSpot(built.grid.isSolid, island, { camera, target: top });
      expect(pos.y).toBe(island.origin.y + 1);
      expect(built.grid.isSolid(Math.floor(pos.x), island.origin.y, Math.floor(pos.z))).toBe(true);
      expect(built.grid.isSolid(Math.floor(pos.x), island.origin.y + 1, Math.floor(pos.z))).toBe(false);
      expect(Math.hypot(pos.x - top.x, pos.z - top.z)).toBeLessThan(island.radius);
      expect(heading).toBeCloseTo(Math.atan2(pos.x - camera.x, pos.z - camera.z), 9);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/screens/map src/world/scene/travel.test.ts`
Expected: FAIL: `Failed to resolve import "./mapModel"` and `Failed to resolve import "./travel"`.

- [ ] **Step 3: The map model**

How the model is built:
- `projectTopDown` maps world x/z to `u` along `CHAIN_DIR` and `v` along `(CHAIN_DIR.z, −CHAIN_DIR.x)`, further from the tour camera.
- Each island's outline is the convex hull of its grass-top block corners.
- `buildMapModel` fits all outlines into `MAP_AREA`, leaving room for names above, below and at the sides.
- A name goes above its island when the island sits higher than its neighbours on average, else below. If it would overlap a name already placed, it slides sideways by up to ±12 px, then tries the other side.
- Each island's hit region is a square around its centre, as large as the gap to its nearest neighbour allows, clamped to the map area.

Create `src/world/scene/screens/map/mapModel.ts`:

```ts
import { generateIsland } from "@/world/engine/gen/islandGen";
import { CHAIN_DIR, type CrossingKind, type IslandPlacement, type WorldLayout } from "@/world/engine/gen/layout";
import { islandTitle } from "@/world/scene/islands/shared/project";
import type { HitRegion } from "../types";

/** The map canvas in drawing units (LiveScreen renders it at SCREEN_SCALE): 16:10, the board's 1.5 × 0.9375 face. */
export const MAP_LOGICAL = { w: 480, h: 300 } as const;
/** Where the islands are drawn: under the title row, above the button bar. */
export const MAP_AREA = { x: 12, y: 30, w: 456, h: 222 } as const;
/** Room kept above and below the islands inside MAP_AREA for their names, and at its sides. */
const LABEL_ROOM = 15;
const SIDE_ROOM = 22;
/** Names are drawn at 9.5 px: this many drawing units per character is a safe width estimate (about 0.52 em). */
export const LABEL_CHAR_W = 4.95;
/** Air kept on each side of a name when names are placed. */
const LABEL_GAP = 4;
/** The button bar: previous, "Travel to …", next. The board's arrow keys and Enter press these (MapBoard.tsx). */
export const MAP_BUTTONS = {
  prev: { x: 12, y: 260, w: 44, h: 30 },
  go: { x: 64, y: 260, w: 352, h: 30 },
  next: { x: 424, y: 260, w: 44, h: 30 },
} as const;
export type MapButton = keyof typeof MAP_BUTTONS;

export interface MapPoint { x: number; y: number }
export interface MapIsland {
  id: string;
  name: string;
  /** centre and rim on the canvas */
  c: MapPoint;
  outline: MapPoint[];
  /** where the name goes: centred on x, baseline y */
  label: MapPoint;
  region: HitRegion;
}
export interface MapLink { kind: CrossingKind; a: MapPoint; b: MapPoint }
export interface MapModel { islands: MapIsland[]; links: MapLink[]; here: number; scale: number }

/** The tour framings' forward (CHAIN_DIR is their screen-right): further from the tour camera is further along it. */
const MAP_UP = { x: CHAIN_DIR.z, z: -CHAIN_DIR.x };

/**
 * Top-down projection that reads like the tour: u runs along the framings' screen-right (CHAIN_DIR, the way the tour
 * travels), v along their forward (away from the camera). On the canvas u grows to the right and v grows upward.
 */
export function projectTopDown(p: { x: number; z: number }): { u: number; v: number } {
  return { u: p.x * CHAIN_DIR.x + p.z * CHAIN_DIR.z, v: p.x * MAP_UP.x + p.z * MAP_UP.z };
}

/** Convex hull (monotone chain) of points, counter-clockwise. */
function hull(pts: { u: number; v: number }[]): { u: number; v: number }[] {
  const p = [...pts].sort((a, b) => a.u - b.u || a.v - b.v);
  const cross = (o: { u: number; v: number }, a: { u: number; v: number }, b: { u: number; v: number }) =>
    (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
  const lower: typeof p = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: typeof p = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** An island's outline from above, in map coordinates: the convex hull of its real grass top's block corners. */
export function islandOutline(p: IslandPlacement): { u: number; v: number }[] {
  const top = generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0);
  const corners = top.flatMap((c) =>
    [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dz]) => projectTopDown({ x: p.origin.x + c.x + dx, z: p.origin.z + c.z + dz })),
  );
  return hull(corners);
}

/** Builds the map from the live layout: islands in tour order (others after), their outlines, crossings and hit regions. */
export function buildMapModel(layout: WorldLayout, here: string): MapModel {
  const ordered = [
    ...layout.tourOrder.map((id) => layout.islands.find((i) => i.id === id)).filter((p): p is IslandPlacement => !!p),
    ...layout.islands.filter((p) => !layout.tourOrder.includes(p.id)),
  ];
  const rims = ordered.map(islandOutline);
  const all = rims.flat();
  const u0 = Math.min(...all.map((q) => q.u));
  const u1 = Math.max(...all.map((q) => q.u));
  const v0 = Math.min(...all.map((q) => q.v));
  const v1 = Math.max(...all.map((q) => q.v));
  const innerW = MAP_AREA.w - 2 * SIDE_ROOM;
  const innerH = MAP_AREA.h - 2 * LABEL_ROOM;
  const scale = Math.min(innerW / (u1 - u0), innerH / (v1 - v0));
  const ox = MAP_AREA.x + (MAP_AREA.w - (u1 - u0) * scale) / 2;
  const oy = MAP_AREA.y + LABEL_ROOM + (innerH - (v1 - v0) * scale) / 2;
  const toCanvas = (q: { u: number; v: number }): MapPoint => ({ x: ox + (q.u - u0) * scale, y: oy + (v1 - q.v) * scale });

  const centres = ordered.map((p) => toCanvas(projectTopDown({ x: p.origin.x + 0.5, z: p.origin.z + 0.5 })));
  const vOf = ordered.map((p) => projectTopDown({ x: p.origin.x + 0.5, z: p.origin.z + 0.5 }).v);
  const outlines = rims.map((r) => r.map(toCanvas));
  // a name goes above its island when the island sits further back than its tour neighbours, else below; a name that
  // would overlap an earlier one first slides sideways a little, then tries the other side
  type Box = { x0: number; x1: number; y0: number; y1: number };
  const placed: Box[] = [];
  const clash = (b: Box) => placed.some((o) => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1);
  const labels = ordered.map((p, i) => {
    const near = [vOf[i - 1], vOf[i + 1]].filter((v): v is number => v !== undefined);
    const prefer = near.length > 0 && vOf[i] > near.reduce((a, b) => a + b, 0) / near.length;
    const top = Math.min(...outlines[i].map((q) => q.y));
    const bottom = Math.max(...outlines[i].map((q) => q.y));
    const w = islandTitle(p.id).length * LABEL_CHAR_W;
    const at = (above: boolean, dx: number) => {
      const x = Math.min(MAP_AREA.x + MAP_AREA.w - w / 2 - 2, Math.max(MAP_AREA.x + w / 2 + 2, centres[i].x + dx));
      const y = above ? top - 4 : bottom + 11;
      // LABEL_GAP of air on each side: two names never touch ("POS MonosukoPeduliPasal")
      return { x, y, box: { x0: x - w / 2 - LABEL_GAP, x1: x + w / 2 + LABEL_GAP, y0: y - 9, y1: y + 2 } };
    };
    const tries = [at(prefer, 0), at(prefer, 12), at(prefer, -12), at(!prefer, 0), at(!prefer, 12), at(!prefer, -12)];
    const l = tries.find((c) => !clash(c.box)) ?? tries[0];
    placed.push(l.box);
    return l;
  });

  const islands = ordered.map((p, i): MapIsland => {
    const outline = outlines[i];
    const c = centres[i];
    // a square around the centre, never reaching half way to another island's centre (so no two overlap)
    const reach = Math.max(...outline.map((q) => Math.hypot(q.x - c.x, q.y - c.y)));
    const gap = Math.min(...centres.filter((_, j) => j !== i).map((o) => Math.max(Math.abs(o.x - c.x), Math.abs(o.y - c.y))));
    const half = Math.max(4, Math.min(reach + 4, gap / 2 - 1));
    const x0 = Math.max(MAP_AREA.x, c.x - half);
    const y0 = Math.max(MAP_AREA.y, c.y - half);
    const x1 = Math.min(MAP_AREA.x + MAP_AREA.w, c.x + half);
    const y1 = Math.min(MAP_AREA.y + MAP_AREA.h, c.y + half);
    return {
      id: p.id,
      name: islandTitle(p.id),
      c,
      outline,
      label: { x: labels[i].x, y: labels[i].y },
      region: { x: x0, y: y0, w: x1 - x0, h: y1 - y0, action: "go", arg: i },
    };
  });

  const index = new Map(ordered.map((p, i) => [p.id, i]));
  const links = layout.crossings
    .filter((c) => index.has(c.from) && index.has(c.to))
    .map((c): MapLink => ({ kind: c.kind, a: toCanvas(projectTopDown(c.a)), b: toCanvas(projectTopDown(c.b)) }));
  return { islands, links, here: Math.max(0, index.get(here) ?? 0), scale };
}

/** Every hit region on the map: one per island (action "go", arg = island index), then the three buttons. */
export function mapRegions(model: MapModel): HitRegion[] {
  return [
    ...model.islands.map((i) => i.region),
    { ...MAP_BUTTONS.prev, action: "prev" },
    { ...MAP_BUTTONS.go, action: "go" },
    { ...MAP_BUTTONS.next, action: "next" },
  ];
}

/** The island `dir` steps from `from` in tour order, wrapping round. */
export function stepIsland(model: MapModel, from: number, dir: 1 | -1): number {
  const n = model.islands.length;
  return (((from + dir) % n) + n) % n;
}

/** Where the cursor starts: the next stop after the board's own island. */
export function initialCursor(model: MapModel): number {
  return stepIsland(model, model.here, 1);
}

/** The button a key presses on a map board in closeup (arrows step the cursor, Enter travels), or null. */
export function mapKeyButton(code: string): MapButton | null {
  if (code === "ArrowLeft" || code === "ArrowUp") return "prev";
  if (code === "ArrowRight" || code === "ArrowDown") return "next";
  if (code === "Enter" || code === "NumpadEnter") return "go";
  return null;
}
```

Create `src/world/scene/screens/map/mapDraw.ts`:

```ts
import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { roundRect } from "../format";
import { MAP_AREA, MAP_BUTTONS, MAP_LOGICAL } from "./mapModel";
import type { MapModel, MapPoint } from "./mapModel";

/** Wooden map-board colours: parchment, a pale sky, grass islands, plank bridges, iron rails. */
const C = {
  paper: "#efe6cf",
  sky: "#d6e5ea",
  skyLine: "#bfd3da",
  grass: "#8ea769",
  rim: "#5f7a45",
  earth: "#94714f",
  plank: "#8a6644",
  rail: "#3b3f44",
  arc: "#7c6f62",
  ink: "#2f2116",
  ink2: "#6b5640",
  here: "#c8432f",
  cursor: "#ffffff",
  button: "#f8f2e2",
  buttonLine: "#c9b893",
};

const font = (weight: number, px: number) => `${weight} ${px}px ${CANVAS_FONTS.ui}`;

function path(ctx: CanvasRenderingContext2D, pts: readonly MapPoint[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** The red "You are here" pin, its point at (x, y). */
function pin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = C.here;
  ctx.beginPath();
  ctx.arc(x, y - 9, 4.5, Math.PI, 0);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y - 9, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

/** A filled triangle pointing left (dir −1) or right (dir 1), centred in the box. */
function arrow(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, dir: 1 | -1) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.beginPath();
  ctx.moveTo(cx + 6 * dir, cy);
  ctx.lineTo(cx - 5 * dir, cy - 7);
  ctx.lineTo(cx - 5 * dir, cy + 7);
  ctx.closePath();
  ctx.fill();
}

/**
 * The map board: every island from above (tour left to right, further from the camera higher up), bridges as plank
 * lines, the minecart as a rail, bounce pads as a dotted arc, names, a "You are here" pin on the board's own island
 * (and its name in the header), a white ring on the cursor island, and the button bar (previous, "Travel to …", next).
 * Paints from the model only.
 */
export function drawMap(ctx: CanvasRenderingContext2D, model: MapModel, cursor: number): void {
  const { w, h } = MAP_LOGICAL;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = font(700, 15);
  ctx.fillText("Map", MAP_AREA.x + 2, 21);
  // "You are here" in the header (a tag on the map would crowd the small islands' names)
  const here = model.islands[model.here];
  ctx.textAlign = "right";
  ctx.font = font(700, 10);
  ctx.fillStyle = C.ink;
  const name = here?.name ?? "";
  ctx.fillText(name, MAP_AREA.x + MAP_AREA.w - 2, 20);
  const nameW = ctx.measureText(name).width;
  ctx.font = font(500, 10);
  ctx.fillStyle = C.ink2;
  ctx.fillText("You are here: ", MAP_AREA.x + MAP_AREA.w - 2 - nameW, 20);
  const labelW = ctx.measureText("You are here: ").width;
  pin(ctx, MAP_AREA.x + MAP_AREA.w - 10 - nameW - labelW, 21);

  roundRect(ctx, MAP_AREA.x, MAP_AREA.y, MAP_AREA.w, MAP_AREA.h, 8);
  ctx.fillStyle = C.sky;
  ctx.fill();
  ctx.strokeStyle = C.skyLine;
  ctx.lineWidth = 1;
  ctx.stroke();

  // crossings under the islands
  ctx.lineCap = "round";
  for (const l of model.links) {
    ctx.beginPath();
    if (l.kind === "bouncePads") {
      const mx = (l.a.x + l.b.x) / 2;
      const my = Math.min(l.a.y, l.b.y) - 10;
      ctx.setLineDash([1.5, 4]);
      ctx.strokeStyle = C.arc;
      ctx.lineWidth = 2;
      ctx.moveTo(l.a.x, l.a.y);
      ctx.quadraticCurveTo(mx, my, l.b.x, l.b.y);
    } else {
      ctx.setLineDash(l.kind === "minecart" ? [5, 3] : []);
      ctx.strokeStyle = l.kind === "minecart" ? C.rail : C.plank;
      ctx.lineWidth = l.kind === "minecart" ? 2 : 3;
      ctx.moveTo(l.a.x, l.a.y);
      ctx.lineTo(l.b.x, l.b.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  model.islands.forEach((isl, i) => {
    // a sliver of earth under the grass reads as a floating island
    ctx.save();
    ctx.translate(0, 2);
    path(ctx, isl.outline);
    ctx.fillStyle = C.earth;
    ctx.fill();
    ctx.restore();
    path(ctx, isl.outline);
    ctx.fillStyle = C.grass;
    ctx.fill();
    ctx.strokeStyle = C.rim;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (i === cursor) {
      ctx.save();
      ctx.translate(isl.c.x, isl.c.y);
      ctx.scale(1.18, 1.18);
      ctx.translate(-isl.c.x, -isl.c.y);
      path(ctx, isl.outline);
      ctx.restore();
      ctx.strokeStyle = C.cursor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  });

  // names, all in one weight: their places were fitted to that width (LABEL_CHAR_W); the ring marks the cursor island
  ctx.textAlign = "center";
  ctx.font = font(500, 9.5);
  ctx.fillStyle = C.ink;
  model.islands.forEach((isl) => {
    ctx.fillText(isl.name, isl.label.x, isl.label.y);
  });

  // the board's own island carries the pin
  if (here) pin(ctx, here.c.x, here.c.y);

  // button bar
  const { prev, go, next } = MAP_BUTTONS;
  for (const b of [prev, go, next]) {
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fillStyle = C.button;
    ctx.fill();
    ctx.strokeStyle = C.buttonLine;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = C.ink;
  arrow(ctx, prev, -1);
  arrow(ctx, next, 1);
  const target = model.islands[cursor];
  const atHome = cursor === model.here;
  ctx.font = font(700, 12);
  ctx.fillStyle = atHome ? C.ink2 : C.ink;
  ctx.fillText(atHome ? "You are here" : `Travel to ${target?.name ?? ""}`, go.x + go.w / 2, go.y + go.h / 2 + 4);
}
```

Create `src/world/scene/screens/map/index.ts`:

```ts
import type { WorldLayout } from "@/world/engine/gen/layout";
import type { ScreenApp } from "../types";
import { drawMap } from "./mapDraw";
import { MAP_LOGICAL, buildMapModel, initialCursor, mapKeyButton, mapRegions, stepIsland } from "./mapModel";

/** The map board's state: the island its button bar points at (arrow keys and the ‹ › buttons move it). */
export interface MapState { cursor: number }

/**
 * A map board's screen app (spec §8): the live layout from above with one hit region per island. Tapping an island (or
 * "Travel to …" / Enter for the cursor island) calls `travel(id)`; ‹ › and the arrow keys move the cursor in tour
 * order. Built once per board: memoise it (LiveScreen keys its state on the app object).
 */
export function mapApp(layout: WorldLayout, here: string, travel: (id: string) => void): ScreenApp<MapState> {
  const model = buildMapModel(layout, here);
  const regions = mapRegions(model);
  const press = (s: MapState, action: string, arg: number | undefined): MapState => {
    if (action === "prev") return { cursor: stepIsland(model, s.cursor, -1) };
    if (action === "next") return { cursor: stepIsland(model, s.cursor, 1) };
    if (action === "go") {
      const i = arg ?? s.cursor;
      const island = model.islands[i];
      if (!island) return s;
      travel(island.id);
      return i === s.cursor ? s : { cursor: i };
    }
    return s;
  };
  return {
    logical: MAP_LOGICAL,
    init: () => ({ cursor: initialCursor(model) }),
    act: (s, action, arg) => press(s, action, arg),
    auto: () => null,
    busy: () => false,
    draw: (ctx, s) => {
      drawMap(ctx, model, s.cursor);
      return regions;
    },
    key: (s, code) => {
      const button = mapKeyButton(code);
      return button ? press(s, button, undefined) : null;
    },
  };
}
```

- [ ] **Step 4: Fast travel**

Create `src/world/scene/travel.ts`:

```ts
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { IsSolid, Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { closeCloseup } from "./closeupState";
import { islandTop } from "./islands/types";
import { islandUnder, landingColumn } from "./modes";
import { scrollToIsland } from "./tour/scrollToIsland";

/** Seconds from the departure puff to the move (the screen fades out over the last FADE of them). */
export const TRAVEL_OUT = 0.35;
/** Seconds from the arrival puff until the fast travel ends (the screen fades back in). */
export const TRAVEL_IN = 0.35;
/** The fade that hides the camera cut at the move. */
const FADE = 0.2;

/**
 * Fast travel from a map board (spec §8). Tour: the closeup closes and the page scrolls to the island's stop. Play: the
 * closeup closes and runtime.travel starts; PlayerController puffs Ezra away, moves him to a landing column on `to`
 * and puffs him back (stepTravel). Ignored while a travel runs, for unknown ids, and (Play) for the island he is on.
 */
export function startTravel(to: string): void {
  if (runtime.travel || !runtime.layout.islands.some((i) => i.id === to)) return;
  closeCloseup();
  if (useWorld.getState().mode !== "play") {
    scrollToIsland(to);
    return;
  }
  const p = runtime.player.pos;
  if (islandUnder(runtime.layout.islands, p.x, p.z)?.id === to) return;
  runtime.travel = { to, phase: "out", t: 0 };
}

export type TravelEvent = "vanish" | "arrive" | "done" | null;

/**
 * Advances a fast travel by `dt` (mutates it). "vanish" on its first step (puff, hide Ezra), "arrive" when the out phase
 * ends (move him, puff, show him), "done" when the in phase ends (clear runtime.travel).
 */
export function stepTravel(tr: { phase: "out" | "in"; t: number }, dt: number): TravelEvent {
  if (tr.phase === "out") {
    if (tr.t === 0) {
      tr.t = Math.max(dt, 1e-6);
      return "vanish";
    }
    tr.t += dt;
    if (tr.t < TRAVEL_OUT) return null;
    tr.phase = "in";
    tr.t = 0;
    return "arrive";
  }
  tr.t += dt;
  return tr.t >= TRAVEL_IN ? "done" : null;
}

/** Opacity of the screen fade during a fast travel: up over the out phase's last FADE seconds, down over the in phase. */
export function travelFade(tr: { phase: "out" | "in"; t: number }): number {
  if (tr.phase === "out") return Math.min(1, Math.max(0, (tr.t - (TRAVEL_OUT - FADE)) / FADE));
  return Math.max(0, 1 - tr.t / TRAVEL_IN);
}

/**
 * Where a fast travel lands on `island`: the landing column (modes.landingColumn: open ground, no prop overhead) nearest
 * its tour stop's look target that the stop's camera can see, feet on the walking surface, facing away from that
 * camera (as Play's drop does). Without a stop: nearest the island's centre, facing +z.
 */
export function arrivalSpot(isSolid: IsSolid, island: IslandPlacement, stop?: { camera: Vec3; target: Vec3 }): { pos: Vec3; heading: number } {
  const col = landingColumn(isSolid, island, stop?.target ?? islandTop(island), stop?.camera);
  const pos = { x: col.x, y: island.origin.y + 1, z: col.z };
  return { pos, heading: stop ? Math.atan2(pos.x - stop.camera.x, pos.z - stop.camera.z) : 0 };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/world/scene/screens/map src/world/scene/travel.test.ts`
Expected: PASS, `Test Files  2 passed (2)`, `Tests  19 passed (19)` (`mapModel.test.ts` 11, `travel.test.ts` 8).

- [ ] **Step 6: `PlayerController` runs the travel**

`src/world/scene/PlayerController.tsx`, the import. Old:
```tsx
import { cutsStandUp, holdDropInput, islandUnder } from "./modes";
```
New:
```tsx
import { cutsStandUp, holdDropInput, islandUnder } from "./modes";
import { arrivalSpot, stepTravel, travelFade } from "./travel";
```

Leaving Play mid-travel shows Ezra again where he is. Old:
```tsx
      if (tmp.fading) {
        tmp.fading = false;
        tmp.fade = 0;
        setFade(0);
      }
      return;
    }
```
New:
```tsx
      if (tmp.fading) {
        tmp.fading = false;
        tmp.fade = 0;
        setFade(0);
      }
      // the same for a fast travel: Ezra shows again where he is
      if (runtime.travel) {
        runtime.travel = null;
        runtime.hidden = false;
        setFade(0);
      }
      return;
    }
```

The travel itself, before rides (no input while it runs). Old:
```tsx
    if (runtime.ride) {
      drainJump();
      const ride = runtime.ride;
```
New:
```tsx
    // fast travel from a map board (travel.ts): puff away, fade, move to a landing column, puff back; no input meanwhile
    const tr = runtime.travel;
    if (tr) {
      drainJump();
      runtime.moving = false;
      runtime.speed = 0;
      const event = stepTravel(tr, dt);
      if (event === "vanish") {
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z }, "dust", { count: 18 });
        playSfx("poof");
        runtime.hidden = true;
      } else if (event === "arrive") {
        const island = runtime.islandById(tr.to);
        const spot = arrivalSpot(built.grid.isSolid, island, runtime.tourPath?.stops.find((s) => s.id === tr.to));
        Object.assign(p.pos, spot.pos);
        Object.assign(p.lastSafe, spot.pos);
        p.vel.x = p.vel.y = p.vel.z = 0;
        p.onGround = true;
        p.sinceGround = 0;
        p.locked = false;
        runtime.heading = spot.heading;
        runtime.landTimer = 0.14;
        useWorld.getState().setActiveIsland(island.id);
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z }, "dust", { count: 18 });
        playSfx("poof");
        runtime.hidden = false;
      } else if (event === "done") {
        runtime.travel = null;
      }
      setFade(runtime.travel ? travelFade(tr) : 0);
      return;
    }

    if (runtime.ride) {
      drainJump();
      const ride = runtime.ride;
```

- [ ] **Step 7: The board component**

Create `src/world/scene/islands/shared/MapBoard.tsx`:

```tsx
import { useMemo } from "react";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { mapApp } from "@/world/scene/screens/map";
import { startTravel } from "@/world/scene/travel";
import { MAP_BOARD } from "../layouts";
import { islandFrame } from "./local";
import { PALETTE } from "./props";

/** The post stands this far behind the face (LiveScreen's bezel is 0.14 deep behind it). */
const POST_BACK = 0.2;
const POST_GEO = new THREE.BoxGeometry(0.12, MAP_BOARD.y, 0.12);
const POST_MAT = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });

/**
 * A map board (spec §8): the live layout as a LiveScreen on one wooden post, a wooden bezel round it. Activating it
 * opens the closeup; an island tap, "Travel to …" or Enter calls startTravel. `at` is island-local (layouts.ts `map`).
 */
export function MapBoard({ placement, at }: { placement: IslandPlacement; at: { x: number; z: number; ry: number } }) {
  // LiveScreen keys its state on the app object: one per board, built once
  const app = useMemo(() => mapApp(runtime.layout, placement.id, startTravel), [placement.id]);
  return (
    <>
      <group position={islandFrame(placement)}>
        <mesh
          geometry={POST_GEO}
          material={POST_MAT}
          position={[at.x - Math.sin(at.ry) * POST_BACK, MAP_BOARD.y / 2, at.z - Math.cos(at.ry) * POST_BACK]}
          rotation={[0, at.ry, 0]}
          castShadow
        />
      </group>
      <LiveScreen
        id={`map-${placement.id}`}
        placement={placement}
        app={app}
        label="Open the map"
        at={{ x: at.x, y: MAP_BOARD.y, z: at.z }}
        rotationY={at.ry}
        size={{ w: MAP_BOARD.w, h: MAP_BOARD.h }}
        bezelColor={PALETTE.wood}
      />
    </>
  );
}
```

- [ ] **Step 8: A board on every island**

In each of the nine island components, import `MapBoard` and render it at the island's `map` spot (C1).

`Hero.tsx`, `Gtid.tsx`, `PetakUmpet.tsx`, `OrbitStore.tsx`, `EzraBot.tsx`, `PosMonosuko.tsx`, `BeeCrm.tsx` and `PeduliPasal.tsx` get the same import. Old:
```tsx
import { InfoBoard } from "./shared/InfoBoard";
```
New:
```tsx
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
```

`Plaza.tsx` has no `InfoBoard`. Old:
```tsx
import { PLAZA } from "./layouts";
```
New:
```tsx
import { PLAZA } from "./layouts";
import { MapBoard } from "./shared/MapBoard";
```

The boards. `Hero.tsx`, old:
```tsx
      <VoxelTitle id="hero-title" placement={placement} at={HERO.title} lines={HERO.title.lines} cell={HERO.title.cell} color="#4a3626" />
```
New:
```tsx
      <VoxelTitle id="hero-title" placement={placement} at={HERO.title} lines={HERO.title.lines} cell={HERO.title.cell} color="#4a3626" />
      <MapBoard placement={placement} at={HERO.map} />
```

`Gtid.tsx`, old:
```tsx
      <Signpost id="gtid-link" placement={placement} at={GTID.link} rotationY={GTID.link.ry} label="Visit gtid.pro" url={project.links.demo} />
```
New:
```tsx
      <Signpost id="gtid-link" placement={placement} at={GTID.link} rotationY={GTID.link.ry} label="Visit gtid.pro" url={project.links.demo} />
      <MapBoard placement={placement} at={GTID.map} />
```

`PetakUmpet.tsx`, old:
```tsx
      <Signpost id="petak-link" placement={placement} at={PETAK.link} rotationY={PETAK.link.ry} label="Play on Roblox" url={project.links.roblox} />
```
New:
```tsx
      <Signpost id="petak-link" placement={placement} at={PETAK.link} rotationY={PETAK.link.ry} label="Play on Roblox" url={project.links.roblox} />
      <MapBoard placement={placement} at={PETAK.map} />
```

`OrbitStore.tsx`, old:
```tsx
      <Signpost id="orbit-link" placement={placement} at={ORBIT.link} rotationY={ORBIT.link.ry} label="Visit Orbit Store" url={project.links.demo} />
```
New:
```tsx
      <Signpost id="orbit-link" placement={placement} at={ORBIT.link} rotationY={ORBIT.link.ry} label="Visit Orbit Store" url={project.links.demo} />
      <MapBoard placement={placement} at={ORBIT.map} />
```

`EzraBot.tsx`, old:
```tsx
      <Signpost id="ezra-link" placement={placement} at={EZRA.link} rotationY={EZRA.link.ry} label="Add to Discord" url={project.links.discord} />
```
New:
```tsx
      <Signpost id="ezra-link" placement={placement} at={EZRA.link} rotationY={EZRA.link.ry} label="Add to Discord" url={project.links.discord} />
      <MapBoard placement={placement} at={EZRA.map} />
```

`Plaza.tsx`, old:
```tsx
      </group>
    </>
```
New:
```tsx
      </group>
      <MapBoard placement={placement} at={PLAZA.map} />
    </>
```

`PosMonosuko.tsx`, old:
```tsx
      <Signpost id="pos-monosuko-link" placement={placement} at={MONOSUKO.link} rotationY={MONOSUKO.link.ry} scale={MINI_SIGN_SCALE} label="Try the POS" url={project.links.demo} />
```
New:
```tsx
      <Signpost id="pos-monosuko-link" placement={placement} at={MONOSUKO.link} rotationY={MONOSUKO.link.ry} scale={MINI_SIGN_SCALE} label="Try the POS" url={project.links.demo} />
      <MapBoard placement={placement} at={MONOSUKO.map} />
```

`BeeCrm.tsx`, old:
```tsx
      <Signpost id="bee-crm-link" placement={placement} at={BEE.link} rotationY={BEE.link.ry} scale={MINI_SIGN_SCALE} label="Try the CRM" url={project.links.demo} />
```
New:
```tsx
      <Signpost id="bee-crm-link" placement={placement} at={BEE.link} rotationY={BEE.link.ry} scale={MINI_SIGN_SCALE} label="Try the CRM" url={project.links.demo} />
      <MapBoard placement={placement} at={BEE.map} />
```

`PeduliPasal.tsx`, old:
```tsx
      <Signpost id="pedulipasal-link" placement={placement} at={PEDULI.link} rotationY={PEDULI.link.ry} scale={MINI_SIGN_SCALE} label="Get the APK" url={project.links.demo} />
```
New:
```tsx
      <Signpost id="pedulipasal-link" placement={placement} at={PEDULI.link} rotationY={PEDULI.link.ry} scale={MINI_SIGN_SCALE} label="Get the APK" url={project.links.demo} />
      <MapBoard placement={placement} at={PEDULI.map} />
```

Check that every island got its board:

Run: `grep -c "<MapBoard" src/world/scene/islands/*.tsx | grep -v ":0"`
Expected: nine lines, each ending in `:1`: `BeeCrm`, `EzraBot`, `Gtid`, `Hero`, `OrbitStore`, `PeduliPasal`, `PetakUmpet`, `Plaza`, `PosMonosuko`.

- [ ] **Step 9: Run the tests, the type check and the linter**

Run: `npx vitest run src/world/scene/screens/map src/world/scene/travel.test.ts src/world/scene/islands`
Expected: PASS, `Test Files  18 passed (18)`, `Tests  106 passed (106)`.

Run: `npx tsc -b && npx eslint src/world`
Expected: no output.

- [ ] **Step 10: Look at the boards and a map closeup**

Run:
```bash
npm run build && npm run shots
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=5&closeup=map-web-plaza" shots/c7-map-plaza.png 1280x720
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=5&closeup=map-web-plaza" shots/c7-map-plaza-phone.png 520x940
SHOT_SETTLE_MS=25000 npm run shot -- "?stop=0&closeup=map-hero" shots/c7-map-hero.png 1280x720
```
(`SHOT_SETTLE_MS=25000` gives the closeup glide time to finish under SwiftShader: see C2 Step 7.)

Expected: 18 `shot …` lines from `npm run shots` and three `shot ->` lines. Check:
- Every stop: the map board stands where the layout puts it.
  - On the hero, it shows above "EZRA", behind the title, and covers no letter.
  - On GTID, it is between the about board and the price board.
  - It never covers a screen, an info board or a link sign by more than a sliver.
- `c7-map-plaza.png`:
  - all nine islands read left to right in tour order;
  - bridges are plank lines, the Petak Umpet → Orbit and Ezra Bot → plaza rails are dashed, and Orbit → Ezra Bot is a dotted arc;
  - every name is readable and no two overlap;
  - the plaza carries the red pin, the header reads "You are here: Web & Apps", and the button reads "Travel to POS Monosuko" with POS Monosuko ringed.
- `c7-map-hero.png`: the pin is on the hero, and the button reads "Travel to GTID".
- `c7-map-plaza-phone.png`: the board is fitted by its height and shows its middle (a map board is landscape, so the phone pans it).

- [ ] **Step 11: Commit**

```bash
git add src/world/scene/screens/map/mapModel.ts src/world/scene/screens/map/mapModel.test.ts src/world/scene/screens/map/mapDraw.ts src/world/scene/screens/map/index.ts src/world/scene/travel.ts src/world/scene/travel.test.ts src/world/scene/PlayerController.tsx src/world/scene/islands/shared/MapBoard.tsx src/world/scene/islands/Hero.tsx src/world/scene/islands/Gtid.tsx src/world/scene/islands/PetakUmpet.tsx src/world/scene/islands/OrbitStore.tsx src/world/scene/islands/EzraBot.tsx src/world/scene/islands/Plaza.tsx src/world/scene/islands/PosMonosuko.tsx src/world/scene/islands/BeeCrm.tsx src/world/scene/islands/PeduliPasal.tsx
git commit -q -F - <<'EOF'
feat(world): map boards on every island with fast travel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task C8: Performance, shots, manual checklist, final checks

**Files:**
- Modify: `src/world/scene/RenderStats.tsx` (replace), `package.json`
- Create: `scripts/draw-calls.mjs`
- Possibly modify: the files named in Step 4, only if a view is over budget.

**Interfaces:**
- Consumes: the dev-only `RenderStats` (Phase 1), `?stop=N` (Phase 1), `?closeup=<id>` (C2), `scripts/shoot-stops.mjs`, `scripts/shot.mjs`.
- Produces: `npm run draw-calls`; the tier in the `[world] … draw calls` log line.

- [ ] **Step 1: Log the quality tier with the draw calls**

Shadows (high tier) add a draw per shadow-casting mesh. A measurement that silently dropped to the low tier would undercount. Replace `src/world/scene/RenderStats.tsx`:

```tsx
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useWorld } from "@/world/state/store";

/** Dev-only: logs draw calls (and the quality tier) every 120 frames and warns above the 200-call budget. */
export function RenderStats() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    if (!import.meta.env.DEV) return;
    frames.current += 1;
    if (frames.current % 120 !== 0) return;
    const { calls, triangles } = gl.info.render;
    const tier = useWorld.getState().quality;
    if (calls > 200) console.warn(`[world] ${calls} draw calls (budget 200), ${triangles} triangles, ${tier} quality`);
    else console.info(`[world] ${calls} draw calls, ${triangles} triangles, ${tier} quality`);
  });
  return null;
}
```

- [ ] **Step 2: The measurement script**

Create `scripts/draw-calls.mjs`:
- It starts its own Vite dev server, because `RenderStats` only logs in dev.
- It opens every tour stop at desktop (1280 × 720) and phone (520 × 940) size, plus the Hero → GTID midpoint (scrolled half way between the two stops).
- It reports the peak `[world] N draw calls` per view.
- It drives system Chrome headless on the machine's GPU (ANGLE D3D11). SwiftShader is too slow for the 120-frame log interval in the wide views.

```js
// Draw calls in the tour's views, measured in a real browser (spec §11): the dev build's RenderStats logs
// "[world] N draw calls, M triangles, <tier> quality" every 120 frames; this reports the highest N per view.
// Usage: npm run draw-calls            → every tour stop and the Hero → GTID midpoint, desktop then phone size
//        npm run draw-calls -- 0 5     → only those stops (the midpoint is measured whenever stops 0 and 1 are)
// Starts its own Vite dev server (DRAW_PORT, default 5199) and drives system Chrome (CHROME env var, else the standard
// Windows path) on the machine's GPU; DRAW_SWIFTSHADER=1 renders in software instead (slow: raise DRAW_SAMPLE_MS).
// DRAW_SAMPLE_MS (default 8000) is how long each view is sampled.
import { createServer } from "vite";
import { chromium } from "playwright-core";

const PORT = Number(process.env.DRAW_PORT ?? 5199);
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SAMPLE_MS = Number(process.env.DRAW_SAMPLE_MS ?? 8000);
const BUDGET = 200;
const SIZES = [["desktop", 1280, 720], ["phone", 520, 940]];
const args = process.argv.slice(2);
const stops = args.length ? args.map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
if (stops.some((n) => !Number.isInteger(n) || n < 0)) throw new Error(`bad stop list "${args.join(" ")}", expected integers ≥ 0`);

const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: "silent" });
await server.listen();
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: process.env.DRAW_SWIFTSHADER
    ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]
    : ["--use-angle=d3d11", "--ignore-gpu-blocklist"],
});

/** Opens `query` at width × height, waits for the world, runs `after(page)` if given, then samples the draw-call log. */
async function measure(label, query, width, height, after) {
  const page = await browser.newPage({ viewport: { width, height } });
  const samples = [];
  page.on("console", (m) => {
    const hit = /\[world\] (\d+) draw calls.*, (\w+) quality/.exec(m.text());
    if (hit) samples.push({ calls: Number(hit[1]), tier: hit[2] });
  });
  page.on("pageerror", (e) => console.error(`[page error] ${e.message}`));
  try {
    await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: "load" });
    await page.waitForSelector("canvas", { state: "attached", timeout: 90000 });
    await page.waitForFunction(() => {
      const loader = document.querySelector(".loader");
      return !loader || loader.classList.contains("loader--done");
    }, null, { timeout: 90000 });
    if (after) await after(page);
    await page.waitForTimeout(3000); // the camera settles before sampling
    samples.length = 0;
    await page.waitForTimeout(SAMPLE_MS);
    const scrollY = await page.evaluate(() => window.scrollY);
    const peak = samples.reduce((best, s) => (s.calls > (best?.calls ?? -1) ? s : best), null);
    const text = peak ? `${peak.calls} draw calls (${peak.tier} quality)${peak.calls > BUDGET ? `  OVER BUDGET (${BUDGET})` : ""}` : "no sample (raise DRAW_SAMPLE_MS)";
    console.log(`${label.padEnd(30)} ${text}`);
    if (peak?.calls > BUDGET) process.exitCode = 1;
    return scrollY;
  } finally {
    await page.close();
  }
}

try {
  for (const [size, width, height] of SIZES) {
    const scroll = {};
    for (const n of stops) scroll[n] = await measure(`${size} stop ${n}`, `?stop=${n}`, width, height);
    if (0 in scroll && 1 in scroll) {
      const mid = Math.round((scroll[0] + scroll[1]) / 2);
      await measure(`${size} hero → gtid midpoint`, "?stop=0", width, height, (page) => page.evaluate((y) => window.scrollTo(0, y), mid));
    }
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
```

`package.json`, the scripts. Old:
```json
    "shots": "node scripts/shoot-stops.mjs"
  },
```
New:
```json
    "shots": "node scripts/shoot-stops.mjs",
    "draw-calls": "node scripts/draw-calls.mjs"
  },
```

- [ ] **Step 3: Measure**

Run: `npm run draw-calls`
Expected: twenty result lines, every one under 200 and none saying `OVER BUDGET`. Vite may also print `[BABEL] Note: …` lines and proxy errors for `/api/gtid/*` (no API server in dev): ignore them. The integration dry run measured, with Part B's real screens:

```
desktop stop 0                 91 draw calls (high quality)
desktop stop 1                 111 draw calls (high quality)
desktop stop 2                 122 draw calls (high quality)
desktop stop 3                 87 draw calls (high quality)
desktop stop 4                 86 draw calls (high quality)
desktop stop 5                 78 draw calls (high quality)
desktop stop 6                 99 draw calls (high quality)
desktop stop 7                 84 draw calls (high quality)
desktop stop 8                 83 draw calls (high quality)
desktop hero → gtid midpoint   103 draw calls (high quality)
phone stop 0                   86 draw calls (high quality)
phone stop 1                   111 draw calls (high quality)
phone stop 2                   121 draw calls (high quality)
phone stop 3                   92 draw calls (high quality)
phone stop 4                   86 draw calls (high quality)
phone stop 5                   77 draw calls (high quality)
phone stop 6                   85 draw calls (high quality)
phone stop 7                   83 draw calls (high quality)
phone stop 8                   79 draw calls (high quality)
phone hero → gtid midpoint     108 draw calls (high quality)
```

Part B's real screens add nothing over the stand-ins (same `LiveScreen`); stop 6's +1 is the logo badge's cream face. On the low tier (no shadows) the same views measured 22–56, peak 56 at stop 2. Write the measured lines into the commit message body (Step 8).
- A line reading `(low quality)` means the performance monitor dropped the tier. Re-run with Chrome in front.
- If a line reads `no sample`, re-run with `DRAW_SAMPLE_MS=20000 npm run draw-calls`.

- [ ] **Step 4: Only if a view is over budget: mitigate, in this order, re-measuring after each**

Skip this step when every line is under 200.
1. **Shadows from small props.** Each `castShadow` mesh draws twice on the high tier. Remove `castShadow` from:
   - the map-board post (`shared/MapBoard.tsx`);
   - the scales' parts (`PeduliPasal.tsx` `Scales`);
   - the bee (`BeeCrm.tsx` `BuzzingBee`);
   - the logo disc (`PosMonosuko.tsx` `LogoBadge`).
   
   Keep shadows on the buildings, the boards and Ezra.
2. **Map-board posts in one draw.** Drop the post mesh from `MapBoard` and add a `{ x, y: MAP_BOARD.y / 2, z, c: PALETTE.wood, sx: 0.12, sy: MAP_BOARD.y, sz: 0.12, ry }` block, placed `POST_BACK` behind the face, to each island's `PropBlocks` list. On the stars that list is in the island file; on the web islands it is `plazaBlocks`, `stallBlocks`, `shedBlocks` or `pavilionBlocks`.
3. **Plaque text in one draw.** Join the three `WorldText`s on a pillar into one canvas texture on the slab (`Milestones.tsx`; 3 pillars × 2 calls saved).
4. **Frustum culling.** Give the smoke (`PosMonosuko.tsx` `Smoke`) a bounding sphere around the grill instead of `frustumCulled={false}`.

After each change, run `npx vitest run src/world/scene/islands` (87 passed) and `npm run draw-calls` again.

- [ ] **Step 5: Headless shots of the new stops and every screen in closeup (spec §12)**

Run:
```bash
npm run build && npm run shots
for c in "6 pos-monosuko-screen" "7 bee-crm-screen" "8 pedulipasal-screen" "5 map-web-plaza" "1 map-gtid"; do
  set -- $c
  SHOT_SETTLE_MS=25000 npm run shot -- "?stop=$1&closeup=$2" "shots/c8-$2.png" 1280x720
  SHOT_SETTLE_MS=25000 npm run shot -- "?stop=$1&closeup=$2" "shots/c8-$2-phone.png" 520x940
done
```
(`SHOT_SETTLE_MS=25000` gives the closeup glide time to finish under SwiftShader: see C2 Step 7.)

Expected: 18 `shot …` lines from `npm run shots` and 10 `shot ->` lines, with no `MISSING` and no `capture: timed out`. Open every PNG and check:
- The stops 5–8 match C1–C4's checks, now each with its map board.
- Stops 0–4: the five stars look as before plus a map board, and the milestones are on the Hero → GTID bridge.
- Each closeup sits below the HUD, fills 85 % of the frame under it (or 90 % of the width), shows its live UI in English, and has no prop in front of it.
- The phone closeups: the POS, the CRM and the map boards fill the frame's height and show their middle (the rest is a sideways swipe away); the PeduliPasal phone fits whole.

- [ ] **Step 6: Manual checklist (spec §12, plus Part C)**

Run `npm run dev` and open the printed URL in desktop Chrome, then on a phone on the same network (`npm run dev -- --host`). Go through each item and note anything that fails as a follow-up fix before the commit.

1. **Closeups:**
   - Tour: click each of the three screens: the closeup glides in. Back, Esc and scrolling more than a little each exit it.
   - Play: walk to each mini's screen, press E (or click), use the screen, Esc. Ezra is hidden during the closeup and back after it.
   - Phone: tap a screen, use it, then the Back button. The touch controls step aside while it is open. On the POS, the CRM and a map board, swipe sideways: the screen pans until either edge reaches the side of the phone, a tap still uses it, and the hint reads "Swipe to pan · Tap to use · Back to leave".
2. **Map boards, all nine, in both modes:**
   - Tour: open each board, tap an island: the page scrolls to that stop. ‹ › move the ring. "Travel to …" goes to the ringed island.
   - Play: on each board, travel to the next island and back:
     - puff and `poof`, a short fade, Ezra lands on open grass facing away from that island's tour camera, puff, and the fade lifts;
     - Ezra's own island does nothing;
     - a second tap mid-travel does nothing.
   - Keyboard: Tab until the board is focused, Enter opens it, the arrow keys move the ring, Enter travels.
3. **Graduation moment, once per session in each mode:**
   - Play: walk from the hero across the bridge to the 2026 pillar on GTID. The cap pops on (small overshoot), the orange collar and the bronze medal appear, with confetti and a `pop`; the tassel hangs on Ezra's right. Walking away and back does nothing more, and clicking the pillar replays only the confetti. The 2022 and 2024 pillars only squash, with the click sound.
   - Tour (reload): scroll from the hero to GTID. Once, the cap is tossed off the 2026 pillar, spins, lands back on it, with confetti. Scrolling back and forth does not repeat it, and clicking the pillar does.
   - The tossed cap stays on the pillar except while Ezra wears his own (switch to Play after earning it).
4. **Minecart Ezra Bot ↔ plaza, both ways,** in Play: board at Ezra Bot's east station, arrive at the plaza's west station and step off beside the map board; ride back.
5. **Idle demos pause after input and resume:** use the POS screen, wait: its demo stays paused about 7 s, then resumes. The same holds for the CRM and the chat.
6. **The minis in Play:**
   - Cross each island from bridge to bridge without getting stuck.
   - Reach each screen's stand and use it.
   - Boards, signs, stall, shed, pavilion, plinth and pillars are solid.
   - "Try the POS" and "Try the CRM" are grey and do nothing. "Get the APK" opens the GitHub release in a new tab.
7. **Reduced motion** (DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`, reload):
   - the smoke, the bee, the scales and the idle demos are still;
   - the cap appears without the pop scale;
   - the toss does not fly (the cap just rests on the pillar);
   - camera moves cut.
8. **Sound** (unmute in the HUD): `pop` on the cap, `poof` on each travel puff, the click squash on pillars.

- [ ] **Step 7: Final checks**

Run: `npx tsc -b && npx eslint . && npx vitest run && npm run build`
Expected:
- `tsc` and `eslint` print nothing;
- Vitest reports every file passed and `0 failed`. Part C adds 7 test files (`placement`, `plaque`, `stamp`, `moment`, `graduation`, `mapModel`, `travel`), replaces `layouts.test.ts` and `index.test.ts`, and adds tests to `text`, `tourPath`, `tourBuild` and `sfx`;
- the build ends with `✓ built in …`.

- [ ] **Step 8: Commit**

```bash
git add src/world/scene/RenderStats.tsx scripts/draw-calls.mjs package.json
git commit -q -F - <<'EOF'
chore(world): measure draw calls per tour view

<paste the twenty measured lines from Step 3 here>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

If Step 4 changed files, add them to the `git add` line and say which mitigations were applied in the message body.

---

## Self-review

**Spec coverage (Part C):**
- **§3.1, the plaza** (C1): the WEB & APPS sign (Pixelify Sans on a plank board), a map board (C7), two lamps, flowers and a tree. The minecart station on the west rim and the bridge on the east rim stay clear (`layouts.test.ts`: stations, signs, anchors).
- **§3.3, tour** (C1): the mini framings are retuned to about 13 out, centred, each screen whole. `layouts.test.ts` "Web & Apps tour views" checks the screens and boards from the real stop cameras, and `framing.test.ts` holds the portrait centring and the rightward legs. Props face the tour camera.
- **§4, the minis** (C1–C4):
  - each is a module in `ISLANDS` with `FOOTPRINTS` stamped as barriers (`index.test.ts`);
  - one `PropBlocks` batch each, with small meshes only for what moves (smoke, bee, scales) or glows (lanterns);
  - each has its `LiveScreen` (POS and CRM 3.4 × 2.125 landscape, chat 1.25 × 2.708 in the phone), an info board with the config's title, line and "year · tags" rows (`metaRows`, no stats), and its link sign: POS and CRM inactive while `links.demo` is empty, "Get the APK" to the GitHub release;
  - every building and prop in the §4 table is there: awning in `#1f7a4d`, badge, grill with chicken and smoke, table and stools; shed, bench, half-built chair, saw, logs, bee; pavilion, statute books, tilting scales, tree, phone on a plinth.
- **§7.1, milestones** (C5): three pillars with carved plaques facing the tour camera (year in Pixelify Sans, lines in the grotesk). 2022 stands beside the hero bridge head, 2024 on its own floating stone beside the midpoint (off the deck and the stepping stones, tested), and 2026 beside the GTID head. They are barriers (`stamp.test.ts`) and clickable with a squash, not tour stops, and the camera slows on that leg (`tourTravelWeights`, 1.3).
- **§7.2, graduation** (C6): the Play trigger within 2.5 blocks once per session (`runtime.capOn`), with confetti and a `pop`; a click replays the confetti. The tour toss fires once per page load when progress crosses the pillar, a click replays it, and it throws the cap only. The outfit colours and placement follow the spec and the coordinator's design (`graduation.test.ts`).
- **§8, map boards** (C7):
  - nine boards drawn from the live layout: outlines, bridges, rails, pads, names and "You are here", so new islands appear by themselves;
  - one hit region per island (`mapModel.test.ts`: tap → travel to that id);
  - Play fast travel with puffs and a landing column (`travel.test.ts`, `PlayerController`);
  - Tour: closeup exit plus `scrollToIsland`;
  - keyboard through `ScreenApp.key`.
- **§11, performance** (C8): measured in a real browser, not estimated. Peak 122 draw calls on the verified copy against a budget of 200, with mitigations ready if Part B's real screens push a view over. Live screens keep Part B's redraw policy. The map app never animates (`busy` false, no `auto`), so a board redraws only on input.
- **§12** (C8): unit tests for map regions → island ids (plus the Part C logic: placement, plaques, stamp, moment, outfit, travel, tour weights, `metaRows`, the layout rules); headless shots of the new stops and every screen in closeup, desktop and phone; the manual checklist.
- **Master constraints:** English copy only; no process claims; no Monosuko testing figures; "graduated with Distinction" comes from the config; no `setState` in frame callbacks; reduced motion respected; engine code stays framework-free (the `tourPath` change is plain TypeScript).

**Placeholder scan:** every step has its complete code or exact old → new text, and every run has its expected output. Step 4 of C8 is conditional on a measurement and names the exact components and changes. The Step 8 commit body is to be filled with the measured lines.

**Type consistency:**
- These match the master's Part C contract:
  - `mapApp(layout: WorldLayout, here: string, travel: (id: string) => void): ScreenApp<MapState>`;
  - `startTravel(to: string): void`;
  - `runtime.travel: { to: string; phase: "out" | "in"; t: number } | null`, `runtime.hidden: boolean`, `runtime.capOn: boolean`, `runtime.capToss: number | null`;
  - `SfxName` gains `"pop" | "poof"`;
  - `MilestoneSpot { year; pos: Vec3; ry; ownStone }`, `milestoneSpots(bridge: Crossing, from: IslandPlacement, to: IslandPlacement, years: readonly number[]): MilestoneSpot[]`.
- Part B's contracts are used as published:
  - `LiveScreen` props `id`, `placement`, `app` (stable: module constants or `useMemo`), `label`, `at`, `rotationY`, `size`, `bezelColor`, `frame`;
  - `ScreenApp.key`, `CloseupTarget.key` (via LiveScreen), `openCloseup` / `closeCloseup` from `closeupState.ts`, `fakeCtx`;
  - the closeup ids are `pos-monosuko-screen`, `bee-crm-screen`, `pedulipasal-screen` and `map-<island id>`.

## Open questions for the coordinator

1. **Mini anchor clearance 1.75 instead of 2** ("Contract deviations" 1). It holds on the shipped layout with the rope-post and walkway tests. If 2 is firm, the POS stall cannot stand at the back of its island, so the mini designs would have to change. **Resolved: 1.75 approved by the coordinator.**
2. **Tour toss timing.** The toss fires where the camera's track point that watches the 2026 pillar is nearest it, which falls late in the hero → GTID flight, near GTID's arrival. A `?stop=1` deep link never fires it on load (`crossedForward` needs a previous frame), but a small settle past that point right after loading could. Acceptable, or should the trigger sit at the leg's midpoint? **Resolved: the timing stays where it is.** The coordinator also accepted Part C's other contract deviations (2–9).
3. **`PROP_RINGS` is unchanged,** so the portrait views of the minis show some extra sky above the island. Ezra may want them tighter.
4. **Draw calls with the real Part B screens** are still to be measured. The sandbox's stand-in apps used the same `LiveScreen`, so the numbers should hold within a few calls. **Resolved: measured in the integration dry run (C8 Step 3): the same numbers, POS Monosuko +1 for the logo's cream face; peak 122 (Petak Umpet) on the high tier, 56 on the low tier.**
5. **Map labels around the minis are tight** (each name slides sideways to clear its neighbours). They are readable at board size and in the closeup, but they are the densest part of the map. **Integration dry run: two names touched ("POS MonosukoPeduliPasal"); names now keep `LABEL_GAP` of air and one weight (C7 Step 3).**
6. **The Bee dashboard is large in its stop's frame** (3.4 × 2.125 on a radius-4 island, by spec). It is whole and unobstructed; a smaller screen would need a spec change.

## Integration fixes (dry run 2026-10-14)

Replayed after Parts A and B with Part B's real apps and real shared-file edits (`runtime.ts`, `store.ts`, `World.tsx`, `InteractionController`, `PlayCamera`, `useModeTransitions`, `useTabCycling`, `Hud`, `MobileControls`), on fresh sandbox copies at `bcd1ffb` and at the final base `540ef7b` (Phase 1 input fixes). Every Old snippet that touches Part B's edits (C2's `World.tsx` and `Ezra.tsx`, C5's `World.tsx`, C6's `runtime.ts` after the closeup fields) applied as written. After every task tsc, eslint and Vitest passed; the per-file counts in the "Expected" lines held; on `540ef7b` the suite ends at `Test Files  80 passed (80)`, `Tests  609 passed (609)`. Changes to this plan:

- **C1 Step 5 (`layouts.ts`) `PEDULI.info` x −0.75 → −1, and C1 Step 1 (`layouts.test.ts`) "covers the screen" bound 0.04 → 0.01:** the info board's top corner covered the phone screen's lower left (the menu FAB, the first chip and the input) in the stop-8 tour view: a 3.6 % overlap, just under the old 4 % bound. At −1 the overlap is 0 and every layout rule still passes.
- **C1 Step 5 (`layouts.ts`) `PLAZA.lamps[1]` (−2, 3) → (1, 3):** in a 520 × 940 closeup of the plaza's map board the camera backs off about 4 blocks (the board's width fits the narrow frame), which put it beside that lamp post: the post covered half the board. At (1, 3) the closeup is clear and the rules pass.
- **C2 Step 2 (`PosMonosuko.tsx` `LogoBadge`):** Part B's `logo.webp` is transparent around the drawing, and WebP stores junk colours under alpha 0, so the opaque material showed a black disc with blocky red and yellow smears. The badge now has a cream face with the logo alpha-tested on it (`alphaTest={0.35}`, one more draw call). The logo post moved 0.12 behind the badge, where it no longer covers "SINCE 1980".
- **C2 Step 7, C3 Step 5, C4 Step 5, C7 Step 10 and C8 Step 5, every closeup shot:** prefixed with `SHOT_SETTLE_MS=25000`. SwiftShader renders a few frames per second and `CloseupCamera` clamps each step to 1/30 s, so the 0.8 s glide takes about 8 s of real time on the minis and more than 15 s on Petak Umpet. At the default 2.5 s every closeup shot caught the glide barely started.
- **C7 Step 3 (`mapDraw.ts` names, `mapModel.ts` `LABEL_GAP`):** the cursor island's name was drawn bold, about 18 % wider than `LABEL_CHAR_W` allows, and placed names kept no air between them, so the map read "POS MonosukoPeduliPasal" and "Web & AppsBee Furniture CRM". All names now use one weight (the ring marks the cursor), and placement keeps 4 units of air on each side of a name. The `mapModel` tests are unchanged and pass.
- **C7 Step 6 (`PlayerController.tsx`), rebased on `ab7a55e`:** the import Old/New starts from `import { cutsStandUp, holdDropInput, islandUnder } from "./modes";`. The travel block lands before the rides, ahead of the new stand-up cut, which therefore never runs during a travel.
- **C8 Step 3:** the expected lines are now the ones measured with Part B's real screens (below). They match the stand-in run except stop 6, which is +1 for the logo's cream face. Low-tier numbers were measured with a copy of the script that reports 4 cores (`pickQuality` → low): peak 56 at stop 2, all views 22–56.
- **Open questions 1 and 2** are resolved (1.75 approved; the toss timing stays), and the coordinator accepted the other contract deviations. Open questions 4 and 5 are answered in place.
- **Closeup checks in C2 Step 7, C3 Step 5, C4 Step 5, C7 Step 10, C8 Step 5 and the C8 Step 6 phone item** follow Part B's new closeup framing (coordinator decisions, see Part B's integration notes):
  - every closeup sits below the HUD and fills 85 % of the frame under it;
  - on a phone the POS, the CRM and the map boards are fitted by their height, open centred and pan with a sideways swipe;
  - the near plane clips whatever stands in front.

  The phone closeups with a prop in front, found in this dry run, are gone: the hero's title letters, the POS awning posts, the posts and the PeduliPasal info board at the minis' map-board edges. No Part C code changed for this; the plaza lamp move above stays.
