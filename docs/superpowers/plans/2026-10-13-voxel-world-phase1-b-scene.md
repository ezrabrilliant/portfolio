# Voxel World — Phase 1 Part B: Scene, Modes, Controls

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Part A world with React Three Fiber and make it explorable: scroll tour camera, Play mode as voxel Ezra (keyboard + touch), interaction system, particles, crossings (bridge, stepping stones, bounce pads, minecart), HUD, SEO mirror, loader and fallbacks — with placeholder islands that Part C replaces.

**Architecture:** `WorldApp` (DOM root) holds a fixed full-screen `<Canvas>` plus DOM overlays (HUD, mobile controls, loader, SEO mirror) and a tall scroll track that drives the tour. Inside the canvas, `World` builds the Part A world once (`buildWorld` + island and crossing stamps), renders one `InstancedMesh` per island, and mounts controllers (tour camera, play camera, player, interaction, particles) that run in `useFrame` against the transient `runtime` singleton. UI state that React must render lives in the zustand `useWorld` store and changes only on events, never per frame.

**Tech Stack:** React 19, @react-three/fiber 9, @react-three/drei 10, three, zustand 5, Vitest; engine modules from Part A.

**Master plan:** `docs/superpowers/plans/2026-10-13-voxel-world-phase1.md` (contracts, coordinate conventions, file structure). **Spec:** `docs/superpowers/specs/2026-10-13-voxel-world-design.md`.

## Global Constraints

See the master plan's Global Constraints (branch `voxel-world`, explicit `git add` paths only, commit trailer lines, engine purity, `@/` alias, `import type`, English copy, facts, brand colours, performance budget, reduced motion). Every task below implicitly includes them. Part-B-specific:

- Part A must be complete before Part B starts: dependencies installed, Vitest configured with the `@/` alias, every Part A export from the master contracts present.
- Never call React `setState` (including zustand setters) inside `useFrame` **per frame**. The only setters allowed in a frame callback are change-guarded, event-like ones (`setActiveIsland`, `setPrompt`, `setHovered`), which the store already ignores when the value is unchanged.
- Read zustand inside frame callbacks with `useWorld.getState()` (transient read); subscribe in components with selectors (`useWorld((s) => s.mode)`).
- Reuse objects in frame callbacks (no `new THREE.Vector3()` per frame).
- Heading convention (used by Ezra, the player controller, interaction facing and the follow camera): `facing = (sin(heading), 0, cos(heading))`; the Ezra model faces +Z at heading 0. Part A's `updateFollowCam(cam, target, heading, …)` is called with this heading and places the camera behind the facing direction.
- Particle colours from `ParticlePool.colors` and mesher batch colours are treated as sRGB 0..1 (`Color.setRGB(r, g, b, THREE.SRGBColorSpace)`).
- Commit command used in every task (replace the message line):

```bash
git commit -F - <<'EOF'
feat(world): <message>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

## Contract additions

Part B adds these exports on top of the master contracts. Part C may use them.

```ts
// src/world/state/runtime.ts — extra runtime fields (all transient)
export type Ride =
  | { kind: "arc"; t: number; from: Vec3; to: Vec3; vel: Vec3; time: number }
  | { kind: "rail"; t: number; duration: number; rail: Rail; reverse: boolean; exit: Vec3; exitHeading: number };
runtime.killY: number;                 // respawn threshold under the lowest island
runtime.tourPath: TourPath | null;     // set by TourCamera
runtime.tourProgress: number;          // damped tour progress 0..1
runtime.tourBlend: number;             // 1 → 0 blend from the play camera back onto the tour path
runtime.seat: { pos: Vec3; heading: number } | null;   // hero edge seat
runtime.seated: boolean;               // Ezra sits at the seat until Play is first entered
runtime.standUp: number;               // seconds of stand-up animation left
runtime.ride: Ride | null;             // active bounce arc or minecart ride
runtime.hoverId: string | null;        // pointer hover (tour)
runtime.focusId: string | null;        // Play nearest / keyboard focus
runtime.moving: boolean; runtime.speed: number; runtime.animPhase: number; runtime.landTimer: number;

// src/world/scene/islands/types.ts
export const VIEW_F: { x: number; z: number };   // horizontal forward of every tour camera (0.582, -0.813)
export const VIEW_R: { x: number; z: number };   // its right vector (0.813, 0.582)
export function islandTop(p: IslandPlacement): Vec3;   // centre of the walkable top surface
export function defaultTourStop(p: IslandPlacement,
  opts?: { distance?: number; height?: number; shift?: number; dwell?: number }): TourStop;

// src/world/scene/tour/scrollToIsland.ts
export function scrollToIsland(id: string): void;     // smooth-scrolls the tour to that island's stop

// src/world/scene/fonts.ts
export const FONT_URLS: { ui: string; pixel: string };

// src/world/ui/SeoMirror.tsx
export function SeoMirror(props: { visible?: boolean }): JSX.Element;
```

---

### Task 1: App shell, store, runtime, SEO mirror, fallback

**Files:**
- Create: `src/world/state/quality.ts`, `src/world/state/quality.test.ts`
- Create: `src/world/state/store.ts`, `src/world/state/store.test.ts`
- Create: `src/world/state/runtime.ts`, `src/world/state/runtime.test.ts`
- Create: `src/world/ui/SeoMirror.tsx`, `src/world/ui/NoWebGL.tsx`
- Create: `src/world/world.css`
- Create: `src/world/scene/World.tsx` (temporary content, replaced in Task 3), `src/world/scene/WorldApp.tsx`
- Create: `scripts/shot.mjs`
- Modify: `src/main.tsx`, `package.json` (scripts), `.gitignore`

**Interfaces:**
- Consumes (Part A): `buildLayout`, `IslandPlacement`, `WorldLayout` (`@/world/engine/gen/layout`); `BuiltWorld` (`@/world/engine/worldBuild`); `createRegistry`, `InteractionRegistry`; `createParticlePool`, `ParticlePool`; `createCharacter`, `CharacterState`; `Vec3`; `TourPath`; `Rail`; `setMuted`; `worldProjects`, `worldCopy`.
- Produces: `useWorld`, `Mode`, `Quality`, `WorldState` (store); `runtime`, `Ride` (runtime); `pickQuality`, `dprCap`, `readDevice`, `hasWebGL`; `SeoMirror`; `NoWebGL`; default export `WorldApp`; `npm run shot`.

- [ ] **Step 1: Write the failing tests**

`src/world/state/quality.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dprCap, pickQuality } from "./quality";

const desktop = { width: 1440, height: 900, cores: 8, coarsePointer: false, saveData: false };

describe("pickQuality", () => {
  it("picks high on a normal desktop", () => {
    expect(pickQuality(desktop)).toBe("high");
  });
  it("picks low when data saver is on", () => {
    expect(pickQuality({ ...desktop, saveData: true })).toBe("low");
  });
  it("picks low with 4 or fewer cores", () => {
    expect(pickQuality({ ...desktop, cores: 4 })).toBe("low");
  });
  it("picks low on a small touch screen", () => {
    expect(pickQuality({ width: 412, height: 915, cores: 8, coarsePointer: true, saveData: false })).toBe("low");
  });
  it("keeps high on a large touch screen with many cores", () => {
    expect(pickQuality({ width: 1366, height: 1024, cores: 8, coarsePointer: true, saveData: false })).toBe("high");
  });
});

describe("dprCap", () => {
  it("caps pixel ratio per tier", () => {
    expect(dprCap("high")).toBe(1.75);
    expect(dprCap("low")).toBe(1.25);
  });
});
```

`src/world/state/store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/world/engine/audio/sfx", () => ({
  setMuted: vi.fn(),
  playSfx: vi.fn(),
  isMuted: vi.fn(() => true),
}));

import { setMuted } from "@/world/engine/audio/sfx";
import { useWorld } from "./store";

