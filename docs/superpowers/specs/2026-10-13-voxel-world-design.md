# Voxel World Portfolio — Design

Date: 2026-10-13 · Status: approved in brainstorming, awaiting spec review · Owner: Ezra Brilliant

## 1. Summary

ezrabrilliant.com becomes a small, playable voxel archipelago. Each project is an island built from blocks; visitors
scroll through it as a guided tour, click anything that looks alive, or press Play and walk the world as a voxel Ezra.
Every island shows the real program working (live GTID prices, an Orbit receipt printing, Ezra Bot answering), not a
screenshot. All on-page text is English.

The work is split into four phases. **This spec fully designs Phase 1** and fixes the contracts later phases build on;
Phases 2–4 are outlined so Phase 1 doesn't paint them into a corner.

Reference sketch (live, approved direction "Dunia Blok"): https://claude.ai/artifact/KE9xMuuuQzUgnd1UKr7Fhu

## 2. Decisions

| Topic | Decision |
|---|---|
| Direction | Voxel archipelago, playful, muted natural palette, warm late-afternoon light |
| Entry | Scroll tour by default **+** Play mode with a character **+** every interactive element clickable in both modes |
| Other content | Everything lives in the 3D world (mini islands, monuments, mailbox); no 2D text panels |
| Character | Voxel Ezra; sits at the hero island edge during the tour, stands up when Play starts |
| Sound | Music + SFX, muted until the visitor turns it on; music changes arrangement per island (Phase 4) |
| Tour copy | In the world: voxel-letter titles and wooden boards/plaques; a hidden HTML mirror for SEO/screen readers |
| Stack | Approach A: React Three Fiber inside the existing Vite + React app; engine core as framework-free TypeScript |
| SFX / music tools | ZzFX for SFX (runtime, no files); Tone.js for music, rendered offline to small files |
| Adding a project | One entry in `src/config/portfolio.ts`; island, tour stop and sign appear automatically |
| Crossing between islands | One fixed rule set (section 4): bridges (+ optional stepping stones) for nearby islands, paired bounce pads for big height differences, minecart rails between districts, map signpost for fast travel |
| Language | English everywhere on the site |

## 3. Phases

| Phase | Scope | Result |
|---|---|---|
| **1. Foundation** (this spec) | Voxel engine, districts + path, tour camera, Play mode, character, interaction system, particles, SFX, crossings (bridges + stepping stones, bounce pads, minecart), hero + 4 star islands with their real programs, content config schema | Playable world with the four star projects; not yet replacing the live site |
| 2. All content | Mini islands for the other projects, experience monuments along the path, mailbox contact form (in-world), Ezra Bot Q&A for About/Contact, resume, map signposts (fast travel) | Launch: replaces the current site |
| 3. Mini games | Punch blocks for gems (GTID), Orbit shop cosmetics with QRIS flow, Petak Umpet hide-and-seek with hompimpa, gacha machine | Game loop across islands |
| 4. Easter eggs & mood | Secret cloud island, Konami night mode with fireflies, GitHub contributions as a voxel field, a cat, fall-off jokes, per-island music (vertical remix), day/night | Secrets + soundtrack |

## 4. World and layout

**Districts.** Islands are grouped by the world each project lives in; a star island anchors each district and mini
islands orbit it as smaller satellites.

```
        DISCORD                         WEB & APPS
      [Orbit]══[Ezra Bot]   · · ·     (mini islands, Phase 2)
         ║                                 ║
  GAME   ║                                 ║
 [GTID]══[Petak Umpet]═════════════════════╝
     ║
 [HERO]  ← spawn
```

- The tour path rises gently from the hero island through the four star islands. Mini islands are visible around it.
- A project's `district` field picks its district; mini islands take the next free satellite slot there.
- Phase 1 builds the hero island, four star islands, the bridges/stepping stones between them, and empty district slots.

**Scale.** 1 block = 1 world unit. Ezra is 2 blocks tall. Star islands are ~16–20 blocks across, mini islands 6–9.

**Crossings: one rule set for the whole world.** The kind of gap decides the crossing, so visitors learn it once
("a launcher means the island is above"). All crossings use the same materials (planks, stone, the same dark iron).

