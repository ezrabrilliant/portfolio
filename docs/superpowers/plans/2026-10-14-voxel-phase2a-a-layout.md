# Voxel World — Phase 2A Part A: Data, Layout and Tour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the Web & Apps district into the world as data and terrain: schema and config for the three mini projects and the education milestones, the `web-plaza` hub and the chain of mini islands placed by the layout engine, one island registry for both tiers, a tour that visits all nine islands, and an SEO mirror with the minis and an Education section.

**Architecture:** The framework-free layout engine (`src/world/engine/gen/layout.ts`) emits the plaza after Ezra Bot along the tour's screen-right and chains the web minis from it with a deterministic whole-column search (`webChain`), so the tour keeps moving to the right; the tour order and the crossings are derived from it. The scene gets one island registry (`ISLANDS`) in which the four new islands are bare placeholders (terrain only, no props, no collision) with tour framings; Part C swaps in their real modules. Part A draws no props on the new islands.

**Tech Stack:** TypeScript 5.8 strict (`verbatimModuleSyntax`, `erasableSyntaxOnly`), React 19, @react-three/fiber 9, Vitest 5. No new dependencies.

**Master plan (binding contracts, global constraints, task index):** `docs/superpowers/plans/2026-10-14-voxel-phase2a.md`
**Spec:** `docs/superpowers/specs/2026-10-14-voxel-phase2a-world-content-design.md` (Part A covers §3, the board copy of §4, §9, §10 and the layout/validation parts of §12)

## Global Constraints

See the master's "Global Constraints" and "Coordinate conventions": every task includes them. Part A specifics:

- All commands run from the app root `C:\Users\ezrak\OneDrive\Documents\Code\react\portfolio\portfolio` (the folder with `package.json`), in Git Bash, on branch `voxel-world`.
- Never stage the pre-existing ` D gsap-splittext-kinetic-typography-experiment-gsapchallenge-1/…` deletions: always `git add` the exact paths listed in the step, never `git add -A` / `git add .`.
- Every commit uses this form (only the message line changes):

  ```bash
  git commit -q -F - <<'EOF'
  feat: <message>

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
  EOF
  ```

