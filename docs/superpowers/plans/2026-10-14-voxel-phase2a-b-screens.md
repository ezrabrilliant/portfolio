# Voxel World — Phase 2A Part B: Live Screens and Closeup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared `LiveScreen` that renders any `ScreenApp` on a canvas texture (redraw policy, idle demo with a 7 s pause after input, hit regions), a closeup camera layer that glides square-on to a screen and routes clicks into it, and the three program screens (POS Monosuko, Bee Furniture CRM, PeduliPasal chat) as unit-tested models with canvas draws, all in English.

**Architecture:** Each program is a framework-free model (`<app>.ts`: state + pure actions, time and randomness injected) plus a canvas draw (`<app>Draw.ts`) that returns hit regions; `index.ts` packs them into a `ScreenApp`. `LiveScreen` owns the canvas, keeps the app state in a memoised object mutated by frame callbacks (React never re-renders for it), registers a `CloseupTarget` in `runtime.closeups` and an `Interactable` whose activation opens the closeup. The closeup is a camera layer (`CloseupCamera`) that runs after `TourCamera` and `PlayCamera` and blends the pose they set toward `closeupPose(...)` with an eased weight; `CloseupController` routes pointer, keys, scroll and joystick while a closeup is open. `openCloseup` / `closeCloseup` live in a plain module (`closeupState.ts`) so the page shell (HUD, mode keys) can use them without pulling three.js into its chunk.

**Tech Stack:** React 19, @react-three/fiber 9, three 0.186, zustand 5, Vitest 5 (node environment), TypeScript 5.8 strict with `verbatimModuleSyntax` and `erasableSyntaxOnly`. No new dependencies. Python 3 + Pillow 12 (already installed) for the two image assets.

**Master plan:** `docs/superpowers/plans/2026-10-14-voxel-phase2a.md` (shared contracts, Global Constraints, task index). **Spec:** `docs/superpowers/specs/2026-10-14-voxel-phase2a-world-content-design.md` §5 (live screens), §6 (closeup), §11 (performance), §12 (testing).
**Visual and behavioural reference:** the approved sketch's source in the session scratchpad, `C:/Users/ezrak/AppData/Local/Temp/claude/C--Users-ezrak-OneDrive-Documents-Code-react-portfolio/40f42792-f7b0-418d-a6b1-49fd16ae2d8f/scratchpad/mini/` — `part-mono.js` (MONO / monoLive), `part-bee.js` (BEE / beeLive), `part-peduli.js` (PD / pdLive), `index.html` (makeScreen, stopPose / FOV_T). The code below is that sketch ported to typed modules: drawing coordinates are the sketch's, strings are the English ones from spec §5.2–5.4, rupiah goes through `formatRupiah`, the PeduliPasal conversations are spec §5.4's two (not the sketch's), and the sketch's draw-time state changes (the chat moved its pending answer inside `draw`) are now time-derived so `draw` stays pure.

**Depends on:** Part A complete (A4 renamed `STAR_ISLANDS` → `ISLANDS` in `World.tsx` and `TourCamera.tsx`). Part B never imports an island component; Part C places the `LiveScreen`s on the islands. Within Part B: B2 needs B1; B3 needs B2; B4, B5 and B6 need only B1 (they may run in parallel with B2/B3 if file ownership is respected).

**Pre-checked:** every new file and Old → New snippet in this plan was applied by script to a scratch copy of `voxel-world` at `bcd1ffb` (before Part A; the World.tsx anchors avoid the lines Part A renames). On that copy `tsc -p tsconfig.app.json`, `eslint src/world`, the new and edited Vitest files (counts as stated in each task) and `vite build` all passed, and `isCanvasTexture` appeared only in `vendor-three-*.js`. If an Old snippet no longer matches when you execute, Part A changed that line: re-read the file and apply the same change.

## Global Constraints

The master plan's Global Constraints apply to every task (branch `voxel-world`, explicit `git add` paths only, never stage the `gsap-splittext-…` deletions, commit trailer lines, `@/` alias, `import type`, English copy, `formatRupiah` for every price, performance budget, reduced motion, no `setState` in `useFrame`). Part-B specifics:

- **Model purity.** `src/world/scene/screens/<app>/<app>.ts` and `strings.ts` import no `react`, `three`, DOM or canvas API. Time comes in as `t` (R3F clock seconds) and `now: Date`; randomness comes from a seed kept in the state (`stepRandom`, B1). The same state and inputs always give the same result.
- **Draws are pure.** `draw(ctx, s, t)` paints the whole screen from `s` and `t`, never changes `s`, and returns its hit regions bottom-to-top (`hitAt` picks the last match).
- **Shell imports.** `Hud.tsx`, `MobileControls.tsx`, `useModeTransitions.ts` and `useTabCycling.ts` are in the page-shell chunk (WorldApp loads `WorldCanvas` lazily, see `vite.config.ts` manualChunks). They import closeup functions from `@/world/scene/closeupState` (no three.js), never from `CloseupController.tsx`.
- **Lint.** `react-refresh/only-export-components` is configured as `"error"` (`reactRefresh.configs.vite`): a `.tsx` file may export only components. The two master-contract functions that must be importable from `.tsx` paths (`markScreensDirty` from `LiveScreen.tsx`, `openCloseup` / `closeCloseup` from `CloseupController.tsx`) are re-exports with a one-line `// eslint-disable-next-line react-refresh/only-export-components`.
- **Frame callbacks.** Reuse objects (no `new THREE.Vector3()` or object literals per frame on hot paths). The only store setter called from a frame callback is the event-like, change-guarded `setCloseup` (through `closeCloseup` when an exit condition fires once).
- **Tests run in node** (`vite.config.ts` `test.environment: "node"`): no DOM, no canvas, no `Image`. Draw tests use `fakeCtx()` and `vi.stubGlobal("Image", FakeImage)` (B4 adds `src/world/scene/screens/testing/fakeCtx.ts`).
- **Shell paths:** Git Bash on Windows; Node and Python get `C:/Users/...` paths, never `/c/...`. Write only inside the repo or the session scratchpad.
- Commit command used in every task (replace the message line):

```bash
git commit -F - <<'EOF'
feat(world): <message>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

## Contract additions

Everything in the master's "Part B exports" is created with the exact names and signatures given there. Part B adds the following on top; Part C may use them.

```ts
// src/world/scene/screens/types.ts — optional method on the master's ScreenApp<S> (backward compatible)
interface ScreenApp<S> {
  // …master fields…
  /** Keyboard while this screen is in closeup (e.g. arrows / Enter on a map board); null = not handled. Esc never arrives. */
  key?(s: S, code: string, t: number): S | null;
}
// Convention for ScreenApp.init(now): `now` is the wall-clock time at clock t = 0. LiveScreen calls
// app.init(new Date(Date.now() - clock.elapsedTime * 1000)), so new Date(now.getTime() + t * 1000) is the wall time at t.

// src/world/state/runtime.ts — optional field on the master's CloseupTarget
interface CloseupTarget {
  // …master fields…
  /** Keyboard while in closeup: true when the screen used the key (CloseupController then stops it reaching anything else). */
  key?: (code: string) => boolean;
}

// src/world/scene/screens/LiveScreen.tsx — optional prop on the master's LiveScreenProps<S>
radius?: number;   // Interactable reach in Play (blocks from Ezra's chest to the face centre), default 3.5

// src/world/engine/camera/closeup.ts — beyond closeupPose / CLOSEUP_FILL
export const CLOSEUP_GLIDE = 0.8;                                    // seconds of the glide in (and out)
export const CLOSEUP_HUD_PX = 96;                                    // CSS px the HUD covers at the top of the canvas
export const CLOSEUP_NEAR_MARGIN = 0.25;                             // near plane stops this far in front of the face
export interface CloseupView { inset?: number; pan?: number }        // free top share of the frame; sideways pan
export function closeupPans(size: { w: number; h: number }, aspect: number): boolean;  // landscape target, portrait view
export function closeupDistance(size: { w: number; h: number }, aspect: number, fovDeg: number, inset?: number): number;
export function closeupPanLimit(size: { w: number; h: number }, aspect: number, fovDeg: number, inset?: number): number;
export function clampPan(pan: number, limit: number): number;
export function closeupNear(base: number, faceDistance: number, weight: number): number;
export function stepCloseupBlend(k: number, active: boolean, dt: number, reduced: boolean): number;  // 0..1 clock
export function closeupWeight(k: number): number;                    // smootherstep of the clock
// closeupPose takes an optional 6th argument `out?: { camera: Vec3; target: Vec3 }` that it fills and returns, and an
// optional 7th `view?: CloseupView`: fitted and centred below the top `inset`, slid by `pan` (clamped).

// src/world/scene/closeupState.ts — plain module (no three.js); the implementations behind the contract
export const CLOSEUP_SCROLL_EXIT = 24;                               // px of page scroll that end a Tour closeup
export function openCloseup(id: string): void;                       // re-exported by CloseupController.tsx
export function closeCloseup(): void;                                // re-exported by CloseupController.tsx
export function scrolledAway(scrollY: number): boolean;
export const closeupPan: { offset: number; limit: number; perPx: number };   // the open closeup's sideways pan

// src/world/scene/screens/dirty.ts
export function markScreensDirty(): void;                            // re-exported by LiveScreen.tsx
export function screensVersion(): number;

// src/world/scene/screens/random.ts
export function stepRandom(seed: number): { value: number; seed: number };   // one mulberry32 draw, seed kept as a number

// src/world/scene/screens/policy.ts
export const DEMO_PAUSE = 7;        // s
export const MIN_FRAME = 1 / 15;    // s
export interface DemoGate { reduced: boolean; t: number; pausedUntil: number; inCloseup: boolean; activeIsland: string; island: string }
export function demoMayRun(g: DemoGate): boolean;
export function redrawDue(t: number, lastDraw: number, dirty: boolean, busy: boolean): boolean;

// src/world/scene/screens/testing/fakeCtx.ts (test helper, used by draw tests)
export function fakeCtx(): CanvasRenderingContext2D;
export class FakeImage { onload; onerror; src; decoding }

// src/world/scene/screens/pos/pos.ts
export interface MenuItem { price: number; stock: number | null; min: number }
export const MENU: readonly MenuItem[];           // 6 items, seed prices and portion stock
export const TABLE_COUNT = 9;
export const OCCUPIED: readonly number[];         // [2, 7]
export const PAY_SECONDS = 1.6;
export const AUTO_ADD_GAP = 1.3; export const AUTO_PAY_GAP = 2.4; export const AUTO_PAY_AT = 4;
export const POS_LOGICAL: { readonly w: 640; readonly h: 400 };
export interface PosLine { item: number; qty: number }
export interface PosPayment { total: number; table: number; until: number }
export interface PosState { stock: readonly (number | null)[]; lines: readonly PosLine[]; table: number; payment: PosPayment | null; next: number; seed: number }
export type StockBadge = { tone: "ok" | "low" | "out"; text: string } | null;
export function initPos(now: Date): PosState;
export function qtyOf(s: PosState, item: number): number;
export function portionsLeft(s: PosState, item: number): number;   // Infinity for non-portion items
export function stockBadge(s: PosState, item: number): StockBadge;
export function addItem(s: PosState, item: number): PosState;
export function selectTable(s: PosState, n: number): PosState;
export function orderCount(s: PosState): number;
export function subtotal(s: PosState): number;
export function payOrder(s: PosState, t: number): PosState;
export function paying(s: PosState, t: number): boolean;
export function actPos(s: PosState, action: string, arg: number | undefined, t: number): PosState;  // "add" | "table" | "pay"
export function autoPos(s: PosState, t: number): PosState | null;
export function busyPos(s: PosState, t: number): boolean;
// pos/strings.ts: export const POS_STRINGS   ·   pos/posDraw.ts: export const POS_IMAGES; export function drawPos(...)

// src/world/scene/screens/crm/crm.ts
export const SEED_KPIS: { revenue: 4781000; customers: 3; transactions: 6; promos: 2 };
export const PRODUCT_PRICES: readonly number[];   // [1250000, 950000, 175000]
export const SEED_DAYS: readonly number[];        // example 7-day series, oldest first
export const DAY_CAP = 3600000; export const SALE_GAP = 3.2; export const PULSE_SECONDS = 1.2;
export const CRM_LOGICAL: { readonly w: 640; readonly h: 400 };
export interface CrmTask { due: number; done: boolean }   // due = days from today; text = CRM_STRINGS.tasks[i]
export const SEED_TASKS: readonly CrmTask[];
export interface CrmState {
  today: { y: number; m: number; d: number };     // local date of `now` (m 0-based)
  revenue: number; customers: number; transactions: number; promos: number;
  days: readonly number[];                        // 7 daily totals, oldest first; index 6 = today
  tasks: readonly CrmTask[];
  pulse: number;                                  // clock time of the latest sale (-Infinity before the first)
  next: number; seed: number;
}
export function initCrm(now: Date): CrmState;
export function recordSale(s: CrmState, t: number): CrmState;
export function toggleTask(s: CrmState, i: number): CrmState;
export function actCrm(s: CrmState, action: string, arg: number | undefined, t: number): CrmState;  // "sale" | "task"
export function autoCrm(s: CrmState, t: number): CrmState | null;
export function busyCrm(s: CrmState, t: number): boolean;
export function dayLabel(s: CrmState, index: number): string;   // "YYYY-MM-DD"
export function dueLabel(s: CrmState, task: CrmTask): string;   // "Oct 14, 2026"
export function chartMax(days: readonly number[]): number;
// crm/strings.ts: export const CRM_STRINGS   ·   crm/crmDraw.ts: export function drawCrm(...)

// src/world/scene/screens/chat/chat.ts
export const LOADING_SECONDS = 1.1; export const TYPE_RATE = 110; export const READ_PAUSE = 3;
export const CHAT_LOGICAL: { readonly w: 240; readonly h: 520 };
export interface ChatLine { who: "user" | "bot"; text: string; stamp: string; at: number }  // at = clock time it appears
export interface ChatState { originMs: number; convo: number; step: number; lines: readonly ChatLine[]; next: number }
export interface VisibleLine { line: ChatLine; text: string }
export function initChat(now: Date): ChatState;
export function clockStamp(originMs: number, t: number): string;   // "HH.mm"
export function advanceChat(s: ChatState, t: number): ChatState;
export function answering(s: ChatState, t: number): boolean;
export function loading(s: ChatState, t: number): boolean;
export function visibleLines(s: ChatState, t: number): VisibleLine[];
export function topicTitle(s: ChatState): string;
export function actChat(s: ChatState, action: string, arg: number | undefined, t: number): ChatState;  // "advance"
export function autoChat(s: ChatState, t: number): ChatState | null;
export function busyChat(s: ChatState, t: number): boolean;
// chat/strings.ts: export interface ChatScriptLine, Conversation; export const CHAT_STRINGS   ·   chat/chatDraw.ts: export function drawChat(...)

// index.ts of each app also re-exports its state type: export type { PosState } / { CrmState } / { ChatState }.
```

Files touched beyond the master's file list (integration the spec requires): `src/world/ui/MobileControls.tsx` (touch controls step aside during a closeup so taps reach the screen), `src/world/scene/World.tsx` (mounts `CloseupController` and `CloseupCamera`), `src/world/state/store.test.ts`, `src/world/state/runtime.test.ts`.

## Contract deviations

None of the master's names, signatures or file paths change. Deviations in placement and task boundaries:

1. **Closeup state moves from B3 to B2.** `LiveScreen` (B2) registers a `CloseupTarget` and calls `openCloseup`, so `runtime.closeups` / `runtime.closeup`, the store's `closeupId` / `setCloseup` and `closeupState.ts` land in B2. B3 keeps `closeupPose`, `CloseupCamera`, `CloseupController` and the input integration.
2. **Implementations in plain modules, master paths as re-exports.** `openCloseup` / `closeCloseup` are implemented in `src/world/scene/closeupState.ts` and re-exported from `CloseupController.tsx`; `markScreensDirty` is implemented in `src/world/scene/screens/dirty.ts` and re-exported from `LiveScreen.tsx`. Reasons: the react-refresh rule is an error for non-component exports in `.tsx`, and the page shell must not import a module that imports three.js. Importing from either path works.
3. **Spec §5.1 paths vs master paths.** The spec says `scene/islands/shared/LiveScreen.tsx` and `scene/islands/<app>/`; this plan follows the master (`scene/screens/LiveScreen.tsx`, `scene/screens/<app>/`).
4. **Combo A photo crop.** The repo's `paket-a.webp` is a promo graphic with Indonesian text ("PAKET A HARGA 50.000", "Paket Sudah Termasuk"). B4's sprite crops it to the plate (box 100,160–340,400) so the screen stays English and never shows "50.000" next to "Rp 50,000". The other five photos are centre-cropped as asked.
5. **No empty chat.** The chat opens with the first conversation's exchange already on screen (seeded a minute before load, fully typed), so it never shows an empty state and needs no invented hint line. The first idle-demo step waits `INITIAL_READ` seconds so that exchange can be read.

---

### Task B1: Screen types, formatting, images, seeded randomness

**Files:**
- Create: `src/world/scene/screens/types.ts`, `src/world/scene/screens/types.test.ts`
- Create: `src/world/scene/screens/format.ts`, `src/world/scene/screens/format.test.ts`
- Create: `src/world/scene/screens/dirty.ts`
- Create: `src/world/scene/screens/images.ts`, `src/world/scene/screens/images.test.ts`
- Create: `src/world/scene/screens/random.ts`, `src/world/scene/screens/random.test.ts`

**Interfaces:**
- Consumes: `mulberry32` (`@/world/engine/gen/rng`).
- Produces: `HitRegion`, `ScreenApp` (with optional `key`), `SCREEN_SCALE`, `hitAt`, `uvToLogical`; `formatRupiah`, `roundRect`, `wrapText`; `markScreensDirty`, `screensVersion`; `ScreenImage`, `loadScreenImage`; `stepRandom`.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/screens/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hitAt, uvToLogical, type HitRegion } from "./types";

const regions: HitRegion[] = [
  { x: 0, y: 0, w: 100, h: 100, action: "card", arg: 1 },
  { x: 40, y: 40, w: 20, h: 20, action: "badge" },
  { x: 200, y: 0, w: 50, h: 30, action: "pay" },
];

describe("hitAt", () => {
  it("returns the region under the point", () => {
    expect(hitAt(regions, 10, 10)).toEqual(regions[0]);
    expect(hitAt(regions, 220, 15)?.action).toBe("pay");
  });

  it("prefers the last (topmost) region where regions overlap", () => {
    expect(hitAt(regions, 50, 50)?.action).toBe("badge");
  });

  it("counts the edges as inside", () => {
    expect(hitAt(regions, 100, 100)?.action).toBe("card");
    expect(hitAt(regions, 250, 30)?.action).toBe("pay");
  });

  it("returns null on a miss or without regions", () => {
    expect(hitAt(regions, 150, 50)).toBeNull();
    expect(hitAt(regions, -1, 10)).toBeNull();
    expect(hitAt([], 10, 10)).toBeNull();
  });
});

describe("uvToLogical", () => {
  const logical = { w: 640, h: 400 };

  it("maps uv (origin bottom-left, y up) to logical units (origin top-left, y down)", () => {
    expect(uvToLogical({ x: 0, y: 1 }, logical)).toEqual({ x: 0, y: 0 });
    expect(uvToLogical({ x: 1, y: 0 }, logical)).toEqual({ x: 640, y: 400 });
    expect(uvToLogical({ x: 0.5, y: 0.25 }, logical)).toEqual({ x: 320, y: 300 });
  });
});
```

`src/world/scene/screens/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatRupiah, roundRect, wrapText } from "./format";

describe("formatRupiah", () => {
  it("groups thousands with commas after 'Rp '", () => {
    expect(formatRupiah(30000)).toBe("Rp 30,000");
    expect(formatRupiah(4781000)).toBe("Rp 4,781,000");
    expect(formatRupiah(8000)).toBe("Rp 8,000");
    expect(formatRupiah(900)).toBe("Rp 900");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("rounds to whole rupiah and keeps the sign", () => {
    expect(formatRupiah(1249999.6)).toBe("Rp 1,250,000");
    expect(formatRupiah(-5000)).toBe("-Rp 5,000");
  });
});

describe("wrapText", () => {
  // 5 units per character, like the draw tests' fake context
  const ctx = { measureText: (s: string) => ({ width: s.length * 5 }) } as unknown as CanvasRenderingContext2D;

  it("breaks between words so no line is wider than maxW", () => {
    expect(wrapText(ctx, "Grilled Chicken Piece", 80)).toEqual(["Grilled Chicken", "Piece"]);
  });

  it("keeps an over-long word on its own line", () => {
    expect(wrapText(ctx, "a extraordinarily b", 40)).toEqual(["a", "extraordinarily", "b"]);
  });

  it("returns no lines for blank text", () => {
    expect(wrapText(ctx, "   ", 40)).toEqual([]);
  });
});

describe("roundRect", () => {
  it("draws one closed path with the radius clamped to half the shorter side", () => {
    const calls: unknown[][] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_target, key) => (...args: unknown[]) => {
          calls.push([key, ...args]);
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    roundRect(ctx, 0, 0, 10, 4, 6);
    expect(calls[0]).toEqual(["beginPath"]);
    expect(calls[1]).toEqual(["moveTo", 2, 0]);
    expect(calls.at(-1)).toEqual(["closePath"]);
  });
});
```

`src/world/scene/screens/images.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { screensVersion } from "./dirty";
import { loadScreenImage } from "./images";

/** node has no Image: a stand-in that records what loadScreenImage sets. */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  decoding = "";
}
vi.stubGlobal("Image", FakeImage);

describe("loadScreenImage", () => {
  it("starts loading the url once and returns the same entry for every caller", () => {
    const a = loadScreenImage("/world/test/a.webp");
    expect(loadScreenImage("/world/test/a.webp")).toBe(a);
    expect(a.img.src).toBe("/world/test/a.webp");
    expect(a.ready).toBe(false);
  });

  it("becomes ready on load and marks every live screen dirty", () => {
    const b = loadScreenImage("/world/test/b.webp");
    const before = screensVersion();
    (b.img as unknown as FakeImage).onload?.();
    expect(b.ready).toBe(true);
    expect(screensVersion()).toBe(before + 1);
  });
});
```

`src/world/scene/screens/random.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/world/engine/gen/rng";
import { stepRandom } from "./random";

describe("stepRandom", () => {
  it("continues the mulberry32 sequence one draw at a time", () => {
    const r = mulberry32(42);
    const expected = [r(), r(), r()];
    let seed = 42;
    const got: number[] = [];
    for (let i = 0; i < 3; i++) {
      const step = stepRandom(seed);
      got.push(step.value);
      seed = step.seed;
    }
    expect(got).toEqual(expected);
  });

  it("is deterministic and stays in [0, 1)", () => {
    expect(stepRandom(7)).toEqual(stepRandom(7));
    let seed = 1;
    for (let i = 0; i < 200; i++) {
      const step = stepRandom(seed);
      expect(step.value).toBeGreaterThanOrEqual(0);
      expect(step.value).toBeLessThan(1);
      seed = step.seed;
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/screens`
Expected: FAIL — `Error: Failed to resolve import "./types" from "src/world/scene/screens/types.test.ts". Does the file exist?` (and the same for `./format`, `./dirty`, `./images`, `./random`).

- [ ] **Step 3: Implement the modules**

`src/world/scene/screens/types.ts`:

```ts
/** A rectangle of a screen, in logical units, that does `action` (with `arg`) when the visitor taps it. */
export interface HitRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  action: string;
  arg?: number;
}

/**
 * A program drawn on a live screen (spec §5.1): framework-free state, pure actions and a canvas draw.
 * `t` is the R3F clock in seconds. `init(now)`: `now` is the wall-clock time at clock t = 0 (LiveScreen passes
 * `Date.now() − elapsed`), so `new Date(now.getTime() + t * 1000)` is the wall time at clock time t.
 */
export interface ScreenApp<S> {
  /** Drawing units; the canvas is logical × SCREEN_SCALE. */
  logical: { w: number; h: number };
  init(now: Date): S;
  /** Visitor input on a hit region. */
  act(s: S, action: string, arg: number | undefined, t: number): S;
  /** Idle demo step; null = nothing happened. */
  auto(s: S, t: number): S | null;
  /** Animating (typing, confirmation, pulse): keep redrawing, at most 15 fps. */
  busy(s: S, t: number): boolean;
  /** Paints the whole screen (ctx is already scaled to logical units); returns the hit regions, bottom to top. */
  draw(ctx: CanvasRenderingContext2D, s: S, t: number): HitRegion[];
  /** Keyboard while this screen is in closeup (e.g. arrows on a map board); null = not handled. Esc never arrives. */
  key?(s: S, code: string, t: number): S | null;
}

/** Canvas pixels per logical unit: a 640 × 400 screen draws on a 1280 × 800 canvas. */
export const SCREEN_SCALE = 2;

/** The region under (x, y), edges inclusive; where regions overlap the last one (drawn on top) wins. */
export function hitAt(regions: readonly HitRegion[], x: number, y: number): HitRegion | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

/** Face uv (origin bottom-left, y up, as three.js reports it) → logical units (origin top-left, y down). */
export function uvToLogical(uv: { x: number; y: number }, logical: { w: number; h: number }): { x: number; y: number } {
  return { x: uv.x * logical.w, y: (1 - uv.y) * logical.h };
}
```