| Gap | Crossing | Behaviour |
|---|---|---|
| Nearby islands, height difference ≤ 2 blocks | **Plank bridge** (with steps when rising) + optional **stepping stones** beside it | The bridge is the always-safe path and sways slightly underfoot; the stones are a parkour shortcut |
| Height difference > 2 blocks | **Paired bounce pads**, one on each island | Stepping on a pad launches Ezra on a computed ballistic arc that always lands on the paired pad; works both ways |
| Between districts | **Minecart** on a floating rail, a small station at each end | E at a station: Ezra sits in the cart, rides the rail (with a gentle dip), hops out at the other station; both directions |
| Any island → any island | **Map signpost** (Phase 2) | Pick a destination, Ezra vanishes in a puff and reappears there |

Phase 1 links: Hero → GTID and Orbit → Ezra Bot by bridge or bounce pads (by height difference), GTID → Petak Umpet by
bridge, Petak Umpet → Orbit by minecart (the Game ↔ Discord district link).

**Art direction** (carried over from the approved sketch).
- Palette: sage/moss grass `#8ea769 #86a062 #97ae73 #7f995d`, earth `#94714f #8a6849 #9d7a57`, pale stone
  `#b5afa5 #a9a399 #bfb9af`, wood `#6b4f37`, planks `#b98f62`, roof `#b5674b`, sky `#8ab3d1 → #cbdce4`.
  Small per-block colour jitter; matte materials.
- Light: warm low sun with soft shadows, hemisphere fill, low-intensity environment map, light fog for depth,
  a blocky cloud sea below the islands.