- Engine files (`src/world/engine/**`) import nothing from React, three, zustand, the DOM or `src/world/scene/**`.
- Every code block in this plan was run, task by task, on a copy of the branch at `bcd1ffb` before the plan was written, and again on `540ef7b` (after the Phase 1 input fixes: 11 more tests) in the integration dry run. The counts in the "Expected" lines are the ones measured on `540ef7b`: if a count differs, stop and find out why before going on.
- `npm run shot` serves `dist/` with `vite preview`, which has no API server: lines like `[http 500] http://localhost:4173/api/gtid/history` in its output are expected (GTID's board falls back to its snapshot).

## Task order note

The master's task index lists the layout as A3 and the registry as A4. This plan lands them the other way round, with the same deliverables and contracts: as soon as the layout puts the new islands on the tour, `TourCamera` calls `ISLANDS[id].tourStop(...)` for every stop and would crash on an island without a module, so the registry and the framings (A3 here, inert until then) land first. Every commit in this part is green and the app runs after each one.

| Task | Deliverable |
|---|---|
| A1 | Schema: drop `screenshot` / `island.template`, `isSiteLink`, `Milestone` + `validateMilestones` |
| A2 | Config: the three minis, `milestones`, `worldCopy.webDistrict` |
| A3 | Island registry `ISLANDS` / `IslandModule`, bare modules and framings for the four web islands, `islandTitle`, the minecart sign title |
| A4 | Layout: `hub` kind, `webChain`, derived tour order; the scene follow-ups; build and headless shots of the new stops |
| A5 | SEO mirror: the minis, "Try" for site paths, an Education section |

## Contract additions (beyond the master's Part A list)

Extra exports and parameters:

| Module | Addition | Why |
|---|---|---|
| `src/world/engine/gen/layout.ts` | `CHAIN_DEPTH = 3`: depth offset (blocks along the tour's screen-forward) of each chain island from the chain axis, 3 **nearer** the camera for even chain indices, 3 further for odd | the zigzag; nearer-first puts every chain bridge end on a full rim (see A4) |
| same | `CHAIN_BRIDGE = { min: 6, max: 9 } as const`: bridge length window between consecutive chain islands' edge anchors (3D) | the §3.2 rule as one constant the code and the tests share |
| same | `webChain(hub, radii, taken, seeds?: readonly number[])`: optional 4th parameter, the chain islands' seeds in chain order; when given, both ends of every chain bridge must land on that island's grass (`generateIsland`) | a radius-4 rim can dip under the 0.75 × radius anchor; `buildLayout` passes `hashString(id)` |
| `src/config/portfolio.ts` | `worldCopy.webDistrict = "Web & Apps"` | district name for the minecart sign, the plaza's sign and the map labels |
| `src/world/scene/islands/shared/project.ts` | `islandTitle(id: string): string`: the project's title; `worldCopy.heroName` for `"hero"`; `worldCopy.webDistrict` for `WEB_PLAZA_ID`; the id itself otherwise | the minecart sign now, Part C's map-board labels later |
| `src/world/ui/seoLinks.ts` | `interface SeoLink { href: string; label: string; external: boolean }` and `seoLink(key: keyof ProjectLinks, url: string \| undefined, title: string): SeoLink \| null` | the text mirror's link labels, testable without React |

Removed or changed exports:

| Module | Change | Why |
|---|---|---|
| `layout.ts` | `TOUR_ORDER` is removed: `STAR_TOUR` replaces it and the full order is `layout.tourOrder` | its one user, the fallback in `tourMath.scrollMeasure`, now reads `runtime.layout.tourOrder.length`, as `TourScrollTrack` already does |
| `layout.ts` | `DISTRICT_HUBS.web` = `{ origin: { x: 120, y: 8, z: -6 }, radius: HUB_RADIUS }` (was the Phase 1 slot `(66, 4, 22)`, radius 6) | coordinator decision: the plaza continues the tour to the right of Ezra Bot (see "Contract deviations") |
| `layout.ts` | `edgeAnchor` measures from the island's true centre (`origin + 0.5`) when `from.kind` is `"hub"` or `"mini"`; hero and star anchors are unchanged | the generator centres islands on `origin + 0.5`; measured from the corner, a radius-4 island's anchor on its −x / −z side sits half a block past its rim |
| `layout.ts` | private `overlaps()` takes `Pick<IslandPlacement, "origin" \| "radius">` | `webChain` tests candidate columns that are not placements yet |
| `scene/islands/index.ts` | `STAR_ISLANDS` → `ISLANDS` with no alias (its three importers are updated in A3); `StarIslandModule` stays as an alias of `IslandModule` | master contract |

## Contract deviations

Both decided by the coordinator after the first draft of this plan (open question 1: the district must continue the tour rightward instead of pulling the camera back toward the viewer):

- **`CHAIN_DIR` is not `VIEW_R`.** The island framings in `framing.ts` look from the front-left at 10–20° off −z, not along `VIEW_F` (35.6°). `VIEW_R` therefore ran the chain about 26° toward the camera. `CHAIN_DIR` is now the framings' real screen-right: 12° from +x toward +z, `(0.9781, 0.2079)`. The five Phase 1 framings' right vectors average 11.9°. `framing.test.ts` asserts it stays within 3° of that average, replacing the "equals `VIEW_R`" test. The master's comment `// equals VIEW_R (tour camera right)` should read "the tour framings' screen-right".
- **The plaza is not on the Phase 1 slot (66, 4, 22).** It sits 36.5 blocks past Ezra Bot along `CHAIN_DIR`, 1.6 blocks further from the camera, at y = 8: `DISTRICT_HUBS.web.origin = (120, 8, −6)`. The Ezra Bot → plaza rail is 31.5 blocks long and at most 23.7° steep (Petak → Orbit: 17.1 blocks, 44.4°). The master's "origin `DISTRICT_HUBS.web.origin`" still holds. Spec §3.1's "(66, 4, 22), south of Orbit" and §3.2's "`VIEW_R`" are superseded.

Behaviour changes outside the contracts, each measured in A4:

- `tourVia` gives the Web & Apps chain bridges **no** via point: the camera flies straight from stop to stop.
- `FRAMING.hero.dwell` goes from 1.2 to 1.4.
- Small islands' crossing anchors are measured from their true centre (above).

## The computed web district (for Parts B and C)

All values come from `buildLayout(worldProjects)` after A4; `layout.test.ts` pins the origins.

| Island | id | Tour index (`?stop=`) | origin | radius / depth | Walkable surface y | Island frame (`islandFrame`) | Along / depth from the plaza |
|---|---|---|---|---|---|---|---|
| Plaza (hub) | `web-plaza` | 5 | (120, 8, −6) | 5 / 5 | 9 | (120.5, 9, −5.5) | 0 / 0 |
| POS Monosuko | `pos-monosuko` | 6 | (134, 9, 0) | 4 / 4 | 10 | (134.5, 10, 0.5) | 14.94 / −2.96 (nearer) |
| Bee Furniture CRM | `bee-furniture-crm` | 7 | (147, 10, −3) | 4 / 4 | 11 | (147.5, 11, −2.5) | 27.03 / +2.68 (further) |
| PeduliPasal | `pedulipasal` | 8 | (158, 9, 5) | 4 / 4 | 10 | (158.5, 10, 5.5) | 39.46 / −2.86 (nearer) |

Stops 0–4 are unchanged: hero 0, gtid 1, petak-umpet 2, orbit-store 3, ezra-bot 4. "Along" is measured on `CHAIN_DIR`; "depth" on the screen-forward `(CHAIN_DIR.z, −CHAIN_DIR.x)`; + is further from the camera. The plaza sits 36.46 along and 1.62 deeper from Ezra Bot's origin.

Crossings, with anchors in **island-local** x, z (world minus the island frame). Part C keeps props at least 2 blocks from every anchor and clear of stations and signs, which `layouts.test.ts` already checks:

| Crossing | Kind | Anchor to anchor (3D) | Anchor on `from` | Anchor on `to` |
|---|---|---|---|---|
| ezra-bot → web-plaza | minecart | 27.98 | Ezra Bot (5.42, 0.49) | plaza (−3.70, −0.62) |
| web-plaza → pos-monosuko | bridge | 8.54 | plaza (3.45, 1.48) | POS (−2.76, −1.18) |
| pos-monosuko → bee-furniture-crm | bridge | 7.41 | POS (2.92, −0.67) | Bee (−2.92, 0.67) |
| bee-furniture-crm → pedulipasal | bridge | 7.67 | Bee (2.43, 1.76) | PeduliPasal (−2.43, −1.76) |

Minecart furniture (`railEnds`, `SIGN_OFFSET`), island-local:
- Ezra Bot side (its east rim, behind the "Ezra Bot online" screen board): station (4, 0), sign (3.72, 1.42), stand-off (3, 0). No Ezra Bot prop moves: the nearest footprint cell clears the station by 1.30 and the sign by 0.23.
- Plaza side (its west rim): station (−2, 0), a 2.4 × 2.4 platform; sign (−2.28, 1.42); stand-off (−1, 0).
- The rail is 31.48 blocks long and at most 23.7° steep.

Tour stop poses after A4 (world coordinates; Part C retunes the four web `FRAMING` entries once the islands are dressed):

| Stop | Camera | Target |
|---|---|---|
| ezra-bot | (81.6, 21.7, 1.8) | (84, 16.6, −12.1) |
| web-plaza | (116.3, 15.6, 8.9) | (119, 10.2, −6.3) |
| pos-monosuko | (130.3, 15.2, 11.7) | (133.9, 11.8, −0.1) |
| bee-furniture-crm | (143.3, 16.2, 8.7) | (146.9, 12.8, −3.1) |
| pedulipasal | (154.3, 15.2, 16.7) | (157.9, 11.8, 4.9) |

Camera moves between consecutive stops, measured on the departing stop's own heading (`framing.test.ts` bounds them: right > 50 % of the move, toward the viewer ≤ 40 %):

| Move | Length | Screen-right share | Toward the viewer |
|---|---|---|---|
| Ezra Bot → plaza | 35.4 | 100 % | 3 % |
| plaza → POS | 14.3 | 100 % | 2 % |
| POS → Bee | 13.3 | 87 % | −50 % (into the screen) |
| Bee → PeduliPasal | 13.6 | 95 % | 33 % |

## Notes Parts B and C rely on

- `ISLANDS["web-plaza" | "pos-monosuko" | "bee-furniture-crm" | "pedulipasal"]` are bare: `Component` renders `null`, there is no `stamp`, `tourStop` is `tourStopFor`. Part C replaces each with `{ id, Component, tourStop: tourStopFor, stamp: (grid, p) => stampCells(grid, p, FOOTPRINTS[id]) }` and then must:
  - replace the test "keeps the Web & Apps islands bare for now: terrain only, no props and no collision" in `src/world/scene/islands/index.test.ts`;
  - widen "exist for the hero and every star island" in `src/world/scene/islands/layouts.test.ts` back to every id in `layout.tourOrder` (A4 scopes the footprint tests to islands that have `FOOTPRINTS`, through the `dressed` list and the `footprint(id)` helper).
- On Ezra Bot, the minecart station is on the east rim behind the screen board. Its sign and Interactable label read "Minecart → Web & Apps" and "Ride to Web & Apps"; on the plaza's west rim, "Minecart → Ezra Bot" (`islandTitle`).
- The small islands' anchors are measured from their true centre (`edgeAnchor`), so island-local anchors are exactly 0.75 × radius from the frame.
- The web chain's tour legs have no via point. When Part C retunes the mini framings, re-run `src/world/scene/tour/tourMotion.test.ts` and `src/world/scene/islands/framing.test.ts`. The latter bounds each island's portrait centre column at |x| < 0.12 and checks the web camera moves stay mostly to the right.
- `scripts/shoot-stops.mjs` shoots all nine stops by default after A4.

## File map

```
src/config/schema.ts                                         A1 replace
src/config/schema.test.ts                                    A1 replace, A2 modify
src/config/portfolio.ts                                      A2 modify
src/config/worldProjects.test.ts                             A2 replace
src/world/engine/gen/layout.test.ts                          A2 modify, A4 replace
src/world/engine/gen/layout.ts                               A3 modify (WEB_PLAZA_ID), A4 replace
src/world/scene/islands/types.ts                             A3 modify
src/world/scene/islands/index.ts                             A3 replace
src/world/scene/islands/index.test.ts                        A3 create
src/world/scene/islands/framing.ts                           A3 modify, A4 modify
src/world/scene/islands/framing.test.ts                      A4 modify
src/world/scene/islands/shared/project.ts                    A3 replace
src/world/scene/islands/shared/project.test.ts               A3 create
src/world/scene/World.tsx, TourCamera.tsx, InitialView.tsx   A3 modify
src/world/scene/crossings/Minecart.tsx                       A3 modify
src/world/scene/tour/tourMath.ts                             A4 modify
src/world/scene/tour/tourMath.test.ts, tourMotion.test.ts    A4 modify
src/world/scene/islands/layouts.test.ts                      A4 modify
src/world/scene/crossings/geometry.test.ts, cartFollow.test.ts   A4 modify
scripts/shoot-stops.mjs                                      A4 modify
src/world/ui/seoLinks.ts, seoLinks.test.ts                   A5 create
src/world/ui/SeoMirror.tsx                                   A5 replace
src/world/ui/SeoMirror.test.ts                               A5 create
```

---

### Task A1: Schema: site-path links and milestones; drop screenshot and island templates

**Files:**
- Modify (full replace): `src/config/schema.ts`
- Test (full replace): `src/config/schema.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `WorldProject` without `screenshot` and `island.template`; `Milestone`; `isSiteLink(url)`; `validateMilestones(list)`; the `validateProjects` link rule "an https:// URL or a path that starts with exactly one /". `IslandTemplate` is removed.

- [ ] **Step 1: Find every use of the fields being removed**

Run: `grep -rnE "screenshot|template\b|IslandTemplate|TEMPLATES" src --include=*.ts --include=*.tsx`
Expected: `src/config/schema.ts` (lines 2, 16, 17, 23, 42, 43), `src/config/schema.test.ts` (lines 52, 53, 55) and three comments that say "screenshots" (`src/world/scene/TourCamera.tsx:81`, `src/world/scene/useModeTransitions.ts:122`, `src/world/scene/World.tsx:54`), which stay. Nothing else reads `screenshot`, `island.template` or `IslandTemplate`.

- [ ] **Step 2: Write the failing test**

Replace `src/config/schema.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { DISTRICTS, isSiteLink, validateMilestones, validateProjects, type Milestone, type WorldProject } from "@/config/schema";
import { worldCopy, worldProjects } from "@/config/portfolio";

const base: WorldProject = {
  id: "sample-app", title: "Sample", year: 2025, line: "A sample app.", tags: ["React"],
  district: "web", tier: "mini", links: {},
};

describe("validateProjects", () => {
  it("accepts the shipped world projects", () => {
    expect(validateProjects(worldProjects)).toEqual([]);
  });

  it("ships the four star projects in tour order", () => {
    expect(worldProjects.map((p) => p.id)).toEqual(["gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    expect(worldProjects.every((p) => p.tier === "star")).toBe(true);
    expect(worldCopy.heroName).toBe("Ezra Brilliant");
  });

  it("flags duplicate ids", () => {
    const issues = validateProjects([base, { ...base }]);
    expect(issues).toContainEqual({ id: "sample-app", message: "duplicate id" });
  });

  it("flags non-slug ids, unknown districts and bad tiers", () => {
    const bad = { ...base, id: "Bad Id", district: "space", tier: "huge" } as unknown as WorldProject;
    const messages = validateProjects([bad]).map((i) => i.message);
    expect(messages).toContain("id must be a lowercase slug");
    expect(messages).toContain('unknown district "space"');
    expect(messages).toContain('tier must be "star" or "mini"');
  });

  it("flags empty title/line and impossible years", () => {
    const messages = validateProjects([{ ...base, title: " ", line: "", year: 99 }]).map((i) => i.message);
    expect(messages).toContain("title is required");
    expect(messages).toContain("line is required");
    expect(messages).toContain("year must be a 4-digit year");
  });

  it("rejects process claims in the line (copy rule)", () => {
    const messages = validateProjects([{ ...base, line: "Solo developer, Dockerized end-to-end." }]).map((i) => i.message);
    expect(messages).toContain("line must describe the result, not the process");
  });

  it("accepts https links, site paths and empty links; rejects anything else", () => {
    expect(validateProjects([{ ...base, links: { discord: "" } }])).toEqual([]);
    expect(validateProjects([{ ...base, links: { demo: "/demo/monosuko/", github: "https://github.com/x/y" } }])).toEqual([]);
    for (const demo of ["http://x.dev", "//evil.dev/x", "demo/monosuko/", "javascript:alert(1)"]) {
      const messages = validateProjects([{ ...base, links: { demo } }]).map((i) => i.message);
      expect(messages, demo).toContain("links.demo must be an https:// URL or a site path starting with one /");
    }
  });

  it("checks the island accent format", () => {
    const messages = validateProjects([{ ...base, island: { accent: "blue" } }]).map((i) => i.message);
    expect(messages).toContain("island.accent must be #RRGGBB");
    expect(validateProjects([{ ...base, island: { accent: "#1f7a4d" } }])).toEqual([]);
  });

  it("lists the three districts", () => {
    expect(DISTRICTS).toEqual(["game", "discord", "web"]);
  });
});

describe("isSiteLink", () => {
  it("accepts https URLs and paths that start with exactly one slash", () => {
    for (const url of ["https://gtid.pro", "https://github.com/a/b/releases/tag/1.5.3", "/demo/monosuko/", "/demo/bee/", "/"]) {
      expect(isSiteLink(url), url).toBe(true);
    }
  });
  it("rejects http, protocol-relative, relative, script and whitespace links", () => {
    for (const url of ["", "http://x.dev", "https://", "//evil.dev", "demo/bee/", "javascript:alert(1)", "/demo bee/", "https://a b"]) {
      expect(isSiteLink(url), url).toBe(false);
    }
  });
});

describe("validateMilestones", () => {
  const ok: Milestone[] = [
    { year: 2022, title: "Started", line: "A university" },
    { year: 2026, title: "Graduated", line: "A university", moment: "graduation" },
  ];

  it("accepts ascending milestones with one graduation moment", () => {
    expect(validateMilestones(ok)).toEqual([]);
    expect(validateMilestones([])).toEqual([]);
  });

  it("flags years out of order, repeated or outside 2000–2100", () => {
    const messages = validateMilestones([ok[1], ok[0]]).map((i) => i.message);
    expect(messages).toContain("years must be in ascending order");
    expect(validateMilestones([ok[0], { ...ok[0] }]).map((i) => i.message)).toContain("years must be in ascending order");
    expect(validateMilestones([{ ...ok[0], year: 1999 }]).map((i) => i.message)).toContain("year must be a 4-digit year");
    expect(validateMilestones([{ ...ok[0], year: 2101 }]).map((i) => i.message)).toContain("year must be a 4-digit year");
    expect(validateMilestones([{ ...ok[0], year: 2024.5 }]).map((i) => i.message)).toContain("year must be a 4-digit year");
  });

  it("requires a title and a line", () => {
    const issues = validateMilestones([{ year: 2024, title: " ", line: "" }]);
    expect(issues).toContainEqual({ id: "milestone 2024", message: "title is required" });
    expect(issues).toContainEqual({ id: "milestone 2024", message: "line is required" });
  });

  it("rejects process claims (copy rule)", () => {
    const messages = validateMilestones([{ year: 2024, title: "Solo capstone", line: "Built end-to-end" }]).map((i) => i.message);
    expect(messages).toContain("milestone must describe the result, not the process");
  });

  it("allows at most one graduation moment and no unknown moments", () => {
    const two = validateMilestones([{ ...ok[1], year: 2025 }, ok[1]]);
    expect(two).toContainEqual({ id: "milestones", message: "at most one graduation moment" });
    const odd = { year: 2024, title: "Bangkit", line: "Mobile", moment: "party" } as unknown as Milestone;
    expect(validateMilestones([odd]).map((i) => i.message)).toContain('unknown moment "party"');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/config/schema.test.ts`
Expected: FAIL, `Tests  8 failed | 8 passed (16)`: `TypeError: isSiteLink is not a function`, `TypeError: validateMilestones is not a function`, and the site-path case with `AssertionError: expected [ { id: 'sample-app', …(1) } ] to deeply equal []`.

- [ ] **Step 4: Implement the schema**

Replace `src/config/schema.ts` with:

```ts
export type District = "game" | "discord" | "web";

export interface ProjectLinks { demo?: string; github?: string; discord?: string; roblox?: string }

export interface WorldProject {
  id: string;
  title: string;
  year: number;
  line: string;
  stats?: string[];
  tags: string[];
  district: District;
  tier: "star" | "mini";
  links: ProjectLinks;
  island?: { accent?: string };
}

/** A year milestone on the Hero → GTID bridge; `moment: "graduation"` marks the one that plays the graduation moment. */
export interface Milestone { year: number; title: string; line: string; moment?: "graduation" }

export interface ValidationIssue { id: string; message: string }

export const DISTRICTS: readonly District[] = ["game", "discord", "web"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROCESS_CLAIMS = /\b(solo|end-to-end|self-hosted|self-managed|dockerized)\b/i;

/**
 * A link the site may open: an absolute `https://` URL, or a path on this site that starts with exactly one "/"
 * (`/demo/monosuko/`), so demos also work in a local preview. Never `//host` (protocol-relative) or whitespace.
 */
export function isSiteLink(url: string): boolean {
  return /^https:\/\/\S+$/.test(url) || /^\/(?!\/)\S*$/.test(url);
}

const validYear = (y: number) => Number.isInteger(y) && y >= 2000 && y <= 2100;

export function validateProjects(list: readonly WorldProject[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const id = p.id || "(missing id)";
    const add = (message: string) => issues.push({ id, message });
    if (!p.id || !SLUG.test(p.id)) add("id must be a lowercase slug");
    if (p.id && seen.has(p.id)) add("duplicate id");
    seen.add(p.id);
    if (!p.title || !p.title.trim()) add("title is required");
    if (!p.line || !p.line.trim()) add("line is required");
    if (p.line && PROCESS_CLAIMS.test(p.line)) add("line must describe the result, not the process");
    if (!validYear(p.year)) add("year must be a 4-digit year");
    if (!DISTRICTS.includes(p.district)) add(`unknown district "${p.district}"`);
    if (p.tier !== "star" && p.tier !== "mini") add('tier must be "star" or "mini"');
    const accent = p.island?.accent;
    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) add("island.accent must be #RRGGBB");
    for (const [key, url] of Object.entries(p.links ?? {})) {
      if (url && !isSiteLink(url)) add(`links.${key} must be an https:// URL or a site path starting with one /`);
    }
  }
  return issues;
}

/** Years ascending and in 2000–2100, title and line required, results not process, at most one graduation moment. */
export function validateMilestones(list: readonly Milestone[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let graduations = 0;
  list.forEach((m, i) => {
    const add = (message: string) => issues.push({ id: `milestone ${m.year}`, message });
    if (!validYear(m.year)) add("year must be a 4-digit year");
    if (i > 0 && !(m.year > list[i - 1].year)) add("years must be in ascending order");
    if (!m.title || !m.title.trim()) add("title is required");
    if (!m.line || !m.line.trim()) add("line is required");
    if (PROCESS_CLAIMS.test(`${m.title ?? ""} ${m.line ?? ""}`)) add("milestone must describe the result, not the process");
    if (m.moment !== undefined && m.moment !== "graduation") add(`unknown moment "${m.moment as string}"`);
    if (m.moment === "graduation") graduations++;
  });
  if (graduations > 1) issues.push({ id: "milestones", message: "at most one graduation moment" });
  return issues;
}
```

- [ ] **Step 5: Run the tests, the type check and the linter**

Run: `npx vitest run src/config/schema.test.ts`
Expected: PASS, `Tests  16 passed (16)`.

Run: `npx vitest run`
Expected: `Test Files  56 passed (56)`, `Tests  414 passed (414)`.

Run: `npx tsc -b` then `npx eslint .`
Expected: both exit with no output.

- [ ] **Step 6: Commit**

```bash
git add src/config/schema.ts src/config/schema.test.ts
git commit -q -F - <<'EOF'
feat(config): site-path links and milestones in the schema; drop screenshot and island templates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task A2: Config: the three Web & Apps minis and the milestones

**Files:**
- Modify: `src/config/portfolio.ts` (one import, `worldCopy`, the end of `worldProjects`, a new `milestones` export; the old `config` object stays untouched)
- Test (full replace): `src/config/worldProjects.test.ts`
- Test (modify): `src/config/schema.test.ts`, `src/world/engine/gen/layout.test.ts` (two island counts)

**Interfaces:**
- Consumes: `Milestone` (A1).
- Produces: `worldProjects` with seven entries (the four stars in tour order, then `pos-monosuko`, `bee-furniture-crm`, `pedulipasal`: the chain order); `milestones` exactly as the master; `worldCopy.webDistrict`.

- [ ] **Step 1: Write the failing tests**

Replace `src/config/worldProjects.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { milestones, worldProjects } from "./portfolio";

const byId = Object.fromEntries(worldProjects.map((p) => [p.id, p]));

describe("worldProjects content for the star islands", () => {
  it("has the four star islands", () => {
    expect(worldProjects.filter((p) => p.tier === "star").map((p) => p.id).sort()).toEqual(["ezra-bot", "gtid", "orbit-store", "petak-umpet"]);
  });
  it("carries the real numbers", () => {
    expect(byId.gtid.stats).toEqual(["2,600 visitors / day", "16,000+ items"]);
    expect(byId["petak-umpet"].stats).toEqual(["3.1M+ visits", "2.6K peak players"]);
    expect(byId["orbit-store"].stats).toEqual(["2,200+ orders", "890+ buyers"]);
    expect(byId["ezra-bot"].stats).toEqual(["1,000+ members"]);
  });
  it("has the signpost links", () => {
    expect(byId.gtid.links.demo).toBe("https://gtid.pro");
    expect(byId["petak-umpet"].links.roblox).toBe("https://www.roblox.com/games/91179701802837/Petak-Umpet");
    expect(byId["orbit-store"].links).toEqual({ demo: "https://orbit.ezrabrilliant.com" });
    expect(byId["ezra-bot"].links.discord).toBe("https://discord.com/oauth2/authorize?client_id=1127105994766426122");
  });
});

describe("worldProjects content for the Web & Apps minis", () => {
  const minis = worldProjects.filter((p) => p.tier === "mini");

  it("has exactly the three web minis, in chain order", () => {
    expect(minis.map((p) => p.id)).toEqual(["pos-monosuko", "bee-furniture-crm", "pedulipasal"]);
    expect(minis.every((p) => p.district === "web")).toBe(true);
  });
  it("carries the board copy: title, line, year and tags", () => {
    expect(minis.map((p) => [p.title, p.year, p.tags])).toEqual([
      ["POS Monosuko", 2026, ["React", "Express", "MySQL"]],
      ["Bee Furniture CRM", 2025, ["React", "PostgreSQL"]],
      ["PeduliPasal", 2024, ["Kotlin", "TensorFlow", "Gemini"]],
    ]);
    expect(byId["pos-monosuko"].line).toBe("A point-of-sale for a grilled-chicken restaurant: orders, tables, bills and portion stock.");
    expect(byId["bee-furniture-crm"].line).toBe("A CRM for a furniture maker: customers, products, sales and promos in one dashboard.");
    expect(byId.pedulipasal.line).toBe("An Android chatbot that names the article of Indonesian criminal law that fits a described offence.");
  });
  it("shows no stats (no testing figures for Monosuko)", () => {
    for (const p of minis) expect(p.stats, p.id).toBeUndefined();
  });
  it("keeps the demo links inactive until the demo builds ship; PeduliPasal links its APK release", () => {
    expect(byId["pos-monosuko"].links).toEqual({ demo: "" });
    expect(byId["bee-furniture-crm"].links).toEqual({ demo: "" });
    expect(byId.pedulipasal.links).toEqual({ demo: "https://github.com/aliefauzan/Bangkit-Project-PeduliPasal/releases/tag/1.5.3" });
  });
});

describe("milestones", () => {
  it("are the three education years, the last one the graduation", () => {
    expect(milestones).toEqual([
      { year: 2022, title: "Started Business Information Systems", line: "Petra Christian University" },
      { year: 2024, title: "Bangkit Academy", line: "Mobile Development, graduated with Distinction" },
      { year: 2026, title: "Graduated", line: "Business Information Systems, Petra Christian University", moment: "graduation" },
    ]);
  });
  it("never use the old 'top graduate' wording", () => {
    for (const m of milestones) expect(`${m.title} ${m.line}`).not.toMatch(/top (graduate|student)/i);
  });
});
```

In `src/config/schema.test.ts` make three edits. The import:

```ts
import { worldCopy, worldProjects } from "@/config/portfolio";
```

becomes

```ts
import { milestones, worldCopy, worldProjects } from "@/config/portfolio";
```

The shipped-projects test:

```ts
  it("ships the four star projects in tour order", () => {
    expect(worldProjects.map((p) => p.id)).toEqual(["gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    expect(worldProjects.every((p) => p.tier === "star")).toBe(true);
    expect(worldCopy.heroName).toBe("Ezra Brilliant");
  });
```

becomes

```ts
  it("ships the four stars in tour order, then the three web minis in chain order", () => {
    expect(worldProjects.map((p) => p.id)).toEqual([
      "gtid", "petak-umpet", "orbit-store", "ezra-bot", "pos-monosuko", "bee-furniture-crm", "pedulipasal",
    ]);
    expect(worldProjects.slice(0, 4).every((p) => p.tier === "star")).toBe(true);
    expect(worldProjects.slice(4).every((p) => p.tier === "mini" && p.district === "web")).toBe(true);
    expect(worldCopy.heroName).toBe("Ezra Brilliant");
    expect(worldCopy.webDistrict).toBe("Web & Apps");
  });
```

And the first lines of the milestones block:

```ts
describe("validateMilestones", () => {
  const ok: Milestone[] = [
```

become

```ts
describe("validateMilestones", () => {
  it("accepts the shipped milestones", () => {
    expect(validateMilestones(milestones)).toEqual([]);
  });

  const ok: Milestone[] = [
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/config`
Expected: FAIL, `Tests  7 failed | 19 passed (26)`, among them `AssertionError: expected [ 'gtid', 'petak-umpet', …(2) ] to deeply equal [ 'gtid', 'petak-umpet', …(5) ]`, `TypeError: Cannot read properties of undefined (reading 'forEach')` (no `milestones` yet) and `AssertionError: expected [] to deeply equal [ 'pos-monosuko', …(2) ]`.

- [ ] **Step 3: Add the config**

In `src/config/portfolio.ts`, line 1:

```ts
import type { WorldProject } from "./schema";
```

becomes

```ts
import type { Milestone, WorldProject } from "./schema";
```

The world-copy block:

```ts
/* ---------- Voxel world (Phase 1): hero copy and the four star islands ---------- */

export const worldCopy = {
  heroName: "Ezra Brilliant",
  heroLine: "I build bots, games and web tools that people use every day.",
  location: "Surabaya, Indonesia",
};
```

becomes

```ts
/* ---------- Voxel world: hero copy, the four star islands and the Web & Apps minis ---------- */

export const worldCopy = {
  heroName: "Ezra Brilliant",
  heroLine: "I build bots, games and web tools that people use every day.",
  location: "Surabaya, Indonesia",
  /** Name of the Web & Apps district (its plaza island, minecart sign and map label). */
  webDistrict: "Web & Apps",
};
```

The end of `worldProjects` (Ezra Bot's links line through the end of the file):

```ts
    links: { discord: "https://discord.com/oauth2/authorize?client_id=1127105994766426122" },
  },
];
```

becomes

```ts
    links: { discord: "https://discord.com/oauth2/authorize?client_id=1127105994766426122" },
  },
  // Web & Apps district: chained from the plaza in this order. The two demo links stay empty (signs inactive)
  // until the demo builds ship at /demo/monosuko/ and /demo/bee/.
  {
    id: "pos-monosuko",
    title: "POS Monosuko",
    year: 2026,
    line: "A point-of-sale for a grilled-chicken restaurant: orders, tables, bills and portion stock.",
    tags: ["React", "Express", "MySQL"],
    district: "web",
    tier: "mini",
    links: { demo: "" },
  },
  {
    id: "bee-furniture-crm",
    title: "Bee Furniture CRM",
    year: 2025,
    line: "A CRM for a furniture maker: customers, products, sales and promos in one dashboard.",
    tags: ["React", "PostgreSQL"],
    district: "web",
    tier: "mini",
    links: { demo: "" },
  },
  {
    id: "pedulipasal",
    title: "PeduliPasal",
    year: 2024,
    line: "An Android chatbot that names the article of Indonesian criminal law that fits a described offence.",
    tags: ["Kotlin", "TensorFlow", "Gemini"],
    district: "web",
    tier: "mini",
    links: { demo: "https://github.com/aliefauzan/Bangkit-Project-PeduliPasal/releases/tag/1.5.3" },
  },
];

/** Education, as year milestones on the Hero → GTID bridge (the 2026 one plays the graduation moment). */
export const milestones: Milestone[] = [
  { year: 2022, title: "Started Business Information Systems", line: "Petra Christian University" },
  { year: 2024, title: "Bangkit Academy", line: "Mobile Development, graduated with Distinction" },
  { year: 2026, title: "Graduated", line: "Business Information Systems, Petra Christian University", moment: "graduation" },
];
```

- [ ] **Step 4: Run the config tests, then the whole suite**

Run: `npx vitest run src/config`
Expected: PASS, `Tests  26 passed (26)`.

Run: `npx vitest run`
Expected: FAIL, `Tests  2 failed | 419 passed (421)`, both in `src/world/engine/gen/layout.test.ts`: "places the hero and the four stars at their anchors" and "gives mini projects non-overlapping satellite slots". The three minis are now placed (as golden-angle satellites off the tour until A4 chains them), so those two island counts change.

- [ ] **Step 5: Update the two counts**

In `src/world/engine/gen/layout.test.ts`:

```ts
  it("places the hero and the four stars at their anchors", () => {
    expect(layout.islands.map((i) => i.id)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    for (const isl of layout.islands) {
```

becomes

```ts
  it("places the hero and the four stars at their anchors", () => {
    const anchored = layout.islands.filter((i) => i.kind !== "mini");
    expect(anchored.map((i) => i.id)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    for (const isl of anchored) {
```

and

```ts
    expect(placed).toHaveLength(6);
```

becomes

```ts
    expect(placed).toHaveLength(6 + 3); // the six test minis and the three shipped web minis
```

(A4 replaces this test file; these two edits only keep this commit green.)

- [ ] **Step 6: Run everything**

Run: `npx vitest run`
Expected: `Test Files  56 passed (56)`, `Tests  421 passed (421)`.

Run: `npx tsc -b` then `npx eslint .`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/config/portfolio.ts src/config/worldProjects.test.ts src/config/schema.test.ts src/world/engine/gen/layout.test.ts
git commit -q -F - <<'EOF'
feat(config): POS Monosuko, Bee Furniture CRM and PeduliPasal minis, education milestones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task A3: Island registry, bare Web & Apps islands, framings, minecart sign title

Inert until A4: the layout does not put the new islands on the tour yet, so the world looks and plays exactly as before. It exists so that A4's layout switch runs the moment it lands.

**Files:**
- Modify: `src/world/engine/gen/layout.ts` (add `WEB_PLAZA_ID`), `src/world/scene/islands/types.ts`, `src/world/scene/islands/framing.ts`, `src/world/scene/World.tsx`, `src/world/scene/TourCamera.tsx`, `src/world/scene/InitialView.tsx`, `src/world/scene/crossings/Minecart.tsx`
- Replace: `src/world/scene/islands/index.ts`, `src/world/scene/islands/shared/project.ts`
- Test (create): `src/world/scene/islands/index.test.ts`, `src/world/scene/islands/shared/project.test.ts`

**Interfaces:**
- Consumes: `worldCopy.webDistrict` (A2), `FOOTPRINTS`, `tourStopFor`, `stampCells` (Phase 1).
- Produces: `IslandModule` + `StarIslandModule` alias, `ISLANDS` (nine entries), `WEB_PLAZA_ID`, `FRAMING` entries for `web-plaza` and the three minis, `islandTitle(id)`.

- [ ] **Step 1: Find every importer of the names being renamed**

Run: `grep -rnE "STAR_ISLANDS|StarIslandModule" src scripts --include=*.ts --include=*.tsx --include=*.mjs`
Expected: `src/world/scene/InitialView.tsx` (4, 11), `src/world/scene/islands/index.ts` (3, 14, 21), `src/world/scene/islands/types.ts` (7), `src/world/scene/TourCamera.tsx` (7, 27), `src/world/scene/World.tsx` (7, 30, 40, 73). All are changed in this task.

- [ ] **Step 2: Write the failing tests**

Create `src/world/scene/islands/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { WEB_PLAZA_ID, buildLayout } from "@/world/engine/gen/layout";
import { ISLANDS } from "./index";
import { FRAMING, tourStopFor } from "./framing";

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

  it("keeps the Web & Apps islands bare for now: terrain only, no props and no collision", () => {
    for (const id of WEB) {
      expect(ISLANDS[id].stamp, id).toBeUndefined();
      expect(ISLANDS[id].Component({ placement: layout.islands[0] }), id).toBeNull();
    }
  });
});
```

Create `src/world/scene/islands/shared/project.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { islandTitle, projectById } from "./project";

describe("islandTitle", () => {
  it("names the hero, the Web & Apps plaza and every project island", () => {
    expect(islandTitle("hero")).toBe("Ezra Brilliant");
    expect(islandTitle("web-plaza")).toBe("Web & Apps");
    expect(islandTitle("orbit-store")).toBe("Orbit Store");
    expect(islandTitle("ezra-bot")).toBe("Ezra Bot");
    expect(islandTitle("pos-monosuko")).toBe("POS Monosuko");
    expect(islandTitle("pedulipasal")).toBe("PeduliPasal");
  });
  it("falls back to the id for an unknown island", () => {
    expect(islandTitle("nope")).toBe("nope");
  });
});

describe("projectById", () => {
  it("finds a project and throws for an unknown id", () => {
    expect(projectById("bee-furniture-crm").title).toBe("Bee Furniture CRM");
    expect(() => projectById("nope")).toThrow("Unknown world project: nope");
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/world/scene/islands/index.test.ts src/world/scene/islands/shared/project.test.ts`
Expected: FAIL, `Tests  5 failed | 1 passed (6)`: `TypeError: Cannot convert undefined or null to object` (no `ISLANDS` yet), `TypeError: Cannot read properties of undefined (reading 'hero')`, `TypeError: Cannot read properties of undefined (reading 'undefined')` and twice `TypeError: islandTitle is not a function`.

- [ ] **Step 4: Add the plaza id to the layout**

In `src/world/engine/gen/layout.ts`:

```ts
export const TOUR_ORDER: readonly string[] = ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"];
```

becomes

```ts
export const TOUR_ORDER: readonly string[] = ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"];

/** The Web & Apps district's plaza: an island with no project. */
export const WEB_PLAZA_ID = "web-plaza";
```

- [ ] **Step 5: Rename the module type**

In `src/world/scene/islands/types.ts`:

```ts
export interface StarIslandModule {
  id: string;
  Component: FC<{ placement: IslandPlacement }>;
  stamp?: (grid: VoxelGrid, placement: IslandPlacement) => void;
  tourStop: (placement: IslandPlacement) => TourStop;
}
```

becomes

```ts
/** A hand-built island: its props (Component), its collision (stamp) and its tour framing (tourStop). */
export interface IslandModule {
  id: string;
  Component: FC<{ placement: IslandPlacement }>;
  stamp?: (grid: VoxelGrid, placement: IslandPlacement) => void;
  tourStop: (placement: IslandPlacement) => TourStop;
}

/** Phase 1 name of IslandModule, kept for existing imports. */
export type StarIslandModule = IslandModule;
```

- [ ] **Step 6: The registry**

Replace `src/world/scene/islands/index.ts` with:

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

/** Every star island shares one tour framing (framing.ts) and stamps its FOOTPRINTS cells as barrier collision. */
const star = (id: string, Component: FC<{ placement: IslandPlacement }>): IslandModule => ({
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
  hero: star("hero", HeroIsland),
  gtid: star("gtid", GtidIsland),
  "petak-umpet": star("petak-umpet", PetakUmpetIsland),
  "orbit-store": star("orbit-store", OrbitStoreIsland),
  "ezra-bot": star("ezra-bot", EzraBotIsland),
  [WEB_PLAZA_ID]: bare(WEB_PLAZA_ID),
  "pos-monosuko": bare("pos-monosuko"),
  "bee-furniture-crm": bare("bee-furniture-crm"),
  pedulipasal: bare("pedulipasal"),
};
```

- [ ] **Step 7: Framings for the four new islands**

In `src/world/scene/islands/framing.ts`, inside `FRAMING`:

```ts
  "ezra-bot": { cam: [-2.9, 6.7, 13.3], target: [-0.5, 1.6, -0.6], dwell: 1 }, // same heading, 15 out: the chat replies are the subject
};
```

becomes

```ts
  "ezra-bot": { cam: [-2.9, 6.7, 13.3], target: [-0.5, 1.6, -0.6], dwell: 1 }, // same heading, 15 out: the chat replies are the subject
  // Web & Apps: the plaza framed like a small star; the radius-4 minis closer (~12.8 out, ~17° yaw: at the stars' ~10°
  // PeduliPasal's lopsided rim pulls its portrait framing off centre). Starting values until the islands are dressed.
  "web-plaza": { cam: [-4.2, 6.6, 14.4], target: [-1.5, 1.2, -0.8], dwell: 1 },
  "pos-monosuko": { cam: [-4.2, 5.2, 11.2], target: [-0.6, 1.8, -0.6], dwell: 1 },
  "bee-furniture-crm": { cam: [-4.2, 5.2, 11.2], target: [-0.6, 1.8, -0.6], dwell: 1 },
  pedulipasal: { cam: [-4.2, 5.2, 11.2], target: [-0.6, 1.8, -0.6], dwell: 1 },
};
```

Why these values (measured once A4 puts the islands on the tour): the mini camera sits 12.8 blocks from its target, inside `framing.test.ts`'s 10–20 window, 11.2 in front (> 8). At the master's suggested `[-3.4, 5.2, 11.6]` PeduliPasal's portrait stop puts its centre column at x = −0.124 in NDC, outside the test's 0.12 bound (its generated rim is lopsided); at `[-4.2, 5.2, 11.2]` it is −0.105, POS −0.028, Bee −0.010.

- [ ] **Step 8: `islandTitle`**

Replace `src/world/scene/islands/shared/project.ts` with:

```ts
import { worldCopy, worldProjects } from "@/config/portfolio";
import type { WorldProject } from "@/config/schema";
import { WEB_PLAZA_ID } from "@/world/engine/gen/layout";

export function projectById(id: string): WorldProject {
  const p = worldProjects.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown world project: ${id}`);
  return p;
}

/** Display name of an island: its project's title, the hero's name, or the district name for the Web & Apps plaza. */
export function islandTitle(id: string): string {
  if (id === "hero") return worldCopy.heroName;
  if (id === WEB_PLAZA_ID) return worldCopy.webDistrict;
  return worldProjects.find((x) => x.id === id)?.title ?? id;
}
```

- [ ] **Step 9: Point the world at `ISLANDS`**

`src/world/scene/World.tsx`, four edits:

```ts
import { STAR_ISLANDS } from "./islands";
```
→
```ts
import { ISLANDS } from "./islands";
```

```ts
    (p) => (grid: VoxelGrid) => STAR_ISLANDS[p.id]?.stamp?.(grid, p),
```
→
```ts
    (p) => (grid: VoxelGrid) => ISLANDS[p.id]?.stamp?.(grid, p),
```

```ts
    const cam = STAR_ISLANDS.hero?.tourStop(hero).camera;
```
→
```ts
    const cam = ISLANDS.hero?.tourStop(hero).camera;
```

```ts
        const M = STAR_ISLANDS[p.id];
```
→
```ts
        const M = ISLANDS[p.id];
```

`src/world/scene/TourCamera.tsx`, two edits:

```ts
import { STAR_ISLANDS } from "./islands";
```
→
```ts
import { ISLANDS } from "./islands";
```

```ts
      const p = buildTour(runtime.layout, (pl) => STAR_ISLANDS[pl.id].tourStop(pl), portrait);
```
→
```ts
      const p = buildTour(runtime.layout, (pl) => ISLANDS[pl.id].tourStop(pl), portrait);
```

`src/world/scene/InitialView.tsx`, two edits:

```ts
import { STAR_ISLANDS } from "./islands";
```
→
```ts
import { ISLANDS } from "./islands";
```

```ts
    const stop = runtime.tourPath?.stops[0] ?? STAR_ISLANDS.hero.tourStop(runtime.islandById("hero"));
```
→
```ts
    const stop = runtime.tourPath?.stops[0] ?? ISLANDS.hero.tourStop(runtime.islandById("hero"));
```

- [ ] **Step 10: The minecart sign names islands with `islandTitle`**

Without this, the coming Ezra Bot → plaza cart would read "Minecart → web-plaza" (the old lookup falls back to the id). In `src/world/scene/crossings/Minecart.tsx`, delete the import line

```ts
import { worldProjects } from "@/config/portfolio";
```

add one import after `import { WorldText } from "../WorldText";`:

```ts
import { WorldText } from "../WorldText";
import { islandTitle } from "../islands/shared/project";
```

delete the helper line

```ts
const titleOf = (id: string) => worldProjects.find((p) => p.id === id)?.title ?? id;
```

and change its two uses:

```tsx
          label={`Ride to ${titleOf(dest)}`}
```
→
```tsx
          label={`Ride to ${islandTitle(dest)}`}
```

```tsx
                <WorldText text={`Minecart\n→ ${titleOf(dest)}`} position={[0, 1.62, 0.05]} size={0.2} color="#3a2a1c" />
```
→
```tsx
                <WorldText text={`Minecart\n→ ${islandTitle(dest)}`} position={[0, 1.62, 0.05]} size={0.2} color="#3a2a1c" />
```

- [ ] **Step 11: Run the tests, the type check and the linter**

Run: `grep -rn "STAR_ISLANDS\|titleOf" src/world/scene --include=*.ts --include=*.tsx`
Expected: only `src/world/scene/crossings/BouncePad.tsx` lines 29 and 90 (its own `titleOf`, unchanged); no `STAR_ISLANDS`.

Run: `npx vitest run src/world/scene/islands/index.test.ts src/world/scene/islands/shared/project.test.ts`
Expected: PASS, `Tests  6 passed (6)`.

Run: `npx vitest run`
Expected: `Test Files  58 passed (58)`, `Tests  427 passed (427)`.

Run: `npx tsc -b` then `npx eslint .`
Expected: no output.

- [ ] **Step 12: Check the world still runs unchanged**

```bash
npm run build
npm run shot -- "?stop=4" shots/a3-ezra-bot.png 1280x720
```

Expected: the build ends with `✓ built in …`; the shot prints `shot -> …shots\a3-ezra-bot.png`. Open it: the Ezra Bot island exactly as before (robot, three chat bubbles, the "Discord / 1,000+ members" board at the front left, the "Ezra Bot online" screen, the "Add to Discord" sign).

- [ ] **Step 13: Commit**

```bash
git add src/world/engine/gen/layout.ts src/world/scene/islands/types.ts src/world/scene/islands/index.ts src/world/scene/islands/index.test.ts src/world/scene/islands/framing.ts src/world/scene/islands/shared/project.ts src/world/scene/islands/shared/project.test.ts src/world/scene/World.tsx src/world/scene/TourCamera.tsx src/world/scene/InitialView.tsx src/world/scene/crossings/Minecart.tsx
git commit -q -F - <<'EOF'
feat(world): one island registry with bare Web & Apps islands and their tour framings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task A4: Layout: the Web & Apps district and the derived tour, end to end

**Files:**
- Replace: `src/world/engine/gen/layout.ts`
- Test (replace): `src/world/engine/gen/layout.test.ts`
- Modify: `src/world/scene/tour/tourMath.ts`, `src/world/scene/islands/framing.ts`, `scripts/shoot-stops.mjs`
- Test (modify): `src/world/scene/tour/tourMath.test.ts`, `src/world/scene/tour/tourMotion.test.ts`, `src/world/scene/islands/framing.test.ts`, `src/world/scene/islands/layouts.test.ts`, `src/world/scene/crossings/geometry.test.ts`, `src/world/scene/crossings/cartFollow.test.ts`

**Interfaces:**
- Consumes: `WEB_PLAZA_ID`, `ISLANDS`, the `FRAMING` entries (A3); `worldProjects` with the three web minis (A2).
- Produces: `IslandKind` with `"hub"`, `HUB_RADIUS`, `HUB_DEPTH`, `STAR_TOUR`, `CHAIN_DIR` (the framings' screen-right, 12°), `CHAIN_HEIGHTS`, `CHAIN_DEPTH`, `CHAIN_BRIDGE`, `webChain(hub, radii, taken, seeds?)`; `DISTRICT_HUBS.web.origin = (120, 8, −6)`; `edgeAnchor` from the true centre on `hub` / `mini` islands; `buildLayout` emitting the plaza and the chain, with `tourOrder` = `STAR_TOUR` (present ones) + `web-plaza` + the web minis in config order. Removes `TOUR_ORDER`.

**Where the plaza goes.** The plaza is `DISTRICT_HUBS.web.origin = (120, 8, −6)`: 36.5 blocks past Ezra Bot along `CHAIN_DIR`, 1.6 further from the camera, at y = 8 (Ezra Bot is at 14). The Ezra Bot → plaza crossing is a district change, so a minecart. Measured alternatives:
- At 33–40 blocks along, the rail is 26.6–34.2 long and 21.6–28.6° steep.
- With no depth offset, the station's sign lands on Ezra Bot's screen board: footprint gap −0.6.
- 1–4 blocks deeper, the station snaps to (4, 0) and every prop stays clear.

**How `webChain` places island i** (spec §3.2):
1. From the previous island (the hub for i = 0), it aims at a point one clearance plus 0.5 block away: `(r1 + r2) × 1.25 + 3 + 0.5`, the layout's no-overlap margin plus slack. The aim is split into a step along `CHAIN_DIR` and a step along the screen-forward, which lands the island at depth −3 (nearer, even i) or +3 (further, odd i) from the chain axis.
2. Of the whole columns within ±3 of that point, it keeps those whose bridge (3D, between the two edge anchors) is 6–9 blocks long, that lie forward along `CHAIN_DIR`, and that overlap nothing placed so far.
3. Given `seeds`, it also keeps only columns where both bridge ends land on grass under a 0.7-wide foot.
4. It takes the column nearest the ideal point; ties go to the first in x-then-z scan order.
5. Heights come from `CHAIN_HEIGHTS` [1, 2, 1] above the hub, so every step is ≤ 2 blocks and `chooseCrossing` picks a bridge.

Two findings shaped this:
- `edgeAnchor` measured from the origin corner, while islands are centred on `origin + 0.5`. Every chain bridge arrives on its island's −x side, so from the corner the anchor sat half a block past a radius-4 rim. In the first attempt the POS → Bee bridge's last plank hung over air, and `geometry.test.ts`'s "lays every plank top…" failed. Hence the true-centre anchor for `hub` / `mini`, plus the grass check.
- With the further-first zigzag, Bee's rim dips exactly where the bridge from POS arrives. The grass check then pushed Bee 4.6 blocks toward the camera, and the POS → Bee camera move went 47 % toward the viewer. Nearer-first lands every bridge end on a full rim at depths −2.96 / +2.68 / −2.86.

- [ ] **Step 1: Write the failing layout test**

Replace `src/world/engine/gen/layout.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import type { District, WorldProject } from "@/config/schema";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { hashString } from "@/world/engine/gen/rng";
import {
  CHAIN_BRIDGE, CHAIN_DEPTH, CHAIN_DIR, CHAIN_HEIGHTS, DISTRICT_HUBS, HUB_DEPTH, HUB_RADIUS, MINI_RADIUS, STAR_ANCHORS,
  STAR_TOUR, WEB_PLAZA_ID, buildLayout, chooseCrossing, edgeAnchor, webChain, type IslandPlacement, type WorldLayout,
} from "@/world/engine/gen/layout";

function place(id: string, district: IslandPlacement["district"], y: number, x = 0): IslandPlacement {
  return { id, kind: district === "hero" ? "hero" : "star", district, origin: { x, y, z: 0 }, radius: 6, depth: 6, seed: 1 };
}

const mini = (id: string, district: District = "web"): WorldProject => ({
  id, title: id, year: 2025, line: "x", tags: [], tier: "mini", links: {}, district,
});
const WEB_MINIS = ["pos-monosuko", "bee-furniture-crm", "pedulipasal"];
/** The tour's screen-forward: CHAIN_DIR is its right vector (−F.z, F.x), so F = (R.z, −R.x). */
const FWD = { x: CHAIN_DIR.z, z: -CHAIN_DIR.x };
const flat = (a: IslandPlacement, b: IslandPlacement) => Math.hypot(a.origin.x - b.origin.x, a.origin.z - b.origin.z);

describe("chooseCrossing", () => {
  it("uses a minecart between different districts", () => {
    expect(chooseCrossing(place("a", "game", 0), place("b", "discord", 0))).toBe("minecart");
  });
  it("uses bounce pads for height differences above 2 blocks", () => {
    expect(chooseCrossing(place("a", "discord", 10), place("b", "discord", 14))).toBe("bouncePads");
    expect(chooseCrossing(place("h", "hero", 0), place("b", "discord", 10))).toBe("bouncePads");
  });
  it("uses a bridge otherwise (hero counts as no district)", () => {
    expect(chooseCrossing(place("h", "hero", 0), place("g", "game", 2))).toBe("bridge");
    expect(chooseCrossing(place("a", "game", 3), place("b", "game", 1))).toBe("bridge");
  });
});

describe("edgeAnchor", () => {
  it("sits on the rim facing the other island, on the walkable surface", () => {
    const a = place("a", "game", 2, 0), b = place("b", "game", 3, 30);
    const p = edgeAnchor(a, b);
    expect(p.y).toBe(3);
    expect(Math.hypot(p.x - a.origin.x, p.z - a.origin.z)).toBeCloseTo(a.radius * 0.75, 9);
    expect(p.x).toBeGreaterThan(a.origin.x);
    expect(p.z).toBeCloseTo(0, 9);
  });
  it("measures from the true centre (origin + 0.5) on the small Web & Apps islands", () => {
    const hub: IslandPlacement = { ...place("h", "game", 2, 0), kind: "hub", radius: 5 };
    const mini: IslandPlacement = { ...place("m", "game", 3, 20), kind: "mini", radius: 4 };
    const p = edgeAnchor(hub, mini), q = edgeAnchor(mini, hub);
    expect(p).toEqual({ x: 0.5 + 3.75, y: 3, z: 0.5 });
    expect(q).toEqual({ x: 20.5 - 3, y: 4, z: 0.5 });
    // the hero and star islands keep the Phase 1 anchors, measured from the origin corner
    expect(edgeAnchor(place("a", "game", 2, 0), mini)).toEqual({ x: 4.5, y: 3, z: 0 });
  });
});

describe("CHAIN_DIR", () => {
  it("is the tour's screen-right: unit length, 12° from +x toward +z", () => {
    expect(Math.hypot(CHAIN_DIR.x, CHAIN_DIR.z)).toBeCloseTo(1, 12);
    expect((Math.atan2(CHAIN_DIR.z, CHAIN_DIR.x) * 180) / Math.PI).toBeCloseTo(12, 9);
    expect(CHAIN_DIR.x).toBeCloseTo(0.9781, 4);
    expect(CHAIN_DIR.z).toBeCloseTo(0.2079, 4);
  });
});

describe("buildLayout", () => {
  const layout = buildLayout(worldProjects);
  const byId = (l: WorldLayout, id: string) => l.islands.find((i) => i.id === id)!;

  it("places the hero and the four stars at their anchors", () => {
    const anchored = layout.islands.filter((i) => i.kind === "hero" || i.kind === "star");
    expect(anchored.map((i) => i.id)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    for (const isl of anchored) {
      expect(isl.origin).toEqual(STAR_ANCHORS[isl.id].origin);
      expect(isl.radius).toBe(STAR_ANCHORS[isl.id].radius);
    }
    expect(layout.islands[0].kind).toBe("hero");
    expect(layout.islands[1].district).toBe("game");
  });

  it("emits the Web & Apps plaza as a hub on the district slot", () => {
    const hub = byId(layout, WEB_PLAZA_ID);
    expect(hub).toMatchObject({ kind: "hub", district: "web", radius: HUB_RADIUS, depth: HUB_DEPTH });
    expect(hub.origin).toEqual(DISTRICT_HUBS.web.origin);
    expect(hub.origin).toEqual({ x: 120, y: 8, z: -6 });
  });

  it("puts the plaza after Ezra Bot on the tour's right, 6 blocks lower", () => {
    const ezra = byId(layout, "ezra-bot"), hub = byId(layout, WEB_PLAZA_ID);
    const dx = hub.origin.x - ezra.origin.x, dz = hub.origin.z - ezra.origin.z;
    const along = dx * CHAIN_DIR.x + dz * CHAIN_DIR.z;
    const depth = dx * FWD.x + dz * FWD.z;
    expect(along).toBeGreaterThan(34);
    expect(along).toBeLessThan(38);
    expect(Math.abs(depth)).toBeLessThanOrEqual(CHAIN_DEPTH);
    expect(ezra.origin.y - hub.origin.y).toBe(6);
  });

  it("emits no plaza and keeps the star tour when there are no web projects", () => {
    const l = buildLayout(worldProjects.filter((p) => p.district !== "web"));
    expect(l.islands.some((i) => i.kind === "hub")).toBe(false);
    expect(l.tourOrder).toEqual([...STAR_TOUR]);
  });

  it("derives the tour order: the stars, the plaza, then the web minis in config order", () => {
    expect(STAR_TOUR).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    expect(layout.tourOrder).toEqual([...STAR_TOUR, WEB_PLAZA_ID, ...WEB_MINIS]);
    const minis = worldProjects.filter((p) => p.tier === "mini");
    const flipped = buildLayout([...worldProjects.filter((p) => p.tier === "star"), ...[...minis].reverse()]);
    expect(flipped.tourOrder).toEqual([...STAR_TOUR, WEB_PLAZA_ID, ...[...WEB_MINIS].reverse()]);
  });

  it("places the web district at the pinned origins (Parts B and C build on these)", () => {
    expect(WEB_MINIS.map((id) => byId(layout, id).origin)).toEqual([
      { x: 134, y: 9, z: 0 },
      { x: 147, y: 10, z: -3 },
      { x: 158, y: 9, z: 5 },
    ]);
    for (const id of WEB_MINIS) expect(byId(layout, id)).toMatchObject({ kind: "mini", district: "web", radius: MINI_RADIUS });
  });

  it("links consecutive islands with the crossing the rules pick: minecart to the plaza, bridges along the chain", () => {
    expect(layout.crossings.map((c) => `${c.from}>${c.to}:${c.kind}`)).toEqual([
      "hero>gtid:bridge",
      "gtid>petak-umpet:bridge",
      "petak-umpet>orbit-store:minecart",
      "orbit-store>ezra-bot:bouncePads",
      "ezra-bot>web-plaza:minecart",
      "web-plaza>pos-monosuko:bridge",
      "pos-monosuko>bee-furniture-crm:bridge",
      "bee-furniture-crm>pedulipasal:bridge",
    ]);
    const first = layout.crossings[0];
    expect(first.a.y).toBe(STAR_ANCHORS.hero.origin.y + 1);
    expect(first.b.y).toBe(STAR_ANCHORS.gtid.origin.y + 1);
  });

  it("is deterministic", () => {
    expect(buildLayout(worldProjects)).toEqual(layout);
  });

  // the shipped chain, and a longer one that runs CHAIN_HEIGHTS round more than once
  const longer = buildLayout([...worldProjects, mini("alpha"), mini("beta"), mini("gamma")]);
  for (const [name, l] of [["shipped", layout], ["six minis", longer]] as const) {
    describe(`web chain rules (${name})`, () => {
      const hub = byId(l, WEB_PLAZA_ID);
      const chain = l.tourOrder.slice(l.tourOrder.indexOf(WEB_PLAZA_ID) + 1).map((id) => byId(l, id));
      const links = [hub, ...chain].slice(1).map((b, i) => [[hub, ...chain][i], b] as const);

      it("chains every web mini", () => {
        expect(chain.length).toBe(name === "shipped" ? 3 : 6);
      });

      it("keeps each bridge 6–9 blocks long between the edge anchors", () => {
        for (const [a, b] of links) {
          const p = edgeAnchor(a, b), q = edgeAnchor(b, a);
          const len = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
          expect(len, `${a.id} → ${b.id}`).toBeGreaterThanOrEqual(CHAIN_BRIDGE.min);
          expect(len, `${a.id} → ${b.id}`).toBeLessThanOrEqual(CHAIN_BRIDGE.max);
        }
        expect(CHAIN_BRIDGE).toEqual({ min: 6, max: 9 });
      });

      it("steps at most 2 blocks up or down, at CHAIN_HEIGHTS above the hub, so every link is a bridge", () => {
        chain.forEach((m, i) => expect(m.origin.y - hub.origin.y, m.id).toBe(CHAIN_HEIGHTS[i % CHAIN_HEIGHTS.length]));
        expect(CHAIN_HEIGHTS).toEqual([1, 2, 1]);
        for (const [a, b] of links) {
          expect(Math.abs(b.origin.y - a.origin.y), `${a.id} → ${b.id}`).toBeLessThanOrEqual(2);
          expect(chooseCrossing(a, b)).toBe("bridge");
          expect(l.crossings.find((c) => c.from === a.id && c.to === b.id)?.kind).toBe("bridge");
        }
      });

      it("overlaps no other island (the layout's clearance margin)", () => {
        for (const a of [hub, ...chain]) {
          for (const b of l.islands) {
            if (a === b) continue;
            expect(flat(a, b), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual((a.radius + b.radius) * 1.25 + 3);
          }
        }
      });

      it("advances along CHAIN_DIR, alternately nearer to and further from the tour camera", () => {
        for (const [a, b] of links) {
          const along = (b.origin.x - a.origin.x) * CHAIN_DIR.x + (b.origin.z - a.origin.z) * CHAIN_DIR.z;
          expect(along, `${a.id} → ${b.id}`).toBeGreaterThan(8);
        }
        chain.forEach((m, i) => {
          const depth = (m.origin.x - hub.origin.x) * FWD.x + (m.origin.z - hub.origin.z) * FWD.z;
          expect(Math.sign(depth), m.id).toBe(i % 2 === 0 ? -1 : 1);
          // whole columns, and moving a bridge end onto grass, shift an island up to ~2 blocks off its nominal depth
          expect(Math.abs(Math.abs(depth) - CHAIN_DEPTH), m.id).toBeLessThan(name === "shipped" ? 1 : 2);
        });
      });

      it("lands both ends of every chain bridge on grass (Ezra's 0.6-wide feet)", () => {
        const top = (isl: IslandPlacement) => generateIsland({ radius: isl.radius, depth: isl.depth, seed: isl.seed });
        for (const [a, b] of links) {
          for (const [from, to] of [[a, b], [b, a]] as const) {
            const p = edgeAnchor(from, to);
            const shape = top(from);
            for (const ox of [-0.3, 0.3]) {
              for (const oz of [-0.3, 0.3]) {
                const cell = shape.surface(Math.floor(p.x + ox) - from.origin.x, Math.floor(p.z + oz) - from.origin.z);
                expect(cell, `${from.id} end of ${a.id} → ${b.id}`).toBe(0);
              }
            }
          }
        }
      });

      it("runs no crossing over a third island", () => {
        for (const c of l.crossings) {
          const dx = c.b.x - c.a.x, dz = c.b.z - c.a.z;
          const len2 = dx * dx + dz * dz;
          for (const isl of l.islands) {
            if (isl.id === c.from || isl.id === c.to) continue;
            const t = Math.min(1, Math.max(0, ((isl.origin.x - c.a.x) * dx + (isl.origin.z - c.a.z) * dz) / len2));
            const d = Math.hypot(c.a.x + dx * t - isl.origin.x, c.a.z + dz * t - isl.origin.z);
            expect(d, `${c.from} → ${c.to} over ${isl.id}`).toBeGreaterThan(isl.radius * 1.2 + 1);
          }
        }
      });
    });
  }

  it("webChain avoids taken islands and reports when there is no room", () => {
    const hub = byId(layout, WEB_PLAZA_ID);
    const [first] = webChain(hub, [MINI_RADIUS], [hub], [hashString("pos-monosuko")]);
    expect(first).toEqual({ x: 134, y: 9, z: 0 });
    // a small island just past the first slot pushes the chain off it; one covering every candidate column stops it
    const blocker = (x: number, z: number, radius: number): IslandPlacement => ({ ...hub, id: "blocker", origin: { x, y: 0, z }, radius });
    const small = blocker(first.x + 8, first.z + 4, 1);
    const [moved] = webChain(hub, [MINI_RADIUS], [hub, small]);
    expect(moved).not.toEqual(first);
    expect(Math.hypot(moved.x - small.origin.x, moved.z - small.origin.z)).toBeGreaterThanOrEqual((1 + MINI_RADIUS) * 1.25 + 3);
    const p = edgeAnchor(hub, { ...hub, origin: moved, radius: MINI_RADIUS }), q = edgeAnchor({ ...hub, origin: moved, radius: MINI_RADIUS }, hub);
    expect(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)).toBeLessThanOrEqual(CHAIN_BRIDGE.max);
    expect(() => webChain(hub, [MINI_RADIUS], [hub, blocker(first.x, first.z, 6)])).toThrow("webChain: no free column for chain island 0");
  });

  it("gives minis of other districts non-overlapping satellite slots off the tour; web minis join the chain", () => {
    const extra = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].map((id, i) => mini(id, (["game", "discord", "web"] as const)[i % 3]));
    const l = buildLayout([...worldProjects, ...extra]);
    const placed = l.islands.filter((i) => i.kind === "mini");
    expect(placed).toHaveLength(6 + 3);
    for (const m of placed) {
      for (const other of l.islands) {
        if (other === m) continue;
        expect(flat(other, m)).toBeGreaterThanOrEqual((other.radius + m.radius) * 1.25 + 3);
      }
    }
    expect(l.tourOrder).toEqual([...STAR_TOUR, WEB_PLAZA_ID, ...WEB_MINIS, "gamma", "zeta"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/gen/layout.test.ts`
Expected: FAIL, `TypeError: Cannot read properties of undefined (reading 'z')` while loading the file (`CHAIN_DIR` does not exist yet), `Tests  no tests`.

- [ ] **Step 3: Implement the layout**

Replace `src/world/engine/gen/layout.ts` with:

```ts
import type { District, WorldProject } from "@/config/schema";
import { generateIsland, type IslandShape } from "@/world/engine/gen/islandGen";
import { hashString } from "@/world/engine/gen/rng";
import type { Vec3, Vec3i } from "@/world/engine/types";

export type IslandKind = "hero" | "star" | "mini" | "hub";
export interface IslandPlacement {
  id: string; kind: IslandKind; district: District | "hero";
  origin: Vec3i; radius: number; depth: number; seed: number;
}
export type CrossingKind = "bridge" | "bouncePads" | "minecart";
export interface Crossing { kind: CrossingKind; from: string; to: string; a: Vec3; b: Vec3 }
export interface WorldLayout { islands: IslandPlacement[]; crossings: Crossing[]; tourOrder: string[] }

type Anchor = { origin: Vec3i; radius: number; depth: number };
type Disc = Pick<IslandPlacement, "origin" | "radius">;

export const STAR_ANCHORS: Record<string, Anchor> = {
  hero: { origin: { x: 0, y: 0, z: 0 }, radius: 6, depth: 6 },
  gtid: { origin: { x: 22, y: 2, z: -8 }, radius: 9, depth: 7 },
  "petak-umpet": { origin: { x: 44, y: 3, z: -2 }, radius: 9, depth: 7 },
  "orbit-store": { origin: { x: 64, y: 10, z: -18 }, radius: 8, depth: 6 },
  "ezra-bot": { origin: { x: 84, y: 14, z: -12 }, radius: 8, depth: 6 },
};

/** The hero and the star islands, in tour order (the tour continues with the web plaza and its chain). */
export const STAR_TOUR: readonly string[] = ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"];

/** The Web & Apps district's plaza: an island with no project, emitted when any web project exists. */
export const WEB_PLAZA_ID = "web-plaza";
export const HUB_RADIUS = 5;
export const HUB_DEPTH = 5;

export const DISTRICT_HUBS: Record<District, { origin: Vec3i; radius: number }> = {
  game: { origin: STAR_ANCHORS.gtid.origin, radius: STAR_ANCHORS.gtid.radius },
  discord: { origin: STAR_ANCHORS["orbit-store"].origin, radius: STAR_ANCHORS["orbit-store"].radius },
  // the tour continues to the right: 36 blocks past Ezra Bot along CHAIN_DIR and 2 further from the camera, 6 lower
  // (the Ezra Bot → plaza rail is 31.5 blocks, at most 24° steep, and its station clears Ezra Bot's screen board)
  web: { origin: { x: 120, y: 8, z: -6 }, radius: HUB_RADIUS },
};

export const MINI_RADIUS = 4;
export const MINI_DEPTH = 4;
const GOLDEN_ANGLE = 2.39996;

/**
 * Screen-right of the tour: the island framings (scene/islands/framing.ts) look from the front-left, their camera →
 * target headings 10–20° off −z, and their right vectors average 11.9° from +x toward +z. The engine must not import
 * the scene, so it keeps this 12° copy; islands/framing.test.ts checks it stays within 3° of the framings' average.
 */
const CHAIN_YAW = (12 * Math.PI) / 180;
/** The web chain (and the plaza after Ezra Bot) advances along the tour's screen-right, unit length. */
export const CHAIN_DIR: { x: number; z: number } = { x: Math.cos(CHAIN_YAW), z: Math.sin(CHAIN_YAW) };
/** The tour's screen-forward (into the screen): the depth axis of the chain's zigzag. */
const CHAIN_FWD = { x: CHAIN_DIR.z, z: -CHAIN_DIR.x };
/** Height of each chain island above the hub, per chain index (repeats): consecutive steps stay ≤ 2 → bridges. */
export const CHAIN_HEIGHTS: readonly number[] = [1, 2, 1];
/** Depth offset (blocks along the tour forward) of chain island i from the chain axis: 3 nearer the camera for even i, 3 further for odd. */
export const CHAIN_DEPTH = 3;
/** Bridge length between consecutive chain islands' edge anchors, in blocks (3D distance). */
export const CHAIN_BRIDGE = { min: 6, max: 9 } as const;
/** How far past the overlap clearance the ideal centre lies (blocks): rounding to whole columns stays inside the window. */
const CHAIN_SLACK = 0.5;

export function chooseCrossing(from: IslandPlacement, to: IslandPlacement): CrossingKind {
  if (from.district !== "hero" && to.district !== "hero" && from.district !== to.district) return "minecart";
  return Math.abs(to.origin.y - from.origin.y) > 2 ? "bouncePads" : "bridge";
}

/**
 * Point on `from`'s rim toward `to`, at 0.75 × radius, on the walkable surface. The generator centres an island on
 * its origin column (origin + 0.5); the hero and star islands keep their Phase 1 anchors, measured from the origin
 * corner (their wide rims never dip below 0.8 × radius), while the small Web & Apps islands (hub, minis) measure from
 * the true centre, or a radius-4 rim misses the bridge end on its −x / −z side.
 */
export function edgeAnchor(from: IslandPlacement, to: IslandPlacement): Vec3 {
  const dx = to.origin.x - from.origin.x;
  const dz = to.origin.z - from.origin.z;
  const len = Math.hypot(dx, dz) || 1;
  const reach = from.radius * 0.75;
  const c = from.kind === "hub" || from.kind === "mini" ? 0.5 : 0;
  return { x: from.origin.x + c + (dx / len) * reach, y: from.origin.y + 1, z: from.origin.z + c + (dz / len) * reach };
}

export function satelliteOrigin(hub: Vec3i, hubRadius: number, index: number): Vec3i {
  const angle = 0.6 + index * GOLDEN_ANGLE;
  const dist = hubRadius * 1.25 + 9 + (index % 2) * 3;   // always clears the hub's own overlap margin
  return {
    x: Math.round(hub.x + Math.cos(angle) * dist),
    y: hub.y + ((index % 3) - 1) * 2,
    z: Math.round(hub.z + Math.sin(angle) * dist),
  };
}

/** Closest centre distance two islands may have: (r1 + r2) × 1.25 + 3 (the generator wobbles rims out to 1.2 × r). */
function clearance(r1: number, r2: number): number {
  return (r1 + r2) * 1.25 + 3;
}

function overlaps(island: Disc, origin: Vec3i, radius: number): boolean {
  const d = Math.hypot(island.origin.x - origin.x, island.origin.z - origin.z);
  return d < clearance(island.radius, radius);
}

/** 3D length of the bridge between two islands' edge anchors (both lie on the centre line, 0.75 × radius in). */
function bridgeLength(a: Disc, b: Disc): number {
  const d = Math.hypot(b.origin.x - a.origin.x, b.origin.z - a.origin.z);
  return Math.hypot(d - 0.75 * (a.radius + b.radius), b.origin.y - a.origin.y);
}

/** Half the width of the ground a bridge end needs under it: Ezra's 0.6-wide feet plus a little. */
const FOOT = 0.35;

/** True when every column under a foot centred on the edge anchor `from` → `to` is grass of `from`'s island. */
function endOnGrass(from: IslandPlacement, shape: IslandShape, to: IslandPlacement): boolean {
  const p = edgeAnchor(from, to);
  for (const dx of [-FOOT, FOOT]) {
    for (const dz of [-FOOT, FOOT]) {
      if (shape.surface(Math.floor(p.x + dx) - from.origin.x, Math.floor(p.z + dz) - from.origin.z) === null) return false;
    }
  }
  return true;
}

/** The grass top of an island (the generator's top layer does not depend on the depth). */
const topOf = (radius: number, seed: number): IslandShape => generateIsland({ radius, depth: 1, seed });

/**
 * Origins for the web district's minis, in config order, as a chain from the hub: each island one plank bridge
 * (CHAIN_BRIDGE, 6–9 blocks between edge anchors) past the previous one, CHAIN_HEIGHTS above the hub (so every
 * step is ≤ 2 blocks and chooseCrossing picks a bridge), advancing along CHAIN_DIR and alternately CHAIN_DEPTH
 * nearer to and further from the tour camera, so the chain zigzags to the right and never doubles back. Each origin is
 * the whole column nearest the ideal point that keeps the bridge in its window, moves forward and overlaps
 * nothing in `taken` or earlier in the chain; given the islands' `seeds` (chain order), both ends of its bridge
 * must also land on grass (a radius-4 rim can dip under the 0.75 × radius anchor). Deterministic.
 */
export function webChain(
  hub: IslandPlacement, radii: readonly number[], taken: readonly IslandPlacement[], seeds?: readonly number[],
): Vec3i[] {
  const placed: Disc[] = taken.map((t) => ({ origin: t.origin, radius: t.radius }));
  const out: Vec3i[] = [];
  let prev: IslandPlacement = hub;
  let prevTop: IslandShape | null = seeds ? topOf(hub.radius, hub.seed) : null;
  radii.forEach((radius, i) => {
    const top = seeds ? topOf(radius, seeds[i]) : null;
    const y = hub.origin.y + CHAIN_HEIGHTS[i % CHAIN_HEIGHTS.length];
    const depth = i % 2 === 0 ? -CHAIN_DEPTH : CHAIN_DEPTH;
    // aim at the nominal depth from where the previous island really is (whole columns drift a little)
    const prevDepth = (prev.origin.x - hub.origin.x) * CHAIN_FWD.x + (prev.origin.z - hub.origin.z) * CHAIN_FWD.z;
    const step = depth - prevDepth;
    const want = clearance(prev.radius, radius) + CHAIN_SLACK;
    const along = Math.sqrt(Math.max(0, want * want - step * step));
    const ideal = {
      x: prev.origin.x + CHAIN_DIR.x * along + CHAIN_FWD.x * step,
      z: prev.origin.z + CHAIN_DIR.z * along + CHAIN_FWD.z * step,
    };
    let best: Vec3i | null = null;
    let bestD = Infinity;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const origin = { x: Math.round(ideal.x) + dx, y, z: Math.round(ideal.z) + dz };
        const len = bridgeLength(prev, { origin, radius });
        if (len < CHAIN_BRIDGE.min || len > CHAIN_BRIDGE.max) continue;
        if ((origin.x - prev.origin.x) * CHAIN_DIR.x + (origin.z - prev.origin.z) * CHAIN_DIR.z <= 0) continue;
        if (placed.some((p) => overlaps(p, origin, radius))) continue;
        const next: IslandPlacement = { ...hub, id: `chain-${i}`, kind: "mini", origin, radius };
        if (prevTop && top && !(endOnGrass(prev, prevTop, next) && endOnGrass(next, top, prev))) continue;
        const d = (origin.x - ideal.x) ** 2 + (origin.z - ideal.z) ** 2;
        if (d < bestD) {
          best = origin;
          bestD = d;
        }
      }
    }
    if (!best) throw new Error(`webChain: no free column for chain island ${i}`);
    out.push(best);
    placed.push({ origin: best, radius });
    prev = { ...hub, id: `chain-${i}`, kind: "mini", origin: best, radius };
    prevTop = top;
  });
  return out;
}

export function buildLayout(projects: readonly WorldProject[]): WorldLayout {
  const islands: IslandPlacement[] = [];
  const hero = STAR_ANCHORS.hero;
  islands.push({ id: "hero", kind: "hero", district: "hero", origin: { ...hero.origin }, radius: hero.radius, depth: hero.depth, seed: hashString("hero") });

  for (const p of projects) {
    const anchor = p.tier === "star" ? (STAR_ANCHORS[p.id] as Anchor | undefined) : undefined;
    if (!anchor) continue;
    islands.push({ id: p.id, kind: "star", district: p.district, origin: { ...anchor.origin }, radius: anchor.radius, depth: anchor.depth, seed: hashString(p.id) });
  }

  // the Web & Apps plaza, then its minis chained from it in config order
  const placedIds = new Set(islands.map((i) => i.id));
  const webMinis = projects.filter((p) => p.district === "web" && !placedIds.has(p.id));
  let hub: IslandPlacement | null = null;
  if (projects.some((p) => p.district === "web")) {
    hub = { id: WEB_PLAZA_ID, kind: "hub", district: "web", origin: { ...DISTRICT_HUBS.web.origin }, radius: HUB_RADIUS, depth: HUB_DEPTH, seed: hashString(WEB_PLAZA_ID) };
    islands.push(hub);
    const origins = webChain(hub, webMinis.map(() => MINI_RADIUS), islands, webMinis.map((p) => hashString(p.id)));
    webMinis.forEach((p, i) => {
      islands.push({ id: p.id, kind: "mini", district: "web", origin: origins[i], radius: MINI_RADIUS, depth: MINI_DEPTH, seed: hashString(p.id) });
    });
  }

  // minis of the other districts: golden-angle satellites around their district hub (not on the tour)
  const slots: Record<District, number> = { game: 0, discord: 0, web: 0 };
  for (const p of projects) {
    if (islands.some((i) => i.id === p.id)) continue;
    const dh = DISTRICT_HUBS[p.district];
    let origin = satelliteOrigin(dh.origin, dh.radius, slots[p.district]++);
    for (let guard = 0; guard < 64 && islands.some((i) => overlaps(i, origin, MINI_RADIUS)); guard++) {
      origin = satelliteOrigin(dh.origin, dh.radius, slots[p.district]++);
    }
    islands.push({ id: p.id, kind: "mini", district: p.district, origin, radius: MINI_RADIUS, depth: MINI_DEPTH, seed: hashString(p.id) });
  }

  const byId = new Map(islands.map((i) => [i.id, i]));
  const tourOrder = [
    ...STAR_TOUR.filter((id) => byId.has(id)),
    ...(hub ? [hub.id, ...webMinis.map((p) => p.id)] : []),
  ];
  const crossings: Crossing[] = [];
  for (let i = 0; i + 1 < tourOrder.length; i++) {
    const a = byId.get(tourOrder[i])!;
    const b = byId.get(tourOrder[i + 1])!;
    crossings.push({ kind: chooseCrossing(a, b), from: a.id, to: b.id, a: edgeAnchor(a, b), b: edgeAnchor(b, a) });
  }
  return { islands, crossings, tourOrder };
}
```

- [ ] **Step 4: Run the layout test**

Run: `npx vitest run src/world/engine/gen/layout.test.ts`
Expected: PASS, `Tests  30 passed (30)`.

- [ ] **Step 5: See what the new tour breaks in the scene**

Run: `npx tsc -b`
Expected: `src/world/scene/tour/tourMath.ts(5,10): error TS2305: Module '"@/world/engine/gen/layout"' has no exported member 'TOUR_ORDER'.`

Run: `npx vitest run`
Expected: FAIL, `Test Files  3 failed | 55 passed (58)`, `Tests  14 failed | 448 passed (462)`:
- `src/world/scene/islands/layouts.test.ts` (4): the new tour islands have no `FOOTPRINTS` yet (`expected 0 to be greater than 0`, `TypeError: FOOTPRINTS[id] is not iterable`).
- `src/world/scene/tour/tourMath.test.ts` (2): the no-DOM scroll measure still assumes five stops (`TypeError: Cannot read properties of undefined (reading 'length')`).
- `src/world/scene/tour/tourMotion.test.ts` (8): its "one viewport per second" rate assumes five stops (`speed jump at stop 1: expected 0.121… to be less than 0.1`), and the chain legs jolt.

Steps 6–12 fix these and add the tests for the new placement.

- [ ] **Step 6: `tourMath`: the scroll fallback and no vias along the chain**

In `src/world/scene/tour/tourMath.ts`, the imports:

```ts
import { TOUR_ORDER } from "@/world/engine/gen/layout";
import type { WorldLayout } from "@/world/engine/gen/layout";
```

become

```ts
import type { WorldLayout } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
```

In `scrollMeasure`:

```ts
  return { trackPx: trackHeightPx(TOUR_ORDER.length, vh), viewportH: vh };
```

becomes

```ts
  return { trackPx: trackHeightPx(runtime.layout.tourOrder.length, vh), viewportH: vh };
```

(`runtime` imports only config and engine code, so this adds no import cycle; `TourScrollTrack` already sizes the real track from `runtime.layout.tourOrder.length`.)

In `tourVia`, the last branch:

```ts
    } else {
      const mid = { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2, z: (c.a.z + c.b.z) / 2 };
      out.push([watch(mid, 9, 18)]);
    }
```

becomes

```ts
    } else if (layout.islands.find((q) => q.id === from)?.district === "web") {
      // the Web & Apps chain: short bridges between small islands; a via behind them would pull the camera back
      // and forth between stops that are only ~14 blocks apart, so the camera flies straight from stop to stop
      out.push([]);
    } else {
      const mid = { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2, z: (c.a.z + c.b.z) / 2 };
      out.push([watch(mid, 9, 18)]);
    }
```

Measured with `tourMotion.test.ts`'s own flight: velocity change per frame ÷ peak speed, bound 0.10.
- With the Phase 1 bridge via (`watch(mid, 9, 18)`, 18 blocks behind the bridge while the mini cameras sit ~12 out), the plaza, POS, Bee and PeduliPasal stops score 0.116 / 0.415 / 0.322 / 0.162 in landscape and 0.198 / 0.460 / 0.286 / 0.176 in portrait.
- With no via they score 0.066 / 0.048 / 0.050 / 0.047 in landscape and 0.065 / 0.047 / 0.049 / 0.048 in portrait.

- [ ] **Step 7: `tourMath.test`: nine stops, no vias along the chain**

In `src/world/scene/tour/tourMath.test.ts`, add the runtime import after the layout import:

```ts
import { buildLayout } from "@/world/engine/gen/layout";
```
→
```ts
import { buildLayout } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
```

```ts
    expect(m.trackPx).toBe(trackHeightPx(5, m.viewportH));
```
→
```ts
    expect(m.trackPx).toBe(trackHeightPx(runtime.layout.tourOrder.length, m.viewportH));
```

```ts
    expect(t.scrollMeasure()).toEqual({ trackPx: 7000, viewportH: 1000 });
```
→
```ts
    expect(t.scrollMeasure()).toEqual({ trackPx: 12600, viewportH: 1000 }); // 9 tour stops × 140 vh
```

and the via-count test:

```ts
  it("gives one via list per consecutive pair, sized by crossing kind", () => {
    const via = tourVia(layout);
    expect(via).toHaveLength(layout.tourOrder.length - 1);
    const expected = { bridge: 1, bouncePads: 3, minecart: 4 } as const;
    layout.tourOrder.slice(0, -1).forEach((from, i) => {
      const to = layout.tourOrder[i + 1];
      const c = layout.crossings.find((x) => x.from === from && x.to === to);
      expect(c).toBeDefined();
      expect(via[i]).toHaveLength(expected[c!.kind]);
    });
  });
```

becomes

```ts
  it("gives one via list per consecutive pair, sized by crossing kind (none along the Web & Apps chain)", () => {
    const via = tourVia(layout);
    expect(via).toHaveLength(layout.tourOrder.length - 1);
    const expected = { bridge: 1, bouncePads: 3, minecart: 4 } as const;
    const district = (id: string) => layout.islands.find((q) => q.id === id)!.district;
    layout.tourOrder.slice(0, -1).forEach((from, i) => {
      const to = layout.tourOrder[i + 1];
      const c = layout.crossings.find((x) => x.from === from && x.to === to);
      expect(c).toBeDefined();
      expect(via[i], `${from} → ${to}`).toHaveLength(district(from) === "web" ? 0 : expected[c!.kind]);
    });
    expect(via.map((v) => v.length)).toEqual([1, 1, 4, 3, 4, 0, 0, 0]);
  });
```

- [ ] **Step 8: `tourMotion.test`: scroll at the real rate**

The test flies "one viewport of scroll per second" but sized the track for five stops; with nine stops that constant scrolls ~1.8× too fast (`speed jump at stop 1: expected 0.121… to be less than 0.1`). In `src/world/scene/tour/tourMotion.test.ts`:

```ts
const VIEWPORT_PER_S = 1 / (trackHeightPx(5, 1) - 1);
```
→
```ts
const VIEWPORT_PER_S = 1 / (trackHeightPx(layout.tourOrder.length, 1) - 1);
```

- [ ] **Step 9: A slightly longer hero dwell**

With nine stops each leg is a smaller share of the scroll, and the camera easing off the hero in portrait measures 0.102 against the 0.10 turn bound ("turn jolt at stop 0"). A dwell of 1.4 measures 0.082; landscape stays 0.062–0.085. In `src/world/scene/islands/framing.ts`:

```ts
  hero: { cam: [-4.8, 7.3, 16.1], target: [-1.8, 1, -1], dwell: 1.2 },
```
→
```ts
  hero: { cam: [-4.8, 7.3, 16.1], target: [-1.8, 1, -1], dwell: 1.4 }, // 1.4: with nine stops, 1.2 eased off too abruptly
```

- [ ] **Step 10: Footprint tests for the islands that have props**

The new islands are bare until Part C, so the footprint tests cover the islands that have `FOOTPRINTS`. The Ezra Bot → plaza station lands on Ezra Bot's east rim behind its screen board: station (4, 0), sign (3.72, 1.42). That spot clears every Ezra Bot footprint cell (station 1.30, sign 0.23), so no prop moves. Part A's first draft placed the plaza on the Phase 1 slot, where the station landed on Ezra Bot's info board; the move is no longer needed. The resume-after-Play test in `modes.test.ts` also passes unchanged with its ±4-block offsets.

In `src/world/scene/islands/layouts.test.ts`, import `STAR_TOUR`:

```ts
import { buildLayout } from "@/world/engine/gen/layout";
```
→
```ts
import { STAR_TOUR, buildLayout } from "@/world/engine/gen/layout";
```

scope the footprint tests to the dressed islands:

```ts
describe("island prop footprints", () => {
  it("exist for every tour island", () => {
    for (const id of layout.tourOrder) expect(FOOTPRINTS[id]?.length ?? 0).toBeGreaterThan(0);
  });

  it("stay on the island (inside 78% of the radius, the narrowest rim after noise)", () => {
    for (const id of layout.tourOrder) {
```

becomes

```ts
// islands with hand-built props; the Web & Apps islands join as their modules land (terrain only until then)
const dressed = layout.tourOrder.filter((id) => FOOTPRINTS[id] !== undefined);
const footprint = (id: string) => FOOTPRINTS[id] ?? [];

describe("island prop footprints", () => {
  it("exist for the hero and every star island", () => {
    for (const id of STAR_TOUR) expect(FOOTPRINTS[id]?.length ?? 0).toBeGreaterThan(0);
    expect(dressed).toEqual(expect.arrayContaining([...STAR_TOUR]));
  });

  it("stay on the island (inside 78% of the radius, the narrowest rim after noise)", () => {
    for (const id of dressed) {
```

and read footprints through the helper in the two crossing tests:

```ts
        for (const [x, , z] of FOOTPRINTS[id]) {
          expect(Math.hypot(x - a.x, z - a.z), `${id} (${x},${z}) vs ${c.kind}`).toBeGreaterThanOrEqual(2);
```
→
```ts
        for (const [x, , z] of footprint(id)) {
          expect(Math.hypot(x - a.x, z - a.z), `${id} (${x},${z}) vs ${c.kind}`).toBeGreaterThanOrEqual(2);
```

```ts
      for (const [x, , z] of FOOTPRINTS[f.id]) {
        // gap between the cell's square and the furniture's square; negative = they overlap
```
→
```ts
      for (const [x, , z] of footprint(f.id)) {
        // gap between the cell's square and the furniture's square; negative = they overlap
```

- [ ] **Step 11: Tests for the chain direction and the rightward tour**

`src/world/scene/islands/framing.test.ts`. The imports:

```ts
import { buildLayout } from "@/world/engine/gen/layout";
```
→
```ts
import { CHAIN_DIR, STAR_TOUR, WEB_PLAZA_ID, buildLayout } from "@/world/engine/gen/layout";
```

```ts
import { PORTRAIT_ASPECT, PORTRAIT_MIN_PITCH, PORTRAIT_YAW, TOUR_FOV, portraitFitPoints, portraitStop, tourStopFor } from "./framing";
```
→
```ts
import { FRAMING, PORTRAIT_ASPECT, PORTRAIT_MIN_PITCH, PORTRAIT_YAW, TOUR_FOV, portraitFitPoints, portraitStop, tourStopFor } from "./framing";
```

and a new block between the "tour framing" and "portrait tour framing" blocks:

```ts
describe("portrait tour framing", () => {
```
→
```ts
describe("the Web & Apps district continues the tour to the right", () => {
  /** Horizontal unit forward of a camera → target heading and its screen-right (−f.z, f.x). */
  const axes = (cam: readonly number[], target: readonly number[]) => {
    const fx = target[0] - cam[0], fz = target[2] - cam[2];
    const l = Math.hypot(fx, fz);
    return { f: { x: fx / l, z: fz / l }, r: { x: -fz / l, z: fx / l } };
  };

  it("lays the chain along the star framings' screen-right (the engine's CHAIN_DIR, within 3°)", () => {
    let x = 0, z = 0;
    for (const id of STAR_TOUR) {
      const { r } = axes(FRAMING[id].cam, FRAMING[id].target);
      x += r.x;
      z += r.z;
    }
    const off = Math.atan2(CHAIN_DIR.z, CHAIN_DIR.x) - Math.atan2(z, x);
    expect(Math.abs((off * 180) / Math.PI)).toBeLessThan(3);
  });

  it("moves the tour camera right from Ezra Bot to PeduliPasal, never mostly toward the viewer", () => {
    const ids = layout.tourOrder.slice(layout.tourOrder.indexOf("ezra-bot"));
    expect(ids).toEqual(["ezra-bot", WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm", "pedulipasal"]);
    const stop = (id: string) => tourStopFor(layout.islands.find((i) => i.id === id)!);
    for (let i = 0; i + 1 < ids.length; i++) {
      const a = stop(ids[i]), b = stop(ids[i + 1]);
      const { f, r } = axes([a.camera.x, 0, a.camera.z], [a.target.x, 0, a.target.z]);
      const dx = b.camera.x - a.camera.x, dz = b.camera.z - a.camera.z;
      const move = Math.hypot(dx, dz);
      const right = dx * r.x + dz * r.z;
      const toward = -(dx * f.x + dz * f.z);
      expect(right, `${ids[i]} → ${ids[i + 1]}`).toBeGreaterThan(0.5 * move);
      expect(toward, `${ids[i]} → ${ids[i + 1]}`).toBeLessThanOrEqual(0.4 * move);
    }
  });
});

describe("portrait tour framing", () => {
```

(Measured: the four moves go 100 / 100 / 87 / 95 % to the right and 3 / 2 / −50 / 33 % toward the viewer. The engine's 12° `CHAIN_DIR` is 0.09° from the framings' 11.91° average.)

- [ ] **Step 12: Tests for every minecart, and the shot script**

`src/world/scene/crossings/geometry.test.ts`: the `minecartRail` tests only cover the first minecart. Add a block for every minecart right before `describe("bridgeDeck on the stamped world", () => {`:

```ts
describe("bridgeDeck on the stamped world", () => {
```
→
```ts
describe("every minecart in the world", () => {
  const layout = buildLayout(worldProjects);
  const world = buildWorld(layout);
  const byId = (id: string) => layout.islands.find((i) => i.id === id)!;
  const carts = layout.crossings.filter((x) => x.kind === "minecart");

  it("links Petak Umpet → Orbit Store and Ezra Bot → the Web & Apps plaza", () => {
    expect(carts.map((c) => `${c.from}>${c.to}`)).toEqual(["petak-umpet>orbit-store", "ezra-bot>web-plaza"]);
  });

  it("rides 26–34 blocks from Ezra Bot down to the plaza, never steeper than Petak Umpet → Orbit Store", () => {
    const [orbit, web] = carts.map((c) => minecartRail(railEnds(c, byId(c.from), byId(c.to)), world.grid.isSolid));
    const steepest = (rail: typeof web) => {
      let max = 0;
      let prev = railPoint(rail, 0);
      for (let i = 1; i <= 200; i++) {
        const p = railPoint(rail, i / 200);
        max = Math.max(max, Math.abs(Math.atan2(p.y - prev.y, Math.hypot(p.x - prev.x, p.z - prev.z))));
        prev = p;
      }
      return max;
    };
    expect(railLength(web)).toBeGreaterThanOrEqual(26);
    expect(railLength(web)).toBeLessThanOrEqual(34);
    expect(steepest(web)).toBeLessThanOrEqual(steepest(orbit));
  });

  for (const c of carts) {
    const rail = minecartRail(railEnds(c, byId(c.from), byId(c.to)), world.grid.isSolid);
    it(`runs in open air and never steeper than a voxel rail ramp (${c.from} → ${c.to})`, () => {
      let prev = railPoint(rail, 0);
      for (let i = 0; i <= 400; i++) {
        const p = railPoint(rail, i / 400);
        const t = railTangent(rail, i / 400);
        const h = Math.hypot(t.x, t.z) || 1;
        for (const side of [-0.6, 0, 0.6]) {
          const x = Math.floor(p.x - (t.z / h) * side);
          const z = Math.floor(p.z + (t.x / h) * side);
          for (let y = Math.floor(p.y - 0.1); y <= Math.floor(p.y + 0.35 + 1.8); y++) expect(world.grid.isSolid(x, y, z)).toBe(false);
        }
        if (i > 0) expect(Math.abs(Math.atan2(p.y - prev.y, Math.hypot(p.x - prev.x, p.z - prev.z)))).toBeLessThanOrEqual(Math.PI / 4);
        prev = p;
      }
    });
  }
});

describe("bridgeDeck on the stamped world", () => {
```

(All names used are already imported at the top of that file.)

`src/world/scene/crossings/cartFollow.test.ts`: run the cart-in-frame checks for every minecart. Replace the whole `describe("cartTourTable", …)` block (from `describe("cartTourTable", () => {` to the end of the file) with:

```ts
describe("cartTourTable", () => {
  const grid = buildWorld(layout).grid;
  // Petak Umpet → Orbit Store and Ezra Bot → the Web & Apps plaza
  for (const c of layout.crossings.filter((x) => x.kind === "minecart")) {
    const leg = layout.tourOrder.indexOf(c.from);
    const e = railEnds(c, island(c.from), island(c.to));
    const rail = minecartRail(e, grid.isSolid);
    const tag = `${c.from} → ${c.to}`;

    for (const [name, stops] of Object.entries(fixtures)) {
      const path = buildTourPath(stops, tourVia(layout));
      const table = cartTourTable(path, leg, rail);

      it(`parks at the stations and only rolls forward (${tag}, ${name})`, () => {
        expect(sampleTable(table, 0)).toBe(0);
        expect(sampleTable(table, 1)).toBe(1);
        expect(sampleTable(table, -0.5)).toBe(0);
        expect(sampleTable(table, 1.5)).toBe(1);
        for (let i = 1; i < table.length; i++) expect(table[i]).toBeGreaterThanOrEqual(table[i - 1]);
      });

      it(`keeps the cart in the tour camera's frame across the whole leg (${tag}, ${name})`, () => {
        const track = trackFor(path);
        const a = stopProgress(path, leg);
        const b = stopProgress(path, leg + 1);
        const cam = { x: 0, y: 0, z: 0 };
        const look = { x: 0, y: 0, z: 0 };
        for (let k = 0; k <= 100; k++) {
          const f = k / 100;
          sampleTrack(track, a + (b - a) * f, cam, look);
          const n = ndc(cam, look, railPoint(rail, sampleTable(table, f)));
          expect(Math.abs(n.x)).toBeLessThan(0.9);
          expect(Math.abs(n.y)).toBeLessThan(0.9);
        }
      });
    }
  }
});
```

`scripts/shoot-stops.mjs`: shoot all nine stops by default.

```js
// Usage: npm run build && npm run shots -- [stop ...]  → .shots/stop-<N>-desktop.png, .shots/stop-<N>-phone.png
```
→
```js
// Usage: npm run build && npm run shots -- [stop ...]  → .shots/stop-<N>-desktop.png, .shots/stop-<N>-phone.png
// (default: all nine stops: hero 0, gtid 1, petak 2, orbit 3, ezra-bot 4, web-plaza 5, pos-monosuko 6, bee 7, pedulipasal 8)
```

```js
const stops = args.length ? args.map(Number) : [0, 1, 2, 3, 4];
```
→
```js
const stops = args.length ? args.map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
```

- [ ] **Step 13: Run everything**

Run: `npx vitest run src/world/engine/gen/layout.test.ts src/world/scene src/world/state src/world/engine/worldBuild.test.ts`
Expected: `Test Files  38 passed (38)`, `Tests  312 passed (312)`; among them `layout.test.ts` 30, `geometry.test.ts` 33, `cartFollow.test.ts` 8, `tourMotion.test.ts` 19, `tourMath.test.ts` 8, `framing.test.ts` 9, `layouts.test.ts` 6, `modes.test.ts` 22 (unchanged by this task), `playDrop.test.ts` 11 (it drops Ezra onto all nine islands), `tourBuild.test.ts` 6.

Run: `npx vitest run`
Expected: `Test Files  58 passed (58)`, `Tests  472 passed (472)`.

Run: `npx tsc -b` then `npx eslint .`
Expected: no output.

Run: `grep -rn "TOUR_ORDER" src scripts`
Expected: no output.

- [ ] **Step 14: Build**

Run: `npm run build`
Expected: ends with `✓ built in …`, no TypeScript errors.

- [ ] **Step 15: Headless shots of stops 3–8, desktop and phone**

Run: `npm run shots -- 3 4 5 6 7 8`
Expected: twelve lines `shot …\.shots\stop-<N>-desktop.png` and `shot …\.shots\stop-<N>-phone.png` for N = 3…8, and no `MISSING` line (`.shots/` is gitignored). Open them:
- `stop-3-*`: Orbit Store exactly as in Phase 1.
- `stop-4-desktop.png`: Ezra Bot as in Phase 1, with the "Discord / 1,000+ members" board at the front left, the bounce pad, the robot, the chat bubbles, the "Ezra Bot online" screen and the "Add to Discord" sign. New: the minecart station on the east rim. Its parked cart shows above the screen's right end; its sign "Minecart → Web & Apps" stands edge-on under the lowest bubble; the rail leaves to the right behind the "Add to Discord" sign.
- `stop-4-phone.png`: the whole island, with the rail running off to the right.
- `stop-5-desktop.png`: the bare plaza (grass, no props) right of centre. The rail arrives from the left onto the station on its west rim, with the cart parked and the sign "Minecart → Ezra Bot" edge-on in front of it. The rope bridge to POS Monosuko leaves to the right with stepping stones beside it.
- `stop-5-phone.png`: the plaza centred, the rail entering from the left, the bridge leaving to the right.
- `stop-6-*`: bare POS Monosuko, the bridge from the plaza arriving from the left, the bridge to Bee leaving to the upper right (Bee is further from the camera).
- `stop-7-*`: bare Bee Furniture CRM, the bridge from POS arriving from the lower left, the bridge to PeduliPasal leaving to the lower right.
- `stop-8-*`: bare PeduliPasal, the bridge from Bee arriving from the upper left only.

The minis sit closer and lower in frame than the stars: these are the starting framings; Part C retunes them around the screens.

- [ ] **Step 16: Manual check in the dev build (Play)**

Run `npm run dev` and open the printed URL. Then:
1. Scroll to Ezra Bot, press Play, walk round the screen board to the station on the east rim and press E. The cart rides down to the plaza (≈ 6 s) and Ezra gets out at the plaza's stand-off point.
2. Walk across the three bridges to PeduliPasal and back, then ride the cart back up.
3. Press Esc/Tour on each island: the tour resumes on that island's chapter.

Stop the dev server with Ctrl+C in its terminal.

- [ ] **Step 17: Commit**

```bash
git add src/world/engine/gen/layout.ts src/world/engine/gen/layout.test.ts src/world/scene/tour/tourMath.ts src/world/scene/tour/tourMath.test.ts src/world/scene/tour/tourMotion.test.ts src/world/scene/islands/framing.ts src/world/scene/islands/framing.test.ts src/world/scene/islands/layouts.test.ts src/world/scene/crossings/geometry.test.ts src/world/scene/crossings/cartFollow.test.ts scripts/shoot-stops.mjs
git commit -q -F - <<'EOF'
feat(world): Web & Apps plaza and mini-island chain continue the tour to the right, minecart from Ezra Bot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task A5: SEO mirror: the minis, "Try" links and an Education section

**Files:**
- Create: `src/world/ui/seoLinks.ts`
- Replace: `src/world/ui/SeoMirror.tsx`
- Test (create): `src/world/ui/seoLinks.test.ts`, `src/world/ui/SeoMirror.test.ts`

**Interfaces:**
- Consumes: `isSiteLink`, `ProjectLinks` (A1); `milestones`, `worldProjects` (A2).
- Produces: `SeoLink`, `seoLink(key, url, title)`; `SeoMirror` with every project (stars and minis), site-path links labelled "Try <title>" in the same tab, https links with their label in a new tab, and an Education list.

The label helper lives in its own `.ts` file: exporting a function next to the component would trip `react-refresh/only-export-components`.

- [ ] **Step 1: Write the failing tests**

Create `src/world/ui/seoLinks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seoLink } from "./seoLinks";

describe("seoLink", () => {
  it("keeps the label of an https link and opens it in a new tab", () => {
    expect(seoLink("demo", "https://gtid.pro", "GTID")).toEqual({ href: "https://gtid.pro", label: "Visit GTID", external: true });
    expect(seoLink("roblox", "https://www.roblox.com/games/1/x", "Petak Umpet")?.label).toBe("Play on Roblox Petak Umpet");
    expect(seoLink("discord", "https://discord.com/x", "Ezra Bot")?.label).toBe("Discord Ezra Bot");
    expect(seoLink("github", "https://github.com/x/y", "Sample")?.label).toBe("Source code Sample");
  });
  it("labels a site path 'Try' and keeps it in the same tab", () => {
    expect(seoLink("demo", "/demo/monosuko/", "POS Monosuko")).toEqual({ href: "/demo/monosuko/", label: "Try POS Monosuko", external: false });
  });
  it("drops empty links (inactive signs) and anything that is not a site link", () => {
    expect(seoLink("demo", "", "Bee Furniture CRM")).toBeNull();
    expect(seoLink("demo", undefined, "Bee Furniture CRM")).toBeNull();
    expect(seoLink("demo", "//evil.dev", "X")).toBeNull();
    expect(seoLink("demo", "http://x.dev", "X")).toBeNull();
  });
});
```

Create `src/world/ui/SeoMirror.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { SeoMirror } from "./SeoMirror";

/** How renderToStaticMarkup escapes text. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("SeoMirror (the text version of the world)", () => {
  const html = renderToStaticMarkup(createElement(SeoMirror, { visible: true }));

  it("lists every world project, stars and Web & Apps minis, with its line", () => {
    for (const p of worldProjects) {
      expect(html).toContain(`<h2 id="seo-${p.id}">${esc(p.title)}</h2>`);
      expect(html).toContain(esc(p.line));
    }
  });

  it("links the live projects in a new tab and leaves out inactive demo signs", () => {
    expect(html).toContain('<a href="https://gtid.pro" target="_blank" rel="noopener noreferrer">Visit GTID</a>');
    expect(html).toContain(
      '<a href="https://github.com/aliefauzan/Bangkit-Project-PeduliPasal/releases/tag/1.5.3" target="_blank" rel="noopener noreferrer">Visit PeduliPasal</a>',
    );
    expect(html).not.toContain("Try POS Monosuko");
    expect(html).not.toContain("Try Bee Furniture CRM");
    expect(html).not.toContain('href=""');
  });

  it("has an Education section with the three milestones, in order", () => {
    expect(html).toContain('<h2 id="seo-education">Education</h2>');
    const years = [
      "<time>2022</time> Started Business Information Systems · Petra Christian University",
      "<time>2024</time> Bangkit Academy · Mobile Development, graduated with Distinction",
      "<time>2026</time> Graduated · Business Information Systems, Petra Christian University",
    ];
    for (const y of years) expect(html).toContain(y);
    expect(html.indexOf(years[0])).toBeLessThan(html.indexOf(years[1]));
    expect(html.indexOf(years[1])).toBeLessThan(html.indexOf(years[2]));
    expect(html).not.toMatch(/top (graduate|student)/i);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/world/ui`
Expected: FAIL: `src/world/ui/seoLinks.test.ts` with `Error: Cannot find module './seoLinks' imported from …`, and in `SeoMirror.test.ts` "has an Education section with the three milestones, in order" with `AssertionError: expected '<main class="seo-mirror seo-mirror--v…' to contain '<h2 id="seo-education">Education</h2>'` (`Tests  1 failed | 7 passed (8)`; the minis are already listed because the mirror maps `worldProjects`).

- [ ] **Step 3: The link helper**

Create `src/world/ui/seoLinks.ts`:

```ts
import { isSiteLink, type ProjectLinks } from "@/config/schema";

const LINK_LABELS: Record<keyof ProjectLinks, string> = {
  demo: "Visit",
  github: "Source code",
  discord: "Discord",
  roblox: "Play on Roblox",
};

export interface SeoLink { href: string; label: string; external: boolean }

/**
 * A project link as the text mirror shows it: an https link keeps its kind's label and opens in a new tab; a path on
 * this site (a demo build such as /demo/monosuko/) reads "Try <title>" and opens in the same tab. Null for an empty
 * link (an inactive sign) or anything that is not a site link.
 */
export function seoLink(key: keyof ProjectLinks, url: string | undefined, title: string): SeoLink | null {
  if (!url || !isSiteLink(url)) return null;
  const external = url.startsWith("https://");
  return { href: url, label: `${external ? LINK_LABELS[key] : "Try"} ${title}`, external };
}
```

- [ ] **Step 4: The mirror**

Replace `src/world/ui/SeoMirror.tsx` with:

```tsx
import type { JSX } from "react";
import { milestones, worldCopy, worldProjects } from "@/config/portfolio";
import type { ProjectLinks } from "@/config/schema";
import { seoLink, type SeoLink } from "./seoLinks";

export function SeoMirror({ visible = false }: { visible?: boolean }): JSX.Element {
  return (
    <main className={visible ? "seo-mirror seo-mirror--visible" : "seo-mirror sr-only"}>
      <header>
        <h1>{worldCopy.heroName}</h1>
        <p>{worldCopy.heroLine}</p>
        <p>{worldCopy.location}</p>
      </header>
      {worldProjects.map((p) => {
        const links = (Object.keys(p.links) as Array<keyof ProjectLinks>)
          .map((k) => [k, seoLink(k, p.links[k], p.title)] as const)
          .filter((e): e is readonly [keyof ProjectLinks, SeoLink] => e[1] !== null);
        return (
          <section key={p.id} aria-labelledby={`seo-${p.id}`}>
            <h2 id={`seo-${p.id}`}>{p.title}</h2>
            <p>{p.line}</p>
            {p.stats && p.stats.length > 0 && (
              <ul>
                {p.stats.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            {links.length > 0 && (
              <p>
                {links.map(([k, l]) =>
                  l.external ? (
                    <a key={k} href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  ) : (
                    <a key={k} href={l.href}>
                      {l.label}
                    </a>
                  ),
                )}
              </p>
            )}
          </section>
        );
      })}
      <section aria-labelledby="seo-education">
        <h2 id="seo-education">Education</h2>
        <ul>
          {milestones.map((m) => (
            <li key={m.year}>
              <time>{m.year}</time>
              {` ${m.title} · ${m.line}`}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run everything and build**

Run: `npx vitest run src/world/ui`
Expected: PASS, `Test Files  3 passed (3)`, `Tests  11 passed (11)` (with `WorldBoundary.test.ts`, whose fallback page renders this mirror).

Run: `npx vitest run`
Expected: `Test Files  60 passed (60)`, `Tests  478 passed (478)`.

Run: `npx tsc -b`, `npx eslint .`, then `npm run build`
Expected: no output from the first two; the build ends with `✓ built in …`.

- [ ] **Step 6: Commit**

```bash
git add src/world/ui/seoLinks.ts src/world/ui/seoLinks.test.ts src/world/ui/SeoMirror.tsx src/world/ui/SeoMirror.test.ts
git commit -q -F - <<'EOF'
feat(world): SEO mirror lists the Web & Apps minis and an Education section

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

## Self-review

**Spec coverage (Part A):**
- §3.1: the `web-plaza` hub, with the plaza moved off the Phase 1 slot by the coordinator's decision (see "Contract deviations"). It now sits on the tour's right after Ezra Bot at (120, 8, −6). Ezra Bot → plaza picks a minecart by the existing district rule: same rail, cart, station and speed profile as Petak Umpet → Orbit, 31.5 blocks long and gentler than Petak → Orbit. `geometry.test.ts` and `cartFollow.test.ts` test it. The chain plaza → POS → Bee → PeduliPasal uses plank bridges.
- §3.2: `IslandKind` gets `"hub"`; the hub is emitted whenever a web project exists, and the web minis are chained in config order. `layout.test.ts` unit-tests every rule for the shipped chain and a six-island one:
  - bridges 6–9 blocks between edge anchors;
  - height steps ≤ 2, so every link is a bridge;
  - no overlap (the layout's margin);
  - advance along `CHAIN_DIR` with alternating ±3 depth offsets;
  - both bridge ends on grass;
  - determinism;
  - no crossing over a third island.

  `CHAIN_DIR` is now the framings' screen-right; `framing.test.ts` asserts it against the framings and asserts that the web legs move the tour camera mostly to the right. Other districts keep satellites. The tour order is derived.
- §3.3: the tour runs Hero → … → Ezra Bot → minecart → Plaza → POS Monosuko → Bee Furniture CRM → PeduliPasal. The mini framings in `framing.ts` are closer (starting values; centring on each screen comes with Part C's props).
- §4: the registry holds both tiers (`ISLANDS`, A3), and the board copy (title, line, year, tags, no stats) is in the config (A2). The island modules themselves are Part C.
- §9: the `worldProjects` entries, the schema changes, `Milestone` + `validateMilestones`, and `milestones` next to `worldProjects` (A1, A2).
- §10: the SEO mirror lists stars and minis with their links, "Try" for site paths, and an Education section (A5).
- §12 (Part A's share): unit tests for the placement rules, the derived tour order, the crossing kinds and milestone and link validation; headless shots of stops 3–8, desktop and phone (A4 Step 15).

**Left to Part B:** §5 (LiveScreen and the three apps), §6 (closeup camera).
**Left to Part C:**
- the plaza and mini island modules, with props facing `VIEW_F`;
- `FOOTPRINTS` for the four islands, plus the two test updates listed in "Notes Parts B and C rely on";
- the link signs, inactive while `links.demo` is empty;
- retuned framings;
- §7 milestones and the graduation moment;
- §8 map boards (`islandTitle` gives their labels);
- §11 performance measurement.

**For the coordinator:** spec §3.1 (plaza slot) and §3.2 (`VIEW_R`) and the master's `CHAIN_DIR` comment still describe the first draft; this plan follows the decision.

**Placeholder scan:** every step has its complete code or exact old → new text, and every run has its expected output.

**Type consistency:** these match the master's Part A contract:
- `webChain(hub: IslandPlacement, radii: readonly number[], taken: readonly IslandPlacement[], seeds?: readonly number[]): Vec3i[]` (the 4th parameter is additive);
- `CHAIN_DIR: { x: number; z: number }`, `CHAIN_HEIGHTS: readonly number[]`, `STAR_TOUR: readonly string[]`;
- `HUB_RADIUS = 5`, `HUB_DEPTH = 5`, `WEB_PLAZA_ID = "web-plaza"`;
- `IslandModule` / `StarIslandModule`, `ISLANDS: Record<string, IslandModule>`;
- `isSiteLink(url: string): boolean`, `validateMilestones(list: readonly Milestone[]): ValidationIssue[]` and `milestones`.

`CHAIN_DIR`'s value and the hub's origin follow the coordinator's decision.

## Integration fixes (dry run 2026-10-14)

Parts A → B → C were replayed in order on a fresh sandbox copy, first at `bcd1ffb`, then at the final base `540ef7b` (the Phase 1 input fixes `1e703b4`…`540ef7b`: followCam, keyboard, touch, MobileControls, Hud, PlayCamera, modes; 407 tests). Every Part A edit applied unchanged on both bases; tsc, eslint, Vitest and the build stayed clean after every task. Changes to this plan:

- **A5 Step 5:** the whole-suite count repeated A4's (461) although A5 adds 6 tests (`seoLinks` 3, `SeoMirror` 3).
- **Counts on the new base** (the Phase 1 fixes add 11 tests, 3 of them in `modes.test.ts`): the Global Constraints line and every whole-suite "Expected" now give the counts measured on `540ef7b`: A1 Step 5 `414`, A2 Step 6 `421`, A3 Step 11 `427`, A4 Step 13 `312` for the targeted run (`modes.test.ts` 22) and `472` for the suite, A5 Step 5 `478`. The two red runs, A2 Step 4 (`2 failed | 419 passed (421)`) and A4 Step 5 (`14 failed | 448 passed (462)`), are shifted by the same 11 passing tests rather than re-measured. The per-file counts are unchanged.
