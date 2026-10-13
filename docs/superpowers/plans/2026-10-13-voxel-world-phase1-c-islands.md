# Voxel World — Phase 1 Part C: Islands and live data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Part B's placeholder islands with the real hero, GTID, Petak Umpet, Orbit Store and Ezra Bot islands, each showing its program working, and feed the GTID board with live gtid.pro data through a cached server proxy.

**Architecture:** Each island is a `StarIslandModule` (master contract) in `src/world/scene/islands/`. Prop positions live in one pure module (`layouts.ts`) that both the React components and the collision footprints read, so visuals and collision can't drift apart. Canvas-drawn screens (GTID board, Orbit receipt, Ezra Bot chat) are split into pure, unit-tested model functions plus a draw function. The server proxy is a framework-free ES module with injectable `fetch` and clock.

**Tech Stack:** React 19 + @react-three/fiber 9 + three, zustand store and runtime from Part B, engine modules from Part A, Express 5 (existing `server.js`), Vitest.

**Read first:** master plan `docs/superpowers/plans/2026-10-13-voxel-world-phase1.md` (contracts, coordinate conventions, Global Constraints) and spec `docs/superpowers/specs/2026-10-13-voxel-world-design.md` §8, §10, §11, §18.

## Contract additions (Part C only; no master signature changes)

| Module | Exports |
|---|---|
| `src/world/scene/islands/placeholders.ts` | `PLACEHOLDER_ISLANDS` — Part B's placeholder modules, renamed in C1, deleted in C10 |
| `islands/shared/local.ts` | `Cell`, `Tuple3`, `islandFrame(p)`, `worldOf(p, lx, ly, lz)`, `worldTuple(p, lx, ly, lz)`, `boxCells(...)`, `postCells(x, z, height?)`, `stampCells(grid, p, cells, block?)` |
| `islands/shared/time.ts` | `todayAt(d: Date): string` → `"Today at HH:MM"` |
| `islands/shared/text.ts` | `wrapWords(text, maxChars): string[]` |
| `islands/shared/props.ts` | `PropBlock`, `PALETTE`, `pickColor`, `treeBlocks(x, z, h, seed)` |
| `islands/shared/project.ts` | `projectById(id): WorldProject` |
| `islands/shared/canvasFonts.ts` | `CANVAS_FONTS`, `loadCanvasFonts()` |
| `islands/shared/useCanvasTexture.ts` | `useCanvasTexture(w, h, draw, deps): THREE.CanvasTexture` |
| `islands/shared/useHoverLift.ts` | `useHoverLift(id): RefObject<THREE.Group>` |
| `islands/shared/dispose.ts` | `disposeObject(root)` |
| `islands/shared/PropBlocks.tsx`, `InfoBoard.tsx`, `Signpost.tsx` | `PropBlocks`, `InfoBoard`, `Signpost` components |
| `islands/voxelFont.ts` | `GLYPHS`, `GLYPH_HEIGHT`, `layoutText(text)`, `layoutLines(lines, lineGap?)` |
| `islands/VoxelTitle.tsx` | `VoxelTitle` (punchable voxel letters) |
| `islands/layouts.ts` | `HERO`, `GTID`, `PETAK`, `ORBIT`, `EZRA`, `INFO_HALF_SPAN`, `FOOTPRINTS` |
| `islands/framing.ts` | `FRAMING`, `tourStopFor(p): TourStop` |
| `islands/gtid/*` | `types.ts` (`GtidPrice`, `GtidHistory`, `GtidMods`, `GtidSnapshot`, `GtidData`), `snapshot.ts` (`GTID_SNAPSHOT`), `useGtidData()`, `board.ts` (`formatRp`, `normalizeSeries`, `buildBoardModel`, `drawBoard`, `BoardView`, `BoardModel`) |
| `islands/orbit/*` | `logoMath.ts` (`ORBIT_LOGO`, `toTile`, `ringPoint`, `pointInPolygon`), `logo.ts` (`createOrbitLogoTile()`), `receipt.ts` (`RECEIPT_ITEMS`, `FIRST_ORDER_NO`, `nextOrder`, `receiptLines`, `drawReceipt`) |
| `islands/ezrabot/chat.ts` | `ChatMessage`, `CHAT_SCRIPT`, `visibleWindow`, `messageTime`, `drawBubble`, `drawBotScreen` |
| `server/gtidProxy.js` | `createGtidProxy({ fetchImpl?, now?, base?, timeoutMs? })` → `{ get(key) }`; `registerGtidRoutes(app, proxy?)` |
| HTTP | `GET /api/gtid/price|history|mods` → `{ data, stale: boolean, fetchedAt: number }`; `503 { error }` when nothing cached and upstream fails |
| `src/world/scene/TourCamera.tsx` | honours `?stop=N` (scrolls to `stopProgress(path, N)` once) — added in C2 only if Part B did not |

## Upstream payloads (pinned from gtid-web source, read-only)

- `GET https://gtid.pro/api/dl-price?endpoint=price` → `{ buy, sell, buyBgl, sellBgl, bgl: {buy, sell}, spread: {dl, bgl}, posts24h, sources, updatedAt: ISO|null, stale?: true }`. Prices are numbers in rupiah per DL / per BGL, or `null`.
- `GET https://gtid.pro/api/dl-price?endpoint=history&period=1d&field=buy` → `{ period, field, from, to, bucket, count, data: [{ t: ISO, v, o, h, l, c }] }`, or `{ error: "Not enough data" }` with HTTP 200.
- `GET https://gtid.pro/api/game-status` → `{ mods: { online: [{ name, status: "Online"|"Idle"|"Undercover", lastSeen }], offline: [], updatedAt: ms, source } | null, playerCount, logs, sb, updatedAt, stale }`.

The proxy keeps only: price `{ buy, sell, buyBgl, sellBgl, updatedAt }`, history `{ points: [{ t, v }] }`, mods `{ online: [{ name, status }], updatedAt }`.

## Global Constraints

All of the master plan's Global Constraints apply. Part C adds:

- Island props render inside a group positioned at `islandFrame(placement)` = `[origin.x + 0.5, origin.y + 1, origin.z + 0.5]`; inside it, local `(0, 0, 0)` is the walkable surface at the centre column, and local integer `(lx, lz)` is the centre of world block column `(origin.x + lx, origin.z + lz)`. A block-sized prop in local row `ly` has its centre at `y = ly + 0.5`.
- Island fronts face **+z** (the tour cameras sit on the +z side). Keep props inside their `layouts.ts` positions; `FOOTPRINTS` must stay ≥ 2 blocks from every crossing anchor and inside 78% of the island radius (tested in C2).
- `<Interactable>` is always rendered **outside** the translated island group, with world-space `position` (use `worldTuple`). Its children are not used; hover lift is done with `useHoverLift(id)` on our own groups.
- In-world text (WorldText, canvas) uses Latin-1 plus the general-punctuation range only (self-hosted subsets). No `↗` / `✓` glyphs: signposts carry a physical wooden arrow instead, and labels read "Visit gtid.pro", "Play on Roblox", "Join on Discord", "Add to Discord".
- Canvas text uses `CANVAS_FONTS` (self-hosted under `public/fonts/canvas/`), drawn only after `loadCanvasFonts()` resolves (`useCanvasTexture` does this).
- Never invent GTID prices: the bundled snapshot is captured from gtid.pro by a script (C3). If capture fails, stop and report.
- Orbit receipt: fictional items, no money anywhere (no `Rp`, `IDR`, amounts). Orbit mark and ring `#FFFFFF`; blue only on the tile gradient, awning and printer stripe.
- Ezra Bot: other users' messages are grey skeleton bars; only bot messages readable; times read `Today at HH:MM`.
- Petak Umpet stays calm: slow ambient motion, no particles bursts, no shake.

---

### Task 1: Island toolkit and placeholder split

**Files:**
- Rename: `src/world/scene/islands/index.ts` → `src/world/scene/islands/placeholders.ts` (export renamed to `PLACEHOLDER_ISLANDS`)
- Create: `src/world/scene/islands/index.ts`
- Create: `public/fonts/canvas/schibsted-grotesk-500.woff`, `schibsted-grotesk-700.woff`, `ibm-plex-mono-500.woff`
- Create: `src/world/scene/islands/shared/{local.ts,time.ts,text.ts,props.ts,project.ts,canvasFonts.ts,useCanvasTexture.ts,useHoverLift.ts,dispose.ts,PropBlocks.tsx,InfoBoard.tsx,Signpost.tsx}`
- Test: `src/world/scene/islands/shared/{local,time,text,props}.test.ts`, `src/config/worldProjects.test.ts`
- Modify (only if its test fails): `src/config/portfolio.ts` (`worldProjects`)

**Interfaces:**
- Consumes: `IslandPlacement`, `WorldProject`, `VoxelGrid`, `blockId`, `BlockName`, `mulberry32`, `Vec3` (Part A); `useWorld`, `WorldText`, `Interactable`, `StarIslandModule` (Part B); `worldProjects` (Part A content).
- Produces: every `islands/shared/*` export listed in Contract additions; `PLACEHOLDER_ISLANDS`; an `index.ts` whose `STAR_ISLANDS` merges placeholders with a growing `REAL_ISLANDS` map.

- [ ] **Step 1: Split Part B's placeholders out of `index.ts`**

```bash
cd portfolio
git mv src/world/scene/islands/index.ts src/world/scene/islands/placeholders.ts
sed -i 's/export const STAR_ISLANDS/export const PLACEHOLDER_ISLANDS/' src/world/scene/islands/placeholders.ts
grep -n "PLACEHOLDER_ISLANDS" src/world/scene/islands/placeholders.ts
```
Expected: one line `export const PLACEHOLDER_ISLANDS ...`. If grep prints nothing, open the file and rename the exported `Record<string, StarIslandModule>` to `PLACEHOLDER_ISLANDS` by hand.

Create `src/world/scene/islands/index.ts`:

```ts
import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
```

- [ ] **Step 2: Self-host the canvas fonts**

```bash
mkdir -p public/fonts/canvas
curl -fL -o public/fonts/canvas/schibsted-grotesk-500.woff https://cdn.jsdelivr.net/npm/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff
curl -fL -o public/fonts/canvas/schibsted-grotesk-700.woff https://cdn.jsdelivr.net/npm/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff
curl -fL -o public/fonts/canvas/ibm-plex-mono-500.woff https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff
ls -l public/fonts/canvas
```
Expected: three files, each larger than 10 KB. Both families are SIL OFL.

- [ ] **Step 3: Write the failing tests for the pure helpers**

`src/world/scene/islands/shared/local.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId } from "@/world/engine/voxel/blocks";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { boxCells, islandFrame, postCells, stampCells, worldOf, worldTuple } from "./local";

const P: IslandPlacement = { id: "t", kind: "star", district: "game", origin: { x: 10, y: 2, z: -4 }, radius: 8, depth: 6, seed: 1 };

describe("island local frame", () => {
  it("puts local (0,0,0) on the surface of the centre column", () => {
    expect(islandFrame(P)).toEqual([10.5, 3, -3.5]);
    expect(worldOf(P, 1, 2, -1)).toEqual({ x: 11.5, y: 5, z: -4.5 });
    expect(worldTuple(P, 0, 0, 0)).toEqual([10.5, 3, -3.5]);
  });

  it("builds inclusive boxes and 2-high posts at the nearest column", () => {
    expect(boxCells(0, 1, 0, 0, 0, 2)).toHaveLength(6);
    expect(postCells(2.4, -0.6)).toEqual([[2, 0, -1], [2, 1, -1]]);
    expect(postCells(0, 0, 3)).toHaveLength(3);
  });

  it("stamps cells one row above the grass top", () => {
    const g = new VoxelGrid();
    stampCells(g, P, [[1, 0, -1]]);
    expect(g.get(11, 3, -5)).toBe(blockId("barrier"));
    stampCells(g, P, [[0, 1, 0]], "plank");
    expect(g.get(10, 4, -4)).toBe(blockId("plank"));
  });
});
```

`src/world/scene/islands/shared/time.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { todayAt } from "./time";

describe("todayAt", () => {
  it("formats a Discord-style time with two-digit hours and minutes", () => {
    expect(todayAt(new Date(2026, 9, 13, 9, 5))).toBe("Today at 09:05");
    expect(todayAt(new Date(2026, 9, 13, 19, 42))).toBe("Today at 19:42");
  });
});
```

`src/world/scene/islands/shared/text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { wrapWords } from "./text";

describe("wrapWords", () => {
  it("wraps on word boundaries without exceeding the limit", () => {
    expect(wrapWords("I build bots, games and web tools that people use every day.", 21)).toEqual([
      "I build bots, games",
      "and web tools that",
      "people use every day.",
    ]);
  });
  it("keeps a single long word on its own line and ignores extra spaces", () => {
    expect(wrapWords("  gtid.pro   tracker ", 4)).toEqual(["gtid.pro", "tracker"]);
  });
});
```

`src/world/scene/islands/shared/props.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PALETTE, treeBlocks } from "./props";

describe("treeBlocks", () => {
  it("is deterministic for a seed", () => {
    expect(treeBlocks(2, -1, 3, 5)).toEqual(treeBlocks(2, -1, 3, 5));
  });
  it("has an h-block trunk on the ground and all leaves above it", () => {
    const blocks = treeBlocks(0, 0, 3, 9);
    const trunk = blocks.filter((b) => b.c === PALETTE.wood);
    expect(trunk.map((b) => b.y)).toEqual([0.5, 1.5, 2.5]);
    for (const leaf of blocks.filter((b) => b.c !== PALETTE.wood)) expect(leaf.y).toBeGreaterThan(3);
  });
});
```

`src/config/worldProjects.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "./portfolio";

const byId = Object.fromEntries(worldProjects.map((p) => [p.id, p]));

describe("worldProjects content for the star islands", () => {
  it("has exactly the four star islands", () => {
    expect(worldProjects.map((p) => p.id).sort()).toEqual(["ezra-bot", "gtid", "orbit-store", "petak-umpet"]);
  });
  it("carries the real numbers", () => {
    expect(byId.gtid.stats).toEqual(["2,600 visitors / day", "16,000+ items"]);
    expect(byId["petak-umpet"].stats).toEqual(["3.1M+ visits", "2.6K peak players"]);
    expect(byId["orbit-store"].stats).toEqual(["2,200+ orders", "890+ buyers"]);
    expect(byId["ezra-bot"].stats).toEqual(["1,000+ members"]);
  });
  it("has the signpost links (Orbit's Discord link is filled in by Ezra later)", () => {
    expect(byId.gtid.links.demo).toBe("https://gtid.pro");
    expect(byId["petak-umpet"].links.roblox).toBe("https://www.roblox.com/games/91179701802837/Petak-Umpet");
    expect(Object.prototype.hasOwnProperty.call(byId["orbit-store"].links, "discord")).toBe(true);
    expect(byId["ezra-bot"].links.discord).toBe("https://discord.com/oauth2/authorize?client_id=1127105994766426122");
  });
});
```

- [ ] **Step 4: Run the tests to verify the helper tests fail**

Run: `npx vitest run src/world/scene/islands/shared src/config/worldProjects.test.ts`
Expected: the four `shared/*` suites FAIL with "Failed to resolve import ./local" (etc.). `worldProjects.test.ts` may already PASS (Part A content); if it FAILS, replace the `worldProjects` array in `src/config/portfolio.ts` with exactly:

```ts
export const worldProjects: WorldProject[] = [
  {
    id: "gtid", title: "GTID", year: 2026,
    line: "Live DL & BGL prices for Growtopia Indonesia, price alerts, and which mods are online right now.",
    stats: ["2,600 visitors / day", "16,000+ items"], tags: ["Next.js", "MongoDB", "Discord API"],
    district: "game", tier: "star", links: { demo: "https://gtid.pro" },
  },
  {
    id: "petak-umpet", title: "Petak Umpet", year: 2026,
    line: "Traditional Indonesian hide-and-seek as a Roblox multiplayer game, set in a village.",
    stats: ["3.1M+ visits", "2.6K peak players"], tags: ["Roblox Studio", "Luau"],
    district: "game", tier: "star", links: { roblox: "https://www.roblox.com/games/91179701802837/Petak-Umpet" },
  },
  {
    id: "orbit-store", title: "Orbit Store", year: 2025,
    line: "A Discord store that takes QRIS payments and delivers every order automatically.",
    stats: ["2,200+ orders", "890+ buyers"], tags: ["Discord.js", "Midtrans", "QRIS"],
    district: "discord", tier: "star", links: { discord: "" },
  },
  {
    id: "ezra-bot", title: "Ezra Bot", year: 2026,
    line: "An AI bot that answers from its own community's knowledge.",
    stats: ["1,000+ members"], tags: ["Discord.js", "Gemini", "GPT-4o"],
    district: "discord", tier: "star", links: { discord: "https://discord.com/oauth2/authorize?client_id=1127105994766426122" },
  },
];
```
(keep the existing `import type { WorldProject } from "./schema";` at the top of the file; add it if missing).

- [ ] **Step 5: Implement the pure helpers**

`src/world/scene/islands/shared/local.ts`:

```ts
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId, type BlockName } from "@/world/engine/voxel/blocks";

/** Island-local cell: x/z in blocks from the centre column, y = row above the grass top (0 = first row). */
export type Cell = readonly [number, number, number];
export type Tuple3 = [number, number, number];

/** World position of local (0,0,0): centre of the island's centre column, on the walkable surface. */
export function islandFrame(p: IslandPlacement): Tuple3 {
  return [p.origin.x + 0.5, p.origin.y + 1, p.origin.z + 0.5];
}

export function worldOf(p: IslandPlacement, lx: number, ly: number, lz: number): Vec3 {
  const [fx, fy, fz] = islandFrame(p);
  return { x: fx + lx, y: fy + ly, z: fz + lz };
}

export function worldTuple(p: IslandPlacement, lx: number, ly: number, lz: number): Tuple3 {
  const v = worldOf(p, lx, ly, lz);
  return [v.x, v.y, v.z];
}

/** Inclusive integer box of cells. */
export function boxCells(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Cell[] {
  const out: Cell[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) out.push([x, y, z]);
  return out;
}

/** A thin post at a fractional position occupies the nearest column, `height` rows tall. */
export function postCells(x: number, z: number, height = 2): Cell[] {
  const cx = Math.round(x);
  const cz = Math.round(z);
  return boxCells(cx, cx, 0, height - 1, cz, cz);
}

/** Writes solid cells into the world grid (default: invisible "barrier"). */
export function stampCells(grid: VoxelGrid, p: IslandPlacement, cells: readonly Cell[], block: BlockName = "barrier"): void {
  const id = blockId(block);
  for (const [lx, ly, lz] of cells) grid.set(p.origin.x + lx, p.origin.y + 1 + ly, p.origin.z + lz, id);
}
```

