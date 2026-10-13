# Voxel World — Phase 1 Part A: Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the framework-free TypeScript engine (`src/world/engine/**`) plus the content schema, fully unit-tested, so Parts B and C can render and wire it.

**Architecture:** Pure modules with plain `{ x, y, z }` maths and no React/three.js/DOM imports (only `audio/sfx.ts` touches zzfx, lazily). A single `VoxelGrid` holds every island's blocks for both collision and meshing. Each module ships with a Vitest file next to it.

**Tech Stack:** TypeScript 5.8 strict (`verbatimModuleSyntax`, `erasableSyntaxOnly`), Vitest 5, zzfx 1.4. Runtime deps for Parts B/C (three, R3F, drei, zustand) are installed here in Task 1.

**Master plan (binding contracts, conventions, global constraints):** `docs/superpowers/plans/2026-10-13-voxel-world-phase1.md`
**Spec:** `docs/superpowers/specs/2026-10-13-voxel-world-design.md`

## Global Constraints

See the master plan's "Global Constraints" and "Coordinate conventions" — every task here includes them. Part A specifics:

- All commands run from the app root `C:\Users\ezrak\OneDrive\Documents\Code\react\portfolio\portfolio` (the folder with `package.json`), in Git Bash.
- Never stage the pre-existing `gsap-splittext-kinetic-typography-experiment-gsapchallenge-1/` deletions. Always `git add` the exact paths listed in the step.
- Every commit uses this exact form (message line changes per task):

  ```bash
  git commit -q -F - <<'EOF'
  feat: <message>

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
  EOF
  ```

- Engine files import each other through the `@/` alias and use `import type` for type-only imports.
- Tests run in Vitest's `node` environment; nothing in the engine may need `window`, `document` or WebGL.

## Contract additions (beyond the master's Part A list)

These are extra exports; nothing in the master contract is renamed or changed.

| Module | Addition | Why |
|---|---|---|
| `src/world/engine/color.ts` | `hexToRgb(hex: string): [number, number, number]` (sRGB 0..1) | shared by mesher and particles |
| `voxel/blocks.ts` | `BLOCK_NAMES: readonly BlockName[]` | tests and tooling iterate blocks |
| `gen/layout.ts` | `TOUR_ORDER: readonly string[]`, `DISTRICT_HUBS: Record<District, { origin: Vec3i; radius: number }>`, `satelliteOrigin(hub: Vec3i, hubRadius: number, index: number): Vec3i`, `MINI_RADIUS = 4`, `MINI_DEPTH = 4` | mini-island slots (used by Phase 2) |
| `camera/tourPath.ts` | `TourPath` also carries `controls: Vec3[]` and `stopIndex: number[]`; `TRAVEL_WEIGHT = 1` | derived data used by `samplePath` |
| `physics/character.ts` | `characterCollides(isSolid: IsSolid, x: number, y: number, z: number, p?: CharacterParams): boolean` | Part B checks spawn/drop positions |
| `audio/sfx.ts` | `whenAudioReady(): Promise<void>` | resolves once zzfx has loaded after unmuting (tests, HUD) |

Behaviour notes Parts B/C rely on:

- `stepCharacter` does nothing while `state.locked` is true: the bounce-pad arc (`positionAt`) or minecart (`railPoint`) driver owns `state.pos` during that time.
- `buildWorld` assigns each block to the nearest island whose box contains it, so no block is meshed twice. Blocks outside every island's box are not meshed: crossings render their own visuals and stamp invisible `"barrier"` blocks for collision.
- `buildBatch` colours are sRGB 0..1; Part B converts with `color.setRGB(r, g, b, THREE.SRGBColorSpace)`.

---

### Task 1: Branch, dependencies, test runner, shared types, seeded RNG

**Files:**
- Modify: `package.json` (scripts + deps via npm), `package-lock.json` (npm), `vite.config.ts`
- Create: `src/types/zzfx.d.ts`, `src/world/engine/types.ts`, `src/world/engine/gen/rng.ts`
- Test: `src/world/engine/gen/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Vec3`, `Vec3i`, `IsSolid` (types.ts); `Rng`, `mulberry32(seed)`, `hashString(s)`, `rngFor(id)` (rng.ts); the `zzfx` module declaration; `npm test`.

- [ ] **Step 1: Switch to the branch (keep the foreign deletions unstaged)**

The branch `voxel-world` already exists: the spec and these plans were committed on it during planning.

```bash
git switch voxel-world
git log --oneline -1
git status --short
```

Expected: `Switched to branch 'voxel-world'` (or "Already on"); the last commit is the planning docs commit (`docs: add voxel world spec and phase 1 plans`); status shows only lines starting with ` D gsap-splittext-kinetic-typography-experiment-gsapchallenge-1/` (those stay unstaged forever).

- [ ] **Step 2: Install dependencies**

```bash
npm install three @react-three/fiber@^9 @react-three/drei@^10 zustand@^5 zzfx@^1.4.0
npm install -D vitest@^5 @types/three
```

Expected: both commands finish with `added … packages` and no `ERR!`.

- [ ] **Step 3: Add the test script and Vitest config**

In `package.json`, add `"test": "vitest run",` to `"scripts"` right after `"lint": "eslint .",` so the block reads:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "preview": "vite preview",
    "start": "PORT=3000 node server.js",
    "start:dev": "node server.js",
    "serve": "npm run build && PORT=3000 node server.js"
  },
```

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
```

- [ ] **Step 4: Create shared types and the zzfx declaration**

`src/world/engine/types.ts`:

```ts
export type Vec3 = { x: number; y: number; z: number };
export type Vec3i = Vec3;
export type IsSolid = (x: number, y: number, z: number) => boolean;
```

`src/types/zzfx.d.ts`:

```ts
declare module "zzfx" {
  export function zzfx(...parameters: (number | undefined)[]): AudioBufferSourceNode;
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    play(...parameters: (number | undefined)[]): AudioBufferSourceNode;
  };
}
```

- [ ] **Step 5: Write the failing RNG test**

`src/world/engine/gen/rng.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashString, mulberry32, rngFor } from "@/world/engine/gen/rng";

describe("hashString (FNV-1a 32-bit)", () => {
  it("matches the published test vectors", () => {
    expect(hashString("")).toBe(2166136261);
    expect(hashString("a")).toBe(3826002220);
    expect(hashString("foobar")).toBe(3214735720);
  });

  it("returns an unsigned 32-bit integer", () => {
    const h = hashString("orbit-store");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(1234), b = mulberry32(1234);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it("differs between seeds", () => {
    const a = mulberry32(1), b = mulberry32(2);
    const sa = Array.from({ length: 5 }, a), sb = Array.from({ length: 5 }, b);
    expect(sa).not.toEqual(sb);
  });

  it("stays in [0, 1) and is roughly uniform", () => {
    const r = mulberry32(99);
    let sum = 0;
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 2000).toBeGreaterThan(0.45);
    expect(sum / 2000).toBeLessThan(0.55);
  });
});

describe("rngFor", () => {
  it("seeds from the id hash", () => {
    const a = rngFor("gtid"), b = mulberry32(hashString("gtid"));
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/world/engine/gen/rng.test.ts`
Expected: FAIL — `Failed to resolve import "@/world/engine/gen/rng"` (or "Cannot find module").

- [ ] **Step 7: Implement the RNG**

`src/world/engine/gen/rng.ts`:

```ts
export type Rng = () => number;

/** Small fast seeded PRNG, uniform in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash, unsigned. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function rngFor(id: string): Rng {
  return mulberry32(hashString(id));
}
```

- [ ] **Step 8: Run tests and the type check**

Run: `npx vitest run src/world/engine/gen/rng.test.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  6 passed (6)`.

Run: `npx tsc -b`
Expected: exits with no output.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/types/zzfx.d.ts src/world/engine/types.ts src/world/engine/gen/rng.ts src/world/engine/gen/rng.test.ts
git commit -q -F - <<'EOF'
chore: add 3D deps, vitest and seeded rng for the voxel world

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 2: Content schema, validator and the four star projects

**Files:**
- Create: `src/config/schema.ts`
- Modify: `src/config/portfolio.ts` (add one import at the top, append two exports at the end; the existing `config` object stays untouched)
- Test: `src/config/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `District`, `IslandTemplate`, `ProjectLinks`, `WorldProject`, `ValidationIssue`, `DISTRICTS`, `validateProjects(list)`; `worldProjects` (ids `gtid`, `petak-umpet`, `orbit-store`, `ezra-bot`), `worldCopy`.

- [ ] **Step 1: Write the failing test**

`src/config/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DISTRICTS, validateProjects, type WorldProject } from "@/config/schema";
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

  it("requires https links but allows empty ones", () => {
    expect(validateProjects([{ ...base, links: { discord: "" } }])).toEqual([]);
    const messages = validateProjects([{ ...base, links: { demo: "http://x.dev" } }]).map((i) => i.message);
    expect(messages).toContain("links.demo must start with https://");
  });

  it("checks island template and accent format", () => {
    const bad = { ...base, island: { template: "castle", accent: "blue" } } as unknown as WorldProject;
    const messages = validateProjects([bad]).map((i) => i.message);
    expect(messages).toContain('unknown island template "castle"');
    expect(messages).toContain("island.accent must be #RRGGBB");
  });

  it("lists the three districts", () => {
    expect(DISTRICTS).toEqual(["game", "discord", "web"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/config/schema.test.ts`
Expected: FAIL — cannot resolve `@/config/schema`.

- [ ] **Step 3: Implement the schema**

`src/config/schema.ts`:

```ts
export type District = "game" | "discord" | "web";
export type IslandTemplate = "workshop" | "shop" | "tower" | "garden" | "lab";

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
  screenshot?: string;
  island?: { template?: IslandTemplate; accent?: string };
}

export interface ValidationIssue { id: string; message: string }

export const DISTRICTS: readonly District[] = ["game", "discord", "web"];
const TEMPLATES: readonly IslandTemplate[] = ["workshop", "shop", "tower", "garden", "lab"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROCESS_CLAIMS = /\b(solo|end-to-end|self-hosted|self-managed|dockerized)\b/i;

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
    if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2100) add("year must be a 4-digit year");
    if (!DISTRICTS.includes(p.district)) add(`unknown district "${p.district}"`);
    if (p.tier !== "star" && p.tier !== "mini") add('tier must be "star" or "mini"');
    const template = p.island?.template;
    if (template && !TEMPLATES.includes(template)) add(`unknown island template "${template}"`);
    const accent = p.island?.accent;
    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) add("island.accent must be #RRGGBB");
    for (const [key, url] of Object.entries(p.links ?? {})) {
      if (url && !url.startsWith("https://")) add(`links.${key} must start with https://`);
    }
  }
  return issues;
}
```

- [ ] **Step 4: Add the world content to `portfolio.ts`**

Insert as the new first line of `src/config/portfolio.ts`:

```ts
import type { WorldProject } from "./schema";

```

Append at the end of `src/config/portfolio.ts` (after `export type Config = typeof config;`):

```ts

/* ---------- Voxel world (Phase 1): hero copy and the four star islands ---------- */

export const worldCopy = {
  heroName: "Ezra Brilliant",
  heroLine: "I build bots, games and web tools that people use every day.",
  location: "Surabaya, Indonesia",
};

export const worldProjects: WorldProject[] = [
  {
    id: "gtid",
    title: "GTID",
    year: 2026,
    line: "Live DL & BGL prices for Growtopia Indonesia, price alerts, and which mods are online right now.",
    stats: ["2,600 visitors / day", "16,000+ items"],
    tags: ["Next.js", "Node.js", "MongoDB"],
    district: "game",
    tier: "star",
    links: { demo: "https://gtid.pro" },
    island: { accent: "#FA5D19" },
  },
  {
    id: "petak-umpet",
    title: "Petak Umpet",
    year: 2026,
    line: "Traditional Indonesian hide-and-seek as a Roblox multiplayer game, set in a village.",
    stats: ["3.1M+ visits", "2.6K peak players"],
    tags: ["Roblox", "Luau"],
    district: "game",
    tier: "star",
    links: { roblox: "https://www.roblox.com/games/91179701802837/Petak-Umpet" },
  },
  {
    id: "orbit-store",
    title: "Orbit Store",
    year: 2024,
    line: "A Discord store that takes QRIS payments and delivers every order automatically.",
    stats: ["2,200+ orders", "890+ buyers"],
    tags: ["Discord.js", "Midtrans", "QRIS"],
    district: "discord",
    tier: "star",
    links: { discord: "" }, // Ezra fills the server invite later; the signpost stays inactive while empty
    island: { accent: "#3D62F8" },
  },
  {
    id: "ezra-bot",
    title: "Ezra Bot",
    year: 2026,
    line: "An AI bot that answers from its own community's knowledge.",
    stats: ["1,000+ members"],
    tags: ["Discord.js", "Gemini", "GPT-4o"],
    district: "discord",
    tier: "star",
    links: { demo: "https://discord.com/oauth2/authorize?client_id=1127105994766426122" },
  },
];
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/config/schema.test.ts`
Expected: PASS — `Tests  9 passed (9)`.

- [ ] **Step 6: Commit**

```bash
git add src/config/schema.ts src/config/schema.test.ts src/config/portfolio.ts
git commit -q -F - <<'EOF'
feat: add world project schema, validator and the four star projects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 3: Block palette and the voxel grid

**Files:**
- Create: `src/world/engine/voxel/blocks.ts`, `src/world/engine/voxel/grid.ts`
- Test: `src/world/engine/voxel/grid.test.ts`

**Interfaces:**
- Consumes: `IsSolid` (types.ts).
- Produces: `BlockName`, `BlockId`, `BlockDef`, `BLOCK_NAMES`, `blockId(name)`, `blockDef(id)`; `VoxelGrid` with `set/get/isSolid/forEach/size`.

- [ ] **Step 1: Write the failing test**