describe("useWorld", () => {
  beforeEach(() => {
    useWorld.setState({ mode: "tour", activeIsland: "hero", muted: true, hoveredId: null, prompt: null, ready: false });
    vi.mocked(setMuted).mockClear();
  });

  it("starts in tour mode, muted, on the hero island", () => {
    const s = useWorld.getState();
    expect(s.mode).toBe("tour");
    expect(s.muted).toBe(true);
    expect(s.activeIsland).toBe("hero");
  });

  it("toggleMuted flips the flag and tells the audio engine", () => {
    useWorld.getState().toggleMuted();
    expect(useWorld.getState().muted).toBe(false);
    expect(setMuted).toHaveBeenCalledWith(false);
  });

  it("change-guarded setters do not notify when the value is unchanged", () => {
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    useWorld.getState().setActiveIsland("hero");
    useWorld.getState().setHovered(null);
    useWorld.getState().setPrompt(null);
    expect(listener).not.toHaveBeenCalled();
    useWorld.getState().setActiveIsland("gtid");
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("setPrompt compares by id", () => {
    useWorld.getState().setPrompt({ id: "a", label: "Print a receipt" });
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    useWorld.getState().setPrompt({ id: "a", label: "Print a receipt" });
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });
});
```

`src/world/state/runtime.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runtime } from "./runtime";

describe("runtime", () => {
  it("has a layout with the hero and the four star islands", () => {
    const ids = runtime.layout.islands.map((i) => i.id);
    for (const id of ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]) expect(ids).toContain(id);
  });

  it("islandById returns the placement and throws for unknown ids", () => {
    expect(runtime.islandById("gtid").id).toBe("gtid");
    expect(() => runtime.islandById("nope")).toThrow(/unknown island/);
  });

  it("puts killY below every island", () => {
    for (const i of runtime.layout.islands) expect(runtime.killY).toBeLessThan(i.origin.y - i.depth);
  });

  it("starts with Ezra seated, no ride, no world built yet", () => {
    expect(runtime.seated).toBe(true);
    expect(runtime.ride).toBeNull();
    expect(runtime.built).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/state`
Expected: FAIL — `Failed to resolve import "./quality"` (and `./store`, `./runtime`).

- [ ] **Step 3: Implement quality, store and runtime**

`src/world/state/quality.ts`:

```ts
export interface DeviceInfo {
  width: number;
  height: number;
  cores: number;
  coarsePointer: boolean;
  saveData: boolean;
}

export function pickQuality(d: DeviceInfo): "high" | "low" {
  if (d.saveData) return "low";
  if (d.cores <= 4) return "low";
  if (d.coarsePointer && Math.min(d.width, d.height) < 700) return "low";
  return "high";
}

export function dprCap(q: "high" | "low"): number {
  return q === "high" ? 1.75 : 1.25;
}

export function readDevice(): DeviceInfo {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    cores: navigator.hardwareConcurrency || 8,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    saveData: nav.connection?.saveData === true,
  };
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
```

`src/world/state/store.ts`:

```ts
import { create } from "zustand";
import { setMuted } from "@/world/engine/audio/sfx";
import { pickQuality, readDevice } from "./quality";

export type Mode = "tour" | "play";
export type Quality = "high" | "low";

export interface WorldState {
  mode: Mode;
  setMode(m: Mode): void;
  activeIsland: string;
  setActiveIsland(id: string): void;
  muted: boolean;
  toggleMuted(): void;
  quality: Quality;
  setQuality(q: Quality): void;
  hoveredId: string | null;
  setHovered(id: string | null): void;
  prompt: { id: string; label: string } | null;
  setPrompt(p: { id: string; label: string } | null): void;
  reducedMotion: boolean;
  ready: boolean;
  setReady(r: boolean): void;
}

const inBrowser = typeof window !== "undefined" && typeof window.matchMedia === "function";
const reducedMotion = inBrowser && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const initialQuality: Quality = inBrowser ? pickQuality(readDevice()) : "high";

export const useWorld = create<WorldState>()((set, get) => ({
  mode: "tour",
  setMode: (mode) => {
    if (get().mode !== mode) set({ mode });
  },
  activeIsland: "hero",
  setActiveIsland: (activeIsland) => {
    if (get().activeIsland !== activeIsland) set({ activeIsland });
  },
  muted: true,
  toggleMuted: () => {
    const muted = !get().muted;
    setMuted(muted);
    set({ muted });
  },
  quality: initialQuality,
  setQuality: (quality) => {
    if (get().quality !== quality) set({ quality });
  },
  hoveredId: null,
  setHovered: (hoveredId) => {
    if (get().hoveredId !== hoveredId) set({ hoveredId });
  },
  prompt: null,
  setPrompt: (prompt) => {
    if ((get().prompt?.id ?? null) !== (prompt?.id ?? null)) set({ prompt });
  },
  reducedMotion,
  ready: false,
  setReady: (ready) => {
    if (get().ready !== ready) set({ ready });
  },
}));
```

`src/world/state/runtime.ts`:

```ts
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement, WorldLayout } from "@/world/engine/gen/layout";
import type { BuiltWorld } from "@/world/engine/worldBuild";
import { createRegistry } from "@/world/engine/interaction/registry";
import type { InteractionRegistry } from "@/world/engine/interaction/registry";
import { createParticlePool } from "@/world/engine/particles/particles";
import type { ParticlePool } from "@/world/engine/particles/particles";
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
  particles: createParticlePool(reducedMotion ? 240 : 800) as ParticlePool,
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/state`
Expected: PASS (3 files, 13 tests).

- [ ] **Step 5: Create the SEO mirror, fallback, CSS and app shell**

`src/world/ui/SeoMirror.tsx`:

```tsx
import type { JSX } from "react";
import { worldCopy, worldProjects } from "@/config/portfolio";
import type { ProjectLinks } from "@/config/schema";

const LINK_LABELS: Record<keyof ProjectLinks, string> = {
  demo: "Visit",
  github: "Source code",
  discord: "Discord",
  roblox: "Play on Roblox",
};

export function SeoMirror({ visible = false }: { visible?: boolean }): JSX.Element {
  return (
    <main className={visible ? "seo-mirror seo-mirror--visible" : "seo-mirror sr-only"}>
      <header>
        <h1>{worldCopy.heroName}</h1>
        <p>{worldCopy.heroLine}</p>
        <p>{worldCopy.location}</p>
      </header>
      {worldProjects.map((p) => (
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
          <p>
            {(Object.keys(p.links) as Array<keyof ProjectLinks>)
              .filter((k) => !!p.links[k])
              .map((k) => (
                <a key={k} href={p.links[k]} target="_blank" rel="noopener noreferrer">
                  {LINK_LABELS[k]} {p.title}
                </a>
              ))}
          </p>
        </section>
      ))}
    </main>
  );
}
```

`src/world/ui/NoWebGL.tsx`:

```tsx
import type { JSX } from "react";
import { SeoMirror } from "./SeoMirror";

export function NoWebGL(): JSX.Element {
  return (
    <div className="nowebgl">
      <p className="nowebgl-note">This browser can't run the 3D world, so here is the plain version.</p>
      <SeoMirror visible />
    </div>
  );
}
```

`src/world/world.css` (full file; later tasks append to it):

```css
html { scroll-behavior: auto; }
html, body { margin: 0; background: #cbdce4; }
body {
  font-family: "Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #13212b;
  -webkit-font-smoothing: antialiased;
}
html.world-playing, html.world-playing body { overflow: hidden; }

.world-canvas-wrap { position: fixed; inset: 0; z-index: 0; outline: none; }
.world-canvas-wrap:focus-visible { box-shadow: inset 0 0 0 3px #13212b; }
.tour-track { position: relative; z-index: -1; width: 1px; pointer-events: none; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

.nowebgl { max-width: 680px; margin: 0 auto; padding: 48px 16px 72px; }
.nowebgl-note { font-size: 14px; color: rgba(19, 33, 43, 0.7); }
.seo-mirror--visible h1 { font-size: 40px; letter-spacing: -0.02em; margin: 0 0 8px; }
.seo-mirror--visible h2 { font-size: 22px; margin: 32px 0 6px; }
.seo-mirror--visible a { display: inline-block; margin-right: 16px; color: #1f4f8a; }
```

`src/world/scene/World.tsx` (temporary; Task 3 replaces it):

```tsx
export function World() {
  return (
    <>
      <color attach="background" args={["#cbdce4"]} />
      <ambientLight intensity={0.8} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#8ea769" />
      </mesh>
    </>
  );
}
```

`src/world/scene/WorldApp.tsx`:

```tsx
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useWorld } from "@/world/state/store";
import { dprCap, hasWebGL } from "@/world/state/quality";
import { NoWebGL } from "@/world/ui/NoWebGL";
import { SeoMirror } from "@/world/ui/SeoMirror";
import { World } from "./World";

export default function WorldApp() {
  const webgl = useMemo(() => hasWebGL(), []);
  const quality = useWorld((s) => s.quality);
  if (!webgl) return <NoWebGL />;
  return (
    <>
      <div className="world-canvas-wrap" tabIndex={0} aria-label="Ezra Brilliant's voxel world">
        <Canvas
          shadows={quality === "high" ? "soft" : false}
          dpr={[1, dprCap(quality)]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: 40, near: 0.1, far: 600, position: [-12, 14, 22] }}
          onCreated={({ gl, camera }) => {
            gl.toneMappingExposure = 1.05;
            camera.lookAt(0, 0, 0);
          }}
        >
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </Canvas>
      </div>
      <SeoMirror />
    </>
  );
}
```

Replace the whole of `src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WorldApp from "./world/scene/WorldApp";
import "./world/world.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorldApp />
  </StrictMode>
);
```

`scripts/shot.mjs` (headless screenshot of the built site; software WebGL):

```js
// Usage: node scripts/shot.mjs "<query+hash>" <out.png> [WIDTHxHEIGHT]
//   node scripts/shot.mjs "?stop=0" shots/stop-0.png 1280x720
import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { preview } from "vite";

const CHROME = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const query = process.argv[2] ?? "";
const out = resolve(process.argv[3] ?? "shots/world.png");
const [w, h] = (process.argv[4] ?? "1280x720").split("x");
mkdirSync(dirname(out), { recursive: true });

const server = await preview({ preview: { port: 4173, strictPort: true } });
const url = `http://localhost:4173/${query}`;
const profile = mkdtempSync(join(tmpdir(), "world-shot-"));
await new Promise((res, rej) =>
  execFile(
    CHROME,
    [
      "--headless=new", `--user-data-dir=${profile}`,
      "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
      `--window-size=${w},${h}`, "--hide-scrollbars", "--force-device-scale-factor=1",
      "--virtual-time-budget=15000", "--run-all-compositor-stages-before-draw",
      `--screenshot=${out}`, url,
    ],
    { timeout: 120000 },
    (err) => (err ? rej(err) : res()),
  ),
);
await server.close();
console.log(`shot -> ${out}`);
```

In `package.json` add this line inside `"scripts"`:

```json
"shot": "node scripts/shot.mjs",
```

Append to `.gitignore`:

```
shots/
```

- [ ] **Step 6: Verify the build and the shell renders**

Run: `npm run build && npm run shot -- "" shots/t1.png 1280x720`
Expected: build succeeds with no TypeScript errors; `shots/t1.png` shows a pale blue-grey background with one green cube in the middle.

- [ ] **Step 7: Commit**

```bash
git add src/world/state/quality.ts src/world/state/quality.test.ts src/world/state/store.ts src/world/state/store.test.ts src/world/state/runtime.ts src/world/state/runtime.test.ts src/world/ui/SeoMirror.tsx src/world/ui/NoWebGL.tsx src/world/world.css src/world/scene/World.tsx src/world/scene/WorldApp.tsx src/main.tsx scripts/shot.mjs package.json .gitignore
git commit -F - <<'EOF'
feat(world): app shell with store, runtime, SEO mirror and WebGL fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 2: Self-hosted fonts and WorldText

**Files:**
- Create: `public/fonts/schibsted-grotesk-700.woff`, `public/fonts/pixelify-sans-700.woff` (downloaded)
- Create: `src/world/scene/fonts.ts`, `src/world/scene/fonts.test.ts`
- Create: `src/world/scene/WorldText.tsx`
- Modify: `src/world/world.css` (append `@font-face`)

**Interfaces:**
- Consumes: drei `Text`.
- Produces: `FONT_URLS`, `WorldText` (master contract signature).

- [ ] **Step 1: Write the failing test**

`src/world/scene/fonts.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FONT_URLS } from "./fonts";

describe("FONT_URLS", () => {
  for (const [name, url] of Object.entries(FONT_URLS)) {
    it(`${name} points at a real WOFF file in public/`, () => {
      const bytes = readFileSync(resolve(process.cwd(), "public" + url));
      expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOFF");
      expect(bytes.length).toBeGreaterThan(5000);
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/scene/fonts.test.ts`
Expected: FAIL — `Failed to resolve import "./fonts"`.

- [ ] **Step 3: Download the fonts and add the module**

```bash
mkdir -p public/fonts
curl -fL -o public/fonts/schibsted-grotesk-700.woff "https://cdn.jsdelivr.net/fontsource/fonts/schibsted-grotesk@latest/latin-700-normal.woff"
curl -fL -o public/fonts/pixelify-sans-700.woff "https://cdn.jsdelivr.net/fontsource/fonts/pixelify-sans@latest/latin-700-normal.woff"
node -e "for (const f of ['schibsted-grotesk-700','pixelify-sans-700']) { const b = require('fs').readFileSync('public/fonts/'+f+'.woff'); console.log(f, b.subarray(0,4).toString('latin1'), b.length); }"
```

Expected output: both lines start with the file name followed by `wOFF` and a size above 5000. If either `curl` fails (HTTP error), use the npm packages instead:

```bash
npm i -D @fontsource/schibsted-grotesk @fontsource/pixelify-sans
cp node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff public/fonts/schibsted-grotesk-700.woff
cp node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff public/fonts/pixelify-sans-700.woff
```

`src/world/scene/fonts.ts`:

```ts
export const FONT_URLS = {
  ui: "/fonts/schibsted-grotesk-700.woff",
  pixel: "/fonts/pixelify-sans-700.woff",
} as const;
```

`src/world/scene/WorldText.tsx`:

```tsx
import type { JSX } from "react";
import { Text } from "@react-three/drei";
import { FONT_URLS } from "./fonts";

export function WorldText({
  text,
  position,
  rotationY = 0,
  size = 0.5,
  color = "#1d2a33",
  font = "ui",
  anchorX = "center",
  maxWidth,
}: {
  text: string;
  position: [number, number, number];
  rotationY?: number;
  size?: number;
  color?: string;
  font?: "ui" | "pixel";
  anchorX?: "left" | "center" | "right";
  maxWidth?: number;
}): JSX.Element {
  return (
    <Text
      position={position}
      rotation={[0, rotationY, 0]}
      fontSize={size}
      color={color}
      font={FONT_URLS[font]}
      anchorX={anchorX}
      anchorY="middle"
      textAlign={anchorX === "center" ? "center" : anchorX}
      maxWidth={maxWidth}
      letterSpacing={font === "ui" ? -0.01 : 0}
    >
      {text}
    </Text>
  );
}
```

Append to `src/world/world.css`:

```css
@font-face {
  font-family: "Schibsted Grotesk";
  src: url("/fonts/schibsted-grotesk-700.woff") format("woff");
  font-weight: 600 800;
  font-display: swap;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/scene/fonts.test.ts && npm run build`
Expected: PASS (2 tests); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add public/fonts/schibsted-grotesk-700.woff public/fonts/pixelify-sans-700.woff src/world/scene/fonts.ts src/world/scene/fonts.test.ts src/world/scene/WorldText.tsx src/world/world.css
git commit -F - <<'EOF'
feat(world): self-hosted fonts and SDF WorldText

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

If the npm fallback was used, also `git add package.json package-lock.json`.

---

### Task 3: Sky, lights, island terrain, placeholder islands, World

**Files:**
- Create: `src/world/scene/islands/types.ts`, `src/world/scene/islands/types.test.ts`
- Create: `src/world/scene/islands/placeholder.tsx`, `src/world/scene/islands/index.ts`
- Create: `src/world/scene/Sky.tsx`, `src/world/scene/Lights.tsx`, `src/world/scene/RoomEnv.tsx`
- Create: `src/world/scene/IslandTerrain.tsx`, `src/world/scene/InitialView.tsx`
- Modify: `src/world/scene/World.tsx` (full replacement)

**Interfaces:**
- Consumes: `buildWorld`, `BuiltWorld`, `InstanceBatch`, `VoxelGrid`, `blockId`, `IslandPlacement`, `TourStop`, `mulberry32`, `Vec3`; `runtime`, `useWorld`, `Quality`; `WorldText`.
- Produces: `StarIslandModule`, `STAR_ISLANDS`, `VIEW_F`, `VIEW_R`, `islandTop`, `defaultTourStop`; `Sky`, `Lights`, `RoomEnv`, `IslandTerrain`, `World`.

- [ ] **Step 1: Write the failing test**

`src/world/scene/islands/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { VIEW_F, VIEW_R, defaultTourStop, islandTop } from "./types";

const p: IslandPlacement = { id: "gtid", kind: "star", district: "game", origin: { x: 22, y: 2, z: -8 }, radius: 9, depth: 7, seed: 1 };

describe("tour framing helpers", () => {
  it("islandTop is the centre of the walkable surface", () => {
    expect(islandTop(p)).toEqual({ x: 22.5, y: 3, z: -7.5 });
  });

  it("VIEW_F and VIEW_R are unit length and perpendicular", () => {
    expect(Math.hypot(VIEW_F.x, VIEW_F.z)).toBeCloseTo(1, 2);
    expect(Math.hypot(VIEW_R.x, VIEW_R.z)).toBeCloseTo(1, 2);
    expect(VIEW_F.x * VIEW_R.x + VIEW_F.z * VIEW_R.z).toBeCloseTo(0, 2);
  });

  it("defaultTourStop looks along VIEW_F and puts the island right of centre", () => {
    const s = defaultTourStop(p);
    const dx = s.target.x - s.camera.x;
    const dz = s.target.z - s.camera.z;
    const len = Math.hypot(dx, dz);
    expect(dx / len).toBeCloseTo(VIEW_F.x, 2);
    expect(dz / len).toBeCloseTo(VIEW_F.z, 2);
    const top = islandTop(p);
    const sideways = (top.x - s.target.x) * VIEW_R.x + (top.z - s.target.z) * VIEW_R.z;
    expect(sideways).toBeGreaterThan(2);
    expect(s.camera.y).toBeGreaterThan(top.y);
    expect(s.id).toBe("gtid");
    expect(s.dwell).toBe(1);
  });

  it("respects options", () => {
    const s = defaultTourStop(p, { distance: 10, height: 4, shift: 0, dwell: 2 });
    expect(Math.hypot(s.target.x - s.camera.x, s.target.z - s.camera.z)).toBeCloseTo(10, 4);
    expect(s.camera.y - s.target.y).toBeCloseTo(4, 4);
    expect(s.dwell).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/scene/islands/types.test.ts`
Expected: FAIL — `Failed to resolve import "./types"`.

- [ ] **Step 3: Implement the island contract and placeholders**

`src/world/scene/islands/types.ts`:

```ts
import type { FC } from "react";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import type { TourStop } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";

export interface StarIslandModule {
  id: string;
  Component: FC<{ placement: IslandPlacement }>;
  stamp?: (grid: VoxelGrid, placement: IslandPlacement) => void;
  tourStop: (placement: IslandPlacement) => TourStop;
}

/** Horizontal forward of every tour camera (looks toward +x, −z) and its right vector. */
export const VIEW_F = { x: 0.582, z: -0.813 };
export const VIEW_R = { x: 0.813, z: 0.582 };

export function islandTop(p: IslandPlacement): Vec3 {
  return { x: p.origin.x + 0.5, y: p.origin.y + 1, z: p.origin.z + 0.5 };
}

export function defaultTourStop(
  p: IslandPlacement,
  opts: { distance?: number; height?: number; shift?: number; dwell?: number } = {},
): TourStop {
  const { distance = 26, height = 12, shift = 3.5, dwell = 1 } = opts;
  const top = islandTop(p);
  // aim left of the island so it sits right of centre, leaving the bottom-left calm
  const target = { x: top.x - VIEW_R.x * shift, y: top.y + 1.5, z: top.z - VIEW_R.z * shift };
  const camera = {
    x: target.x - VIEW_F.x * distance,
    y: target.y + height,
    z: target.z - VIEW_F.z * distance,
  };
  return { id: p.id, camera, target, dwell };
}
```

`src/world/scene/islands/placeholder.tsx`:

```tsx
import { blockId } from "@/world/engine/voxel/blocks";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { WorldText } from "../WorldText";
import { VIEW_F, defaultTourStop, islandTop } from "./types";
import type { StarIslandModule } from "./types";

/** Stand-in island used until Part C: a 3-block stone pillar and the island's name. */
export function placeholderIsland(id: string, title: string, dwell = 1): StarIslandModule {
  function PlaceholderComponent({ placement }: { placement: IslandPlacement }) {
    const top = islandTop(placement);
    return (
      <WorldText
        text={title}
        position={[top.x, top.y + 4.2, top.z]}
        rotationY={Math.atan2(-VIEW_F.x, -VIEW_F.z)}
        size={1.1}
      />
    );
  }
  return {
    id,
    Component: PlaceholderComponent,
    stamp: (grid: VoxelGrid, p: IslandPlacement) => {
      for (let y = 1; y <= 3; y++) grid.set(p.origin.x, p.origin.y + y, p.origin.z, blockId("stone"));
    },
    tourStop: (p: IslandPlacement) => defaultTourStop(p, { dwell }),
  };
}
```

`src/world/scene/islands/index.ts`:

```ts
import { placeholderIsland } from "./placeholder";
import type { StarIslandModule } from "./types";

export const STAR_ISLANDS: Record<string, StarIslandModule> = {
  hero: placeholderIsland("hero", "Ezra Brilliant", 1.3),
  gtid: placeholderIsland("gtid", "GTID"),
  "petak-umpet": placeholderIsland("petak-umpet", "Petak Umpet"),
  "orbit-store": placeholderIsland("orbit-store", "Orbit Store"),
  "ezra-bot": placeholderIsland("ezra-bot", "Ezra Bot"),
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/scene/islands/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement sky, lights, environment, terrain and World**

`src/world/scene/Sky.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/world/engine/gen/rng";
import { useWorld } from "@/world/state/store";

const SKY_TOP = new THREE.Color("#8ab3d1");
const SKY_MID = new THREE.Color("#cbdce4");
const SKY_LOW = new THREE.Color("#d8e2e3");

function skyGeometry(): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(400, 32, 20);
  const pos = geo.attributes.position;
  const cols: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 400;
    if (y >= 0) c.copy(SKY_MID).lerp(SKY_TOP, Math.pow(Math.min(1, y * 1.35), 0.75));
    else c.copy(SKY_MID).lerp(SKY_LOW, Math.min(1, -y * 3));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  return geo;
}

function CloudSea() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reduced = useWorld((s) => s.reducedMotion);
  const clouds = useMemo(() => {
    const r = mulberry32(7);
    return Array.from({ length: 70 }, () => ({
      x: -40 + r() * 170,
      y: -16 - r() * 5,
      z: -50 + r() * 70,
      sx: 4 + r() * 9,
      sz: 3 + r() * 7,
      speed: 0.2 + r() * 0.3,
    }));
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const write = (t: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    clouds.forEach((c, i) => {
      const x = ((c.x + t * c.speed + 40) % 170) - 40;
      m.makeScale(c.sx, 1.2, c.sz).setPosition(x, c.y, c.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => write(0));
  useFrame((state) => {
    if (!reduced) write(state.clock.elapsedTime);
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, clouds.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f4f6f5" roughness={1} />
    </instancedMesh>
  );
}

export function Sky() {
  const sphere = useRef<THREE.Mesh>(null);
  const geometry = useMemo(skyGeometry, []);
  useFrame(({ camera }) => {
    sphere.current?.position.copy(camera.position);
  });
  return (
    <>
      <color attach="background" args={["#cbdce4"]} />
      <fog attach="fog" args={["#cbdce4", 70, 210]} />
      <mesh ref={sphere} geometry={geometry} renderOrder={-1}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <CloudSea />
    </>
  );
}
```

`src/world/scene/Lights.tsx`:

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { VIEW_F, VIEW_R, islandTop } from "./islands/types";

// sun sits back-left of the view and high, like the sketch: warm, low-ish, soft shadows
const SUN_OFFSET = { x: -VIEW_R.x * 14 - VIEW_F.x * 6, y: 21, z: -VIEW_R.z * 14 - VIEW_F.z * 6 };

export function Lights() {
  const quality = useWorld((s) => s.quality);
  const sun = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const focus = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const s = useWorld.getState();
    if (s.mode === "play") focus.set(runtime.player.pos.x, runtime.player.pos.y, runtime.player.pos.z);
    else {
      const top = islandTop(runtime.islandById(s.activeIsland));
      focus.set(top.x, top.y, top.z);
    }
    target.position.lerp(focus, 0.08);
    sun.current?.position.set(target.position.x + SUN_OFFSET.x, target.position.y + SUN_OFFSET.y, target.position.z + SUN_OFFSET.z);
  });
  const hi = quality === "high";
  return (
    <>
      <hemisphereLight args={["#e2ebf0", "#a08c6d", 1.25]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        color="#ffe1bb"
        intensity={2.5}
        castShadow={hi}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}
```

`src/world/scene/RoomEnv.tsx`:

```tsx
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Low-intensity procedural environment so metal and glass props have something to reflect. */
export function RoomEnv({ intensity = 0.3 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      if (scene.environment === env) scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}
```

`src/world/scene/IslandTerrain.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { InstanceBatch } from "@/world/engine/voxel/mesher";
import type { Quality } from "@/world/state/store";

const geometries: Partial<Record<Quality, RoundedBoxGeometry>> = {};
function blockGeometry(q: Quality): RoundedBoxGeometry {
  return (geometries[q] ??= new RoundedBoxGeometry(1, 1, 1, q === "high" ? 2 : 1, 0.08));
}
const blockMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92, metalness: 0 });

export function IslandTerrain({ batch, quality }: { batch: InstanceBatch; quality: Quality }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => blockGeometry(quality), [quality]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < batch.count; i++) {
      m.makeTranslation(batch.positions[i * 3], batch.positions[i * 3 + 1], batch.positions[i * 3 + 2]);
      mesh.setMatrixAt(i, m);
      c.setRGB(batch.colors[i * 3], batch.colors[i * 3 + 1], batch.colors[i * 3 + 2], THREE.SRGBColorSpace);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [batch, geometry]);
  if (batch.count === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, blockMaterial, batch.count]}
      castShadow={quality === "high"}
      receiveShadow
    />
  );
}
```

`src/world/scene/InitialView.tsx` (frames the hero before the tour camera exists; harmless afterwards):

```tsx
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { runtime } from "@/world/state/runtime";
import { STAR_ISLANDS } from "./islands";

export function InitialView() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const stop = STAR_ISLANDS.hero.tourStop(runtime.islandById("hero"));
    camera.position.set(stop.camera.x, stop.camera.y, stop.camera.z);
    camera.lookAt(stop.target.x, stop.target.y, stop.target.z);
  }, [camera]);
  return null;
}
```

Replace the whole of `src/world/scene/World.tsx` with:

```tsx
import { useMemo } from "react";
import { buildWorld } from "@/world/engine/worldBuild";
import type { BuiltWorld } from "@/world/engine/worldBuild";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { STAR_ISLANDS } from "./islands";
import { IslandTerrain } from "./IslandTerrain";
import { InitialView } from "./InitialView";
import { Lights } from "./Lights";
import { RoomEnv } from "./RoomEnv";
import { Sky } from "./Sky";

function build(): BuiltWorld {
  const stamps: Array<(grid: VoxelGrid) => void> = runtime.layout.islands.map(
    (p) => (grid: VoxelGrid) => STAR_ISLANDS[p.id]?.stamp?.(grid, p),
  );
  const built = buildWorld(runtime.layout, stamps);
  runtime.built = built;
  return built;
}

export function World() {
  const quality = useWorld((s) => s.quality);
  const built = useMemo(build, []);
  return (
    <>
      <Sky />
      <Lights />
      <RoomEnv />
      <InitialView />
      {runtime.layout.islands.map((p) => {
        const batch = built.batches[p.id];
        return batch ? <IslandTerrain key={`terrain-${p.id}`} batch={batch} quality={quality} /> : null;
      })}
      {runtime.layout.islands.map((p) => {
        const M = STAR_ISLANDS[p.id];
        return M ? <M.Component key={`island-${p.id}`} placement={p} /> : null;
      })}
    </>
  );
}
```

- [ ] **Step 6: Verify the build and the world renders**

Run: `npm run build && npm run shot -- "" shots/t3.png 1280x720`
Expected: build succeeds; `shots/t3.png` shows the hero island right of centre (grass top, earth sides, tapering stone underside) in a soft blue sky with fog, other islands receding behind it, white blocky clouds below, a 3-block stone pillar and the label "Ezra Brilliant" floating above the hero island.

- [ ] **Step 7: Commit**

```bash
git add src/world/scene/islands/types.ts src/world/scene/islands/types.test.ts src/world/scene/islands/placeholder.tsx src/world/scene/islands/index.ts src/world/scene/Sky.tsx src/world/scene/Lights.tsx src/world/scene/RoomEnv.tsx src/world/scene/IslandTerrain.tsx src/world/scene/InitialView.tsx src/world/scene/World.tsx
git commit -F - <<'EOF'
feat(world): sky, lights, instanced island terrain and placeholder islands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 4: Input modules (keyboard, touch joystick, orbit)

**Files:**
- Create: `src/world/input/keyboard.ts`, `src/world/input/keyboard.test.ts`
- Create: `src/world/input/touch.ts`, `src/world/input/touch.test.ts`
- Create: `src/world/input/orbit.ts`, `src/world/input/orbit.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `MOVE_CODES`, `isMoveCode(code)`, `axisFromKeys(keys): { forward: number; right: number }`, `cameraRelative(forward, right, camF: {x, z}): {x, z}`, `Keyboard`, `createKeyboard(target: EventTarget): Keyboard`, `sharedKeyboard`.
  - `joystickVector(origin, current, radius, deadzone?): { x: number; y: number; magnitude: number }`, `touchInput`, `consumeTouch(k: "jump" | "interact"): boolean`, `resetTouch()`.
  - `OrbitInput`, `createOrbitAccumulator()`, `orbitInput`.

- [ ] **Step 1: Write the failing tests**

`src/world/input/keyboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { axisFromKeys, cameraRelative, createKeyboard, isMoveCode } from "./keyboard";

const key = (type: string, code: string, repeat = false) => Object.assign(new Event(type), { code, repeat });

describe("axisFromKeys", () => {
  it("is zero with no keys", () => {
    expect(axisFromKeys(new Set())).toEqual({ forward: 0, right: 0 });
  });
  it("maps WASD and arrows", () => {
    expect(axisFromKeys(new Set(["KeyW"]))).toEqual({ forward: 1, right: 0 });
    expect(axisFromKeys(new Set(["ArrowDown"]))).toEqual({ forward: -1, right: 0 });
    expect(axisFromKeys(new Set(["KeyD"]))).toEqual({ forward: 0, right: 1 });
    expect(axisFromKeys(new Set(["ArrowLeft"]))).toEqual({ forward: 0, right: -1 });
  });
  it("normalises diagonals to length 1", () => {
    const a = axisFromKeys(new Set(["KeyW", "KeyD"]));
    expect(Math.hypot(a.forward, a.right)).toBeCloseTo(1, 6);
  });
  it("cancels opposite keys", () => {
    expect(axisFromKeys(new Set(["KeyW", "KeyS"]))).toEqual({ forward: 0, right: 0 });
  });
});

describe("isMoveCode", () => {
  it("knows movement keys", () => {
    expect(isMoveCode("KeyA")).toBe(true);
    expect(isMoveCode("ArrowUp")).toBe(true);
    expect(isMoveCode("KeyE")).toBe(false);
  });
});

describe("cameraRelative", () => {
  it("forward follows the camera's horizontal forward", () => {
    const v = cameraRelative(1, 0, { x: 0, z: -1 });
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.z).toBeCloseTo(-1, 6);
  });
  it("right is forward × up", () => {
    const v = cameraRelative(0, 1, { x: 0, z: -1 });
    expect(v.x).toBeCloseTo(1, 6);
    expect(v.z).toBeCloseTo(0, 6);
  });
  it("normalises an unnormalised camera vector and clamps length to 1", () => {
    const v = cameraRelative(1, 1, { x: 0, z: -5 });
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(1, 6);
  });
  it("returns zero when the camera looks straight down", () => {
    expect(cameraRelative(1, 0, { x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
  });
});

describe("createKeyboard", () => {
  it("tracks held keys and one-shot presses", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target);
    target.dispatchEvent(key("keydown", "Space"));
    expect(kb.keys.has("Space")).toBe(true);
    expect(kb.consume("Space")).toBe(true);
    expect(kb.consume("Space")).toBe(false);
    target.dispatchEvent(key("keydown", "Space", true));
    expect(kb.consume("Space")).toBe(false);
    target.dispatchEvent(key("keyup", "Space"));
    expect(kb.keys.has("Space")).toBe(false);
    kb.dispose();
  });
  it("clears everything on blur", () => {
    const target = new EventTarget();
    const kb = createKeyboard(target);
    target.dispatchEvent(key("keydown", "KeyW"));
    target.dispatchEvent(new Event("blur"));
    expect(kb.keys.size).toBe(0);
    kb.dispose();
  });
});
```

`src/world/input/touch.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { consumeTouch, joystickVector, resetTouch, touchInput } from "./touch";

describe("joystickVector", () => {
  it("is zero inside the deadzone", () => {
    expect(joystickVector({ x: 100, y: 100 }, { x: 103, y: 102 }, 56)).toEqual({ x: 0, y: 0, magnitude: 0 });
  });
  it("points forward when dragged up (screen y decreases)", () => {
    const v = joystickVector({ x: 100, y: 100 }, { x: 100, y: 44 }, 56);
    expect(v.y).toBeCloseTo(1, 6);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.magnitude).toBeCloseTo(1, 6);
  });
  it("clamps beyond the radius", () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 500, y: 0 }, 56);
    expect(v.magnitude).toBe(1);
    expect(v.x).toBeCloseTo(1, 6);
  });
  it("rescales magnitude after the deadzone", () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 28, y: 0 }, 56, 0.1);
    expect(v.magnitude).toBeCloseTo((0.5 - 0.1) / 0.9, 6);
  });
});

describe("touch buttons", () => {
  beforeEach(() => resetTouch());
  it("consumes one-shot presses", () => {
    touchInput.jump = true;
    expect(consumeTouch("jump")).toBe(true);
    expect(consumeTouch("jump")).toBe(false);
  });
  it("resetTouch zeroes the stick", () => {
    touchInput.moveForward = 0.7;
    touchInput.active = true;
    resetTouch();
    expect(touchInput.moveForward).toBe(0);
    expect(touchInput.active).toBe(false);
  });
});
```

`src/world/input/orbit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createOrbitAccumulator } from "./orbit";

describe("orbit accumulator", () => {
  it("accumulates drag and zoom and resets on take", () => {
    const acc = createOrbitAccumulator();
    acc.add(100, -40);
    acc.add(20, 0);
    acc.addZoom(120);
    const a = acc.take();
    expect(a.orbitX).toBeCloseTo(120 * 0.005, 6);
    expect(a.orbitY).toBeCloseTo(-40 * 0.005, 6);
    expect(a.zoom).toBeCloseTo(120 * 0.002, 6);
    expect(acc.take()).toEqual({ orbitX: 0, orbitY: 0, zoom: 0 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/input`
Expected: FAIL — `Failed to resolve import "./keyboard"` (and `./touch`, `./orbit`).

- [ ] **Step 3: Implement the input modules**

`src/world/input/keyboard.ts`:

```ts
export const MOVE_CODES = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;

const ALL_MOVE = new Set<string>([...MOVE_CODES.forward, ...MOVE_CODES.back, ...MOVE_CODES.left, ...MOVE_CODES.right]);

export function isMoveCode(code: string): boolean {
  return ALL_MOVE.has(code);
}

const any = (keys: ReadonlySet<string>, codes: readonly string[]) => codes.some((c) => keys.has(c));

export function axisFromKeys(keys: ReadonlySet<string>): { forward: number; right: number } {
  const forward = (any(keys, MOVE_CODES.forward) ? 1 : 0) - (any(keys, MOVE_CODES.back) ? 1 : 0);
  const right = (any(keys, MOVE_CODES.right) ? 1 : 0) - (any(keys, MOVE_CODES.left) ? 1 : 0);
  const len = Math.hypot(forward, right);
  return len > 1 ? { forward: forward / len, right: right / len } : { forward, right };
}

/** Converts camera-space intent into a world-space XZ direction (length ≤ 1). Right = forward × up. */
export function cameraRelative(forward: number, right: number, camF: { x: number; z: number }): { x: number; z: number } {
  const l = Math.hypot(camF.x, camF.z);
  if (l < 1e-6) return { x: 0, z: 0 };
  const fx = camF.x / l;
  const fz = camF.z / l;
  const rx = -fz;
  const rz = fx;
  let x = fx * forward + rx * right;
  let z = fz * forward + rz * right;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return { x, z };
}

export interface Keyboard {
  readonly keys: ReadonlySet<string>;
  consume(code: string): boolean;
  dispose(): void;
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el || typeof el.tagName !== "string") return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable === true;
}

export function createKeyboard(target: EventTarget): Keyboard {
  const keys = new Set<string>();
  const pressed = new Set<string>();
  const down = (e: Event) => {
    const k = e as Event & { code?: string; repeat?: boolean };
    if (!k.code || isTypingTarget(e.target)) return;
    keys.add(k.code);
    if (!k.repeat) pressed.add(k.code);
  };
  const up = (e: Event) => {
    const k = e as Event & { code?: string };
    if (k.code) keys.delete(k.code);
  };
  const blur = () => {
    keys.clear();
    pressed.clear();
  };
  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  target.addEventListener("blur", blur);
  return {
    keys,
    consume(code: string) {
      const had = pressed.has(code);
      pressed.delete(code);
      return had;
    },
    dispose() {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
      target.removeEventListener("blur", blur);
    },
  };
}

export const sharedKeyboard: Keyboard = createKeyboard(typeof window !== "undefined" ? window : new EventTarget());
```

`src/world/input/touch.ts`:

```ts
export function joystickVector(
  origin: { x: number; y: number },
  current: { x: number; y: number },
  radius: number,
  deadzone = 0.12,
): { x: number; y: number; magnitude: number } {
  const dx = current.x - origin.x;
  const dy = origin.y - current.y; // screen up = forward
  const dist = Math.hypot(dx, dy);
  const raw = Math.min(1, dist / radius);
  if (raw <= deadzone || dist === 0) return { x: 0, y: 0, magnitude: 0 };
  const magnitude = Math.min(1, (raw - deadzone) / (1 - deadzone));
  return { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude, magnitude };
}

export const touchInput = { moveForward: 0, moveRight: 0, jump: false, interact: false, active: false };

export function consumeTouch(k: "jump" | "interact"): boolean {
  const v = touchInput[k];
  touchInput[k] = false;
  return v;
}

export function resetTouch(): void {
  touchInput.moveForward = 0;
  touchInput.moveRight = 0;
  touchInput.jump = false;
  touchInput.interact = false;
  touchInput.active = false;
}
```

`src/world/input/orbit.ts`:

```ts
export interface OrbitInput {
  orbitX: number;
  orbitY: number;
  zoom: number;
}

const DRAG_TO_RAD = 0.005;
const WHEEL_TO_ZOOM = 0.002;

export function createOrbitAccumulator() {
  const acc: OrbitInput = { orbitX: 0, orbitY: 0, zoom: 0 };
  return {
    add(dxPx: number, dyPx: number) {
      acc.orbitX += dxPx * DRAG_TO_RAD;
      acc.orbitY += dyPx * DRAG_TO_RAD;
    },
    addZoom(deltaY: number) {
      acc.zoom += deltaY * WHEEL_TO_ZOOM;
    },
    take(): OrbitInput {
      const out = { ...acc };
      acc.orbitX = 0;
      acc.orbitY = 0;
      acc.zoom = 0;
      return out;
    },
  };
}

export const orbitInput = createOrbitAccumulator();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/input`
Expected: PASS (3 files, 17 tests).

- [ ] **Step 5: Commit**

```bash
git add src/world/input/keyboard.ts src/world/input/keyboard.test.ts src/world/input/touch.ts src/world/input/touch.test.ts src/world/input/orbit.ts src/world/input/orbit.test.ts
git commit -F - <<'EOF'
feat(world): keyboard, touch joystick and orbit input modules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 5: Voxel Ezra — animation, seat, model

**Files:**
- Create: `src/world/scene/ezra/anim.ts`, `src/world/scene/ezra/anim.test.ts`
- Create: `src/world/scene/ezra/seat.ts`, `src/world/scene/ezra/seat.test.ts`
- Create: `src/world/scene/Ezra.tsx`
- Modify: `src/world/scene/World.tsx` (place the seat after building, mount `<Ezra />`)

**Interfaces:**
- Consumes: `IslandShape`, `Vec3`, `Vec3i`; `runtime`; `useWorld`; `VIEW_F`, `islandTop`.
- Produces: `AnimState`, `AnimInput`, `Pose`, `pickAnim(i)`, `poseFor(state, t, phase, k)`, `STAND_UP_SECONDS`; `findSeat(shape, origin, dir)`; `Ezra`.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/ezra/anim.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { STAND_UP_SECONDS, pickAnim, poseFor } from "./anim";
import type { AnimInput } from "./anim";

const base: AnimInput = { onGround: true, speed: 0, vy: 0, landTimer: 0, seated: false, standUp: 0, riding: false };

describe("pickAnim", () => {
  it("sits while seated, whatever else is true", () => {
    expect(pickAnim({ ...base, seated: true, speed: 5 })).toBe("sit");
  });
  it("rides in the minecart", () => {
    expect(pickAnim({ ...base, riding: true })).toBe("ride");
  });
  it("stands up while the timer runs", () => {
    expect(pickAnim({ ...base, standUp: 0.4 })).toBe("standUp");
  });
  it("jumps going up and falls going down", () => {
    expect(pickAnim({ ...base, onGround: false, vy: 3 })).toBe("jump");
    expect(pickAnim({ ...base, onGround: false, vy: -3 })).toBe("fall");
  });
  it("lands briefly after touching down", () => {
    expect(pickAnim({ ...base, landTimer: 0.1 })).toBe("land");
  });
  it("picks idle, walk, run by speed", () => {
    expect(pickAnim({ ...base, speed: 0.1 })).toBe("idle");
    expect(pickAnim({ ...base, speed: 4.5 })).toBe("walk");
    expect(pickAnim({ ...base, speed: 7.5 })).toBe("run");
  });
});

describe("poseFor", () => {
  const k = { standUp: 0, reduced: false };
  it("swings the run wider than the walk", () => {
    const walk = poseFor("walk", 0, Math.PI / 2, k);
    const run = poseFor("run", 0, Math.PI / 2, k);
    expect(Math.abs(run.legL)).toBeGreaterThan(Math.abs(walk.legL));
    expect(run.lean).toBeGreaterThan(0);
  });
  it("legs move in opposition while walking", () => {
    const p = poseFor("walk", 0, 1, k);
    expect(p.legL).toBeCloseTo(-p.legR, 6);
    expect(Math.sign(p.armL)).toBe(-Math.sign(p.legL));
  });
  it("squashes on landing", () => {
    expect(poseFor("land", 0, 0, k).squash).toBeLessThan(1);
  });
  it("sits low with legs hanging forward", () => {
    const p = poseFor("sit", 0, 0, { standUp: 0, reduced: true });
    expect(p.bodyY).toBeLessThan(-0.4);
    expect(p.legL).toBeCloseTo(-0.35, 6);
  });
  it("reduced motion stops the seated leg swing", () => {
    const r = { standUp: 0, reduced: true };
    expect(poseFor("sit", 0, 0, r).legL).toBe(poseFor("sit", 1.7, 0, r).legL);
  });
  it("ends the stand-up in a standing pose", () => {
    const start = poseFor("standUp", 0, 0, { standUp: STAND_UP_SECONDS, reduced: false });
    const end = poseFor("standUp", 0, 0, { standUp: 0.0001, reduced: false });
    expect(start.bodyY).toBeLessThan(-0.4);
    expect(Math.abs(end.bodyY)).toBeLessThan(0.05);
    expect(Math.abs(end.legL)).toBeLessThan(0.05);
  });
});
```

`src/world/scene/ezra/seat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IslandShape } from "@/world/engine/gen/islandGen";
import { findSeat } from "./seat";

const disc = (r: number): IslandShape => ({
  cells: [],
  surface: (x, z) => (Math.hypot(x, z) <= r ? 0 : null),
});

describe("findSeat", () => {
  it("sits on the rim toward the given direction, on the walkable surface", () => {
    const s = findSeat(disc(4), { x: 10, y: 2, z: -3 }, { x: 0, z: 1 });
    expect(s.pos.y).toBe(3);
    expect(s.pos.x).toBeCloseTo(10.5, 6);
    expect(s.pos.z).toBeCloseTo(-3 + 4 + 1, 6); // last solid cell z=4 → its far face at local z=5
    expect(s.heading).toBeCloseTo(0, 6);
  });
  it("faces outward along the direction", () => {
    const s = findSeat(disc(3), { x: 0, y: 0, z: 0 }, { x: -1, z: 0 });
    expect(s.heading).toBeCloseTo(-Math.PI / 2, 6);
    expect(s.pos.x).toBeLessThan(-2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/ezra`
Expected: FAIL — `Failed to resolve import "./anim"` and `"./seat"`.

- [ ] **Step 3: Implement animation and seat logic**

`src/world/scene/ezra/anim.ts`:

```ts
export type AnimState = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "sit" | "standUp" | "ride";

export interface AnimInput {
  onGround: boolean;
  speed: number;
  vy: number;
  landTimer: number;
  seated: boolean;
  standUp: number;
  riding: boolean;
}

export interface Pose {
  legL: number;
  legR: number;
  armL: number;
  armR: number;
  armSpread: number;
  bodyY: number;
  squash: number;
  headPitch: number;
  headYaw: number;
  lean: number;
}

export const STAND_UP_SECONDS = 1.1;

export function pickAnim(i: AnimInput): AnimState {
  if (i.seated) return "sit";
  if (i.riding) return "ride";
  if (i.standUp > 0) return "standUp";
  if (!i.onGround) return i.vy > 0 ? "jump" : "fall";
  if (i.landTimer > 0) return "land";
  if (i.speed > 5.5) return "run";
  if (i.speed > 0.3) return "walk";
  return "idle";
}

const NEUTRAL: Pose = { legL: 0, legR: 0, armL: 0, armR: 0, armSpread: 0.06, bodyY: 0, squash: 1, headPitch: 0, headYaw: 0, lean: 0 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sitPose(t: number, reduced: boolean): Pose {
  const swing = reduced ? 0 : 0.22;
  return {
    ...NEUTRAL,
    legL: -0.35 + swing * Math.sin(t * 1.5),
    legR: -0.35 + swing * Math.sin(t * 1.5 + 1.3),
    armL: -0.35,
    armR: -0.35,
    armSpread: 0.12,
    bodyY: -0.55,
    headYaw: reduced ? 0 : 0.4 * Math.sin(t * 0.25),
  };
}

export function poseFor(state: AnimState, t: number, phase: number, k: { standUp: number; reduced: boolean }): Pose {
  switch (state) {
    case "idle":
      return { ...NEUTRAL, bodyY: k.reduced ? 0 : 0.015 * Math.sin(t * 2), armL: 0.04 * Math.sin(t * 1.6), armR: -0.04 * Math.sin(t * 1.6) };
    case "walk": {
      const s = Math.sin(phase) * 0.6;
      return { ...NEUTRAL, legL: s, legR: -s, armL: -s * 0.8, armR: s * 0.8, bodyY: Math.abs(Math.sin(phase)) * 0.04 };
    }
    case "run": {
      const s = Math.sin(phase);
      return { ...NEUTRAL, legL: s, legR: -s, armL: -s * 1.1, armR: s * 1.1, bodyY: Math.abs(s) * 0.07, lean: 0.18 };
    }
    case "jump":
      return { ...NEUTRAL, legL: -0.5, legR: 0.3, armL: -0.9, armR: -0.9, armSpread: 0.3 };
    case "fall":
      return { ...NEUTRAL, legL: 0.2, legR: -0.2, armL: -0.4, armR: -0.4, armSpread: 0.6 };
    case "land":
      return { ...NEUTRAL, squash: 0.82, bodyY: -0.06, armSpread: 0.25 };
    case "sit":
      return sitPose(t, k.reduced);
    case "ride":
      return { ...sitPose(t, true), legL: -1.3, legR: -1.3, bodyY: -0.4, headYaw: 0 };
    case "standUp": {
      const s = Math.min(1, Math.max(0, 1 - k.standUp / STAND_UP_SECONDS));
      if (s < 0.55) {
        const u = s / 0.55;
        const sit = sitPose(0, true);
        return { ...NEUTRAL, legL: lerp(sit.legL, 0, u), legR: lerp(sit.legR, 0, u), bodyY: lerp(sit.bodyY, 0, u), armL: lerp(sit.armL, 0, u), armR: lerp(sit.armR, 0, u) };
      }
      const u = (s - 0.55) / 0.45;
      const stretch = Math.sin(Math.PI * u);
      return { ...NEUTRAL, armL: -2.9 * stretch, armR: -2.9 * stretch, squash: 1 + 0.04 * stretch, headPitch: -0.25 * stretch };
    }
  }
}
```

`src/world/scene/ezra/seat.ts`:

```ts
import type { IslandShape } from "@/world/engine/gen/islandGen";
import type { Vec3, Vec3i } from "@/world/engine/types";

/** Finds the rim cell of an island in `dir` and returns a seat on its outer face, facing outward. */
export function findSeat(shape: IslandShape, origin: Vec3i, dir: { x: number; z: number }): { pos: Vec3; heading: number } {
  const l = Math.hypot(dir.x, dir.z) || 1;
  const ux = dir.x / l;
  const uz = dir.z / l;
  let cx = 0;
  let cz = 0;
  let surf = shape.surface(0, 0) ?? 0;
  for (let d = 0.5; d < 64; d += 0.5) {
    const x = Math.round(ux * d);
    const z = Math.round(uz * d);
    const s = shape.surface(x, z);
    if (s === null) break;
    cx = x;
    cz = z;
    surf = s;
  }
  // seat on the cell's outer face: cell centre + half a block outward
  return {
    pos: { x: origin.x + cx + 0.5 + ux * 0.5, y: origin.y + surf + 1, z: origin.z + cz + 0.5 + uz * 0.5 },
    heading: Math.atan2(ux, uz),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/ezra`
Expected: PASS (2 files, 14 tests).

- [ ] **Step 5: Build the model and place the seat**

`src/world/scene/Ezra.tsx`:

```tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { pickAnim, poseFor } from "./ezra/anim";

// colours from the approved sketch: black tee, short black hair, jeans, light shoes
const MAT = {
  jeans: new THREE.MeshStandardMaterial({ color: "#4b5a6e", roughness: 0.9 }),
  shirt: new THREE.MeshStandardMaterial({ color: "#2e3336", roughness: 0.9 }),
  skin: new THREE.MeshStandardMaterial({ color: "#d6ab88", roughness: 0.85 }),
  hair: new THREE.MeshStandardMaterial({ color: "#1e1b19", roughness: 0.95 }),
  shoe: new THREE.MeshStandardMaterial({ color: "#e7e2d8", roughness: 0.9 }),
};

function Part({ size, at, mat, cast }: { size: [number, number, number]; at: [number, number, number]; mat: THREE.Material; cast: boolean }) {
  return (
    <mesh position={at} material={mat} castShadow={cast}>
      <boxGeometry args={size} />
    </mesh>
  );
}

export function Ezra() {
  const cast = useWorld((s) => s.quality === "high");
  const reduced = useWorld((s) => s.reducedMotion);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!root.current || !body.current || !legL.current || !legR.current || !armL.current || !armR.current || !head.current) return;
    const p = runtime.player;
    const seated = runtime.seated && runtime.seat !== null;
    const anim = pickAnim({
      onGround: p.onGround,
      speed: runtime.speed,
      vy: p.vel.y,
      landTimer: runtime.landTimer,
      seated,
      standUp: runtime.standUp,
      riding: runtime.ride?.kind === "rail",
    });
    const pose = poseFor(anim, state.clock.elapsedTime, runtime.animPhase, { standUp: runtime.standUp, reduced });
    if (seated && runtime.seat) {
      root.current.position.set(runtime.seat.pos.x, runtime.seat.pos.y, runtime.seat.pos.z);
      root.current.rotation.y = runtime.seat.heading;
    } else {
      root.current.position.set(p.pos.x, p.pos.y, p.pos.z);
      root.current.rotation.y = runtime.heading;
    }
    body.current.position.y = pose.bodyY;
    body.current.scale.y = pose.squash;
    body.current.rotation.x = pose.lean;
    legL.current.rotation.x = pose.legL;
    legR.current.rotation.x = pose.legR;
    armL.current.rotation.set(pose.armL, 0, pose.armSpread);
    armR.current.rotation.set(pose.armR, 0, -pose.armSpread);
    head.current.rotation.set(pose.headPitch, pose.headYaw, 0);
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* legs pivot at the hips (y 0.62); model faces +Z, its left is +X */}
        <group ref={legL} position={[0.12, 0.62, 0]}>
          <Part size={[0.22, 0.6, 0.22]} at={[0, -0.3, 0]} mat={MAT.jeans} cast={cast} />
          <Part size={[0.24, 0.12, 0.3]} at={[0, -0.58, 0.04]} mat={MAT.shoe} cast={cast} />
        </group>
        <group ref={legR} position={[-0.12, 0.62, 0]}>
          <Part size={[0.22, 0.6, 0.22]} at={[0, -0.3, 0]} mat={MAT.jeans} cast={cast} />
          <Part size={[0.24, 0.12, 0.3]} at={[0, -0.58, 0.04]} mat={MAT.shoe} cast={cast} />
        </group>
        <Part size={[0.5, 0.16, 0.3]} at={[0, 0.68, 0]} mat={MAT.jeans} cast={cast} />
        <Part size={[0.56, 0.58, 0.32]} at={[0, 1.04, 0]} mat={MAT.shirt} cast={cast} />
        <group ref={armL} position={[0.37, 1.28, 0]}>
          <Part size={[0.17, 0.22, 0.18]} at={[0, -0.1, 0]} mat={MAT.shirt} cast={cast} />
          <Part size={[0.15, 0.36, 0.16]} at={[0, -0.38, 0]} mat={MAT.skin} cast={cast} />
        </group>
        <group ref={armR} position={[-0.37, 1.28, 0]}>
          <Part size={[0.17, 0.22, 0.18]} at={[0, -0.1, 0]} mat={MAT.shirt} cast={cast} />
          <Part size={[0.15, 0.36, 0.16]} at={[0, -0.38, 0]} mat={MAT.skin} cast={cast} />
        </group>
        <group ref={head} position={[0, 1.36, 0]}>
          <Part size={[0.46, 0.46, 0.46]} at={[0, 0.23, 0]} mat={MAT.skin} cast={cast} />
          <Part size={[0.5, 0.14, 0.5]} at={[0, 0.47, -0.01]} mat={MAT.hair} cast={cast} />
          <Part size={[0.5, 0.32, 0.1]} at={[0, 0.3, -0.22]} mat={MAT.hair} cast={cast} />
          <Part size={[0.07, 0.07, 0.02]} at={[0.1, 0.24, 0.235]} mat={MAT.hair} cast={false} />
          <Part size={[0.07, 0.07, 0.02]} at={[-0.1, 0.24, 0.235]} mat={MAT.hair} cast={false} />
        </group>
      </group>
    </group>
  );
}
```

In `src/world/scene/World.tsx` add these imports:

```tsx
import { Ezra } from "./Ezra";
import { findSeat } from "./ezra/seat";
import { VIEW_F, islandTop } from "./islands/types";
```

and replace the `build()` function with:

```tsx
function build(): BuiltWorld {
  const stamps: Array<(grid: VoxelGrid) => void> = runtime.layout.islands.map(
    (p) => (grid: VoxelGrid) => STAR_ISLANDS[p.id]?.stamp?.(grid, p),
  );
  const built = buildWorld(runtime.layout, stamps);
  runtime.built = built;
  // Ezra sits on the hero island's rim on the camera side, facing the viewer
  const hero = runtime.islandById("hero");
  const shape = built.shapes.hero;
  if (shape) {
    runtime.seat = findSeat(shape, hero.origin, { x: -VIEW_F.x, z: -VIEW_F.z });
    Object.assign(runtime.player.pos, runtime.seat.pos);
    Object.assign(runtime.player.lastSafe, islandTop(hero));
    runtime.heading = runtime.seat.heading;
  }
  return built;
}
```

and add `<Ezra />` as the last child of the fragment returned by `World`.

- [ ] **Step 6: Verify the model**

Run: `npm run build && npm run shot -- "" shots/t5.png 1280x720`
Expected: build succeeds; `shots/t5.png` shows a small blocky figure (black tee, black hair, jeans, light shoes) sitting on the camera-side rim of the hero island with legs hanging over the edge.

- [ ] **Step 7: Commit**

```bash
git add src/world/scene/ezra/anim.ts src/world/scene/ezra/anim.test.ts src/world/scene/ezra/seat.ts src/world/scene/ezra/seat.test.ts src/world/scene/Ezra.tsx src/world/scene/World.tsx
git commit -F - <<'EOF'
feat(world): voxel Ezra with procedural animation, seated on the hero rim

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 6: Player controller, rides, play camera

**Files:**
- Create: `src/world/scene/crossings/ride.ts`, `src/world/scene/crossings/ride.test.ts`
- Create: `src/world/scene/camera/pullIn.ts`, `src/world/scene/camera/pullIn.test.ts`
- Create: `src/world/scene/PlayerController.tsx`, `src/world/scene/PlayCamera.tsx`
- Modify: `src/world/scene/World.tsx` (mount both)

**Interfaces:**
- Consumes: `stepCharacter`, `respawn`, `DEFAULT_PARAMS`, `CharacterState`; `positionAt`; `railPoint`, `railTangent`, `rideProgress`; `createFollowCam`, `updateFollowCam`; `IsSolid`, `Vec3`; `playSfx`; `runtime`, `Ride`; `useWorld`; `sharedKeyboard`, `axisFromKeys`, `cameraRelative`; `touchInput`, `consumeTouch`; `orbitInput`.
- Produces: `advanceRide(ride, player, dt): boolean` (true when finished), `pullIn(from, to, isSolid, step?): Vec3`, `PlayerController`, `PlayCamera`.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/crossings/ride.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createCharacter } from "@/world/engine/physics/character";
import { solveLaunch } from "@/world/engine/traversal/ballistic";
import { buildRail, railPoint } from "@/world/engine/traversal/rail";
import type { Ride } from "@/world/state/runtime";
import { advanceRide } from "./ride";

describe("advanceRide", () => {
  it("follows a bounce arc and lands exactly on the target", () => {
    const from = { x: 0, y: 3, z: 0 };
    const to = { x: 10, y: 7, z: 2 };
    const { vel, time } = solveLaunch(from, to, 30, 3);
    const ride: Ride = { kind: "arc", t: 0, from, to, vel, time };
    const p = createCharacter({ ...from });
    let done = false;
    let peak = -Infinity;
    for (let i = 0; i < 400 && !done; i++) {
      done = advanceRide(ride, p, 1 / 60);
      peak = Math.max(peak, p.pos.y);
    }
    expect(done).toBe(true);
    expect(p.pos).toEqual(to);
    expect(peak).toBeGreaterThan(to.y + 2);
  });

  it("rides a rail to its exit, and starts at the far end when reversed", () => {
    const rail = buildRail({ x: 0, y: 5, z: 0 }, { x: 20, y: 12, z: -6 }, 3);
    const exit = { x: 22, y: 12, z: -6 };
    const fwd: Ride = { kind: "rail", t: 0, duration: 4, rail, reverse: false, exit, exitHeading: 1 };
    const p = createCharacter({ x: 0, y: 5, z: 0 });
    advanceRide(fwd, p, 0.001);
    expect(p.pos.x).toBeLessThan(1);
    let done = false;
    for (let i = 0; i < 600 && !done; i++) done = advanceRide(fwd, p, 1 / 60);
    expect(done).toBe(true);
    expect(p.pos).toEqual(exit);

    const rev: Ride = { kind: "rail", t: 0, duration: 4, rail, reverse: true, exit: { x: -2, y: 5, z: 0 }, exitHeading: 0 };
    const q = createCharacter({ x: 20, y: 12, z: -6 });
    advanceRide(rev, q, 0.001);
    const end = railPoint(rail, 1);
    expect(Math.hypot(q.pos.x - end.x, q.pos.z - end.z)).toBeLessThan(1);
  });
});
```

`src/world/scene/camera/pullIn.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pullIn } from "./pullIn";

describe("pullIn", () => {
  it("keeps the desired position when nothing blocks", () => {
    const to = { x: 0, y: 5, z: 8 };
    expect(pullIn({ x: 0, y: 2, z: 0 }, to, () => false)).toEqual(to);
  });
  it("stops in front of the first solid block", () => {
    const wall = (x: number, y: number, z: number) => z === 4 && y >= 0 && y < 10 && x >= -5 && x < 5;
    const p = pullIn({ x: 0.5, y: 2.5, z: 0.5 }, { x: 0.5, y: 2.5, z: 9.5 }, wall);
    expect(p.z).toBeLessThan(4);
    expect(p.z).toBeGreaterThan(2.5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/crossings/ride.test.ts src/world/scene/camera/pullIn.test.ts`
Expected: FAIL — `Failed to resolve import "./ride"` and `"./pullIn"`.

- [ ] **Step 3: Implement ride and pull-in**

`src/world/scene/crossings/ride.ts`:

```ts
import { positionAt } from "@/world/engine/traversal/ballistic";
import { railPoint, railTangent, rideProgress } from "@/world/engine/traversal/rail";
import { DEFAULT_PARAMS } from "@/world/engine/physics/character";
import type { CharacterState } from "@/world/engine/physics/character";
import type { Ride } from "@/world/state/runtime";

/** Advances a locked ride; returns true on the frame it finishes (player placed at the exit). */
export function advanceRide(ride: Ride, player: CharacterState, dt: number): boolean {
  ride.t += dt;
  if (ride.kind === "arc") {
    if (ride.t >= ride.time) {
      Object.assign(player.pos, ride.to);
      return true;
    }
    Object.assign(player.pos, positionAt(ride.from, ride.vel, DEFAULT_PARAMS.gravity, ride.t));
    return false;
  }
  if (ride.t >= ride.duration) {
    Object.assign(player.pos, ride.exit);
    return true;
  }
  const u = rideProgress(ride.t, ride.duration);
  const p = railPoint(ride.rail, ride.reverse ? 1 - u : u);
  player.pos.x = p.x;
  player.pos.y = p.y + 0.35;
  player.pos.z = p.z;
  return false;
}

/** Heading that faces along the rail in the ride's direction. */
export function rideHeading(ride: Extract<Ride, { kind: "rail" }>): number {
  const u = rideProgress(Math.min(ride.t, ride.duration), ride.duration);
  const tan = railTangent(ride.rail, ride.reverse ? 1 - u : u);
  const s = ride.reverse ? -1 : 1;
  return Math.atan2(tan.x * s, tan.z * s);
}
```

`src/world/scene/camera/pullIn.ts`:

```ts
import type { IsSolid, Vec3 } from "@/world/engine/types";

/** Marches from `from` toward `to`; returns the last free point before a solid block. */
export function pullIn(from: Vec3, to: Vec3, isSolid: IsSolid, step = 0.25): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return { ...to };
  const n = Math.ceil(len / step);
  let last: Vec3 = { ...from };
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = { x: from.x + dx * t, y: from.y + dy * t, z: from.z + dz * t };
    if (isSolid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) return last;
    last = p;
  }
  return { ...to };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/crossings/ride.test.ts src/world/scene/camera/pullIn.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the controller and play camera**

`src/world/scene/PlayerController.tsx`:

```tsx
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { respawn, stepCharacter } from "@/world/engine/physics/character";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { axisFromKeys, cameraRelative, sharedKeyboard } from "@/world/input/keyboard";
import { consumeTouch, touchInput } from "@/world/input/touch";
import { advanceRide, rideHeading } from "./crossings/ride";

const TAU = Math.PI * 2;
function dampAngle(a: number, b: number, lambda: number, dt: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-lambda * dt));
}

function setFade(opacity: number) {
  const el = document.getElementById("world-fade");
  if (el) el.style.opacity = String(opacity);
}

export function PlayerController() {
  const camera = useThree((s) => s.camera);
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), stepTimer: 0, fade: 0, fading: false as false | "out" | "in" }), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const built = runtime.built;
    if (!built) return;
    const p = runtime.player;
    if (runtime.landTimer > 0) runtime.landTimer = Math.max(0, runtime.landTimer - dt);
    if (runtime.standUp > 0) {
      runtime.standUp = Math.max(0, runtime.standUp - dt);
      if (runtime.standUp === 0) p.locked = false;
    }
    if (useWorld.getState().mode !== "play") {
      runtime.moving = false;
      runtime.speed = 0;
      return;
    }

    // respawn fade: out (0.25 s) → teleport → in (0.35 s)
    if (tmp.fading) {
      if (tmp.fading === "out") {
        tmp.fade = Math.min(1, tmp.fade + dt / 0.25);
        if (tmp.fade === 1) {
          respawn(p);
          runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.2, z: p.pos.z }, "dust", { count: 14 });
          tmp.fading = "in";
        }
      } else {
        tmp.fade = Math.max(0, tmp.fade - dt / 0.35);
        if (tmp.fade === 0) tmp.fading = false;
      }
      setFade(tmp.fade);
      if (tmp.fading === "out") return;
    }

    if (runtime.ride) {
      const ride = runtime.ride;
      const done = advanceRide(ride, p, dt);
      if (ride.kind === "rail") runtime.heading = done ? ride.exitHeading : rideHeading(ride);
      else runtime.heading = Math.atan2(ride.to.x - ride.from.x, ride.to.z - ride.from.z);
      runtime.speed = 0;
      runtime.moving = true;
      if (done) {
        runtime.ride = null;
        p.locked = false;
        p.vel.x = p.vel.y = p.vel.z = 0;
        p.onGround = true;
        runtime.landTimer = 0.14;
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.1, z: p.pos.z }, "dust", { count: 10 });
        playSfx("land");
      }
      return;
    }

    const ax = axisFromKeys(sharedKeyboard.keys);
    const forward = THREE.MathUtils.clamp(ax.forward + touchInput.moveForward, -1, 1);
    const right = THREE.MathUtils.clamp(ax.right + touchInput.moveRight, -1, 1);
    camera.getWorldDirection(tmp.dir);
    const move = cameraRelative(forward, right, { x: tmp.dir.x, z: tmp.dir.z });
    const jump = sharedKeyboard.consume("Space") || consumeTouch("jump");
    const run = sharedKeyboard.keys.has("ShiftLeft") || sharedKeyboard.keys.has("ShiftRight");

    const r = stepCharacter(p, { moveX: move.x, moveZ: move.z, run, jump }, dt, {
      isSolid: built.grid.isSolid,
      killY: runtime.killY,
    });

    if (Math.hypot(move.x, move.z) > 0.05) runtime.heading = dampAngle(runtime.heading, Math.atan2(move.x, move.z), 12, dt);
    runtime.speed = Math.hypot(p.vel.x, p.vel.z);
    runtime.moving = runtime.speed > 0.3;
    runtime.animPhase += runtime.speed * dt * 1.7;

    if (r.jumped) playSfx("jump");
    if (r.landed) {
      runtime.landTimer = 0.14;
      runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.1, z: p.pos.z }, "dust", { count: 8 });
      playSfx("land");
    }
    if (p.onGround && runtime.speed > 5.5) {
      tmp.stepTimer -= dt;
      if (tmp.stepTimer <= 0) {
        tmp.stepTimer = 0.28;
        runtime.particles.burst({ x: p.pos.x, y: p.pos.y + 0.05, z: p.pos.z }, "dust", { count: 3 });
        playSfx("step");
      }
    }
    if (r.fellOut && !tmp.fading) tmp.fading = "out";
  });
  return null;
}
```

`src/world/scene/PlayCamera.tsx`:

```tsx
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { orbitInput } from "@/world/input/orbit";
import { pullIn } from "./camera/pullIn";