`src/world/scene/islands/shared/time.ts`:

```ts
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Discord-style timestamp used on chats and receipts: "Today at HH:MM" (24 h, local clock). */
export function todayAt(d: Date): string {
  return `Today at ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
```

`src/world/scene/islands/shared/text.ts`:

```ts
/** Greedy word wrap; a word longer than maxChars sits alone on its line. */
export function wrapWords(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!current) current = word;
    else if (current.length + 1 + word.length <= maxChars) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
```

`src/world/scene/islands/shared/props.ts`:

```ts
import { mulberry32 } from "@/world/engine/gen/rng";

/** A decorative block in island-local coordinates (x/z = column centre, y = block centre). */
export interface PropBlock {
  x: number; y: number; z: number; c: string;
  sx?: number; sy?: number; sz?: number; rx?: number; ry?: number; rz?: number;
}

export const PALETTE = {
  wood: "#6b4f37",
  woodDark: "#5a4130",
  plank: ["#b98f62", "#ad8458"],
  roof: ["#b5674b", "#a85d43", "#bb6f52"],
  leaf: ["#6e8e57", "#7a9862", "#66854f", "#82a068"],
  crate: ["#a87f55", "#9c744c", "#b08659"],
  stone: ["#b5afa5", "#a9a399", "#bfb9af"],
  chart: ["#c4beb3", "#b8b2a7"],
  glass: "#c9d4d2",
  orange: "#FA5D19",
  blue: "#3D62F8",
  white: "#f4f3ef",
} as const;

export function pickColor(list: string | readonly string[], r: () => number): string {
  return typeof list === "string" ? list : list[Math.floor(r() * list.length)];
}

/** Blocky tree: h-block trunk, a 3x3x2 crown with random corners, one block on top. */
export function treeBlocks(x: number, z: number, h: number, seed: number): PropBlock[] {
  const r = mulberry32(seed);
  const out: PropBlock[] = [];
  for (let y = 0; y < h; y++) out.push({ x, y: y + 0.5, z, c: PALETTE.wood, sx: 0.7, sz: 0.7 });
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = 0; dy <= 1; dy++) {
        const corner = Math.abs(dx) + Math.abs(dz) === 2;
        if (corner && dy === 1 && r() < 0.65) continue;
        if (corner && dy === 0 && r() < 0.25) continue;
        out.push({ x: x + dx, y: h + dy + 0.5, z: z + dz, c: pickColor(PALETTE.leaf, r) });
      }
    }
  }
  out.push({ x, y: h + 2.5, z, c: pickColor(PALETTE.leaf, r) });
  return out;
}
```

`src/world/scene/islands/shared/project.ts`:

```ts
import { worldProjects } from "@/config/portfolio";
import type { WorldProject } from "@/config/schema";

export function projectById(id: string): WorldProject {
  const p = worldProjects.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown world project: ${id}`);
  return p;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/islands/shared src/config/worldProjects.test.ts`
Expected: PASS (5 files).

- [ ] **Step 7: Implement the rendering helpers**

`src/world/scene/islands/shared/canvasFonts.ts`:

```ts
/** Font stacks for canvas-drawn screens (GTID board, receipts, chat). Files are self-hosted under /fonts/canvas. */
export const CANVAS_FONTS = {
  ui: '"World Canvas UI", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"World Canvas Mono", ui-monospace, "SFMono-Regular", Consolas, monospace',
} as const;

let ready: Promise<void> | null = null;

export function loadCanvasFonts(): Promise<void> {
  if (ready) return ready;
  const faces = [
    new FontFace("World Canvas UI", "url(/fonts/canvas/schibsted-grotesk-500.woff)", { weight: "500" }),
    new FontFace("World Canvas UI", "url(/fonts/canvas/schibsted-grotesk-700.woff)", { weight: "700" }),
    new FontFace("World Canvas Mono", "url(/fonts/canvas/ibm-plex-mono-500.woff)", { weight: "500" }),
  ];
  ready = Promise.all(
    faces.map((f) =>
      f.load().then((loaded) => {
        document.fonts.add(loaded);
      }),
    ),
  )
    .then(() => undefined)
    .catch(() => undefined); // fall back to the system stack rather than never drawing
  return ready;
}
```

`src/world/scene/islands/shared/useCanvasTexture.ts`:

```ts
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { loadCanvasFonts } from "./canvasFonts";

/** A CanvasTexture redrawn whenever `deps` change, after the canvas fonts have loaded. */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: readonly unknown[],
): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [width, height]);

  useEffect(() => {
    let alive = true;
    void loadCanvasFonts().then(() => {
      if (!alive) return;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height);
      texture.needsUpdate = true;
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, ...deps]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
```

`src/world/scene/islands/shared/useHoverLift.ts`:

```ts
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/world/state/store";

/** Ref for a group (kept at y = 0 inside a positioned parent) that rises 0.1 while interactable `id` is hovered. */
export function useHoverLift(id: string) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = useWorld.getState().hoveredId === id ? 0.1 : 0;
    g.position.y = THREE.MathUtils.damp(g.position.y, target, 14, dt);
  });
  return ref;
}
```

`src/world/scene/islands/shared/dispose.ts`:

```ts
import type * as THREE from "three";

/** Disposes geometries, materials and their textures under `root` (for <primitive> objects R3F won't dispose). */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of materials) {
      for (const value of Object.values(m)) {
        if (value && typeof value === "object" && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
      }
      m.dispose();
    }
  });
}
```

`src/world/scene/islands/shared/PropBlocks.tsx`:

```tsx
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mulberry32 } from "@/world/engine/gen/rng";
import type { PropBlock } from "./props";

const GEOMETRY = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
const MATERIAL = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, metalness: 0 });
const m4 = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const col = new THREE.Color();

/** Static decorative blocks as one InstancedMesh (one draw call). Coordinates are island-local. */
export function PropBlocks({ blocks, seed = 1 }: { blocks: readonly PropBlock[]; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = mulberry32(seed);
    blocks.forEach((b, i) => {
      pos.set(b.x, b.y, b.z);
      scl.set(b.sx ?? 1, b.sy ?? 1, b.sz ?? 1);
      quat.setFromEuler(euler.set(b.rx ?? 0, b.ry ?? 0, b.rz ?? 0));
      mesh.setMatrixAt(i, m4.compose(pos, quat, scl));
      col.set(b.c).offsetHSL((r() - 0.5) * 0.01, (r() - 0.5) * 0.04, (r() - 0.5) * 0.04);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks, seed]);

  return (
    <instancedMesh
      key={blocks.length}
      ref={ref}
      args={[GEOMETRY, MATERIAL, blocks.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
```

`src/world/scene/islands/shared/InfoBoard.tsx`:

```tsx
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { WorldText } from "@/world/scene/WorldText";
import { islandFrame } from "./local";
import { PALETTE } from "./props";
import { wrapWords } from "./text";

const WIDTH = 2.4; // keep in sync with INFO_HALF_SPAN in layouts.ts (posts at ±(WIDTH / 2 − 0.2))
const POST_H = 1.0;
const ROW = 0.3;

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
  const rows = lines.flatMap((l) => wrapWords(l, Math.floor(WIDTH * 9)));
  const boardH = 0.62 + ROW * rows.length;
  const top = POST_H + boardH;
  return (
    <group position={islandFrame(placement)}>
      <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (WIDTH / 2 - 0.2), (POST_H + 0.3) / 2, -0.02]} castShadow>
            <boxGeometry args={[0.14, POST_H + 0.3, 0.14]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, POST_H + boardH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WIDTH, boardH, 0.1]} />
          <meshStandardMaterial color={PALETTE.plank[0]} roughness={0.85} />
        </mesh>
        <WorldText text={title} position={[0, top - 0.28, 0.06]} size={0.26} color="#3a2a1c" font="ui" anchorX="center" maxWidth={WIDTH - 0.2} />
        {rows.map((row, i) => (
          <WorldText key={`${i}-${row}`} text={row} position={[0, top - 0.62 - i * ROW, 0.06]} size={0.2} color="#4a3626" font="ui" anchorX="center" maxWidth={WIDTH - 0.2} />
        ))}
      </group>
    </group>
  );
}
```

`src/world/scene/islands/shared/Signpost.tsx`:

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

/** Arrow signpost that opens a project's real site in a new tab. Greyed out and inactive while `url` is empty. */
export function Signpost({
  id, placement, at, label, url, rotationY = 0,
}: {
  id: string;
  placement: IslandPlacement;
  at: { x: number; z: number };
  label: string;
  url: string | undefined;
  rotationY?: number;
}) {
  const enabled = Boolean(url);
  const lift = useHoverLift(id);
  const wood = enabled ? PALETTE.plank[0] : OFF;
  const open = () => {
    if (!url) return;
    playSfx("link");
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]}>
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
        position={worldTuple(placement, at.x + 0.15, BOARD_Y, at.z + 0.1)}
        size={[2.3, 0.8, 0.6]}
        radius={2.4}
        onActivate={open}
        enabled={() => enabled}
      />
    </>
  );
}
```

- [ ] **Step 8: Type-check and build**

Run: `npm run build`
Expected: exit 0 (`tsc -b` clean, Vite build done). The world still shows Part B's placeholder islands.

- [ ] **Step 9: Commit**

```bash
git add src/world/scene/islands/index.ts src/world/scene/islands/placeholders.ts src/world/scene/islands/shared public/fonts/canvas src/config/worldProjects.test.ts src/config/portfolio.ts
git commit -m "feat: island toolkit (local frame, props, boards, signposts, canvas fonts)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```
(`git add src/config/portfolio.ts` is a no-op when the file did not change.)

---

### Task 2: Prop layouts, voxel font, footprints, framing, screenshot pipeline

**Files:**
- Create: `src/world/scene/islands/voxelFont.ts`, `src/world/scene/islands/layouts.ts`, `src/world/scene/islands/framing.ts`
- Test: `src/world/scene/islands/voxelFont.test.ts`, `src/world/scene/islands/layouts.test.ts`, `src/world/scene/islands/framing.test.ts`
- Create: `scripts/shoot-stops.mjs`
- Modify: `package.json` (script `shots`), `.gitignore` (`.shots/`)
- Modify (only if missing): `src/world/scene/TourCamera.tsx` (`?stop=N`)

**Interfaces:**
- Consumes: `buildLayout`, `IslandPlacement`, `TourStop`, `stopProgress` (Part A); `worldProjects`; `boxCells`, `postCells`, `islandFrame`, `Cell` (C1).
- Produces: `GLYPHS`, `GLYPH_HEIGHT`, `layoutText`, `layoutLines`; `HERO`, `GTID`, `PETAK`, `ORBIT`, `EZRA`, `INFO_HALF_SPAN`, `FOOTPRINTS`; `FRAMING`, `tourStopFor`; `npm run shots` writing `.shots/stop-<N>-desktop.png` and `.shots/stop-<N>-phone.png`.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/islands/voxelFont.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { layoutLines, layoutText } from "./voxelFont";

describe("voxel font", () => {
  it("lays out a narrow I as 9 cells, 3 wide", () => {
    const l = layoutText("I");
    expect(l.width).toBe(3);
    expect(l.cells).toHaveLength(9);
  });
  it("adds one empty column between glyphs", () => {
    expect(layoutText("GTID.").width).toBe(23); // 5 + 5 + 3 + 5 + 1 + 4 gaps
  });
  it("rejects glyphs it does not have", () => {
    expect(() => layoutText("Q")).toThrow("Unsupported glyph: Q");
  });
  it("centres multiple lines and stacks them with a 2-row gap", () => {
    const l = layoutLines(["EZRA", "BRILLIANT"]);
    expect(l.width).toBe(49);
    expect(l.height).toBe(12);
    for (const c of l.cells) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(l.width / 2);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(l.height);
    }
  });
});
```

`src/world/scene/islands/layouts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { worldProjects } from "@/config/portfolio";
import { FOOTPRINTS } from "./layouts";

const layout = buildLayout(worldProjects);
const byId = Object.fromEntries(layout.islands.map((p) => [p.id, p]));
const toLocal = (id: string, v: { x: number; z: number }) => ({
  x: v.x - (byId[id].origin.x + 0.5),
  z: v.z - (byId[id].origin.z + 0.5),
});