`src/world/engine/voxel/grid.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BLOCK_NAMES, blockDef, blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";

describe("blocks", () => {
  it("gives every block a unique non-zero id that round-trips", () => {
    const ids = BLOCK_NAMES.map(blockId);
    expect(new Set(ids).size).toBe(BLOCK_NAMES.length);
    expect(ids.every((id) => id > 0)).toBe(true);
    for (const name of BLOCK_NAMES) expect(blockDef(blockId(name))?.name).toBe(name);
  });

  it("treats id 0 as air and barrier as solid but invisible", () => {
    expect(blockDef(0)).toBeUndefined();
    const barrier = blockDef(blockId("barrier"))!;
    expect(barrier.solid).toBe(true);
    expect(barrier.visible).toBe(false);
    expect(blockDef(blockId("grass"))!.colors.length).toBeGreaterThan(1);
  });

  it("throws on unknown names", () => {
    expect(() => blockId("lava" as never)).toThrow(/unknown block/);
  });
});

describe("VoxelGrid", () => {
  it("sets, gets and deletes blocks, including negative coordinates", () => {
    const g = new VoxelGrid();
    g.set(-3, 5, -900, blockId("stone"));
    g.set(1000, -1000, 7, blockId("wood"));
    expect(g.get(-3, 5, -900)).toBe(blockId("stone"));
    expect(g.get(1000, -1000, 7)).toBe(blockId("wood"));
    expect(g.get(0, 0, 0)).toBe(0);
    expect(g.size).toBe(2);
    g.set(-3, 5, -900, 0);
    expect(g.get(-3, 5, -900)).toBe(0);
    expect(g.size).toBe(1);
  });

  it("reports solidity, flooring fractional coordinates", () => {
    const g = new VoxelGrid();
    g.set(2, 0, -1, blockId("grass"));
    g.set(5, 5, 5, blockId("barrier"));
    expect(g.isSolid(2, 0, -1)).toBe(true);
    expect(g.isSolid(2.9, 0.4, -0.2)).toBe(true);
    expect(g.isSolid(5, 5, 5)).toBe(true);
    expect(g.isSolid(3, 0, -1)).toBe(false);
  });

  it("isSolid works when passed around unbound", () => {
    const g = new VoxelGrid();
    g.set(0, 0, 0, blockId("stone"));
    const { isSolid } = g;
    expect(isSolid(0, 0, 0)).toBe(true);
  });

  it("iterates decoded coordinates", () => {
    const g = new VoxelGrid();
    g.set(-1, 2, 3, blockId("leaf"));
    g.set(4, -5, -6, blockId("roof"));
    const seen: string[] = [];
    g.forEach((x, y, z, id) => seen.push(`${x},${y},${z}:${blockDef(id)!.name}`));
    expect(seen.sort()).toEqual(["-1,2,3:leaf", "4,-5,-6:roof"]);
  });

  it("rejects non-integer or out-of-range writes", () => {
    const g = new VoxelGrid();
    expect(() => g.set(0.5, 0, 0, 1)).toThrow();
    expect(() => g.set(5000, 0, 0, 1)).toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/voxel/grid.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/voxel/blocks`.

- [ ] **Step 3: Implement blocks and grid**

`src/world/engine/voxel/blocks.ts`:

```ts
export type BlockName = "grass" | "earth" | "stone" | "plank" | "wood" | "roof" | "leaf" | "crate"
  | "orange" | "blue" | "white" | "iron" | "barrier";
export type BlockId = number;

export interface BlockDef { id: BlockId; name: BlockName; colors: string[]; solid: boolean; visible: boolean }

// Muted natural palette from the approved sketch (spec §4). Order defines ids: never reorder, only append.
const DEFS: Array<Omit<BlockDef, "id">> = [
  { name: "grass", colors: ["#8ea769", "#86a062", "#97ae73", "#7f995d"], solid: true, visible: true },
  { name: "earth", colors: ["#94714f", "#8a6849", "#9d7a57"], solid: true, visible: true },
  { name: "stone", colors: ["#b5afa5", "#a9a399", "#bfb9af", "#a19b91"], solid: true, visible: true },
  { name: "plank", colors: ["#b98f62", "#ad8458"], solid: true, visible: true },
  { name: "wood", colors: ["#6b4f37"], solid: true, visible: true },
  { name: "roof", colors: ["#b5674b", "#a85d43", "#bb6f52"], solid: true, visible: true },
  { name: "leaf", colors: ["#6e8e57", "#7a9862", "#66854f", "#82a068"], solid: true, visible: true },
  { name: "crate", colors: ["#a87f55", "#9c744c", "#b08659"], solid: true, visible: true },
  { name: "orange", colors: ["#FA5D19"], solid: true, visible: true },
  { name: "blue", colors: ["#3D62F8"], solid: true, visible: true },
  { name: "white", colors: ["#f4f3ef"], solid: true, visible: true },
  { name: "iron", colors: ["#3b3d42", "#45474c"], solid: true, visible: true },
  { name: "barrier", colors: ["#000000"], solid: true, visible: false },
];

const BY_ID: BlockDef[] = DEFS.map((d, i) => ({ ...d, id: i + 1 }));
const BY_NAME = new Map<BlockName, BlockDef>(BY_ID.map((d) => [d.name, d]));

export const BLOCK_NAMES: readonly BlockName[] = DEFS.map((d) => d.name);

export function blockId(name: BlockName): BlockId {
  const def = BY_NAME.get(name);
  if (!def) throw new Error(`unknown block "${name}"`);
  return def.id;
}

export function blockDef(id: BlockId): BlockDef | undefined {
  return id > 0 ? BY_ID[id - 1] : undefined;
}
```

`src/world/engine/voxel/grid.ts`:

```ts
import type { IsSolid } from "@/world/engine/types";
import { blockDef, type BlockId } from "@/world/engine/voxel/blocks";

const OFFSET = 1024;          // supported coordinates: [-1024, 1023] on every axis
const SPAN = 2048;

function key(x: number, y: number, z: number): number {
  return ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET);
}

function inRange(v: number): boolean {
  return Number.isInteger(v) && v >= -OFFSET && v < OFFSET;
}

/** Sparse world of blocks. Block (x, y, z) fills [x, x+1) × [y, y+1) × [z, z+1). */
export class VoxelGrid {
  private cells = new Map<number, BlockId>();

  set(x: number, y: number, z: number, id: BlockId): void {
    if (!inRange(x) || !inRange(y) || !inRange(z)) {
      throw new Error(`VoxelGrid.set: coordinates must be integers in [-1024, 1023], got ${x},${y},${z}`);
    }
    const k = key(x, y, z);
    if (id === 0) this.cells.delete(k);
    else this.cells.set(k, id);
  }

  get(x: number, y: number, z: number): BlockId {
    return this.cells.get(key(x, y, z)) ?? 0;
  }

  /** Floors its inputs, so callers may pass world positions. */
  isSolid: IsSolid = (x, y, z) => {
    const id = this.get(Math.floor(x), Math.floor(y), Math.floor(z));
    return id !== 0 && (blockDef(id)?.solid ?? false);
  };

  forEach(cb: (x: number, y: number, z: number, id: BlockId) => void): void {
    for (const [k, id] of this.cells) {
      const z = (k % SPAN) - OFFSET;
      const rest = Math.floor(k / SPAN);
      const y = (rest % SPAN) - OFFSET;
      const x = Math.floor(rest / SPAN) - OFFSET;
      cb(x, y, z, id);
    }
  }

  get size(): number {
    return this.cells.size;
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/voxel/grid.test.ts`
Expected: PASS — `Tests  8 passed (8)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/voxel/blocks.ts src/world/engine/voxel/grid.ts src/world/engine/voxel/grid.test.ts
git commit -q -F - <<'EOF'
feat: add block palette and sparse voxel grid

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 4: Blueprints (layered ASCII block maps)

**Files:**
- Create: `src/world/engine/voxel/blueprint.ts`
- Test: `src/world/engine/voxel/blueprint.test.ts`

**Interfaces:**
- Consumes: `VoxelGrid`, `blockId`, `BlockName`, `Vec3i`.
- Produces: `Blueprint`, `stampBlueprint(grid, bp, origin)` — each layer is centred on `origin.x/z` using the layer's widest row and its row count; layer `y` is relative to `origin.y`.

- [ ] **Step 1: Write the failing test**

`src/world/engine/voxel/blueprint.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { blockId } from "@/world/engine/voxel/blocks";
import { stampBlueprint, type Blueprint } from "@/world/engine/voxel/blueprint";
import { VoxelGrid } from "@/world/engine/voxel/grid";