export function PlayCamera() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const cam = useMemo(() => createFollowCam(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      if (useWorld.getState().mode !== "play" || e.pointerType === "touch") return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      orbitInput.add(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      if (useWorld.getState().mode !== "play") return;
      e.preventDefault();
      orbitInput.addZoom(e.deltaY);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    if (useWorld.getState().mode !== "play") return;
    const dt = Math.min(rawDt, 1 / 30);
    const p = runtime.player.pos;
    const target = { x: p.x, y: p.y + 1.4, z: p.z };
    const { position, lookAt } = updateFollowCam(cam, target, runtime.heading, runtime.moving, dt, orbitInput.take());
    const safe = runtime.built ? pullIn(lookAt, position, runtime.built.grid.isSolid) : position;
    goal.set(safe.x, safe.y, safe.z);
    camera.position.lerp(goal, 1 - Math.exp(-6 * dt));
    look.set(lookAt.x, lookAt.y, lookAt.z);
    camera.lookAt(look);
    runtime.cameraPos.x = camera.position.x;
    runtime.cameraPos.y = camera.position.y;
    runtime.cameraPos.z = camera.position.z;
  });
  return null;
}
```

In `src/world/scene/World.tsx` add the imports:

```tsx
import { PlayCamera } from "./PlayCamera";
import { PlayerController } from "./PlayerController";
```

and add `<PlayerController />` and `<PlayCamera />` after `<Ezra />`.

- [ ] **Step 6: Verify**

Run: `npx vitest run && npm run build`
Expected: all tests PASS; build succeeds. (Play mode is reachable after Task 8; the visual check happens there.)

- [ ] **Step 7: Commit**

```bash
git add src/world/scene/crossings/ride.ts src/world/scene/crossings/ride.test.ts src/world/scene/camera/pullIn.ts src/world/scene/camera/pullIn.test.ts src/world/scene/PlayerController.tsx src/world/scene/PlayCamera.tsx src/world/scene/World.tsx
git commit -F - <<'EOF'
feat(world): player controller, ride advancing and follow camera

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 7: Tour camera and scroll track