`src/world/scene/screens/format.ts`:

```ts
/** Rupiah with English digit grouping, whole rupiah: 30000 → "Rp 30,000" (never the Indonesian locale's "30.000"). */
export function formatRupiah(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}Rp ${digits}`;
}

/** Adds a rounded-rectangle path (fill or stroke it afterwards); the radius is clamped to half the shorter side. */
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Greedy word wrap with the context's current font; a word wider than maxW keeps a line of its own. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
```

`src/world/scene/screens/dirty.ts`:

```ts
/** Bumped whenever every live screen must redraw (an image finished loading); each LiveScreen compares it per frame. */
let version = 0;

export function markScreensDirty(): void {
  version += 1;
}

export function screensVersion(): number {
  return version;
}
```

`src/world/scene/screens/images.ts`:

```ts
import { markScreensDirty } from "./dirty";

export interface ScreenImage {
  img: HTMLImageElement;
  ready: boolean;
}

const cache = new Map<string, ScreenImage>();

/**
 * An image for canvas screens, loaded once per url. Draws check `ready` and paint a placeholder until then; the load
 * marks every LiveScreen dirty so they redraw with the picture.
 */
export function loadScreenImage(url: string): ScreenImage {
  const hit = cache.get(url);
  if (hit) return hit;
  const img = new Image();
  const entry: ScreenImage = { img, ready: false };
  img.decoding = "async";
  img.onload = () => {
    entry.ready = true;
    markScreensDirty();
  };
  img.onerror = () => {
    console.warn(`[screens] could not load ${url}; the screen keeps its placeholder`);
  };
  img.src = url;
  cache.set(url, entry);
  return entry;
}
```

`src/world/scene/screens/random.ts`:

```ts
import { mulberry32 } from "@/world/engine/gen/rng";

/** mulberry32's per-draw increment: mulberry32(seed + STEP) continues mulberry32(seed) after one draw. */
const STEP = 0x6d2b79f5;

/**
 * One draw from a seeded stream whose whole state is a number (so screen states stay plain, immutable data):
 * the value in [0, 1) and the seed for the next draw.
 */
export function stepRandom(seed: number): { value: number; seed: number } {
  return { value: mulberry32(seed)(), seed: (seed + STEP) >>> 0 };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/screens`
Expected: PASS — `Test Files  4 passed (4)`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc -b && npx eslint src/world/scene/screens`
Expected: no output from either command (exit code 0).

- [ ] **Step 6: Commit**

```bash
git add src/world/scene/screens/types.ts src/world/scene/screens/types.test.ts src/world/scene/screens/format.ts src/world/scene/screens/format.test.ts src/world/scene/screens/dirty.ts src/world/scene/screens/images.ts src/world/scene/screens/images.test.ts src/world/scene/screens/random.ts src/world/scene/screens/random.test.ts
git commit -F - <<'EOF'
feat(world): screen app contract, rupiah formatting, screen images and seeded randomness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task B2: Closeup state and the LiveScreen component

**Files:**
- Modify: `src/world/state/runtime.ts`, `src/world/state/runtime.test.ts`
- Modify: `src/world/state/store.ts`, `src/world/state/store.test.ts`
- Create: `src/world/scene/closeupState.ts`, `src/world/scene/closeupState.test.ts`
- Create: `src/world/scene/screens/policy.ts`, `src/world/scene/screens/policy.test.ts`
- Create: `src/world/scene/screens/LiveScreen.tsx`

**Interfaces:**
- Consumes: B1 (`ScreenApp`, `HitRegion`, `SCREEN_SCALE`, `hitAt`, `uvToLogical`, `screensVersion`, `markScreensDirty`); `Interactable` (`@/world/scene/Interactable`); `loadCanvasFonts` (`@/world/scene/islands/shared/canvasFonts`); `islandFrame`, `worldTuple` (`@/world/scene/islands/shared/local`); `playSfx`; `runtime`, `useWorld`.
- Produces: `CloseupTarget`, `runtime.closeups`, `runtime.closeup`; store `closeupId` / `setCloseup`; `openCloseup`, `closeCloseup`, `scrolledAway`, `CLOSEUP_SCROLL_EXIT`, `closeupPan`; `DEMO_PAUSE`, `MIN_FRAME`, `DemoGate`, `demoMayRun`, `redrawDue`; `LiveScreen`, `LiveScreenProps`, `markScreensDirty` (re-export).

**Notes for the implementer:**
- `app` must be a stable object (a module constant such as `posApp`, or memoised with `useMemo` for Part C's `mapApp(...)`): LiveScreen keys its state on the `app` identity, so a new object every render would restart the program.
- The face is a `planeGeometry` whose front is +z of the screen group; `getWorldDirection` on it is the closeup normal. The bezel sits behind it (front at local z = 0, face at z = 0.002).
- Canvas fonts: `canvasFonts.ts` self-hosts only `"World Canvas UI"` (Schibsted Grotesk 500/700) and `"World Canvas Mono"`. The apps' stacks (B4–B6) name Inter / Roboto first and fall back to `CANVAS_FONTS.ui`; LiveScreen draws only after `loadCanvasFonts()` resolves.

- [ ] **Step 1: Write the failing tests**

`src/world/scene/closeupState.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/world/engine/audio/sfx", () => ({
  setMuted: vi.fn(),
  playSfx: vi.fn(),
  isMuted: vi.fn(() => true),
}));

import { runtime } from "@/world/state/runtime";
import type { CloseupTarget } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { CLOSEUP_SCROLL_EXIT, closeCloseup, closeupPan, openCloseup, scrolledAway } from "./closeupState";

const target = (id: string): CloseupTarget => ({
  id,
  island: "pos-monosuko",
  center: () => ({ x: 0, y: 0, z: 0 }),
  normal: () => ({ x: 0, y: 0, z: 1 }),
  size: { w: 3.4, h: 2.125 },
  input: () => undefined,
  hit: () => null,
});

describe("closeupState", () => {
  beforeEach(() => {
    runtime.closeups.clear();
    runtime.closeup = null;
    runtime.hoverId = null;
    useWorld.setState({ closeupId: null, hoveredId: null });
    runtime.closeups.set("pos-screen", target("pos-screen"));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("openCloseup writes the runtime and the store together and drops the hover", () => {
    runtime.hoverId = "pos-screen";
    useWorld.setState({ hoveredId: "pos-screen" });
    openCloseup("pos-screen");
    expect(runtime.closeup).toEqual({ id: "pos-screen" });
    expect(useWorld.getState().closeupId).toBe("pos-screen");
    expect(runtime.hoverId).toBeNull();
    expect(useWorld.getState().hoveredId).toBeNull();
  });

  it("opens every closeup centred (no pan left over from the last one)", () => {
    closeupPan.offset = 0.7;
    openCloseup("pos-screen");
    expect(closeupPan.offset).toBe(0);
  });

  it("ignores ids without a registered target", () => {
    openCloseup("nope");
    expect(runtime.closeup).toBeNull();
    expect(useWorld.getState().closeupId).toBeNull();
  });

  it("closeCloseup clears both and is a no-op when nothing is open", () => {
    openCloseup("pos-screen");
    closeCloseup();
    expect(runtime.closeup).toBeNull();
    expect(useWorld.getState().closeupId).toBeNull();
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    closeCloseup();
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("Tour exit: scrolledAway once the page moved more than CLOSEUP_SCROLL_EXIT px since opening", () => {
    vi.stubGlobal("window", { scrollY: 500 });
    openCloseup("pos-screen");
    expect(scrolledAway(500 + CLOSEUP_SCROLL_EXIT)).toBe(false);
    expect(scrolledAway(500 + CLOSEUP_SCROLL_EXIT + 1)).toBe(true);
    expect(scrolledAway(500 - CLOSEUP_SCROLL_EXIT - 1)).toBe(true);
    closeCloseup();
    expect(scrolledAway(10_000)).toBe(false);
  });
});
```

`src/world/scene/screens/policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEMO_PAUSE, MIN_FRAME, demoMayRun, redrawDue, type DemoGate } from "./policy";

const gate: DemoGate = {
  reduced: false,
  t: 20,
  pausedUntil: 0,
  inCloseup: false,
  activeIsland: "pos-monosuko",
  island: "pos-monosuko",
};

describe("demoMayRun", () => {
  it("plays while the screen's island is the one in view", () => {
    expect(demoMayRun(gate)).toBe(true);
  });

  it("stops on other islands unless the screen is in closeup", () => {
    expect(demoMayRun({ ...gate, activeIsland: "gtid" })).toBe(false);
    expect(demoMayRun({ ...gate, activeIsland: "gtid", inCloseup: true })).toBe(true);
  });

  it("pauses for DEMO_PAUSE seconds after a tap", () => {
    const tap = 20;
    expect(demoMayRun({ ...gate, t: tap + DEMO_PAUSE - 0.1, pausedUntil: tap + DEMO_PAUSE })).toBe(false);
    expect(demoMayRun({ ...gate, t: tap + DEMO_PAUSE, pausedUntil: tap + DEMO_PAUSE })).toBe(true);
  });

  it("never plays under reduced motion", () => {
    expect(demoMayRun({ ...gate, reduced: true })).toBe(false);
    expect(demoMayRun({ ...gate, reduced: true, inCloseup: true })).toBe(false);
  });
});

describe("redrawDue", () => {
  it("redraws a changed screen once MIN_FRAME has passed", () => {
    expect(redrawDue(1, 1 - MIN_FRAME, true, false)).toBe(true);
    expect(redrawDue(1, 1 - MIN_FRAME / 2, true, false)).toBe(false);
  });

  it("keeps an animating screen at 15 fps or less", () => {
    let draws = 0;
    let last = -Infinity;
    for (let f = 0; f <= 60; f++) {
      const t = f / 60; // one second of 60 fps frames
      if (redrawDue(t, last, false, true)) {
        draws++;
        last = t;
      }
    }
    expect(draws).toBeLessThanOrEqual(16);
    expect(draws).toBeGreaterThanOrEqual(14);
  });

  it("does nothing when nothing changed and nothing animates", () => {
    expect(redrawDue(10, 0, false, false)).toBe(false);
  });
});
```

Add to `src/world/state/store.test.ts` — the reset in `beforeEach` gains `closeupId: null`:

Old:
```ts
    useWorld.setState({ mode: "tour", activeIsland: "hero", muted: true, hoveredId: null, prompt: null, ready: false });
```
New:
```ts
    useWorld.setState({ mode: "tour", activeIsland: "hero", muted: true, hoveredId: null, prompt: null, ready: false, closeupId: null });
```

and a new test after the last one (`"setPrompt updates when only the label changes on the same id"`). Old:
```ts
    expect(useWorld.getState().prompt).toEqual({ id: "gtid-board", label: "Show price chart" });
    unsub();
  });
});
```
New:
```ts
    expect(useWorld.getState().prompt).toEqual({ id: "gtid-board", label: "Show price chart" });
    unsub();
  });

  it("setCloseup is change-guarded", () => {
    const listener = vi.fn();
    const unsub = useWorld.subscribe(listener);
    useWorld.getState().setCloseup(null);
    expect(listener).not.toHaveBeenCalled();
    useWorld.getState().setCloseup("pos-screen");
    useWorld.getState().setCloseup("pos-screen");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useWorld.getState().closeupId).toBe("pos-screen");
    unsub();
  });
});
```

Add to `src/world/state/runtime.test.ts` after the last test. Old:
```ts
  it("starts with Ezra seated, no ride, no world built yet", () => {
    expect(runtime.seated).toBe(true);
    expect(runtime.ride).toBeNull();
    expect(runtime.built).toBeNull();
  });
});
```
New:
```ts
  it("starts with Ezra seated, no ride, no world built yet", () => {
    expect(runtime.seated).toBe(true);
    expect(runtime.ride).toBeNull();
    expect(runtime.built).toBeNull();
  });

  it("starts with no closeup targets and no closeup open", () => {
    expect(runtime.closeups.size).toBe(0);
    expect(runtime.closeup).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/closeupState.test.ts src/world/scene/screens/policy.test.ts src/world/state`
Expected: FAIL — `Failed to resolve import "./closeupState"` and `Failed to resolve import "./policy"`; in `store.test.ts` `TypeError: useWorld.getState(...).setCloseup is not a function`; in `runtime.test.ts` `TypeError: Cannot read properties of undefined (reading 'size')`.

- [ ] **Step 3: Add the closeup fields to the runtime and the store**

`src/world/state/runtime.ts` — after the `Ride` type. Old:
```ts
export type Ride =
  | { kind: "arc"; t: number; from: Vec3; to: Vec3; vel: Vec3; time: number }
  | { kind: "rail"; t: number; duration: number; rail: Rail; reverse: boolean; exit: Vec3; exitHeading: number };
```
New:
```ts
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
```

and at the end of the `runtime` object. Old:
```ts
  animPhase: 0,
  landTimer: 0,
};
```
New:
```ts
  animPhase: 0,
  landTimer: 0,
  /** Closeup targets by id (each LiveScreen registers itself). */
  closeups: new Map<string, CloseupTarget>(),
  /** The open closeup; openCloseup / closeCloseup write it together with the store's closeupId. */
  closeup: null as { id: string } | null,
};
```

`src/world/state/store.ts` — the interface. Old:
```ts
  ready: boolean;
  setReady(r: boolean): void;
}
```
New:
```ts
  ready: boolean;
  setReady(r: boolean): void;
  /** Id of the screen in closeup, or null (openCloseup / closeCloseup write it together with runtime.closeup). */
  closeupId: string | null;
  setCloseup(id: string | null): void;
}
```

and the implementation. Old:
```ts
  setReady: (ready) => {
    if (get().ready !== ready) set({ ready });
  },
}));
```
New:
```ts
  setReady: (ready) => {
    if (get().ready !== ready) set({ ready });
  },
  closeupId: null,
  setCloseup: (closeupId) => {
    if (get().closeupId !== closeupId) set({ closeupId });
  },
}));
```

- [ ] **Step 4: Implement `closeupState.ts` and `policy.ts`**

`src/world/scene/closeupState.ts`:

```ts
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";

/** Tour: scrolling the page more than this many px since a closeup opened closes it (spec §6 exits). */
export const CLOSEUP_SCROLL_EXIT = 24;

let openedAtScroll = 0;
const pageScroll = () => (typeof window === "undefined" ? 0 : window.scrollY);

/**
 * Sideways pan of a closeup wider than a portrait viewport (closeupPans): CloseupCamera keeps `limit` (world units either
 * way) and `perPx` (world units per CSS px of drag) current, CloseupController drags `offset`. Each closeup opens centred.
 */
export const closeupPan = { offset: 0, limit: 0, perPx: 0 };

/**
 * Opens the closeup on a registered target (a LiveScreen id): runtime.closeup for frame code and the store's
 * closeupId for the HUD and the touch controls, written together. A plain module without three.js, so the page
 * shell (HUD, mode keys, Tab cycling) can import it; CloseupController.tsx re-exports it for the master contract.
 */
export function openCloseup(id: string): void {
  if (!runtime.closeups.has(id) || runtime.closeup?.id === id) return;
  runtime.closeup = { id };
  closeupPan.offset = 0;
  openedAtScroll = pageScroll();
  // the hover (outline, cursor) belongs to the world behind the closeup
  runtime.hoverId = null;
  const s = useWorld.getState();
  s.setHovered(null);
  s.setCloseup(id);
}

/** Closes the open closeup (the camera glides back to the tour path or the follow camera). No-op when none is open. */
export function closeCloseup(): void {
  if (!runtime.closeup) return;
  runtime.closeup = null;
  useWorld.getState().setCloseup(null);
}

/** Tour exit rule: a closeup is open and the page has scrolled more than CLOSEUP_SCROLL_EXIT px since it opened. */
export function scrolledAway(scrollY: number): boolean {
  return runtime.closeup !== null && Math.abs(scrollY - openedAtScroll) > CLOSEUP_SCROLL_EXIT;
}
```

`src/world/scene/screens/policy.ts`:

```ts
/** Seconds the idle demo stays paused after the visitor's last tap on the screen (spec §5.1). */
export const DEMO_PAUSE = 7;
/** Shortest time between two redraws of one screen: at most 15 fps (spec §11). */
export const MIN_FRAME = 1 / 15;

export interface DemoGate {
  reduced: boolean;
  t: number;
  pausedUntil: number;
  inCloseup: boolean;
  activeIsland: string;
  island: string;
}

/**
 * The idle demo plays only while its island is the one in view (or the screen is in closeup), never under reduced
 * motion, and not within DEMO_PAUSE of a tap.
 */
export function demoMayRun(g: DemoGate): boolean {
  if (g.reduced || g.t < g.pausedUntil) return false;
  return g.inCloseup || g.activeIsland === g.island;
}

/** A redraw is due when the state changed (dirty) or the app animates (busy), never sooner than MIN_FRAME after the last. */
export function redrawDue(t: number, lastDraw: number, dirty: boolean, busy: boolean): boolean {
  return (dirty || busy) && t - lastDraw >= MIN_FRAME - 1e-9;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/world/scene/closeupState.test.ts src/world/scene/screens/policy.test.ts src/world/state`
Expected: PASS — every test file in the run passes (`closeupState.test.ts`, `policy.test.ts`, and every test file under `src/world/state`), `0 failed`.

- [ ] **Step 6: Implement `LiveScreen.tsx`**

`src/world/scene/screens/LiveScreen.tsx`:

```tsx
import { useEffect, useMemo, useRef } from "react";
import type { JSX } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { playSfx } from "@/world/engine/audio/sfx";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import type { CloseupTarget } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "@/world/scene/Interactable";
import { closeCloseup, openCloseup } from "@/world/scene/closeupState";
import { loadCanvasFonts } from "@/world/scene/islands/shared/canvasFonts";
import { islandFrame, worldTuple } from "@/world/scene/islands/shared/local";
import { screensVersion } from "./dirty";
import { DEMO_PAUSE, demoMayRun, redrawDue } from "./policy";
import type { DemoGate } from "./policy";
import { SCREEN_SCALE, hitAt, uvToLogical } from "./types";
import type { HitRegion, ScreenApp } from "./types";

// the master contract names this module; the implementation lives in ./dirty (plain module, see Part B plan)
// eslint-disable-next-line react-refresh/only-export-components
export { markScreensDirty } from "./dirty";

/** Depth of the Interactable's hitbox around the face (axis-aligned: a turned screen gets a wider box). */
const HIT_DEPTH = 0.3;

export interface LiveScreenProps<S> {
  /** Also the Interactable id and the closeup target id. */
  id: string;
  placement: IslandPlacement;
  /** A stable object (module constant or memoised): the program's state is keyed on it. */
  app: ScreenApp<S>;
  /** Interactable label, e.g. "Use the POS". */
  label: string;
  /** Island-local centre of the screen face (islandFrame: y = 0 is the grass top, fronts face +z). */
  at: { x: number; y: number; z: number };
  rotationY?: number;
  /** World units of the visible face. */
  size: { w: number; h: number };
  /** "bezel" (default): a rounded dark frame behind the face. */
  frame?: "bezel" | "none";
  bezelColor?: string;
  /** Interactable reach in Play (blocks from Ezra's chest to the face centre). */
  radius?: number;
}

/**
 * One program screen (spec §5.1): a canvas texture of logical × SCREEN_SCALE pixels, redrawn only when the program's
 * state changed, an image arrived or the program animates (at most 15 fps, only while in view). Its idle demo plays
 * while the island is in view or the screen is in closeup, pauses DEMO_PAUSE after a tap, and is off under reduced
 * motion. Activating it (click, E, Enter) opens the closeup; taps in closeup reach the program via its CloseupTarget.
 */
export function LiveScreen<S>({
  id,
  placement,
  app,
  label,
  at,
  rotationY = 0,
  size,
  frame = "bezel",
  bezelColor = "#22262b",
  radius = 3.5,
}: LiveScreenProps<S>): JSX.Element {
  const face = useRef<THREE.Mesh>(null);
  const width = app.logical.w * SCREEN_SCALE;
  const height = app.logical.h * SCREEN_SCALE;

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [width, height]);
  useEffect(() => () => texture.dispose(), [texture]);

  const bezel = useMemo(
    () => (frame === "bezel" ? new RoundedBoxGeometry(size.w + 0.16, size.h + 0.16, 0.14, 2, 0.05) : null),
    [frame, size.w, size.h],
  );
  useEffect(() => () => bezel?.dispose(), [bezel]);

  // the program's state and the redraw bookkeeping: frame callbacks and taps mutate it, React never re-renders for it
  const st = useMemo(
    () => ({
      app,
      canvas: texture.image as HTMLCanvasElement,
      s: null as S | null,
      regions: [] as HitRegion[],
      t: 0,
      dirty: true,
      version: -1,
      lastDraw: -Infinity,
      pausedUntil: 0,
      fontsReady: false,
      ctx: null as CanvasRenderingContext2D | null,
      gate: { reduced: false, t: 0, pausedUntil: 0, inCloseup: false, activeIsland: "", island: "" } as DemoGate,
      viewProj: new THREE.Matrix4(),
      frustum: new THREE.Frustum(),
    }),
    [app, texture],
  );

  useEffect(() => {
    let alive = true;
    void loadCanvasFonts().then(() => {
      if (!alive) return;
      st.fontsReady = true;
      st.dirty = true;
    });
    return () => {
      alive = false;
    };
  }, [st]);

  // the closeup target: CloseupCamera frames it, CloseupController sends it rays, taps and keys
  useEffect(() => {
    const v = new THREE.Vector3();
    const centre: Vec3 = { x: 0, y: 0, z: 0 };
    const normal: Vec3 = { x: 0, y: 0, z: 1 };
    const caster = new THREE.Raycaster();
    const from = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const target: CloseupTarget = {
      id,
      island: placement.id,
      size: { w: size.w, h: size.h },
      center: () => {
        if (face.current) {
          face.current.getWorldPosition(v);
          centre.x = v.x;
          centre.y = v.y;
          centre.z = v.z;
        }
        return centre;
      },
      normal: () => {
        if (face.current) {
          face.current.getWorldDirection(v);
          normal.x = v.x;
          normal.y = v.y;
          normal.z = v.z;
        }
        return normal;
      },
      input: (x, y) => {
        if (st.s === null) return;
        // any tap on the face pauses the idle demo, also one between the buttons
        st.pausedUntil = st.t + DEMO_PAUSE;
        const region = hitAt(st.regions, x, y);
        if (!region) return;
        st.s = app.act(st.s, region.action, region.arg, st.t);
        st.dirty = true;
        playSfx("click");
      },
      hit: (origin, direction) => {
        const mesh = face.current;
        if (!mesh) return null;
        caster.set(from.set(origin.x, origin.y, origin.z), dir.set(direction.x, direction.y, direction.z).normalize());
        const uv = caster.intersectObject(mesh, false)[0]?.uv;
        return uv ? uvToLogical(uv, app.logical) : null;
      },
      key: (code) => {
        if (!app.key || st.s === null) return false;
        const next = app.key(st.s, code, st.t);
        if (next === null) return false;
        st.s = next;
        st.dirty = true;
        st.pausedUntil = st.t + DEMO_PAUSE;
        return true;
      },
    };
    runtime.closeups.set(id, target);
    return () => {
      if (runtime.closeups.get(id) === target) runtime.closeups.delete(id);
      if (runtime.closeup?.id === id) closeCloseup();
    };
  }, [id, placement.id, size.w, size.h, app, st]);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    st.t = t;
    // ScreenApp contract: init's `now` is the wall time at clock t = 0
    if (st.s === null) st.s = app.init(new Date(Date.now() - t * 1000));
    const world = useWorld.getState();
    const g = st.gate;
    g.reduced = world.reducedMotion;
    g.t = t;
    g.pausedUntil = st.pausedUntil;
    g.inCloseup = runtime.closeup?.id === id;
    g.activeIsland = world.activeIsland;
    g.island = placement.id;
    if (demoMayRun(g)) {
      const next = app.auto(st.s, t);
      if (next) {
        st.s = next;
        st.dirty = true;
      }
    }
    const version = screensVersion();
    if (version !== st.version) {
      st.version = version;
      st.dirty = true;
    }
    if (!st.fontsReady || !redrawDue(t, st.lastDraw, st.dirty, app.busy(st.s, t))) return;
    const mesh = face.current;
    if (!mesh) return;
    // out of view: keep the redraw pending until the screen comes into view
    st.viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    st.frustum.setFromProjectionMatrix(st.viewProj);
    if (!st.frustum.intersectsObject(mesh)) return;
    if (!st.ctx) st.ctx = st.canvas.getContext("2d");
    const ctx = st.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(SCREEN_SCALE, 0, 0, SCREEN_SCALE, 0, 0);
    st.regions = app.draw(ctx, st.s, t);
    ctx.restore();
    texture.needsUpdate = true;
    st.dirty = false;
    st.lastDraw = t;
  });

  const [wx, wy, wz] = worldTuple(placement, at.x, at.y, at.z);
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, at.y, at.z]} rotation={[0, rotationY, 0]}>
          {bezel && (
            <mesh geometry={bezel} position={[0, 0, -0.07]} castShadow>
              <meshStandardMaterial color={bezelColor} roughness={0.6} />
            </mesh>
          )}
          <mesh ref={face} position={[0, 0, 0.002]}>
            <planeGeometry args={[size.w, size.h]} />
            {/* unlit: the face shows the program's colours as drawn (a lit + emissive face washed light UI colours out to white) */}
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <Interactable
        id={id}
        island={placement.id}
        label={label}
        position={[wx, wy, wz]}
        size={[cos * size.w + sin * HIT_DEPTH, size.h, sin * size.w + cos * HIT_DEPTH]}
        radius={radius}
        onActivate={() => openCloseup(id)}
        // in its own closeup the screen is not an interactable: no outline, tag or E prompt over the program
        enabled={() => runtime.closeup?.id !== id}
      />
    </>
  );
}
```

- [ ] **Step 7: Type-check, lint and run the whole suite**

Run: `npx tsc -b && npx eslint . && npx vitest run`
Expected: `tsc` and `eslint` print nothing (exit 0); Vitest ends with every test file passed, `0 failed`.

- [ ] **Step 8: Commit**

```bash
git add src/world/state/runtime.ts src/world/state/runtime.test.ts src/world/state/store.ts src/world/state/store.test.ts src/world/scene/closeupState.ts src/world/scene/closeupState.test.ts src/world/scene/screens/policy.ts src/world/scene/screens/policy.test.ts src/world/scene/screens/LiveScreen.tsx
git commit -F - <<'EOF'
feat(world): LiveScreen with redraw policy, idle demo and closeup registration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task B3: Closeup camera, controller and input integration