describe("island prop footprints", () => {
  it("exist for every tour island", () => {
    for (const id of layout.tourOrder) expect(FOOTPRINTS[id]?.length ?? 0).toBeGreaterThan(0);
  });

  it("stay on the island (inside 78% of the radius, the narrowest rim after noise)", () => {
    for (const id of layout.tourOrder) {
      const r = byId[id].radius * 0.78;
      for (const [x, , z] of FOOTPRINTS[id]) expect(Math.hypot(x, z), `${id} (${x},${z})`).toBeLessThanOrEqual(r);
    }
  });

  it("leave 2 blocks clear around every crossing anchor", () => {
    for (const c of layout.crossings) {
      for (const [id, anchor] of [[c.from, c.a], [c.to, c.b]] as const) {
        const a = toLocal(id, anchor);
        for (const [x, , z] of FOOTPRINTS[id]) {
          expect(Math.hypot(x - a.x, z - a.z), `${id} (${x},${z}) vs ${c.kind}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});
```

`src/world/scene/islands/framing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { worldProjects } from "@/config/portfolio";
import { islandFrame } from "./shared/local";
import { tourStopFor } from "./framing";

const layout = buildLayout(worldProjects);

describe("tour framing", () => {
  it("views every island from the +z side with the subject right of centre", () => {
    for (const p of layout.islands.filter((i) => layout.tourOrder.includes(i.id))) {
      const s = tourStopFor(p);
      const [fx, , fz] = islandFrame(p);
      expect(s.id).toBe(p.id);
      expect(s.camera.z).toBeGreaterThan(fz + 8);
      expect(s.target.x).toBeLessThan(fx); // looking left of the subject puts the subject right of centre
      const d = Math.hypot(s.camera.x - s.target.x, s.camera.y - s.target.y, s.camera.z - s.target.z);
      expect(d).toBeGreaterThan(10);
      expect(d).toBeLessThan(20);
    }
  });
  it("throws for an island without framing", () => {
    expect(() => tourStopFor({ ...layout.islands[0], id: "nope" })).toThrow("No framing for island nope");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/islands/voxelFont.test.ts src/world/scene/islands/layouts.test.ts src/world/scene/islands/framing.test.ts`
Expected: FAIL — cannot resolve `./voxelFont`, `./layouts`, `./framing`.

- [ ] **Step 3: Implement `src/world/scene/islands/voxelFont.ts`**

```ts
/** 5-row block glyphs for in-world voxel titles. Only the letters the titles use; add glyphs as titles need them. */
export const GLYPH_HEIGHT = 5;

export const GLYPHS: Record<string, readonly string[]> = {
  A: [".###.", "#...#", "#####", "#...#", "#...#"],
  B: ["####.", "#...#", "####.", "#...#", "####."],
  D: ["####.", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "####.", "#....", "#####"],
  G: [".####", "#....", "#..##", "#...#", ".###."],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  L: ["#....", "#....", "#....", "#....", "#####"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
  R: ["####.", "#...#", "####.", "#..#.", "#...#"],
  T: ["#####", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "...#.", "..#..", ".#...", "#####"],
  ".": [".", ".", ".", ".", "#"],
  " ": ["..", "..", "..", "..", ".."],
};

export interface GlyphCell { x: number; y: number }

/** Cells of one line, left-aligned from x = 0, bottom row y = 0, one empty column between glyphs. */
export function layoutText(text: string): { cells: GlyphCell[]; width: number } {
  const cells: GlyphCell[] = [];
  let cursor = 0;
  [...text.toUpperCase()].forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`Unsupported glyph: ${ch}`);
    if (i > 0) cursor += 1;
    glyph.forEach((row, r) => {
      [...row].forEach((c, k) => {
        if (c === "#") cells.push({ x: cursor + k, y: GLYPH_HEIGHT - 1 - r });
      });
    });
    cursor += glyph[0].length;
  });
  return { cells, width: cursor };
}

/** Cell centres of several centred lines: x relative to the block's centre, y from its bottom (both in cell units). */
export function layoutLines(lines: readonly string[], lineGap = 2): { cells: GlyphCell[]; width: number; height: number } {
  const laid = lines.map(layoutText);
  const width = Math.max(...laid.map((l) => l.width));
  const height = lines.length * GLYPH_HEIGHT + (lines.length - 1) * lineGap;
  const cells: GlyphCell[] = [];
  laid.forEach((l, i) => {
    const yOff = (lines.length - 1 - i) * (GLYPH_HEIGHT + lineGap);
    const xOff = (width - l.width) / 2;
    for (const c of l.cells) cells.push({ x: c.x + xOff - width / 2 + 0.5, y: c.y + yOff + 0.5 });
  });
  return { cells, width, height };
}
```

- [ ] **Step 4: Implement `src/world/scene/islands/layouts.ts`**

```ts
import { layoutLines } from "./voxelFont";
import { boxCells, postCells, type Cell } from "./shared/local";

/**
 * Single source of island prop positions (island-local, fronts face +z).
 * Components read these to place props; FOOTPRINTS derives collision cells from the same numbers.
 * layouts.test.ts checks: inside 78% of the radius, at least 2 blocks from every crossing anchor.
 */

export const INFO_HALF_SPAN = 1.0; // InfoBoard posts at ±(2.4 / 2 − 0.2)

export const HERO = {
  tree: { x: -4, z: 1, h: 3, seed: 5 },
  flag: { x: 3, z: 1.5 },
  info: { x: -1.8, z: 1.8, ry: 0.3 },
  title: { x: 0, z: -2.5, cell: 0.13, lines: ["EZRA", "BRILLIANT"] },
} as const;

export const GTID = {
  chart: { x0: -4, z: -1, heights: [1, 2, 2, 3, 2, 4, 5, 4, 3] },
  lock: { x: 2, z: -1 },
  lamps: { x: -3, z: 2 },
  board: { x: 3.2, z: 2.4, w: 4, h: 2.5, y: 2.1, ry: -0.35 },
  title: { x: -1, z: -4.2, cell: 0.32, lines: ["GTID."] },
  info: { x: -4.4, z: 3, ry: 0.35 },
  link: { x: -2.4, z: 5, ry: 0.2 },
} as const;

export const PETAK = {
  house: { x0: -3, z0: -2, w: 4, d: 3 },
  trees: [
    { x: 3, z: -3, h: 3, seed: 9 },
    { x: -5, z: -3, h: 2, seed: 13 },
  ],
  lanterns: [
    { x: 1.4, z: 1.6 },
    { x: -4.6, z: 1.2 },
  ],
  sign: { x: 2.6, z: 3, ry: -0.2 },
  kid: { home: { x: 3, z: -3.65 }, peek: 0.62, hide: { x: -1.5, z: -3.6 } },
  info: { x: -4.6, z: 3.2, ry: 0.2 },
  link: { x: 4.6, z: 4, ry: -0.2 },
} as const;

export const ORBIT = {
  crates: [
    { x: 2.5, z: 0.9, s: 0.85, ry: 0, stack: 0 },
    { x: 2.45, z: 0.85, s: 0.7, ry: 0.35, stack: 0.85 },
    { x: -2.5, z: 1.1, s: 0.8, ry: -0.2, stack: 0 },
    { x: 3.0, z: -0.5, s: 0.75, ry: 0.15, stack: 0 },
  ],
  logo: { y: 5.05, z: -0.78 },
  receipt: { x: 0.95, y: 1.42, z: 1.03, w: 0.42, maxLen: 1.3 },
  info: { x: -3.2, z: 3, ry: 0.2 },
  link: { x: 3.4, z: 3.8, ry: -0.25 },
} as const;

export const EZRA = {
  robot: { x: -1.2, z: 0.2 },
  bubbles: { x: 0.5, z: 0.4, ys: [5.4, 3.9, 2.4], w: 3.6, h: 0.9 },
  screen: { x: 3.2, z: 1.8, w: 2.6, h: 1.0, y: 1.9, ry: -0.3 },
  info: { x: -4.4, z: 3, ry: 0.35 },
  link: { x: 3.6, z: 4.2, ry: -0.25 },
} as const;

const rot = (dx: number, ry: number) => ({ x: dx * Math.cos(ry), z: -dx * Math.sin(ry) });

function boardPosts(at: { x: number; z: number }, halfSpan: number, ry: number): Cell[] {
  return [-1, 1].flatMap((s) => {
    const o = rot(s * halfSpan, ry);
    return postCells(at.x + o.x, at.z + o.z);
  });
}

function titleCells(t: { x: number; z: number; cell: number; lines: readonly string[] }): Cell[] {
  const half = (layoutLines(t.lines).width * t.cell) / 2;
  const z = Math.round(t.z);
  return boxCells(Math.round(t.x - half), Math.round(t.x + half), 0, 1, z, z);
}

const trunk = (t: { x: number; z: number; h: number }): Cell[] => boxCells(t.x, t.x, 0, t.h - 1, t.z, t.z);

export const FOOTPRINTS: Record<string, Cell[]> = {
  hero: [
    ...trunk(HERO.tree),
    ...postCells(HERO.flag.x, HERO.flag.z, 3),
    ...boardPosts(HERO.info, INFO_HALF_SPAN, HERO.info.ry),
    ...titleCells(HERO.title),
  ],
  gtid: [
    ...GTID.chart.heights.flatMap((h, i) => boxCells(GTID.chart.x0 + i, GTID.chart.x0 + i, 0, h - 1, GTID.chart.z, GTID.chart.z)),
    ...boardPosts(GTID.board, GTID.board.w / 2 - 0.3, GTID.board.ry),
    ...titleCells(GTID.title),
    ...boardPosts(GTID.info, INFO_HALF_SPAN, GTID.info.ry),
    ...postCells(GTID.link.x, GTID.link.z),
  ],
  "petak-umpet": [
    ...boxCells(PETAK.house.x0, PETAK.house.x0 + PETAK.house.w - 1, 0, 4, PETAK.house.z0, PETAK.house.z0 + PETAK.house.d - 1),
    [PETAK.house.x0 + 1, 0, PETAK.house.z0 + PETAK.house.d],
    ...PETAK.trees.flatMap(trunk),
    ...PETAK.lanterns.flatMap((l) => postCells(l.x, l.z)),
    ...postCells(PETAK.sign.x, PETAK.sign.z),
    ...boardPosts(PETAK.info, INFO_HALF_SPAN, PETAK.info.ry),
    ...postCells(PETAK.link.x, PETAK.link.z),
  ],
  "orbit-store": [
    ...boxCells(-1, 1, 0, 1, -1, 1),
    ...ORBIT.crates.flatMap((c) => postCells(c.x, c.z, c.stack > 0 ? 2 : 1)),
    ...boardPosts(ORBIT.info, INFO_HALF_SPAN, ORBIT.info.ry),
    ...postCells(ORBIT.link.x, ORBIT.link.z),
  ],
  "ezra-bot": [
    ...boxCells(-2, 0, 0, 3, 0, 0),
    ...boardPosts(EZRA.screen, EZRA.screen.w / 2 - 0.25, EZRA.screen.ry),
    ...boardPosts(EZRA.info, INFO_HALF_SPAN, EZRA.info.ry),
    ...postCells(EZRA.link.x, EZRA.link.z),
  ],
};
```

- [ ] **Step 5: Implement `src/world/scene/islands/framing.ts`**

```ts
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { TourStop } from "@/world/engine/camera/tourPath";
import { islandFrame } from "./shared/local";

type V = readonly [number, number, number];

/** Camera and look-at offsets from islandFrame(p). Target left of the subject → subject sits centre-right. */
export const FRAMING: Record<string, { cam: V; target: V; dwell: number }> = {
  hero: { cam: [-5.5, 5.2, 11.5], target: [-1.4, 1.3, -0.4], dwell: 1.2 },
  gtid: { cam: [-8, 7, 15], target: [-2.6, 2.6, 0], dwell: 1 },
  "petak-umpet": { cam: [-7, 4.6, 13], target: [-2.2, 1.8, -0.6], dwell: 1 },
  "orbit-store": { cam: [-6.5, 5.6, 12], target: [-2, 2.4, 0], dwell: 1 },
  "ezra-bot": { cam: [-7, 6.2, 13.5], target: [-2, 2.9, 0.2], dwell: 1 },
};

export function tourStopFor(p: IslandPlacement): TourStop {
  const f = FRAMING[p.id];
  if (!f) throw new Error(`No framing for island ${p.id}`);
  const [x, y, z] = islandFrame(p);
  return {
    id: p.id,
    camera: { x: x + f.cam[0], y: y + f.cam[1], z: z + f.cam[2] },
    target: { x: x + f.target[0], y: y + f.target[1], z: z + f.target[2] },
    dwell: f.dwell,
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/islands/voxelFont.test.ts src/world/scene/islands/layouts.test.ts src/world/scene/islands/framing.test.ts`
Expected: PASS. If a footprint assertion fails, its message names the island and cell: move that prop one block toward the island centre (and away from the named crossing) in `layouts.ts` and re-run. Never loosen the thresholds.

- [ ] **Step 7: Make sure the tour honours `?stop=N`**

Run: `grep -n "searchParams\|location.search" src/world/scene/TourCamera.tsx`
If it prints a line that reads a `stop` parameter, skip to Step 8. Otherwise open `src/world/scene/TourCamera.tsx`, find the variable holding the result of `buildTourPath(` (written `path` below; use the file's actual name), make sure `useEffect` is imported from `react` and `stopProgress` from `@/world/engine/camera/tourPath`, and add right after that variable:

```tsx
  // Dev/screenshot hook: /?stop=N starts the tour at stop N (no-op without the parameter).
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("stop"));
    if (!Number.isInteger(n) || n < 0 || n >= path.stops.length) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, stopProgress(path, n) * max);
  }, [path]);
```
If TourCamera reads progress from a scroll container other than the document, use that element's `scrollHeight - clientHeight` and its `scrollTo` instead.

- [ ] **Step 8: Add the screenshot script**

`scripts/shoot-stops.mjs`:

```js
// Headless screenshots of tour stops with software WebGL (SwiftShader).
// Usage: npm run build && npm run shots -- [stop ...]  → .shots/stop-<N>-desktop.png, .shots/stop-<N>-phone.png
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4173;
const args = process.argv.slice(2);
const stops = args.length ? args.map(Number) : [0, 1, 2, 3, 4];
const sizes = [["desktop", 1280, 720], ["phone", 520, 940]]; // headless Chrome won't render narrower than ~500 px
const outDir = resolve(".shots");
mkdirSync(outDir, { recursive: true });

const isWin = process.platform === "win32";
const preview = spawn(isWin ? "npx.cmd" : "npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
  shell: isWin,
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("vite preview did not start");
}

try {
  await waitForServer();
  for (const stop of stops) {
    for (const [name, w, h] of sizes) {
      const profile = mkdtempSync(join(tmpdir(), "shot-"));
      const file = join(outDir, `stop-${stop}-${name}.png`);
      execFileSync(CHROME, [
        "--headless=new", `--user-data-dir=${profile}`,
        "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
        `--window-size=${w},${h}`, "--hide-scrollbars", "--force-device-scale-factor=1",
        "--virtual-time-budget=15000", "--run-all-compositor-stages-before-draw",
        `--screenshot=${file}`, `http://localhost:${PORT}/?stop=${stop}`,
      ], { stdio: "ignore", timeout: 120000 });
      rmSync(profile, { recursive: true, force: true });
      console.log(existsSync(file) ? `shot ${file}` : `MISSING ${file}`);
    }
  }
} finally {
  if (isWin) execFileSync("taskkill", ["/pid", String(preview.pid), "/T", "/F"], { stdio: "ignore" });
  else preview.kill();
}
```

In `package.json` `"scripts"`, add after the `"serve"` entry (add a comma to the `"serve"` line):

```json
    "shots": "node scripts/shoot-stops.mjs"
```

Append to `.gitignore`:

```
.shots/
```

- [ ] **Step 9: Verify the pipeline end to end**

Run: `npm run build && npm run shots -- 0`
Expected: `shot …\.shots\stop-0-desktop.png` and `shot …\.shots\stop-0-phone.png`. Read both images with the Read tool: the hero placeholder island is in frame (Part B placeholders are still in place; that is expected here).

- [ ] **Step 10: Commit**

```bash
git add src/world/scene/islands/voxelFont.ts src/world/scene/islands/voxelFont.test.ts src/world/scene/islands/layouts.ts src/world/scene/islands/layouts.test.ts src/world/scene/islands/framing.ts src/world/scene/islands/framing.test.ts scripts/shoot-stops.mjs package.json .gitignore src/world/scene/TourCamera.tsx
git commit -m "feat: island layouts, collision footprints, tour framing and stop screenshots" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 3: GTID live-data proxy and bundled snapshot

**Files:**
- Create: `server/gtidProxy.js`
- Test: `server/gtidProxy.test.js`
- Modify: `server.js` (import + register routes before static files)
- Create: `scripts/gtid-snapshot.mjs`
- Create: `src/world/scene/islands/gtid/types.ts`, `src/world/scene/islands/gtid/snapshot.ts` (generated)
- Modify: `package.json` (script `gtid:snapshot`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `createGtidProxy`, `registerGtidRoutes`; `GET /api/gtid/price|history|mods` → `{ data, stale, fetchedAt }`; types `GtidPrice`, `GtidHistory`, `GtidModsEntry`, `GtidMods`, `GtidSnapshot`, `GtidData`; `GTID_SNAPSHOT: GtidSnapshot`.

- [ ] **Step 1: Write the failing test**

`server/gtidProxy.test.js`:

```js
import { describe, expect, it, vi } from "vitest";
import { createGtidProxy, registerGtidRoutes } from "./gtidProxy.js";

const PRICE = {
  buy: 850, sell: 870, buyBgl: 84500, sellBgl: 86000, bgl: { buy: 84500, sell: 86000 },
  spread: { dl: 20, bgl: 1500 }, posts24h: 120, sources: 14, updatedAt: "2026-10-13T08:00:00.000Z",
};
const HISTORY = {
  period: "1d", field: "buy", count: 3,
  data: [
    { t: "2026-10-13T00:00:00.000Z", v: 840, o: 840, h: 845, l: 838, c: 842 },
    { t: "2026-10-13T01:00:00.000Z", v: 846, o: 842, h: 850, l: 841, c: 848 },
    { t: "2026-10-13T02:00:00.000Z", v: 850, o: 848, h: 852, l: 846, c: 850 },
  ],
};
const STATUS = {
  mods: {
    online: [{ name: "misthios", status: "Online", lastSeen: 1 }, { name: "miu", status: "Idle", lastSeen: 1 }],
    offline: [], updatedAt: 1760342400000, source: "galang",
  },
  playerCount: { current: null, history: [] }, logs: [], sb: [], updatedAt: "2026-10-13T08:00:00.000Z", stale: false,
};

function setup() {
  const routes = { price: PRICE, history: HISTORY, mods: STATUS };
  const fetchImpl = vi.fn(async (url) => {
    const key = url.includes("game-status") ? "mods" : url.includes("endpoint=history") ? "history" : "price";
    const r = routes[key];
    if (r instanceof Error) throw r;
    return { ok: true, status: 200, json: async () => r };
  });
  const clock = { t: 0 };
  const proxy = createGtidProxy({ fetchImpl, now: () => clock.t });
  return { routes, fetchImpl, clock, proxy };
}

describe("gtid proxy", () => {
  it("returns only the price fields the board uses and caches them for 30 s", async () => {
    const { fetchImpl, clock, proxy } = setup();
    const a = await proxy.get("price");
    expect(a).toEqual({
      data: { buy: 850, sell: 870, buyBgl: 84500, sellBgl: 86000, updatedAt: "2026-10-13T08:00:00.000Z" },
      stale: false, fetchedAt: 0,
    });
    clock.t = 29_999;
    await proxy.get("price");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    clock.t = 30_000;
    await proxy.get("price");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("keeps only t/v points for the 24 h chart and caches history for 120 s", async () => {
    const { fetchImpl, clock, proxy } = setup();
    const r = await proxy.get("history");
    expect(r.data.points).toEqual([
      { t: "2026-10-13T00:00:00.000Z", v: 840 },
      { t: "2026-10-13T01:00:00.000Z", v: 846 },
      { t: "2026-10-13T02:00:00.000Z", v: 850 },
    ]);
    clock.t = 119_999;
    await proxy.get("history");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns only the mods roster from game-status", async () => {
    const { proxy } = setup();
    const r = await proxy.get("mods");
    expect(r.data).toEqual({
      online: [{ name: "misthios", status: "Online" }, { name: "miu", status: "Idle" }],
      updatedAt: 1760342400000,
    });
  });

  it("serves the last good payload marked stale when the upstream fails", async () => {
    const { routes, clock, proxy } = setup();
    await proxy.get("price");
    clock.t = 31_000;
    routes.price = new Error("down");
    const r = await proxy.get("price");
    expect(r.stale).toBe(true);
    expect(r.fetchedAt).toBe(0);
    expect(r.data.buy).toBe(850);
  });

  it("rejects with status 503 when nothing is cached and the upstream fails", async () => {
    const { routes, proxy } = setup();
    routes.price = new Error("down");
    await expect(proxy.get("price")).rejects.toMatchObject({ status: 503 });
  });

  it("treats a 'Not enough data' history answer as a failure", async () => {
    const { routes, proxy } = setup();
    routes.history = { error: "Not enough data" };
    await expect(proxy.get("history")).rejects.toMatchObject({ status: 503 });
  });

  it("rejects unknown keys with status 404", async () => {
    const { proxy } = setup();
    await expect(proxy.get("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("registers the three routes, answering JSON with no-store caching", async () => {
    const handlers = {};
    const app = { get: (path, fn) => { handlers[path] = fn; } };
    const proxy = { get: vi.fn(async (k) => ({ data: { k }, stale: false, fetchedAt: 0 })) };
    registerGtidRoutes(app, proxy);
    expect(Object.keys(handlers).sort()).toEqual(["/api/gtid/history", "/api/gtid/mods", "/api/gtid/price"]);
    const res = {
      headers: {}, code: 200, body: null,
      set(k, v) { this.headers[k] = v; return this; },
      status(c) { this.code = c; return this; },
      json(b) { this.body = b; return this; },
    };
    await handlers["/api/gtid/price"]({}, res);
    expect(res.body).toEqual({ data: { k: "price" }, stale: false, fetchedAt: 0 });
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/gtidProxy.test.js`
Expected: FAIL — `Failed to resolve import "./gtidProxy.js"`.

- [ ] **Step 3: Implement `server/gtidProxy.js`**

```js
// Server-side proxy for gtid.pro's public API, with an in-memory cache.
// The portfolio's GTID island reads /api/gtid/*; the browser never calls gtid.pro directly.

const TTL = { price: 30_000, history: 120_000, mods: 30_000 };

function pickPrice(j) {
  if (!j || j.error || !("buy" in j)) return null;
  return { buy: j.buy ?? null, sell: j.sell ?? null, buyBgl: j.buyBgl ?? null, sellBgl: j.sellBgl ?? null, updatedAt: j.updatedAt ?? null };
}

function pickHistory(j) {
  if (!j || !Array.isArray(j.data) || j.data.length < 2) return null;
  return { points: j.data.map((d) => ({ t: d.t, v: d.v })) };
}

function pickMods(j) {
  if (!j || !j.mods || !Array.isArray(j.mods.online)) return null;
  return { online: j.mods.online.map((m) => ({ name: String(m.name), status: String(m.status) })), updatedAt: j.mods.updatedAt ?? null };
}

export function createGtidProxy({ fetchImpl = globalThis.fetch, now = () => Date.now(), base = "https://gtid.pro", timeoutMs = 8000 } = {}) {
  const sources = {
    price: { url: `${base}/api/dl-price?endpoint=price`, pick: pickPrice },
    history: { url: `${base}/api/dl-price?endpoint=history&period=1d&field=buy`, pick: pickHistory },
    mods: { url: `${base}/api/game-status`, pick: pickMods },
  };
  const cache = new Map(); // key -> { data, at }
  const inflight = new Map(); // key -> Promise<data>

  async function load(key) {
    const src = sources[key];
    const res = await fetchImpl(src.url, {
      headers: { accept: "application/json", "user-agent": "ezrabrilliant.com portfolio" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = src.pick(await res.json());
    if (!data) throw new Error("unexpected payload");
    return data;
  }

  async function get(key) {
    if (!sources[key]) {
      const e = new Error(`unknown gtid source: ${key}`);
      e.status = 404;
      throw e;
    }
    const hit = cache.get(key);
    if (hit && now() - hit.at < TTL[key]) return { data: hit.data, stale: false, fetchedAt: hit.at };
    if (!inflight.has(key)) inflight.set(key, load(key).finally(() => inflight.delete(key)));
    try {
      const data = await inflight.get(key);
      const at = now();
      cache.set(key, { data, at });
      return { data, stale: false, fetchedAt: at };
    } catch (err) {
      if (hit) return { data: hit.data, stale: true, fetchedAt: hit.at };
      const e = new Error(`gtid ${key} unavailable: ${err.message}`);
      e.status = 503;
      throw e;
    }
  }

  return { get };
}

export function registerGtidRoutes(app, proxy = createGtidProxy()) {
  for (const key of ["price", "history", "mods"]) {
    app.get(`/api/gtid/${key}`, async (_req, res) => {
      try {
        const result = await proxy.get(key);
        res.set("Cache-Control", "no-store");
        res.json(result);
      } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
      }
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run server/gtidProxy.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Wire the routes into `server.js`**

Add next to the other imports at the top of `server.js`:

```js
import { registerGtidRoutes } from "./server/gtidProxy.js";
```

Insert directly above the line `// Serve static files from Vite build`:

```js
// GTID live prices + mods for the portfolio's GTID island (cached proxy of gtid.pro)
registerGtidRoutes(app);

```

- [ ] **Step 6: Add the board data types**

`src/world/scene/islands/gtid/types.ts`:

```ts
/** Shapes served by /api/gtid/* (see server/gtidProxy.js). Prices are rupiah per DL / per BGL. */
export interface GtidPrice { buy: number | null; sell: number | null; buyBgl: number | null; sellBgl: number | null; updatedAt: string | null }
export interface GtidHistory { points: { t: string; v: number }[] }
export interface GtidModsEntry { name: string; status: string }
export interface GtidMods { online: GtidModsEntry[]; updatedAt: number | null }
export interface GtidSnapshot { price: GtidPrice; history: GtidHistory; mods: GtidMods; capturedAt: string }
/** What the island renders: `live` once any proxy answer arrived; `stale` when some data is old or from the snapshot. */
export interface GtidData { price: GtidPrice; history: GtidHistory; mods: GtidMods; stale: boolean; live: boolean }
```

- [ ] **Step 7: Capture the bundled snapshot from gtid.pro**

`scripts/gtid-snapshot.mjs`:

```js
// Captures real gtid.pro data into the bundled fallback the GTID board shows when /api/gtid is unreachable.
// Usage: npm run gtid:snapshot
import { writeFileSync } from "node:fs";
import { createGtidProxy } from "../server/gtidProxy.js";

const proxy = createGtidProxy();
const [price, history, mods] = await Promise.all(["price", "history", "mods"].map((k) => proxy.get(k)));
const snapshot = { price: price.data, history: history.data, mods: mods.data, capturedAt: new Date().toISOString() };
const file = new URL("../src/world/scene/islands/gtid/snapshot.ts", import.meta.url);
writeFileSync(
  file,
  `// Captured from gtid.pro by scripts/gtid-snapshot.mjs. Fallback when the live proxy is unreachable.\n` +
    `import type { GtidSnapshot } from "./types";\n\n` +
    `export const GTID_SNAPSHOT: GtidSnapshot = ${JSON.stringify(snapshot, null, 2)};\n`,
);
console.log(`snapshot written (${snapshot.capturedAt}): DL buy ${snapshot.price.buy}, ${snapshot.history.points.length} points, ${snapshot.mods.online.length} mods`);
```

In `package.json` `"scripts"`, add after `"shots"` (comma on the previous line):

```json
    "gtid:snapshot": "node scripts/gtid-snapshot.mjs"
```

Run: `npm run gtid:snapshot`
Expected: `snapshot written (…): DL buy <number>, <n> points, <m> mods` and `src/world/scene/islands/gtid/snapshot.ts` exists. If the command throws (gtid.pro unreachable), STOP and report BLOCKED with the error — do not write prices by hand.

- [ ] **Step 8: Type-check and build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add server/gtidProxy.js server/gtidProxy.test.js server.js scripts/gtid-snapshot.mjs src/world/scene/islands/gtid/types.ts src/world/scene/islands/gtid/snapshot.ts package.json
git commit -m "feat: cached gtid.pro proxy (/api/gtid) and bundled price snapshot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 4: Punchable voxel titles

**Files:**
- Create: `src/world/scene/islands/VoxelTitle.tsx`

**Interfaces:**
- Consumes: `layoutLines` (C2); `islandFrame`, `worldOf` (C1); `runtime.particles`, `useWorld` (Part B); `Interactable` (Part B); `playSfx`, `mulberry32`, `hashString` (Part A).
- Produces: `VoxelTitle({ id, placement, at, lines, cell, color, rotationY?, label? })` — renders in island-local space plus a world-space Interactable; punching scatters the blocks, bursts debris, and they reassemble in ~1.6 s (reduced motion: a short squash only).

- [ ] **Step 1: Implement `src/world/scene/islands/VoxelTitle.tsx`**

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { hashString, mulberry32 } from "@/world/engine/gen/rng";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { islandFrame, worldOf } from "./shared/local";
import { layoutLines } from "./voxelFont";

const SCATTER = 0.75; // s of free flight
const RETURN = 0.9; // s to fly home
const GRAVITY = 16;
const BOX = new THREE.BoxGeometry(0.92, 0.92, 0.92);

type Phase = "rest" | "scatter" | "return" | "squash";

export function VoxelTitle({
  id, placement, at, lines, cell, color, rotationY = 0, label = "Punch the letters",
}: {
  id: string;
  placement: IslandPlacement;
  at: { x: number; z: number };
  lines: readonly string[];
  cell: number;
  color: string;
  rotationY?: number;
  label?: string;
}) {
  const layout = useMemo(() => layoutLines(lines), [lines]);
  const count = layout.cells.length;
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.75 }), [color]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const sim = useRef({
    phase: "rest" as Phase,
    t: 0,
    off: new Float32Array(count * 3),
    from: new Float32Array(count * 3),
    vel: new Float32Array(count * 3),
    spin: new Float32Array(count * 3),
  });
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);

  const write = (scaleY: number, spinT: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { off, spin } = sim.current;
    layout.cells.forEach((c, i) => {
      tmp.p.set(c.x * cell + off[i * 3], c.y * cell * scaleY + off[i * 3 + 1], off[i * 3 + 2]);
      tmp.q.setFromEuler(tmp.e.set(spin[i * 3] * spinT, spin[i * 3 + 1] * spinT, spin[i * 3 + 2] * spinT));
      tmp.s.set(cell, cell * scaleY, cell);
      mesh.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    write(1, 0);
    ref.current?.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, cell]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    const s = sim.current;
    if (s.phase === "rest") return;
    s.t += dt;
    if (s.phase === "squash") {
      const k = Math.min(1, s.t / 0.3);
      write(1 - 0.18 * Math.sin(Math.PI * k), 0);
      if (k >= 1) {
        s.phase = "rest";
        write(1, 0);
      }
      return;
    }
    if (s.phase === "scatter") {
      for (let i = 0; i < count; i++) {
        s.vel[i * 3 + 1] -= GRAVITY * dt;
        s.off[i * 3] += s.vel[i * 3] * dt;
        s.off[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
        s.off[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      }
      write(1, s.t);
      if (s.t >= SCATTER) {
        s.from.set(s.off);
        s.phase = "return";
        s.t = 0;
      }
      return;
    }
    const k = Math.min(1, s.t / RETURN);
    const e = 1 - Math.pow(1 - k, 3);
    for (let i = 0; i < count * 3; i++) s.off[i] = s.from[i] * (1 - e);
    write(1, SCATTER * (1 - e));
    if (k >= 1) {
      s.phase = "rest";
      s.off.fill(0);
      write(1, 0);
    }
  });

  const centre = worldOf(placement, at.x, (layout.height * cell) / 2, at.z);

  const punch = () => {
    const s = sim.current;
    if (s.phase === "scatter" || s.phase === "return") return;
    playSfx("punch");
    runtime.particles.burst(centre, "debris", { color, count: 22 });
    if (useWorld.getState().reducedMotion) {
      s.phase = "squash";
      s.t = 0;
      return;
    }
    const r = mulberry32(hashString(id) ^ Math.floor(performance.now()));
    for (let i = 0; i < count; i++) {
      s.off[i * 3] = 0;
      s.off[i * 3 + 1] = 0;
      s.off[i * 3 + 2] = 0;
      s.vel[i * 3] = (r() - 0.5) * 6;
      s.vel[i * 3 + 1] = 2 + r() * 5;
      s.vel[i * 3 + 2] = 1 + r() * 3;
      s.spin[i * 3] = (r() - 0.5) * 8;
      s.spin[i * 3 + 1] = (r() - 0.5) * 8;
      s.spin[i * 3 + 2] = (r() - 0.5) * 8;
    }
    s.phase = "scatter";
    s.t = 0;
    playSfx("burst");
  };

  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, 0, at.z]} rotation={[0, rotationY, 0]}>
          <instancedMesh ref={ref} args={[BOX, material, count]} castShadow receiveShadow dispose={null} />
        </group>
      </group>
      <Interactable
        id={id}
        island={placement.id}
        label={label}
        position={[centre.x, centre.y, centre.z]}
        size={[layout.width * cell, layout.height * cell, cell * 4]}
        radius={3}
        onActivate={punch}
      />
    </>
  );
}
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: exit 0. (VoxelTitle is used from Task 5; nothing renders it yet.)

- [ ] **Step 3: Commit**

```bash
git add src/world/scene/islands/VoxelTitle.tsx
git commit -m "feat: punchable voxel titles that burst and reassemble" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 5: Hero island

**Files:**
- Create: `src/world/scene/islands/Hero.tsx`
- Modify: `src/world/scene/islands/index.ts`

**Interfaces:**
- Consumes: `HERO`, `FOOTPRINTS` (C2), `tourStopFor` (C2), `VoxelTitle` (C4), `PropBlocks`, `treeBlocks`, `InfoBoard`, `islandFrame`, `stampCells` (C1), `worldCopy` (Part A), `useWorld` (Part B), `StarIslandModule` (Part B).
- Produces: `heroIsland: StarIslandModule` (id `"hero"`). The seated Ezra on the +z edge belongs to Part B's `Ezra.tsx`; this island keeps the front edge clear.

- [ ] **Step 1: Implement `src/world/scene/islands/Hero.tsx`**

```tsx
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { worldCopy } from "@/config/portfolio";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { FOOTPRINTS, HERO } from "./layouts";
import { tourStopFor } from "./framing";
import { VoxelTitle } from "./VoxelTitle";
import { InfoBoard } from "./shared/InfoBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { islandFrame, stampCells } from "./shared/local";
import { treeBlocks, type PropBlock } from "./shared/props";

const FLOWERS: PropBlock[] = (
  [
    [-2, 0, "#efe7cf"], [1, -1, "#e8c9a8"], [-1, 3, "#efe7cf"], [2, 3, "#d9c37a"], [-3, -1, "#efe7cf"],
  ] as const
).map(([x, z, c]) => ({ x, y: 0.12, z, c, sx: 0.24, sy: 0.24, sz: 0.24 }));

function Flag({ x, z }: { x: number; z: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.05, 0.62, 12, 2);
    g.translate(0.525, 0, 0); // left edge on the pole
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array as ArrayLike<number>), [geometry]);

  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      pos.setZ(i, Math.sin(bx * 4 - t * 3.2) * 0.08 * bx);
      pos.setY(i, base[i * 3 + 1] + Math.sin(bx * 3 - t * 2.4) * 0.02 * bx);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5b4632" roughness={0.9} />
      </mesh>
      <mesh geometry={geometry} position={[0.05, 2.3, 0]} castShadow>
        <meshStandardMaterial color="#e6dbc0" side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

function HeroIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(() => [...treeBlocks(HERO.tree.x, HERO.tree.z, HERO.tree.h, HERO.tree.seed), ...FLOWERS], []);
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={101} />
        <Flag x={HERO.flag.x} z={HERO.flag.z} />
      </group>
      <InfoBoard placement={placement} at={HERO.info} rotationY={HERO.info.ry} title={worldCopy.location} lines={[worldCopy.heroLine]} />
      <VoxelTitle id="hero-title" placement={placement} at={HERO.title} lines={HERO.title.lines} cell={HERO.title.cell} color="#f1ebdd" />
    </>
  );
}

export const heroIsland: StarIslandModule = {
  id: "hero",
  Component: HeroIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS.hero),
  tourStop: tourStopFor,
};
```

- [ ] **Step 2: Register it**

Replace `src/world/scene/islands/index.ts` with:

```ts
import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";
import { heroIsland } from "./Hero";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {
  hero: heroIsland,
};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
```

- [ ] **Step 3: Build and look at the hero stop**

Run: `npx vitest run src/world/scene/islands && npm run build && npm run shots -- 0`
Then Read `.shots/stop-0-desktop.png` and `.shots/stop-0-phone.png`. Check:
- the voxel letters EZRA / BRILLIANT stand at the back of the island and read clearly;
- the info board text (location + the three-line hero line) is legible and not clipped;
- tree, flag and flowers sit on the grass (nothing floats or sinks);
- the island sits centre-right with the seated Ezra visible on the front edge.
If the island is badly framed, adjust `FRAMING.hero` in `framing.ts` (target.x more negative pushes the subject right; a smaller cam z enlarges it), re-run `npx vitest run src/world/scene/islands/framing.test.ts` and re-shoot. At most 3 rounds.

- [ ] **Step 4: Commit**

```bash
git add src/world/scene/islands/Hero.tsx src/world/scene/islands/index.ts src/world/scene/islands/framing.ts
git commit -m "feat: hero island with punchable title, flag and info board" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 6: GTID island with the live price board

**Files:**
- Create: `src/world/scene/islands/gtid/useGtidData.ts`, `src/world/scene/islands/gtid/board.ts`, `src/world/scene/islands/Gtid.tsx`
- Test: `src/world/scene/islands/gtid/board.test.ts`
- Modify: `src/world/scene/islands/index.ts`

**Interfaces:**
- Consumes: `GtidData`, `GTID_SNAPSHOT` (C3), `/api/gtid/*` (C3), `GTID`, `FOOTPRINTS`, `tourStopFor` (C2), `VoxelTitle` (C4), C1 toolkit, `runtime`, `useWorld`, `Interactable` (Part B), `playSfx` (Part A).
- Produces: `useGtidData(): GtidData`; `formatRp`, `normalizeSeries`, `buildBoardModel`, `drawBoard`, `BoardView`, `BoardModel`; `gtidIsland: StarIslandModule` (id `"gtid"`).

- [ ] **Step 1: Write the failing test**

`src/world/scene/islands/gtid/board.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { GtidData } from "./types";
import { buildBoardModel, formatRp, normalizeSeries } from "./board";

const data = (over: Partial<GtidData> = {}): GtidData => ({
  price: { buy: 850, sell: 870, buyBgl: 84500, sellBgl: 86000, updatedAt: null },
  history: { points: [{ t: "a", v: 840 }, { t: "b", v: 860 }, { t: "c", v: 850 }] },
  mods: {
    online: [
      { name: "miu", status: "Idle" },
      { name: "misthios", status: "Online" },
      { name: "qadevone", status: "Undercover" },
    ],
    updatedAt: null,
  },
  stale: false,
  live: true,
  ...over,
});

describe("GTID board model", () => {
  it("formats rupiah prices and missing values", () => {
    expect(formatRp(850)).toBe("Rp 850");
    expect(formatRp(84500)).toBe("Rp 84,500");
    expect(formatRp(null)).toBe("—");
  });

  it("normalises the 24 h series into the 0..1 box", () => {
    expect(normalizeSeries([{ t: "a", v: 840 }, { t: "b", v: 860 }, { t: "c", v: 850 }])).toEqual([
      { x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 },
    ]);
    expect(normalizeSeries([{ t: "a", v: 5 }, { t: "b", v: 5 }]).map((p) => p.y)).toEqual([0.5, 0.5]);
    expect(normalizeSeries([])).toEqual([]);
  });

  it("builds DL and BGL rows and the chart range", () => {
    const m = buildBoardModel(data(), "chart");
    expect(m.rows).toEqual([
      { label: "DL", buy: "Rp 850", sell: "Rp 870" },
      { label: "BGL", buy: "Rp 84,500", sell: "Rp 86,000" },
    ]);
    expect(m.chartLow).toBe("Rp 840");
    expect(m.chartHigh).toBe("Rp 860");
  });

  it("lists online mods first and counts the rest past the cap", () => {
    const m = buildBoardModel(data(), "mods", 2);
    expect(m.mods.map((x) => x.name)).toEqual(["misthios", "miu"]);
    expect(m.mods[0]).toEqual({ name: "misthios", status: "online", online: true });
    expect(m.moreMods).toBe(1);
  });

  it("says where the numbers come from", () => {
    expect(buildBoardModel(data(), "chart").footer).toBe("Live from gtid.pro");
    expect(buildBoardModel(data({ stale: true }), "chart").footer).toBe("Last update from gtid.pro");
    expect(buildBoardModel(data({ live: false, stale: true }), "chart").footer).toBe("Saved snapshot from gtid.pro");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/scene/islands/gtid/board.test.ts`
Expected: FAIL — cannot resolve `./board`.

- [ ] **Step 3: Implement `src/world/scene/islands/gtid/board.ts`**

```ts
import type { GtidData } from "./types";
import { CANVAS_FONTS } from "../shared/canvasFonts";

export type BoardView = "chart" | "mods";
export interface BoardRow { label: string; buy: string; sell: string }
export interface BoardMod { name: string; status: string; online: boolean }
export interface BoardModel {
  view: BoardView;
  rows: BoardRow[];
  chart: { x: number; y: number }[];
  chartLow: string;
  chartHigh: string;
  mods: BoardMod[];
  moreMods: number;
  footer: string;
}

const thousands = new Intl.NumberFormat("en-US");

export function formatRp(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `Rp ${thousands.format(n)}` : "—";
}

export function normalizeSeries(points: readonly { t: string; v: number }[]): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs);
  const span = Math.max(...vs) - lo;
  return points.map((p, i) => ({
    x: points.length === 1 ? 0.5 : i / (points.length - 1),
    y: span === 0 ? 0.5 : (p.v - lo) / span,
  }));
}

const RANK: Record<string, number> = { Online: 0, Idle: 1, Undercover: 2 };

export function buildBoardModel(data: GtidData, view: BoardView, maxMods = 6): BoardModel {
  const vs = data.history.points.map((p) => p.v);
  const sorted = [...data.mods.online].sort((a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3));
  return {
    view,
    rows: [
      { label: "DL", buy: formatRp(data.price.buy), sell: formatRp(data.price.sell) },
      { label: "BGL", buy: formatRp(data.price.buyBgl), sell: formatRp(data.price.sellBgl) },
    ],
    chart: normalizeSeries(data.history.points),
    chartLow: vs.length ? formatRp(Math.min(...vs)) : "—",
    chartHigh: vs.length ? formatRp(Math.max(...vs)) : "—",
    mods: sorted.slice(0, maxMods).map((m) => ({ name: m.name, status: m.status.toLowerCase(), online: m.status === "Online" })),
    moreMods: Math.max(0, sorted.length - maxMods),
    footer: !data.live ? "Saved snapshot from gtid.pro" : data.stale ? "Last update from gtid.pro" : "Live from gtid.pro",
  };
}

const C = { bg: "#0C0C0C", card: "#141414", line: "#262626", text: "#F2F2F2", muted: "#8a8a8a", accent: "#FA5D19", online: "#4fbf6c", idle: "#e2a24a", hidden: "#6b6b6b" };

/** Draws the board in GTID's own dark theme (accent #FA5D19). Price info only: no offers, no trading UI. */
export function drawBoard(ctx: CanvasRenderingContext2D, m: BoardModel, w: number, h: number): void {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = C.accent;
  ctx.font = `700 54px ${CANVAS_FONTS.ui}`;
  ctx.fillText("GTID.", 48, 86);
  ctx.fillStyle = C.muted;
  ctx.font = `500 24px ${CANVAS_FONTS.mono}`;
  ctx.fillText("DL · BGL prices", 220, 82);

  const cols = [48, 300, 640];
  ctx.fillText("BUY", cols[1], 140);
  ctx.fillText("SELL", cols[2], 140);
  m.rows.forEach((r, i) => {
    const y = 196 + i * 62;
    ctx.fillStyle = C.text;
    ctx.font = `700 34px ${CANVAS_FONTS.ui}`;
    ctx.fillText(r.label, cols[0], y);
    ctx.font = `500 34px ${CANVAS_FONTS.mono}`;
    ctx.fillText(r.buy, cols[1], y);
    ctx.fillText(r.sell, cols[2], y);
  });

  const px = 40, py = 300, pw = w - 80, ph = h - 300 - 70;
  ctx.fillStyle = C.card;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);
  ctx.font = `500 22px ${CANVAS_FONTS.mono}`;

  if (m.view === "chart") {
    ctx.fillStyle = C.muted;
    ctx.fillText("DL · buy · 24 h", px + 20, py + 36);
    ctx.textAlign = "right";
    ctx.fillText(m.chartHigh, px + pw - 20, py + 36);
    ctx.fillText(m.chartLow, px + pw - 20, py + ph - 16);
    ctx.textAlign = "left";
    if (m.chart.length > 1) {
      const cx = px + 24, cy = py + 56, cw = pw - 48 - 140, ch = ph - 90;
      const at = (p: { x: number; y: number }): [number, number] => [cx + p.x * cw, cy + (1 - p.y) * ch];
      ctx.beginPath();
      m.chart.forEach((p, i) => {
        const [x, y] = at(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(cx + cw, cy + ch);
      ctx.lineTo(cx, cy + ch);
      ctx.closePath();
      ctx.fillStyle = "rgba(250, 93, 25, 0.16)";
      ctx.fill();
      ctx.beginPath();
      m.chart.forEach((p, i) => {
        const [x, y] = at(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4;
      ctx.stroke();
      const [lx, ly] = at(m.chart[m.chart.length - 1]);
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = C.muted;
    ctx.fillText("Mods online", px + 20, py + 36);
    if (m.mods.length === 0) {
      ctx.fillStyle = C.text;
      ctx.font = `500 28px ${CANVAS_FONTS.ui}`;
      ctx.fillText("No mods online right now", px + 20, py + 96);
    }
    m.mods.forEach((mod, i) => {
      const x = px + 20 + (i % 2) * (pw / 2);
      const y = py + 90 + Math.floor(i / 2) * 54;
      ctx.fillStyle = mod.online ? C.online : mod.status === "idle" ? C.idle : C.hidden;
      ctx.beginPath();
      ctx.arc(x + 10, y - 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.text;
      ctx.font = `500 30px ${CANVAS_FONTS.mono}`;
      ctx.fillText(mod.name, x + 32, y);
      ctx.fillStyle = C.muted;
      ctx.font = `500 20px ${CANVAS_FONTS.mono}`;
      ctx.fillText(mod.status, x + pw / 2 - 150, y);
    });
    if (m.moreMods > 0) {
      ctx.fillStyle = C.muted;
      ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
      ctx.fillText(`+${m.moreMods} more`, px + 20, py + ph - 18);
    }
  }

  ctx.fillStyle = C.muted;
  ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
  ctx.fillText(m.footer, 48, h - 26);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/scene/islands/gtid/board.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement `src/world/scene/islands/gtid/useGtidData.ts`**

```ts
import { useEffect, useState } from "react";
import type { GtidData } from "./types";
import { GTID_SNAPSHOT } from "./snapshot";

const POLL = { price: 30_000, history: 120_000, mods: 30_000 } as const;
type Key = keyof typeof POLL;

/** Polls /api/gtid/*; starts from the bundled snapshot and keeps the last good values when a poll fails. */
export function useGtidData(): GtidData {
  const [state, setState] = useState<GtidData>({
    price: GTID_SNAPSHOT.price,
    history: GTID_SNAPSHOT.history,
    mods: GTID_SNAPSHOT.mods,
    stale: true,
    live: false,
  });

  useEffect(() => {
    let alive = true;
    const fresh = new Set<Key>();
    const load = async (key: Key) => {
      try {
        const res = await fetch(`/api/gtid/${key}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const env = (await res.json()) as { data: unknown; stale: boolean };
        if (!alive) return;
        if (env.stale) fresh.delete(key);
        else fresh.add(key);
        setState((s) => ({ ...s, ...({ [key]: env.data } as Partial<GtidData>), live: true, stale: fresh.size < 3 }));
      } catch {
        if (!alive) return;
        fresh.delete(key);
        setState((s) => ({ ...s, stale: true }));
      }
    };
    const keys = Object.keys(POLL) as Key[];
    const timers = keys.map((k) => {
      void load(k);
      return window.setInterval(() => void load(k), POLL[k]);
    });
    return () => {
      alive = false;
      timers.forEach((id) => window.clearInterval(id));
    };
  }, []);

  return state;
}
```

- [ ] **Step 6: Implement `src/world/scene/islands/Gtid.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { FOOTPRINTS, GTID } from "./layouts";
import { tourStopFor } from "./framing";
import { VoxelTitle } from "./VoxelTitle";
import { InfoBoard } from "./shared/InfoBoard";
import { Signpost } from "./shared/Signpost";
import { PropBlocks } from "./shared/PropBlocks";
import { PALETTE, type PropBlock } from "./shared/props";
import { islandFrame, stampCells, worldOf, worldTuple } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";
import { useHoverLift } from "./shared/useHoverLift";
import { useGtidData } from "./gtid/useGtidData";
import { buildBoardModel, drawBoard, type BoardView } from "./gtid/board";
import type { GtidData } from "./gtid/types";

const LOCK_Y = GTID.chart.heights[GTID.lock.x - GTID.chart.x0] + 1.7;

function chartBlocks(): PropBlock[] {
  const { x0, z, heights } = GTID.chart;
  const out: PropBlock[] = [];
  heights.forEach((h, i) => {
    for (let y = 0; y < h; y++) {
      out.push({ x: x0 + i, y: y + 0.5, z, c: y === h - 1 ? PALETTE.orange : PALETTE.chart[y % 2], sx: 0.88, sz: 0.88 });
    }
  });
  out.push({ x: GTID.lamps.x, y: 0.18, z: GTID.lamps.z, c: PALETTE.stone[0], sx: 1.7, sy: 0.36, sz: 0.7 });
  return out;
}

/** Our own Diamond Lock: faceted blue gem body + silver shackle, turning above the tallest chart column. */
function DiamondLock({ placement }: { placement: IslandPlacement }) {
  const ref = useRef<THREE.Group>(null);
  const next = useRef(0);
  const sparkleAt = useMemo(() => worldOf(placement, GTID.lock.x, LOCK_Y, GTID.lock.z), [placement]);
  const gem = useMemo(
    () =>
      new THREE.LatheGeometry(
        [new THREE.Vector2(0, -0.95), new THREE.Vector2(0.78, -0.05), new THREE.Vector2(0.86, 0.1), new THREE.Vector2(0.58, 0.42), new THREE.Vector2(0.001, 0.42)],
        8,
      ),
    [],
  );
  useEffect(() => () => gem.dispose(), [gem]);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || useWorld.getState().reducedMotion) return;
    const t = clock.elapsedTime;
    g.rotation.y = t * 0.5;
    g.position.y = LOCK_Y + Math.sin(t * 1.2) * 0.12;
    if (t > next.current) {
      next.current = t + 0.9;
      runtime.particles.burst(sparkleAt, "sparkle", { count: 2 });
    }
  });

  return (
    <group ref={ref} position={[GTID.lock.x, LOCK_Y, GTID.lock.z]} scale={1.15}>
      <mesh geometry={gem} castShadow>
        <meshStandardMaterial color="#58a6e6" emissive="#1b5c9c" emissiveIntensity={0.55} roughness={0.18} metalness={0.1} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <torusGeometry args={[0.42, 0.1, 10, 28, Math.PI]} />
        <meshStandardMaterial color="#d5d9de" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

/** Three lamps next to the chart: one lit per mod online (up to three), from the live roster. */
function ModLamps({ online }: { online: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    refs.current.forEach((m, i) => {
      if (m) m.scale.setScalar(i < online ? 1 + Math.sin(clock.elapsedTime * 2 + i) * 0.06 : 1);
    });
  });
  return (
    <>
      {[-0.55, 0, 0.55].map((dx, i) => (
        <mesh key={dx} ref={(m) => { refs.current[i] = m; }} position={[GTID.lamps.x + dx, 0.51, GTID.lamps.z]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial
            color={i < online ? "#6cc47f" : "#4c5650"}
            emissive={i < online ? "#4fbf6c" : "#000000"}
            emissiveIntensity={0.8}
            roughness={0.5}
          />
        </mesh>
      ))}
    </>
  );
}

function PriceBoard({ placement, data }: { placement: IslandPlacement; data: GtidData }) {
  const [view, setView] = useState<BoardView>("chart");
  const model = useMemo(() => buildBoardModel(data, view), [data, view]);
  const texture = useCanvasTexture(1024, 640, (ctx, w, h) => drawBoard(ctx, model, w, h), [model]);
  const lift = useHoverLift("gtid-board");
  const { x, z, w, h, y, ry } = GTID.board;
  const centreY = y + h / 2 - 0.4;
  const toggle = () => {
    playSfx("click");
    setView((v) => (v === "chart" ? "mods" : "chart"));
  };
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[x, 0, z]} rotation={[0, ry, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - 0.3), y / 2, -0.08]} castShadow>
              <boxGeometry args={[0.16, y, 0.16]} />
              <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
            </mesh>
          ))}
          <group ref={lift}>
            <mesh position={[0, centreY, 0]} castShadow>
              <boxGeometry args={[w + 0.16, h + 0.16, 0.12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
            </mesh>
            <mesh position={[0, centreY, 0.065]}>
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.85} roughness={0.7} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
      <Interactable
        id="gtid-board"
        island={placement.id}
        label={view === "chart" ? "Show mods online" : "Show price chart"}
        position={worldTuple(placement, x, centreY, z)}
        size={[w, h, 0.8]}
        radius={3}
        onActivate={toggle}
      />
    </>
  );
}

function GtidIsland({ placement }: { placement: IslandPlacement }) {
  const data = useGtidData();
  const blocks = useMemo(chartBlocks, []);
  const project = projectById("gtid");
  const online = data.mods.online.filter((m) => m.status === "Online").length;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={202} />
        <ModLamps online={Math.min(3, online)} />
        <DiamondLock placement={placement} />
      </group>
      <PriceBoard placement={placement} data={data} />
      <VoxelTitle id="gtid-title" placement={placement} at={GTID.title} lines={GTID.title.lines} cell={GTID.title.cell} color={PALETTE.orange} />
      <InfoBoard placement={placement} at={GTID.info} rotationY={GTID.info.ry} title="gtid.pro" lines={project.stats ?? []} />
      <Signpost id="gtid-link" placement={placement} at={GTID.link} rotationY={GTID.link.ry} label="Visit gtid.pro" url={project.links.demo} />
    </>
  );
}