**Files:**
- Create: `src/world/scene/tour/tourMath.ts`, `src/world/scene/tour/tourMath.test.ts`
- Create: `src/world/scene/tour/scrollToIsland.ts`
- Create: `src/world/scene/TourCamera.tsx`, `src/world/ui/TourScrollTrack.tsx`
- Modify: `src/world/scene/World.tsx` (mount `TourCamera`), `src/world/scene/WorldApp.tsx` (mount `TourScrollTrack`)

**Interfaces:**
- Consumes: `buildTourPath`, `samplePath`, `stopProgress`, `TourPath`; `buildRail`, `railPoint`; `solveLaunch`, `positionAt`; `WorldLayout`; `Vec3`; `STAR_ISLANDS`, `VIEW_F`; `runtime`; `useWorld`.
- Produces: `TRACK_VH_PER_STOP`, `trackHeightPx(stops, viewportH)`, `scrollToProgress(scrollY, trackPx, viewportH)`, `progressToScroll(p, trackPx, viewportH)`, `chapterAt(path, progress)`, `tourVia(layout)`, `scrollToIsland(id)`, `TourCamera`, `TourScrollTrack`.

- [ ] **Step 1: Write the failing test**

`src/world/scene/tour/tourMath.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { buildTourPath, stopProgress } from "@/world/engine/camera/tourPath";
import { chapterAt, progressToScroll, scrollToProgress, tourVia, trackHeightPx } from "./tourMath";

describe("scroll ↔ progress", () => {
  it("maps the scrollable range to 0..1 and back", () => {
    const track = trackHeightPx(5, 1000);
    expect(track).toBe(7000);
    expect(scrollToProgress(0, track, 1000)).toBe(0);
    expect(scrollToProgress(6000, track, 1000)).toBe(1);
    expect(scrollToProgress(9999, track, 1000)).toBe(1);
    expect(progressToScroll(0.5, track, 1000)).toBe(3000);
    expect(scrollToProgress(progressToScroll(0.37, track, 1000), track, 1000)).toBeCloseTo(0.37, 9);
  });
});

describe("tourVia", () => {
  const layout = buildLayout(worldProjects);
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
  it("keeps via cameras above the crossing they follow", () => {
    const via = tourVia(layout);
    layout.tourOrder.slice(0, -1).forEach((from, i) => {
      const c = layout.crossings.find((x) => x.from === from && x.to === layout.tourOrder[i + 1])!;
      for (const v of via[i]) expect(v.y).toBeGreaterThan(Math.min(c.a.y, c.b.y));
    });
  });
});

describe("chapterAt", () => {
  it("returns the nearest stop index", () => {
    const stop = (id: string, x: number) => ({ id, camera: { x, y: 10, z: 20 }, target: { x, y: 0, z: 0 }, dwell: 1 });
    const path = buildTourPath([stop("a", 0), stop("b", 30), stop("c", 60)]);
    expect(chapterAt(path, 0)).toBe(0);
    expect(chapterAt(path, stopProgress(path, 1))).toBe(1);
    expect(chapterAt(path, 1)).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/scene/tour/tourMath.test.ts`