describe("stampBlueprint", () => {
  const bp: Blueprint = {
    layers: [
      { y: 0, rows: ["#.#", "...", "#.#"] },
      { y: 1, rows: ["W"] },
    ],
    legend: { "#": "stone", W: "wood" },
  };

  it("places blocks centred on the origin, skipping air", () => {
    const g = new VoxelGrid();
    stampBlueprint(g, bp, { x: 10, y: 5, z: -3 });
    expect(g.get(9, 5, -4)).toBe(blockId("stone"));
    expect(g.get(11, 5, -4)).toBe(blockId("stone"));
    expect(g.get(9, 5, -2)).toBe(blockId("stone"));
    expect(g.get(11, 5, -2)).toBe(blockId("stone"));
    expect(g.get(10, 5, -3)).toBe(0);
    expect(g.get(10, 6, -3)).toBe(blockId("wood"));
    expect(g.size).toBe(5);
  });

  it("centres ragged rows on the widest row", () => {
    const g = new VoxelGrid();
    stampBlueprint(g, { layers: [{ y: 0, rows: ["#####", "#"] }], legend: { "#": "plank" } }, { x: 0, y: 0, z: 0 });
    expect(g.get(-2, 0, -1)).toBe(blockId("plank"));
    expect(g.get(2, 0, -1)).toBe(blockId("plank"));
    expect(g.get(-2, 0, 0)).toBe(blockId("plank"));
    expect(g.get(-1, 0, 0)).toBe(0);
  });

  it("treats spaces as air", () => {
    const g = new VoxelGrid();
    stampBlueprint(g, { layers: [{ y: 2, rows: ["# #"] }], legend: { "#": "crate" } }, { x: 0, y: 0, z: 0 });
    expect(g.size).toBe(2);
    expect(g.get(-1, 2, 0)).toBe(blockId("crate"));
  });

  it("throws on characters missing from the legend", () => {
    expect(() => stampBlueprint(new VoxelGrid(), { layers: [{ y: 0, rows: ["?"] }], legend: {} }, { x: 0, y: 0, z: 0 }))
      .toThrow(/no legend entry for "\?"/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/voxel/blueprint.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/voxel/blueprint`.

- [ ] **Step 3: Implement**

`src/world/engine/voxel/blueprint.ts`:

```ts
import type { Vec3i } from "@/world/engine/types";
import { blockId, type BlockName } from "@/world/engine/voxel/blocks";
import type { VoxelGrid } from "@/world/engine/voxel/grid";

export interface Blueprint {
  layers: { y: number; rows: string[] }[];
  legend: Record<string, BlockName>;
}

/** Each row is one z line (top row = smallest z), one character per x. '.' and ' ' are air. */
export function stampBlueprint(grid: VoxelGrid, bp: Blueprint, origin: Vec3i): void {
  for (const layer of bp.layers) {
    const width = layer.rows.reduce((m, r) => Math.max(m, r.length), 0);
    const x0 = origin.x - Math.floor(width / 2);
    const z0 = origin.z - Math.floor(layer.rows.length / 2);
    layer.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === "." || ch === " ") continue;
        const name = bp.legend[ch];
        if (!name) throw new Error(`blueprint: no legend entry for "${ch}"`);
        grid.set(x0 + c, origin.y + layer.y, z0 + r, blockId(name));
      }
    });
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/voxel/blueprint.test.ts`
Expected: PASS — `Tests  4 passed (4)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/voxel/blueprint.ts src/world/engine/voxel/blueprint.test.ts
git commit -q -F - <<'EOF'
feat: add layered ascii blueprints for voxel props

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 5: Colour helper and the instance mesher

**Files:**
- Create: `src/world/engine/color.ts`, `src/world/engine/voxel/mesher.ts`
- Test: `src/world/engine/voxel/mesher.test.ts`

**Interfaces:**
- Consumes: `VoxelGrid`, `blockDef`, `blockId`, `Rng`, `mulberry32`.
- Produces: `hexToRgb(hex)`; `InstanceBatch`, `buildBatch(grid, filter, rng)` — only visible blocks with at least one face next to air or an invisible block; centres at `+0.5`; colours sRGB 0..1 with ±4% lightness jitter.

- [ ] **Step 1: Write the failing test**

`src/world/engine/voxel/mesher.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hexToRgb } from "@/world/engine/color";
import { mulberry32 } from "@/world/engine/gen/rng";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { buildBatch } from "@/world/engine/voxel/mesher";

const all = () => true;

function cube(n: number, name: "stone" | "grass" = "stone"): VoxelGrid {
  const g = new VoxelGrid();
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) g.set(x, y, z, blockId(name));
  return g;
}

describe("hexToRgb", () => {
  it("parses #RRGGBB to sRGB 0..1", () => {
    expect(hexToRgb("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
  });
});

describe("buildBatch", () => {
  it("emits one centred instance for a lone block", () => {
    const g = new VoxelGrid();
    g.set(0, 0, 0, blockId("stone"));
    const b = buildBatch(g, all, mulberry32(1));
    expect(b.count).toBe(1);
    expect(Array.from(b.positions)).toEqual([0.5, 0.5, 0.5]);
    expect(b.colors.length).toBe(3);
  });

  it("skips fully enclosed blocks", () => {
    expect(buildBatch(cube(3), all, mulberry32(1)).count).toBe(26);
  });

  it("skips invisible blocks and treats them as exposure for neighbours", () => {
    const g = cube(3);
    g.set(1, 2, 1, blockId("barrier"));                 // replace the top-centre block
    const b = buildBatch(g, all, mulberry32(1));
    // 26 shell blocks minus the barrier (invisible) plus the now-exposed centre block
    expect(b.count).toBe(26);
    const centres: string[] = [];
    for (let i = 0; i < b.count; i++) centres.push(`${b.positions[i * 3]},${b.positions[i * 3 + 1]},${b.positions[i * 3 + 2]}`);
    expect(centres).toContain("1.5,1.5,1.5");
    expect(centres).not.toContain("1.5,2.5,1.5");
  });

  it("honours the filter", () => {
    const b = buildBatch(cube(3), (x) => x === 0, mulberry32(1));
    expect(b.count).toBe(9);
  });

  it("produces deterministic colours inside [0, 1]", () => {
    const a = buildBatch(cube(3, "grass"), all, mulberry32(5));
    const b = buildBatch(cube(3, "grass"), all, mulberry32(5));
    expect(Array.from(a.colors)).toEqual(Array.from(b.colors));
    for (const c of a.colors) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/voxel/mesher.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/color`.

- [ ] **Step 3: Implement**

`src/world/engine/color.ts`:

```ts
/** "#RRGGBB" → [r, g, b] in sRGB 0..1. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
```

`src/world/engine/voxel/mesher.ts`:

```ts
import { hexToRgb } from "@/world/engine/color";
import type { Rng } from "@/world/engine/gen/rng";
import { blockDef } from "@/world/engine/voxel/blocks";
import type { VoxelGrid } from "@/world/engine/voxel/grid";

export interface InstanceBatch { count: number; positions: Float32Array; colors: Float32Array }

const NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const JITTER = 0.08;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function buildBatch(grid: VoxelGrid, filter: (x: number, y: number, z: number) => boolean, rng: Rng): InstanceBatch {
  const positions: number[] = [];
  const colors: number[] = [];
  grid.forEach((x, y, z, id) => {
    const def = blockDef(id);
    if (!def || !def.visible || !filter(x, y, z)) return;
    let exposed = false;
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const n = blockDef(grid.get(x + dx, y + dy, z + dz));
      if (!n || !n.visible) { exposed = true; break; }
    }
    if (!exposed) return;
    positions.push(x + 0.5, y + 0.5, z + 0.5);
    const [r, g, b] = hexToRgb(def.colors[Math.floor(rng() * def.colors.length)]);
    const k = 1 + (rng() - 0.5) * JITTER;
    colors.push(clamp01(r * k), clamp01(g * k), clamp01(b * k));
  });
  return { count: positions.length / 3, positions: new Float32Array(positions), colors: new Float32Array(colors) };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/voxel/mesher.test.ts`
Expected: PASS — `Tests  6 passed (6)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/color.ts src/world/engine/voxel/mesher.ts src/world/engine/voxel/mesher.test.ts
git commit -q -F - <<'EOF'
feat: add exposed-block instance mesher with colour jitter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 6: Seeded floating-island generator

**Files:**
- Create: `src/world/engine/gen/islandGen.ts`
- Test: `src/world/engine/gen/islandGen.test.ts`

**Interfaces:**
- Consumes: `mulberry32`, `BlockName`.
- Produces: `IslandSpec`, `IslandShape`, `generateIsland(spec)` — local coords, grass top layer at `y = 0`, earth below the rim, a stone underside tapering down to `y = -depth`; `surface(x, z)` returns `0` on the island and `null` off it. Same spec ⇒ identical output.

- [ ] **Step 1: Write the failing test**

`src/world/engine/gen/islandGen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateIsland } from "@/world/engine/gen/islandGen";

const spec = { radius: 6, depth: 6, seed: 42 };

describe("generateIsland", () => {
  it("is deterministic", () => {
    expect(JSON.stringify(generateIsland(spec).cells)).toBe(JSON.stringify(generateIsland(spec).cells));
  });

  it("changes with the seed", () => {
    expect(JSON.stringify(generateIsland(spec).cells)).not.toBe(JSON.stringify(generateIsland({ ...spec, seed: 43 }).cells));
  });

  it("has a grass top at y = 0 covering the centre", () => {
    const { cells, surface } = generateIsland(spec);
    expect(cells).toContainEqual({ x: 0, y: 0, z: 0, block: "grass" });
    expect(cells.filter((c) => c.y === 0).every((c) => c.block === "grass")).toBe(true);
    expect(cells.filter((c) => c.block === "grass").every((c) => c.y === 0)).toBe(true);
    expect(surface(0, 0)).toBe(0);
    expect(surface(40, 40)).toBeNull();
  });

  it("stays inside its footprint and depth", () => {
    const { cells } = generateIsland(spec);
    for (const c of cells) {
      expect(c.y).toBeLessThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(-spec.depth);
      if (c.y === 0) expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(spec.radius * 1.2 + 1e-9);
    }
  });

  it("tapers to a stone underside", () => {
    const { cells } = generateIsland(spec);
    const at = (y: number) => cells.filter((c) => c.y === y).length;
    expect(at(-3)).toBeGreaterThan(at(-spec.depth));
    expect(cells.some((c) => c.block === "stone")).toBe(true);
    expect(cells.some((c) => c.block === "earth")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/gen/islandGen.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/gen/islandGen`.

- [ ] **Step 3: Implement (ported from the approved sketch's `terrain()`)**

`src/world/engine/gen/islandGen.ts`:

```ts
import { mulberry32 } from "@/world/engine/gen/rng";
import type { BlockName } from "@/world/engine/voxel/blocks";

export interface IslandSpec { radius: number; depth: number; seed: number }
export interface IslandShape {
  cells: Array<{ x: number; y: number; z: number; block: BlockName }>;
  surface: (x: number, z: number) => number | null;
}

/** Floating island: wobbly round grass top (y = 0), earth rim, stone underside tapering to y = -depth. */
export function generateIsland(spec: IslandSpec): IslandShape {
  const { radius: R, depth, seed } = spec;
  const r = mulberry32(seed);
  const a1 = r() * Math.PI * 2;
  const a2 = r() * Math.PI * 2;
  const noise = (x: number, z: number) => {
    const v = Math.sin(x * 12.9898 + z * 78.233 + seed * 3.17) * 43758.5453;
    return v - Math.floor(v);
  };
  const cells: IslandShape["cells"] = [];
  const top = new Set<string>();
  const N = Math.ceil(R * 1.25) + 1;
  for (let x = -N; x <= N; x++) {
    for (let z = -N; z <= N; z++) {
      const d = Math.hypot(x, z);
      const ang = Math.atan2(z, x);
      const rad = R * (1 + 0.13 * Math.sin(ang * 3 + a1) + 0.07 * Math.sin(ang * 5 + a2));
      if (d > rad) continue;
      cells.push({ x, y: 0, z, block: "grass" });
      top.add(`${x},${z}`);
      if (d <= rad - 0.3) cells.push({ x, y: -1, z, block: "earth" });
      if (d <= rad - 0.9) cells.push({ x, y: -2, z, block: "earth" });
      for (let y = -3; y >= -depth; y--) {
        const k = (-y - 2) / (depth - 1);
        const rs = (rad - 0.9) * Math.pow(1 - k, 0.8) + (noise(x + y * 5, z - y * 3) - 0.5) * 1.2;
        if (d <= rs) cells.push({ x, y, z, block: y > -4 && noise(x, z + y) > 0.72 ? "earth" : "stone" });
      }
    }
  }
  return { cells, surface: (x, z) => (top.has(`${x},${z}`) ? 0 : null) };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/gen/islandGen.test.ts`
Expected: PASS — `Tests  5 passed (5)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/gen/islandGen.ts src/world/engine/gen/islandGen.test.ts
git commit -q -F - <<'EOF'
feat: add seeded floating island generator

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 7: World layout — anchors, districts, crossings rule

**Files:**
- Create: `src/world/engine/gen/layout.ts`
- Test: `src/world/engine/gen/layout.test.ts`

**Interfaces:**
- Consumes: `WorldProject`, `District` (schema), `hashString` (rng), `Vec3`, `Vec3i`.
- Produces: `IslandKind`, `IslandPlacement`, `CrossingKind`, `Crossing`, `WorldLayout`, `STAR_ANCHORS`, `TOUR_ORDER`, `DISTRICT_HUBS`, `MINI_RADIUS`, `MINI_DEPTH`, `chooseCrossing(from, to)`, `edgeAnchor(from, to)`, `satelliteOrigin(hub, hubRadius, index)`, `buildLayout(projects)`.

- [ ] **Step 1: Write the failing test**

`src/world/engine/gen/layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import type { WorldProject } from "@/config/schema";
import {
  STAR_ANCHORS, buildLayout, chooseCrossing, edgeAnchor, type IslandPlacement,
} from "@/world/engine/gen/layout";

function place(id: string, district: IslandPlacement["district"], y: number, x = 0): IslandPlacement {
  return { id, kind: district === "hero" ? "hero" : "star", district, origin: { x, y, z: 0 }, radius: 6, depth: 6, seed: 1 };
}

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
});

describe("buildLayout", () => {
  const layout = buildLayout(worldProjects);

  it("places the hero and the four stars at their anchors", () => {
    expect(layout.islands.map((i) => i.id)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    for (const isl of layout.islands) {
      expect(isl.origin).toEqual(STAR_ANCHORS[isl.id].origin);
      expect(isl.radius).toBe(STAR_ANCHORS[isl.id].radius);
    }
    expect(layout.islands[0].kind).toBe("hero");
    expect(layout.islands[1].district).toBe("game");
  });

  it("tours the islands in the fixed order", () => {
    expect(layout.tourOrder).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
  });

  it("links consecutive islands with the crossing the rules pick", () => {
    expect(layout.crossings.map((c) => `${c.from}>${c.to}:${c.kind}`)).toEqual([
      "hero>gtid:bridge",
      "gtid>petak-umpet:bridge",
      "petak-umpet>orbit-store:minecart",
      "orbit-store>ezra-bot:bouncePads",
    ]);
    const first = layout.crossings[0];
    expect(first.a.y).toBe(STAR_ANCHORS.hero.origin.y + 1);
    expect(first.b.y).toBe(STAR_ANCHORS.gtid.origin.y + 1);
  });

  it("gives mini projects non-overlapping satellite slots", () => {
    const minis: WorldProject[] = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].map((id, i): WorldProject => ({
      id, title: id, year: 2025, line: "x", tags: [], tier: "mini", links: {},
      district: (["game", "discord", "web"] as const)[i % 3],
    }));
    const l = buildLayout([...worldProjects, ...minis]);
    const placed = l.islands.filter((i) => i.kind === "mini");
    expect(placed).toHaveLength(6);
    for (const m of placed) {
      for (const other of l.islands) {
        if (other === m) continue;
        const d = Math.hypot(other.origin.x - m.origin.x, other.origin.z - m.origin.z);
        expect(d).toBeGreaterThanOrEqual((other.radius + m.radius) * 1.25 + 3);
      }
    }
    expect(l.tourOrder).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/gen/layout.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/gen/layout`.

- [ ] **Step 3: Implement**

`src/world/engine/gen/layout.ts`:

```ts
import type { District, WorldProject } from "@/config/schema";
import { hashString } from "@/world/engine/gen/rng";
import type { Vec3, Vec3i } from "@/world/engine/types";

export type IslandKind = "hero" | "star" | "mini";
export interface IslandPlacement {
  id: string; kind: IslandKind; district: District | "hero";
  origin: Vec3i; radius: number; depth: number; seed: number;
}
export type CrossingKind = "bridge" | "bouncePads" | "minecart";
export interface Crossing { kind: CrossingKind; from: string; to: string; a: Vec3; b: Vec3 }
export interface WorldLayout { islands: IslandPlacement[]; crossings: Crossing[]; tourOrder: string[] }

type Anchor = { origin: Vec3i; radius: number; depth: number };

export const STAR_ANCHORS: Record<string, Anchor> = {
  hero: { origin: { x: 0, y: 0, z: 0 }, radius: 6, depth: 6 },
  gtid: { origin: { x: 22, y: 2, z: -8 }, radius: 9, depth: 7 },
  "petak-umpet": { origin: { x: 44, y: 3, z: -2 }, radius: 9, depth: 7 },
  "orbit-store": { origin: { x: 64, y: 10, z: -18 }, radius: 8, depth: 6 },
  "ezra-bot": { origin: { x: 84, y: 14, z: -12 }, radius: 8, depth: 6 },
};

export const TOUR_ORDER: readonly string[] = ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"];

export const DISTRICT_HUBS: Record<District, { origin: Vec3i; radius: number }> = {
  game: { origin: STAR_ANCHORS.gtid.origin, radius: STAR_ANCHORS.gtid.radius },
  discord: { origin: STAR_ANCHORS["orbit-store"].origin, radius: STAR_ANCHORS["orbit-store"].radius },
  web: { origin: { x: 66, y: 4, z: 22 }, radius: 6 },
};

export const MINI_RADIUS = 4;
export const MINI_DEPTH = 4;
const GOLDEN_ANGLE = 2.39996;

export function chooseCrossing(from: IslandPlacement, to: IslandPlacement): CrossingKind {
  if (from.district !== "hero" && to.district !== "hero" && from.district !== to.district) return "minecart";
  return Math.abs(to.origin.y - from.origin.y) > 2 ? "bouncePads" : "bridge";
}

/** Point on `from`'s rim toward `to`, at 0.75 × radius (always on grass: the rim never dips below 0.8 × radius). */
export function edgeAnchor(from: IslandPlacement, to: IslandPlacement): Vec3 {
  const dx = to.origin.x - from.origin.x;
  const dz = to.origin.z - from.origin.z;
  const len = Math.hypot(dx, dz) || 1;
  const reach = from.radius * 0.75;
  return { x: from.origin.x + (dx / len) * reach, y: from.origin.y + 1, z: from.origin.z + (dz / len) * reach };
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

function overlaps(island: IslandPlacement, origin: Vec3i, radius: number): boolean {
  const d = Math.hypot(island.origin.x - origin.x, island.origin.z - origin.z);
  return d < (island.radius + radius) * 1.25 + 3;
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

  const slots: Record<District, number> = { game: 0, discord: 0, web: 0 };
  for (const p of projects) {
    if (islands.some((i) => i.id === p.id)) continue;
    const hub = DISTRICT_HUBS[p.district];
    let origin = satelliteOrigin(hub.origin, hub.radius, slots[p.district]++);
    for (let guard = 0; guard < 64 && islands.some((i) => overlaps(i, origin, MINI_RADIUS)); guard++) {
      origin = satelliteOrigin(hub.origin, hub.radius, slots[p.district]++);
    }
    islands.push({ id: p.id, kind: "mini", district: p.district, origin, radius: MINI_RADIUS, depth: MINI_DEPTH, seed: hashString(p.id) });
  }

  const byId = new Map(islands.map((i) => [i.id, i]));
  const tourOrder = TOUR_ORDER.filter((id) => byId.has(id));
  const crossings: Crossing[] = [];
  for (let i = 0; i + 1 < tourOrder.length; i++) {
    const a = byId.get(tourOrder[i])!;
    const b = byId.get(tourOrder[i + 1])!;
    crossings.push({ kind: chooseCrossing(a, b), from: a.id, to: b.id, a: edgeAnchor(a, b), b: edgeAnchor(b, a) });
  }
  return { islands, crossings, tourOrder };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/gen/layout.test.ts`
Expected: PASS — `Tests  8 passed (8)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/gen/layout.ts src/world/engine/gen/layout.test.ts
git commit -q -F - <<'EOF'
feat: add world layout with districts and the crossing rule set

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 8: World build — stamp islands, run extra stamps, mesh per island

**Files:**
- Create: `src/world/engine/worldBuild.ts`
- Test: `src/world/engine/worldBuild.test.ts`

**Interfaces:**
- Consumes: `WorldLayout`, `generateIsland`, `IslandShape`, `VoxelGrid`, `blockId`, `buildBatch`, `InstanceBatch`, `mulberry32`.
- Produces: `BuiltWorld`, `buildWorld(layout, extraStamps?)`. Block ownership: a block belongs to the nearest island (by xz distance to origin) whose box (`|dx|,|dz| ≤ ceil(1.25·radius)+3`, `origin.y − depth − 1 ≤ y ≤ origin.y + 24`) contains it.

- [ ] **Step 1: Write the failing test**

`src/world/engine/worldBuild.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { blockId } from "@/world/engine/voxel/blocks";
import { buildBatch } from "@/world/engine/voxel/mesher";
import { buildWorld } from "@/world/engine/worldBuild";

const layout = buildLayout(worldProjects);

describe("buildWorld", () => {
  it("stamps every island at its origin with walkable air above", () => {
    const { grid, shapes } = buildWorld(layout);
    for (const isl of layout.islands) {
      expect(grid.isSolid(isl.origin.x, isl.origin.y, isl.origin.z)).toBe(true);
      expect(grid.isSolid(isl.origin.x, isl.origin.y + 1, isl.origin.z)).toBe(false);
      expect(shapes[isl.id].surface(0, 0)).toBe(0);
    }
  });

  it("meshes one non-empty batch per island", () => {
    const { batches } = buildWorld(layout);
    expect(Object.keys(batches).sort()).toEqual(layout.islands.map((i) => i.id).sort());
    for (const id of Object.keys(batches)) expect(batches[id].count).toBeGreaterThan(0);
  });

  it("never meshes a block twice", () => {
    const { grid, batches } = buildWorld(layout);
    const total = Object.values(batches).reduce((s, b) => s + b.count, 0);
    expect(total).toBe(buildBatch(grid, () => true, mulberry32(1)).count);
  });

  it("runs extra stamps before meshing", () => {
    const plain = buildWorld(layout);
    const stamped = buildWorld(layout, [
      (g) => g.set(0, 4, 0, blockId("crate")),
      (g) => g.set(1, 4, 0, blockId("barrier")),
    ]);
    expect(stamped.grid.isSolid(0, 4, 0)).toBe(true);
    expect(stamped.grid.isSolid(1, 4, 0)).toBe(true);
    expect(stamped.batches.hero.count).toBe(plain.batches.hero.count + 1);
  });

  it("is deterministic", () => {
    const a = buildWorld(layout), b = buildWorld(layout);
    expect(Array.from(a.batches.gtid.colors)).toEqual(Array.from(b.batches.gtid.colors));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/worldBuild.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/worldBuild`.

- [ ] **Step 3: Implement**

`src/world/engine/worldBuild.ts`:

```ts
import { generateIsland, type IslandShape } from "@/world/engine/gen/islandGen";
import type { IslandPlacement, WorldLayout } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { buildBatch, type InstanceBatch } from "@/world/engine/voxel/mesher";

export interface BuiltWorld { grid: VoxelGrid; batches: Record<string, InstanceBatch>; shapes: Record<string, IslandShape> }

function inBox(isl: IslandPlacement, x: number, y: number, z: number): boolean {
  const reach = Math.ceil(isl.radius * 1.25) + 3;
  return Math.abs(x - isl.origin.x) <= reach && Math.abs(z - isl.origin.z) <= reach
    && y >= isl.origin.y - isl.depth - 1 && y <= isl.origin.y + 24;
}

export function buildWorld(layout: WorldLayout, extraStamps: Array<(grid: VoxelGrid) => void> = []): BuiltWorld {
  const grid = new VoxelGrid();
  const shapes: Record<string, IslandShape> = {};
  for (const isl of layout.islands) {
    const shape = generateIsland({ radius: isl.radius, depth: isl.depth, seed: isl.seed });
    shapes[isl.id] = shape;
    for (const c of shape.cells) grid.set(isl.origin.x + c.x, isl.origin.y + c.y, isl.origin.z + c.z, blockId(c.block));
  }
  for (const stamp of extraStamps) stamp(grid);

  const owner = (x: number, y: number, z: number): string | null => {
    let best: string | null = null;
    let bestD = Infinity;
    for (const isl of layout.islands) {
      if (!inBox(isl, x, y, z)) continue;
      const d = Math.hypot(x - isl.origin.x, z - isl.origin.z);
      if (d < bestD) { bestD = d; best = isl.id; }
    }
    return best;
  };

  const batches: Record<string, InstanceBatch> = {};
  for (const isl of layout.islands) {
    batches[isl.id] = buildBatch(grid, (x, y, z) => owner(x, y, z) === isl.id, mulberry32(isl.seed));
  }
  return { grid, batches, shapes };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/worldBuild.test.ts`
Expected: PASS — `Tests  5 passed (5)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/worldBuild.ts src/world/engine/worldBuild.test.ts
git commit -q -F - <<'EOF'
feat: build the voxel world grid and per-island batches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 9: Character physics — AABB vs grid, step-up, coyote time, jump buffer

**Files:**
- Create: `src/world/engine/physics/character.ts`
- Test: `src/world/engine/physics/character.test.ts`

**Interfaces:**
- Consumes: `Vec3`, `IsSolid`, `VoxelGrid` + `blockId` (tests only).
- Produces: `CharacterParams`, `DEFAULT_PARAMS`, `CharacterState`, `CharacterInput`, `StepResult`, `createCharacter(pos)`, `stepCharacter(s, input, dt, world, p?)`, `respawn(s)`, `characterCollides(isSolid, x, y, z, p?)`. Fixed internal substep 1/120 s; `dt` is clamped to 0.1 s; air control 0.6 × accel; terminal fall speed 40.

- [ ] **Step 1: Write the failing test**

`src/world/engine/physics/character.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS, characterCollides, createCharacter, respawn, stepCharacter,
  type CharacterInput, type CharacterState, type StepResult,
} from "@/world/engine/physics/character";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";

const FRAME = 1 / 60;
const idle: CharacterInput = { moveX: 0, moveZ: 0, run: false, jump: false };

/** Ground slab: blocks at y = 0 for x, z in [-10, 10] → walkable surface at y = 1. */
function ground(): VoxelGrid {
  const g = new VoxelGrid();
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) g.set(x, 0, z, blockId("stone"));
  return g;
}

function run(s: CharacterState, g: VoxelGrid, input: CharacterInput, seconds: number, killY = -20): StepResult[] {
  const results: StepResult[] = [];
  for (let t = 0; t < seconds - 1e-9; t += FRAME) results.push(stepCharacter(s, input, FRAME, { isSolid: g.isSolid, killY }));
  return results;
}

function settled(g: VoxelGrid, x = 0.5, z = 0.5): CharacterState {
  const s = createCharacter({ x, y: 1, z });
  run(s, g, idle, 0.1);
  return s;
}

describe("character basics", () => {
  it("lands and stays on the ground", () => {
    const g = ground();
    const s = createCharacter({ x: 0.5, y: 1.4, z: 0.5 });
    const res = run(s, g, idle, 0.5);
    expect(res.some((r) => r.landed)).toBe(true);
    expect(s.onGround).toBe(true);
    expect(s.pos.y).toBeCloseTo(1, 6);
  });

  it("walks at walk speed and runs faster", () => {
    const g = ground();
    const walk = settled(g), runner = settled(g);
    run(walk, g, { ...idle, moveX: 1 }, 1);
    run(runner, g, { ...idle, moveX: 1, run: true }, 1);
    expect(walk.vel.x).toBeCloseTo(DEFAULT_PARAMS.walkSpeed, 3);
    expect(runner.vel.x).toBeCloseTo(DEFAULT_PARAMS.runSpeed, 3);
    expect(runner.pos.x).toBeGreaterThan(walk.pos.x);
  });

  it("characterCollides detects blocks overlapping the body", () => {
    const g = ground();
    expect(characterCollides(g.isSolid, 0.5, 1, 0.5)).toBe(false);
    expect(characterCollides(g.isSolid, 0.5, 0.9, 0.5)).toBe(true);
  });
});

describe("walls and steps", () => {
  it("slides along a wall instead of stopping", () => {
    const g = ground();
    for (let z = -10; z <= 10; z++) for (let y = 1; y <= 3; y++) g.set(2, y, z, blockId("stone"));
    const s = settled(g);
    run(s, g, { ...idle, moveX: Math.SQRT1_2, moveZ: Math.SQRT1_2 }, 1);
    expect(s.pos.x).toBeLessThanOrEqual(2 - DEFAULT_PARAMS.width / 2 + 1e-3);
    expect(s.pos.x).toBeGreaterThan(1.6);
    expect(s.pos.z).toBeGreaterThan(2);
  });

  it("climbs a 1-block step without jumping", () => {
    const g = ground();
    for (let z = -10; z <= 10; z++) for (let x = 2; x <= 4; x++) g.set(x, 1, z, blockId("stone"));
    const s = settled(g);
    const res = run(s, g, { ...idle, moveX: 1 }, 0.8);
    expect(res.some((r) => r.stepped)).toBe(true);
    expect(s.pos.x).toBeGreaterThan(2.5);
    expect(s.pos.y).toBeCloseTo(2, 6);
  });

  it("does not climb a 2-block wall", () => {
    const g = ground();
    for (let z = -10; z <= 10; z++) { g.set(2, 1, z, blockId("stone")); g.set(2, 2, z, blockId("stone")); }
    const s = settled(g);
    run(s, g, { ...idle, moveX: 1 }, 1);
    expect(s.pos.x).toBeLessThanOrEqual(2 - DEFAULT_PARAMS.width / 2 + 1e-3);
    expect(s.pos.y).toBeCloseTo(1, 6);
  });
});

describe("jumping", () => {
  it("reaches an apex of about 1.5 blocks", () => {
    const g = ground();
    const s = settled(g);
    stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    let peak = s.pos.y;
    for (let i = 0; i < 60; i++) {
      stepCharacter(s, idle, FRAME, { isSolid: g.isSolid, killY: -20 });
      peak = Math.max(peak, s.pos.y);
    }
    expect(peak - 1).toBeGreaterThan(1.35);
    expect(peak - 1).toBeLessThan(1.6);
  });

  it("allows a jump within coyote time after leaving the ground", () => {
    const g = new VoxelGrid();
    const s = createCharacter({ x: 0, y: 5, z: 0 });
    s.sinceGround = 0.05;
    const r = stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    expect(r.jumped).toBe(true);
    expect(s.vel.y).toBeGreaterThan(8);
  });

  it("refuses a jump after coyote time has passed", () => {
    const g = new VoxelGrid();
    const s = createCharacter({ x: 0, y: 5, z: 0 });
    s.sinceGround = 0.2;
    const r = stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    expect(r.jumped).toBe(false);
    expect(s.vel.y).toBeLessThan(0);
  });

  it("buffers a jump pressed just before landing", () => {
    const g = ground();
    const s = createCharacter({ x: 0.5, y: 1.3, z: 0.5 });
    s.vel.y = -3;
    s.sinceGround = 1;
    const res = [stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 })];
    res.push(...run(s, g, idle, 0.3));
    expect(res.some((r) => r.jumped)).toBe(true);
    expect(s.pos.y).toBeGreaterThan(1.5);
  });

  it("forgets a jump pressed too early", () => {
    const g = ground();
    const s = createCharacter({ x: 0.5, y: 3, z: 0.5 });
    s.sinceGround = 1;
    const res = [stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 })];
    res.push(...run(s, g, idle, 0.6));
    expect(res.some((r) => r.jumped)).toBe(false);
    expect(s.pos.y).toBeCloseTo(1, 6);
  });
});

describe("falling and safety", () => {
  it("tracks the last safe position while grounded", () => {
    const g = ground();
    const s = settled(g, 3.5, -2.5);
    expect(s.lastSafe).toEqual({ x: 3.5, y: 1, z: -2.5 });
  });

  it("reports fellOut below killY and respawns at the last safe spot", () => {
    const g = new VoxelGrid();
    g.set(0, 0, 0, blockId("stone"));
    const s = settled(g);
    const res = run(s, g, { ...idle, moveX: 1 }, 2.5, -5);
    expect(res.some((r) => r.fellOut)).toBe(true);
    expect(s.pos.y).toBeLessThan(-5);
    expect(s.lastSafe.y).toBe(1);
    respawn(s);
    expect(s.pos).toEqual(s.lastSafe);
    expect(s.vel).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("ignores input and gravity while locked", () => {
    const g = new VoxelGrid();
    const s = createCharacter({ x: 0, y: 5, z: 0 });
    s.locked = true;
    const r = stepCharacter(s, { moveX: 1, moveZ: 1, run: true, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    expect(r).toEqual({ landed: false, jumped: false, fellOut: false, stepped: false });
    expect(s.pos).toEqual({ x: 0, y: 5, z: 0 });
    expect(s.vel).toEqual({ x: 0, y: 0, z: 0 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/physics/character.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/physics/character`.

- [ ] **Step 3: Implement**

`src/world/engine/physics/character.ts`:

```ts
import type { IsSolid, Vec3 } from "@/world/engine/types";

export interface CharacterParams {
  width: number; height: number; walkSpeed: number; runSpeed: number; accel: number;
  gravity: number; jumpSpeed: number; stepHeight: number; coyoteTime: number; jumpBuffer: number;
}

export const DEFAULT_PARAMS: CharacterParams = {
  width: 0.6, height: 1.8, walkSpeed: 4.5, runSpeed: 7.5, accel: 30, gravity: 30, jumpSpeed: 9.5,
  stepHeight: 1, coyoteTime: 0.1, jumpBuffer: 0.12,
};

export interface CharacterState {
  pos: Vec3; vel: Vec3; onGround: boolean; sinceGround: number; jumpTimer: number;
  lastSafe: Vec3; locked: boolean;
}
export interface CharacterInput { moveX: number; moveZ: number; run: boolean; jump: boolean }
export interface StepResult { landed: boolean; jumped: boolean; fellOut: boolean; stepped: boolean }

const SUBSTEP = 1 / 120;
const MAX_DT = 0.1;
const EPS = 1e-6;
const SKIN = 1e-4;
const MAX_FALL = 40;
const AIR_CONTROL = 0.6;

export function createCharacter(pos: Vec3): CharacterState {
  return {
    pos: { ...pos }, vel: { x: 0, y: 0, z: 0 }, onGround: false, sinceGround: 0, jumpTimer: 0,
    lastSafe: { ...pos }, locked: false,
  };
}

/** Does the character's AABB (feet centre at x, y, z) overlap any solid block? */
export function characterCollides(isSolid: IsSolid, x: number, y: number, z: number, p: CharacterParams = DEFAULT_PARAMS): boolean {
  const hw = p.width / 2;
  const x0 = Math.floor(x - hw + EPS), x1 = Math.floor(x + hw - EPS);
  const y0 = Math.floor(y + EPS), y1 = Math.floor(y + p.height - EPS);
  const z0 = Math.floor(z - hw + EPS), z1 = Math.floor(z + hw - EPS);
  for (let bx = x0; bx <= x1; bx++) {
    for (let by = y0; by <= y1; by++) {
      for (let bz = z0; bz <= z1; bz++) {
        if (isSolid(bx, by, bz)) return true;
      }
    }
  }
  return false;
}

function approach(v: number, target: number, maxDelta: number): number {
  return v < target ? Math.min(v + maxDelta, target) : Math.max(v - maxDelta, target);
}

/** Moves along x or z; tries a ≤ stepHeight step-up when grounded, else snaps to the blocking face. Returns true if it stepped. */
function moveAxis(s: CharacterState, axis: "x" | "z", delta: number, isSolid: IsSolid, p: CharacterParams, canStep: boolean): boolean {
  if (delta === 0) return false;
  const pos = s.pos;
  const nx = axis === "x" ? pos.x + delta : pos.x;
  const nz = axis === "z" ? pos.z + delta : pos.z;
  if (!characterCollides(isSolid, nx, pos.y, nz, p)) {
    pos.x = nx; pos.z = nz;
    return false;
  }
  if (canStep) {
    const stepY = Math.floor(pos.y + SKIN) + 1;
    if (stepY - pos.y <= p.stepHeight + SKIN
      && !characterCollides(isSolid, pos.x, stepY, pos.z, p)
      && !characterCollides(isSolid, nx, stepY, nz, p)) {
      pos.x = nx; pos.z = nz; pos.y = stepY;
      return true;
    }
  }
  const hw = p.width / 2;
  const cur = pos[axis];
  const target = cur + delta;
  const contact = delta > 0 ? Math.floor(target + hw - EPS) - hw - SKIN : Math.floor(target - hw + EPS) + 1 + hw + SKIN;
  const cx = axis === "x" ? contact : pos.x;
  const cz = axis === "z" ? contact : pos.z;
  const forward = delta > 0 ? contact > cur : contact < cur;
  if (forward && !characterCollides(isSolid, cx, pos.y, cz, p)) { pos.x = cx; pos.z = cz; }
  s.vel[axis] = 0;
  return false;
}

export function stepCharacter(
  s: CharacterState, input: CharacterInput, dt: number,
  world: { isSolid: IsSolid; killY: number }, p: CharacterParams = DEFAULT_PARAMS,
): StepResult {
  const res: StepResult = { landed: false, jumped: false, fellOut: false, stepped: false };
  if (s.locked) return res;
  if (input.jump) s.jumpTimer = p.jumpBuffer;

  let mx = input.moveX, mz = input.moveZ;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const speed = input.run ? p.runSpeed : p.walkSpeed;

  const total = Math.min(Math.max(dt, 0), MAX_DT);
  const steps = Math.max(1, Math.ceil(total / SUBSTEP - 1e-9));
  const h = total / steps;

  for (let i = 0; i < steps; i++) {
    const control = s.onGround ? 1 : AIR_CONTROL;
    s.vel.x = approach(s.vel.x, mx * speed, p.accel * control * h);
    s.vel.z = approach(s.vel.z, mz * speed, p.accel * control * h);

    if (s.jumpTimer > 0 && (s.onGround || s.sinceGround <= p.coyoteTime)) {
      s.vel.y = p.jumpSpeed;
      s.onGround = false;
      s.sinceGround = p.coyoteTime + 1;
      s.jumpTimer = 0;
      res.jumped = true;
    }
    s.jumpTimer = Math.max(0, s.jumpTimer - h);
    s.vel.y = Math.max(s.vel.y - p.gravity * h, -MAX_FALL);

    const canStep = s.onGround;
    if (moveAxis(s, "x", s.vel.x * h, world.isSolid, p, canStep)) res.stepped = true;
    if (moveAxis(s, "z", s.vel.z * h, world.isSolid, p, canStep)) res.stepped = true;

    const wasGround = s.onGround;
    const ny = s.pos.y + s.vel.y * h;
    if (!characterCollides(world.isSolid, s.pos.x, ny, s.pos.z, p)) {
      s.pos.y = ny;
      s.onGround = false;
    } else if (s.vel.y < 0) {
      const landY = Math.floor(ny + EPS) + 1;
      if (landY <= s.pos.y + SKIN && !characterCollides(world.isSolid, s.pos.x, landY, s.pos.z, p)) s.pos.y = landY;
      s.vel.y = 0;
      s.onGround = true;
      if (!wasGround) res.landed = true;
    } else {
      const head = Math.floor(ny + p.height - EPS);
      const cy = head - p.height - SKIN;
      if (cy >= s.pos.y - SKIN && !characterCollides(world.isSolid, s.pos.x, cy, s.pos.z, p)) s.pos.y = cy;
      s.vel.y = 0;
    }

    if (s.onGround) {
      s.sinceGround = 0;
      s.lastSafe.x = s.pos.x; s.lastSafe.y = s.pos.y; s.lastSafe.z = s.pos.z;
    } else {
      s.sinceGround += h;
    }
  }

  if (s.pos.y < world.killY) res.fellOut = true;
  return res;
}

export function respawn(s: CharacterState): void {
  s.pos.x = s.lastSafe.x; s.pos.y = s.lastSafe.y; s.pos.z = s.lastSafe.z;
  s.vel.x = 0; s.vel.y = 0; s.vel.z = 0;
  s.onGround = false;
  s.sinceGround = 0;
  s.jumpTimer = 0;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/physics/character.test.ts`
Expected: PASS — `Tests  14 passed (14)`.

If "lands and stays on the ground" fails because `settled()` hasn't landed, check that `createCharacter` starts with `onGround: false` and that the vertical branch snaps `landY` — do not loosen the test.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/physics/character.ts src/world/engine/physics/character.test.ts
git commit -q -F - <<'EOF'
feat: add voxel character physics with step-up, coyote time and jump buffer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 10: Bounce-pad ballistic solver

**Files:**
- Create: `src/world/engine/traversal/ballistic.ts`
- Test: `src/world/engine/traversal/ballistic.test.ts`

**Interfaces:**
- Consumes: `Vec3`.
- Produces: `solveLaunch(from, to, gravity, apexAbove)` → `{ vel, time }` with apex = `max(from.y, to.y) + apexAbove`; `positionAt(from, vel, gravity, t)`.

- [ ] **Step 1: Write the failing test**

`src/world/engine/traversal/ballistic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { positionAt, solveLaunch } from "@/world/engine/traversal/ballistic";

const G = 30;
const low = { x: 58.5, y: 11, z: -15.2 };
const high = { x: 78.1, y: 15, z: -13.4 };

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe("solveLaunch", () => {
  for (const [name, from, to] of [["up", low, high], ["down", high, low]] as const) {
    it(`lands on the target (${name})`, () => {
      const { vel, time } = solveLaunch(from, to, G, 3);
      expect(time).toBeGreaterThan(0);
      expect(dist(positionAt(from, vel, G, time), to)).toBeLessThan(0.1);
    });

    it(`peaks at the requested apex (${name})`, () => {
      const { vel } = solveLaunch(from, to, G, 3);
      const tPeak = vel.y / G;
      expect(positionAt(from, vel, G, tPeak).y).toBeCloseTo(Math.max(from.y, to.y) + 3, 6);
    });

    it(`lands within 0.1 block when integrated at 120 Hz (${name})`, () => {
      const { vel, time } = solveLaunch(from, to, G, 3);
      const p = { ...from }, v = { ...vel };
      const h = 1 / 120;
      const full = Math.floor(time / h);
      const advance = (dt: number) => {
        p.x += v.x * dt; p.z += v.z * dt;
        p.y += v.y * dt - 0.5 * G * dt * dt;
        v.y -= G * dt;
      };
      for (let i = 0; i < full; i++) advance(h);
      advance(time - full * h);                       // the frame on which the driver snaps to "landed"
      expect(dist(p, to)).toBeLessThan(0.1);
    });
  }

  it("keeps horizontal speed constant", () => {
    const { vel } = solveLaunch(low, high, G, 3);
    const a = positionAt(low, vel, G, 0.1), b = positionAt(low, vel, G, 0.2), c = positionAt(low, vel, G, 0.3);
    expect(b.x - a.x).toBeCloseTo(c.x - b.x, 9);
    expect(b.z - a.z).toBeCloseTo(c.z - b.z, 9);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/traversal/ballistic.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/traversal/ballistic`.

- [ ] **Step 3: Implement**

`src/world/engine/traversal/ballistic.ts`:

```ts
import type { Vec3 } from "@/world/engine/types";

/** Launch velocity that passes the apex (max(from.y, to.y) + apexAbove) and lands exactly on `to`. */
export function solveLaunch(from: Vec3, to: Vec3, gravity: number, apexAbove: number): { vel: Vec3; time: number } {
  const apex = Math.max(from.y, to.y) + Math.max(apexAbove, 0.01);
  const vy = Math.sqrt(2 * gravity * (apex - from.y));
  const tUp = vy / gravity;
  const tDown = Math.sqrt((2 * (apex - to.y)) / gravity);
  const time = tUp + tDown;
  return { vel: { x: (to.x - from.x) / time, y: vy, z: (to.z - from.z) / time }, time };
}

export function positionAt(from: Vec3, vel: Vec3, gravity: number, t: number): Vec3 {
  return { x: from.x + vel.x * t, y: from.y + vel.y * t - 0.5 * gravity * t * t, z: from.z + vel.z * t };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/traversal/ballistic.test.ts`
Expected: PASS — `Tests  7 passed (7)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/traversal/ballistic.ts src/world/engine/traversal/ballistic.test.ts
git commit -q -F - <<'EOF'
feat: add bounce pad launch solver

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 11: Minecart rail curve

**Files:**
- Create: `src/world/engine/traversal/rail.ts`
- Test: `src/world/engine/traversal/rail.test.ts`

**Interfaces:**
- Consumes: `Vec3`.
- Produces: `Rail`, `buildRail(a, b, dip, segments = 8)` (straight line with `y` lowered by `dip·sin(πu)`), `railPoint(rail, u)` (uniform Catmull-Rom, mirrored end points), `railTangent(rail, u)` (unit), `rideProgress(t, duration)` (smoothstep, clamped). Also reused by `camera/tourPath.ts`.

- [ ] **Step 1: Write the failing test**

`src/world/engine/traversal/rail.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildRail, railPoint, railTangent, rideProgress } from "@/world/engine/traversal/rail";

const a = { x: 50.75, y: 4, z: -0.3 };
const b = { x: 58.0, y: 11, z: -14.8 };

describe("buildRail / railPoint", () => {
  const rail = buildRail(a, b, 2);

  it("starts and ends at the stations", () => {
    expect(railPoint(rail, 0)).toEqual(a);
    const end = railPoint(rail, 1);
    expect(end.x).toBeCloseTo(b.x, 9);
    expect(end.y).toBeCloseTo(b.y, 9);
    expect(end.z).toBeCloseTo(b.z, 9);
  });

  it("dips below the straight line in the middle", () => {
    const mid = railPoint(rail, 0.5);
    expect(mid.y).toBeCloseTo((a.y + b.y) / 2 - 2, 9);
  });

  it("is the same curve in both directions", () => {
    const back = buildRail(b, a, 2);
    for (const u of [0, 0.13, 0.5, 0.77, 1]) {
      const p = railPoint(rail, u), q = railPoint(back, 1 - u);
      expect(p.x).toBeCloseTo(q.x, 9);
      expect(p.y).toBeCloseTo(q.y, 9);
      expect(p.z).toBeCloseTo(q.z, 9);
    }
  });

  it("clamps u outside [0, 1]", () => {
    expect(railPoint(rail, -1)).toEqual(railPoint(rail, 0));
    expect(railPoint(rail, 2)).toEqual(railPoint(rail, 1));
  });
});

describe("railTangent", () => {
  it("is a unit vector pointing toward the far station", () => {
    const rail = buildRail(a, b, 2);
    const t = railTangent(rail, 0.3);
    expect(Math.hypot(t.x, t.y, t.z)).toBeCloseTo(1, 9);
    const dir = { x: b.x - a.x, z: b.z - a.z };
    expect(t.x * dir.x + t.z * dir.z).toBeGreaterThan(0);
  });
});

describe("rideProgress", () => {
  it("eases in and out between 0 and 1", () => {
    expect(rideProgress(0, 5)).toBe(0);
    expect(rideProgress(2.5, 5)).toBeCloseTo(0.5, 9);
    expect(rideProgress(5, 5)).toBe(1);
    expect(rideProgress(9, 5)).toBe(1);
    expect(rideProgress(-1, 5)).toBe(0);
    expect(rideProgress(0.5, 5)).toBeLessThan(0.1);
    let prev = 0;
    for (let t = 0; t <= 5; t += 0.1) { const v = rideProgress(t, 5); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/traversal/rail.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/traversal/rail`.

- [ ] **Step 3: Implement**

`src/world/engine/traversal/rail.ts`:

```ts
import type { Vec3 } from "@/world/engine/types";

export interface Rail { points: Vec3[] }

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function buildRail(a: Vec3, b: Vec3, dip: number, segments = 8): Rail {
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    points.push({
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u - dip * Math.sin(Math.PI * u),
      z: a.z + (b.z - a.z) * u,
    });
  }
  return { points };
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Uniform Catmull-Rom through rail.points; u ∈ [0, 1] across the whole rail. */
export function railPoint(rail: Rail, u: number): Vec3 {
  const P = rail.points;
  const n = P.length;
  if (n === 1) return { ...P[0] };
  const f = clamp01(u) * (n - 1);
  const i = Math.min(Math.floor(f), n - 2);
  const t = f - i;
  const p1 = P[i], p2 = P[i + 1];
  const p0 = i > 0 ? P[i - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y, z: 2 * p1.z - p2.z };
  const p3 = i + 2 < n ? P[i + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y, z: 2 * p2.z - p1.z };
  return { x: cr(p0.x, p1.x, p2.x, p3.x, t), y: cr(p0.y, p1.y, p2.y, p3.y, t), z: cr(p0.z, p1.z, p2.z, p3.z, t) };
}

export function railTangent(rail: Rail, u: number): Vec3 {
  const h = 1e-3;
  const a = railPoint(rail, Math.max(0, u - h));
  const b = railPoint(rail, Math.min(1, u + h));
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

export function rideProgress(t: number, duration: number): number {
  if (duration <= 0) return 1;
  const x = clamp01(t / duration);
  return x * x * (3 - 2 * x);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/traversal/rail.test.ts`
Expected: PASS — `Tests  6 passed (6)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/traversal/rail.ts src/world/engine/traversal/rail.test.ts
git commit -q -F - <<'EOF'
feat: add minecart rail curve and ride easing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 12: Tour path — continuous camera spline with dwell zones

**Files:**
- Create: `src/world/engine/camera/tourPath.ts`
- Test: `src/world/engine/camera/tourPath.test.ts`

**Interfaces:**
- Consumes: `Vec3`, `railPoint` (rail.ts).
- Produces: `TourStop`, `TourSample`, `TourPath` (`stops`, `via`, `totalWeight`, plus `controls`, `stopIndex`), `TRAVEL_WEIGHT`, `buildTourPath(stops, via?)`, `samplePath(path, progress)`, `stopProgress(path, index)`, `nearestProgress(path, point)`.

How it works: one Catmull-Rom spline through every stop camera and the `via` points between them. Scroll weight is laid out as `[dwell 0][travel 0][dwell 1]…[dwell n-1]`. A dwell zone covers a small window of the curve (±0.15 control segments around its stop, one-sided at the ends), so lots of scroll moves the camera a little but never zero; a travel zone (weight 1) covers the rest. The look-at target blends stop targets with smoothstep.

- [ ] **Step 1: Write the failing test**

`src/world/engine/camera/tourPath.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTourPath, nearestProgress, samplePath, stopProgress, type TourStop } from "@/world/engine/camera/tourPath";

const stops: TourStop[] = [
  { id: "hero", camera: { x: -10, y: 8, z: 12 }, target: { x: 0, y: 1, z: 0 }, dwell: 1 },
  { id: "gtid", camera: { x: 12, y: 10, z: 6 }, target: { x: 22, y: 3, z: -8 }, dwell: 1.5 },
  { id: "petak", camera: { x: 34, y: 11, z: 12 }, target: { x: 44, y: 4, z: -2 }, dwell: 1 },
];
const via = [[], [{ x: 24, y: 13, z: 12 }]];
const path = buildTourPath(stops, via);
const d = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe("buildTourPath", () => {
  it("weights dwell zones plus one travel weight per gap", () => {
    expect(path.totalWeight).toBeCloseTo(1 + 1.5 + 1 + 2, 9);
    expect(path.controls).toHaveLength(4);
    expect(path.stopIndex).toEqual([0, 1, 3]);
  });

  it("needs at least two stops", () => {
    expect(() => buildTourPath([stops[0]])).toThrow();
  });
});

describe("samplePath", () => {
  it("starts and ends exactly on the first and last stop", () => {
    expect(d(samplePath(path, 0).camera, stops[0].camera)).toBeLessThan(1e-9);
    expect(d(samplePath(path, 1).camera, stops[2].camera)).toBeLessThan(1e-9);
    expect(d(samplePath(path, 0).target, stops[0].target)).toBeLessThan(1e-9);
  });

  it("is continuous", () => {
    let prev = samplePath(path, 0).camera, worst = 0;
    for (let i = 1; i <= 2000; i++) {
      const c = samplePath(path, i / 2000).camera;
      worst = Math.max(worst, d(c, prev));
      prev = c;
    }
    expect(worst).toBeLessThan(0.2);
  });

  it("never stands still inside a dwell zone", () => {
    const centre = stopProgress(path, 1);
    const span = 1.5 / path.totalWeight;
    const a = samplePath(path, centre - span * 0.3).camera, b = samplePath(path, centre + span * 0.3).camera;
    expect(d(a, b)).toBeGreaterThan(1e-3);
  });

  it("moves slower in dwell zones than in travel zones", () => {
    // weight layout: dwell0 [0,1] · travel0 [1,2] · dwell1 [2,3.5] · travel1 [3.5,4.5] · dwell2 [4.5,5.5]
    const w = path.totalWeight;
    const dwellA = samplePath(path, (2 + 0.2) / w).camera, dwellB = samplePath(path, (2 + 1.3) / w).camera;
    const travelA = samplePath(path, (3.5 + 0.2) / w).camera, travelB = samplePath(path, (3.5 + 0.8) / w).camera;
    const dwellSpeed = d(dwellA, dwellB) / (1.1 / w);
    const travelSpeed = d(travelA, travelB) / (0.6 / w);
    expect(dwellSpeed).toBeLessThan(travelSpeed / 3);
  });

  it("passes through via points", () => {
    const p = nearestProgress(path, via[1][0]);
    expect(d(samplePath(path, p).camera, via[1][0])).toBeLessThan(0.05);
  });

  it("reports chapters in order", () => {
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const s = samplePath(path, i / 100);
      expect(s.chapter).toBeGreaterThanOrEqual(last);
      expect(s.chapterProgress).toBeGreaterThanOrEqual(0);
      expect(s.chapterProgress).toBeLessThanOrEqual(1);
      last = s.chapter;
    }
    expect(samplePath(path, stopProgress(path, 1)).chapter).toBe(1);
  });
});

describe("stopProgress / nearestProgress", () => {
  it("lands the camera on each stop", () => {
    for (let i = 0; i < stops.length; i++) {
      expect(d(samplePath(path, stopProgress(path, i)).camera, stops[i].camera)).toBeLessThan(1e-6);
      expect(d(samplePath(path, stopProgress(path, i)).target, stops[i].target)).toBeLessThan(1e-6);
    }
  });

  it("finds the progress nearest a point", () => {
    expect(Math.abs(nearestProgress(path, stops[1].camera) - stopProgress(path, 1))).toBeLessThan(0.03);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/camera/tourPath.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/camera/tourPath`.

- [ ] **Step 3: Implement**

`src/world/engine/camera/tourPath.ts`:

```ts
import { railPoint } from "@/world/engine/traversal/rail";
import type { Vec3 } from "@/world/engine/types";

export interface TourStop { id: string; camera: Vec3; target: Vec3; dwell: number }
export interface TourSample { camera: Vec3; target: Vec3; chapter: number; chapterProgress: number }
export interface TourPath { stops: TourStop[]; via: Vec3[][]; totalWeight: number; controls: Vec3[]; stopIndex: number[] }

export const TRAVEL_WEIGHT = 1;
const DELTA = 0.15;   // half-width of a dwell window, in control-point segments

interface Zone { kind: "dwell" | "travel"; index: number; w0: number; w1: number; c0: number; c1: number }

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

export function buildTourPath(stops: TourStop[], via: Vec3[][] = []): TourPath {
  if (stops.length < 2) throw new Error("tour path needs at least two stops");
  if (stops.some((s) => !(s.dwell > 0))) throw new Error("every tour stop needs a dwell weight > 0");
  const controls: Vec3[] = [];
  const stopIndex: number[] = [];
  stops.forEach((s, i) => {
    stopIndex.push(controls.length);
    controls.push(s.camera);
    if (i < stops.length - 1) for (const v of via[i] ?? []) controls.push(v);
  });
  const totalWeight = stops.reduce((sum, s) => sum + s.dwell, 0) + (stops.length - 1) * TRAVEL_WEIGHT;
  return { stops, via, totalWeight, controls, stopIndex };
}

function zones(path: TourPath): Zone[] {
  const { stops, stopIndex: k } = path;
  const n = stops.length;
  const out: Zone[] = [];
  let w = 0;
  for (let i = 0; i < n; i++) {
    const lo = i > 0 ? k[i] - DELTA : k[i];
    const hi = i < n - 1 ? k[i] + DELTA : k[i];
    out.push({ kind: "dwell", index: i, w0: w, w1: w + stops[i].dwell, c0: lo, c1: hi });
    w += stops[i].dwell;
    if (i < n - 1) {
      out.push({ kind: "travel", index: i, w0: w, w1: w + TRAVEL_WEIGHT, c0: k[i] + DELTA, c1: k[i + 1] - DELTA });
      w += TRAVEL_WEIGHT;
    }
  }
  return out;
}

function curveAt(path: TourPath, c: number): Vec3 {
  return railPoint({ points: path.controls }, c / (path.controls.length - 1));
}

function targetAt(path: TourPath, c: number): Vec3 {
  const { stops, stopIndex: k } = path;
  let i = 0;
  while (i < k.length - 2 && c >= k[i + 1]) i++;
  const seg = clamp01((c - k[i]) / (k[i + 1] - k[i]));
  return lerp3(stops[i].target, stops[i + 1].target, seg * seg * (3 - 2 * seg));
}

export function samplePath(path: TourPath, progress: number): TourSample {
  const W = clamp01(progress) * path.totalWeight;
  const zs = zones(path);
  const zone = zs.find((z) => W <= z.w1) ?? zs[zs.length - 1];
  const f = zone.w1 > zone.w0 ? (W - zone.w0) / (zone.w1 - zone.w0) : 0;
  const c = zone.c0 + (zone.c1 - zone.c0) * f;

  const travels = zs.filter((z) => z.kind === "travel");
  const n = path.stops.length;
  let chapter = n - 1;
  let start = 0, end = path.totalWeight;
  for (let i = 0; i < n; i++) {
    const s = i === 0 ? 0 : (travels[i - 1].w0 + travels[i - 1].w1) / 2;
    const e = i === n - 1 ? path.totalWeight : (travels[i].w0 + travels[i].w1) / 2;
    if (W < e || i === n - 1) { chapter = i; start = s; end = e; break; }
  }
  return { camera: curveAt(path, c), target: targetAt(path, c), chapter, chapterProgress: clamp01((W - start) / (end - start)) };
}

export function stopProgress(path: TourPath, index: number): number {
  const n = path.stops.length;
  if (index <= 0) return 0;
  if (index >= n - 1) return 1;
  const zone = zones(path).find((z) => z.kind === "dwell" && z.index === index)!;
  return (zone.w0 + zone.w1) / 2 / path.totalWeight;
}

export function nearestProgress(path: TourPath, point: Vec3): number {
  const dist2 = (p: number) => {
    const c = samplePath(path, p).camera;
    return (c.x - point.x) ** 2 + (c.y - point.y) ** 2 + (c.z - point.z) ** 2;
  };
  const COARSE = 400, FINE = 400;
  let best = 0, bestD = Infinity;
  for (let i = 0; i <= COARSE; i++) {
    const p = i / COARSE, dd = dist2(p);
    if (dd < bestD) { bestD = dd; best = p; }
  }
  const lo = Math.max(0, best - 1 / COARSE), hi = Math.min(1, best + 1 / COARSE);
  for (let i = 0; i <= FINE; i++) {
    const p = lo + ((hi - lo) * i) / FINE, dd = dist2(p);
    if (dd < bestD) { bestD = dd; best = p; }
  }
  return best;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/camera/tourPath.test.ts`
Expected: PASS — `Tests  10 passed (10)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/camera/tourPath.ts src/world/engine/camera/tourPath.test.ts
git commit -q -F - <<'EOF'
feat: add continuous tour camera path with dwell zones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 13: Third-person follow camera

**Files:**
- Create: `src/world/engine/camera/followCam.ts`
- Test: `src/world/engine/camera/followCam.test.ts`

**Interfaces:**
- Consumes: `Vec3`.
- Produces: `FollowCam`, `createFollowCam()` (`{ yaw: 0, pitch: 0.35, distance: 7 }`), `updateFollowCam(cam, target, heading, moving, dt, input)` → `{ position, lookAt }`. Heading convention: `heading = atan2(dir.x, dir.z)` (0 faces +z). Camera offset = `(sin yaw·cos pitch, sin pitch, cos yaw·cos pitch)·distance` from `lookAt = target + (0, 1.4, 0)`. Pitch clamped to [0.05, 1.2], distance to [3, 14]. While moving with no orbit input, yaw eases (rate 2.5/s, shortest arc) to `heading + π` (behind the character).

- [ ] **Step 1: Write the failing test**

`src/world/engine/camera/followCam.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";

const noInput = { orbitX: 0, orbitY: 0, zoom: 0 };
const target = { x: 10, y: 5, z: -3 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

describe("followCam", () => {
  it("starts with the documented defaults", () => {
    expect(createFollowCam()).toEqual({ yaw: 0, pitch: 0.35, distance: 7 });
  });

  it("orbits, clamps pitch and zoom", () => {
    const cam = createFollowCam();
    updateFollowCam(cam, target, 0, false, 1 / 60, { orbitX: 0.5, orbitY: 5, zoom: 10 });
    expect(cam.yaw).toBeCloseTo(0.5, 9);
    expect(cam.pitch).toBe(1.2);
    expect(cam.distance).toBe(14);
    updateFollowCam(cam, target, 0, false, 1 / 60, { orbitX: 0, orbitY: -5, zoom: -0.99 });
    expect(cam.pitch).toBe(0.05);
    expect(cam.distance).toBe(3);
  });

  it("keeps the camera `distance` away from a look-at above the target", () => {
    const cam = createFollowCam();
    const { position, lookAt } = updateFollowCam(cam, target, 0, false, 1 / 60, noInput);
    expect(lookAt.x).toBe(10);
    expect(lookAt.y).toBeCloseTo(6.4, 12);
    expect(lookAt.z).toBe(-3);
    expect(Math.hypot(position.x - lookAt.x, position.y - lookAt.y, position.z - lookAt.z)).toBeCloseTo(7, 9);
    expect(position.y).toBeGreaterThan(lookAt.y);
  });

  it("swings behind a moving character", () => {
    const cam = createFollowCam();
    for (let i = 0; i < 180; i++) updateFollowCam(cam, target, 0, true, 1 / 60, noInput);
    expect(Math.abs(wrap(cam.yaw - Math.PI))).toBeLessThan(0.05);
    const { position } = updateFollowCam(cam, target, 0, true, 1 / 60, noInput);
    expect(position.z).toBeLessThan(target.z);        // facing +z, so the camera sits on the -z side
  });

  it("takes the short way round", () => {
    const cam = { yaw: 3.0, pitch: 0.35, distance: 7 };
    const heading = -3.0 - Math.PI;                     // desired yaw ≡ -3.0, i.e. just past +π
    updateFollowCam(cam, target, heading, true, 0.1, noInput);
    expect(cam.yaw).toBeGreaterThan(3.0);
  });

  it("holds yaw while standing still", () => {
    const cam = createFollowCam();
    updateFollowCam(cam, target, 2, false, 1, noInput);
    expect(cam.yaw).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/camera/followCam.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/camera/followCam`.

- [ ] **Step 3: Implement**

`src/world/engine/camera/followCam.ts`:

```ts
import type { Vec3 } from "@/world/engine/types";

export interface FollowCam { yaw: number; pitch: number; distance: number }

const MIN_PITCH = 0.05, MAX_PITCH = 1.2;
const MIN_DIST = 3, MAX_DIST = 14;
const FOLLOW_RATE = 2.5;
const HEAD = 1.4;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function createFollowCam(): FollowCam {
  return { yaw: 0, pitch: 0.35, distance: 7 };
}

export function updateFollowCam(
  cam: FollowCam, target: Vec3, heading: number, moving: boolean, dt: number,
  input: { orbitX: number; orbitY: number; zoom: number },
): { position: Vec3; lookAt: Vec3 } {
  cam.yaw += input.orbitX;
  cam.pitch = clamp(cam.pitch + input.orbitY, MIN_PITCH, MAX_PITCH);
  cam.distance = clamp(cam.distance * (1 + input.zoom), MIN_DIST, MAX_DIST);
  if (moving && input.orbitX === 0 && input.orbitY === 0) {
    const desired = heading + Math.PI;
    cam.yaw += wrap(desired - cam.yaw) * (1 - Math.exp(-FOLLOW_RATE * dt));
  }
  const lookAt = { x: target.x, y: target.y + HEAD, z: target.z };
  const cp = Math.cos(cam.pitch);
  return {
    position: {
      x: lookAt.x + Math.sin(cam.yaw) * cp * cam.distance,
      y: lookAt.y + Math.sin(cam.pitch) * cam.distance,
      z: lookAt.z + Math.cos(cam.yaw) * cp * cam.distance,
    },
    lookAt,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/camera/followCam.test.ts`
Expected: PASS — `Tests  6 passed (6)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/camera/followCam.ts src/world/engine/camera/followCam.test.ts
git commit -q -F - <<'EOF'
feat: add third-person follow camera maths

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 14: Particle pool and presets

**Files:**
- Create: `src/world/engine/particles/particles.ts`
- Test: `src/world/engine/particles/particles.test.ts`

**Interfaces:**
- Consumes: `Vec3`, `Rng`, `mulberry32`, `hexToRgb`.
- Produces: `ParticlePreset`, `ParticlePool`, `createParticlePool(capacity = 800, rng = mulberry32(7))`. Live particles are packed in `[0, alive)`; dead ones are swapped out and get scale 0. When full, new particles overwrite slots round-robin. Scale fades out over the last 40% of a particle's life.

- [ ] **Step 1: Write the failing test**

`src/world/engine/particles/particles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hexToRgb } from "@/world/engine/color";
import { mulberry32 } from "@/world/engine/gen/rng";
import { createParticlePool } from "@/world/engine/particles/particles";

const at = { x: 1, y: 5, z: -2 };

function meanY(pool: ReturnType<typeof createParticlePool>) {
  let s = 0;
  for (let i = 0; i < pool.alive; i++) s += pool.positions[i * 3 + 1];
  return s / pool.alive;
}

describe("particle pool", () => {
  it("allocates arrays for its capacity", () => {
    const p = createParticlePool(100);
    expect(p.capacity).toBe(100);
    expect(p.positions.length).toBe(300);
    expect(p.scales.length).toBe(100);
    expect(p.colors.length).toBe(300);
    expect(p.alive).toBe(0);
    expect(createParticlePool().capacity).toBe(800);
  });

  it("bursts the preset count, or an override", () => {
    const p = createParticlePool(100);
    p.burst(at, "dust");
    expect(p.alive).toBe(6);
    p.burst(at, "debris", { count: 3 });
    expect(p.alive).toBe(9);
    expect(p.positions[0]).toBe(1);
    expect(p.positions[1]).toBe(5);
  });

  it("never exceeds capacity", () => {
    const p = createParticlePool(50);
    p.burst(at, "confetti", { count: 1000 });
    expect(p.alive).toBe(50);
  });

  it("pulls debris down under gravity", () => {
    const p = createParticlePool(100, mulberry32(3));
    p.burst(at, "debris");
    for (let i = 0; i < 15; i++) p.step(1 / 60);
    const early = meanY(p);
    for (let i = 0; i < 15; i++) p.step(1 / 60);
    expect(meanY(p)).toBeLessThan(early);
  });

  it("fades particles out and then recycles their slots", () => {
    const p = createParticlePool(10);
    p.burst(at, "sparkle", { count: 1 });
    const s0 = p.scales[0];
    let smallest = s0;
    while (p.alive > 0) {
      p.step(0.01);
      if (p.alive > 0) smallest = Math.min(smallest, p.scales[0]);
    }
    expect(smallest).toBeLessThan(s0 * 0.5);
    expect(p.scales[0]).toBe(0);
    p.burst(at, "dust");
    expect(p.alive).toBe(6);
  });

  it("applies a colour override", () => {
    const p = createParticlePool(10);
    p.burst(at, "confetti", { count: 2, color: "#3D62F8" });
    expect(Array.from(p.colors.slice(0, 3))).toEqual(hexToRgb("#3D62F8").map((v) => Math.fround(v)));
  });

  it("is deterministic for a seed", () => {
    const a = createParticlePool(50, mulberry32(9)), b = createParticlePool(50, mulberry32(9));
    a.burst(at, "leaves"); b.burst(at, "leaves");
    a.step(0.2); b.step(0.2);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/particles/particles.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/particles/particles`.

- [ ] **Step 3: Implement**

`src/world/engine/particles/particles.ts`:

```ts
import { hexToRgb } from "@/world/engine/color";
import { mulberry32, type Rng } from "@/world/engine/gen/rng";
import type { Vec3 } from "@/world/engine/types";

export type ParticlePreset = "debris" | "dust" | "confetti" | "leaves" | "sparkle";

export interface ParticlePool {
  readonly capacity: number;
  alive: number;
  positions: Float32Array;
  scales: Float32Array;
  colors: Float32Array;
  burst(at: Vec3, preset: ParticlePreset, opts?: { color?: string; count?: number }): void;
  step(dt: number): void;
}

interface Preset {
  count: number; speed: [number, number]; up: [number, number]; life: [number, number];
  size: [number, number]; gravity: number; drag: number; colors: string[];
}

const PRESETS: Record<ParticlePreset, Preset> = {
  debris: { count: 14, speed: [2.5, 5], up: [3, 6], life: [0.6, 1.0], size: [0.12, 0.22], gravity: 22, drag: 0.6, colors: ["#94714f", "#8a6849"] },
  dust: { count: 6, speed: [0.4, 1.2], up: [0.3, 1.0], life: [0.35, 0.6], size: [0.08, 0.16], gravity: -0.5, drag: 2.5, colors: ["#d8cfbf", "#cfc4b0"] },
  confetti: { count: 40, speed: [3, 6], up: [5, 8], life: [1.2, 2.0], size: [0.08, 0.14], gravity: 9, drag: 1.2, colors: ["#3D62F8", "#FA5D19", "#ffffff", "#8ea769", "#f2c14e"] },
  leaves: { count: 8, speed: [0.5, 1.5], up: [0.2, 0.8], life: [1.4, 2.2], size: [0.1, 0.16], gravity: 2.5, drag: 1.8, colors: ["#6e8e57", "#7a9862", "#82a068"] },
  sparkle: { count: 5, speed: [0.2, 0.6], up: [0.2, 0.6], life: [0.5, 0.9], size: [0.05, 0.09], gravity: -0.3, drag: 1.0, colors: ["#bfe3ff", "#ffffff"] },
};

export function createParticlePool(capacity = 800, rng: Rng = mulberry32(7)): ParticlePool {
  const positions = new Float32Array(capacity * 3);
  const velocities = new Float32Array(capacity * 3);
  const scales = new Float32Array(capacity);
  const colors = new Float32Array(capacity * 3);
  const life = new Float32Array(capacity);
  const maxLife = new Float32Array(capacity);
  const base = new Float32Array(capacity);
  const grav = new Float32Array(capacity);
  const drag = new Float32Array(capacity);
  let cursor = 0;

  const range = (r: [number, number]) => r[0] + (r[1] - r[0]) * rng();

  function move(from: number, to: number) {
    for (let k = 0; k < 3; k++) {
      positions[to * 3 + k] = positions[from * 3 + k];
      velocities[to * 3 + k] = velocities[from * 3 + k];
      colors[to * 3 + k] = colors[from * 3 + k];
    }
    scales[to] = scales[from]; life[to] = life[from]; maxLife[to] = maxLife[from];
    base[to] = base[from]; grav[to] = grav[from]; drag[to] = drag[from];
  }

  const pool: ParticlePool = {
    capacity,
    alive: 0,
    positions,
    scales,
    colors,
    burst(at, preset, opts = {}) {
      const P = PRESETS[preset];
      const n = opts.count ?? P.count;
      const palette = opts.color ? [opts.color] : P.colors;
      for (let k = 0; k < n; k++) {
        let i: number;
        if (pool.alive < capacity) i = pool.alive++;
        else { i = cursor; cursor = (cursor + 1) % capacity; }
        const a = rng() * Math.PI * 2;
        const sp = range(P.speed);
        positions[i * 3] = at.x; positions[i * 3 + 1] = at.y; positions[i * 3 + 2] = at.z;
        velocities[i * 3] = Math.cos(a) * sp;
        velocities[i * 3 + 1] = range(P.up);
        velocities[i * 3 + 2] = Math.sin(a) * sp;
        const L = range(P.life);
        life[i] = L; maxLife[i] = L;
        base[i] = range(P.size); scales[i] = base[i];
        grav[i] = P.gravity; drag[i] = P.drag;
        const [r, g, b] = hexToRgb(palette[Math.floor(rng() * palette.length)]);
        colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
      }
    },
    step(dt) {
      let i = 0;
      while (i < pool.alive) {
        life[i] -= dt;
        if (life[i] <= 0) {
          const last = --pool.alive;
          if (i !== last) move(last, i);
          scales[last] = 0;
          continue;
        }
        const damp = Math.exp(-drag[i] * dt);
        velocities[i * 3 + 1] -= grav[i] * dt;
        velocities[i * 3] *= damp; velocities[i * 3 + 1] *= damp; velocities[i * 3 + 2] *= damp;
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        scales[i] = base[i] * Math.min(1, life[i] / (maxLife[i] * 0.4));
        i++;
      }
    },
  };
  return pool;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/particles/particles.test.ts`
Expected: PASS — `Tests  7 passed (7)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/particles/particles.ts src/world/engine/particles/particles.test.ts
git commit -q -F - <<'EOF'
feat: add pooled voxel particle system with presets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 15: Interaction registry — nearest-in-front and ray picking

**Files:**
- Create: `src/world/engine/interaction/registry.ts`
- Test: `src/world/engine/interaction/registry.test.ts`

**Interfaces:**
- Consumes: `Vec3`.
- Produces: `Interactable`, `InteractionRegistry`, `createRegistry()`. `nearest` ignores disabled items, items beyond `radius` (3D distance), and items behind the player (horizontal dot with facing < 0.2) unless they are within 0.3 blocks horizontally. `raycast` uses the slab method against `hitbox`, returns the closest hit with `t ≥ 0`, enabled items only.

- [ ] **Step 1: Write the failing test**

`src/world/engine/interaction/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRegistry, type Interactable } from "@/world/engine/interaction/registry";

function item(id: string, x: number, z: number, extra: Partial<Interactable> = {}): Interactable {
  return {
    id, island: "gtid", label: id, position: { x, y: 1, z },
    hitbox: { min: { x: x - 0.5, y: 0.5, z: z - 0.5 }, max: { x: x + 0.5, y: 1.5, z: z + 0.5 } },
    radius: 2.5, onActivate: () => {}, ...extra,
  };
}

describe("registry bookkeeping", () => {
  it("registers, looks up, filters by island and unregisters", () => {
    const r = createRegistry();
    const off = r.register(item("a", 0, 0));
    r.register(item("b", 5, 0, { island: "orbit-store" }));
    expect(r.all().map((i) => i.id).sort()).toEqual(["a", "b"]);
    expect(r.get("a")?.label).toBe("a");
    expect(r.onIsland("orbit-store").map((i) => i.id)).toEqual(["b"]);
    off();
    expect(r.get("a")).toBeUndefined();
  });

  it("a stale unregister does not remove a re-registered item", () => {
    const r = createRegistry();
    const off = r.register(item("a", 0, 0));
    r.register(item("a", 1, 0));
    off();
    expect(r.get("a")?.position.x).toBe(1);
  });
});

describe("nearest", () => {
  const facingX = { x: 1, y: 0, z: 0 };

  it("picks the closest enabled item in front and within reach", () => {
    const r = createRegistry();
    r.register(item("far", 2.2, 0));
    r.register(item("near", 1.2, 0.2));
    r.register(item("behind", -1, 0));
    r.register(item("off", 1, 0, { enabled: () => false }));
    r.register(item("out-of-reach", 4, 0));
    expect(r.nearest({ x: 0, y: 1, z: 0 }, facingX)?.id).toBe("near");
  });

  it("ignores items behind the player", () => {
    const r = createRegistry();
    r.register(item("behind", -1, 0));
    expect(r.nearest({ x: 0, y: 1, z: 0 }, facingX)).toBeNull();
  });

  it("accepts an item standing on the player regardless of facing", () => {
    const r = createRegistry();
    r.register(item("here", 0.1, 0.1));
    expect(r.nearest({ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 })?.id).toBe("here");
  });
});

describe("raycast", () => {
  it("returns the first box the ray hits", () => {
    const r = createRegistry();
    r.register(item("front", 3, 0));
    r.register(item("back", 6, 0));
    expect(r.raycast({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 })?.id).toBe("front");
  });

  it("misses when pointing away or at disabled items", () => {
    const r = createRegistry();
    r.register(item("front", 3, 0));
    r.register(item("disabled", 0, 3, { enabled: () => false }));
    expect(r.raycast({ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 })).toBeNull();
    expect(r.raycast({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 })).toBeNull();
  });

  it("handles rays parallel to an axis that start inside the slab", () => {
    const r = createRegistry();
    r.register(item("box", 0, 4));
    expect(r.raycast({ x: 0.2, y: 1, z: 0 }, { x: 0, y: 0, z: 1 })?.id).toBe("box");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/interaction/registry.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/interaction/registry`.

- [ ] **Step 3: Implement**

`src/world/engine/interaction/registry.ts`:

```ts
import type { Vec3 } from "@/world/engine/types";

export interface Interactable {
  id: string; island: string; label: string; position: Vec3;
  hitbox: { min: Vec3; max: Vec3 }; radius: number;
  onActivate: () => void; enabled?: () => boolean;
}

export interface InteractionRegistry {
  register(item: Interactable): () => void;
  all(): Interactable[];
  get(id: string): Interactable | undefined;
  nearest(pos: Vec3, facing: Vec3): Interactable | null;
  raycast(origin: Vec3, dir: Vec3): Interactable | null;
  onIsland(island: string): Interactable[];
}

const AXES = ["x", "y", "z"] as const;
const isEnabled = (i: Interactable) => (i.enabled ? i.enabled() : true);

function rayBox(o: Vec3, d: Vec3, min: Vec3, max: Vec3): number | null {
  let tmin = 0, tmax = Infinity;
  for (const a of AXES) {
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < min[a] || o[a] > max[a]) return null;
      continue;
    }
    const inv = 1 / d[a];
    let t1 = (min[a] - o[a]) * inv, t2 = (max[a] - o[a]) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

export function createRegistry(): InteractionRegistry {
  const items = new Map<string, Interactable>();
  return {
    register(item) {
      items.set(item.id, item);
      return () => { if (items.get(item.id) === item) items.delete(item.id); };
    },
    all: () => [...items.values()],
    get: (id) => items.get(id),
    onIsland: (island) => [...items.values()].filter((i) => i.island === island),
    nearest(pos, facing) {
      const fl = Math.hypot(facing.x, facing.z) || 1;
      const fx = facing.x / fl, fz = facing.z / fl;
      let best: Interactable | null = null, bestD = Infinity;
      for (const it of items.values()) {
        if (!isEnabled(it)) continue;
        const dx = it.position.x - pos.x, dy = it.position.y - pos.y, dz = it.position.z - pos.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > it.radius) continue;
        const hd = Math.hypot(dx, dz);
        if (hd > 0.3 && (dx * fx + dz * fz) / hd < 0.2) continue;
        if (dist < bestD) { bestD = dist; best = it; }
      }
      return best;
    },
    raycast(origin, dir) {
      let best: Interactable | null = null, bestT = Infinity;
      for (const it of items.values()) {
        if (!isEnabled(it)) continue;
        const t = rayBox(origin, dir, it.hitbox.min, it.hitbox.max);
        if (t !== null && t < bestT) { bestT = t; best = it; }
      }
      return best;
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/interaction/registry.test.ts`
Expected: PASS — `Tests  8 passed (8)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/interaction/registry.ts src/world/engine/interaction/registry.test.ts
git commit -q -F - <<'EOF'
feat: add interaction registry with proximity and ray picking

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 16: SFX module (ZzFX, muted by default, lazy audio)

**Files:**
- Create: `src/world/engine/audio/sfx.ts`
- Test: `src/world/engine/audio/sfx.test.ts`

**Interfaces:**
- Consumes: the `zzfx` module (declared in Task 1).
- Produces: `SfxName`, `SFX_PRESETS`, `playSfx(name)`, `setMuted(muted)`, `isMuted()`, `whenAudioReady()`. zzfx is imported dynamically on the first unmute (its module creates an `AudioContext` at import time, so it must never load before a user gesture or in Node); unmuting also resumes the audio context; master volume 0.25.

- [ ] **Step 1: Write the failing test**

`src/world/engine/audio/sfx.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ zzfx: vi.fn(), resume: vi.fn(() => Promise.resolve()) }));
vi.mock("zzfx", () => ({ zzfx: mocks.zzfx, ZZFX: { volume: 0.3, audioContext: { resume: mocks.resume } } }));

const load = () => import("@/world/engine/audio/sfx");
const NAMES = ["click", "hover", "punch", "burst", "jump", "land", "step", "print", "chat", "link", "bounce", "cart"];

beforeEach(() => {
  vi.resetModules();
  mocks.zzfx.mockClear();
  mocks.resume.mockClear();
});

describe("sfx", () => {
  it("starts muted and stays silent", async () => {
    const sfx = await load();
    expect(sfx.isMuted()).toBe(true);
    sfx.playSfx("click");
    expect(mocks.zzfx).not.toHaveBeenCalled();
  });

  it("plays presets after unmuting and resumes the audio context", async () => {
    const sfx = await load();
    sfx.setMuted(false);
    await sfx.whenAudioReady();
    sfx.playSfx("jump");
    expect(mocks.zzfx).toHaveBeenCalledWith(...sfx.SFX_PRESETS.jump);
    expect(mocks.resume).toHaveBeenCalled();
  });

  it("goes silent again when muted", async () => {
    const sfx = await load();
    sfx.setMuted(false);
    await sfx.whenAudioReady();
    sfx.setMuted(true);
    sfx.playSfx("land");
    expect(mocks.zzfx).not.toHaveBeenCalled();
  });

  it("has a usable preset for every sound name", async () => {
    const sfx = await load();
    expect(Object.keys(sfx.SFX_PRESETS).sort()).toEqual([...NAMES].sort());
    for (const params of Object.values(sfx.SFX_PRESETS)) {
      expect(params.length).toBeGreaterThanOrEqual(3);
      expect(params[0]).toBeGreaterThan(0);
      expect(params[0]).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/audio/sfx.test.ts`
Expected: FAIL — cannot resolve `@/world/engine/audio/sfx`.

- [ ] **Step 3: Implement**

`src/world/engine/audio/sfx.ts`:

```ts
export type SfxName = "click" | "hover" | "punch" | "burst" | "jump" | "land" | "step" | "print" | "chat" | "link" | "bounce" | "cart";

// ZzFX parameter order: volume, randomness, frequency, attack, sustain, release, shape, shapeCurve,
// slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo
export const SFX_PRESETS: Record<SfxName, (number | undefined)[]> = {
  click: [0.5, 0, 900, 0, 0.01, 0.04, 1, 1.5],
  hover: [0.2, 0, 1200, 0, 0.005, 0.02, 0],
  punch: [0.8, 0.05, 160, 0, 0.02, 0.12, 4, 1, -8, 0, 0, 0, 0, 1.5],
  burst: [0.7, 0.1, 220, 0, 0.05, 0.3, 4, 1, -3, 0, 0, 0, 0, 2],
  jump: [0.5, 0, 300, 0, 0.04, 0.12, 0, 1, 12],
  land: [0.5, 0.05, 110, 0, 0.02, 0.08, 4, 1, -2],
  step: [0.25, 0.2, 140, 0, 0.005, 0.04, 4],
  print: [0.4, 0, 520, 0, 0.3, 0.05, 2, 1, 0, 0, 0, 0, 0.05, 0.5],
  chat: [0.4, 0, 880, 0.01, 0.05, 0.1, 0, 1, 0, 0, 440, 0.05],
  link: [0.4, 0, 660, 0, 0.06, 0.15, 0, 1, 0, 0, 220, 0.06],
  bounce: [0.6, 0, 200, 0, 0.08, 0.2, 1, 1, 20],
  cart: [0.4, 0.1, 90, 0.05, 0.4, 0.2, 2, 1, 0, 0, 0, 0, 0.08, 0.3],
};

type ZzfxModule = typeof import("zzfx");

let muted = true;
let zz: ZzfxModule | null = null;
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (!loading) {
    loading = import("zzfx")
      .then((m) => { zz = m; m.ZZFX.volume = 0.25; })
      .catch(() => { loading = null; });
  }
  return loading;
}

export function whenAudioReady(): Promise<void> {
  return loading ?? Promise.resolve();
}

export function setMuted(next: boolean): void {
  muted = next;
  if (!next) void load().then(() => zz?.ZZFX.audioContext.resume());
}

export function isMuted(): boolean {
  return muted;
}

export function playSfx(name: SfxName): void {
  if (muted || !zz) return;
  zz.zzfx(...SFX_PRESETS[name]);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/world/engine/audio/sfx.test.ts`
Expected: PASS — `Tests  4 passed (4)`.

- [ ] **Step 5: Commit**

```bash
git add src/world/engine/audio/sfx.ts src/world/engine/audio/sfx.test.ts
git commit -q -F - <<'EOF'
feat: add muted-by-default zzfx sound effects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 17: Part A verification gate

**Files:** none created; verification only.

**Interfaces:**
- Consumes: everything above.
- Produces: a green engine that Part B can build on.

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS — `Test Files  16 passed (16)`, `Tests  113 passed (113)`; no failures.

- [ ] **Step 2: Check engine purity (no framework or DOM imports)**

Run: `grep -rnE "from ['\"](react|three|@react-three/[a-z-]+|zustand)['\"]|\b(window|document)\." src/world/engine --include=*.ts | grep -v "\.test\.ts"`
Expected: no output.

- [ ] **Step 3: Type-check and build the app**

Run: `npm run build`
Expected: `tsc -b` prints nothing and `vite build` ends with `✓ built in …`. The old site still builds because `src/App.tsx` and `src/components/**` are untouched.

- [ ] **Step 4: Confirm the working tree**

Run: `git status --short`
Expected: only the pre-existing ` D gsap-splittext-kinetic-typography-experiment-gsapchallenge-1/…` lines. Nothing of ours is uncommitted.

## Self-review notes (done while writing this plan)

- Spec coverage for Part A scope: content model + validator (§5, copy rule §18 enforced in `validateProjects`), districts/anchors/crossing rules (§4), physics numbers (§7 table), bounce pads and minecart maths (§7 "Crossings in Play"), tour path continuity and dwell (§6), follow camera (§6 Play), particles presets and 800 cap (§9), interaction registry (§8), SFX muted by default (§12), tests listed in §16 (collision, solver ±0.1, rail symmetry, crossing selection, chapter mapping, seeded determinism, config validation).
- Placeholder scan: no TBD/TODO; every code step shows full code.
- Type consistency with the master: all Part A contract names and signatures are used verbatim; additions are listed at the top.