**Files:**
- Create: `src/world/engine/camera/closeup.ts`, `src/world/engine/camera/closeup.test.ts`
- Create: `src/world/scene/CloseupCamera.tsx`, `src/world/scene/CloseupController.tsx`
- Modify: `src/world/scene/World.tsx` (mount both), `src/world/scene/InteractionController.tsx`, `src/world/scene/PlayCamera.tsx`, `src/world/scene/useModeTransitions.ts`, `src/world/scene/useTabCycling.ts`, `src/world/ui/Hud.tsx`, `src/world/ui/MobileControls.tsx`

**Interfaces:**
- Consumes: B2 (`CloseupTarget`, `runtime.closeups`, `runtime.closeup`, `closeupId`, `openCloseup`, `closeCloseup`, `scrolledAway`); `isMoveCode`, `sharedKeyboard` (`@/world/input/keyboard`); `touchInput`, `consumeTouch` (`@/world/input/touch`).
- Produces: `CLOSEUP_FILL`, `CLOSEUP_GLIDE`, `CLOSEUP_HUD_PX`, `CLOSEUP_NEAR_MARGIN`, `CloseupView`, `closeupPose`, `closeupPans`, `closeupDistance`, `closeupPanLimit`, `clampPan`, `closeupNear`, `stepCloseupBlend`, `closeupWeight`; `CloseupCamera`; `CloseupController` (+ re-exported `openCloseup` / `closeCloseup`).

**How the pieces fit (read before editing):**
- Frame order in `World.tsx` stays: controllers → `PlayCamera` → `TourCamera` → **`CloseupCamera`** → crossings → `Ezra`. Tour and Play keep computing their own pose every frame; `CloseupCamera` then blends from that pose to the closeup pose with `closeupWeight(k)`, so leaving the closeup glides back to wherever the tour path point or the follow camera is now. `PlayCamera` smooths from the camera's previous final position, so during a closeup its base pose is pulled toward the screen; on the way out its own lerp eases it back, which reads as part of the glide.
- The framing (`closeupPose`'s `view`): the HUD covers the canvas's top `CLOSEUP_HUD_PX` (96 CSS px: the Play / Sound bar and the hint line), so `CloseupCamera` passes `inset = 96 / canvas height` and the target is fitted (85 % of the free height, or 90 % of the width) and centred in the frame below it. On a portrait viewport a landscape target (the POS, the CRM, a map board) is fitted by its height instead of shrunk to the width: about 18 px text on a phone instead of 7. The visitor drags sideways to pan it, until either edge of the face reaches the viewport's edge (`closeupPanLimit`). Portrait targets (the PeduliPasal phone) keep the fit-both rule.
- The near plane: on the way in `CloseupCamera` moves `camera.near` from its default (0.1) to `CLOSEUP_NEAR_MARGIN` in front of the face, eased by the closeup weight cubed (`closeupNear`), and puts it back once the glide out ends. Whatever stands between the camera and the screen is clipped: an awning post, a lamp, a title letter, Ezra. A phone closeup stands far back (about 4 blocks from a map board), so this matters there most.
- Who handles what while a closeup is open:

| Input | Tour | Play |
|---|---|---|
| Click on the face (press began in the closeup, < 6 px drag) | `CloseupController` → `target.input` | same |
| Click beside the face | `CloseupController` closes | same |
| The click that opened it | `InteractionController` only (CloseupController ignores presses that began before the closeup) | E / phone "Use" button |
| Sideways drag (press began in the closeup, > 6 px) | pans a screen wider than a portrait viewport (`closeupPan`); otherwise ignored | same; `PlayCamera` ignores orbit drags and wheel |
| Keys the screen uses (`target.key` true) | swallowed in the capture phase | same (Ezra does not walk) |
| Move keys / stick | not used: they switch to Play (useModeTransitions), the mode change closes the closeup | `CloseupController` frame check closes it; the key still walks Ezra |
| Space | normal | swallowed (no jump) |
| E | normal | drained by `InteractionController` (no prompt behind the closeup) |
| Esc | `useTabCycling` (canvas focused) or `useModeTransitions` closes it | `useModeTransitions` closes it; the next Esc leaves Play |
| Page scroll > 24 px | `CloseupController` closes | page does not scroll in Play |
| HUD "Back" | closes | closes |
| Tab / Enter | Tab moves on to the HUD (Back button first); Enter does nothing | Tab cycling is Tour-only already |
| Phone | `MobileControls` renders nothing during a closeup, so taps reach the canvas | same (stick and buttons hidden; Back or a tap beside the screen leaves) |

- [ ] **Step 1: Write the failing test for the closeup maths**

`src/world/engine/camera/closeup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/world/engine/types";
import {
  CLOSEUP_FILL, CLOSEUP_GLIDE, CLOSEUP_HUD_PX, CLOSEUP_NEAR_MARGIN, clampPan, closeupNear, closeupPanLimit, closeupPans,
  closeupPose, closeupWeight, stepCloseupBlend,
} from "./closeup";

const FOV = 40; // the world camera's vertical fov (WorldCanvas, framing.ts TOUR_FOV)
const TAN = Math.tan((FOV * Math.PI) / 360);
const LANDSCAPE = 16 / 9;
const PHONE = 9 / 19.5;
const INSET_DESKTOP = CLOSEUP_HUD_PX / 720; // 1280 × 720
const INSET_PHONE = CLOSEUP_HUD_PX / 845; // 390 × 845
const POS = { w: 3.4, h: 2.125 }; // landscape screens (POS, CRM)
const CHAT = { w: 1.25, h: 2.708 }; // the PeduliPasal phone
const MAP = { w: 1.5, h: 0.9375 }; // a map board
const center: Vec3 = { x: 70, y: 9.4, z: 18 };
const normal: Vec3 = { x: Math.sin(0.4), y: 0, z: Math.cos(0.4) };

const sub = (a: Vec3, b: Vec3) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const unit = (a: Vec3) => {
  const l = Math.hypot(a.x, a.y, a.z);
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};
const cross = (a: Vec3, b: Vec3) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
/** World Y made perpendicular to `n` (unit), and the matching right vector up × n. */
const axes = (n: Vec3) => {
  const up = unit({ x: -n.y * n.x, y: 1 - n.y * n.y, z: -n.y * n.z });
  return { up, right: cross(up, n) };
};
const FACE = axes(normal);

/** The face's corners in NDC (−1..1, y up) as seen from a pose's camera looking at its target. */
function projectFace(pose: { camera: Vec3; target: Vec3 }, size: { w: number; h: number }, aspect: number) {
  const f = unit(sub(pose.target, pose.camera));
  const { up, right } = axes({ x: -f.x, y: -f.y, z: -f.z });
  const xs: number[] = [];
  const ys: number[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const p = {
        x: center.x + FACE.right.x * (sx * size.w) / 2 + FACE.up.x * (sy * size.h) / 2,
        y: center.y + FACE.right.y * (sx * size.w) / 2 + FACE.up.y * (sy * size.h) / 2,
        z: center.z + FACE.right.z * (sx * size.w) / 2 + FACE.up.z * (sy * size.h) / 2,
      };
      const v = sub(p, pose.camera);
      const depth = dot(v, f);
      xs.push(dot(v, right) / (depth * TAN * aspect));
      ys.push(dot(v, up) / (depth * TAN));
    }
  }
  return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) };
}

describe("closeupPose", () => {
  it("fills at least 80 % of the frame without cropping wherever the target fits (no inset)", () => {
    for (const [size, aspect] of [[POS, LANDSCAPE], [CHAT, LANDSCAPE], [MAP, LANDSCAPE], [CHAT, PHONE]] as const) {
      const box = projectFace(closeupPose(center, normal, size, aspect, FOV), size, aspect);
      const h = (box.top - box.bottom) / 2;
      const w = (box.right - box.left) / 2;
      expect(Math.max(h, w)).toBeGreaterThanOrEqual(0.8);
      expect(h).toBeLessThanOrEqual(CLOSEUP_FILL.h + 1e-9);
      expect(w).toBeLessThanOrEqual(CLOSEUP_FILL.w + 1e-9);
    }
  });

  it("fits the height on a wide frame and the width of a portrait target too wide for a narrow one", () => {
    const pos = projectFace(closeupPose(center, normal, POS, LANDSCAPE, FOV), POS, LANDSCAPE);
    expect((pos.top - pos.bottom) / 2).toBeCloseTo(CLOSEUP_FILL.h, 6);
    const tall = { w: 1.25, h: 1.5 };
    const box = projectFace(closeupPose(center, normal, tall, PHONE, FOV), tall, PHONE);
    expect((box.right - box.left) / 2).toBeCloseTo(CLOSEUP_FILL.w, 6);
  });

  it("keeps the target below the HUD inset and centres it in the rest of the frame, at 16:9 and 9:19.5", () => {
    const cases = [
      [POS, LANDSCAPE, INSET_DESKTOP], [CHAT, LANDSCAPE, INSET_DESKTOP], [MAP, LANDSCAPE, INSET_DESKTOP],
      [POS, PHONE, INSET_PHONE], [CHAT, PHONE, INSET_PHONE], [MAP, PHONE, INSET_PHONE],
    ] as const;
    for (const [size, aspect, inset] of cases) {
      const box = projectFace(closeupPose(center, normal, size, aspect, FOV, undefined, { inset }), size, aspect);
      // the HUD covers NDC y 1 − 2 × inset .. 1
      expect(box.top, `${size.w} × ${size.h} at ${aspect.toFixed(2)}`).toBeLessThanOrEqual(1 - 2 * inset + 1e-9);
      expect(box.bottom).toBeGreaterThanOrEqual(-1);
      expect((box.top + box.bottom) / 2).toBeCloseTo(-inset, 9);
      if (!closeupPans(size, aspect)) {
        expect(box.left).toBeGreaterThanOrEqual(-1);
        expect(box.right).toBeLessThanOrEqual(1);
      }
    }
    // a height-bound target fills CLOSEUP_FILL.h of the free frame
    const pos = projectFace(closeupPose(center, normal, POS, LANDSCAPE, FOV, undefined, { inset: INSET_DESKTOP }), POS, LANDSCAPE);
    expect((pos.top - pos.bottom) / 2).toBeCloseTo(CLOSEUP_FILL.h * (1 - INSET_DESKTOP), 9);
  });

  it("fits a landscape target by its height on a portrait viewport, and pans it edge to edge", () => {
    expect(closeupPans(POS, PHONE)).toBe(true);
    const view = { inset: INSET_PHONE };
    const centred = projectFace(closeupPose(center, normal, POS, PHONE, FOV, undefined, view), POS, PHONE);
    expect((centred.top - centred.bottom) / 2).toBeCloseTo(CLOSEUP_FILL.h * (1 - INSET_PHONE), 9);
    expect(centred.right).toBeGreaterThan(1); // wider than the frame: the visitor pans
    expect(centred.left + centred.right).toBeCloseTo(0, 9); // starts centred
    const limit = closeupPanLimit(POS, PHONE, FOV, INSET_PHONE);
    expect(limit).toBeGreaterThan(0);
    const right = projectFace(closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: limit }), POS, PHONE);
    expect(right.right).toBeCloseTo(1, 9);
    const left = projectFace(closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: -limit }), POS, PHONE);
    expect(left.left).toBeCloseTo(-1, 9);
    // a pan past the limit stops at the edge
    expect(closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: limit + 5 })).toEqual(
      closeupPose(center, normal, POS, PHONE, FOV, undefined, { ...view, pan: limit }),
    );
  });

  it("keeps portrait targets on the fit-both rule: no pan on any viewport, none for a landscape target on a wide one", () => {
    expect(closeupPans(CHAT, PHONE)).toBe(false);
    expect(closeupPans(POS, LANDSCAPE)).toBe(false);
    expect(closeupPanLimit(CHAT, PHONE, FOV, INSET_PHONE)).toBe(0);
    expect(closeupPanLimit(POS, LANDSCAPE, FOV, INSET_DESKTOP)).toBe(0);
    expect(closeupPose(center, normal, CHAT, PHONE, FOV, undefined, { inset: INSET_PHONE, pan: 1 })).toEqual(
      closeupPose(center, normal, CHAT, PHONE, FOV, undefined, { inset: INSET_PHONE }),
    );
  });

  it("looks square on along the normal, with the look target in the face's plane", () => {
    for (const view of [{}, { inset: INSET_PHONE, pan: 0.4 }]) {
      const { camera, target } = closeupPose(center, normal, POS, PHONE, FOV, undefined, view);
      const back = unit(sub(camera, target));
      expect(dot(back, normal)).toBeCloseTo(1, 9);
      expect(dot(sub(target, center), normal)).toBeCloseTo(0, 9);
    }
    expect(closeupPose(center, normal, POS, LANDSCAPE, FOV).target).toEqual(center);
  });

  it("normalises a normal that is not unit length", () => {
    const a = closeupPose(center, normal, POS, LANDSCAPE, FOV, undefined, { inset: INSET_DESKTOP }).camera;
    const b = closeupPose(center, { x: normal.x * 5, y: 0, z: normal.z * 5 }, POS, LANDSCAPE, FOV, undefined, { inset: INSET_DESKTOP }).camera;
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
    expect(b.z).toBeCloseTo(a.z, 9);
  });

  it("fills and returns `out` when given one", () => {
    const out = { camera: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
    expect(closeupPose(center, normal, POS, LANDSCAPE, FOV, out)).toBe(out);
    expect(out.target).toEqual(center);
  });

  it("clamps a pan to ±limit", () => {
    expect(clampPan(2, 0.5)).toBe(0.5);
    expect(clampPan(-2, 0.5)).toBe(-0.5);
    expect(clampPan(0.2, 0.5)).toBe(0.2);
    expect(clampPan(0.2, 0)).toBe(0);
  });
});

describe("closeupNear", () => {
  it("eases the near plane from its default to just in front of the face, never below the default", () => {
    expect(closeupNear(0.1, 3.4, 0)).toBe(0.1);
    expect(closeupNear(0.1, 3.4, 1)).toBeCloseTo(3.4 - CLOSEUP_NEAR_MARGIN, 9);
    expect(closeupNear(0.1, 0.2, 1)).toBe(0.1);
    expect(closeupNear(0.1, -2, 1)).toBe(0.1);
    let prev = 0;
    for (let w = 0; w <= 1; w += 0.1) {
      const near = closeupNear(0.1, 9.4, w);
      expect(near).toBeGreaterThanOrEqual(prev);
      expect(near).toBeLessThanOrEqual(9.4 - CLOSEUP_NEAR_MARGIN);
      prev = near;
    }
  });
});

describe("closeup blend", () => {
  it("glides in over CLOSEUP_GLIDE seconds and back out", () => {
    let k = 0;
    for (let i = 0; i < 10; i++) k = stepCloseupBlend(k, true, CLOSEUP_GLIDE / 10, false);
    expect(k).toBeCloseTo(1, 9);
    expect(stepCloseupBlend(1, true, 0.1, false)).toBe(1);
    expect(stepCloseupBlend(1, false, CLOSEUP_GLIDE / 2, false)).toBeCloseTo(0.5, 9);
    expect(stepCloseupBlend(0.01, false, 0.1, false)).toBe(0);
  });

  it("cuts under reduced motion", () => {
    expect(stepCloseupBlend(0, true, 0.016, true)).toBe(1);
    expect(stepCloseupBlend(1, false, 0.016, true)).toBe(0);
  });

  it("eases the weight: starts and lands softly and never goes back", () => {
    expect(closeupWeight(0)).toBe(0);
    expect(closeupWeight(1)).toBe(1);
    expect(closeupWeight(0.5)).toBeCloseTo(0.5, 9);
    expect(closeupWeight(0.1)).toBeLessThan(0.1);
    let prev = 0;
    for (let k = 0.05; k <= 1; k += 0.05) {
      expect(closeupWeight(k)).toBeGreaterThanOrEqual(prev);
      prev = closeupWeight(k);
    }
    expect(closeupWeight(-1)).toBe(0);
    expect(closeupWeight(2)).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/engine/camera/closeup.test.ts`
Expected: FAIL — `Error: Failed to resolve import "./closeup" from "src/world/engine/camera/closeup.test.ts". Does the file exist?`

- [ ] **Step 3: Implement `closeup.ts`**

`src/world/engine/camera/closeup.ts`:

```ts
import type { Vec3 } from "@/world/engine/types";

/** Share of the free frame a closeup target fills: 85 % of its height, or 90 % of the width where the width binds. */
export const CLOSEUP_FILL = { h: 0.85, w: 0.9 };
/** Seconds of the glide into a closeup and back out of it. */
export const CLOSEUP_GLIDE = 0.8;
/**
 * CSS px at the top of the canvas that the HUD covers (world.css: the Play / Sound bar from 16 px, the hint line
 * below it ending near 87 px, plus air). CloseupCamera turns it into closeupPose's `inset`, a share of the canvas height.
 */
export const CLOSEUP_HUD_PX = 96;
/** The closeup camera's near plane stops this far in front of the face: everything nearer the camera is clipped. */
export const CLOSEUP_NEAR_MARGIN = 0.25;

/**
 * How closeupPose frames its target. `inset`: share of the frame height kept free at the top (the HUD); the target is
 * fitted and centred in the frame below it. `pan`: world units the camera slides along the face's horizontal, for a
 * wide target on a portrait viewport (clamped to closeupPanLimit; 0 = centred).
 */
export interface CloseupView { inset?: number; pan?: number }

/** A landscape target on a portrait viewport is fitted by its height and panned sideways, not shrunk to the width. */
export function closeupPans(size: { w: number; h: number }, aspect: number): boolean {
  return aspect < 1 && size.w > size.h;
}

/**
 * Distance from the face for a camera with a vertical fov of `fovDeg` at `aspect` (width / height): the target's height
 * fills CLOSEUP_FILL.h of the frame below the inset unless its width would then overflow CLOSEUP_FILL.w, in which case
 * the width fits instead; a panning target (closeupPans) always fits its height.
 */
export function closeupDistance(size: { w: number; h: number }, aspect: number, fovDeg: number, inset = 0): number {
  const tanY = Math.tan((fovDeg * Math.PI) / 360);
  const byHeight = size.h / (2 * tanY * CLOSEUP_FILL.h * (1 - inset));
  if (closeupPans(size, aspect)) return byHeight;
  return Math.max(byHeight, size.w / (2 * tanY * aspect * CLOSEUP_FILL.w));
}

/**
 * How far either way (world units) a panning closeup may slide: until the face's left or right edge reaches the
 * viewport's edge. 0 when the target is not panned.
 */
export function closeupPanLimit(size: { w: number; h: number }, aspect: number, fovDeg: number, inset = 0): number {
  if (!closeupPans(size, aspect)) return 0;
  const tanY = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max(0, size.w / 2 - closeupDistance(size, aspect, fovDeg, inset) * tanY * aspect);
}

/** A pan offset kept within ±limit. */
export function clampPan(pan: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, pan));
}

/**
 * Camera pose square on to a flat target (centre, facing `normal`, size in world units) at closeupDistance, lifted by
 * the inset so the target sits centred in the frame below the HUD, and slid by `view.pan` along the face's horizontal.
 * The face's up is world Y made perpendicular to the normal, its right is up × normal. The sketch's stopPose with FOV_T,
 * without its 0.84 fudge. Pure; pass `out` to reuse its objects in frame callbacks.
 */
export function closeupPose(
  center: Vec3,
  normal: Vec3,
  size: { w: number; h: number },
  aspect: number,
  fovDeg: number,
  out?: { camera: Vec3; target: Vec3 },
  view: CloseupView = {},
): { camera: Vec3; target: Vec3 } {
  const inset = view.inset ?? 0;
  const tanY = Math.tan((fovDeg * Math.PI) / 360);
  const d = closeupDistance(size, aspect, fovDeg, inset);
  const len = Math.hypot(normal.x, normal.y, normal.z);
  const ok = len > 1e-9;
  const nx = ok ? normal.x / len : 0;
  const ny = ok ? normal.y / len : 0;
  const nz = ok ? normal.z / len : 1;
  // the face's up: world Y minus its part along the normal (a face looking straight up or down takes −z as its up)
  let ux = -ny * nx;
  let uy = 1 - ny * ny;
  let uz = -ny * nz;
  const ul = Math.hypot(ux, uy, uz);
  if (ul > 1e-6) {
    ux /= ul;
    uy /= ul;
    uz /= ul;
  } else {
    ux = 0;
    uy = 0;
    uz = -1;
  }
  const rx = uy * nz - uz * ny;
  const ry = uz * nx - ux * nz;
  const rz = ux * ny - uy * nx;
  // a lift of inset × the half frame height puts the face's centre in the middle of the frame below the HUD
  const lift = inset * d * tanY;
  const pan = clampPan(view.pan ?? 0, closeupPanLimit(size, aspect, fovDeg, inset));
  const ox = ux * lift + rx * pan;
  const oy = uy * lift + ry * pan;
  const oz = uz * lift + rz * pan;
  const pose = out ?? { camera: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
  pose.target.x = center.x + ox;
  pose.target.y = center.y + oy;
  pose.target.z = center.z + oz;
  pose.camera.x = pose.target.x + nx * d;
  pose.camera.y = pose.target.y + ny * d;
  pose.camera.z = pose.target.z + nz * d;
  return pose;
}

/** Advances the blend clock k (0 = the base camera, 1 = the closeup) toward `active`; a cut under reduced motion. */
export function stepCloseupBlend(k: number, active: boolean, dt: number, reduced: boolean): number {
  if (reduced) return active ? 1 : 0;
  const step = dt / CLOSEUP_GLIDE;
  return active ? Math.min(1, k + step) : Math.max(0, k - step);
}

/** Eased weight of the blend clock (smootherstep): the glide starts and lands softly. */
export function closeupWeight(k: number): number {
  const x = Math.min(1, Math.max(0, k));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * The camera's near plane during a closeup: from the default `base` (weight 0) toward CLOSEUP_NEAR_MARGIN in front of
 * the face (weight 1), eased by the weight cubed so the clip only reaches far once the camera is nearly square on.
 * Never below `base`. `faceDistance` is the camera's distance to the face's plane.
 */
export function closeupNear(base: number, faceDistance: number, weight: number): number {
  const clip = Math.max(base, faceDistance - CLOSEUP_NEAR_MARGIN);
  const w = Math.min(1, Math.max(0, weight));
  return base + (clip - base) * w * w * w;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/world/engine/camera/closeup.test.ts`
Expected: PASS — `Tests  13 passed (13)`.

- [ ] **Step 5: Commit the closeup maths**

```bash
git add src/world/engine/camera/closeup.ts src/world/engine/camera/closeup.test.ts
git commit -F - <<'EOF'
feat(world): closeup pose and blend maths (target fills 85 % height or 90 % width)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

- [ ] **Step 6: Implement `CloseupCamera.tsx`**

`src/world/scene/CloseupCamera.tsx`:

```tsx
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CLOSEUP_HUD_PX, clampPan, closeupNear, closeupPanLimit, closeupPose, closeupWeight, stepCloseupBlend,
} from "@/world/engine/camera/closeup";
import type { Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { closeupPan } from "./closeupState";

/** The HUD never takes more than this share of the frame (a very short window keeps a usable closeup). */
const MAX_INSET = 0.3;

/**
 * The closeup camera layer (spec §6). Mounted after TourCamera and PlayCamera, it blends the pose they set this frame
 * toward the open target's closeup pose (re-evaluated every frame, so a moving target stays framed) with an eased
 * weight in and out; reduced motion cuts. The pose leaves the HUD's band at the top free, a wide target on a portrait
 * viewport is fitted by its height and panned (closeupPan), and the near plane moves up to just in front of the face so
 * nothing between the camera and the screen (a prop, Ezra) covers it. At weight 0 the camera is the base cameras' again,
 * with its default near plane.
 */
export function CloseupCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const st = useMemo(
    () => ({
      k: 0,
      /** the target being framed: the open one, or the last one while gliding back out */
      id: null as string | null,
      pose: { camera: { x: 0, y: 0, z: 0 } as Vec3, target: { x: 0, y: 0, z: 0 } as Vec3 },
      eye: new THREE.Vector3(),
      look: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      /** the camera's own near plane, restored when the closeup has glided out */
      baseNear: camera.near,
    }),
    [camera],
  );

  const setNear = (near: number) => {
    if (Math.abs(camera.near - near) < 1e-4) return;
    camera.near = near;
    camera.updateProjectionMatrix();
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const open = runtime.closeup;
    if (open) st.id = open.id;
    const target = st.id ? runtime.closeups.get(st.id) : undefined;
    if (!target) {
      // nothing open, or the target unmounted mid-glide: the base camera is the camera
      st.k = 0;
      st.id = null;
      setNear(st.baseNear);
      return;
    }
    st.k = stepCloseupBlend(st.k, open !== null, dt, useWorld.getState().reducedMotion);
    if (st.k <= 0) {
      st.id = null;
      setNear(st.baseNear);
      return;
    }
    const w = closeupWeight(st.k);
    // the HUD covers the canvas's top CLOSEUP_HUD_PX: the target is fitted and centred in the frame below it
    const inset = Math.min(MAX_INSET, CLOSEUP_HUD_PX / Math.max(1, state.size.height));
    closeupPan.limit = closeupPanLimit(target.size, camera.aspect, camera.fov, inset);
    closeupPan.offset = clampPan(closeupPan.offset, closeupPan.limit);
    const center = target.center();
    const normal = target.normal();
    const pose = closeupPose(center, normal, target.size, camera.aspect, camera.fov, st.pose, { inset, pan: closeupPan.offset });
    // CSS px of drag → world units on the face (CloseupController's pan)
    const dist = Math.hypot(pose.camera.x - pose.target.x, pose.camera.y - pose.target.y, pose.camera.z - pose.target.z);
    closeupPan.perPx = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, state.size.height);
    st.eye.set(pose.camera.x, pose.camera.y, pose.camera.z);
    st.look.set(pose.target.x, pose.target.y, pose.target.z);
    // a camera looks down its −z: Matrix4.lookAt(eye, target, up) is the rotation Object3D.lookAt gives a camera
    st.m.lookAt(st.eye, st.look, camera.up);
    st.q.setFromRotationMatrix(st.m);
    camera.position.lerp(st.eye, w);
    camera.quaternion.slerp(st.q, w);
    // clip whatever stands between the camera and the face: the near plane just in front of the face's plane
    const nl = Math.hypot(normal.x, normal.y, normal.z) || 1;
    const face =
      ((camera.position.x - center.x) * normal.x + (camera.position.y - center.y) * normal.y + (camera.position.z - center.z) * normal.z) / nl;
    setNear(closeupNear(st.baseNear, face, w));
    runtime.cameraPos.x = camera.position.x;
    runtime.cameraPos.y = camera.position.y;
    runtime.cameraPos.z = camera.position.z;
  });
  return null;
}
```

- [ ] **Step 7: Implement `CloseupController.tsx`**

`src/world/scene/CloseupController.tsx`:

```tsx
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { isMoveCode, sharedKeyboard } from "@/world/input/keyboard";
import { touchInput } from "@/world/input/touch";
import { clampPan } from "@/world/engine/camera/closeup";
import { closeCloseup, closeupPan, scrolledAway } from "./closeupState";