Expected: FAIL — `Failed to resolve import "./tourMath"`.

- [ ] **Step 3: Implement tour math and scrollToIsland**

`src/world/scene/tour/tourMath.ts`:

```ts
import { stopProgress } from "@/world/engine/camera/tourPath";
import type { TourPath } from "@/world/engine/camera/tourPath";
import { buildRail, railPoint } from "@/world/engine/traversal/rail";
import { positionAt, solveLaunch } from "@/world/engine/traversal/ballistic";
import type { WorldLayout } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import { VIEW_F } from "../islands/types";

export const TRACK_VH_PER_STOP = 140;

export function trackHeightPx(stops: number, viewportH: number): number {
  return (stops * TRACK_VH_PER_STOP * viewportH) / 100;
}

export function scrollToProgress(scrollY: number, trackPx: number, viewportH: number): number {
  const max = Math.max(1, trackPx - viewportH);
  return Math.min(1, Math.max(0, scrollY / max));
}

export function progressToScroll(p: number, trackPx: number, viewportH: number): number {
  return Math.min(1, Math.max(0, p)) * Math.max(1, trackPx - viewportH);
}

export function chapterAt(path: TourPath, progress: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.stops.length; i++) {
    const d = Math.abs(stopProgress(path, i) - progress);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** A camera point that watches `p` from above and behind along the tour view direction. */
function watch(p: Vec3, lift: number, back: number): Vec3 {
  return { x: p.x - VIEW_F.x * back, y: p.y + lift, z: p.z - VIEW_F.z * back };
}

/** Camera via points between consecutive tour stops, following the real crossing. */
export function tourVia(layout: WorldLayout): Vec3[][] {
  const out: Vec3[][] = [];
  for (let i = 0; i < layout.tourOrder.length - 1; i++) {
    const from = layout.tourOrder[i];
    const to = layout.tourOrder[i + 1];
    const c = layout.crossings.find((x) => x.from === from && x.to === to);
    if (!c) {
      out.push([]);
      continue;
    }
    if (c.kind === "minecart") {
      const rail = buildRail(c.a, c.b, 3);
      out.push([0.2, 0.4, 0.6, 0.8].map((u) => watch(railPoint(rail, u), 7, 13)));
    } else if (c.kind === "bouncePads") {
      const { vel, time } = solveLaunch(c.a, c.b, 30, 3);
      out.push([0.3, 0.5, 0.7].map((f) => watch(positionAt(c.a, vel, 30, time * f), 6, 15)));
    } else {
      const mid = { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2, z: (c.a.z + c.b.z) / 2 };
      out.push([watch(mid, 9, 18)]);
    }
  }
  return out;
}
```

`src/world/scene/tour/scrollToIsland.ts`:

```ts
import { stopProgress } from "@/world/engine/camera/tourPath";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { progressToScroll, trackHeightPx } from "./tourMath";

export function scrollToIsland(id: string): void {
  const path = runtime.tourPath;
  if (!path) return;
  const i = path.stops.findIndex((s) => s.id === id);
  if (i < 0) return;
  const vh = window.innerHeight;
  const top = progressToScroll(stopProgress(path, i), trackHeightPx(path.stops.length, vh), vh);
  window.scrollTo({ top, behavior: useWorld.getState().reducedMotion ? "auto" : "smooth" });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/scene/tour/tourMath.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the tour camera and scroll track**

`src/world/scene/TourCamera.tsx`:

```tsx
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildTourPath, samplePath, stopProgress } from "@/world/engine/camera/tourPath";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { STAR_ISLANDS } from "./islands";
import { chapterAt, progressToScroll, scrollToProgress, tourVia, trackHeightPx } from "./tour/tourMath";

export function TourCamera() {
  const camera = useThree((s) => s.camera);
  const path = useMemo(() => {
    const stops = runtime.layout.tourOrder.map((id) => STAR_ISLANDS[id].tourStop(runtime.islandById(id)));
    const p = buildTourPath(stops, tourVia(runtime.layout));
    runtime.tourPath = p;
    return p;
  }, []);
  const st = useMemo(() => ({ progress: -1, chapter: -1, from: new THREE.Vector3(), cam: new THREE.Vector3(), look: new THREE.Vector3() }), []);

  // ?stop=N deep link (used by screenshots): jump straight to stop N
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("stop");
    if (raw === null) return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n >= path.stops.length) return;
    const vh = window.innerHeight;
    const prog = stopProgress(path, n);
    window.scrollTo(0, progressToScroll(prog, trackHeightPx(path.stops.length, vh), vh));
    st.progress = prog;
  }, [path, st]);

  useFrame((_, rawDt) => {
    const world = useWorld.getState();
    if (world.mode !== "tour") return;
    const dt = Math.min(rawDt, 1 / 30);
    const vh = window.innerHeight;
    const target = scrollToProgress(window.scrollY, trackHeightPx(path.stops.length, vh), vh);
    if (st.progress < 0) st.progress = target;
    if (world.reducedMotion) st.progress = stopProgress(path, chapterAt(path, target));
    else st.progress = THREE.MathUtils.damp(st.progress, target, 4, dt);
    runtime.tourProgress = st.progress;

    const s = samplePath(path, st.progress);
    st.cam.set(s.camera.x, s.camera.y, s.camera.z);
    if (runtime.tourBlend > 0) {
      // glide from where the play camera was back onto the path
      runtime.tourBlend = world.reducedMotion ? 0 : Math.max(0, runtime.tourBlend - dt / 0.8);
      st.from.set(runtime.cameraPos.x, runtime.cameraPos.y, runtime.cameraPos.z);
      st.cam.lerp(st.from, runtime.tourBlend * runtime.tourBlend);
    }
    camera.position.copy(st.cam);
    st.look.set(s.target.x, s.target.y, s.target.z);
    camera.lookAt(st.look);
    if (runtime.tourBlend === 0) {
      runtime.cameraPos.x = camera.position.x;
      runtime.cameraPos.y = camera.position.y;
      runtime.cameraPos.z = camera.position.z;
    }

    const ch = chapterAt(path, st.progress);
    if (ch !== st.chapter) {
      st.chapter = ch;
      world.setActiveIsland(path.stops[ch].id);
    }
  });
  return null;
}
```

`src/world/ui/TourScrollTrack.tsx`:

```tsx
import { runtime } from "@/world/state/runtime";
import { TRACK_VH_PER_STOP } from "@/world/scene/tour/tourMath";

/** Invisible tall element: native page scroll over it drives the tour progress. */
export function TourScrollTrack() {
  return <div className="tour-track" style={{ height: `${runtime.layout.tourOrder.length * TRACK_VH_PER_STOP}vh` }} aria-hidden="true" />;
}
```

In `src/world/scene/World.tsx` add `import { TourCamera } from "./TourCamera";` and add `<TourCamera />` after `<PlayCamera />`.

In `src/world/scene/WorldApp.tsx` add `import { TourScrollTrack } from "@/world/ui/TourScrollTrack";` and render `<TourScrollTrack />` right after the closing `</div>` of `.world-canvas-wrap`.

- [ ] **Step 6: Verify the tour visually**

Run:

```bash
npm run build
for i in 0 1 2 3 4; do npm run shot -- "?stop=$i" shots/t7-stop-$i.png 1280x720; done
npm run shot -- "?stop=0" shots/t7-stop-0-phone.png 520x940
```

Expected: five screenshots, each framing one island (hero, GTID, Petak Umpet, Orbit Store, Ezra Bot placeholders, in that order) right of centre with its floating name label, the bottom-left area calm sky/clouds; the phone shot shows the hero island fully in frame (the runner's narrow-screen pull-back is not needed here because the stop distance already fits; if the island is cut off at 520 px, raise `distance` in `defaultTourStop` for narrow aspect in Task 14).

- [ ] **Step 7: Commit**

```bash
git add src/world/scene/tour/tourMath.ts src/world/scene/tour/tourMath.test.ts src/world/scene/tour/scrollToIsland.ts src/world/scene/TourCamera.tsx src/world/ui/TourScrollTrack.tsx src/world/scene/World.tsx src/world/scene/WorldApp.tsx
git commit -F - <<'EOF'
feat(world): scroll-driven tour camera following the crossings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 8: Mode transitions and HUD

**Files:**
- Create: `src/world/scene/modes.ts`, `src/world/scene/modes.test.ts`
- Create: `src/world/scene/useModeTransitions.ts`
- Create: `src/world/ui/Hud.tsx`
- Modify: `src/world/scene/WorldApp.tsx` (call the hook, mount `Hud`), `src/world/world.css` (append HUD styles)

**Interfaces:**
- Consumes: `nearestProgress`; `IslandPlacement`; `Vec3`; `playSfx`; `runtime`; `useWorld`, `Mode`; `isMoveCode`; `islandTop`; `STAND_UP_SECONDS`; `progressToScroll`, `trackHeightPx`.
- Produces: `EnterKind`, `enterKind(activeIsland, seated)`, `dropStart(p)`; `useModeTransitions()`; `Hud`.

- [ ] **Step 1: Write the failing test**

`src/world/scene/modes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { dropStart, enterKind } from "./modes";

const p: IslandPlacement = { id: "orbit-store", kind: "star", district: "discord", origin: { x: 64, y: 10, z: -18 }, radius: 8, depth: 6, seed: 3 };

describe("enterKind", () => {
  it("stands up when seated on the hero island", () => {
    expect(enterKind("hero", true)).toBe("standUp");
  });
  it("drops from the sky anywhere else, or once Ezra has stood up", () => {
    expect(enterKind("orbit-store", true)).toBe("drop");
    expect(enterKind("hero", false)).toBe("drop");
  });
});

describe("dropStart", () => {
  it("starts high above the island centre", () => {
    expect(dropStart(p)).toEqual({ x: 64.5, y: 26, z: -17.5 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/scene/modes.test.ts`
Expected: FAIL — `Failed to resolve import "./modes"`.

- [ ] **Step 3: Implement modes, the transition hook and the HUD**

`src/world/scene/modes.ts`:

```ts
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";

export type EnterKind = "standUp" | "drop";

export function enterKind(activeIsland: string, seated: boolean): EnterKind {
  return seated && activeIsland === "hero" ? "standUp" : "drop";
}

/** Ezra falls from 15 blocks above the island's centre column. */
export function dropStart(p: IslandPlacement): Vec3 {
  return { x: p.origin.x + 0.5, y: p.origin.y + 16, z: p.origin.z + 0.5 };
}
```

`src/world/scene/useModeTransitions.ts`:

```ts
import { useEffect, useRef } from "react";
import { nearestProgress } from "@/world/engine/camera/tourPath";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import type { Mode } from "@/world/state/store";
import { isMoveCode } from "@/world/input/keyboard";
import { STAND_UP_SECONDS } from "./ezra/anim";
import { islandTop } from "./islands/types";
import { dropStart, enterKind } from "./modes";
import { progressToScroll, trackHeightPx } from "./tour/tourMath";

function enterPlay() {
  document.documentElement.classList.add("world-playing");
  const p = runtime.player;
  const { activeIsland } = useWorld.getState();
  p.vel.x = p.vel.y = p.vel.z = 0;
  if (enterKind(activeIsland, runtime.seated) === "standUp" && runtime.seat) {
    runtime.seated = false;
    runtime.standUp = STAND_UP_SECONDS;
    Object.assign(p.pos, runtime.seat.pos);
    runtime.heading = runtime.seat.heading;
    p.locked = true;
  } else {
    runtime.seated = false;
    const island = runtime.islandById(activeIsland);
    Object.assign(p.pos, dropStart(island));
    Object.assign(p.lastSafe, islandTop(island));
    p.onGround = false;
    p.locked = false;
  }
  playSfx("click");
}

function exitPlay() {
  document.documentElement.classList.remove("world-playing");
  runtime.ride = null;
  runtime.player.locked = false;
  const path = runtime.tourPath;
  if (!path) return;
  const prog = nearestProgress(path, runtime.player.pos);
  const vh = window.innerHeight;
  window.scrollTo(0, progressToScroll(prog, trackHeightPx(path.stops.length, vh), vh));
  runtime.tourBlend = 1;
}

export function useModeTransitions() {
  const mode = useWorld((s) => s.mode);
  const prev = useRef<Mode>("tour");

  useEffect(() => {
    if (mode === prev.current) return;
    prev.current = mode;
    if (mode === "play") enterPlay();
    else exitPlay();
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const s = useWorld.getState();
      if (s.mode === "tour" && isMoveCode(e.code)) s.setMode("play");
      else if (s.mode === "play" && e.code === "Escape") s.setMode("tour");
    };
    window.addEventListener("keydown", onKey);
    // ?play deep link (screenshots / sharing): wait until the world is built and the tour camera
    // has picked the active island (it does so on its first frame), then enter Play there
    let raf = 0;
    if (new URLSearchParams(window.location.search).has("play")) {
      let frames = 0;
      const tick = () => {
        if (runtime.built && runtime.tourPath && ++frames > 2) useWorld.getState().setMode("play");
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, []);
}
```

`src/world/ui/Hud.tsx`:

```tsx
import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";

export function Hud() {
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const muted = useWorld((s) => s.muted);
  const toggleMuted = useWorld((s) => s.toggleMuted);
  const prompt = useWorld((s) => s.prompt);
  return (
    <div className="hud">
      <div className="hud-bar" role="toolbar" aria-label="World controls">
        <button type="button" className="hud-btn" aria-pressed={mode === "play"} onClick={() => setMode(mode === "play" ? "tour" : "play")}>
          {mode === "play" ? "Tour" : "Play"}
        </button>
        <button
          type="button"
          className="hud-btn"
          aria-pressed={!muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          onClick={() => {
            toggleMuted();
            if (muted) playSfx("click");
          }}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
      <p className="hud-hint">
        {mode === "play" ? "WASD move · Space jump · Shift run · E interact · Esc tour" : "Scroll to explore · Play to walk around"}
      </p>
      <div className="hud-prompt" aria-live="polite">
        {prompt ? (
          <>
            {mode === "play" && <kbd>E</kbd>} {prompt.label}
          </>
        ) : null}
      </div>
      <div id="world-fade" className="world-fade" />
    </div>
  );
}
```

In `src/world/scene/WorldApp.tsx` add the imports:

```tsx
import { Hud } from "@/world/ui/Hud";
import { useModeTransitions } from "./useModeTransitions";
```

call `useModeTransitions();` directly after the `const quality = …` line (before the `if (!webgl)` return), and render `<Hud />` after `<TourScrollTrack />`.

Append to `src/world/world.css`:

```css
.hud { position: fixed; inset: 0; z-index: 10; pointer-events: none; }
.hud-bar {
  position: absolute; top: max(16px, env(safe-area-inset-top)); left: 16px;
  display: flex; gap: 8px; pointer-events: auto;
}
.hud-btn {
  font: 700 14px/1 "Schibsted Grotesk", system-ui, sans-serif;
  background: rgba(244, 243, 239, 0.9); color: #13212b;
  border: 1px solid rgba(19, 33, 43, 0.18); border-radius: 6px;
  padding: 10px 14px; cursor: pointer;
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  transition: background-color 0.2s ease, transform 0.1s ease;
}
.hud-btn:hover { background: #ffffff; }
.hud-btn:active { transform: translateY(1px); }
.hud-btn[aria-pressed="true"] { background: #13212b; color: #f4f3ef; }
.hud-btn:focus-visible { outline: 2px solid #13212b; outline-offset: 2px; }
.hud-hint {
  position: absolute; top: calc(max(16px, env(safe-area-inset-top)) + 46px); left: 16px; margin: 0;
  font: 500 12px/1.4 ui-monospace, "SFMono-Regular", Menlo, monospace; color: rgba(19, 33, 43, 0.72);
}
.hud-prompt {
  position: absolute; left: 50%; bottom: max(28px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  font: 700 14px/1 "Schibsted Grotesk", system-ui, sans-serif; color: #f4f3ef;
  background: rgba(19, 33, 43, 0.82); padding: 10px 14px; border-radius: 6px; white-space: nowrap;
}
.hud-prompt:empty { display: none; }
.hud-prompt kbd {
  display: inline-block; min-width: 18px; padding: 3px 5px; margin-right: 4px; border-radius: 4px;
  background: #f4f3ef; color: #13212b; font: 700 12px/1 ui-monospace, monospace; text-align: center;
}
.world-fade { position: fixed; inset: 0; background: #0d1418; opacity: 0; pointer-events: none; }
@media (pointer: coarse) { .hud-hint { display: none; } }
@media (prefers-reduced-motion: reduce) { .hud-btn { transition: none; } }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/scene/modes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify Play mode visually**

Run:

```bash
npm run build
npm run shot -- "?stop=0" shots/t8-tour.png 1280x720
npm run shot -- "?stop=0&play" shots/t8-play-hero.png 1280x720
npm run shot -- "?stop=3&play" shots/t8-play-orbit.png 1280x720
```

Expected: `t8-tour.png` shows the HUD (Play + Sound off buttons, hint "Scroll to explore · Play to walk around"); `t8-play-hero.png` shows the camera behind Ezra standing on the hero island (stand-up finished within the virtual time), HUD button reads "Tour"; `t8-play-orbit.png` shows Ezra standing on the Orbit Store placeholder island after dropping in.

- [ ] **Step 6: Commit**

```bash
git add src/world/scene/modes.ts src/world/scene/modes.test.ts src/world/scene/useModeTransitions.ts src/world/ui/Hud.tsx src/world/scene/WorldApp.tsx src/world/world.css
git commit -F - <<'EOF'
feat(world): tour/play transitions (stand up or drop in) and HUD

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 9: Interactables, hover/click, E prompt, keyboard focus

**Files:**
- Create: `src/world/scene/interaction/focus.ts`, `src/world/scene/interaction/focus.test.ts`
- Create: `src/world/scene/Interactable.tsx`, `src/world/scene/InteractionController.tsx`
- Create: `src/world/scene/useTabCycling.ts`
- Modify: `src/world/scene/World.tsx` (mount controller), `src/world/scene/WorldApp.tsx` (tab cycling on the canvas wrapper)