export const gtidIsland: StarIslandModule = {
  id: "gtid",
  Component: GtidIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS.gtid),
  tourStop: tourStopFor,
};
```

- [ ] **Step 7: Register it**

Replace `src/world/scene/islands/index.ts` with:

```ts
import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";
import { heroIsland } from "./Hero";
import { gtidIsland } from "./Gtid";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {
  hero: heroIsland,
  gtid: gtidIsland,
};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
```

- [ ] **Step 8: Build and look at the GTID stop**

Run: `npx vitest run src/world/scene/islands && npm run build && npm run shots -- 1`
Read `.shots/stop-1-desktop.png` and `.shots/stop-1-phone.png`. Check:
- the board shows DL and BGL buy/sell, the orange 24 h line and the footer "Saved snapshot from gtid.pro" (preview has no API server, so the snapshot is expected);
- the "GTID." voxel letters are orange and readable at the back; the Diamond Lock floats above the tallest column;
- info board ("gtid.pro", 2,600 visitors / day, 16,000+ items) and the "Visit gtid.pro" sign are legible.
Adjust `FRAMING.gtid` if the board or title is cut off (max 3 rounds; re-run the framing test after each change).

Then check live data once with the real server: `npm run start:dev` in the background, open `http://localhost:3001/api/gtid/price` with `curl -s http://localhost:3001/api/gtid/price`, expect JSON with `"stale":false` and numeric `buy`; stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/world/scene/islands/gtid/useGtidData.ts src/world/scene/islands/gtid/board.ts src/world/scene/islands/gtid/board.test.ts src/world/scene/islands/Gtid.tsx src/world/scene/islands/index.ts src/world/scene/islands/framing.ts
git commit -m "feat: GTID island with live DL/BGL board, mods online and Diamond Lock" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 7: Petak Umpet island