- District moods: Game is warm (GTID orange `#FA5D19`, Petak Umpet's village); Discord is clean blue/white
  (Orbit `#3D62F8`); Web & Apps neutral.
- Pixel type (Pixelify Sans) only for small accents on signs; main readable text uses a calm grotesk.
- Never toy-like: no saturated rainbow blocks, no glossy plastic.

**How islands are made.**
- Star island: its own blueprint module (block layers + React props + interactables), e.g. `islands/Gtid.tsx`.
- Mini island: generated from a seed (= project `id`) plus a template (`workshop | shop | tower | garden | lab`).
  The same seed always yields the same island.
- Terrain is drawn as a few InstancedMeshes per island (only exposed faces' blocks are instanced); islands outside the
  camera frustum are skipped.

## 5. Content model

`src/config/portfolio.ts` stays the single content source. New/changed fields:

```ts
type District = "game" | "discord" | "web";
type IslandTemplate = "workshop" | "shop" | "tower" | "garden" | "lab";

interface Project {
  id: string;                    // slug, unique; also the island seed
  title: string;
  year: number;
  line: string;                  // one sentence: what it is / does (no process claims)
  stats?: string[];              // real numbers only, e.g. ["2,600 visitors / day", "16,000+ items"]
  tags: string[];
  district: District;
  tier: "star" | "mini";         // star = has its own blueprint module
  links: { demo?: string; github?: string; discord?: string; roblox?: string };
  screenshot?: string;           // shown on the mini island's screen
  island?: { template?: IslandTemplate; accent?: string };
}
```

- Adding a project = adding one entry. The world places the island, the tour path gains a stop near it, the sign shows
  its name, and the newest project gets a floating "NEW" balloon.
- Promoting a project to star = adding a blueprint module for its `id`; the config entry stays the same.
- A build-time validator (unit-tested) rejects duplicate ids, unknown districts and missing required fields.
- Phase 1 needs entries for the four stars; existing projects are migrated to the schema in Phase 2.

## 6. Modes and camera

**Tour (default).**
- Native page scroll drives a progress value along one smooth camera spline (position + look-at). The canvas is fixed;
  a tall scroll track behind it sets the pace, so scrollbar, keyboard and mobile momentum work normally.
- The camera never stops and starts: around each star island the path slows (more scroll per distance) so the island
  lingers, but motion stays continuous. Progress is damped for smoothness.
- The tour path follows the real crossings: it passes over bridges, arcs with the bounce pads, and rides along the
  minecart rail (with an empty cart rolling in sync) between districts, so a visitor who never presses Play still sees
  how the world connects.
- Interactive objects are clickable while touring.

**Entering Play.** Play button, any WASD/arrow key, or touching the joystick zone on a phone.
- At the hero island: seated Ezra stands up, stretches, and the camera glides behind him.
- Mid-tour: Ezra drops from the sky onto the island in view (landing dust).

**Play.** Third-person follow camera: drag to orbit, mouse wheel to zoom (page scroll is locked), soft auto-follow
behind Ezra while moving, pulls in if blocked.

**Leaving Play.** Esc or the Tour button: the camera returns to the nearest point on the tour path; Ezra stays where
he was left.

**SEO / accessibility mirror.** All world text (titles, lines, stats, links) is also rendered as visually-hidden
semantic HTML, so search engines and screen readers get the content WebGL can't expose.

## 7. Character and controls

**Model.** Voxel Ezra built from boxes (head, torso, arms, legs): black tee, short black hair, simple face (two eyes),
2 blocks tall. All animation is procedural: idle breathing, walk, run, jump, fall, landing squash, sit, stand-up stretch.

**Input.**

| Desktop | Phone |
|---|---|
| WASD / arrows move (camera-relative) | Floating joystick wherever the left thumb lands |
| Shift run · Space jump · E interact | Jump + interact buttons on the right |
| Drag orbit · wheel zoom · Esc back to tour | Drag on the right half to orbit |

**Movement feel (engine `physics/character.ts`).**

| Parameter | Value |
|---|---|
| Collider | AABB 0.6 × 1.8 × 0.6 blocks vs the voxel grid, resolved per axis (slides along walls) |
| Walk / run speed | 4.5 / 7.5 blocks/s, short acceleration ramp |
| Gravity | 30 blocks/s² |
| Jump | apex ≈ 1.5 blocks (v₀ ≈ 9.5 blocks/s) |
| Auto step-up | ledges ≤ 1 block climb without jumping; 2 blocks need a jump |
| Coyote time / jump buffer | 0.10 s / 0.12 s |
| Fall-off | below the island's lowest block − 20 → fade, respawn with a puff at the last safe island |

Footstep dust while running and a landing puff use the particle system.

**Crossings in Play** (engine `traversal/`).
- Bounce pad: on contact, solve the launch velocity for the paired pad under gravity 30 with a chosen apex
  (target ≥ 3 blocks above the higher pad); input is ignored until landing so the arc always lands. Pad squash +
  dust burst on launch and landing.
- Minecart: E at a station mounts Ezra; the cart follows the rail curve with an ease-in/ease-out speed profile
  (~4–6 s per link); the follow camera trails the cart; Ezra dismounts at the far station. Rides can't be cancelled
  mid-air.
- Bridges sway with a small spring driven by Ezra's position on them.

## 8. Interaction system

Every interactive object registers one descriptor; only the trigger differs by mode.

```ts
interface Interactable {
  id: string;
  label: string;                 // shown in-world, e.g. "Print a receipt", "Visit gtid.pro ↗"
  position: Vector3;             // anchor for label / E prompt
  hitbox: Box3;                  // invisible box used for pointer raycasts
  radius: number;                // Play-mode reach
  onActivate(ctx): void;
  enabled?: () => boolean;       // e.g. Orbit's Discord sign while its link is empty
}
```

| | Tour | Play |
|---|---|---|
| Discover | Hover lifts the object slightly, adds a soft glow, shows its label | Nearest object in front of Ezra shows an **E** bubble |
| Trigger | Click | E / phone button |
| Keyboard | Tab cycles objects on the island in view, Enter triggers | same |

Pointer raycasts test only the registered hitboxes, never the block instances.

**Phase 1 interactions.**
- Link signposts on star islands open the real sites in a new tab.
- Voxel title letters can be punched: blocks burst, then reassemble.
- Per island: Orbit kiosk prints a receipt; Ezra Bot replies with the next message; the Petak Umpet kid runs off to
  hide when approached; the GTID board toggles between price chart and mods online.
- Every interaction answers with a small squash, a sound and particles. No camera shake on calm islands (Petak Umpet).

## 9. Particles

One pooled InstancedMesh of small cubes, one draw call, ~800 live particles max. Each particle: position, velocity,
gravity, drag, lifetime, scale-out fade, colour.

| Preset | Use |
|---|---|
| `debris` | block bursts, coloured from the broken block |
| `dust` | footsteps, landings |
| `confetti` | brand-coloured cubes (rewards in later phases) |
| `leaves` | bumping a tree |
| `sparkle` | small emissive glints around the Diamond Lock |

API: `particles.burst(position, preset, options?)`. Reduced motion lowers counts.

## 10. Islands in Phase 1

| Island | Title (in-world) | Running program / props | Board (real numbers) | Signpost |
|---|---|---|---|---|
| Hero | Punchable voxel letters **EZRA BRILLIANT** | Seated Ezra swinging his legs, flag, tree; board: "I build bots, games and web tools that people use every day." | — | path to the Game district |
| GTID | Voxel letters **"GTID."** in `#FA5D19` | **Live price board**: DL / BGL buy & sell, 24 h chart, mods online with green dots. Stepped chart tower topped by a blue Diamond Lock with sparkles. Information, never trading. | 2,600 visitors / day · 16,000+ items | Visit gtid.pro ↗ |
| Petak Umpet | **Wooden sign with a little house** (after the game's logo) | Stilt house, trees, lanterns; softer, slower ambient motion; a school-uniform kid peeks from behind a tree and runs to hide when approached | 3.1M+ visits · 2.6K peak players | Play on Roblox ↗ |
| Orbit Store | **Orbit logo tile only** (traced from `showreel/brief/logo.jpg`: slanted rounded-square O, sharp skewed hole, white planet ring behind at the top and in front at the bottom, radial `#3D62F8 → #2C0B77` tile; mark and ring always white) | Market stall with QRIS board; click prints a receipt following Orbit's real flow: order → **QRIS · paid** → **delivered via DM**. Fictional product, no rupiah. Parcels hop off the stall. | 2,200+ orders · 890+ buyers | Join on Discord ↗ (`links.discord`, Ezra fills; inactive while empty) |
| Ezra Bot | Screen board with the bot's name | Blocky robot with chat bubbles; click for the next reply. Other users' messages are grey skeleton bars; only the bot's replies are readable. Grows into the About/Contact Q&A in Phase 2. | 1,000+ members | Add to Discord ↗ |

## 11. Live data (GTID board)

`server.js` gains `/api/gtid/*`, a server-side proxy with an in-memory cache (no browser CORS, no load on gtid.pro):

| Route | Upstream | Cache |
|---|---|---|
| `/api/gtid/price` | `https://gtid.pro/api/dl-price?endpoint=price` | 30 s |
| `/api/gtid/history` | `https://gtid.pro/api/dl-price?endpoint=history&period=1d&field=buy` | 120 s |
| `/api/gtid/mods` | `https://gtid.pro/api/game-status` (mods roster only) | 30 s |

On upstream failure the proxy serves the last good payload (marked stale); with nothing cached, the board shows a
bundled snapshot. The board never renders empty. The board redraws its canvas texture only when data changes.

## 12. Audio

- Phase 1: an audio module with a mute toggle (muted by default; unlocking follows the browser's first-gesture rule).
  SFX generated at runtime with ZzFX: click, hover tick, punch, block burst, jump, land, footstep, receipt printer,
  chat pop, link open. Kenney CC0 packs are the fallback for any organic sound ZzFX can't make convincing.
- Phase 4: one theme, one arrangement per district (chiptune near GTID, gamelan/angklung/suling colours in Petak Umpet,
  clean plucks for Discord), all with identical tempo, key and length. Composed in Tone.js, rendered offline
  (`Tone.Offline`) to small files, started together muted and cross-faded by proximity (vertical remixing).

## 13. Architecture

```
src/
  config/portfolio.ts          content + schema validation
  world/
    engine/                    framework-free TypeScript (unit-testable)
      voxel/grid.ts            VoxelGrid: set/get/isSolid, per-island chunks
      voxel/blueprint.ts       blueprint types, layer parser
      voxel/mesher.ts          blueprint → instanced batches (exposed blocks only)
      gen/rng.ts, gen/islandGen.ts, gen/layout.ts   seeded islands, district slots, path
      physics/character.ts     AABB vs grid, step-up, coyote, buffer
      traversal/ballistic.ts   bounce-pad launch solver (lands on the paired pad)
      traversal/rail.ts        minecart rail curve, speed profile, both directions
      camera/tourPath.ts       spline + chapter dwell mapping
      camera/followCam.ts      third-person follow
      particles/particles.ts   pool + presets
      audio/sfx.ts             ZzFX presets + mute
    scene/                     React Three Fiber components
      World.tsx, Sky.tsx, Island.tsx, islands/{Hero,Gtid,PetakUmpet,OrbitStore,EzraBot}.tsx,
      Ezra.tsx, Interactable.tsx, WorldText.tsx, Particles.tsx, TourCamera.tsx, PlayCamera.tsx,
      crossings/{Bridge,SteppingStones,BouncePad,Minecart}.tsx
    ui/                        Hud.tsx, MobileControls.tsx, SeoMirror.tsx, Loader.tsx, NoWebGL.tsx
    state/store.ts             zustand: mode, active island, settings (sound), player
server.js                      + /api/gtid proxy
```

- New dependencies (Phase 1): `three`, `@react-three/fiber`, `@react-three/drei`, `zustand`, `zzfx`; dev: `vitest`.
  Tone.js and Howler arrive in Phase 4.
- Hot paths (instancing, physics, particles, camera) mutate Three objects inside `useFrame`; React state is never set
  per frame. Zustand is read with selectors / transient subscriptions.
- World text uses drei `<Text>` (SDF, troika). The Phase 2 mailbox form uses drei `<Html transform>`.
- The existing sections (`hero.tsx`, `projects.tsx`, …) are retired when Phase 2 launches; their copy moves into the
  config and the world.

## 14. Performance

| Budget | Target |
|---|---|
| Frame rate | 60 fps on a mid laptop iGPU; ≥ 30 fps on a mid Android phone |
| Draw calls | ≤ ~200 |
| Textures | canvases ≤ 2048 px |
| Pixel ratio | ≤ 1.75 (high), ≤ 1.25 (low); lowered automatically when frame time climbs |
| Shadows | one sun shadow map, high tier only |
| Initial JS | aim ≤ ~350 KB gzip; no model files (world is generated) |

Quality tier is chosen from screen size and core count, then adapted at runtime. Loading shows the hero island
assembling from falling blocks. PageSpeed's performance score will drop from today's 96+; that trade-off is accepted.

## 15. Accessibility, SEO, fallbacks

- Hidden semantic HTML mirror of all world content (section 6). Meta tags and OG image kept.
- Keyboard: Tab/Enter on interactables in tour mode; full keyboard control in Play.
- `prefers-reduced-motion`: camera cuts instead of flights, no shake, fewer particles, no ambient bobbing.
- No WebGL or a very weak device: a simple static page with all content and links.

## 16. Testing

- **Unit (Vitest), engine only:** collision (wall slide, 1-block step-up, no 2-block step-up, coyote, jump buffer,
  respawn trigger); bounce-pad solver lands within 0.1 block of the paired pad in both directions; rail traversal
  is symmetric in both directions; crossing selection follows the rule table (height ≤ 2 → bridge, > 2 → pads,
  cross-district → minecart); tour progress → chapter mapping; seeded island determinism; config validation.
- **Visual:** headless screenshots of each tour stop on desktop (1280×720) and phone (520×940), the same pipeline used
  for the sketches.
- **Manual play checklist:** enter/leave Play from every island, every crossing in both directions (bridge, stones,
  bounce pads, minecart), every interactable in both modes, phone controls, sound toggle, reduced motion,
  no-WebGL fallback.

## 17. Rollout

Work happens on a new branch in this repo. The current site stays live until Phase 2 is done; deployment stays as it
is today (Vite build served by the Express server under PM2).

## 18. Content rules

- English only. Describe what each thing is and does, with real numbers; no process claims ("solo", "end-to-end",
  "self-hosted", "Dockerized").
- GTID is a price tracker + info site (alerts, mods online), never framed as trading.
- Orbit: never rupiah amounts or revenue; fictional products; logo and rings always white.
- Petak Umpet: calm; logo = wooden sign with a house.
- Ezra Bot: host Discord chrome as skeleton bars; only the bot's messages detailed. Chat times read "Today at HH:MM".
- POS Monosuko (Phase 2): one plain mini island, no UAT/SUS/testing figures.

## 19. Open items

- Orbit's Discord link: Ezra fills `links.discord` later.
- Exact shape of `/api/dl-price?endpoint=price` and `/api/game-status` payloads: confirm against gtid-web
  (read-only) when building the proxy.
- Voxel Ezra's look: start from the avatar photo (black tee, short black hair); Ezra reviews the model before the
  islands are dressed around it.