**Interfaces:**
- Consumes: `Interactable` type + registry from Part A (`runtime.registry`), `Vec3`; `playSfx`; `runtime`; `useWorld`; `sharedKeyboard`; `consumeTouch`; drei `Billboard`, `Text`; `FONT_URLS`.
- Produces: `cycleFocus(ids, current, dir): string | null`; `Interactable` component (master contract); `InteractionController`; `useTabCycling(ref)`.

- [ ] **Step 1: Write the failing test**

`src/world/scene/interaction/focus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cycleFocus } from "./focus";

describe("cycleFocus", () => {
  const ids = ["a", "b", "c"];
  it("starts at the first item going forward and the last going back", () => {
    expect(cycleFocus(ids, null, 1)).toBe("a");
    expect(cycleFocus(ids, null, -1)).toBe("c");
  });
  it("moves through the list", () => {
    expect(cycleFocus(ids, "a", 1)).toBe("b");
    expect(cycleFocus(ids, "c", -1)).toBe("b");
  });
  it("returns null past either end so Tab can leave the canvas", () => {
    expect(cycleFocus(ids, "c", 1)).toBeNull();
    expect(cycleFocus(ids, "a", -1)).toBeNull();
  });
  it("restarts when the current id is not in the list", () => {
    expect(cycleFocus(ids, "zzz", 1)).toBe("a");
  });
  it("returns null for an empty list", () => {
    expect(cycleFocus([], null, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/scene/interaction/focus.test.ts`
Expected: FAIL — `Failed to resolve import "./focus"`.

- [ ] **Step 3: Implement focus cycling, the component, the controller and the hook**

`src/world/scene/interaction/focus.ts`:

```ts
export function cycleFocus(ids: readonly string[], current: string | null, dir: 1 | -1): string | null {
  if (ids.length === 0) return null;
  const i = current === null ? -1 : ids.indexOf(current);
  if (i === -1) return dir === 1 ? ids[0] : ids[ids.length - 1];
  const next = i + dir;
  return next < 0 || next >= ids.length ? null : ids[next];
}
```

`src/world/scene/Interactable.tsx`:

```tsx
import { useEffect, useMemo, useRef } from "react";
import type { JSX, ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { FONT_URLS } from "./fonts";

export function Interactable({
  id,
  island,
  label,
  position,
  size,
  radius = 2.5,
  onActivate,
  enabled,
  children,
}: {
  id: string;
  island: string;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  radius?: number;
  onActivate: () => void;
  enabled?: () => boolean;
  children?: ReactNode;
}): JSX.Element {
  const mode = useWorld((s) => s.mode);
  const lift = useRef<THREE.Group>(null);
  const outline = useRef<THREE.Group>(null);
  const tag = useRef<THREE.Group>(null);
  const activate = useRef(onActivate);
  activate.current = onActivate;
  const isEnabled = useRef(enabled);
  isEnabled.current = enabled;
  const [px, py, pz] = position;
  const [sx, sy, sz] = size;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), [sx, sy, sz]);

  useEffect(
    () =>
      runtime.registry.register({
        id,
        island,
        label,
        position: { x: px, y: py, z: pz },
        hitbox: { min: { x: px - sx / 2, y: py - sy / 2, z: pz - sz / 2 }, max: { x: px + sx / 2, y: py + sy / 2, z: pz + sz / 2 } },
        radius,
        onActivate: () => {
          playSfx("click");
          activate.current();
        },
        enabled: () => (isEnabled.current ? isEnabled.current() : true),
      }),
    [id, island, label, px, py, pz, sx, sy, sz, radius],
  );

  useFrame((_, dt) => {
    const on = runtime.hoverId === id || runtime.focusId === id;
    if (lift.current) lift.current.position.y = THREE.MathUtils.damp(lift.current.position.y, on ? 0.1 : 0, 12, dt);
    if (outline.current) outline.current.visible = on;
    if (tag.current) tag.current.visible = on;
  });

  return (
    <>
      <group ref={lift}>{children}</group>
      <group ref={outline} position={position} visible={false}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#fff6dc" transparent opacity={0.9} />
        </lineSegments>
      </group>
      <group ref={tag} position={[px, py + sy / 2 + 0.5, pz]} visible={false}>
        <Billboard>
          <Text
            font={FONT_URLS.ui}
            fontSize={0.3}
            color="#fffaf0"
            outlineWidth={0.025}
            outlineColor="#13212b"
            anchorX="center"
            anchorY="middle"
          >
            {mode === "play" ? `E  ${label}` : label}
          </Text>
        </Billboard>
      </group>
    </>
  );
}
```

`src/world/scene/InteractionController.tsx`:

```tsx
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { sharedKeyboard } from "@/world/input/keyboard";
import { consumeTouch } from "@/world/input/touch";

export function InteractionController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ray = useMemo(() => ({ caster: new THREE.Raycaster(), ndc: new THREE.Vector2() }), []);

  // tour: hover + click through the registry's hitboxes (never the block instances)
  useEffect(() => {
    const el = gl.domElement;
    let downX = 0;
    let downY = 0;
    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.caster.setFromCamera(ray.ndc, camera);
      const o = ray.caster.ray.origin;
      const d = ray.caster.ray.direction;
      return runtime.registry.raycast({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || useWorld.getState().mode !== "tour") return;
      const id = pick(e)?.id ?? null;
      if (id === runtime.hoverId) return;
      runtime.hoverId = id;
      el.style.cursor = id ? "pointer" : "";
      useWorld.getState().setHovered(id);
      if (id) playSfx("hover");
    };
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (useWorld.getState().mode !== "tour") return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      pick(e)?.onActivate();
    };
    const onLeave = () => {
      runtime.hoverId = null;
      el.style.cursor = "";
      useWorld.getState().setHovered(null);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [camera, gl, ray]);

  // play: nearest interactable in front of Ezra gets the E prompt
  useFrame(() => {
    const s = useWorld.getState();
    if (s.mode !== "play") return;
    if (runtime.hoverId) runtime.hoverId = null;
    const p = runtime.player.pos;
    const near = runtime.ride
      ? null
      : runtime.registry.nearest({ x: p.x, y: p.y + 0.9, z: p.z }, { x: Math.sin(runtime.heading), y: 0, z: Math.cos(runtime.heading) });
    const id = near?.id ?? null;
    if (id !== runtime.focusId) {
      runtime.focusId = id;
      s.setPrompt(near ? { id: near.id, label: near.label } : null); // change-guarded, event-like
    }
    const pressed = sharedKeyboard.consume("KeyE") || consumeTouch("interact");
    if (pressed && near) near.onActivate();
  });
  return null;
}
```

`src/world/scene/useTabCycling.ts`:

```ts
import { useEffect } from "react";
import type { RefObject } from "react";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { cycleFocus } from "./interaction/focus";

/** Tour mode: Tab / Shift+Tab cycle the interactables of the island in view, Enter activates. */
export function useTabCycling(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clear = () => {
      runtime.focusId = null;
      useWorld.getState().setPrompt(null);
    };
    const onKey = (e: KeyboardEvent) => {
      const s = useWorld.getState();
      if (s.mode !== "tour") return;
      if (e.key === "Tab") {
        const items = runtime.registry.onIsland(s.activeIsland).filter((i) => (i.enabled ? i.enabled() : true));
        const next = cycleFocus(items.map((i) => i.id), runtime.focusId, e.shiftKey ? -1 : 1);
        if (next === null) {
          clear();
          return; // let focus leave the canvas
        }
        e.preventDefault();
        runtime.focusId = next;
        const item = runtime.registry.get(next);
        if (item) s.setPrompt({ id: item.id, label: item.label });
      } else if (e.key === "Enter" && runtime.focusId) {
        runtime.registry.get(runtime.focusId)?.onActivate();
      } else if (e.key === "Escape") {
        clear();
      }
    };
    el.addEventListener("keydown", onKey);
    el.addEventListener("blur", clear);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("blur", clear);
    };
  }, [ref]);
}
```

In `src/world/scene/World.tsx` add `import { InteractionController } from "./InteractionController";` and `<InteractionController />` after `<TourCamera />`.

In `src/world/scene/WorldApp.tsx`: change the first import line to `import { Suspense, useMemo, useRef } from "react";`, add `import { useTabCycling } from "./useTabCycling";`, add `const wrap = useRef<HTMLDivElement>(null);` and `useTabCycling(wrap);` directly after `useModeTransitions();`, and add `ref={wrap}` to the `.world-canvas-wrap` div.

Add a temporary test interactable to the hero placeholder so the system can be checked visually — in `src/world/scene/islands/placeholder.tsx` add `import { Interactable } from "../Interactable";` and replace the `PlaceholderComponent` return with:

```tsx
    return (
      <>
        <WorldText
          text={title}
          position={[top.x, top.y + 4.2, top.z]}
          rotationY={Math.atan2(-VIEW_F.x, -VIEW_F.z)}
          size={1.1}
        />
        <Interactable
          id={`${id}-pillar`}
          island={id}
          label={`${title} pillar`}
          position={[placement.origin.x + 0.5, top.y + 1.5, placement.origin.z + 0.5]}
          size={[1.2, 3.2, 1.2]}
          onActivate={() => undefined}
        />
      </>
    );
```

(Part C replaces the placeholders entirely.)

- [ ] **Step 4: Run the test and verify**

Run: `npx vitest run src/world/scene/interaction/focus.test.ts && npm run build && npm run shot -- "?stop=0&play" shots/t9-play.png 1280x720`
Expected: PASS (5 tests); build succeeds; in `t9-play.png`, if Ezra faces the pillar within 2.5 blocks the pillar shows a pale outline, a floating "E  Ezra Brilliant pillar" tag, and the bottom-centre HUD prompt; otherwise none of them (both are correct; the deterministic check is the unit test).

- [ ] **Step 5: Commit**

```bash
git add src/world/scene/interaction/focus.ts src/world/scene/interaction/focus.test.ts src/world/scene/Interactable.tsx src/world/scene/InteractionController.tsx src/world/scene/useTabCycling.ts src/world/scene/World.tsx src/world/scene/WorldApp.tsx src/world/scene/islands/placeholder.tsx
git commit -F - <<'EOF'
feat(world): interaction system (hover, click, E prompt, Tab focus)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 10: Particle renderer

**Files:**
- Create: `src/world/scene/ParticlesRenderer.tsx`
- Modify: `src/world/scene/World.tsx` (mount it; `?burst` debug hook)

**Interfaces:**
- Consumes: `runtime.particles` (`ParticlePool`); `islandTop`.
- Produces: `ParticlesRenderer` — one `InstancedMesh`, one draw call, every particle preset.

- [ ] **Step 1: Implement the renderer**

`src/world/scene/ParticlesRenderer.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });

export function ParticlesRenderer() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pool = runtime.particles;
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), c: new THREE.Color(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }),
    [],
  );

  // create instanceColor before the first render so the shader compiles with per-instance colour
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    tmp.c.set("#ffffff");
    tmp.m.makeScale(0, 0, 0);
    for (let i = 0; i < pool.capacity; i++) {
      mesh.setColorAt(i, tmp.c);
      mesh.setMatrixAt(i, tmp.m);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  }, [pool, tmp]);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    pool.step(Math.min(dt, 1 / 30));
    for (let i = 0; i < pool.capacity; i++) {
      const sc = pool.scales[i];
      tmp.p.set(pool.positions[i * 3], pool.positions[i * 3 + 1], pool.positions[i * 3 + 2]);
      tmp.s.setScalar(sc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
      if (sc > 0) {
        tmp.c.setRGB(pool.colors[i * 3], pool.colors[i * 3 + 1], pool.colors[i * 3 + 2], THREE.SRGBColorSpace);
        mesh.setColorAt(i, tmp.c);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, pool.capacity]} frustumCulled={false} />;
}
```

In `src/world/scene/World.tsx`: add `import { useEffect, useMemo } from "react";` (replacing the existing `useMemo` import) and `import { ParticlesRenderer } from "./ParticlesRenderer";`, render `<ParticlesRenderer />` after `<InteractionController />`, and add this effect inside `World` after the `built` line:

```tsx
  // ?burst debug hook: confetti over the hero island every 0.6 s (used by screenshots)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("burst")) return;
    const top = islandTop(runtime.islandById("hero"));
    const id = window.setInterval(() => runtime.particles.burst({ x: top.x, y: top.y + 2.5, z: top.z }, "confetti"), 600);
    return () => window.clearInterval(id);
  }, []);
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm run shot -- "?stop=0&burst" shots/t10-burst.png 1280x720`
Expected: build succeeds; `t10-burst.png` shows small coloured cubes scattered above and around the hero island.

- [ ] **Step 3: Commit**

```bash
git add src/world/scene/ParticlesRenderer.tsx src/world/scene/World.tsx
git commit -F - <<'EOF'
feat(world): single-draw-call particle renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 11: Crossings — bridge, stepping stones, bounce pads, minecart

**Files:**
- Create: `src/world/scene/crossings/geometry.ts`, `src/world/scene/crossings/geometry.test.ts`
- Create: `src/world/scene/crossings/stamp.ts`, `src/world/scene/crossings/stamp.test.ts`
- Create: `src/world/scene/crossings/Bridge.tsx`, `src/world/scene/crossings/SteppingStones.tsx`, `src/world/scene/crossings/BouncePad.tsx`, `src/world/scene/crossings/Minecart.tsx`
- Modify: `src/world/scene/World.tsx` (stamp crossings, render them)

**Interfaces:**
- Consumes: `Crossing`, `IslandPlacement`, `WorldLayout`; `VoxelGrid`, `blockId`; `solveLaunch`; `buildRail`, `railPoint`, `railTangent`, `Rail`; `stopProgress`; `DEFAULT_PARAMS`; `Vec3`, `Vec3i`; `playSfx`; `runtime`; `useWorld`; `Interactable`; `WorldText`; `scrollToIsland`; `worldProjects`.
- Produces: `bridgeCells(a, b, width?)`, `bridgePlanks(a, b)`, `steppingStones(a, b, side?, spacing?)`, `inset(anchor, island, dist)`, `padPair(c, from, to)`, `railEnds(c, from, to)`, `railLength(rail)`; `stampCrossings(grid, layout)`; `Bridge`, `SteppingStones`, `BouncePad`, `Minecart`.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/crossings/geometry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { buildRail } from "@/world/engine/traversal/rail";
import { bridgeCells, bridgePlanks, inset, padPair, railEnds, railLength, steppingStones } from "./geometry";

const a = { x: 0, y: 1, z: 0 };
const b = { x: 9, y: 3, z: 3 };

describe("bridgeCells", () => {
  const cells = bridgeCells(a, b);
  it("spans both anchors", () => {
    expect(Math.min(...cells.map((c) => c.x))).toBeLessThanOrEqual(0);
    expect(Math.max(...cells.map((c) => c.x))).toBeGreaterThanOrEqual(8);
  });
  it("rises in stairs of at most one block along the way", () => {
    const along = (c: { x: number; z: number }) => ((c.x + 0.5 - a.x) * (b.x - a.x) + (c.z + 0.5 - a.z) * (b.z - a.z)) / Math.hypot(b.x - a.x, b.z - a.z);
    const sorted = [...cells].sort((p, q) => along(p) - along(q));
    for (let i = 1; i < sorted.length; i++) expect(Math.abs(sorted[i].y - sorted[i - 1].y)).toBeLessThanOrEqual(1);
  });
  it("puts the deck one row under the walking surface", () => {
    const ys = cells.map((c) => c.y);
    expect(Math.min(...ys)).toBe(a.y - 1);
    expect(Math.max(...ys)).toBe(b.y - 1);
  });
});

describe("bridgePlanks", () => {
  it("lies flush with the stepped walking surface", () => {
    for (const p of bridgePlanks(a, b)) {
      expect(Math.abs(p.y + 0.09 - Math.round(p.y + 0.09))).toBeLessThan(1e-9);
      expect(p.s).toBeGreaterThanOrEqual(0);
      expect(p.s).toBeLessThanOrEqual(1);
    }
  });
});

describe("steppingStones", () => {
  const stones = steppingStones({ x: 0, y: 2, z: 0 }, { x: 12, y: 3, z: 0 });
  it("places reachable stones beside the bridge", () => {
    expect(stones.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < stones.length; i++) {
      // 1-block stones: ≤ 2.9 centre-to-center leaves a ≤ 1.9-block gap, inside the ~2.8-block walking jump
      const d = Math.hypot(stones[i].x - stones[i - 1].x, stones[i].z - stones[i - 1].z);
      expect(d).toBeLessThanOrEqual(2.9);
      expect(Math.abs(stones[i].y - stones[i - 1].y)).toBeLessThanOrEqual(1);
    }
    for (const s of stones) expect(Math.abs(s.z)).toBeGreaterThanOrEqual(2);
  });
});

const island = (id: string, x: number, y: number, z: number, r = 8): IslandPlacement => ({
  id, kind: "star", district: "game", origin: { x, y, z }, radius: r, depth: 6, seed: 1,
});

describe("inset / padPair / railEnds", () => {
  const from = island("f", 0, 2, 0);
  const to = island("t", 30, 8, 0);
  const crossing = { kind: "bouncePads" as const, from: "f", to: "t", a: { x: 8, y: 3, z: 0.5 }, b: { x: 22, y: 9, z: 0.5 } };
  it("moves an anchor toward its island centre", () => {
    const p = inset(crossing.a, from, 2);
    expect(p.x).toBeCloseTo(6, 1);
    expect(p.y).toBe(3);
  });
  it("snaps pads to block centres inside each island", () => {
    const { a: pa, b: pb } = padPair(crossing, from, to);
    expect(pa.x % 1).toBeCloseTo(0.5, 6);
    expect(pb.z % 1).toBeCloseTo(0.5, 6);
    expect(Math.hypot(pa.x - 0.5, pa.z - 0.5)).toBeLessThan(from.radius);
    expect(Math.hypot(pb.x - 30.5, pb.z - 0.5)).toBeLessThan(to.radius);
  });
  it("gives stations and stand points for a rail", () => {
    const e = railEnds({ ...crossing, kind: "minecart" }, from, to);
    expect(Math.hypot(e.standA.x - 0.5, e.standA.z - 0.5)).toBeLessThan(Math.hypot(e.stationA.x - 0.5, e.stationA.z - 0.5));
    expect(railLength(buildRail(e.stationA, e.stationB, 3))).toBeGreaterThan(Math.hypot(e.stationB.x - e.stationA.x, e.stationB.z - e.stationA.z));
  });
});
```

`src/world/scene/crossings/stamp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId } from "@/world/engine/voxel/blocks";
import { bridgeCells } from "./geometry";
import { stampCrossings } from "./stamp";

describe("stampCrossings", () => {
  const layout = buildLayout(worldProjects);
  it("makes every bridge deck solid and leaves existing blocks alone", () => {
    const grid = new VoxelGrid();
    const keep = blockId("grass");
    const bridge = layout.crossings.find((c) => c.kind === "bridge")!;
    const first = bridgeCells(bridge.a, bridge.b)[0];
    grid.set(first.x, first.y, first.z, keep);
    stampCrossings(grid, layout);
    for (const c of bridgeCells(bridge.a, bridge.b)) expect(grid.isSolid(c.x, c.y, c.z)).toBe(true);
    expect(grid.get(first.x, first.y, first.z)).toBe(keep);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/crossings/geometry.test.ts src/world/scene/crossings/stamp.test.ts`
Expected: FAIL — `Failed to resolve import "./geometry"` and `"./stamp"`.

- [ ] **Step 3: Implement geometry and stamping**

`src/world/scene/crossings/geometry.ts`:

```ts
import type { Crossing, IslandPlacement } from "@/world/engine/gen/layout";
import { railPoint } from "@/world/engine/traversal/rail";
import type { Rail } from "@/world/engine/traversal/rail";
import type { Vec3, Vec3i } from "@/world/engine/types";

const lerp = (p: number, q: number, t: number) => p + (q - p) * t;

function frame(a: Vec3, b: Vec3) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { dx, dz, len, ux: dx / len, uz: dz / len, px: -dz / len, pz: dx / len };
}

/** Collision cells of a bridge deck (one row under the walking surface), stepped by at most 1 block. */
export function bridgeCells(a: Vec3, b: Vec3, width = 2): Vec3i[] {
  const f = frame(a, b);
  const steps = Math.max(2, Math.ceil(f.len * 3));
  const seen = new Map<string, Vec3i>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = a.x + f.dx * t;
    const cz = a.z + f.dz * t;
    const y = Math.round(lerp(a.y, b.y, t)) - 1;
    for (let w = 0; w < width; w++) {
      const off = w - (width - 1) / 2;
      const x = Math.floor(cx + f.px * off);
      const z = Math.floor(cz + f.pz * off);
      const k = `${x},${y},${z}`;
      if (!seen.has(k)) seen.set(k, { x, y, z });
    }
  }
  return [...seen.values()];
}

/** Visual planks every 0.5 blocks, top flush with the stepped surface; `s` = 0..1 along the bridge. */
export function bridgePlanks(a: Vec3, b: Vec3): Array<{ x: number; y: number; z: number; yaw: number; s: number }> {
  const f = frame(a, b);
  const n = Math.max(2, Math.round(f.len / 0.5));
  const yaw = Math.atan2(f.ux, f.uz);
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    return { x: a.x + f.dx * s, y: Math.round(lerp(a.y, b.y, s)) - 0.09, z: a.z + f.dz * s, yaw, s };
  });
}