**Files:**
- Create: `src/world/scene/islands/PetakUmpet.tsx`
- Modify: `src/world/scene/islands/index.ts`

**Interfaces:**
- Consumes: `PETAK`, `FOOTPRINTS`, `tourStopFor` (C2), C1 toolkit (`PropBlocks`, `treeBlocks`, `PALETTE`, `InfoBoard`, `Signpost`, `useCanvasTexture`, `CANVAS_FONTS`, `islandFrame`, `worldOf`, `stampCells`, `projectById`), `runtime.player`, `useWorld`, `Interactable` (Part B), `playSfx` (Part A).
- Produces: `petakUmpetIsland: StarIslandModule` (id `"petak-umpet"`).

Mood: calm village. Slow lantern sway, no particle bursts, no shake. The title is a wooden sign with a little house, after the game's logo.

- [ ] **Step 1: Implement `src/world/scene/islands/PetakUmpet.tsx`**

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { FOOTPRINTS, PETAK } from "./layouts";
import { tourStopFor } from "./framing";
import { CANVAS_FONTS } from "./shared/canvasFonts";
import { InfoBoard } from "./shared/InfoBoard";
import { Signpost } from "./shared/Signpost";
import { PropBlocks } from "./shared/PropBlocks";
import { PALETTE, treeBlocks, type PropBlock } from "./shared/props";
import { islandFrame, stampCells, worldOf } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";

/** Stilt house (rumah panggung): corner stilts, plank floor, three wall rows, stepped roof, one front step. */
function houseBlocks(): PropBlock[] {
  const { x0, z0, w, d } = PETAK.house;
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const out: PropBlock[] = [];
  for (const x of [x0, x1]) for (const z of [z0, z1]) out.push({ x, y: 0.5, z, c: PALETTE.wood, sx: 0.32, sz: 0.32 });
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) out.push({ x, y: 1.15, z, c: PALETTE.plank[1], sy: 0.3 });
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      for (let row = 0; row < 3; row++) {
        let c: string = row % 2 ? PALETTE.plank[0] : PALETTE.plank[1];
        if (edgeX && edgeZ) c = PALETTE.wood;
        if (z === z1 && x === x0 + 1 && row <= 1) c = PALETTE.woodDark; // door
        if (z === z1 && x === x0 + 2 && row === 1) c = PALETTE.glass; // front window
        if (x === x0 && z === z0 + 1 && row === 1) c = PALETTE.glass; // side window
        out.push({ x, y: 1.3 + row + 0.5, z, c });
      }
    }
  }
  const cx = x0 + (w - 1) / 2;
  const cz = z0 + (d - 1) / 2;
  [[w + 1.0, 4.55, d + 1.2], [w, 5.05, d], [w - 1.0, 5.55, d - 1.2], [w - 2.0, 6.0, d - 2.2]].forEach(([sx, y, sz], k) =>
    out.push({ x: cx, y, z: cz, c: PALETTE.roof[k % 3], sx, sy: 0.5, sz }),
  );
  out.push({ x: x0 + 1, y: 0.33, z: z1 + 1, c: PALETTE.plank[0], sy: 0.65, sz: 0.9 }); // front step
  return out;
}