// the master contract names this module; the implementations live in ./closeupState (no three.js, shell-safe)
// eslint-disable-next-line react-refresh/only-export-components
export { closeCloseup, openCloseup } from "./closeupState";

/** A press that moves less than this (CSS px) before release is a click, as in InteractionController. */
const CLICK_SLOP = 6;

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

/**
 * Input while a closeup is open (spec §6): a click on the face goes to the program (a click beside it closes the
 * closeup), a sideways drag pans a screen wider than a portrait viewport (closeupPan; a press that moves less than
 * CLICK_SLOP is still a tap), the cursor shows where the face is, keys the screen uses (CloseupTarget.key) reach
 * nothing else, Space does not jump in Play, and walking (keys or stick, Play) or scrolling the page more than
 * CLOSEUP_SCROLL_EXIT px (Tour) closes it. Esc is handled by useModeTransitions / useTabCycling, the Back button by the HUD.
 */
export function CloseupController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ray = useMemo(
    () => ({
      caster: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      origin: { x: 0, y: 0, z: 0 } as Vec3,
      dir: { x: 0, y: 0, z: 0 } as Vec3,
    }),
    [],
  );

  // pointer: taps on the face, closing beside it, dragging a wide screen sideways, the cursor
  useEffect(() => {
    const el = gl.domElement;
    const press = { x: 0, y: 0, lastX: 0, panning: false, id: null as string | null };
    const activeTarget = () => (runtime.closeup ? (runtime.closeups.get(runtime.closeup.id) ?? null) : null);
    const cast = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.caster.setFromCamera(ray.ndc, camera);
      const o = ray.caster.ray.origin;
      const d = ray.caster.ray.direction;
      ray.origin.x = o.x;
      ray.origin.y = o.y;
      ray.origin.z = o.z;
      ray.dir.x = d.x;
      ray.dir.y = d.y;
      ray.dir.z = d.z;
    };
    const onDown = (e: PointerEvent) => {
      press.x = e.clientX;
      press.y = e.clientY;
      press.lastX = e.clientX;
      press.panning = false;
      press.id = runtime.closeup?.id ?? null;
    };
    // a sideways drag that began in the closeup pans it when the screen is wider than the viewport (the face follows
    // the finger); past CLICK_SLOP the release is no tap
    const onDrag = (e: PointerEvent) => {
      if (press.id === null || runtime.closeup?.id !== press.id || closeupPan.limit <= 0) return;
      if (!press.panning && Math.abs(e.clientX - press.x) <= CLICK_SLOP) return;
      press.panning = true;
      closeupPan.offset = clampPan(closeupPan.offset - (e.clientX - press.lastX) * closeupPan.perPx, closeupPan.limit);
      press.lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      const id = press.id;
      press.id = null;
      // only presses that began in this closeup: the click that opened it is not also a tap on the program
      if (id === null || runtime.closeup?.id !== id) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > CLICK_SLOP) return;
      const target = activeTarget();
      if (!target) {
        closeCloseup();
        return;
      }
      cast(e);
      const p = target.hit(ray.origin, ray.dir);
      if (p) target.input(p.x, p.y);
      else closeCloseup(); // a click beside the screen goes back
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = activeTarget();
      if (!target) return;
      cast(e);
      el.style.cursor = target.hit(ray.origin, ray.dir) ? "pointer" : "";
    };
    // opening or closing resets the cursor (InteractionController's hover pointer, or ours, must not linger); during a
    // closeup a sideways finger drag reaches the canvas as pointer events (the page still scrolls vertically: Tour exit)
    const unsub = useWorld.subscribe((s, prev) => {
      if (s.closeupId === prev.closeupId) return;
      el.style.cursor = "";
      el.style.touchAction = s.closeupId ? "pan-y" : "";
    });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointermove", onDrag);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointermove", onDrag);
      unsub();
    };
  }, [camera, gl, ray]);

  // keys, in the capture phase: before the shared keyboard, the mode keys and Tab cycling see them
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!runtime.closeup || e.code === "Escape" || isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = runtime.closeups.get(runtime.closeup.id);
      if (target?.key?.(e.code)) {
        // the screen used it (a map board's arrows): Ezra must not walk, the tour must not switch to Play
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (useWorld.getState().mode === "play" && e.code === "Space") {
        // no jumping behind the closeup
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Tour: scrolling the page away ends the closeup
  useEffect(() => {
    const onScroll = () => {
      if (useWorld.getState().mode === "tour" && scrolledAway(window.scrollY)) closeCloseup();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Play: walking (move keys or the stick) ends the closeup, and so does a target that unmounted. closeCloseup is
  // event-like and change-guarded: it fires once, never per frame.
  useFrame(() => {
    const open = runtime.closeup;
    if (!open) return;
    if (!runtime.closeups.has(open.id)) {
      closeCloseup();
      return;
    }
    if (useWorld.getState().mode !== "play") return;
    let walking = touchInput.moveForward !== 0 || touchInput.moveRight !== 0;
    for (const code of sharedKeyboard.keys) if (isMoveCode(code)) walking = true;
    if (walking) closeCloseup();
  });

  return null;
}
```

- [ ] **Step 8: Mount both in `World.tsx`**

Part A already renamed the island registry in this file; these edits touch other lines only.

Old:
```ts
import { InteractionController } from "./InteractionController";
```
New:
```ts
import { CloseupCamera } from "./CloseupCamera";
import { CloseupController } from "./CloseupController";
import { InteractionController } from "./InteractionController";
```

Old:
```tsx
      <InteractionController />
```
New:
```tsx
      <InteractionController />
      <CloseupController />
```

Old:
```tsx
      <TourCamera />
```
New:
```tsx
      <TourCamera />
      {/* after both cameras (and before crossings and Ezra): blends their pose toward the screen in closeup and back */}
      <CloseupCamera />
```

- [ ] **Step 9: `InteractionController.tsx` steps aside during a closeup**

Old:
```ts
    let downX = 0;
    let downY = 0;
```
New:
```ts
    let downX = 0;
    let downY = 0;
    /** the press began inside a closeup: its release belongs to CloseupController (a tap, or the click that closes it) */
    let downInCloseup = false;
```

Old:
```ts
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || useWorld.getState().mode !== "tour") return;
```
New:
```ts
    const onMove = (e: PointerEvent) => {
      // a closeup owns the pointer (CloseupController): no hover on the world behind it
      if (e.pointerType !== "mouse" || useWorld.getState().mode !== "tour" || runtime.closeup) return;
```

Old:
```ts
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (useWorld.getState().mode !== "tour") return;
```
New:
```ts
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downInCloseup = runtime.closeup !== null;
    };
    const onUp = (e: PointerEvent) => {
      // checked both ways, so the result never depends on which pointerup listener runs first
      if (downInCloseup || runtime.closeup) return;
      if (useWorld.getState().mode !== "tour") return;
```

Old:
```ts
    if (s.mode !== "play") return;
    if (runtime.hoverId) runtime.hoverId = null;
```
New:
```ts
    if (s.mode !== "play") return;
    if (runtime.hoverId) runtime.hoverId = null;
    if (runtime.closeup) {
      // the closeup has the input: no E prompt or interaction behind it (Ezra stays where he is)
      sharedKeyboard.consume("KeyE");
      consumeTouch("interact");
      if (runtime.focusId !== null) {
        runtime.focusId = null;
        s.setPrompt(null); // change-guarded, event-like
      }
      return;
    }
```

- [ ] **Step 10: `PlayCamera.tsx` ignores orbit drags and zoom during a closeup**

Old:
```ts
    const down = (e: PointerEvent) => {
      if (useWorld.getState().mode !== "play" || e.pointerType === "touch") return;
```
New:
```ts
    const down = (e: PointerEvent) => {
      // in a closeup a press is a tap on the screen (CloseupController), never an orbit drag
      if (useWorld.getState().mode !== "play" || e.pointerType === "touch" || runtime.closeup) return;
```

Old:
```ts
    const wheel = (e: WheelEvent) => {
      if (useWorld.getState().mode !== "play") return;
      e.preventDefault();
      orbitInput.addZoom(e.deltaY);
    };
```
New:
```ts
    const wheel = (e: WheelEvent) => {
      if (useWorld.getState().mode !== "play") return;
      e.preventDefault();
      if (runtime.closeup) return; // no zooming the follow camera behind a closeup
      orbitInput.addZoom(e.deltaY);
    };
```

- [ ] **Step 11: `useModeTransitions.ts`: Esc closes the closeup first; switching modes ends it**

Old:
```ts
import { islandTop } from "./islands/types";
```
New:
```ts
import { closeCloseup } from "./closeupState";
import { islandTop } from "./islands/types";
```

Old:
```ts
    return useWorld.subscribe((s, prev) => {
      if (s.mode === prev.mode) return;
      if (s.mode === "play") enterPlay();
      else exitPlay();
    });
```
New:
```ts
    return useWorld.subscribe((s, prev) => {
      if (s.mode === prev.mode) return;
      // a closeup belongs to the mode it was opened in: switching (HUD button, a move key in the tour) ends it
      closeCloseup();
      if (s.mode === "play") enterPlay();
      else exitPlay();
    });
```

Old:
```ts
      const s = useWorld.getState();
      if (s.mode === "tour" && isMoveCode(e.code)) s.setMode("play");
      else if (s.mode === "play" && e.code === "Escape") s.setMode("tour");
```
New:
```ts
      const s = useWorld.getState();
      // Esc closes an open closeup instead (in Play the next Esc leaves Play); in the tour useTabCycling may have
      // closed it already when the canvas has focus, and then this Esc does nothing more
      if (e.code === "Escape" && runtime.closeup) closeCloseup();
      else if (s.mode === "tour" && isMoveCode(e.code)) s.setMode("play");
      else if (s.mode === "play" && e.code === "Escape") s.setMode("tour");
```

- [ ] **Step 12: `useTabCycling.ts`: Escape closes the closeup; no Tab/Enter behind it**

Old:
```ts
import { cycleFocus } from "./interaction/focus";
```
New:
```ts
import { closeCloseup } from "./closeupState";
import { cycleFocus } from "./interaction/focus";
```

Old:
```ts
      const s = useWorld.getState();
      if (s.mode !== "tour") return;
      if (e.key === "Tab") {
```
New:
```ts
      const s = useWorld.getState();
      if (s.mode !== "tour") return;
      // a closeup has the stage: Tab and Enter don't wander to the islands behind it (Tab moves on to the HUD's Back)
      if (runtime.closeup && e.key !== "Escape") return;
      if (e.key === "Tab") {
```

Old:
```ts
      } else if (e.key === "Escape") {
        clear();
      }
```
New:
```ts
      } else if (e.key === "Escape") {
        // Esc in the tour backs out of a closeup (useModeTransitions also closes it when the canvas lacks focus)
        closeCloseup();
        clear();
      }
```

- [ ] **Step 13: `Hud.tsx`: Back button and closeup hint**

No CSS change is needed: the Back button uses the existing `.hud-btn` style inside `.hud-bar`, and the hint and prompt keep their rules in `src/world/world.css`.

Old:
```ts
import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";
```
New:
```ts
import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";
import { runtime } from "@/world/state/runtime";
import { closeupPans } from "@/world/engine/camera/closeup";
import { closeCloseup } from "@/world/scene/closeupState";
```

The hint table gains the closeup lines for keys and for touch, with a variant for a screen that pans (a landscape screen on a portrait viewport, see `CloseupCamera`). Old:
```ts
const HINTS = {
  keys: { play: "WASD move · Space jump · Shift run · E interact · Esc tour", tour: "Scroll to explore · Play to walk around" },
  touch: { play: "Stick: walk · Swipe the right side: look · Tour: back", tour: "Scroll to explore · Drag the stick to walk around" },
} as const;
```
New:
```ts
const HINTS = {
  keys: {
    play: "WASD move · Space jump · Shift run · E interact · Esc tour",
    tour: "Scroll to explore · Play to walk around",
    closeup: "Click the screen to use it · Esc to go back",
    closeupPan: "Drag to pan · Click to use · Esc to go back",
  },
  touch: {
    play: "Stick: walk · Swipe the right side: look · Tour: back",
    tour: "Scroll to explore · Drag the stick to walk around",
    closeup: "Tap the screen to use it · Back to leave",
    closeupPan: "Swipe to pan · Tap to use · Back to leave",
  },
} as const;
```

Old:
```ts
  const ready = useWorld((s) => s.ready);
```
New:
```ts
  const ready = useWorld((s) => s.ready);
  const closeupId = useWorld((s) => s.closeupId);
  // a screen wider than a portrait viewport is panned in its closeup (CloseupCamera fits its height)
  const size = closeupId ? runtime.closeups.get(closeupId)?.size : undefined;
  const pans = size !== undefined && typeof window !== "undefined" && closeupPans(size, window.innerWidth / window.innerHeight);
  const hint = closeupId ? (pans ? "closeupPan" : "closeup") : mode;
```

Old:
```tsx
      <div className="hud-bar" role="group" aria-label="World controls">
        {/* Play waits for the built world (the store ignores it until then) */}
```
New:
```tsx
      <div className="hud-bar" role="group" aria-label="World controls">
        {/* closeup: back to the world (Esc, a click beside the screen, scrolling or walking also go back) */}
        {closeupId && (
          <button type="button" className="hud-btn" onClick={closeCloseup}>
            <span aria-hidden="true">← </span>Back
          </button>
        )}
        {/* Play waits for the built world (the store ignores it until then) */}
```

Old:
```tsx
      <p className="hud-hint">{HINTS[touch ? "touch" : "keys"][mode]}</p>
      <div className="hud-prompt" aria-live="polite">
        {prompt ? (
```
New:
```tsx
      <p className="hud-hint">{HINTS[touch ? "touch" : "keys"][hint]}</p>
      <div className="hud-prompt" aria-live="polite">
        {prompt && !closeupId ? (
```

- [ ] **Step 14: `MobileControls.tsx`: touch controls step aside during a closeup**

In Play the stick and orbit zones cover the bottom 62 % of the screen (`.mc-zone`), and in the tour the resting stick sits bottom left (a press on it enters Play): both would swallow taps on the screen in closeup.

Old:
```tsx
  const prompt = useWorld((s) => s.prompt);
```
New:
```tsx
  const prompt = useWorld((s) => s.prompt);
  const closeupId = useWorld((s) => s.closeupId);
```

Old:
```tsx
  useEffect(() => {
    if (mode !== "play") {
      resetTouch();
      stickId.current = null;
      setStick(null);
    }
  }, [mode]);

  if (!coarse || !ready) return null;
```
New:
```tsx
  useEffect(() => {
    // leaving Play, or a closeup opening, drops a held stick (Ezra must not walk on, nor close the closeup at once)
    if (mode !== "play" || closeupId) {
      resetTouch();
      stickId.current = null;
      setStick(null);
    }
  }, [mode, closeupId]);

  if (!coarse || !ready) return null;
  // a closeup owns the screen: taps go to the program on it; the HUD's Back button or a tap beside it leaves
  if (closeupId) return null;
```

- [ ] **Step 15: Type-check, lint, run the suite and build**

Run: `npx tsc -b && npx eslint . && npx vitest run`
Expected: `tsc` and `eslint` print nothing; Vitest: every test file passed, `0 failed`.

Run: `npm run build`
Expected: ends with `✓ built in …` and no errors.

Run: `grep -l "isCanvasTexture" dist/assets/*.js`
Expected: exactly one file, `dist/assets/vendor-three-<hash>.js` (the HUD and mode keys import `closeupState.ts`, so three.js stays out of the page-shell chunk).

The in-world check (closeup enter/exit in Tour, Play and on a phone, the Back button, tapping beside the screen, scroll exit) needs a screen on an island and happens in Part C (C2–C4, C8 checklist). Part B mounts no screen in committed code.

- [ ] **Step 16: Commit**

```bash
git add src/world/scene/CloseupCamera.tsx src/world/scene/CloseupController.tsx src/world/scene/World.tsx src/world/scene/InteractionController.tsx src/world/scene/PlayCamera.tsx src/world/scene/useModeTransitions.ts src/world/scene/useTabCycling.ts src/world/ui/Hud.tsx src/world/ui/MobileControls.tsx
git commit -F - <<'EOF'
feat(world): closeup camera layer, closeup input routing, HUD Back button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task B4: POS Monosuko app (strings, model, draw, assets)

**Files:**
- Create: `public/world/monosuko/menu.webp`, `public/world/monosuko/logo.webp`
- Create: `src/world/scene/screens/pos/strings.ts`, `src/world/scene/screens/pos/pos.ts`, `src/world/scene/screens/pos/pos.test.ts`
- Create: `src/world/scene/screens/pos/posDraw.ts`, `src/world/scene/screens/pos/posDraw.test.ts`, `src/world/scene/screens/pos/index.ts`
- Create: `src/world/scene/screens/testing/fakeCtx.ts`

**Interfaces:**
- Consumes: B1 (`ScreenApp`, `HitRegion`, `formatRupiah`, `roundRect`, `wrapText`, `loadScreenImage`, `ScreenImage`, `stepRandom`); `CANVAS_FONTS` (`@/world/scene/islands/shared/canvasFonts`).
- Produces: `posApp: ScreenApp<PosState>` and everything listed for `pos/` in Contract additions; `fakeCtx`, `FakeImage`.

**Behaviour (spec §5.2, sketch `part-mono.js`):** six menu cards with photo, name, Variant/Combo badge, price and (portion items only) a stock badge that counts what is already in the order: green number → amber "N left" below the item's minimum → red "Sold out" at 0 (card at 60 % opacity, not addable). Tap a card to add it, a free table to select it (2 and 7 are occupied), Pay to commit: the order clears, stock drops (never below 0), and "Payment / Table N / total / ✓" shows for 1.6 s, during which input is ignored. When every portion item is below its minimum after a payment, the shift restocks to the seed stock. Idle demo: adds a random addable item every 1.3 s and pays once the order has 4 items (2.4 s pause after paying).

- [ ] **Step 1: Create the two image assets**

From the repo root (Git Bash):

```bash
mkdir -p public/world/monosuko
python - <<'PY'
from PIL import Image
SRC = "C:/Users/ezrak/OneDrive/Documents/Code/Skripsi-POS-Restaurant/frontend/public"
OUT = "C:/Users/ezrak/OneDrive/Documents/Code/react/portfolio/portfolio/public/world/monosuko"
# menu order = pos.ts MENU: Grilled Chicken Piece, Combo A, Chicken Tauco Soup, Smashed Beef Empal, Steamed Rice, Iced Tea
names = ["ayam-bakar", "paket-a", "ayam-kuah-tauco", "empal-penyet", "nasi", "es-teh"]
# paket-a.webp is a promo graphic with Indonesian text and "50.000": keep only the plate
crop = {"paket-a": (100, 160, 340, 400)}
sprite = Image.new("RGB", (200 * len(names), 200), "white")
for i, n in enumerate(names):
    im = Image.open(f"{SRC}/menu/{n}.webp").convert("RGB")
    s = min(im.size)
    l, t = (im.width - s) // 2, (im.height - s) // 2
    sprite.paste(im.crop(crop.get(n, (l, t, l + s, t + s))).resize((200, 200), Image.LANCZOS), (i * 200, 0))
sprite.save(f"{OUT}/menu.webp", "WEBP", quality=82, method=6)
logo = Image.open(f"{SRC}/branding/logo-1780217580893.webp").convert("RGBA").resize((160, 160), Image.LANCZOS)
logo.save(f"{OUT}/logo.webp", "WEBP", quality=90, method=6)
print("menu", Image.open(f"{OUT}/menu.webp").size, "logo", Image.open(f"{OUT}/logo.webp").size)
PY
ls -la public/world/monosuko
```

Expected: `menu (1200, 200) logo (160, 160)`, then `logo.webp` ≈ 11 KB and `menu.webp` ≈ 43 KB (a trial run produced 10,896 and 42,844 bytes).

- [ ] **Step 2: Look at both images**

Open `public/world/monosuko/menu.webp` and `public/world/monosuko/logo.webp` with the Read tool. Expected: six square food photos left to right — grilled chicken pieces, the Combo A plate (grilled chicken leg, rice, sambal; **no text visible**), chicken tauco soup, smashed beef empal on red sambal with cucumber, a dome of white rice, a glass of iced tea; the logo is the round "AYAM BAKAR BANJAR · MONOSUKO · SINCE 1980" badge on a transparent background. If the Combo A tile shows any text, shrink its crop box toward the plate and rerun Step 1.

- [ ] **Step 3: Commit the assets**

```bash
git add public/world/monosuko/menu.webp public/world/monosuko/logo.webp
git commit -F - <<'EOF'
chore(world): POS Monosuko menu sprite and logo badge for the live screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

- [ ] **Step 4: Write the failing model tests**

`src/world/scene/screens/pos/pos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AUTO_PAY_GAP,
  MENU,
  OCCUPIED,
  PAY_SECONDS,
  actPos,
  addItem,
  autoPos,
  busyPos,
  initPos,
  orderCount,
  payOrder,
  portionsLeft,
  selectTable,
  stockBadge,
  subtotal,
  type PosState,
} from "./pos";

const NOW = new Date(2026, 9, 14, 9, 0, 0);
const fresh = (): PosState => initPos(NOW);
const withStock = (stock: (number | null)[]): PosState => ({ ...fresh(), stock });
const addN = (s: PosState, item: number, n: number): PosState => {
  let out = s;
  for (let i = 0; i < n; i++) out = addItem(out, item);
  return out;
};
/** Every portion item exactly at its minimum. */
const atMinimum = () => withStock(MENU.map((m) => (m.stock === null ? null : m.min)));
const step = (s: PosState, t: number): PosState => {
  const next = autoPos(s, t);
  if (!next) throw new Error(`no demo step at t=${t}`);
  return next;
};

describe("POS stock badges", () => {
  it("shows the portions left in green at or above the item's minimum", () => {
    // Grilled Chicken Piece: 12 portions, minimum 5
    expect(stockBadge(fresh(), 0)).toEqual({ tone: "ok", text: "12" });
    expect(stockBadge(addN(fresh(), 0, 7), 0)).toEqual({ tone: "ok", text: "5" });
  });

  it("turns amber 'N left' below the minimum, counting what is already in the order", () => {
    expect(stockBadge(addN(fresh(), 0, 8), 0)).toEqual({ tone: "low", text: "4 left" });
  });

  it("turns red 'Sold out' at zero", () => {
    expect(stockBadge(addN(fresh(), 0, 12), 0)).toEqual({ tone: "out", text: "Sold out" });
  });

  it("has no badge for items without portion stock (rice, iced tea)", () => {
    expect(stockBadge(fresh(), 4)).toBeNull();
    expect(stockBadge(fresh(), 5)).toBeNull();
  });
});

describe("POS order", () => {
  it("adds items as order lines in the order they were first picked", () => {
    const s = addItem(addItem(addItem(fresh(), 3), 0), 3);
    expect(s.lines).toEqual([
      { item: 3, qty: 2 },
      { item: 0, qty: 1 },
    ]);
    expect(orderCount(s)).toBe(3);
    expect(subtotal(s)).toBe(2 * 25000 + 30000);
  });

  it("sold-out cards are not addable and the order never takes more than the stock", () => {
    const s = withStock([1, 6, 0, 9, null, null]);
    expect(addItem(s, 2)).toBe(s);
    const one = addItem(s, 0);
    expect(addItem(one, 0)).toBe(one);
    expect(portionsLeft(one, 0)).toBe(0);
    expect(portionsLeft(one, 4)).toBe(Infinity);
  });

  it("ignores unknown menu items", () => {
    const s = fresh();
    expect(addItem(s, -1)).toBe(s);
    expect(addItem(s, 6)).toBe(s);
    expect(actPos(s, "add", undefined, 0)).toBe(s);
  });

  it("selects a free table and ignores occupied or unknown ones", () => {
    const s = fresh();
    expect(selectTable(s, 5).table).toBe(5);
    expect(actPos(s, "table", 9, 0).table).toBe(9);
    for (const n of OCCUPIED) expect(selectTable(s, n)).toBe(s);
    expect(selectTable(s, 0)).toBe(s);
    expect(selectTable(s, 10)).toBe(s);
  });
});

describe("POS payment", () => {
  it("Pay clears the order, lowers the stock and confirms for PAY_SECONDS", () => {
    const s = addItem(addN(selectTable(fresh(), 5), 0, 2), 4);
    const paid = actPos(s, "pay", undefined, 10);
    expect(paid.lines).toEqual([]);
    expect(paid.stock).toEqual([10, 6, 5, 9, null, null]);
    expect(paid.payment).toEqual({ total: 2 * 30000 + 10000, table: 5, until: 10 + PAY_SECONDS });
    expect(busyPos(paid, 10 + PAY_SECONDS - 0.01)).toBe(true);
    expect(busyPos(paid, 10 + PAY_SECONDS + 0.3)).toBe(false);
  });

  it("does nothing with an empty order", () => {
    const s = fresh();
    expect(payOrder(s, 1)).toBe(s);
  });

  it("ignores input while the confirmation shows", () => {
    const paid = payOrder(addItem(fresh(), 0), 10);
    expect(actPos(paid, "add", 1, 10.5)).toBe(paid);
    expect(actPos(paid, "add", 1, 10 + PAY_SECONDS).lines).toEqual([{ item: 1, qty: 1 }]);
  });

  it("stock never goes negative", () => {
    const sold = payOrder(addN(withStock([2, 6, 5, 9, null, null]), 0, 3), 1);
    expect(sold.stock[0]).toBe(0);
    const forced = payOrder({ ...withStock([2, 6, 5, 9, null, null]), lines: [{ item: 0, qty: 5 }] }, 1);
    expect(forced.stock[0]).toBe(0);
  });

  it("restocks the shift once every portion item is below its minimum", () => {
    const s = [0, 1, 2, 3].reduce((acc, i) => addItem(acc, i), atMinimum());
    expect(payOrder(s, 1).stock).toEqual(MENU.map((m) => m.stock));
  });

  it("does not restock while any portion item is still at or above its minimum", () => {
    const s = [0, 1, 2].reduce((acc, i) => addItem(acc, i), atMinimum());
    expect(payOrder(s, 1).stock).toEqual([4, 2, 3, 4, null, null]);
  });
});

describe("POS idle demo", () => {
  it("adds an item per step and pays once four items are in", () => {
    let s = fresh();
    let t = 0;
    for (let i = 1; i <= 4; i++) {
      s = step(s, t);
      expect(orderCount(s)).toBe(i);
      t = s.next;
    }
    expect(autoPos(s, t - 0.01)).toBeNull();
    const paid = step(s, t);
    expect(paid.lines).toEqual([]);
    expect(paid.payment?.total).toBe(subtotal(s));
    expect(paid.next).toBe(t + AUTO_PAY_GAP);
    expect(autoPos(paid, t + 1)).toBeNull();
  });

  it("is deterministic for a seed and only picks addable items", () => {
    const run = () => {
      let s = withStock([0, 0, 0, 0, null, null]);
      let t = 0;
      for (let i = 0; i < 3; i++) {
        s = step(s, t);
        t = s.next;
      }
      return s.lines;
    };
    expect(run()).toEqual(run());
    for (const line of run()) expect([4, 5]).toContain(line.item);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/screens/pos`
Expected: FAIL — `Error: Failed to resolve import "./pos" from "src/world/scene/screens/pos/pos.test.ts". Does the file exist?`

- [ ] **Step 6: Implement the glossary and the model**

`src/world/scene/screens/pos/strings.ts`:

```ts
/**
 * Every visible string of the POS Monosuko cashier screen (the real app's "Input Order" page), in English
 * (spec §5.2). Sub-project 2E translates the real POS build with this same glossary, so the island screen and the
 * demo read the same. Proper names stay as they are: Ayam Bakar Banjar Monosuko, PB1 (the restaurant tax).
 */
export const POS_STRINGS = {
  brand: ["Ayam Bakar Banjar", "Monosuko"],
  product: "Point of Sale",
  nav: ["Home", "Transactions", "Tables", "History", "Close Register", "Stock"],
  /** Index of the active nav item (Transactions). */
  navActive: 1,
  title: "Input Order",
  shift: "Morning shift",
  search: "Search menu…",
  pills: ["All", "Grilled Chicken", "Value Meals", "Soups & Veg", "Drinks"],
  /** Menu cards in menu order (pos.ts MENU holds the prices and stock). */
  menu: [
    { name: "Grilled Chicken Piece", badge: "Variant" },
    { name: "Combo A (1 pax)", badge: "Combo" },
    { name: "Chicken Tauco Soup" },
    { name: "Smashed Beef Empal" },
    { name: "Steamed Rice" },
    { name: "Iced Tea", badge: "Variant" },
  ] as readonly { name: string; badge?: string }[],
  order: "Order",
  items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
  dineIn: "Dine-in",
  takeaway: "Takeaway",
  chooseTable: "Choose a table",
  emptyTitle: "No items yet",
  emptyLine: "Pick a menu item to start the order.",
  subtotal: "Subtotal",
  taxNote: "10% restaurant tax (PB1) is added at payment.",
  save: "Save",
  pay: "Pay",
  payment: "Payment",
  table: (n: number) => `Table ${n}`,
  left: (n: number) => `${n} left`,
  soldOut: "Sold out",
};
```

`src/world/scene/screens/pos/pos.ts`:

```ts
import { stepRandom } from "../random";
import { POS_STRINGS } from "./strings";

/** A menu item: seed price (rupiah) and portion stock with its low-stock minimum (null stock = not a portion item). */
export interface MenuItem {
  price: number;
  stock: number | null;
  min: number;
}

/** The six cards of the "Input Order" page in menu order, with the POS seed prices (spec §5.2). Names: strings.ts. */
export const MENU: readonly MenuItem[] = [
  { price: 30000, stock: 12, min: 5 }, // Grilled Chicken Piece (Variant)
  { price: 50000, stock: 6, min: 3 }, // Combo A (1 pax) (Combo)
  { price: 35000, stock: 5, min: 4 }, // Chicken Tauco Soup
  { price: 25000, stock: 9, min: 4 }, // Smashed Beef Empal
  { price: 10000, stock: null, min: 0 }, // Steamed Rice
  { price: 8000, stock: null, min: 0 }, // Iced Tea (Variant)
];
export const TABLE_COUNT = 9;
export const OCCUPIED: readonly number[] = [2, 7];
/** Seconds the payment confirmation stays up (input is ignored meanwhile). */
export const PAY_SECONDS = 1.6;
/** Idle demo: seconds between added items, the pause after paying, and the order size it pays at. */
export const AUTO_ADD_GAP = 1.3;
export const AUTO_PAY_GAP = 2.4;
export const AUTO_PAY_AT = 4;
export const POS_LOGICAL = { w: 640, h: 400 } as const;

export interface PosLine {
  item: number;
  qty: number;
}

export interface PosPayment {
  total: number;
  table: number;
  /** The confirmation shows while t < until. */
  until: number;
}

export interface PosState {
  /** Portions left per menu item (null = not a portion item). */
  stock: readonly (number | null)[];
  /** The open order, in the order items were first added. */
  lines: readonly PosLine[];
  table: number;
  payment: PosPayment | null;
  /** Clock time of the next idle-demo step. */
  next: number;
  /** Seed of the demo's picks (stepRandom). */
  seed: number;
}

export type StockBadge = { tone: "ok" | "low" | "out"; text: string } | null;

export function initPos(now: Date): PosState {
  return {
    stock: MENU.map((m) => m.stock),
    lines: [],
    table: 4,
    payment: null,
    next: 0,
    seed: Math.floor(now.getTime() / 1000) >>> 0,
  };
}

export function qtyOf(s: PosState, item: number): number {
  return s.lines.find((l) => l.item === item)?.qty ?? 0;
}

/** Portions still free to order: stock minus what the open order already holds (Infinity for non-portion items). */
export function portionsLeft(s: PosState, item: number): number {
  const stock = s.stock[item];
  return stock === null ? Infinity : Math.max(0, stock - qtyOf(s, item));
}

/** The card's stock badge: green count, amber "N left" below the minimum, red "Sold out"; null without portion stock. */
export function stockBadge(s: PosState, item: number): StockBadge {
  if (s.stock[item] === null) return null;
  const left = portionsLeft(s, item);
  if (left <= 0) return { tone: "out", text: POS_STRINGS.soldOut };
  return left < MENU[item].min ? { tone: "low", text: POS_STRINGS.left(left) } : { tone: "ok", text: String(left) };
}

export function addItem(s: PosState, item: number): PosState {
  if (!Number.isInteger(item) || item < 0 || item >= MENU.length || portionsLeft(s, item) <= 0) return s;
  const has = s.lines.some((l) => l.item === item);
  const lines = has
    ? s.lines.map((l) => (l.item === item ? { item, qty: l.qty + 1 } : l))
    : [...s.lines, { item, qty: 1 }];
  return { ...s, lines };
}

export function selectTable(s: PosState, n: number): PosState {
  if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT || OCCUPIED.includes(n) || n === s.table) return s;
  return { ...s, table: n };
}

export function orderCount(s: PosState): number {
  return s.lines.reduce((a, l) => a + l.qty, 0);
}

export function subtotal(s: PosState): number {
  return s.lines.reduce((a, l) => a + MENU[l.item].price * l.qty, 0);
}

/** Commits the order: stock drops (never below 0), the order clears, the confirmation shows for PAY_SECONDS. */
export function payOrder(s: PosState, t: number): PosState {
  if (s.lines.length === 0) return s;
  const sold = s.stock.map((v, i) => (v === null ? null : Math.max(0, v - qtyOf(s, i))));
  // the shift restocks once every portion item is below its minimum, so the demo never runs dry
  const allLow = MENU.every((m, i) => {
    const v = sold[i];
    return v === null || v < m.min;
  });
  return {
    ...s,
    stock: allLow ? MENU.map((m) => m.stock) : sold,
    lines: [],
    payment: { total: subtotal(s), table: s.table, until: t + PAY_SECONDS },
  };
}

export function paying(s: PosState, t: number): boolean {
  return s.payment !== null && t < s.payment.until;
}

/** Visitor taps: "add" (arg = menu index), "table" (arg = table number), "pay". Ignored while the confirmation shows. */
export function actPos(s: PosState, action: string, arg: number | undefined, t: number): PosState {
  if (paying(s, t)) return s;
  if (action === "add" && arg !== undefined) return addItem(s, arg);
  if (action === "table" && arg !== undefined) return selectTable(s, arg);
  if (action === "pay") return payOrder(s, t);
  return s;
}

/** Idle demo: a random addable item every AUTO_ADD_GAP s, Pay once the order holds AUTO_PAY_AT items. */
export function autoPos(s: PosState, t: number): PosState | null {
  if (t < s.next || paying(s, t)) return null;
  if (orderCount(s) >= AUTO_PAY_AT) return { ...payOrder(s, t), next: t + AUTO_PAY_GAP };
  const open = MENU.map((_, i) => i).filter((i) => portionsLeft(s, i) > 0);
  if (open.length === 0) return s.lines.length > 0 ? { ...payOrder(s, t), next: t + AUTO_PAY_GAP } : null;
  const r = stepRandom(s.seed);
  return { ...addItem(s, open[Math.floor(r.value * open.length)]), seed: r.seed, next: t + AUTO_ADD_GAP };
}

/** Animating while the confirmation shows, plus a moment after so it is drawn away. */
export function busyPos(s: PosState, t: number): boolean {
  return s.payment !== null && t < s.payment.until + 0.2;
}
```

- [ ] **Step 7: Run the model tests to verify they pass**

Run: `npx vitest run src/world/scene/screens/pos`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  16 passed (16)`.

- [ ] **Step 8: Write the draw-test helper and the failing draw test**

`src/world/scene/screens/testing/fakeCtx.ts`:

```ts
/**
 * A 2D-context stand-in for draw tests (Vitest runs in node: no canvas). Methods do nothing, properties keep what is
 * set, and text measures 5 units per character, so layout code runs and draws return their hit regions.
 */
export function fakeCtx(): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = {
    font: "10px sans-serif",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    lineWidth: 1,
  };
  const noop = () => undefined;
  const measureText = (s: string) => ({ width: s.length * 5 });
  return new Proxy(state, {
    get: (target, key) => (key === "measureText" ? measureText : key in target ? target[key] : noop),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

/** `Image` stand-in for node: it never loads, so screens draw their placeholders. vi.stubGlobal("Image", FakeImage). */
export class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  decoding = "";
}
```

`src/world/scene/screens/pos/posDraw.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { FakeImage, fakeCtx } from "../testing/fakeCtx";
import { addItem, initPos, payOrder } from "./pos";
import { posApp } from "./index";

vi.stubGlobal("Image", FakeImage);

const NOW = new Date(2026, 9, 14, 9, 0, 0);

describe("posApp", () => {
  it("is a 640 × 400 landscape screen", () => {
    expect(posApp.logical).toEqual({ w: 640, h: 400 });
  });

  it("draws a region per menu card, per table and for Pay, all inside the screen", () => {
    const regions = posApp.draw(fakeCtx(), initPos(NOW), 0);
    expect(regions.filter((r) => r.action === "add").map((r) => r.arg)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(regions.filter((r) => r.action === "table").map((r) => r.arg)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(regions.filter((r) => r.action === "pay")).toHaveLength(1);
    for (const r of regions) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(640);
      expect(r.y + r.h).toBeLessThanOrEqual(400);
    }
  });

  it("draws an open order and the payment confirmation without throwing", () => {
    const order = addItem(addItem(initPos(NOW), 0), 5);
    expect(() => posApp.draw(fakeCtx(), order, 1)).not.toThrow();
    expect(() => posApp.draw(fakeCtx(), payOrder(order, 1), 1.5)).not.toThrow();
  });

  it("a tap on a drawn card adds that item", () => {
    const s0 = initPos(NOW);
    const card = posApp.draw(fakeCtx(), s0, 0).find((r) => r.action === "add" && r.arg === 3);
    if (!card) throw new Error("no card region for item 3");
    expect(posApp.act(s0, card.action, card.arg, 0).lines).toEqual([{ item: 3, qty: 1 }]);
  });
});
```

Run: `npx vitest run src/world/scene/screens/pos/posDraw.test.ts`
Expected: FAIL — `Error: Failed to resolve import "./index" from "src/world/scene/screens/pos/posDraw.test.ts". Does the file exist?`

- [ ] **Step 9: Implement the draw and the app**

`src/world/scene/screens/pos/posDraw.ts`:

```ts
import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { formatRupiah, roundRect, wrapText } from "../format";
import { loadScreenImage } from "../images";
import type { ScreenImage } from "../images";
import type { HitRegion } from "../types";
import { MENU, OCCUPIED, POS_LOGICAL, TABLE_COUNT, orderCount, paying, stockBadge, subtotal } from "./pos";
import type { PosState } from "./pos";
import { POS_STRINGS as S } from "./strings";

/** The restaurant's own pictures: the menu sprite (one 200 × 200 tile per item, in menu order) and its logo badge. */
export const POS_IMAGES = { menu: "/world/monosuko/menu.webp", logo: "/world/monosuko/logo.webp" } as const;
const TILE = 200;

/** The real app's light theme (spec §5.2). */
const C = {
  green: "#1f7a4d",
  price: "#1a623e",
  tint: "#f0faf3",
  tint2: "#ddf3e5",
  ink: "#1a201c",
  ink2: "#5a655e",
  ink3: "#6c756f",
  line: "#e8ece9",
  page: "#f4f4f3",
  white: "#ffffff",
  amberBg: "#fef3c7",
  amber: "#92400e",
  amberDot: "#d97706",
  payOff: "#87d0a5",
};
const BADGE: Record<"ok" | "low" | "out", readonly [string, string]> = {
  ok: ["#dcfce7", "#166534"],
  low: [C.amberBg, C.amber],
  out: ["#fee2e2", "#991b1b"],
};
/** Inter as in the app; the site's self-hosted grotesk where Inter isn't installed. */
const font = (weight: number, size: number) => `${weight} ${size}px Inter, ${CANVAS_FONTS.ui}`;
const TAU = Math.PI * 2;
const SIDEBAR = 118;
/** Left edge of the order panel. */
const PANEL = 420;
const CARD = { x: 130, y: 90, w: 89.3, h: 151, gap: 6 };
/** The app's 12 px card and 6 px button radii, at this screen's half scale. */
const RADIUS = { card: 6, button: 3 };

/** The "Input Order" page (sketch part-mono.js monoLive.draw, in English). */
export function drawPos(g: CanvasRenderingContext2D, s: PosState, t: number): HitRegion[] {
  const hits: HitRegion[] = [];
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.lineWidth = 1;
  g.globalAlpha = 1;
  g.fillStyle = C.page;
  g.fillRect(0, 0, POS_LOGICAL.w, POS_LOGICAL.h);
  sidebar(g, loadScreenImage(POS_IMAGES.logo));
  header(g);
  menuGrid(g, s, loadScreenImage(POS_IMAGES.menu), hits);
  orderPanel(g, s, hits);
  if (s.payment && paying(s, t)) confirmation(g, s.payment.table, s.payment.total);
  return hits;
}

function sidebar(g: CanvasRenderingContext2D, logo: ScreenImage) {
  const h = POS_LOGICAL.h;
  g.fillStyle = C.white;
  g.fillRect(0, 0, SIDEBAR, h);
  g.fillStyle = C.line;
  g.fillRect(SIDEBAR, 0, 1, h);
  // the restaurant's round badge on a white tile
  g.save();
  roundRect(g, 10, 10, 28, 28, 5);
  g.clip();
  g.fillStyle = C.white;
  g.fillRect(10, 10, 28, 28);
  if (logo.ready) g.drawImage(logo.img, 10, 10, 28, 28);
  g.restore();
  g.strokeStyle = C.line;
  roundRect(g, 10, 10, 28, 28, 5);
  g.stroke();
  g.fillStyle = C.ink;
  g.font = font(700, 7.8);
  g.fillText(S.brand[0], 43, 21);
  g.fillText(S.brand[1], 43, 31);
  g.fillStyle = C.ink3;
  g.font = font(400, 7);
  g.fillText(S.product, 43, 40);
  S.nav.forEach((label, i) => {
    const y = 58 + i * 22;
    const on = i === S.navActive;
    if (on) {
      g.fillStyle = C.tint;
      roundRect(g, 8, y, 102, 18, 4);
      g.fill();
      g.fillStyle = C.green;
      g.fillRect(8, y + 3, 2.2, 12);
    }
    g.fillStyle = on ? C.price : C.ink2;
    g.font = font(on ? 600 : 500, 8.6);
    g.fillText(label, 18, y + 12);
  });
}

function header(g: CanvasRenderingContext2D) {
  g.fillStyle = C.white;
  g.fillRect(SIDEBAR + 1, 0, PANEL - SIDEBAR - 1, 36);
  g.fillStyle = C.line;
  g.fillRect(SIDEBAR + 1, 36, PANEL - SIDEBAR - 1, 1);
  g.fillStyle = C.ink;
  g.font = font(700, 13);
  g.fillText(S.title, 130, 19);
  g.fillStyle = C.ink3;
  g.font = font(400, 7.5);
  g.fillText(S.shift, 130, 30);
  // search field, then the category pills with "All" selected
  g.fillStyle = C.white;
  roundRect(g, 130, 44, 280, 17, 5);
  g.fill();
  g.strokeStyle = C.line;
  g.stroke();
  g.fillStyle = C.ink3;
  g.font = font(400, 8);
  g.fillText(S.search, 140, 55.5);
  g.fillStyle = C.line;
  roundRect(g, 130, 66, 280, 17, 6);
  g.fill();
  let x = 133;
  g.font = font(600, 7.4);
  S.pills.forEach((label, i) => {
    const w = g.measureText(label).width + 12;
    if (i === 0) {
      g.fillStyle = C.white;
      roundRect(g, x, 68.5, w, 12, 5);
      g.fill();
    }
    g.fillStyle = i === 0 ? C.ink : C.ink2;
    g.fillText(label, x + 6, 77.3);
    x += w + 3;
  });
}

function menuGrid(g: CanvasRenderingContext2D, s: PosState, sprite: ScreenImage, hits: HitRegion[]) {
  const pw = CARD.w - 8;
  const ph = 80;
  // centre crop of the square tile to the photo box's aspect
  const aspect = pw / ph;
  const sw = aspect >= 1 ? TILE : TILE * aspect;
  const sh = aspect >= 1 ? TILE / aspect : TILE;
  MENU.forEach((item, i) => {
    const cx = CARD.x + (i % 3) * (CARD.w + CARD.gap);
    const cy = CARD.y + Math.floor(i / 3) * (CARD.h + CARD.gap);
    const badge = stockBadge(s, i);
    g.globalAlpha = badge?.tone === "out" ? 0.6 : 1;
    g.fillStyle = C.white;
    roundRect(g, cx, cy, CARD.w, CARD.h, RADIUS.card);
    g.fill();
    g.strokeStyle = "rgba(232,236,233,.9)";
    g.stroke();
    g.save();
    roundRect(g, cx + 4, cy + 4, pw, ph, 4);
    g.clip();
    if (sprite.ready) g.drawImage(sprite.img, i * TILE + (TILE - sw) / 2, (TILE - sh) / 2, sw, sh, cx + 4, cy + 4, pw, ph);
    else {
      g.fillStyle = C.line;
      g.fillRect(cx + 4, cy + 4, pw, ph);
    }
    g.restore();
    if (badge) {
      const [bg, fg] = BADGE[badge.tone];
      g.font = font(700, 7);
      const bw = g.measureText(badge.text).width + 9;
      g.fillStyle = bg;
      roundRect(g, cx + CARD.w - 8 - bw, cy + 8, bw, 12, 6);
      g.fill();
      g.fillStyle = fg;
      g.fillText(badge.text, cx + CARD.w - 8 - bw + 4.5, cy + 16.5);
    }
    const text = S.menu[i];
    g.fillStyle = C.ink;
    g.font = font(600, 8.6);
    wrapText(g, text.name, CARD.w - 12)
      .slice(0, 2)
      .forEach((row, k) => g.fillText(row, cx + 6, cy + 98 + k * 11));
    if (text.badge) {
      g.font = font(600, 6.6);
      const bw = g.measureText(text.badge).width + 8;
      g.fillStyle = C.tint;
      roundRect(g, cx + 6, cy + 118, bw, 11, 5);
      g.fill();
      g.fillStyle = C.price;
      g.fillText(text.badge, cx + 10, cy + 126);
    }
    g.fillStyle = C.price;
    g.font = font(700, 9.4);
    g.fillText(formatRupiah(item.price), cx + 6, cy + 143);
    g.globalAlpha = 1;
    hits.push({ x: cx, y: cy, w: CARD.w, h: CARD.h, action: "add", arg: i });
  });
}

function orderPanel(g: CanvasRenderingContext2D, s: PosState, hits: HitRegion[]) {
  const x0 = PANEL;
  const h = POS_LOGICAL.h;
  const count = orderCount(s);
  g.fillStyle = C.white;
  g.fillRect(x0, 0, POS_LOGICAL.w - x0, h);
  g.fillStyle = C.line;
  g.fillRect(x0, 0, 1, h);
  // "Order" with its item-count pill
  g.fillStyle = C.ink;
  g.font = font(700, 11);
  g.fillText(S.order, x0 + 12, 20);
  const titleW = g.measureText(S.order).width;
  g.font = font(600, 7);
  const items = S.items(count);
  const iw = g.measureText(items).width + 10;
  g.fillStyle = C.tint2;
  roundRect(g, x0 + 20 + titleW, 11, iw, 12, 6);
  g.fill();
  g.fillStyle = C.price;
  g.fillText(items, x0 + 25 + titleW, 19.5);
  // Dine-in / Takeaway, Dine-in selected
  g.fillStyle = C.line;
  roundRect(g, x0 + 12, 30, 196, 18, 6);
  g.fill();
  g.fillStyle = C.white;
  roundRect(g, x0 + 14, 32, 96, 14, 5);
  g.fill();
  g.font = font(600, 7.8);
  g.textAlign = "center";
  g.fillStyle = C.ink;
  g.fillText(S.dineIn, x0 + 62, 42);
  g.fillStyle = C.ink2;
  g.fillText(S.takeaway, x0 + 159, 42);
  g.textAlign = "left";
  // tables 1–9: selected green, occupied amber with a dot
  g.fillStyle = C.ink2;
  g.font = font(600, 7.6);
  g.fillText(S.chooseTable, x0 + 12, 62);
  for (let n = 1; n <= TABLE_COUNT; n++) {
    const tx = x0 + 12 + ((n - 1) % 5) * 40;
    const ty = 67 + Math.floor((n - 1) / 5) * 22;
    const selected = n === s.table;
    const occupied = OCCUPIED.includes(n);
    g.fillStyle = selected ? C.green : occupied ? C.amberBg : C.page;
    roundRect(g, tx, ty, 36, 18, 5);
    g.fill();
    g.fillStyle = selected ? C.white : occupied ? C.amber : C.ink2;
    g.font = font(700, 8.4);
    g.textAlign = "center";
    g.fillText(String(n), tx + 18, ty + 12.5);
    g.textAlign = "left";
    if (occupied) {
      g.fillStyle = C.amberDot;
      g.beginPath();
      g.arc(tx + 30, ty + 5, 2, 0, TAU);
      g.fill();
    }
    hits.push({ x: tx, y: ty, w: 36, h: 18, action: "table", arg: n });
  }
  g.fillStyle = C.line;
  g.fillRect(x0 + 12, 117, 196, 1);
  if (count === 0) {
    g.textAlign = "center";
    g.fillStyle = C.ink2;
    g.font = font(600, 9);
    g.fillText(S.emptyTitle, x0 + 110, 200);
    g.fillStyle = C.ink3;
    g.font = font(400, 7.4);
    g.fillText(S.emptyLine, x0 + 110, 213);
    g.textAlign = "left";
  } else {
    let y = 126;
    for (const line of s.lines) {
      const price = MENU[line.item].price;
      g.fillStyle = C.ink;
      g.font = font(600, 8.6);
      g.fillText(S.menu[line.item].name, x0 + 12, y + 10);
      g.fillStyle = C.ink3;
      g.font = font(400, 7.4);
      g.fillText(`${formatRupiah(price)} × ${line.qty}`, x0 + 12, y + 22);
      g.fillStyle = C.ink;
      g.font = font(700, 8.6);
      g.textAlign = "right";
      g.fillText(formatRupiah(price * line.qty), x0 + 208, y + 10);
      g.textAlign = "left";
      y += 32;
      if (y > 300) break;
    }
  }
  // subtotal, the tax note, Save and Pay
  g.fillStyle = C.line;
  g.fillRect(x0, 318, POS_LOGICAL.w - x0, 1);
  g.fillStyle = C.ink2;
  g.font = font(500, 8.4);
  g.fillText(S.subtotal, x0 + 12, 336);
  g.fillStyle = C.ink;
  g.font = font(700, 10);
  g.textAlign = "right";
  g.fillText(formatRupiah(subtotal(s)), x0 + 208, 336);
  g.textAlign = "left";
  g.fillStyle = C.ink3;
  g.font = font(400, 6.8);
  g.fillText(S.taxNote, x0 + 12, 349);
  g.fillStyle = C.white;
  roundRect(g, x0 + 12, 360, 70, 26, RADIUS.button);
  g.fill();
  g.strokeStyle = C.line;
  g.stroke();
  g.font = font(600, 8.6);
  g.textAlign = "center";
  g.fillStyle = C.ink;
  g.fillText(S.save, x0 + 47, 376.5);
  g.fillStyle = count > 0 ? C.green : C.payOff;
  roundRect(g, x0 + 88, 360, 120, 26, RADIUS.button);
  g.fill();
  g.fillStyle = C.white;
  g.fillText(S.pay, x0 + 148, 376.5);
  g.textAlign = "left";
  hits.push({ x: x0 + 88, y: 360, w: 120, h: 26, action: "pay" });
}

/** "Payment / Table N / total / ✓" over a dimmed page. */
function confirmation(g: CanvasRenderingContext2D, table: number, total: number) {
  g.fillStyle = "rgba(26,32,28,.35)";
  g.fillRect(0, 0, POS_LOGICAL.w, POS_LOGICAL.h);
  g.fillStyle = C.white;
  roundRect(g, 220, 130, 200, 120, 10);
  g.fill();
  g.textAlign = "center";
  g.fillStyle = C.ink;
  g.font = font(700, 12);
  g.fillText(S.payment, 320, 158);
  g.fillStyle = C.ink3;
  g.font = font(400, 8);
  g.fillText(S.table(table), 320, 172);
  g.fillStyle = C.price;
  g.font = font(700, 17);
  g.fillText(formatRupiah(total), 320, 200);
  g.textAlign = "left";
  g.fillStyle = C.green;
  g.beginPath();
  g.arc(320, 226, 10, 0, TAU);
  g.fill();
  g.strokeStyle = C.white;
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(315, 226);
  g.lineTo(319, 230);
  g.lineTo(326, 222);
  g.stroke();
  g.lineWidth = 1;
}
```

`src/world/scene/screens/pos/index.ts`:

```ts
import type { ScreenApp } from "../types";
import { POS_LOGICAL, actPos, autoPos, busyPos, initPos } from "./pos";
import type { PosState } from "./pos";
import { drawPos } from "./posDraw";

export type { PosState } from "./pos";

/** The POS Monosuko cashier screen ("Input Order"), for a LiveScreen (landscape, 640 × 400). */
export const posApp: ScreenApp<PosState> = {
  logical: POS_LOGICAL,
  init: initPos,
  act: actPos,
  auto: autoPos,
  busy: busyPos,
  draw: drawPos,
};
```

- [ ] **Step 10: Run the POS tests, type-check and lint**

Run: `npx vitest run src/world/scene/screens/pos && npx tsc -b && npx eslint src/world/scene/screens`
Expected: Vitest `Test Files  2 passed (2)`; `tsc` and `eslint` print nothing.

- [ ] **Step 11: Commit**

```bash
git add src/world/scene/screens/pos/strings.ts src/world/scene/screens/pos/pos.ts src/world/scene/screens/pos/pos.test.ts src/world/scene/screens/pos/posDraw.ts src/world/scene/screens/pos/posDraw.test.ts src/world/scene/screens/pos/index.ts src/world/scene/screens/testing/fakeCtx.ts
git commit -F - <<'EOF'
feat(world): POS Monosuko live screen app (English glossary, stock badges, payment, idle demo)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task B5: Bee Furniture CRM app (strings, model, draw)

**Files:**
- Create: `src/world/scene/screens/crm/strings.ts`, `src/world/scene/screens/crm/crm.ts`, `src/world/scene/screens/crm/crm.test.ts`
- Create: `src/world/scene/screens/crm/crmDraw.ts`, `src/world/scene/screens/crm/crmDraw.test.ts`, `src/world/scene/screens/crm/index.ts`

**Interfaces:**
- Consumes: B1 (`ScreenApp`, `HitRegion`, `formatRupiah`, `roundRect`, `wrapText`, `stepRandom`); `fakeCtx` (B4, tests only); `CANVAS_FONTS`.
- Produces: `crmApp: ScreenApp<CrmState>` and everything listed for `crm/` in Contract additions.

**Behaviour (spec §5.3, sketch `part-bee.js`):** the real `DashboardHome` with its seed data (example data, marked as such in code): KPI cards Total Revenue Rp 4,781,000 · Total Customers 3 · Total Transactions 6 · Active Promotions 2; a 7-day "Sales Trend (Last 7 Days)" built from the seed product prices; "Upcoming Tasks" with three tasks. Tap the chart card to record a sale of one seed product (seeded pick): revenue, transactions and today's point rise by its price, the two KPIs flash green and the point pulses for 1.2 s. When a sale would take today's total past Rp 3,600,000 the series moves on a day first (the oldest day drops off and the new day starts with that sale). Tap a task to toggle Pending ↔ Completed. Dates (`YYYY-MM-DD` axis, `Due: Mon DD, YYYY`) come from the injected `now`, in local time. Idle demo: a sale every 3.2 s.

- [ ] **Step 1: Write the failing model tests**

`src/world/scene/screens/crm/crm.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DAY_CAP,
  PRODUCT_PRICES,
  PULSE_SECONDS,
  SALE_GAP,
  SEED_DAYS,
  actCrm,
  autoCrm,
  busyCrm,
  chartMax,
  dayLabel,
  dueLabel,
  initCrm,
  recordSale,
  toggleTask,
} from "./crm";

const NOW = new Date(2026, 9, 14, 10, 30, 0); // 14 Oct 2026, local time

describe("CRM seed state", () => {
  it("starts at the seed KPIs, the example series and three tasks", () => {
    const s = initCrm(NOW);
    expect([s.revenue, s.customers, s.transactions, s.promos]).toEqual([4781000, 3, 6, 2]);
    expect(s.days).toEqual(SEED_DAYS);
    expect(s.tasks.map((task) => task.done)).toEqual([false, false, true]);
    expect(busyCrm(s, 0)).toBe(false);
  });
});

describe("CRM sales", () => {
  it("a sale raises revenue, transactions and today's point by one product price, and pulses", () => {
    const s0 = initCrm(NOW);
    const s1 = actCrm(s0, "sale", undefined, 5);
    const price = s1.revenue - s0.revenue;
    expect(PRODUCT_PRICES).toContain(price);
    expect(s1.transactions).toBe(s0.transactions + 1);
    expect(s1.days[6]).toBe(s0.days[6] + price);
    expect(s1.days.slice(0, 6)).toEqual(s0.days.slice(0, 6));
    expect(s1.customers).toBe(s0.customers);
    expect(s1.promos).toBe(s0.promos);
    expect(busyCrm(s1, 5 + PULSE_SECONDS - 0.01)).toBe(true);
    expect(busyCrm(s1, 5 + PULSE_SECONDS)).toBe(false);
  });

  it("moves the series on a day when a sale would pass the cap; the new day starts with that sale", () => {
    const s0 = { ...initCrm(NOW), days: [1, 2, 3, 4, 5, 6, DAY_CAP - 100] };
    const s1 = recordSale(s0, 1);
    const price = s1.revenue - s0.revenue;
    expect(s1.days).toEqual([2, 3, 4, 5, 6, DAY_CAP - 100, price]);
  });

  it("picks the product deterministically from the seed", () => {
    expect(recordSale(initCrm(NOW), 1)).toEqual(recordSale(initCrm(NOW), 1));
  });

  it("the idle demo records a sale every SALE_GAP seconds", () => {
    const s0 = initCrm(NOW);
    const s1 = autoCrm(s0, 0);
    if (!s1) throw new Error("no demo step");
    expect(s1.transactions).toBe(s0.transactions + 1);
    expect(s1.next).toBe(SALE_GAP);
    expect(autoCrm(s1, SALE_GAP - 0.01)).toBeNull();
    expect(autoCrm(s1, SALE_GAP)?.transactions).toBe(s0.transactions + 2);
  });

  it("the chart's top grows in Rp 500,000 steps and is at least Rp 1,500,000", () => {
    expect(chartMax(SEED_DAYS)).toBe(1500000);
    expect(chartMax([0, 0, 0, 0, 0, 0, 3600000])).toBe(4000000);
  });
});

describe("CRM tasks", () => {
  it("a tap toggles a task between Pending and Completed", () => {
    const s0 = initCrm(NOW);
    const s1 = actCrm(s0, "task", 0, 1);
    expect(s1.tasks[0].done).toBe(true);
    expect(toggleTask(s1, 0).tasks[0].done).toBe(false);
    expect(s1.tasks.slice(1)).toEqual(s0.tasks.slice(1));
  });

  it("ignores unknown task indices", () => {
    const s = initCrm(NOW);
    expect(toggleTask(s, 3)).toBe(s);
    expect(actCrm(s, "task", undefined, 1)).toBe(s);
  });
});

describe("CRM dates from the injected now", () => {
  it("labels the seven days YYYY-MM-DD, ending today", () => {
    const s = initCrm(NOW);
    expect(dayLabel(s, 6)).toBe("2026-10-14");
    expect(dayLabel(s, 0)).toBe("2026-10-08");
  });

  it("crosses month boundaries", () => {
    expect(dayLabel(initCrm(new Date(2026, 2, 2, 9)), 0)).toBe("2026-02-24");
  });

  it("writes due dates as 'Mon DD, YYYY' relative to today", () => {
    const s = initCrm(NOW);
    expect(s.tasks.map((task) => dueLabel(s, task))).toEqual(["Oct 14, 2026", "Oct 16, 2026", "Oct 07, 2026"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/screens/crm`
Expected: FAIL — `Error: Failed to resolve import "./crm" from "src/world/scene/screens/crm/crm.test.ts". Does the file exist?`

- [ ] **Step 3: Implement the glossary and the model**

`src/world/scene/screens/crm/strings.ts`:

```ts
/**
 * Every visible string of the Bee Furniture CRM dashboard (the real app's DashboardHome), in English as in the app
 * (spec §5.3). Sub-project 2E reuses this glossary for the demo build.
 */
export const CRM_STRINGS = {
  brand: ["Bee Furniture", "Admin"],
  logoEmoji: "🐝",
  nav: ["Dashboard", "Customers", "Products", "Transactions", "Promo", "Analytics", "Task To Do", "Tickets", "About"],
  header: "Dashboard",
  addNew: "+ Add New",
  logout: "Logout",
  avatar: "JD",
  title: "Main Dashboard",
  subtitle: "Monitor your business performance in real-time.",
  kpis: ["Total Revenue", "Total Customers", "Total Transactions", "Active Promotions"],
  chartTitle: "Sales Trend (Last 7 Days)",
  legend: "Daily Revenue (Rp)",
  tasksTitle: "Upcoming Tasks",
  viewAll: "View All",
  /** Task texts in task order (crm.ts SEED_TASKS holds due offsets and status). */
  tasks: ["Prepare the monthly report", "Check ergonomic chair stock", "Follow up with customer Budi"],
  due: (date: string) => `Due: ${date}`,
  pending: "Pending",
  completed: "Completed",
};
```

`src/world/scene/screens/crm/crm.ts`:

```ts
import { stepRandom } from "../random";

/*
 * EXAMPLE DATA, not real figures. The KPI seeds are the CRM's seed-database values as its dashboard shows them; the
 * 7-day series is made of the seed products' prices (Rp 1,250,000 / 950,000 / 175,000).
 */
export const SEED_KPIS = { revenue: 4781000, customers: 3, transactions: 6, promos: 2 } as const;
export const PRODUCT_PRICES: readonly number[] = [1250000, 950000, 175000];
/** Oldest first; index 6 is today. */
export const SEED_DAYS: readonly number[] = [175000, 0, 950000, 1250000, 0, 1425000, 175000];
/** A sale that would take today's total past this moves the series on a day first. */
export const DAY_CAP = 3600000;
/** Idle demo: seconds between sales. */
export const SALE_GAP = 3.2;
/** Seconds the new point pulses and the raised KPIs show green. */
export const PULSE_SECONDS = 1.2;
export const CRM_LOGICAL = { w: 640, h: 400 } as const;

export interface CrmTask {
  /** Days from today (negative = past). */
  due: number;
  done: boolean;
}

export const SEED_TASKS: readonly CrmTask[] = [
  { due: 0, done: false }, // Prepare the monthly report: due today, pending
  { due: 2, done: false }, // Check ergonomic chair stock: due in 2 days, pending
  { due: -7, done: true }, // Follow up with customer Budi: last week, completed
];

export interface CrmState {
  /** Local date of `now` at init (m is 0-based, as Date uses it). */
  today: { y: number; m: number; d: number };
  revenue: number;
  customers: number;
  transactions: number;
  promos: number;
  /** Seven daily totals, oldest first; index 6 is today. */
  days: readonly number[];
  tasks: readonly CrmTask[];
  /** Clock time of the latest sale (-Infinity before the first). */
  pulse: number;
  /** Clock time of the next idle-demo sale. */
  next: number;
  /** Seed of the product picks (stepRandom). */
  seed: number;
}

export function initCrm(now: Date): CrmState {
  return {
    today: { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() },
    revenue: SEED_KPIS.revenue,
    customers: SEED_KPIS.customers,
    transactions: SEED_KPIS.transactions,
    promos: SEED_KPIS.promos,
    days: [...SEED_DAYS],
    tasks: SEED_TASKS.map((task) => ({ ...task })),
    pulse: -Infinity,
    next: 0,
    seed: Math.floor(now.getTime() / 1000) >>> 0,
  };
}

/** A sale of one seed product: revenue, transactions and today's point rise by its price, and the point pulses. */
export function recordSale(s: CrmState, t: number): CrmState {
  const r = stepRandom(s.seed);
  const price = PRODUCT_PRICES[Math.floor(r.value * PRODUCT_PRICES.length)];
  const today = s.days[6];
  const days = today + price > DAY_CAP ? [...s.days.slice(1), price] : [...s.days.slice(0, 6), today + price];
  return { ...s, revenue: s.revenue + price, transactions: s.transactions + 1, days, pulse: t, seed: r.seed };
}

export function toggleTask(s: CrmState, i: number): CrmState {
  if (!Number.isInteger(i) || i < 0 || i >= s.tasks.length) return s;
  return { ...s, tasks: s.tasks.map((task, k) => (k === i ? { ...task, done: !task.done } : task)) };
}

/** Visitor taps: "sale" (the chart card), "task" (arg = task index). */
export function actCrm(s: CrmState, action: string, arg: number | undefined, t: number): CrmState {
  if (action === "sale") return recordSale(s, t);
  if (action === "task" && arg !== undefined) return toggleTask(s, arg);
  return s;
}

export function autoCrm(s: CrmState, t: number): CrmState | null {
  if (t < s.next) return null;
  return { ...recordSale(s, t), next: t + SALE_GAP };
}

export function busyCrm(s: CrmState, t: number): boolean {
  return t < s.pulse + PULSE_SECONDS;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const dateAt = (s: CrmState, offset: number) => new Date(s.today.y, s.today.m, s.today.d + offset);

/** The chart's date under point `index` (6 = today): "YYYY-MM-DD", local calendar. */
export function dayLabel(s: CrmState, index: number): string {
  const d = dateAt(s, index - 6);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** A task's due date as the app writes it: "Oct 14, 2026". */
export function dueLabel(s: CrmState, task: CrmTask): string {
  const d = dateAt(s, task.due);
  return `${MONTHS[d.getMonth()]} ${pad2(d.getDate())}, ${d.getFullYear()}`;
}

/** Top of the chart's axis: at least Rp 1,500,000, in Rp 500,000 steps. */
export function chartMax(days: readonly number[]): number {
  return Math.max(1500000, Math.ceil(Math.max(...days) / 500000) * 500000);
}
```

- [ ] **Step 4: Run the model tests to verify they pass**

Run: `npx vitest run src/world/scene/screens/crm`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  11 passed (11)`.

- [ ] **Step 5: Write the failing draw test**

`src/world/scene/screens/crm/crmDraw.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fakeCtx } from "../testing/fakeCtx";
import { initCrm, recordSale, toggleTask } from "./crm";
import { crmApp } from "./index";

const NOW = new Date(2026, 9, 14, 10, 30, 0);

describe("crmApp", () => {
  it("is a 640 × 400 landscape screen", () => {
    expect(crmApp.logical).toEqual({ w: 640, h: 400 });
  });

  it("draws the chart card as the sale region and one region per task, all inside the screen", () => {
    const regions = crmApp.draw(fakeCtx(), initCrm(NOW), 0);
    expect(regions.filter((r) => r.action === "sale")).toHaveLength(1);
    expect(regions.filter((r) => r.action === "task").map((r) => r.arg)).toEqual([0, 1, 2]);
    for (const r of regions) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(640);
      expect(r.y + r.h).toBeLessThanOrEqual(400);
    }
  });

  it("draws the pulse after a sale and a toggled task without throwing", () => {
    const s = toggleTask(recordSale(initCrm(NOW), 2), 1);
    expect(() => crmApp.draw(fakeCtx(), s, 2.5)).not.toThrow();
  });
});
```

Run: `npx vitest run src/world/scene/screens/crm/crmDraw.test.ts`
Expected: FAIL — `Error: Failed to resolve import "./index" from "src/world/scene/screens/crm/crmDraw.test.ts". Does the file exist?`

- [ ] **Step 6: Implement the draw and the app**

`src/world/scene/screens/crm/crmDraw.ts`:

```ts
import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { formatRupiah, roundRect, wrapText } from "../format";
import type { HitRegion } from "../types";
import { CRM_LOGICAL, PULSE_SECONDS, chartMax, dayLabel, dueLabel } from "./crm";
import type { CrmState } from "./crm";
import { CRM_STRINGS as S } from "./strings";

/** The real DashboardHome's palette (spec §5.3). */
const C = {
  indigo: "#4F46E5",
  active: "#3E37F7",
  activeBg: "#f5f5ff",
  page: "#f9fafb",
  heading: "#1F2937",
  card: "#4B5563",
  muted: "#6b7280",
  side: "#64748b",
  line: "#e5e7eb",
  divider: "#f0f0f0",
  white: "#ffffff",
  logout: "#ef4444",
  avatar: "#1E3A8A",
  fresh: "#10B981",
};
const KPI_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6"];
const TASK = { doneDot: "#28a745", pendingDot: "#ffc107", doneBg: "#d4edda", doneFg: "#155724", pendingBg: "#fff3cd", pendingFg: "#856404" };
/** Inter as in the app; the site's self-hosted grotesk where Inter isn't installed. */
const font = (weight: number, size: number) => `${weight} ${size}px Inter, ${CANVAS_FONTS.ui}`;
const EMOJI_FONT = '12px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const TAU = Math.PI * 2;
const CHART = { x: 132, y: 142, w: 326, h: 246 };
const TASKS = { x: 466, y: 142, w: 164, h: 246 };

/** A white card with the app's shadow (0 4px 12px rgba(0,0,0,.08); shadows are in canvas pixels). */
function card(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.save();
  g.shadowColor = "rgba(0,0,0,0.08)";
  g.shadowBlur = 12;
  g.shadowOffsetY = 4;
  g.fillStyle = C.white;
  roundRect(g, x, y, w, h, 6);
  g.fill();
  g.restore();
}

/** The admin dashboard (sketch part-bee.js beeLive.draw). */
export function drawCrm(g: CanvasRenderingContext2D, s: CrmState, t: number): HitRegion[] {
  const hits: HitRegion[] = [];
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.lineWidth = 1;
  g.setLineDash([]);
  g.fillStyle = C.page;
  g.fillRect(0, 0, CRM_LOGICAL.w, CRM_LOGICAL.h);
  sidebar(g);
  header(g);
  kpis(g, s, t);
  chart(g, s, t, hits);
  tasks(g, s, hits);
  return hits;
}

function sidebar(g: CanvasRenderingContext2D) {
  g.fillStyle = C.white;
  g.fillRect(0, 0, 120, CRM_LOGICAL.h);
  g.fillStyle = C.divider;
  g.fillRect(120, 0, 1, CRM_LOGICAL.h);
  // the indigo circle with the bee
  g.fillStyle = C.active;
  g.beginPath();
  g.arc(22, 22, 11, 0, TAU);
  g.fill();
  g.font = EMOJI_FONT;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(S.logoEmoji, 22, 23);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = C.heading;
  g.font = font(700, 9.2);
  g.fillText(S.brand[0], 39, 20);
  g.fillText(S.brand[1], 39, 31);
  S.nav.forEach((label, i) => {
    const y = 50 + i * 20;
    const on = i === 0;
    if (on) {
      g.fillStyle = C.activeBg;
      g.fillRect(0, y, 120, 18);
      g.fillStyle = C.active;
      g.fillRect(0, y, 1.5, 18); // the app's 3 px bar at half scale
    }
    g.fillStyle = on ? C.active : C.side;
    g.font = font(on ? 600 : 500, 8.6);
    g.fillText(label, 16, y + 12);
  });
}

function header(g: CanvasRenderingContext2D) {
  g.fillStyle = C.white;
  g.fillRect(121, 0, 519, 34);
  g.fillStyle = C.line;
  g.fillRect(121, 34, 519, 1);
  g.fillStyle = C.heading;
  g.font = font(600, 10.5);
  g.fillText(S.header, 132, 21);
  g.font = font(600, 7.4);
  g.textAlign = "center";
  g.fillStyle = C.indigo;
  roundRect(g, 470, 9, 58, 16, 8);
  g.fill();
  g.fillStyle = C.white;
  g.fillText(S.addNew, 499, 20);
  g.fillStyle = C.logout;
  roundRect(g, 532, 9, 40, 16, 8);
  g.fill();
  g.fillStyle = C.white;
  g.fillText(S.logout, 552, 20);
  g.textAlign = "left";
  // search icon
  g.strokeStyle = C.muted;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(586, 16, 4, 0, TAU);
  g.moveTo(589, 19);
  g.lineTo(592, 22);
  g.stroke();
  g.lineWidth = 1;
  // avatar
  g.fillStyle = C.avatar;
  g.beginPath();
  g.arc(612, 17, 9, 0, TAU);
  g.fill();
  g.fillStyle = C.white;
  g.font = font(700, 7);
  g.textAlign = "center";
  g.fillText(S.avatar, 612, 19.5);
  g.textAlign = "left";
  // page title
  g.fillStyle = C.heading;
  g.font = font(700, 13.5);
  g.fillText(S.title, 132, 56);
  g.fillStyle = C.muted;
  g.font = font(400, 8);
  g.fillText(S.subtitle, 132, 68);
}

function kpis(g: CanvasRenderingContext2D, s: CrmState, t: number) {
  const values = [formatRupiah(s.revenue), String(s.customers), String(s.transactions), String(s.promos)];
  const fresh = t - s.pulse < PULSE_SECONDS;
  S.kpis.forEach((title, i) => {
    const x = 132 + i * 126;
    const y = 78;
    card(g, x, y, 118, 54);
    g.fillStyle = C.card;
    g.font = font(500, 7.6);
    g.fillText(title, x + 10, y + 15);
    g.fillStyle = `${KPI_COLORS[i]}1A`;
    g.beginPath();
    g.arc(x + 102, y + 14, 8, 0, TAU);
    g.fill();
    g.fillStyle = KPI_COLORS[i];
    g.beginPath();
    g.arc(x + 102, y + 14, 3, 0, TAU);
    g.fill();
    // revenue and transactions flash green right after a sale
    g.fillStyle = fresh && (i === 0 || i === 2) ? C.fresh : C.heading;
    g.font = font(700, i === 0 ? 13 : 15);
    g.fillText(values[i], x + 10, y + 42);
  });
}

function chart(g: CanvasRenderingContext2D, s: CrmState, t: number, hits: HitRegion[]) {
  const { x: cx, y: cy, w: cw, h: ch } = CHART;
  card(g, cx, cy, cw, ch);
  g.fillStyle = C.heading;
  g.font = font(600, 9.4);
  g.fillText(S.chartTitle, cx + 12, cy + 18);
  const px0 = cx + 62;
  const px1 = cx + cw - 14;
  const py0 = cy + 34;
  const py1 = cy + ch - 40;
  const max = chartMax(s.days);
  // dashed grid with the Rp axis
  g.setLineDash([3, 3]);
  g.strokeStyle = C.line;
  for (let k = 0; k <= 4; k++) {
    const y = py1 - (py1 - py0) * (k / 4);
    g.beginPath();
    g.moveTo(px0, y);
    g.lineTo(px1, y);
    g.stroke();
    g.fillStyle = C.muted;
    g.font = font(400, 6.4);
    g.textAlign = "right";
    g.fillText(formatRupiah(Math.round((max * k) / 4)), px0 - 4, y + 2);
    g.textAlign = "left";
  }
  g.setLineDash([]);
  const xs = s.days.map((_, i) => px0 + ((px1 - px0) * i) / 6);
  const ys = s.days.map((v) => py1 - (py1 - py0) * (v / max));
  g.strokeStyle = C.indigo;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i++) g.lineTo(xs[i], ys[i]);
  g.stroke();
  g.lineWidth = 1;
  for (let i = 0; i < xs.length; i++) {
    g.fillStyle = C.white;
    g.beginPath();
    g.arc(xs[i], ys[i], 2.6, 0, TAU);
    g.fill();
    g.strokeStyle = C.indigo;
    g.stroke();
    g.fillStyle = C.muted;
    g.font = font(400, 5.8);
    g.textAlign = "center";
    g.fillText(dayLabel(s, i), xs[i], py1 + 11);
    g.textAlign = "left";
  }
  // today's point pulses after a sale
  const age = t - s.pulse;
  if (age < PULSE_SECONDS) {
    g.strokeStyle = `rgba(79,70,229,${1 - age / PULSE_SECONDS})`;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(xs[6], ys[6], 3 + age * 12, 0, TAU);
    g.stroke();
    g.lineWidth = 1;
  }
  // legend
  g.strokeStyle = C.indigo;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(cx + cw / 2 - 52, cy + ch - 14);
  g.lineTo(cx + cw / 2 - 40, cy + ch - 14);
  g.stroke();
  g.lineWidth = 1;
  g.fillStyle = C.indigo;
  g.font = font(500, 7);
  g.fillText(S.legend, cx + cw / 2 - 36, cy + ch - 11.5);
  hits.push({ x: cx, y: cy, w: cw, h: ch, action: "sale" });
}

function tasks(g: CanvasRenderingContext2D, s: CrmState, hits: HitRegion[]) {
  const { x: tx, y: ty, w: tw, h: th } = TASKS;
  card(g, tx, ty, tw, th);
  g.fillStyle = C.heading;
  g.font = font(600, 9.4);
  g.fillText(S.tasksTitle, tx + 12, ty + 18);
  g.fillStyle = C.indigo;
  g.font = font(500, 7.2);
  g.textAlign = "right";
  g.fillText(S.viewAll, tx + tw - 10, ty + 18);
  g.textAlign = "left";
  s.tasks.forEach((task, i) => {
    const y = ty + 32 + i * 62;
    g.fillStyle = task.done ? TASK.doneDot : TASK.pendingDot;
    g.beginPath();
    g.arc(tx + 15, y + 8, 3, 0, TAU);
    g.fill();
    g.fillStyle = C.heading;
    g.font = font(500, 8);
    wrapText(g, S.tasks[i], tw - 36)
      .slice(0, 2)
      .forEach((row, j) => g.fillText(row, tx + 24, y + 11 + j * 10.5));
    g.fillStyle = C.muted;
    g.font = font(400, 6.6);
    g.fillText(S.due(dueLabel(s, task)), tx + 24, y + 36);
    const label = task.done ? S.completed : S.pending;
    g.font = font(600, 6.4);
    const bw = g.measureText(label).width + 10;
    g.fillStyle = task.done ? TASK.doneBg : TASK.pendingBg;
    roundRect(g, tx + 24, y + 41, bw, 11, 5.5);
    g.fill();
    g.fillStyle = task.done ? TASK.doneFg : TASK.pendingFg;
    g.fillText(label, tx + 29, y + 49);
    if (i < s.tasks.length - 1) {
      g.fillStyle = C.divider;
      g.fillRect(tx + 12, y + 58, tw - 24, 1);
    }
    hits.push({ x: tx, y, w: tw, h: 58, action: "task", arg: i });
  });
}
```

`src/world/scene/screens/crm/index.ts`:

```ts
import type { ScreenApp } from "../types";
import { CRM_LOGICAL, actCrm, autoCrm, busyCrm, initCrm } from "./crm";
import type { CrmState } from "./crm";
import { drawCrm } from "./crmDraw";

export type { CrmState } from "./crm";

/** The Bee Furniture CRM admin dashboard, for a LiveScreen (landscape, 640 × 400). */
export const crmApp: ScreenApp<CrmState> = {
  logical: CRM_LOGICAL,
  init: initCrm,
  act: actCrm,
  auto: autoCrm,
  busy: busyCrm,
  draw: drawCrm,
};
```

- [ ] **Step 7: Run the CRM tests, type-check and lint**

Run: `npx vitest run src/world/scene/screens/crm && npx tsc -b && npx eslint src/world/scene/screens`
Expected: Vitest `Test Files  2 passed (2)`; `tsc` and `eslint` print nothing.

- [ ] **Step 8: Commit**

```bash
git add src/world/scene/screens/crm/strings.ts src/world/scene/screens/crm/crm.ts src/world/scene/screens/crm/crm.test.ts src/world/scene/screens/crm/crmDraw.ts src/world/scene/screens/crm/crmDraw.test.ts src/world/scene/screens/crm/index.ts
git commit -F - <<'EOF'
feat(world): Bee Furniture CRM live screen app (seed KPIs, sales trend, tasks, idle demo)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Task B6: PeduliPasal chat app (strings, model, draw)

**Files:**
- Create: `src/world/scene/screens/chat/strings.ts`, `src/world/scene/screens/chat/chat.ts`, `src/world/scene/screens/chat/chat.test.ts`
- Create: `src/world/scene/screens/chat/chatDraw.ts`, `src/world/scene/screens/chat/chatDraw.test.ts`, `src/world/scene/screens/chat/index.ts`

**Interfaces:**
- Consumes: B1 (`ScreenApp`, `HitRegion`, `roundRect`, `wrapText`); `fakeCtx` (B4, tests only); `CANVAS_FONTS`.
- Produces: `chatApp: ScreenApp<ChatState>` and everything listed for `chat/` in Contract additions.

**Behaviour (spec §5.4, sketch `part-peduli.js`):** the app's chat screen in its night theme inside a 240 × 520 phone: status bar with the clock, toolbar (back arrow, the conversation's topic title, share icon), an indeterminate progress line while the bot answers, user bubbles right (`#284777`), bot bubbles left (`#44474E`), "HH.mm" stamps beside each bubble's inner side, ≡ FAB bottom-left and ↓ FAB bottom-right, three outlined suggestion chips (the row runs off the right edge, as the app's scrolling chip row does), the "Type your message here" field with a paper-plane send, and the Android nav bar. A tap anywhere on the phone advances: the next question appears at once, the progress line runs 1.1 s, then the answer types in at 110 characters a second; taps are ignored until it has finished. The chat opens with the hit-and-run exchange already on screen (no empty state). After a conversation's last exchange the next tap opens the other conversation (new topic title, the chat starts over); the two conversations loop. Stamps come from the injected clock (`init(now)`: `now` is the wall time at t = 0). Idle demo: the next exchange once the last answer has been readable for 3 s. The sketch moved its pending answer into the list inside `draw`; here the answer is stored with its start time and `visibleLines(s, t)` derives what is on screen, so `draw` stays pure.

- [ ] **Step 1: Write the failing model tests**

`src/world/scene/screens/chat/chat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  INITIAL_READ,
  LOADING_SECONDS,
  READ_PAUSE,
  TYPE_RATE,
  actChat,
  advanceChat,
  answering,
  autoChat,
  busyChat,
  clockStamp,
  initChat,
  loading,
  topicTitle,
  visibleLines,
  type ChatState,
} from "./chat";
import { CHAT_STRINGS } from "./strings";

const NOW = new Date(2026, 9, 14, 9, 5, 30); // 09:05:30 local
const [HIT_AND_RUN, THEFT] = CHAT_STRINGS.conversations;

/** Clock time just after the newest line has fully appeared. */
const settled = (s: ChatState) => {
  const last = s.lines[s.lines.length - 1];
  return last.at + last.text.length / TYPE_RATE + 0.01;
};

describe("chat messages", () => {
  it("opens with the first conversation's exchange already on screen, fully typed", () => {
    const s = initChat(NOW);
    expect(topicTitle(s)).toBe("Hit-and-run");
    expect(visibleLines(s, 0).map((v) => [v.line.who, v.text])).toEqual([
      ["user", HIT_AND_RUN.script[0].text],
      ["bot", HIT_AND_RUN.script[1].text],
    ]);
    expect(answering(s, 0)).toBe(false);
  });

  it("a tap shows the next question now and queues the answer after the loading line", () => {
    const s = actChat(initChat(NOW), "advance", undefined, 2);
    expect(topicTitle(s)).toBe("Motorcycle theft");
    expect(s.lines.map((l) => [l.who, l.text])).toEqual([
      ["user", THEFT.script[0].text],
      ["bot", THEFT.script[1].text],
    ]);
    expect(s.lines[0].at).toBe(2);
    expect(s.lines[1].at).toBeCloseTo(2 + LOADING_SECONDS, 9);
  });

  it("shows the progress line for ~1.1 s, then types the answer at ~110 characters a second", () => {
    const s = advanceChat(initChat(NOW), 2);
    expect(loading(s, 2.5)).toBe(true);
    expect(visibleLines(s, 2.5).map((v) => v.line.who)).toEqual(["user"]);
    expect(loading(s, 2 + LOADING_SECONDS + 0.01)).toBe(false);
    const typed = visibleLines(s, 2 + LOADING_SECONDS + 0.5)[1].text;
    expect(typed.length).toBeGreaterThanOrEqual(TYPE_RATE / 2 - 1);
    expect(typed.length).toBeLessThanOrEqual(TYPE_RATE / 2);
    expect(THEFT.script[1].text.startsWith(typed)).toBe(true);
    expect(visibleLines(s, settled(s))[1].text).toBe(THEFT.script[1].text);
  });

  it("ignores taps while the bot is answering", () => {
    const s = advanceChat(initChat(NOW), 2);
    expect(answering(s, 3)).toBe(true);
    expect(advanceChat(s, 3)).toBe(s);
    expect(answering(s, settled(s))).toBe(false);
  });

  it("stamps each bubble 'HH.mm' from the injected clock", () => {
    expect(clockStamp(NOW.getTime(), 0)).toBe("09.05");
    expect(clockStamp(NOW.getTime(), 40)).toBe("09.06");
    const s = advanceChat(initChat(NOW), 29); // question at 09:05:59, answer at 09:06:00.1
    expect(s.lines.map((l) => l.stamp)).toEqual(["09.05", "09.06"]);
  });
});

describe("chat conversations", () => {
  it("the follow-up stays in the same chat; after the last exchange the next conversation starts over", () => {
    let s = advanceChat(initChat(NOW), 0); // theft: first exchange
    s = advanceChat(s, settled(s)); // theft: follow-up in the same chat
    expect(topicTitle(s)).toBe("Motorcycle theft");
    expect(s.lines.map((l) => l.text)).toEqual(THEFT.script.map((l) => l.text));
    s = advanceChat(s, settled(s)); // theft done: hit-and-run starts over
    expect(topicTitle(s)).toBe("Hit-and-run");
    expect(s.lines.map((l) => l.text)).toEqual(HIT_AND_RUN.script.map((l) => l.text));
  });

  it("loops: theft, theft, hit-and-run, theft, theft", () => {
    let s = initChat(NOW);
    const titles: string[] = [];
    for (let i = 0; i < 5; i++) {
      s = advanceChat(s, i === 0 ? 0 : settled(s));
      titles.push(topicTitle(s));
    }
    expect(titles).toEqual(["Motorcycle theft", "Motorcycle theft", "Hit-and-run", "Motorcycle theft", "Motorcycle theft"]);
  });
});

describe("chat demo and redraws", () => {
  it("the idle demo first waits INITIAL_READ, then until each answer has been readable for READ_PAUSE", () => {
    expect(autoChat(initChat(NOW), INITIAL_READ - 0.05)).toBeNull();
    const s1 = autoChat(initChat(NOW), INITIAL_READ);
    if (!s1) throw new Error("no demo step");
    expect(topicTitle(s1)).toBe("Motorcycle theft");
    expect(s1.next).toBeCloseTo(settled(s1) - 0.01 + READ_PAUSE, 9);
    expect(autoChat(s1, s1.next - 0.05)).toBeNull();
    expect(autoChat(s1, s1.next)?.lines).toHaveLength(4);
  });

  it("is busy while loading or typing and idle once the answer is complete", () => {
    const s = advanceChat(initChat(NOW), 0);
    expect(busyChat(s, 0.5)).toBe(true);
    expect(busyChat(s, 2)).toBe(true);
    expect(busyChat(s, settled(s) + 0.1)).toBe(false);
    expect(busyChat(initChat(NOW), 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/scene/screens/chat`
Expected: FAIL — `Error: Failed to resolve import "./chat" from "src/world/scene/screens/chat/chat.test.ts". Does the file exist?`

- [ ] **Step 3: Implement the glossary and the model**

`src/world/scene/screens/chat/strings.ts`:

```ts
export interface ChatScriptLine {
  who: "user" | "bot";
  text: string;
}

export interface Conversation {
  /** The toolbar's chat topic title. */
  title: string;
  script: readonly ChatScriptLine[];
}

/**
 * The app's own conversations, translated faithfully (spec §5.4); they add no legal claims of their own.
 * 1. From the capstone presentation screenshots. 2. From the app's Gemini prompt examples.
 */
const CONVERSATIONS: readonly Conversation[] = [
  {
    title: "Hit-and-run",
    script: [
      { who: "user", text: "Hi, I'd like to ask: in a hit-and-run case, which article would it violate?" },
      {
        who: "bot",
        text:
          "To answer your question about the hit-and-run case, I need more detail. The article violated depends on " +
          "several factors, including: 1. Was anyone killed? 2. Was anyone injured? 3. How badly were the vehicle " +
          "and/or other property damaged? 4. Did the driver flee the scene? 5. Was it negligence or intent? With more " +
          "complete information I can identify the right article in the Road Traffic and Transport Law and the " +
          "possible penalty. Please give more detail so I can answer more accurately.",
      },
    ],
  },
  {
    title: "Motorcycle theft",
    script: [
      { who: "user", text: "Which article fits a motorcycle theft case?" },
      {
        who: "bot",
        text:
          "Article 362: Whoever takes property belonging to another with the intent of unlawfully owning it is " +
          "punishable by up to 5 years in prison or a fine of up to Rp900,000.",
      },
      { who: "user", text: "What if it happened at night, by two people?" },
      {
        who: "bot",
        text: "Article 363: Aggravated theft (for example at night, or by two or more people). Penalty: 7 years in prison.",
      },
    ],
  },
];

/**
 * Every visible string of the PeduliPasal chat screen (the app's activity_message, night theme), in English.
 * Sub-project 2E reuses this glossary. The chips are the repo's hard-coded set, translated.
 */
export const CHAT_STRINGS = {
  conversations: CONVERSATIONS,
  chips: ["Which article fits a motorcycle theft case", "Which article covers a land dispute", "Explain the articles on inheritance cases"],
  input: "Type your message here",
};
```

`src/world/scene/screens/chat/chat.ts`:

```ts
import { CHAT_STRINGS } from "./strings";

/** Seconds of the progress line before an answer starts typing. */
export const LOADING_SECONDS = 1.1;
/** Characters typed per second. */
export const TYPE_RATE = 110;
/** Idle demo: seconds a finished answer stays readable before the next question. */
export const READ_PAUSE = 3;
/** Idle demo: seconds the opening exchange stays readable after load before the first demo step. */
export const INITIAL_READ = 4;
/** The opening exchange is seeded this many seconds before load, so it is fully typed at t = 0. */
const SEED_AGO = 60;
export const CHAT_LOGICAL = { w: 240, h: 520 } as const;

export interface ChatLine {
  who: "user" | "bot";
  text: string;
  /** "HH.mm" when it appears. */
  stamp: string;
  /** Clock time it appears (an answer: when it starts typing). */
  at: number;
}

export interface ChatState {
  /** Wall-clock ms at clock time 0 (init's `now`), for the stamps and the status-bar clock. */
  originMs: number;
  /** Index into CHAT_STRINGS.conversations. */
  convo: number;
  /** Index of the next script line in this conversation. */
  step: number;
  lines: readonly ChatLine[];
  /** Clock time of the next idle-demo advance. */
  next: number;
}

export interface VisibleLine {
  line: ChatLine;
  /** The text on screen (an answer being typed is cut to the characters typed so far). */
  text: string;
}

const CONVERSATIONS = CHAT_STRINGS.conversations;
const pad2 = (n: number) => String(n).padStart(2, "0");
const lastLine = (s: ChatState): ChatLine | undefined => s.lines[s.lines.length - 1];

/** Clock time a line has fully appeared (an answer once completely typed). */
function doneAt(line: ChatLine): number {
  return line.who === "bot" ? line.at + line.text.length / TYPE_RATE : line.at;
}

/** The chat opens on the first conversation with its exchange already on screen: no empty state. */
export function initChat(now: Date): ChatState {
  const blank: ChatState = { originMs: now.getTime(), convo: 0, step: 0, lines: [], next: INITIAL_READ };
  return advanceChat(blank, -SEED_AGO);
}

/** "HH.mm" (24 h, local clock) at clock time t, as the app stamps its bubbles. */
export function clockStamp(originMs: number, t: number): string {
  const d = new Date(originMs + t * 1000);
  return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`;
}

/** The bot is still loading or typing its latest answer. */
export function answering(s: ChatState, t: number): boolean {
  const last = lastLine(s);
  return last !== undefined && t < doneAt(last);
}

/** The progress line runs: an answer is queued and has not started typing yet. */
export function loading(s: ChatState, t: number): boolean {
  return s.lines.some((l) => l.who === "bot" && t < l.at);
}

/**
 * A tap (or the demo): the next question appears now and its answer is queued LOADING_SECONDS later. Ignored while
 * the bot is answering. After a conversation's last exchange the next tap opens the next conversation (new topic
 * title, empty chat); the conversations loop.
 */
export function advanceChat(s: ChatState, t: number): ChatState {
  if (answering(s, t)) return s;
  let convo = s.convo;
  let step = s.step;
  let lines = s.lines;
  if (step >= CONVERSATIONS[convo].script.length) {
    convo = (convo + 1) % CONVERSATIONS.length;
    step = 0;
    lines = [];
  }
  const script = CONVERSATIONS[convo].script;
  const ask = script[step];
  const added: ChatLine[] = [{ who: ask.who, text: ask.text, stamp: clockStamp(s.originMs, t), at: t }];
  step += 1;
  const reply = step < script.length ? script[step] : null;
  if (reply && reply.who === "bot") {
    const at = t + LOADING_SECONDS;
    added.push({ who: "bot", text: reply.text, stamp: clockStamp(s.originMs, at), at });
    step += 1;
  }
  return { ...s, convo, step, lines: [...lines, ...added] };
}

/** What is on screen at t: lines whose time has come, the answer being typed cut to the characters typed so far. */
export function visibleLines(s: ChatState, t: number): VisibleLine[] {
  const out: VisibleLine[] = [];
  for (const line of s.lines) {
    if (line.at > t) continue;
    const typed = line.who === "bot" ? Math.floor((t - line.at) * TYPE_RATE) : line.text.length;
    if (typed <= 0) continue;
    out.push({ line, text: line.text.slice(0, typed) });
  }
  return out;
}

export function topicTitle(s: ChatState): string {
  return CONVERSATIONS[s.convo].title;
}

/** Visitor taps: "advance" (the whole phone is one region). */
export function actChat(s: ChatState, action: string, _arg: number | undefined, t: number): ChatState {
  return action === "advance" ? advanceChat(s, t) : s;
}

/** Idle demo: the next exchange once the last answer has been readable for READ_PAUSE seconds. */
export function autoChat(s: ChatState, t: number): ChatState | null {
  if (t < s.next || answering(s, t)) return null;
  const next = advanceChat(s, t);
  const last = lastLine(next);
  return { ...next, next: (last ? doneAt(last) : t) + READ_PAUSE };
}

/** Animating while the progress line runs or an answer types, plus a moment so the last character is drawn. */
export function busyChat(s: ChatState, t: number): boolean {
  const last = lastLine(s);
  return last !== undefined && last.who === "bot" && t < doneAt(last) + 0.1;
}
```

- [ ] **Step 4: Run the model tests to verify they pass**

Run: `npx vitest run src/world/scene/screens/chat`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  9 passed (9)`.

- [ ] **Step 5: Write the failing draw test**

`src/world/scene/screens/chat/chatDraw.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fakeCtx } from "../testing/fakeCtx";
import { advanceChat, initChat } from "./chat";
import { chatApp } from "./index";

const NOW = new Date(2026, 9, 14, 9, 5, 30);

describe("chatApp", () => {
  it("is a 240 × 520 phone screen", () => {
    expect(chatApp.logical).toEqual({ w: 240, h: 520 });
  });

  it("makes the whole phone one 'advance' region", () => {
    expect(chatApp.draw(fakeCtx(), initChat(NOW), 0)).toEqual([{ x: 0, y: 0, w: 240, h: 520, action: "advance" }]);
  });

  it("draws while loading, while typing and when settled without throwing", () => {
    const s = advanceChat(initChat(NOW), 0);
    for (const t of [0.5, 1.5, 3, 10]) expect(() => chatApp.draw(fakeCtx(), s, t)).not.toThrow();
  });
});
```

Run: `npx vitest run src/world/scene/screens/chat/chatDraw.test.ts`
Expected: FAIL — `Error: Failed to resolve import "./index" from "src/world/scene/screens/chat/chatDraw.test.ts". Does the file exist?`

- [ ] **Step 6: Implement the draw and the app**

`src/world/scene/screens/chat/chatDraw.ts`:

```ts
import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { roundRect, wrapText } from "../format";
import type { HitRegion } from "../types";
import { CHAT_LOGICAL, clockStamp, loading, topicTitle, visibleLines } from "./chat";
import type { ChatState } from "./chat";
import { CHAT_STRINGS as S } from "./strings";

/** PeduliPasal's night theme (spec §5.4). */
const C = {
  bg: "#111318",
  on: "#E2E2E9",
  primary: "#AAC7FF",
  user: "#284777",
  bot: "#44474E",
  stamp: "#C4C6D0",
  field: "#33353A",
  track: "rgba(170,199,255,.25)",
  navBar: "#0c0d10",
  navIcon: "#c9c9c9",
  /** ≡ FAB (capstone screenshots): dark circle, light icon. */
  fabMenu: "#2b2d33",
  fabMenuIcon: "#E2E2E9",
  /** ↓ FAB: pale circle, dark arrow-in-a-circle icon. */
  fabDown: "#d9dce8",
  fabDownIcon: "#1d2a44",
  chip: "#ffffff",
};
/** Roboto as on Android; the site's self-hosted grotesk elsewhere. */
const font = (weight: number, size: number) => `${weight} ${size}px Roboto, ${CANVAS_FONTS.ui}`;
const TAU = Math.PI * 2;
/** The message list's band, between the toolbar's progress line and the chips. */
const LIST = { top: 60, bottom: 418 };
const BUBBLE_MAX = 168;
const ROW = 12.5;
const SHARE_DOTS: readonly (readonly [number, number])[] = [
  [214, 32],
  [224, 27],
  [224, 39],
];

/** The chat screen (sketch part-peduli.js pdLive.draw, in English, with the FABs from the capstone screenshots). */
export function drawChat(g: CanvasRenderingContext2D, s: ChatState, t: number): HitRegion[] {
  const { w, h } = CHAT_LOGICAL;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.lineWidth = 1;
  g.fillStyle = C.bg;
  g.fillRect(0, 0, w, h);
  statusBar(g, clockStamp(s.originMs, t));
  toolbar(g, topicTitle(s));
  if (loading(s, t)) progress(g, t);
  messages(g, s, t);
  fab(g, 26, 400, "menu");
  fab(g, 214, 400, "down");
  chips(g);
  inputRow(g);
  navBar(g);
  // the whole phone advances the chat
  return [{ x: 0, y: 0, w, h, action: "advance" }];
}

function statusBar(g: CanvasRenderingContext2D, time: string) {
  g.fillStyle = C.on;
  g.font = font(500, 8);
  g.fillText(time, 14, 13);
  // battery
  g.fillRect(212, 6, 14, 7);
  g.fillRect(226, 8, 1.5, 3);
}

function toolbar(g: CanvasRenderingContext2D, title: string) {
  // back arrow
  g.strokeStyle = C.on;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(22, 36);
  g.lineTo(14, 36);
  g.moveTo(18, 31);
  g.lineTo(13.5, 36);
  g.lineTo(18, 41);
  g.stroke();
  g.fillStyle = C.on;
  g.font = font(500, 12);
  g.fillText(title, 38, 40);
  // share icon: three joined dots
  for (const [x, y] of SHARE_DOTS) {
    g.beginPath();
    g.arc(x, y, 2.2, 0, TAU);
    g.fill();
  }
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(214, 32);
  g.lineTo(224, 27);
  g.moveTo(214, 32);
  g.lineTo(224, 39);
  g.stroke();
  g.lineWidth = 1;
}

/** Indeterminate progress line under the toolbar while the bot answers. */
function progress(g: CanvasRenderingContext2D, t: number) {
  const w = CHAT_LOGICAL.w;
  g.fillStyle = C.track;
  g.fillRect(0, 54, w, 2);
  const k = (t * 1.3) % 1;
  g.fillStyle = C.primary;
  g.fillRect(w * (k * 1.4 - 0.4), 54, w * 0.4, 2);
}

function messages(g: CanvasRenderingContext2D, s: ChatState, t: number) {
  const w = CHAT_LOGICAL.w;
  g.font = font(400, 9);
  const laid = visibleLines(s, t).map(({ line, text }) => {
    const rows = wrapText(g, text, BUBBLE_MAX - 16);
    const bw = Math.min(BUBBLE_MAX, Math.max(...rows.map((r) => g.measureText(r).width)) + 16);
    return { line, rows, bw, bh: rows.length * ROW + 12 };
  });
  if (laid.length === 0) return;
  // newest at the bottom; older bubbles scroll off the top of the list
  const total = laid.reduce((a, l) => a + l.bh + 10, 0);
  let y = Math.min(LIST.top + 6, LIST.bottom - total);
  g.save();
  g.beginPath();
  g.rect(0, LIST.top, w, LIST.bottom - LIST.top);
  g.clip();
  for (const l of laid) {
    const user = l.line.who === "user";
    const x = user ? w - 12 - l.bw : 12;
    g.fillStyle = user ? C.user : C.bot;
    roundRect(g, x, y, l.bw, l.bh, 5);
    g.fill();
    g.fillStyle = C.on;
    g.font = font(400, 9);
    l.rows.forEach((row, k) => g.fillText(row, x + 8, y + 15 + k * ROW));
    // the time beside the bubble's inner side
    g.fillStyle = C.stamp;
    g.font = font(400, 7);
    g.textAlign = user ? "right" : "left";
    g.fillText(l.line.stamp, user ? x - 5 : x + l.bw + 5, y + l.bh - 3);
    g.textAlign = "left";
    y += l.bh + 10;
  }
  g.restore();
}

/** The two round FABs from the capstone screenshots: ≡ bottom-left (dark), ↓ bottom-right (pale, circled arrow). */
function fab(g: CanvasRenderingContext2D, x: number, y: number, icon: "menu" | "down") {
  const menu = icon === "menu";
  g.fillStyle = menu ? C.fabMenu : C.fabDown;
  g.beginPath();
  g.arc(x, y, 12, 0, TAU);
  g.fill();
  g.strokeStyle = menu ? C.fabMenuIcon : C.fabDownIcon;
  g.lineWidth = 1.5;
  g.beginPath();
  if (menu) {
    for (const dy of [-4, 0, 4]) {
      g.moveTo(x - 5, y + dy);
      g.lineTo(x + 5, y + dy);
    }
  } else {
    g.arc(x, y, 6, 0, TAU);
    g.moveTo(x, y - 3.2);
    g.lineTo(x, y + 3);
    g.moveTo(x - 2.6, y + 0.6);
    g.lineTo(x, y + 3);
    g.lineTo(x + 2.6, y + 0.6);
  }
  g.stroke();
  g.lineWidth = 1;
}

/** Outlined suggestion pills; the row runs off the right edge like the app's horizontally scrolling chip group. */
function chips(g: CanvasRenderingContext2D) {
  let x = 10;
  g.font = font(400, 8.4);
  g.lineWidth = 1.2;
  for (const chip of S.chips) {
    const cw = g.measureText(chip).width + 20;
    g.strokeStyle = C.chip;
    roundRect(g, x, 426, cw, 22, 11);
    g.stroke();
    g.fillStyle = C.on;
    g.fillText(chip, x + 10, 440);
    x += cw + 6;
  }
  g.lineWidth = 1;
}

function inputRow(g: CanvasRenderingContext2D) {
  g.fillStyle = C.field;
  roundRect(g, 10, 458, 188, 32, 4);
  g.fill();
  g.fillStyle = C.stamp;
  g.fillRect(10, 489, 188, 1);
  g.font = font(400, 9);
  g.fillText(S.input, 20, 477);
  // paper-plane send
  g.fillStyle = C.primary;
  g.beginPath();
  g.moveTo(210, 466);
  g.lineTo(230, 474);
  g.lineTo(210, 482);
  g.lineTo(212, 475.5);
  g.lineTo(222, 474);
  g.lineTo(212, 472.5);
  g.closePath();
  g.fill();
}

/** Android's nav bar: back, home, recents. */
function navBar(g: CanvasRenderingContext2D) {
  g.fillStyle = C.navBar;
  g.fillRect(0, 498, CHAT_LOGICAL.w, 22);
  g.fillStyle = C.navIcon;
  g.beginPath();
  g.moveTo(72, 509);
  g.lineTo(80, 504);
  g.lineTo(80, 514);
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(120, 509, 4.6, 0, TAU);
  g.fill();
  g.fillRect(156, 505, 8, 8);
}
```

`src/world/scene/screens/chat/index.ts`:

```ts
import type { ScreenApp } from "../types";
import { CHAT_LOGICAL, actChat, autoChat, busyChat, initChat } from "./chat";
import type { ChatState } from "./chat";
import { drawChat } from "./chatDraw";

export type { ChatState } from "./chat";

/** The PeduliPasal chat screen (night theme), for a LiveScreen inside the giant phone (portrait, 240 × 520). */
export const chatApp: ScreenApp<ChatState> = {
  logical: CHAT_LOGICAL,
  init: initChat,
  act: actChat,
  auto: autoChat,
  busy: busyChat,
  draw: drawChat,
};
```

- [ ] **Step 7: Run the chat tests, type-check and lint**

Run: `npx vitest run src/world/scene/screens/chat && npx tsc -b && npx eslint src/world/scene/screens`
Expected: Vitest `Test Files  2 passed (2)`; `tsc` and `eslint` print nothing.

- [ ] **Step 8: Commit**

```bash
git add src/world/scene/screens/chat/strings.ts src/world/scene/screens/chat/chat.ts src/world/scene/screens/chat/chat.test.ts src/world/scene/screens/chat/chatDraw.ts src/world/scene/screens/chat/chatDraw.test.ts src/world/scene/screens/chat/index.ts
git commit -F - <<'EOF'
feat(world): PeduliPasal chat live screen app (two conversations, loading line, typing, idle demo)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Aik2MnQpEAcRNUPaQdg3z
EOF
```

---

### Part B wrap-up: full verification

- [ ] **Step 1: Run every check**

```bash
npx tsc -b
npx eslint .
npx vitest run
npm run build
```

Expected: `tsc` and `eslint` print nothing; Vitest reports every test file passed with `0 failed` (Part B adds 13 test files — `types`, `format`, `images`, `random`, `policy`, `closeupState`, `closeup`, `pos`, `posDraw`, `crm`, `crmDraw`, `chat`, `chatDraw` — and extends `store.test.ts` and `runtime.test.ts`); the build ends with `✓ built in …`.

- [ ] **Step 2: Confirm the copy is English and the rupiah format is the contract's**

Run: `grep -rnE "toLocaleString|id-ID|Pesanan|Bayar|Meja|Habis|Sisa|Pencurian|ketik|Ketuk" src/world/scene/screens`
Expected: no output.

- [ ] **Step 3: Note for Part C**

Nothing in Part B mounts a `LiveScreen` in committed code. The in-world visual check of each screen, the closeup in Tour, Play and on a phone (520×940), the HUD Back button, the scroll and walk exits, and the idle demos pausing after input happen in Part C (C2–C4 place the screens with `posApp`, `crmApp`, `chatApp`; C8 runs the shots and the manual checklist). Part C's map board can use the optional `ScreenApp.key` for its arrow keys and Enter; `CloseupController` then keeps those keys from walking Ezra or switching the tour to Play.

---

## Self-review

**Spec §5 — Live screens**

| Requirement | Where |
|---|---|
| One component for every program screen; canvas texture at logical × 2 | `LiveScreen.tsx` (`SCREEN_SCALE = 2`; canvases 1280 × 800 and 480 × 1040, ≤ 2048 px) |
| Redraw only on state change or while animating, max 15 fps | `redrawDue` (tested) + `screensVersion` + `app.busy`; frustum check keeps off-screen screens from drawing (§11 "only while visible") |
| Pointer hit: raycast → UV → logical px → hit regions | `CloseupTarget.hit` (face raycast → `uvToLogical`, tested) → `input` → `hitAt` (tested, topmost wins) |
| `ScreenApp<S>` shape exactly as specified | `types.ts` (plus the optional `key`) |
| Idle demo; 7 s pause after input; only while the island is in view; off under reduced motion | `demoMayRun` (tested) with `activeIsland` / closeup; `DEMO_PAUSE = 7` |
| One glossary per app, English | `pos/strings.ts`, `crm/strings.ts`, `chat/strings.ts`; wrap-up Step 2 greps for leftover Indonesian |
| Assets: six menu photos as one sprite + logo, small WebP in `public/world/monosuko/` | B4 Steps 1–3 (≈ 43 KB + 11 KB) |
| §5.2 POS look, layout, menu, prices, stock badges, actions, 1.6 s confirmation, restock | `posDraw.ts`, `pos.ts`; tests: badges (ok / "N left" / "Sold out"), sold-out not addable, stock never negative, Pay clears + lowers stock, restock rule and its negative case |
| §5.3 CRM look, layout, KPIs, chart, tasks, actions, cap shift | `crmDraw.ts`, `crm.ts`; tests: sale raises KPIs + today's point, shift, toggle, dates from `now` |
| §5.4 chat look (status bar, toolbar, progress line, bubbles, stamps, chips, input, FABs, nav bar), the two conversations, loading ~1.1 s then typing, loop | `chatDraw.ts`, `chat.ts`; tests: message order, loading then ~110 chars/s, taps ignored while answering, topic title changes, loop, "HH.mm" stamps |
| Rupiah as `Rp 30,000` | `formatRupiah` (tested); every price on POS and CRM goes through it |

**Spec §6 — Closeup camera**

| Requirement | Where |
|---|---|
| Camera state on top of Tour and Play; `closeupId` in the store | `runtime.closeup` + store `closeupId` / `setCloseup` (B2); `CloseupCamera` runs after both cameras |
| Enter by click/tap, or E / Enter on a focused screen | `LiveScreen`'s `Interactable.onActivate → openCloseup` (InteractionController click, Play E, Tab + Enter) |
| Glide square-on so the target fills ~85 % height or ~90 % width; from the world transform, every frame | `closeupPose` (tested ≥ 80 % at 16:9 and 9:19.5, both sides fit, normal side); `target.center()` / `normal()` read the face's world matrix each frame |
| While close: pointer to the target's plane only; Ezra stays | `CloseupController` (face raycast only); InteractionController drains E, PlayCamera ignores drags, consumed keys and Space never reach the player |
| Exits: Esc, HUD Back, tap outside, page scroll (Tour), movement keys (Play); return to the tour point or follow camera | useModeTransitions / useTabCycling (Esc), Hud (Back), CloseupController (tap beside, scroll > 24 px, move keys / stick); blending back to the live base pose |
| Reduced motion: cut | `stepCloseupBlend(…, reduced)` (tested) |
| Reusable by map boards and later screens without changing the mechanism | any `LiveScreen` (Part C's map board too) registers itself; `CloseupTarget` is generic |

**Spec §12 — Testing (Part B's share)**

- POS model: stock never negative, "N left" below minimum, sold-out not addable, Pay clears the order and lowers stock, restock rule: `pos.test.ts`.
- CRM model: sale raises KPIs and today's point, day shift, task toggle: `crm.test.ts`.
- Chat model: message order, loading then typing, conversation loop: `chat.test.ts`.
- Closeup pose fills ≥ 80 % at 16:9 and 9:19.5: `closeup.test.ts`.
- Visual shots and the manual checklist need the screens on islands: Part C (C8).

**Placeholder scan:** every code step shows whole files or exact old → new snippets; every test step has its test code and the expected failure; no "similar to Task N".

**Type consistency:** `PosState` / `CrmState` / `ChatState` are defined once in their models and re-exported by each `index.ts`; `ScreenApp` methods match the models' function signatures (`act(s, action, arg, t)`, `auto(s, t)`, `busy(s, t)`, `draw(ctx, s, t)`); `CloseupTarget` is defined in `runtime.ts` and implemented only by `LiveScreen`; `closeupPose`'s optional `out` is used by `CloseupCamera`.

## Open questions

1. **FABs on the chat screen** (resolved in review): drawn from the capstone screenshots, the menu FAB a dark circle with a light icon, the down FAB a pale circle with a dark arrow-in-a-circle icon, at y = 400 above the chips.
2. **Empty-chat hint** (resolved in review): dropped. The chat opens with the first exchange already on screen, so no invented copy is needed.
3. **CRM day shift.** The chart's date labels stay anchored to the real today; when a sale would pass Rp 3,600,000 the data moves one point left and the new last point (today's label) starts with that sale. This follows the sketch. Alternative: advance the labels too (the chart would show future dates).
4. **Ezra in front of a screen (Play).** The closeup camera sits on the screen's normal at ~3.4 blocks for the landscape screens; if Ezra stands between it and a low screen (the CRM monitor), his model could cover part of the face. Part C should check this in C3 and, if needed, hide Ezra while `runtime.closeup` is set (Part C already adds `runtime.hidden` for travel).
5. **`ScreenApp.key` for the map board.** Added here (optional) so Part C's map can take arrows / Enter in closeup without walking Ezra or switching the tour to Play. Part C's plan was written in parallel from the master contracts, so it may handle keys differently; reconcile when Part C is executed.
6. **Combo A photo.** Cropped to the plate to keep the screen English (deviation 4). If Ezra prefers the full promo graphic, the crop override in B4 Step 1 is one line.

## Integration fixes (dry run 2026-10-14)

Replayed after Part A and before Part C on fresh sandbox copies at `bcd1ffb` and at the final base `540ef7b` (Phase 1 input fixes); every task's tests, tsc, eslint and the build passed, and Part C then placed the screens on the islands. Changes to this plan:

- **B2 Step 6 (`LiveScreen.tsx`), the face material:** `meshStandardMaterial` with `map`, a white `emissiveMap` at 0.85 and `toneMapped={false}` became `<meshBasicMaterial map={texture} toneMapped={false} />`. Lit plus emissive, the face came out about 1.75× brighter in linear light, so every colour above roughly sRGB 200 clipped to white: the POS's grey panels, card borders and chip fills, the map board's parchment and sky (and its white cursor ring vanished), while the greens and greys of all three apps came out paler than the real programs. Unlit, the face shows the canvas as drawn (closeup shots checked).
- **B3 Step 13 (`Hud.tsx`), rebased on `02f0ee8`:** the HUD now picks its hint from a `HINTS[keys | touch][mode]` table. A new Old/New adds a `closeup` row to it ("Click the screen to use it · Esc to go back" on keys, "Tap the screen to use it · Back to leave" on touch), and the hint's Old/New now replaces `HINTS[touch ? "touch" : "keys"][mode]` with `…[closeupId ? "closeup" : mode]`, keeping `prompt && !closeupId`.
- **B3 Step 14 (`MobileControls.tsx`), rebased on `02f0ee8`:** the Old/New for the reset effect matches the rewritten component (`stickId.current = null`, the `!coarse || !ready` gate). The step's note mentions the resting stick, which in the tour also sits under the screen's lower left.
- **B3 Step 10 (`PlayCamera.tsx`):** unchanged; both snippets still match after `7bdb594` / `540ef7b` added the context-menu block.
- **Open questions 4 and 5** are settled by Part C: Ezra is hidden during a closeup (C2), and the map board takes its arrows and Enter through `ScreenApp.key` (C7).

Then three closeup decisions by the coordinator, from what the closeup shots showed:
- **The HUD covered the top-left of every landscape closeup** (the hint row ends near y 87 px at 1280 × 720, the screen began at 54 px, hiding the POS and CRM brand blocks, the map's title and the phone's clock). B3 Steps 1, 3, 4 and 6: `closeupPose` takes a 7th argument `view: { inset?, pan? }`. `CloseupCamera` passes `inset = CLOSEUP_HUD_PX (96) / canvas height` (at most 0.3), and the target is fitted (85 % of the free height, or 90 % of the width) and centred in the frame below the HUD. The new test checks that the target's projected top stays below the inset and its centre sits in the free area, at 16:9 and 9:19.5.
- **Props stood between a phone closeup's camera and its target** (the hero's title letters, the POS awning posts, a plaza lamp, posts and boards on the minis). The camera stands far back on a phone. B3 Steps 3 and 6: `CloseupCamera` moves `camera.near` from its default up to `CLOSEUP_NEAR_MARGIN` (0.25) in front of the face's plane, eased by the closeup weight cubed (`closeupNear`, never below the default), calls `updateProjectionMatrix()` only when the value changes, and restores the default once the glide out ends. That clips everything in between, Ezra included.
- **On a 520 × 940 phone the landscape screens rendered their text at about 7 px**, fitted by width. On a portrait viewport a landscape target (`closeupPans`: aspect < 1 and w > h) is now fitted by its height, the same fill as on a wide screen (about 18 px text), and starts centred. A sideways drag that began in the closeup pans it (B3 Step 7, `CloseupController`): the camera and its look point slide along the face's horizontal, clamped by `closeupPanLimit` so either edge of the face can just reach the viewport's edge. A press that moves less than 6 px is still a tap. The canvas takes `touch-action: pan-y` during a closeup, so a horizontal swipe arrives as pointer events. Portrait targets (the PeduliPasal phone) keep the fit-both rule. The pan state is `closeupPan` in `closeupState.ts` (B2 Steps 1 and 4: each closeup opens centred, tested). The HUD (B3 Step 13) shows "Swipe to pan · Tap to use · Back to leave" on touch when the open screen pans, and "Drag to pan · Click to use · Esc to go back" for a mouse in a portrait window.
- Counts: `closeup.test.ts` has 13 tests (B3 Step 4), `closeupState.test.ts` 5. The suite after Part C on `540ef7b` is `Test Files  80 passed (80)`, `Tests  615 passed (615)`. three.js stays out of the page-shell chunk: the HUD imports only the pure `closeupPans` and `runtime`.