/** One-block stones beside the bridge (offset `side`), every `spacing` blocks, within jump reach. */
export function steppingStones(a: Vec3, b: Vec3, side = 2.6, spacing = 2): Vec3i[] {
  const f = frame(a, b);
  const out: Vec3i[] = [];
  for (let d = 1.2; d <= f.len - 1.2; d += spacing) {
    const t = d / f.len;
    out.push({
      x: Math.floor(a.x + f.ux * d + f.px * side),
      y: Math.round(lerp(a.y, b.y, t)) - 1,
      z: Math.floor(a.z + f.uz * d + f.pz * side),
    });
  }
  return out;
}

/** Moves a rim anchor `dist` blocks toward its island's centre column (same height). */
export function inset(anchor: Vec3, island: IslandPlacement, dist: number): Vec3 {
  const cx = island.origin.x + 0.5;
  const cz = island.origin.z + 0.5;
  const dx = cx - anchor.x;
  const dz = cz - anchor.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: anchor.x + (dx / l) * dist, y: anchor.y, z: anchor.z + (dz / l) * dist };
}

const snap = (p: Vec3): Vec3 => ({ x: Math.floor(p.x) + 0.5, y: p.y, z: Math.floor(p.z) + 0.5 });

/** Bounce pads sit 1.6 blocks inside each rim anchor, on block centres, at walking height. */
export function padPair(c: Crossing, from: IslandPlacement, to: IslandPlacement): { a: Vec3; b: Vec3 } {
  return { a: snap(inset(c.a, from, 1.6)), b: snap(inset(c.b, to, 1.6)) };
}

/** Minecart stations 1.4 blocks inside each rim, stand-off points 2.8 blocks inside. */
export function railEnds(c: Crossing, from: IslandPlacement, to: IslandPlacement) {
  return {
    stationA: snap(inset(c.a, from, 1.4)),
    stationB: snap(inset(c.b, to, 1.4)),
    standA: snap(inset(c.a, from, 2.8)),
    standB: snap(inset(c.b, to, 2.8)),
  };
}

export function railLength(rail: Rail, samples = 64): number {
  let len = 0;
  let prev = railPoint(rail, 0);
  for (let i = 1; i <= samples; i++) {
    const p = railPoint(rail, i / samples);
    len += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
    prev = p;
  }
  return len;
}
```

`src/world/scene/crossings/stamp.ts`:

```ts
import type { WorldLayout } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId } from "@/world/engine/voxel/blocks";
import { bridgeCells, steppingStones } from "./geometry";

/** Invisible collision for bridge decks and stepping stones (their meshes are drawn by the components). */
export function stampCrossings(grid: VoxelGrid, layout: WorldLayout): void {
  const barrier = blockId("barrier");
  const put = (x: number, y: number, z: number) => {
    if (grid.get(x, y, z) === 0) grid.set(x, y, z, barrier);
  };
  for (const c of layout.crossings) {
    if (c.kind !== "bridge") continue;
    for (const cell of bridgeCells(c.a, c.b)) put(cell.x, cell.y, cell.z);
    for (const s of steppingStones(c.a, c.b)) put(s.x, s.y, s.z);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/crossings`
Expected: PASS (geometry, stamp and the Task 6 ride tests).

- [ ] **Step 5: Implement the crossing components**

`src/world/scene/crossings/Bridge.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Crossing } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { bridgePlanks } from "./geometry";

const plankGeo = new THREE.BoxGeometry(2.1, 0.18, 0.42);
const plankMat = new THREE.MeshStandardMaterial({ color: "#b98f62", roughness: 0.9 });
const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4f37", roughness: 0.9 });
const ropeMat = new THREE.MeshStandardMaterial({ color: "#c9b48a", roughness: 1 });

export function Bridge({ crossing }: { crossing: Crossing }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reduced = useWorld((s) => s.reducedMotion);
  const cast = useWorld((s) => s.quality === "high");
  const planks = useMemo(() => bridgePlanks(crossing.a, crossing.b), [crossing]);
  const offsets = useMemo(() => new Float32Array(planks.length), [planks]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), up: new THREE.Vector3(0, 1, 0) }), []);
  const len = Math.hypot(crossing.b.x - crossing.a.x, crossing.b.z - crossing.a.z);
  const ux = (crossing.b.x - crossing.a.x) / len;
  const uz = (crossing.b.z - crossing.a.z) / len;

  const write = () => {
    const mesh = ref.current;
    if (!mesh) return;
    planks.forEach((pl, i) => {
      tmp.q.setFromAxisAngle(tmp.up, pl.yaw);
      tmp.p.set(pl.x, pl.y + offsets[i], pl.z);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(write);

  useFrame((state, dt) => {
    // sway: a spring dip under Ezra while he walks on it, plus a faint idle breathing
    const p = runtime.player.pos;
    const rx = p.x - crossing.a.x;
    const rz = p.z - crossing.a.z;
    const along = (rx * ux + rz * uz) / len;
    const across = Math.abs(rx * -uz + rz * ux);
    const onIt = useWorld.getState().mode === "play" && across < 1.3 && along > 0 && along < 1;
    const t = state.clock.elapsedTime;
    planks.forEach((pl, i) => {
      const dip = onIt ? -0.12 * Math.max(0, 1 - Math.abs(pl.s - along) * 5) : 0;
      const idle = reduced ? 0 : 0.015 * Math.sin(t * 1.3 + i * 0.35) * Math.sin(Math.PI * pl.s);
      offsets[i] = THREE.MathUtils.damp(offsets[i], dip + idle, 10, dt);
    });
    write();
  });

  const ends = [crossing.a, crossing.b];
  const sag = (side: number) => {
    const px = -uz * side;
    const pz = ux * side;
    const pts = Array.from({ length: 13 }, (_, i) => {
      const s = i / 12;
      return new THREE.Vector3(
        crossing.a.x + (crossing.b.x - crossing.a.x) * s + px,
        crossing.a.y + (crossing.b.y - crossing.a.y) * s + 1.05 - 0.35 * Math.sin(Math.PI * s),
        crossing.a.z + (crossing.b.z - crossing.a.z) * s + pz,
      );
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.035, 5, false);
  };
  const ropes = useMemo(() => [sag(1.05), sag(-1.05)], [crossing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      <instancedMesh ref={ref} args={[plankGeo, plankMat, planks.length]} castShadow={cast} receiveShadow />
      {ends.flatMap((e, k) =>
        [1.05, -1.05].map((side) => (
          <mesh key={`${k}-${side}`} position={[e.x - uz * side, e.y + 0.6, e.z + ux * side]} material={woodMat} castShadow={cast}>
            <boxGeometry args={[0.16, 1.2, 0.16]} />
          </mesh>
        )),
      )}
      {ropes.map((g, i) => (
        <mesh key={i} geometry={g} material={ropeMat} />
      ))}
    </group>
  );
}
```

`src/world/scene/crossings/SteppingStones.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Crossing } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { useWorld } from "@/world/state/store";
import { steppingStones } from "./geometry";

const stoneGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.1);
const stoneMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 });
const STONES = ["#b5afa5", "#a9a399", "#bfb9af"];