function Lanterns() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    refs.current.forEach((g, i) => {
      if (g) g.rotation.z = Math.sin(clock.elapsedTime * 0.7 + i * 1.7) * 0.05;
    });
  });
  return (
    <>
      {PETAK.lanterns.map((l, i) => (
        <group key={`${l.x},${l.z}`} position={[l.x, 0, l.z]}>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[0.1, 2.0, 0.1]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
          <mesh position={[0.22, 1.95, 0]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.08]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
          </mesh>
          <group ref={(g) => { refs.current[i] = g; }} position={[0.42, 1.92, 0]}>
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[0.24, 0.32, 0.24]} />
              <meshStandardMaterial color="#ffd9a0" emissive="#ffb85c" emissiveIntensity={1.1} roughness={0.6} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

function drawSign(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#b88d5f";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(70, 45, 25, 0.18)";
  for (let y = 64; y < h; y += 64) g.fillRect(0, y - 2, w, 4);
  g.strokeStyle = "#6b4f37";
  g.lineWidth = 12;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = "#3e2b1c"; // little house
  g.beginPath();
  g.moveTo(52, 128);
  g.lineTo(104, 76);
  g.lineTo(156, 128);
  g.closePath();
  g.fill();
  g.fillRect(66, 128, 76, 60);
  g.fillStyle = "#b88d5f";
  g.fillRect(94, 150, 22, 38);
  g.fillStyle = "#f6efe1";
  g.font = `700 58px ${CANVAS_FONTS.ui}`;
  g.textBaseline = "middle";
  g.fillText("PETAK", 186, 100);
  g.fillStyle = "#f3d9a4";
  g.fillText("UMPET", 186, 160);
}

function PetakSign() {
  const texture = useCanvasTexture(512, 256, drawSign, []);
  const { x, z, ry } = PETAK.sign;
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.75, -0.05]} castShadow>
        <boxGeometry args={[0.18, 1.5, 0.18]} />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <boxGeometry args={[1.9, 0.95, 0.08]} />
        <meshStandardMaterial color="#8a6644" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.85, 0.045]}>
        <planeGeometry args={[1.86, 0.91]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
    </group>
  );
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type KidState = "peek" | "run" | "hidden" | "back";

/** School-uniform kid peeking from behind the tree; runs to hide behind the house when found or approached. */
function HidingKid({ placement }: { placement: IslandPlacement }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const sim = useRef({ state: "peek" as KidState, t: 0, from: { x: 0, z: 0 } });
  const { home, hide, peek } = PETAK.kid;
  const spot = useMemo(() => worldOf(placement, home.x + peek, 0.7, home.z), [placement, home.x, home.z, peek]);

  const run = () => {
    const k = sim.current;
    if (k.state !== "peek" && k.state !== "back") return;
    const g = root.current;
    k.from = { x: g ? g.position.x : home.x, z: g ? g.position.z : home.z };
    k.state = "run";
    k.t = 0;
    playSfx("step");
  };

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const k = sim.current;
    k.t += dt;
    const { reducedMotion, mode } = useWorld.getState();
    const p = runtime.player.pos;
    const dist = Math.hypot(p.x - spot.x, p.z - spot.z);

    if (k.state === "peek") {
      const u = clock.elapsedTime % 6;
      const out = reducedMotion ? 1 : smooth(1.6, 2.4, u) * (1 - smooth(4.2, 5.0, u));
      g.position.set(home.x + out * peek, 0, home.z);
      g.rotation.set(0, 0, -out * 0.12);
      if (head.current) head.current.rotation.y = out * 0.35;
      if (mode === "play" && dist < 4.5) run();
      return;
    }
    if (k.state === "hidden") {
      if (k.t > 6 && (mode !== "play" || dist > 6)) {
        k.from = { x: hide.x, z: hide.z };
        k.state = "back";
        k.t = 0;
      }
      return;
    }
    const target = k.state === "run" ? hide : home;
    const e = Math.min(1, k.t / (k.state === "run" ? 0.9 : 1.4));
    g.position.set(
      k.from.x + (target.x - k.from.x) * e,
      reducedMotion ? 0 : Math.abs(Math.sin(k.t * 14)) * 0.08,
      k.from.z + (target.z - k.from.z) * e,
    );
    g.rotation.set(0, Math.atan2(target.x - k.from.x, target.z - k.from.z), 0);
    legs.current.forEach((l, i) => {
      if (l) l.rotation.x = reducedMotion ? 0 : Math.sin(k.t * 14 + i * Math.PI) * 0.6;
    });
    if (e >= 1) {
      legs.current.forEach((l) => {
        if (l) l.rotation.x = 0;
      });
      g.rotation.set(0, 0, 0);
      k.state = k.state === "run" ? "hidden" : "peek";
      k.t = 0;
    }
  });

  const skin = "#c99a72";
  return (
    <>
      <group position={islandFrame(placement)}>
        <group ref={root} position={[home.x, 0, home.z]}>
          {[-0.1, 0.1].map((x, i) => (
            <group key={x} ref={(l) => { legs.current[i] = l; }} position={[x, 0.34, 0]}>
              <mesh position={[0, -0.17, 0]} castShadow>
                <boxGeometry args={[0.18, 0.34, 0.2]} />
                <meshStandardMaterial color={skin} roughness={0.9} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.46, 0.2, 0.28]} />
            <meshStandardMaterial color="#b5473a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.71, 0]} castShadow>
            <boxGeometry args={[0.46, 0.38, 0.26]} />
            <meshStandardMaterial color="#efebe2" roughness={0.9} />
          </mesh>
          <group ref={head} position={[0, 1.08, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.36, 0.36, 0.36]} />
              <meshStandardMaterial color={skin} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.19, -0.01]} castShadow>
              <boxGeometry args={[0.4, 0.13, 0.4]} />
              <meshStandardMaterial color="#1e1b19" roughness={0.9} />
            </mesh>
            {[-0.08, 0.08].map((x) => (
              <mesh key={x} position={[x, 0.02, 0.185]}>
                <boxGeometry args={[0.05, 0.05, 0.02]} />
                <meshStandardMaterial color="#1e1b19" />
              </mesh>
            ))}
          </group>
        </group>
      </group>
      <Interactable id="petak-kid" island={placement.id} label="Find the kid" position={[spot.x, spot.y, spot.z]} size={[0.9, 1.4, 0.9]} radius={2.5} onActivate={run} />
    </>
  );
}

function PetakUmpetIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(() => [...houseBlocks(), ...PETAK.trees.flatMap((t) => treeBlocks(t.x, t.z, t.h, t.seed))], []);
  const project = projectById("petak-umpet");
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={303} />
        <Lanterns />
        <PetakSign />
      </group>
      <HidingKid placement={placement} />
      <InfoBoard placement={placement} at={PETAK.info} rotationY={PETAK.info.ry} title="Roblox" lines={project.stats ?? []} />
      <Signpost id="petak-link" placement={placement} at={PETAK.link} rotationY={PETAK.link.ry} label="Play on Roblox" url={project.links.roblox} />
    </>
  );
}

export const petakUmpetIsland: StarIslandModule = {
  id: "petak-umpet",
  Component: PetakUmpetIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS["petak-umpet"]),
  tourStop: tourStopFor,
};
```

- [ ] **Step 2: Register it**

Replace `src/world/scene/islands/index.ts` with:

```ts
import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";
import { heroIsland } from "./Hero";
import { gtidIsland } from "./Gtid";
import { petakUmpetIsland } from "./PetakUmpet";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {
  hero: heroIsland,
  gtid: gtidIsland,
  "petak-umpet": petakUmpetIsland,
};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
```

- [ ] **Step 3: Build and look at the Petak Umpet stop**

Run: `npx vitest run src/world/scene/islands && npm run build && npm run shots -- 2`
Read `.shots/stop-2-desktop.png` and `.shots/stop-2-phone.png`. Check: stilt house with stepped terracotta roof and a front step; the PETAK UMPET sign with the little house reads clearly; lanterns glow warm; the kid is behind the right tree (peeking or about to); info board shows "Roblox", 3.1M+ visits, 2.6K peak players; "Play on Roblox" sign legible. Adjust `FRAMING["petak-umpet"]` if needed (max 3 rounds; re-run the framing test).

- [ ] **Step 4: Commit**

```bash
git add src/world/scene/islands/PetakUmpet.tsx src/world/scene/islands/index.ts src/world/scene/islands/framing.ts
git commit -m "feat: Petak Umpet island with stilt house, lanterns and a hiding kid" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 8: Orbit Store island

**Files:**
- Create: `src/world/scene/islands/orbit/logoMath.ts`, `src/world/scene/islands/orbit/logo.ts`, `src/world/scene/islands/orbit/receipt.ts`, `src/world/scene/islands/OrbitStore.tsx`
- Test: `src/world/scene/islands/orbit/logoMath.test.ts`, `src/world/scene/islands/orbit/receipt.test.ts`
- Modify: `src/world/scene/islands/index.ts`

**Interfaces:**
- Consumes: `ORBIT`, `FOOTPRINTS`, `tourStopFor` (C2), C1 toolkit (`todayAt`, `CANVAS_FONTS`, `useCanvasTexture`, `disposeObject`, `PropBlocks`, `PALETTE`, `InfoBoard`, `Signpost`, `islandFrame`, `stampCells`, `worldTuple`, `projectById`), `useWorld`, `Interactable` (Part B), `playSfx`, `mulberry32` (Part A).
- Produces: `ORBIT_LOGO`, `toTile`, `ringPoint`, `pointInPolygon`; `createOrbitLogoTile()`; `RECEIPT_ITEMS`, `FIRST_ORDER_NO`, `nextOrder`, `receiptLines`, `drawReceipt`; `orbitStoreIsland: StarIslandModule` (id `"orbit-store"`).

The logo is traced from `showreel/brief/logo.jpg` (2000 px source): slanted rounded-square O with a sharp skewed hole, a thin white planet ring that passes **behind** the O at the top (visible through the hole) and **in front** at the bottom, on the radial `#3D62F8 → #2C0B77` tile. Logo tile only, no wordmark. Mark and ring are always white.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/islands/orbit/logoMath.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ORBIT_LOGO, pointInPolygon, ringPoint, toTile } from "./logoMath";

describe("Orbit logo geometry", () => {
  it("passes the ring in front of the O at the bottom and behind it at the top", () => {
    for (let k = 1; k < 12; k++) {
      const p = ringPoint((k / 12) * Math.PI);
      expect(p.y).toBeLessThan(0);
      expect(p.z).toBeGreaterThan(0);
    }
    for (let k = 13; k < 24; k++) {
      const p = ringPoint((k / 12) * Math.PI);
      expect(p.y).toBeGreaterThan(0);
      expect(p.z).toBeLessThan(0);
    }
  });

  it("keeps the back of the ring between the O and the tile face", () => {
    const deepest = -ORBIT_LOGO.rd - ORBIT_LOGO.tube;
    expect(deepest).toBeGreaterThan(-ORBIT_LOGO.standoff);
    expect(-ORBIT_LOGO.rd * Math.sin(Math.acos(0.75))).toBeLessThan(-0.1); // crossing the O's bars: behind its back face
  });

  it("puts the hole inside the outline and the mark inside the 2.2 tile", () => {
    const outer = ORBIT_LOGO.outer.map(([x, y]) => toTile(x, y));
    const hole = ORBIT_LOGO.hole.map(([x, y]) => toTile(x, y));
    const centroid = { x: hole.reduce((s, p) => s + p.x, 0) / 4, y: hole.reduce((s, p) => s + p.y, 0) / 4 };
    expect(pointInPolygon(centroid, outer)).toBe(true);
    for (const p of hole) expect(pointInPolygon(p, outer)).toBe(true);
    for (const p of outer) {
      expect(Math.abs(p.x)).toBeLessThan(ORBIT_LOGO.size / 2);
      expect(Math.abs(p.y)).toBeLessThan(ORBIT_LOGO.size / 2);
    }
  });
});
```

`src/world/scene/islands/orbit/receipt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FIRST_ORDER_NO, RECEIPT_ITEMS, nextOrder, receiptLines } from "./receipt";

const at = new Date(2026, 9, 13, 19, 42);