export function SteppingStones({ crossing }: { crossing: Crossing }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cast = useWorld((s) => s.quality === "high");
  const stones = useMemo(() => steppingStones(crossing.a, crossing.b), [crossing]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = mulberry32(stones.length * 97 + 13);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    stones.forEach((s, i) => {
      m.makeTranslation(s.x + 0.5, s.y + 0.5, s.z + 0.5);
      mesh.setMatrixAt(i, m);
      c.set(STONES[Math.floor(r() * STONES.length)]);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [stones]);
  if (stones.length === 0) return null;
  return <instancedMesh ref={ref} args={[stoneGeo, stoneMat, stones.length]} castShadow={cast} receiveShadow />;
}
```

`src/world/scene/crossings/BouncePad.tsx`:

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Crossing } from "@/world/engine/gen/layout";
import { solveLaunch } from "@/world/engine/traversal/ballistic";
import { DEFAULT_PARAMS } from "@/world/engine/physics/character";
import { playSfx } from "@/world/engine/audio/sfx";
import type { Vec3 } from "@/world/engine/types";
import { worldProjects } from "@/config/portfolio";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "../Interactable";
import { scrollToIsland } from "../tour/scrollToIsland";
import { padPair } from "./geometry";

const frameMat = new THREE.MeshStandardMaterial({ color: "#3b3a38", roughness: 0.6, metalness: 0.4 });
const plateMat = new THREE.MeshStandardMaterial({ color: "#d8b04a", roughness: 0.55 });
const arrowMat = new THREE.MeshStandardMaterial({ color: "#f4f3ef", roughness: 0.7 });

const titleOf = (id: string) => worldProjects.find((p) => p.id === id)?.title ?? "Ezra Brilliant";

export function BouncePad({ crossing }: { crossing: Crossing }) {
  const from = runtime.islandById(crossing.from);
  const to = runtime.islandById(crossing.to);
  const pads = useMemo(() => padPair(crossing, from, to), [crossing, from, to]);
  const plates = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const st = useMemo(() => ({ armed: [true, true], squash: [0, 0] }), []);
  const ends: [Vec3, Vec3] = [pads.a, pads.b];

  const launch = (i: 0 | 1) => {
    const p = runtime.player;
    const start = ends[i];
    const target = ends[1 - i];
    const { vel, time } = solveLaunch(start, target, DEFAULT_PARAMS.gravity, 3);
    Object.assign(p.pos, start);
    runtime.ride = { kind: "arc", t: 0, from: { ...start }, to: { ...target }, vel, time };
    p.locked = true;
    st.armed[1 - i] = false; // don't relaunch on landing; re-arms once Ezra steps off
    st.squash[i] = 1;
    runtime.particles.burst({ x: start.x, y: start.y + 0.1, z: start.z }, "dust", { count: 10 });
    playSfx("bounce");
  };

  useFrame((_, dt) => {
    const p = runtime.player;
    const playing = useWorld.getState().mode === "play";
    for (const i of [0, 1] as const) {
      const e = ends[i];
      const onPad = Math.abs(p.pos.x - e.x) < 0.65 && Math.abs(p.pos.z - e.z) < 0.65 && Math.abs(p.pos.y - e.y) < 0.3;
      if (!onPad && !runtime.ride) st.armed[i] = true;
      if (playing && onPad && st.armed[i] && p.onGround && !runtime.ride && !p.locked) launch(i);
      st.squash[i] = Math.max(0, st.squash[i] - dt * 4);
      const g = plates[i].current;
      if (g) g.scale.y = 1 - 0.5 * Math.sin(Math.PI * st.squash[i]);
    }
  });

  return (
    <>
      {([0, 1] as const).map((i) => {
        const e = ends[i];
        const o = ends[1 - i];
        const yaw = Math.atan2(o.x - e.x, o.z - e.z);
        const dest = i === 0 ? crossing.to : crossing.from;
        return (
          <Interactable
            key={i}
            id={`pad-${crossing.from}-${crossing.to}-${i}`}
            island={i === 0 ? crossing.from : crossing.to}
            label={`Bounce to ${titleOf(dest)}`}
            position={[e.x, e.y + 0.3, e.z]}
            size={[1.3, 0.6, 1.3]}
            radius={2}
            onActivate={() => {
              if (useWorld.getState().mode === "play") {
                if (!runtime.ride) launch(i);
              } else scrollToIsland(dest);
            }}
          >
            <group position={[e.x, e.y, e.z]} rotation={[0, yaw, 0]}>
              <mesh position={[0, 0.05, 0]} material={frameMat} receiveShadow>
                <boxGeometry args={[1.3, 0.1, 1.3]} />
              </mesh>
              <group ref={plates[i]} position={[0, 0.1, 0]}>
                <mesh position={[0, 0.04, 0]} material={plateMat}>
                  <boxGeometry args={[1.05, 0.08, 1.05]} />
                </mesh>
                <mesh position={[0.14, 0.09, 0.1]} rotation={[0, Math.PI / 4, 0]} material={arrowMat}>
                  <boxGeometry args={[0.1, 0.03, 0.42]} />
                </mesh>
                <mesh position={[-0.14, 0.09, 0.1]} rotation={[0, -Math.PI / 4, 0]} material={arrowMat}>
                  <boxGeometry args={[0.1, 0.03, 0.42]} />
                </mesh>
              </group>
            </group>
          </Interactable>
        );
      })}
    </>
  );
}
```

`src/world/scene/crossings/Minecart.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Crossing } from "@/world/engine/gen/layout";
import { buildRail, railPoint, railTangent } from "@/world/engine/traversal/rail";
import { stopProgress } from "@/world/engine/camera/tourPath";
import { playSfx } from "@/world/engine/audio/sfx";
import { worldProjects } from "@/config/portfolio";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "../Interactable";
import { WorldText } from "../WorldText";
import { scrollToIsland } from "../tour/scrollToIsland";
import { railEnds, railLength } from "./geometry";

const ironMat = new THREE.MeshStandardMaterial({ color: "#4a4b4e", roughness: 0.5, metalness: 0.6 });
const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4f37", roughness: 0.9 });
const plankMat = new THREE.MeshStandardMaterial({ color: "#b98f62", roughness: 0.9 });
const unit = new THREE.BoxGeometry(1, 1, 1);
const titleOf = (id: string) => worldProjects.find((p) => p.id === id)?.title ?? id;

export function Minecart({ crossing }: { crossing: Crossing }) {
  const from = runtime.islandById(crossing.from);
  const to = runtime.islandById(crossing.to);
  const ends = useMemo(() => railEnds(crossing, from, to), [crossing, from, to]);
  const rail = useMemo(
    () => buildRail({ ...ends.stationA, y: ends.stationA.y + 0.3 }, { ...ends.stationB, y: ends.stationB.y + 0.3 }, 3),
    [ends],
  );
  const duration = useMemo(() => Math.min(6, Math.max(4, railLength(rail) / 6)), [rail]);
  const cast = useWorld((s) => s.quality === "high");
  const sleepers = useRef<THREE.InstancedMesh>(null);
  const rails = useRef<THREE.InstancedMesh>(null);
  const pillars = useRef<THREE.InstancedMesh>(null);
  const cart = useRef<THREE.Group>(null);
  const SAMPLES = useMemo(() => Math.max(24, Math.round(railLength(rail) * 1.4)), [rail]);
  const PILLARS = Math.floor((SAMPLES + 2) / 6); // one per sample i with i % 6 === 3
  const segIndex = runtime.layout.tourOrder.indexOf(crossing.from);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const look = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < SAMPLES; i++) {
      const u = (i + 0.5) / SAMPLES;
      const c = railPoint(rail, u);
      const t = railTangent(rail, u);
      look.lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(t.x, t.y, t.z), up);
      q.setFromRotationMatrix(look);
      p.set(c.x, c.y - 0.12, c.z);
      s.set(1.5, 0.12, 0.28);
      m.compose(p, q, s);
      sleepers.current?.setMatrixAt(i, m);
      const a = railPoint(rail, i / SAMPLES);
      const b = railPoint(rail, (i + 1) / SAMPLES);
      const segLen = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      for (const side of [-0.45, 0.45]) {
        const off = new THREE.Vector3(side, 0, 0).applyQuaternion(q);
        p.set(c.x + off.x, c.y - 0.02, c.z + off.z);
        s.set(0.08, 0.08, segLen + 0.02);
        m.compose(p, q, s);
        rails.current?.setMatrixAt(i * 2 + (side < 0 ? 0 : 1), m);
      }
      if (i % 6 === 3) {
        const h = c.y - 0.2 + 14;
        p.set(c.x, c.y - 0.2 - h / 2, c.z);
        s.set(0.3, h, 0.3);
        m.compose(p, new THREE.Quaternion(), s);
        pillars.current?.setMatrixAt(Math.floor(i / 6), m);
      }
    }
    for (const r of [sleepers, rails, pillars]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  }, [rail, SAMPLES]);

  const startRide = (reverse: boolean) => {
    const p = runtime.player;
    const exit = reverse ? ends.standA : ends.standB;
    const island = reverse ? from : to;
    runtime.ride = {
      kind: "rail",
      t: 0,
      duration,
      rail,
      reverse,
      exit: { ...exit },
      exitHeading: Math.atan2(island.origin.x + 0.5 - exit.x, island.origin.z + 0.5 - exit.z),
    };
    p.locked = true;
    playSfx("cart");
  };

  useFrame(() => {
    const g = cart.current;
    if (!g) return;
    let u = 0;
    const ride = runtime.ride;
    if (ride && ride.kind === "rail" && ride.rail === rail) {
      const k = Math.min(1, ride.t / ride.duration);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      u = ride.reverse ? 1 - e : e;
    } else if (useWorld.getState().mode === "tour" && runtime.tourPath && segIndex >= 0 && segIndex + 1 < runtime.tourPath.stops.length) {
      const a = stopProgress(runtime.tourPath, segIndex);
      const b = stopProgress(runtime.tourPath, segIndex + 1);
      u = THREE.MathUtils.clamp((runtime.tourProgress - a) / (b - a), 0, 1);
    }
    const c = railPoint(rail, u);
    const t = railTangent(rail, u);
    g.position.set(c.x, c.y + 0.05, c.z);
    g.rotation.y = Math.atan2(t.x, t.z);
  });

  return (
    <group>
      <instancedMesh ref={sleepers} args={[unit, woodMat, SAMPLES]} castShadow={cast} />
      <instancedMesh ref={rails} args={[unit, ironMat, SAMPLES * 2]} />
      <instancedMesh ref={pillars} args={[unit, woodMat, PILLARS]} castShadow={cast} />
      <group ref={cart}>
        <mesh position={[0, 0.38, 0]} material={ironMat} castShadow={cast}>
          <boxGeometry args={[1.0, 0.56, 1.3]} />
        </mesh>
        {[-0.42, 0.42].flatMap((x) =>
          [-0.4, 0.4].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]} material={woodMat}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 10]} />
            </mesh>
          )),
        )}
      </group>
      {([
        [ends.stationA, crossing.to, false, crossing.from],
        [ends.stationB, crossing.from, true, crossing.to],
      ] as const).map(([st, dest, reverse, island]) => (
        <Interactable
          key={island}
          id={`cart-${crossing.from}-${crossing.to}-${reverse ? "b" : "a"}`}
          island={island}
          label={`Ride to ${titleOf(dest)}`}
          position={[st.x, st.y + 0.6, st.z]}
          size={[2.4, 1.2, 2.4]}
          radius={2.6}
          onActivate={() => {
            if (useWorld.getState().mode === "play") {
              if (!runtime.ride) startRide(reverse);
            } else scrollToIsland(dest);
          }}
        >
          <mesh position={[st.x, st.y + 0.08, st.z]} material={plankMat} receiveShadow>
            <boxGeometry args={[2.4, 0.16, 2.4]} />
          </mesh>
          <mesh position={[st.x + 1.1, st.y + 0.9, st.z]} material={woodMat} castShadow={cast}>
            <boxGeometry args={[0.14, 1.8, 0.14]} />
          </mesh>
          <WorldText text={`Minecart → ${titleOf(dest)}`} position={[st.x + 1.1, st.y + 1.95, st.z]} size={0.26} color="#13212b" />
        </Interactable>
      ))}
    </group>
  );
}
```

In `src/world/scene/World.tsx` add the imports:

```tsx
import { Bridge } from "./crossings/Bridge";
import { BouncePad } from "./crossings/BouncePad";
import { Minecart } from "./crossings/Minecart";
import { SteppingStones } from "./crossings/SteppingStones";
import { stampCrossings } from "./crossings/stamp";
```

in `build()`, change the `buildWorld` call to:

```tsx
  const built = buildWorld(runtime.layout, [...stamps, (grid: VoxelGrid) => stampCrossings(grid, runtime.layout)]);
```

and render the crossings after the island components:

```tsx
      {runtime.layout.crossings.map((c) => {
        const key = `crossing-${c.from}-${c.to}`;
        if (c.kind === "bridge")
          return (
            <group key={key}>
              <Bridge crossing={c} />
              <SteppingStones crossing={c} />
            </group>
          );
        if (c.kind === "bouncePads") return <BouncePad key={key} crossing={c} />;
        return <Minecart key={key} crossing={c} />;
      })}
```

- [ ] **Step 6: Verify**

Run:

```bash
npx vitest run && npm run build
npm run shot -- "?stop=1" shots/t11-bridge.png 1280x720
npm run shot -- "?stop=3" shots/t11-minecart.png 1280x720
npm run shot -- "?stop=4" shots/t11-pads.png 1280x720
```

Expected: all tests PASS; build succeeds; the GTID shot shows a plank bridge with rope rails and a line of stepping stones beside it; the Orbit Store shot shows the minecart rail with wooden sleepers and pillars dropping into the clouds, a station platform with the sign "Minecart → Orbit Store" on the far island side and the cart parked on the rail; the Ezra Bot shot shows two pads with yellow plates and white chevrons.

- [ ] **Step 7: Commit**

```bash
git add src/world/scene/crossings/geometry.ts src/world/scene/crossings/geometry.test.ts src/world/scene/crossings/stamp.ts src/world/scene/crossings/stamp.test.ts src/world/scene/crossings/Bridge.tsx src/world/scene/crossings/SteppingStones.tsx src/world/scene/crossings/BouncePad.tsx src/world/scene/crossings/Minecart.tsx src/world/scene/World.tsx
git commit -F - <<'EOF'
feat(world): crossings — swaying bridges, stepping stones, bounce pads, minecart

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 12: Mobile controls

**Files:**
- Create: `src/world/ui/MobileControls.tsx`
- Modify: `src/world/scene/WorldApp.tsx` (mount), `src/world/world.css` (append styles)

**Interfaces:**
- Consumes: `joystickVector`, `touchInput`, `resetTouch`; `orbitInput`; `useWorld`.
- Produces: `MobileControls` (floating joystick left, jump + interact right, drag-to-orbit on the right half; a Play stick button in tour mode so touch scrolling is never blocked).

- [ ] **Step 1: Implement the controls**

`src/world/ui/MobileControls.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { joystickVector, resetTouch, touchInput } from "@/world/input/touch";
import { orbitInput } from "@/world/input/orbit";
import { useWorld } from "@/world/state/store";

const RADIUS = 56;

export function MobileControls() {
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const prompt = useWorld((s) => s.prompt);
  const [coarse] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [stick, setStick] = useState<{ ox: number; oy: number; kx: number; ky: number } | null>(null);
  const stickId = useRef<number | null>(null);
  const orbitId = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (mode !== "play") {
      resetTouch();
      setStick(null);
    }
  }, [mode]);

  if (!coarse) return null;

  if (mode === "tour") {
    return (
      <div className="mobile-controls">
        <button type="button" className="mc-start" aria-label="Play: walk around the world" onClick={() => setMode("play")}>
          <span className="mc-start-knob" />
        </button>
      </div>
    );
  }

  const onStickDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    stickId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    touchInput.active = true;
    setStick({ ox: e.clientX, oy: e.clientY, kx: e.clientX, ky: e.clientY });
  };
  const onStickMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickId.current || !stick) return;
    const v = joystickVector({ x: stick.ox, y: stick.oy }, { x: e.clientX, y: e.clientY }, RADIUS);
    touchInput.moveForward = v.y;
    touchInput.moveRight = v.x;
    const dx = e.clientX - stick.ox;
    const dy = e.clientY - stick.oy;
    const d = Math.hypot(dx, dy);
    const k = d > RADIUS ? RADIUS / d : 1;
    setStick({ ...stick, kx: stick.ox + dx * k, ky: stick.oy + dy * k });
  };
  const onStickUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickId.current) return;
    stickId.current = null;
    touchInput.moveForward = 0;
    touchInput.moveRight = 0;
    touchInput.active = false;
    setStick(null);
  };
  const onOrbitDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    orbitId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onOrbitMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== orbitId.current) return;
    orbitInput.add((e.clientX - last.current.x) * 1.2, (e.clientY - last.current.y) * 1.2);
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onOrbitUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId === orbitId.current) orbitId.current = null;
  };

  return (
    <div className="mobile-controls">
      <div className="mc-zone mc-zone--stick" onPointerDown={onStickDown} onPointerMove={onStickMove} onPointerUp={onStickUp} onPointerCancel={onStickUp}>
        {stick && (
          <>
            <span className="mc-base" style={{ left: stick.ox, top: stick.oy }} />
            <span className="mc-knob" style={{ left: stick.kx, top: stick.ky }} />
          </>
        )}
      </div>
      <div className="mc-zone mc-zone--orbit" onPointerDown={onOrbitDown} onPointerMove={onOrbitMove} onPointerUp={onOrbitUp} onPointerCancel={onOrbitUp} />
      <div className="mc-buttons">
        <button type="button" className="mc-btn" onPointerDown={() => (touchInput.interact = true)} disabled={!prompt} aria-label={prompt ? prompt.label : "Nothing to interact with"}>
          {prompt ? prompt.label : "Use"}
        </button>
        <button type="button" className="mc-btn mc-btn--jump" onPointerDown={() => (touchInput.jump = true)} aria-label="Jump">
          Jump
        </button>
      </div>
    </div>
  );
}
```

In `src/world/scene/WorldApp.tsx` add `import { MobileControls } from "@/world/ui/MobileControls";` and render `<MobileControls />` after `<Hud />`.

Append to `src/world/world.css`:

```css
.mobile-controls { position: fixed; inset: 0; z-index: 9; pointer-events: none; }
.mc-zone { position: absolute; bottom: 0; height: 62%; pointer-events: auto; touch-action: none; }
.mc-zone--stick { left: 0; width: 50%; }
.mc-zone--orbit { right: 0; width: 50%; }
.mc-base, .mc-knob { position: fixed; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; }
.mc-base { width: 112px; height: 112px; background: rgba(244, 243, 239, 0.28); border: 2px solid rgba(244, 243, 239, 0.6); }
.mc-knob { width: 52px; height: 52px; background: rgba(244, 243, 239, 0.9); box-shadow: 0 2px 8px rgba(13, 20, 24, 0.25); }
.mc-buttons {
  position: absolute; right: 16px; bottom: max(24px, env(safe-area-inset-bottom));
  display: flex; flex-direction: column; align-items: flex-end; gap: 12px; pointer-events: auto;
}
.mc-btn {
  min-width: 72px; min-height: 56px; padding: 0 16px; border-radius: 28px; border: 0;
  font: 700 15px/1 "Schibsted Grotesk", system-ui, sans-serif;
  background: rgba(244, 243, 239, 0.92); color: #13212b; touch-action: manipulation;
}
.mc-btn:disabled { opacity: 0.45; }
.mc-btn--jump { min-width: 84px; min-height: 84px; border-radius: 50%; background: #13212b; color: #f4f3ef; }
.mc-start {
  position: absolute; left: 24px; bottom: max(28px, env(safe-area-inset-bottom));
  width: 76px; height: 76px; border-radius: 50%; border: 2px solid rgba(19, 33, 43, 0.5);
  background: rgba(244, 243, 239, 0.75); pointer-events: auto; display: grid; place-items: center;
}
.mc-start-knob { width: 30px; height: 30px; border-radius: 50%; background: #13212b; }
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds. Manual check on a phone (or Chrome DevTools device mode with touch): in tour the round Play stick sits bottom-left and the page still scrolls with a finger; tapping it enters Play; dragging on the left half shows the floating stick and moves Ezra; dragging on the right half orbits the camera; Jump jumps; the Use button shows the nearby label and activates it.

- [ ] **Step 3: Commit**

```bash
git add src/world/ui/MobileControls.tsx src/world/scene/WorldApp.tsx src/world/world.css
git commit -F - <<'EOF'
feat(world): mobile controls — floating stick, jump/use buttons, drag orbit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 13: Loader and reduced-motion audit

**Files:**
- Create: `src/world/ui/Loader.tsx`
- Create: `src/world/scene/ReadySignal.tsx`
- Modify: `src/world/scene/World.tsx` (mount `ReadySignal`), `src/world/scene/WorldApp.tsx` (mount `Loader`), `src/world/world.css` (append loader styles)

**Interfaces:**
- Consumes: `useWorld` (`ready`, `setReady`, `reducedMotion`).
- Produces: `Loader` (hero island assembling from falling blocks, fades out on `ready`), `ReadySignal` (sets `ready` two frames after the world mounted, i.e. after fonts resolved inside the Suspense boundary).

- [ ] **Step 1: Implement**

`src/world/scene/ReadySignal.tsx`:

```tsx
import { useEffect } from "react";
import { useWorld } from "@/world/state/store";

export function ReadySignal() {
  useEffect(() => {
    let b = 0;
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => useWorld.getState().setReady(true));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);
  return null;
}
```

`src/world/ui/Loader.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useWorld } from "@/world/state/store";

// a tiny island silhouette: grass row on top, earth, then a tapering stone tip
const BLOCKS: Array<[number, number, string]> = [
  [0, 0, "#8ea769"], [1, 0, "#97ae73"], [2, 0, "#86a062"], [3, 0, "#8ea769"], [4, 0, "#7f995d"],
  [0, 1, "#94714f"], [1, 1, "#8a6849"], [2, 1, "#9d7a57"], [3, 1, "#94714f"], [4, 1, "#8a6849"],
  [1, 2, "#b5afa5"], [2, 2, "#a9a399"], [3, 2, "#bfb9af"],
  [2, 3, "#a9a399"],
];

export function Loader() {
  const ready = useWorld((s) => s.ready);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(id);
  }, [ready]);
  if (gone) return null;
  return (
    <div className={ready ? "loader loader--done" : "loader"} role="status" aria-live="polite">
      <div className="loader-island" aria-hidden="true">
        {BLOCKS.map(([x, y, c], i) => (
          <span
            key={i}
            className="loader-block"
            style={{ left: x * 18, top: y * 18, background: c, animationDelay: `${(3 - y) * 0.12 + x * 0.05}s` }}
          />
        ))}
      </div>
      <p className="loader-text">{ready ? "Ready" : "Building the islands…"}</p>
    </div>
  );
}
```

In `src/world/scene/World.tsx` add `import { ReadySignal } from "./ReadySignal";` and render `<ReadySignal />` as the last child. In `src/world/scene/WorldApp.tsx` add `import { Loader } from "@/world/ui/Loader";` and render `<Loader />` after `<MobileControls />`.

Append to `src/world/world.css`:

```css
.loader {
  position: fixed; inset: 0; z-index: 20; display: grid; place-content: center; justify-items: center; gap: 18px;
  background: #cbdce4; transition: opacity 0.6s ease;
}
.loader--done { opacity: 0; pointer-events: none; }
.loader-island { position: relative; width: 90px; height: 72px; }
.loader-block {
  position: absolute; width: 17px; height: 17px; border-radius: 3px;
  animation: loader-drop 0.9s cubic-bezier(0.3, 0.7, 0.25, 1.15) both infinite alternate;
}
@keyframes loader-drop {
  0% { transform: translateY(-60px); opacity: 0; }
  45%, 100% { transform: translateY(0); opacity: 1; }
}
.loader-text { margin: 0; font: 500 13px/1 ui-monospace, "SFMono-Regular", Menlo, monospace; color: rgba(19, 33, 43, 0.7); }
@media (prefers-reduced-motion: reduce) {
  .loader-block { animation: none; }
  .loader { transition: none; }
}
```

- [ ] **Step 2: Reduced-motion audit**

Confirm each item in code (no edits expected; fix any that fail):
- `TourCamera`: with `reducedMotion`, progress snaps to the nearest stop (camera cuts) and `tourBlend` is cleared immediately.
- `runtime.particles` is created with capacity 240 under reduced motion.
- `poseFor`: seated leg swing, head look-around and idle bob are off when `reduced`.
- `Bridge`: idle plank breathing is 0 when reduced.
- `Sky` cloud sea does not drift when reduced.
- `scrollToIsland`: uses `behavior: "auto"` when reduced.
- `Loader`: no animation (CSS media query).
- No camera shake exists anywhere.

Run: `npx vitest run src/world/scene/ezra/anim.test.ts`
Expected: PASS (the reduced-motion seated test covers `poseFor`).

- [ ] **Step 3: Verify**

Run: `npm run build && npm run shot -- "?stop=0" shots/t13.png 1280x720`
Expected: build succeeds; `t13.png` shows the world (the loader has faded out within the virtual time budget), not the loader.

- [ ] **Step 4: Commit**

```bash
git add src/world/ui/Loader.tsx src/world/scene/ReadySignal.tsx src/world/scene/World.tsx src/world/scene/WorldApp.tsx src/world/world.css
git commit -F - <<'EOF'
feat(world): block-assembly loader and reduced-motion audit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task 14: Performance pass and Part B verification

**Files:**
- Create: `src/world/scene/RenderStats.tsx`
- Modify: `src/world/scene/WorldApp.tsx` (adaptive DPR with `PerformanceMonitor`, mount `RenderStats`), `vite.config.ts` (chunking)

**Interfaces:**
- Consumes: drei `PerformanceMonitor`; `dprCap`; `useWorld` (`quality`, `setQuality`).
- Produces: adaptive pixel ratio; dev-only draw-call logging; vendor chunks for three and R3F.

- [ ] **Step 1: Implement**

`src/world/scene/RenderStats.tsx`:

```tsx
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Dev-only: logs draw calls every 120 frames and warns above the 200-call budget. */
export function RenderStats() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    if (!import.meta.env.DEV) return;
    frames.current += 1;
    if (frames.current % 120 !== 0) return;
    const { calls, triangles } = gl.info.render;
    if (calls > 200) console.warn(`[world] ${calls} draw calls (budget 200), ${triangles} triangles`);
    else console.info(`[world] ${calls} draw calls, ${triangles} triangles`);
  });
  return null;
}
```

Replace the whole of `src/world/scene/WorldApp.tsx` with its final Part B form:

```tsx
import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useWorld } from "@/world/state/store";
import { dprCap, hasWebGL } from "@/world/state/quality";
import { Hud } from "@/world/ui/Hud";
import { Loader } from "@/world/ui/Loader";
import { MobileControls } from "@/world/ui/MobileControls";
import { NoWebGL } from "@/world/ui/NoWebGL";
import { SeoMirror } from "@/world/ui/SeoMirror";
import { TourScrollTrack } from "@/world/ui/TourScrollTrack";
import { RenderStats } from "./RenderStats";
import { useModeTransitions } from "./useModeTransitions";
import { useTabCycling } from "./useTabCycling";
import { World } from "./World";

export default function WorldApp() {
  const webgl = useMemo(() => hasWebGL(), []);
  const quality = useWorld((s) => s.quality);
  const setQuality = useWorld((s) => s.setQuality);
  const [dpr, setDpr] = useState(() => dprCap(quality));
  const wrap = useRef<HTMLDivElement>(null);
  useModeTransitions();
  useTabCycling(wrap);
  if (!webgl) return <NoWebGL />;
  return (
    <>
      <div ref={wrap} className="world-canvas-wrap" tabIndex={0} aria-label="Ezra Brilliant's voxel world">
        <Canvas
          shadows={quality === "high" ? "soft" : false}
          dpr={dpr}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: 40, near: 0.1, far: 600, position: [-12, 14, 22] }}
          onCreated={({ gl, camera }) => {
            gl.toneMappingExposure = 1.05;
            camera.lookAt(0, 0, 0);
          }}
        >
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(dprCap(quality))}
            onFallback={() => {
              setDpr(1);
              setQuality("low");
            }}
          />
          <RenderStats />
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </Canvas>
      </div>
      <TourScrollTrack />
      <Hud />
      <MobileControls />
      <Loader />
      <SeoMirror />
    </>
  );
}
```

In `vite.config.ts` replace only the `manualChunks` object (keep everything else, including any `test` block Part A added) with:

```ts
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': ['three'],
          'vendor-r3f': ['@react-three/fiber', '@react-three/drei'],
        },
```

- [ ] **Step 2: Full verification**

Run:

```bash
npx vitest run
npm run build
for i in 0 1 2 3 4; do npm run shot -- "?stop=$i" shots/b-stop-$i.png 1280x720; npm run shot -- "?stop=$i" shots/b-stop-$i-phone.png 520x940; done
npm run shot -- "?stop=2&play" shots/b-play.png 1280x720
```

Expected:
- every test PASSES; build succeeds with no TypeScript errors;
- the build output lists `vendor-three` and `vendor-r3f` chunks; the sum of the gzip sizes of `index-*.js`, `vendor-react-*.js`, `vendor-three-*.js` and `vendor-r3f-*.js` is at most ~350 KB (if above, note the figure in the commit message; Part C's performance check revisits it);
- each desktop shot frames its placeholder island right of centre with a calm bottom-left; each phone shot keeps the island in frame (if an island is cut off at 520×940, make `defaultTourStop` push `distance` by `× 1.35` when `window.innerWidth / window.innerHeight < 1` and re-run);
- `b-play.png` shows Ezra on the Petak Umpet placeholder island with the HUD in Play state.
- `npm run dev`, open the page, scroll through and press Play: the console shows `[world] N draw calls` lines with N ≤ 200.

- [ ] **Step 3: Commit**

```bash
git add src/world/scene/RenderStats.tsx src/world/scene/WorldApp.tsx vite.config.ts
git commit -F - <<'EOF'
feat(world): adaptive DPR, draw-call stats and vendor chunks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

## Self-review (done while writing)

- **Spec coverage (Part B scope):** §6 tour (native scroll track, continuous damped progress, slow dwell via `TourStop.dwell`, path follows crossings with the cart rolling in sync) → Tasks 7, 11; Play entry (button / WASD / joystick, stand-up at hero, drop elsewhere), follow camera (drag orbit, wheel zoom, scroll lock, pull-in), exit to nearest tour point → Tasks 6, 8, 12; SEO mirror → Task 1. §7 model + procedural animation states, input table, movement via `stepCharacter`, step-up/coyote/buffer (engine), dust/landing puff, fall-off fade + respawn, crossings in Play (pads with locked arc that always lands and re-arm guard, minecart ride both directions with camera trailing, bridge sway) → Tasks 5, 6, 11. §8 descriptor registration, tour hover lift + outline + label, Play E bubble + HUD prompt, Tab/Enter, raycasts on hitboxes only, squash/sfx feedback, no shake → Tasks 9, 11. §9 single-draw-call particle renderer, reduced counts → Tasks 1, 10. §13 file layout → all tasks. §14 DPR caps, adaptive DPR, shadows high only, draw-call logging, bundle check → Tasks 1, 3, 14. §15 reduced motion, keyboard, no-WebGL fallback → Tasks 1, 9, 13.
- **Placeholder scan:** no deferred-work markers; placeholder islands are real code replaced by Part C.
- **Type consistency:** every Part A symbol is used with the master signature; Part B contract exports match the master (`useWorld`, `runtime`, `StarIslandModule`, `STAR_ISLANDS`, `WorldText`, `Interactable`); additions are listed at the top.