describe("Orbit receipt", () => {
  it("starts at #2201 and cycles the fictional items", () => {
    const o = nextOrder(null, at);
    expect(o.no).toBe(FIRST_ORDER_NO);
    expect(o.no).toBe(2201);
    expect(o.item).toBe(RECEIPT_ITEMS[0]);
    expect(nextOrder(2201, at).no).toBe(2202);
    expect(nextOrder(2204, at).item).toBe(RECEIPT_ITEMS[0]);
  });

  it("follows Orbit's real flow: order, QRIS paid, delivered by DM", () => {
    const texts = receiptLines(nextOrder(null, at)).map((l) => l.text);
    expect(texts).toEqual(
      expect.arrayContaining(["ORBIT STORE", "Order #2201", "Today at 19:42", "QRIS · paid", "delivered via DM"]),
    );
  });

  it("never shows money", () => {
    for (let n = 2200; n < 2210; n++) {
      for (const l of receiptLines(nextOrder(n, at))) expect(l.text).not.toMatch(/\brp\b|idr|rupiah|\d[.,]\d{3}/i);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/islands/orbit`
Expected: FAIL — cannot resolve `./logoMath`, `./receipt`.

- [ ] **Step 3: Implement `src/world/scene/islands/orbit/logoMath.ts`**

```ts
/** Orbit Store mark traced from showreel/brief/logo.jpg (coordinates in its 2000 px space). */
export const ORBIT_LOGO = {
  size: 2.2, // tile face size in world units (the whole 2000 px image)
  src: 2000,
  outer: [[415, 581], [1533, 468], [1515, 1317], [395, 1470]],
  radii: [160, 135, 140, 150], // corner radii, px
  hole: [[663, 745], [1318, 648], [1283, 1180], [648, 1257]],
  ringCenter: [969, 896],
  ringTilt: -0.0995, // rad, right side lower
  ra: 664, // ring semi-axes, px
  rb: 104,
  rd: 0.24, // ring depth (world units): front arc in front of the O, back arc behind it
  tube: 0.022,
  rim: 0.05, // blue cut line where the ring crosses the O
  standoff: 0.3, // mark distance in front of the tile face
} as const;

const S = ORBIT_LOGO.size / ORBIT_LOGO.src;

export function toTile(x: number, y: number): { x: number; y: number } {
  return { x: (x - 1000) * S, y: -(y - 1000) * S };
}

/** Point on the ring curve (relative to the ring centre, before the in-plane tilt). */
export function ringPoint(theta: number): { x: number; y: number; z: number } {
  return {
    x: ORBIT_LOGO.ra * S * Math.cos(theta),
    y: -ORBIT_LOGO.rb * S * Math.sin(theta),
    z: ORBIT_LOGO.rd * Math.sin(theta),
  };
}

export function pointInPolygon(p: { x: number; y: number }, poly: readonly { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
```

- [ ] **Step 4: Implement `src/world/scene/islands/orbit/receipt.ts`**

```ts
import { CANVAS_FONTS } from "../shared/canvasFonts";
import { todayAt } from "../shared/time";

/** Fictional products (never the live inventory). */
export const RECEIPT_ITEMS = ["Starter script pack (.txt)", "Proxy pass · 7 days", "VIP role · 30 days", "Dirt farm guide (.txt)"] as const;
export const FIRST_ORDER_NO = 2201;

export interface ReceiptOrder { no: number; item: string; at: Date }
export type ReceiptStyle = "brand" | "meta" | "rule" | "item" | "status" | "thanks";
export interface ReceiptLine { text: string; style: ReceiptStyle }

export function nextOrder(prevNo: number | null, at: Date): ReceiptOrder {
  const no = prevNo === null ? FIRST_ORDER_NO : prevNo + 1;
  const i = (((no - FIRST_ORDER_NO) % RECEIPT_ITEMS.length) + RECEIPT_ITEMS.length) % RECEIPT_ITEMS.length;
  return { no, item: RECEIPT_ITEMS[i], at };
}

/** Orbit's flow on paper: the order, paid with QRIS, delivered automatically by DM. No amounts. */
export function receiptLines(o: ReceiptOrder): ReceiptLine[] {
  return [
    { text: "ORBIT STORE", style: "brand" },
    { text: `Order #${o.no}`, style: "meta" },
    { text: todayAt(o.at), style: "meta" },
    { text: "", style: "rule" },
    { text: `1× ${o.item}`, style: "item" },
    { text: "", style: "rule" },
    { text: "QRIS · paid", style: "status" },
    { text: "delivered via DM", style: "status" },
    { text: "", style: "rule" },
    { text: "thank you for shopping", style: "thanks" },
  ];
}

export function drawReceipt(ctx: CanvasRenderingContext2D, lines: readonly ReceiptLine[], w: number, h: number): void {
  ctx.fillStyle = "#f7f4ec";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#3D62F8";
  ctx.fillRect(0, 0, w, 10);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let y = 78;
  for (const l of lines) {
    switch (l.style) {
      case "brand":
        ctx.fillStyle = "#16181d";
        ctx.font = `700 38px ${CANVAS_FONTS.ui}`;
        ctx.fillText(l.text, w / 2, y);
        y += 50;
        break;
      case "meta":
        ctx.fillStyle = "#4a4f57";
        ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
        ctx.fillText(l.text, w / 2, y);
        y += 34;
        break;
      case "rule":
        ctx.strokeStyle = "#b9b4a8";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(24, y - 12);
        ctx.lineTo(w - 24, y - 12);
        ctx.stroke();
        ctx.setLineDash([]);
        y += 26;
        break;
      case "item":
        ctx.fillStyle = "#16181d";
        ctx.font = `500 20px ${CANVAS_FONTS.mono}`;
        ctx.fillText(l.text, w / 2, y);
        y += 36;
        break;
      case "status":
        ctx.fillStyle = "#16181d";
        ctx.font = `700 26px ${CANVAS_FONTS.ui}`;
        ctx.fillText(l.text, w / 2, y);
        y += 38;
        break;
      case "thanks":
        ctx.fillStyle = "#6b6f76";
        ctx.font = `500 18px ${CANVAS_FONTS.mono}`;
        ctx.fillText(l.text, w / 2, y);
        y += 30;
        break;
    }
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#16181d"; // barcode
  for (let x = 40, k = 0; x < w - 40; k++) {
    const bw = (k * 7) % 5 < 2 ? 4 : 2;
    ctx.fillRect(x, h - 130, bw, 70);
    x += bw + 3;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/islands/orbit`
Expected: PASS (6 tests).

- [ ] **Step 6: Implement `src/world/scene/islands/orbit/logo.ts`**

```ts
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ORBIT_LOGO, ringPoint, toTile } from "./logoMath";

function gradientTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext("2d");
  if (g) {
    const gr = g.createRadialGradient(512, 492, 8, 512, 512, 737);
    gr.addColorStop(0, "#3D62F8");
    gr.addColorStop(0.55, "#3138b8");
    gr.addColorStop(1, "#2C0B77");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundedQuad(pts: { x: number; y: number }[], radii: number[]): THREE.Shape {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector2(pts[i].x, pts[i].y);
    const prev = new THREE.Vector2(pts[(i + n - 1) % n].x, pts[(i + n - 1) % n].y);
    const next = new THREE.Vector2(pts[(i + 1) % n].x, pts[(i + 1) % n].y);
    const p1 = p.clone().add(prev.sub(p).normalize().multiplyScalar(radii[i]));
    const p2 = p.clone().add(next.sub(p).normalize().multiplyScalar(radii[i]));
    if (i === 0) s.moveTo(p1.x, p1.y);
    else s.lineTo(p1.x, p1.y);
    s.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  s.closePath();
  return s;
}

/** 2.4 × 2.4 Orbit logo tile facing +z, centred on the origin. Dispose with disposeObject(). */
export function createOrbitLogoTile(): THREE.Group {
  const S = ORBIT_LOGO.size / ORBIT_LOGO.src;
  const group = new THREE.Group();

  const frame = new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.4, 0.22, 3, 0.3), new THREE.MeshStandardMaterial({ color: "#2a2f9e", roughness: 0.6 }));
  frame.castShadow = true;
  group.add(frame);

  const tex = gradientTexture();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(ORBIT_LOGO.size, ORBIT_LOGO.size),
    new THREE.MeshStandardMaterial({ map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.32, roughness: 0.55 }),
  );
  face.position.z = 0.112;
  group.add(face);

  const outline = roundedQuad(ORBIT_LOGO.outer.map(([x, y]) => toTile(x, y)), ORBIT_LOGO.radii.map((r) => r * S));
  const hole = new THREE.Path(ORBIT_LOGO.hole.map(([x, y]) => {
    const p = toTile(x, y);
    return new THREE.Vector2(p.x, p.y);
  }));
  hole.closePath();
  outline.holes.push(hole);
  const oGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 12 });
  oGeo.translate(0, 0, -0.08);

  const white = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.3, roughness: 0.35 });
  const mark = new THREE.Group();
  mark.position.z = 0.11 + ORBIT_LOGO.standoff;
  const o = new THREE.Mesh(oGeo, white);
  o.castShadow = true;
  mark.add(o);

  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 96; i++) {
    const p = ringPoint((i / 96) * Math.PI * 2);
    points.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  const curve = new THREE.CatmullRomCurve3(points, true);
  const ring = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, ORBIT_LOGO.tube, 8, true), white);
  // The logo's blue cut lines where the ring crosses the O: a wider tube drawn after the O, without depth writes.
  const rim = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, ORBIT_LOGO.rim, 8, true), new THREE.MeshBasicMaterial({ color: "#3346d6", depthWrite: false }));
  rim.renderOrder = 1;
  ring.renderOrder = 2;
  const centre = toTile(ORBIT_LOGO.ringCenter[0], ORBIT_LOGO.ringCenter[1]);
  const ringGroup = new THREE.Group();
  ringGroup.position.set(centre.x, centre.y, 0);
  ringGroup.rotation.z = ORBIT_LOGO.ringTilt;
  ringGroup.add(rim, ring);
  mark.add(ringGroup);
  group.add(mark);
  return group;
}
```

- [ ] **Step 7: Implement `src/world/scene/islands/OrbitStore.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { mulberry32 } from "@/world/engine/gen/rng";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { FOOTPRINTS, ORBIT } from "./layouts";
import { tourStopFor } from "./framing";
import { CANVAS_FONTS } from "./shared/canvasFonts";
import { disposeObject } from "./shared/dispose";
import { InfoBoard } from "./shared/InfoBoard";
import { Signpost } from "./shared/Signpost";
import { PropBlocks } from "./shared/PropBlocks";
import { PALETTE, type PropBlock } from "./shared/props";
import { islandFrame, stampCells, worldTuple } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";
import { useHoverLift } from "./shared/useHoverLift";
import { createOrbitLogoTile } from "./orbit/logo";
import { drawReceipt, nextOrder, receiptLines, type ReceiptOrder } from "./orbit/receipt";

function stallBlocks(): PropBlock[] {
  const out: PropBlock[] = [];
  for (const [x, z] of [[-1.45, -0.9], [1.45, -0.9], [-1.45, 0.9], [1.45, 0.9]] as const) {
    out.push({ x, y: 1.4, z, c: PALETTE.wood, sx: 0.2, sy: 2.8, sz: 0.2 });
  }
  out.push({ x: 0, y: 0.5, z: 0.45, c: PALETTE.plank[0], sx: 2.9, sy: 1.0, sz: 0.9 }); // counter
  out.push({ x: 0, y: 1.06, z: 0.45, c: PALETTE.wood, sx: 3.2, sy: 0.13, sz: 1.1 }); // counter top
  for (let i = 0; i < 6; i++) {
    out.push({ x: -1.375 + i * 0.55, y: 2.92, z: 0, c: i % 2 ? PALETTE.white : PALETTE.blue, sx: 0.55, sy: 0.12, sz: 2.5, rx: 0.32 }); // awning
  }
  for (const x of [-1.45, 1.45]) out.push({ x, y: 3.12, z: -0.9, c: PALETTE.wood, sx: 0.18, sy: 0.95, sz: 0.18 });
  out.push({ x: 0, y: 3.6, z: -0.9, c: PALETTE.wood, sx: 3.1, sy: 0.18, sz: 0.2 }); // sign beam
  for (const x of [-0.75, 0.75]) out.push({ x, y: 3.9, z: -0.9, c: PALETTE.wood, sx: 0.16, sy: 0.5, sz: 0.16 });
  for (const c of ORBIT.crates) out.push({ x: c.x, y: c.stack + c.s / 2, z: c.z, c: PALETTE.crate[0], sx: c.s, sy: c.s, sz: c.s, ry: c.ry });
  out.push({ x: -0.35, y: 1.83, z: 0.57, c: "#efeee9", sx: 1.3, sy: 1.5, sz: 0.08 }); // QRIS board backing
  out.push({ x: 0.95, y: 1.32, z: 0.55, c: "#2b2f36", sx: 0.7, sy: 0.4, sz: 0.55 }); // thermal printer
  out.push({ x: 0.95, y: 1.18, z: 0.83, c: PALETTE.blue, sx: 0.72, sy: 0.06, sz: 0.02 }); // printer stripe
  return out;
}

function drawQris(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#3D62F8";
  g.fillRect(0, 0, w, 92);
  g.fillStyle = "#ffffff";
  g.font = `700 36px ${CANVAS_FONTS.ui}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("ORBIT STORE", w / 2, 48);
  const n = 25, ms = 13, ox = (w - n * ms) / 2, oy = 122, r = mulberry32(77);
  g.fillStyle = "#16181d";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!finder && r() > 0.52) g.fillRect(ox + x * ms, oy + y * ms, ms, ms);
    }
  }
  const finder = (cx: number, cy: number) => {
    g.fillStyle = "#16181d";
    g.fillRect(ox + cx * ms, oy + cy * ms, 7 * ms, 7 * ms);
    g.fillStyle = "#ffffff";
    g.fillRect(ox + (cx + 1) * ms, oy + (cy + 1) * ms, 5 * ms, 5 * ms);
    g.fillStyle = "#16181d";
    g.fillRect(ox + (cx + 2) * ms, oy + (cy + 2) * ms, 3 * ms, 3 * ms);
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  g.fillStyle = "#16181d";
  g.font = `700 64px ${CANVAS_FONTS.ui}`;
  g.fillText("QRIS", w / 2, 528);
  g.textAlign = "left";
}

const PARCEL_GEO = new THREE.BoxGeometry(0.5, 0.42, 0.5);
const TAPE_GEO = new THREE.BoxGeometry(0.52, 0.44, 0.1);

function OrbitStoreIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(stallBlocks, []);
  const project = projectById("orbit-store");
  const logo = useMemo(() => createOrbitLogoTile(), []);
  useEffect(() => () => disposeObject(logo), [logo]);

  const qris = useCanvasTexture(512, 600, drawQris, []);
  const [order, setOrder] = useState<ReceiptOrder>(() => nextOrder(null, new Date()));
  const receipt = useCanvasTexture(360, 1008, (ctx, w, h) => drawReceipt(ctx, receiptLines(order), w, h), [order]);
  const paper = useRef<THREE.Mesh>(null);
  const feed = useRef({ len: 0.35 }); // partly fed while idle
  const parcel = useRef<THREE.Group>(null);
  const hop = useRef(-1); // parcel flight time; < 0 = hidden
  const lift = useHoverLift("orbit-stall");
  const { x: rx, y: ry, z: rz, w: rw, maxLen } = ORBIT.receipt;

  const print = useCallback(() => {
    playSfx("print");
    setOrder((o) => nextOrder(o.no, new Date()));
    const reduced = useWorld.getState().reducedMotion;
    feed.current.len = reduced ? maxLen : 0;
    if (!reduced) hop.current = 0;
  }, [maxLen]);

  // Print once whenever the tour or the player arrives at the island.
  useEffect(
    () =>
      useWorld.subscribe((s, prev) => {
        if (s.activeIsland === "orbit-store" && prev.activeIsland !== "orbit-store") print();
      }),
    [print],
  );

  useFrame(({ clock }, dt) => {
    const f = feed.current;
    if (f.len < maxLen) {
      const stepping = Math.floor(clock.elapsedTime * 10) % 2 === 0 ? 1 : 0.25; // thermal printers feed in steps
      f.len = Math.min(maxLen, f.len + dt * 0.75 * stepping);
    }
    const m = paper.current;
    if (m) {
      m.scale.y = Math.max(0.001, f.len);
      receipt.repeat.set(1, f.len / maxLen);
      receipt.offset.set(0, 1 - f.len / maxLen);
    }
    const p = parcel.current;
    if (p) {
      if (hop.current < 0) {
        p.visible = false;
      } else {
        hop.current += dt;
        const t = hop.current;
        p.visible = t < 3;
        p.position.set(0.95 + t * 1.2, 1.4 + 7 * t - 4 * t * t, 0.6 + t * 3.4);
        p.rotation.set(t * 1.2, t * 2, 0);
        if (t >= 3) hop.current = -1;
      }
    }
  });

  const paperGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(rw, 1);
    g.translate(0, -0.5, 0); // top edge at the origin, grows downward
    return g;
  }, [rw]);
  useEffect(() => () => paperGeo.dispose(), [paperGeo]);

  return (
    <>
      <group position={islandFrame(placement)}>
        <group ref={lift}>
          <PropBlocks blocks={blocks} seed={404} />
          <mesh position={[-0.35, 1.86, 0.62]} rotation={[-0.08, 0, 0]} castShadow>
            <planeGeometry args={[1.2, 1.41]} />
            <meshStandardMaterial map={qris} roughness={0.7} />
          </mesh>
          <mesh ref={paper} geometry={paperGeo} position={[rx, ry, rz]}>
            <meshStandardMaterial map={receipt} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <primitive object={logo} position={[0, ORBIT.logo.y, ORBIT.logo.z]} />
        <group ref={parcel} visible={false}>
          <mesh geometry={PARCEL_GEO} castShadow>
            <meshStandardMaterial color="#c69f6e" roughness={0.95} />
          </mesh>
          <mesh geometry={TAPE_GEO}>
            <meshStandardMaterial color={PALETTE.blue} roughness={0.8} />
          </mesh>
        </group>
      </group>
      <Interactable
        id="orbit-stall"
        island={placement.id}
        label="Print a receipt"
        position={worldTuple(placement, 0, 1.3, 0.2)}
        size={[3.2, 2.6, 2.0]}
        radius={3}
        onActivate={print}
      />
      <InfoBoard placement={placement} at={ORBIT.info} rotationY={ORBIT.info.ry} title="Orbit Store" lines={project.stats ?? []} />
      <Signpost id="orbit-link" placement={placement} at={ORBIT.link} rotationY={ORBIT.link.ry} label="Join on Discord" url={project.links.discord} />
    </>
  );
}

export const orbitStoreIsland: StarIslandModule = {
  id: "orbit-store",
  Component: OrbitStoreIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS["orbit-store"]),
  tourStop: tourStopFor,
};
```

- [ ] **Step 8: Register it**

Replace `src/world/scene/islands/index.ts` with:

```ts
import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";
import { heroIsland } from "./Hero";
import { gtidIsland } from "./Gtid";
import { petakUmpetIsland } from "./PetakUmpet";
import { orbitStoreIsland } from "./OrbitStore";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {
  hero: heroIsland,
  gtid: gtidIsland,
  "petak-umpet": petakUmpetIsland,
  "orbit-store": orbitStoreIsland,
};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
```

- [ ] **Step 9: Build and look at the Orbit stop, with a close-up of the logo**

Run: `npx vitest run src/world/scene/islands && npm run build && npm run shots -- 3`
Read `.shots/stop-3-desktop.png` and `.shots/stop-3-phone.png`. Then crop and enlarge the logo to compare it with `C:\Users\ezrak\OneDrive\Documents\Code\react\portfolio\showreel\brief\logo.jpg`:

```bash
python -c "from PIL import Image; im=Image.open('.shots/stop-3-desktop.png'); w,h=im.size; c=im.crop((int(w*0.45),0,int(w*0.85),int(h*0.5))); c.resize((c.width*2,c.height*2)).save('.shots/stop-3-logo-zoom.png')"
```
Read `.shots/stop-3-logo-zoom.png` and `showreel/brief/logo.jpg`. Check:
- the O is slanted like the original (top edge rising to the right) with a sharp skewed hole;
- the ring is thin and white, visible through the hole at the top and passing in front of the O at the bottom; no blue on the mark or ring except the thin cut lines where the ring crosses the O;
- the tile is the blue radial gradient, logo only (no text);
- the receipt hangs from the counter and reads ORBIT STORE / Order #… / QRIS · paid / delivered via DM; no amounts anywhere;
- info board "Orbit Store", 2,200+ orders, 890+ buyers; the "Join on Discord" sign is greyed (link still empty).
Adjust `FRAMING["orbit-store"]` if the tile or stall is cut off (max 3 rounds; re-run the framing test).

- [ ] **Step 10: Commit**

```bash
git add src/world/scene/islands/orbit src/world/scene/islands/OrbitStore.tsx src/world/scene/islands/index.ts src/world/scene/islands/framing.ts
git commit -m "feat: Orbit Store island with traced logo tile, QRIS stall and receipt printer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 9: Ezra Bot island

**Files:**
- Create: `src/world/scene/islands/ezrabot/chat.ts`, `src/world/scene/islands/EzraBot.tsx`
- Test: `src/world/scene/islands/ezrabot/chat.test.ts`
- Modify: `src/world/scene/islands/index.ts`

**Interfaces:**
- Consumes: `EZRA`, `FOOTPRINTS`, `tourStopFor` (C2), C1 toolkit (`todayAt`, `CANVAS_FONTS`, `useCanvasTexture`, `InfoBoard`, `Signpost`, `useHoverLift`, `islandFrame`, `stampCells`, `worldTuple`, `projectById`), `useWorld`, `Interactable` (Part B), `playSfx` (Part A).
- Produces: `ChatMessage`, `CHAT_SCRIPT`, `visibleWindow`, `messageTime`, `drawBubble`, `drawBotScreen`; `ezraBotIsland: StarIslandModule` (id `"ezra-bot"`).

- [ ] **Step 1: Write the failing test**

`src/world/scene/islands/ezrabot/chat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CHAT_SCRIPT, messageTime, visibleWindow } from "./chat";

describe("Ezra Bot chat script", () => {
  it("alternates a member's question (skeleton) with a readable bot answer", () => {
    CHAT_SCRIPT.forEach((m, i) => expect(m.kind).toBe(i % 2 === 0 ? "user" : "bot"));
    for (const m of CHAT_SCRIPT) {
      if (m.kind === "bot") {
        expect(m.text.length).toBeGreaterThan(0);
        expect(m.text.length).toBeLessThanOrEqual(60); // fits one bubble line
        expect(m.text).not.toMatch(/solo|end-to-end|self-hosted|docker/i);
      } else {
        expect(m.bars.length).toBeGreaterThan(0);
      }
    }
  });

  it("shows the last three messages, wrapping around the script", () => {
    expect(visibleWindow(1)).toEqual([5, 0, 1]);
    expect(visibleWindow(4)).toEqual([2, 3, 4]);
    expect(visibleWindow(7)).toEqual([5, 0, 1]);
  });

  it("stamps messages with real 'Today at' times, two minutes apart", () => {
    const now = new Date(2026, 9, 13, 19, 42);
    expect(messageTime(now, 0)).toBe("Today at 19:42");
    expect(messageTime(now, 1)).toBe("Today at 19:40");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/scene/islands/ezrabot/chat.test.ts`
Expected: FAIL — cannot resolve `./chat`.

- [ ] **Step 3: Implement `src/world/scene/islands/ezrabot/chat.ts`**

```ts
import { CANVAS_FONTS } from "../shared/canvasFonts";
import { todayAt } from "../shared/time";

/** Members' messages are host chrome (grey skeleton bars); only the bot's replies are readable. */
export type ChatMessage = { kind: "user"; bars: readonly number[] } | { kind: "bot"; text: string };

export const CHAT_SCRIPT: readonly ChatMessage[] = [
  { kind: "user", bars: [0.62, 0.38] },
  { kind: "bot", text: "Found it in #guides, pinned on Friday." },
  { kind: "user", bars: [0.7, 0.45] },
  { kind: "bot", text: "Event starts Saturday 19:00. Rules are in #announcements." },
  { kind: "user", bars: [0.5] },
  { kind: "bot", text: "Mods online right now are listed on gtid.pro." },
];

/** Indices of the `size` messages ending at `latest`, oldest first, wrapping around the script. */
export function visibleWindow(latest: number, size = 3, length = CHAT_SCRIPT.length): number[] {
  const out: number[] = [];
  for (let k = size - 1; k >= 0; k--) out.push((((latest - k) % length) + length) % length);
  return out;
}

export function messageTime(now: Date, stepsAgo: number, stepMinutes = 2): string {
  return todayAt(new Date(now.getTime() - stepsAgo * stepMinutes * 60_000));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  roundRect(g, x, y, w, h, h / 2);
  g.fillStyle = c;
  g.fill();
}

/** One chat bubble (828 × 207 canvas for a 3.6 × 0.9 panel). */
export function drawBubble(g: CanvasRenderingContext2D, msg: ChatMessage, time: string, w: number, h: number): void {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  if (msg.kind === "user") {
    g.beginPath();
    g.arc(56, 76, 34, 0, Math.PI * 2);
    g.fillStyle = "#d3d7db";
    g.fill();
    bar(g, 112, 52, 150, 22, "#c3c8cd");
    msg.bars.forEach((f, i) => bar(g, 112, 98 + i * 40, (w - 150) * f, 22, "#dde0e3"));
    return;
  }
  roundRect(g, 22, 40, 70, 70, 16);
  g.fillStyle = "#3e5d3a";
  g.fill();
  g.fillStyle = "#dcf3e4";
  g.fillRect(38, 66, 12, 14);
  g.fillRect(64, 66, 12, 14);
  g.fillStyle = "#13212b";
  g.font = `700 34px ${CANVAS_FONTS.ui}`;
  g.fillText("Ezra Bot", 112, 78);
  const nameW = g.measureText("Ezra Bot").width;
  roundRect(g, 112 + nameW + 12, 52, 54, 28, 6);
  g.fillStyle = "#5865f2";
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = `500 17px ${CANVAS_FONTS.mono}`;
  g.fillText("BOT", 112 + nameW + 22, 72);
  g.fillStyle = "#8a9096";
  g.font = `500 20px ${CANVAS_FONTS.mono}`;
  g.fillText(time, 112 + nameW + 80, 74);
  g.fillStyle = "#2f3940";
  g.font = `500 32px ${CANVAS_FONTS.ui}`;
  g.fillText(msg.text, 112, 136);
}

/** The island's title board: the bot's name, its BOT tag and an online dot (640 × 246 canvas). */
export function drawBotScreen(g: CanvasRenderingContext2D, w: number, h: number): void {
  g.fillStyle = "#1e2328";
  g.fillRect(0, 0, w, h);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#f2f3f5";
  g.font = `700 72px ${CANVAS_FONTS.ui}`;
  g.fillText("Ezra Bot", 40, 120);
  const nameW = g.measureText("Ezra Bot").width;
  roundRect(g, 40 + nameW + 18, 70, 84, 40, 8);
  g.fillStyle = "#5865f2";
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = `500 26px ${CANVAS_FONTS.mono}`;
  g.fillText("BOT", 40 + nameW + 34, 99);
  g.beginPath();
  g.arc(52, 182, 12, 0, Math.PI * 2);
  g.fillStyle = "#4fbf6c";
  g.fill();
  g.fillStyle = "#b5bac1";
  g.font = `500 30px ${CANVAS_FONTS.mono}`;
  g.fillText("online", 76, 192);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/scene/islands/ezrabot/chat.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `src/world/scene/islands/EzraBot.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { EZRA, FOOTPRINTS } from "./layouts";
import { tourStopFor } from "./framing";
import { InfoBoard } from "./shared/InfoBoard";
import { Signpost } from "./shared/Signpost";
import { PALETTE } from "./shared/props";
import { islandFrame, stampCells, worldTuple } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";
import { useHoverLift } from "./shared/useHoverLift";
import { CHAT_SCRIPT, drawBotScreen, drawBubble, messageTime, visibleWindow, type ChatMessage } from "./ezrabot/chat";

const PANEL_GEO = new RoundedBoxGeometry(EZRA.bubbles.w, EZRA.bubbles.h, 0.16, 2, 0.07);
const PANEL_MAT = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, emissive: "#ffffff", emissiveIntensity: 0.42 });

function Robot({ id }: { id: string }) {
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const lift = useHoverLift(id);
  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    const t = clock.elapsedTime;
    if (head.current) head.current.rotation.z = Math.sin(t * 0.9) * 0.06;
    const blink = t % 4 < 0.12 ? 0.15 : 1;
    eyes.current.forEach((e) => {
      if (e) e.scale.y = blink;
    });
  });
  const body = "#cfd3cf", light = "#e3e6e2", slate = "#2a333c";
  const box = (args: [number, number, number], pos: [number, number, number], color: string, extra: Partial<{ emissive: string; ei: number }> = {}) => (
    <mesh position={pos} castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.7} emissive={extra.emissive ?? "#000000"} emissiveIntensity={extra.ei ?? 1} />
    </mesh>
  );
  return (
    <group position={[EZRA.robot.x, 0, EZRA.robot.z]}>
      <group ref={lift}>
        {box([0.45, 0.62, 0.5], [-0.35, 0.31, 0], body)}
        {box([0.45, 0.62, 0.5], [0.35, 0.31, 0], body)}
        {box([1.5, 1.2, 1.0], [0, 1.22, 0], body)}
        {box([0.62, 0.34, 0.06], [0, 1.34, 0.51], slate)}
        {box([0.12, 0.12, 0.04], [0.18, 1.34, 0.55], "#8fbf6a", { emissive: "#6fae4a", ei: 0.7 })}
        {box([0.34, 1.0, 0.42], [-0.95, 1.14, 0], light)}
        {box([0.34, 1.0, 0.42], [0.95, 1.14, 0], light)}
        <group ref={head} position={[0, 2.36, 0]}>
          {box([1.32, 1.0, 1.0], [0, 0.48, 0], light)}
          {box([1.1, 0.58, 0.06], [0, 0.48, 0.51], slate)}
          {[-0.27, 0.27].map((x, i) => (
            <mesh key={x} ref={(m) => { eyes.current[i] = m; }} position={[x, 0.5, 0.55]}>
              <boxGeometry args={[0.2, 0.22, 0.05]} />
              <meshStandardMaterial color="#dcf3e4" emissive="#cfeedd" emissiveIntensity={1.1} roughness={0.4} />
            </mesh>
          ))}
          {box([0.08, 0.46, 0.08], [0, 1.2, 0], slate)}
          {box([0.2, 0.2, 0.2], [0, 1.48, 0], "#e2a24a", { emissive: "#d08a30", ei: 0.5 })}
        </group>
      </group>
    </group>
  );
}

function Bubble({ slot, msg, time, popKey }: { slot: number; msg: ChatMessage; time: string; popKey: number }) {
  const texture = useCanvasTexture(828, 207, (ctx, w, h) => drawBubble(ctx, msg, time, w, h), [msg, time]);
  const pivot = useRef<THREE.Group>(null);
  const pop = useRef(1);
  useEffect(() => {
    if (slot === 2 && !useWorld.getState().reducedMotion) pop.current = 0;
  }, [popKey, slot]);
  useFrame((_, dt) => {
    const g = pivot.current;
    if (!g) return;
    pop.current = Math.min(1, pop.current + dt * 3.2);
    const k = pop.current;
    const overshoot = k < 1 ? 1 + 0.12 * Math.sin(k * Math.PI) : 1;
    g.scale.setScalar(Math.max(0.0001, Math.min(1, k * 1.4)) * overshoot);
  });
  const { x, z, ys, w, h } = EZRA.bubbles;
  return (
    <group ref={pivot} position={[x, ys[slot], z]}>
      <group position={[w / 2, 0, 0]}>
        <mesh geometry={PANEL_GEO} material={PANEL_MAT} castShadow />
        <mesh position={[0, 0, 0.082]}>
          <planeGeometry args={[w - 0.05, h - 0.05]} />
          <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.42} roughness={0.85} />
        </mesh>
      </group>
      <mesh position={[0.12, -0.42, 0]} rotation={[0, 0, Math.PI / 4]} material={PANEL_MAT}>
        <boxGeometry args={[0.22, 0.22, 0.12]} />
      </mesh>
    </group>
  );
}

function BotScreen() {
  const texture = useCanvasTexture(640, 246, drawBotScreen, []);
  const { x, z, w, h, y, ry } = EZRA.screen;
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.25), y / 2, -0.06]} castShadow>
          <boxGeometry args={[0.14, y, 0.14]} />
          <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, y + h / 2 - 0.2, 0]} castShadow>
        <boxGeometry args={[w + 0.14, h + 0.14, 0.1]} />
        <meshStandardMaterial color="#15191d" roughness={0.6} />
      </mesh>
      <mesh position={[0, y + h / 2 - 0.2, 0.055]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.8} roughness={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

function EzraBotIsland({ placement }: { placement: IslandPlacement }) {
  const project = projectById("ezra-bot");
  const [latest, setLatest] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const window3 = useMemo(() => visibleWindow(latest), [latest]);

  const advance = useCallback(() => {
    playSfx("chat");
    setLatest((l) => l + 1);
    setNow(new Date());
  }, []);

  // Reply once whenever the tour or the player arrives at the island.
  useEffect(
    () =>
      useWorld.subscribe((s, prev) => {
        if (s.activeIsland === "ezra-bot" && prev.activeIsland !== "ezra-bot") advance();
      }),
    [advance],
  );

  return (
    <>
      <group position={islandFrame(placement)}>
        <Robot id="ezra-robot" />
        {window3.map((msgIndex, slot) => (
          <Bubble key={slot} slot={slot} msg={CHAT_SCRIPT[msgIndex]} time={messageTime(now, 2 - slot)} popKey={latest} />
        ))}
        <BotScreen />
      </group>
      <Interactable
        id="ezra-robot"
        island={placement.id}
        label="Ask Ezra Bot"
        position={worldTuple(placement, EZRA.robot.x, 1.9, EZRA.robot.z)}
        size={[2.4, 3.8, 1.4]}
        radius={3}
        onActivate={advance}
      />
      <InfoBoard placement={placement} at={EZRA.info} rotationY={EZRA.info.ry} title="Discord" lines={project.stats ?? []} />
      <Signpost id="ezra-link" placement={placement} at={EZRA.link} rotationY={EZRA.link.ry} label="Add to Discord" url={project.links.discord} />
    </>
  );
}

export const ezraBotIsland: StarIslandModule = {
  id: "ezra-bot",
  Component: EzraBotIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS["ezra-bot"]),
  tourStop: tourStopFor,
};
```

- [ ] **Step 6: Register it**

Replace `src/world/scene/islands/index.ts` with:

```ts
import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";
import { heroIsland } from "./Hero";
import { gtidIsland } from "./Gtid";
import { petakUmpetIsland } from "./PetakUmpet";
import { orbitStoreIsland } from "./OrbitStore";
import { ezraBotIsland } from "./EzraBot";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {
  hero: heroIsland,
  gtid: gtidIsland,
  "petak-umpet": petakUmpetIsland,
  "orbit-store": orbitStoreIsland,
  "ezra-bot": ezraBotIsland,
};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
```

- [ ] **Step 7: Build and look at the Ezra Bot stop**

Run: `npx vitest run src/world/scene/islands && npm run build && npm run shots -- 4`
Read `.shots/stop-4-desktop.png` and `.shots/stop-4-phone.png`. Check: robot with glowing eyes; three bubbles stacked above it, members' bubbles as grey bars, the bot bubble readable with "Ezra Bot", the BOT tag and a "Today at HH:MM" time (no dates); the "Ezra Bot / online" screen board; info board "Discord", 1,000+ members; "Add to Discord" sign legible. Adjust `FRAMING["ezra-bot"]` if the top bubble is cut off (max 3 rounds; re-run the framing test).

- [ ] **Step 8: Commit**

```bash
git add src/world/scene/islands/ezrabot src/world/scene/islands/EzraBot.tsx src/world/scene/islands/index.ts src/world/scene/islands/framing.ts
git commit -m "feat: Ezra Bot island with robot, live-time chat bubbles and bot screen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```

---

### Task 10: Remove placeholders and verify Phase 1

**Files:**
- Delete: `src/world/scene/islands/placeholders.ts`
- Modify: `src/world/scene/islands/index.ts`

**Interfaces:**
- Consumes: all five island modules.
- Produces: final `STAR_ISLANDS` with exactly the five real islands; Phase 1 verification evidence.

- [ ] **Step 1: Drop the placeholders**

```bash
git rm src/world/scene/islands/placeholders.ts
grep -rn "PLACEHOLDER_ISLANDS\|placeholders" src || echo "no references left"
```
Expected: `no references left` once index.ts is replaced below (any other hit must be removed too).

Replace `src/world/scene/islands/index.ts` with:

```ts
import type { StarIslandModule } from "./types";
import { heroIsland } from "./Hero";
import { gtidIsland } from "./Gtid";
import { petakUmpetIsland } from "./PetakUmpet";
import { orbitStoreIsland } from "./OrbitStore";
import { ezraBotIsland } from "./EzraBot";

export const STAR_ISLANDS: Record<string, StarIslandModule> = {
  hero: heroIsland,
  gtid: gtidIsland,
  "petak-umpet": petakUmpetIsland,
  "orbit-store": orbitStoreIsland,
  "ezra-bot": ezraBotIsland,
};
```

- [ ] **Step 2: Full test run and production build**

Run: `npx vitest run`
Expected: all suites PASS (Parts A, B and C).
Run: `npm run build`
Expected: exit 0, no type errors.

- [ ] **Step 3: Screenshots of all five stops**

Run: `npm run shots`
Expected: 10 files `.shots/stop-{0..4}-{desktop,phone}.png`. Read every one and confirm, per stop, the island-specific checks from Tasks 5–9, plus: no missing-glyph boxes in any text, no black or empty frames, crossings (bridges / bounce pads / minecart rail from Part B) still reach each island's rim without props in the way.

- [ ] **Step 4: Spec §16 manual checklist in a real browser**

Start `npm run start:dev` (API on :3001) and `npm run dev` (Vite, proxies /api) in the background, then open `http://localhost:5173/` with the Playwright browser tools (navigate, take screenshot, press keys, click) and go through:

- [ ] Scroll the tour from hero to Ezra Bot and back; the GTID board footer says "Live from gtid.pro".
- [ ] Click each interactable in tour mode: hero title (bursts and reassembles), GTID board (chart ↔ mods), Petak kid (runs behind the house), Orbit stall (prints a receipt, parcel hops), Ezra Bot robot (next reply), each signpost (opens a new tab; Orbit's sign does nothing while its link is empty).
- [ ] Press W to enter Play at the hero island and at one mid-tour island; walk to each island through every crossing in both directions (bridge, stepping stones, bounce pads, minecart); press E at each interactable; approach the Petak kid and see it hide; press Esc to return to the tour.
- [ ] Toggle sound on: punch, print, chat and link sounds play.
- [ ] Emulate `prefers-reduced-motion: reduce` (Playwright `browser_emulate_media`): titles only squash, the kid doesn't animate, receipts appear fully printed, no sparkles.
- [ ] Not checkable here — list for Ezra in the commit message: phone touch controls on a real device, and audio quality by ear.

Fix anything that fails before committing; record the results.

- [ ] **Step 5: Commit**

```bash
git add src/world/scene/islands/index.ts
git commit -m "feat: phase 1 islands complete, placeholders removed" -m "Verified: vitest all green, production build, tour-stop screenshots desktop + phone, spec §16 checklist (tour, interactables, Play through every crossing both ways, sound, reduced motion). For Ezra to check on a real phone: touch controls and audio by ear." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z"
```
(If any checklist item failed and was fixed in this task, `git add` those files too and name the fix in the message.)

---

## Self-review (done while writing)

- **Spec coverage (Part C scope):** §10 hero / GTID / Petak Umpet / Orbit Store / Ezra Bot — Tasks 5–9; §11 proxy, cache TTLs 30/120/30 s, stale fallback, bundled snapshot — Task 3; §8 Phase 1 interactions (signposts, punchable titles, per-island actions, squash + sound + particles, no shake on Petak) — Tasks 1, 4–9; §18 content rules — Global Constraints + receipt/chat/board tests; §16 checklist — Task 10.
- **Placeholders:** none; every code step carries full code. The only conditional step (C2 Step 7) gives exact code and the one name to match against Part B's file.
- **Types vs master:** uses `IslandPlacement`, `VoxelGrid`, `blockId`, `BlockName`, `mulberry32`, `hashString`, `TourStop`, `stopProgress`, `buildLayout`, `worldProjects`, `worldCopy`, `WorldProject`, `playSfx`, `runtime.particles.burst`, `runtime.player.pos`, `useWorld` (`hoveredId`, `mode`, `activeIsland`, `reducedMotion`), `Interactable` props (`id, island, label, position, size, radius?, onActivate, enabled?`), `WorldText` props (`text, position, rotationY?, size?, color?, font?, anchorX?, maxWidth?`) and `StarIslandModule` (`id, Component, stamp?, tourStop`) exactly as the master defines them.
