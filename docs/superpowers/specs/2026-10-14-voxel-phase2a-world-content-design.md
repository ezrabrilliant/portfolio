# Voxel World Phase 2A: World Content: Design

Date: 2026-10-14 · Status: approved in brainstorming, awaiting spec review · Owner: Ezra Brilliant
Builds on: `2026-10-13-voxel-world-design.md` (Phase 1, done on branch `voxel-world`).
Reference sketch (approved direction for the mini islands): https://claude.ai/artifact/9uVPRD3CSYiHeFaQUh9wgg

## 1. Summary

Phase 2 makes the voxel world complete enough to replace the live site. It is split into five sub-projects, each
with its own spec → plan → build cycle:

| Sub-project | Scope | Depends on |
|---|---|---|
| **2A World content** (this spec) | Web & Apps district (plaza + 3 mini islands with live program screens), closeup camera, year milestones with a graduation moment, map signposts (fast travel), config/schema/SEO updates | Phase 1 |
| 2B Talk & contact | Ezra Bot Q&A for About/Contact, in-world mailbox contact form (needs a mail backend), resume | 2A |
| 2C Launch | No-WebGL fallback with all content, retire the old sections, deploy fixes, real-phone checks, merge | 2A, 2B, 2D, 2E |
| 2D orbit.ezrabrilliant.com | Small Orbit Store site + DNS + VPS; the Orbit signpost already links there | — |
| 2E Demo apps | The real POS Monosuko and Bee Furniture CRM frontends in a demo mode with an in-browser fake backend, translated to English, served at `/demo/monosuko/` and `/demo/bee/` | 2A (shared glossaries) |

Everything on the site is English. Proper names (Ayam Bakar Banjar Monosuko, Petak Umpet, PeduliPasal) and the
currency (Rp, English digit grouping: `Rp 30,000`) stay as they are.

## 2. Decisions

| Topic | Decision |
|---|---|
| Mini islands | Exactly three: **PeduliPasal**, **POS Monosuko**, **Bee Furniture CRM**. Not CineHub, Pay2Win, PawCare or the Portfolio Website; DL Price Prediction is part of GTID. |
| District | All three form the **Web & Apps** district at the **end of the tour**, reached by minecart from Ezra Bot. |
| Island build | **One hand-built module per island** (like the star islands). The spec-1 template system (`workshop | shop | tower | garden | lab`) is dropped: each island is unique and templates would make them look alike. |
| Screens | **Live redrawn program UI** on all three islands (no screenshots), copied from each app's real source, translated to English. |
| Trying the real apps | The island link signs open the real frontends in demo mode (sub-project 2E). Until 2E ships, those two signs stay inactive (greyed). |
| Reading the screens | A **closeup** camera state: click a screen to glide square-on to it, click again to use it. |
| Education | Three **year milestones** on the Hero → GTID bridge; the 2026 one triggers a **graduation moment**. |
| Fast travel | A **map board on every island** (9 boards). |

## 3. World layout

### 3.1 Web & Apps district

- **Plaza** (`id: "web-plaza"`): a new island kind `hub` with no project. It sits on the existing Web & Apps district
  slot (`DISTRICT_HUBS.web`, origin `{x: 66, y: 4, z: 22}`, radius 6, south of Orbit). It holds the minecart station,
  a district sign reading **WEB & APPS** (Pixelify Sans on a plank board), a map board, two lamps, flowers and a tree.
- **Minecart Ezra Bot → plaza**: Ezra Bot (y 14) and the plaza (y 4) are in different districts, so the existing
  crossing rule already selects a minecart. Same rail, cart, station and speed profile as Petak Umpet → Orbit.
- **Chain of minis**: plaza → POS Monosuko → Bee Furniture CRM → PeduliPasal, each link a plank bridge, so the chain
  forms an arc and the tour moves forward without doubling back through the plaza. The sketch's spoke bridges are
  replaced by this chain.

### 3.2 Layout engine changes (`engine/gen/layout.ts`)

- `IslandKind` gains `"hub"`. `buildLayout` emits the `web-plaza` hub whenever at least one `web` project exists.
- Minis in the `web` district are placed in **config order** along a chain from the hub (instead of golden-angle
  satellites). Rules, each unit-tested:
  - consecutive islands' rims are 6–9 blocks apart (bridge length);
  - consecutive height difference ≤ 2 blocks, so `chooseCrossing` returns `"bridge"`;
  - no island overlaps any other (existing `overlaps()` margin);
  - the chain runs along the tour camera's right vector (`VIEW_R`) with alternating depth offsets, so each new island
    enters the frame from the right, like the main chain;
  - placement is deterministic.
- Minis in other districts keep the satellite placement (none exist today).
- The tour order is derived instead of hard-coded: `hero, gtid, petak-umpet, orbit-store, ezra-bot`, then
  `web-plaza`, then the web minis in config order.

### 3.3 Tour

Hero → GTID → Petak Umpet → Orbit → Ezra Bot → *minecart* → Plaza → POS Monosuko → Bee Furniture CRM →
PeduliPasal (end). Mini tour stops use the shared framing (`framing.ts`) at a closer distance suited to radius-4
islands, centred on each island's screen. Props on every new island face the tour camera heading (`VIEW_F`), like
the star islands.

## 4. Mini islands

Each island is a module in `scene/islands/` registered alongside the star islands (`STAR_ISLANDS` becomes an island
registry that holds both tiers), with its own footprint cells stamped as collision. Terrain comes from
`generateIsland` (radius 4, depth 4). Each module owns: props (one `PropBlocks` instanced batch where possible), its
live screen, an info board and a link sign.

| Island | Building and props | Screen | Link sign |
|---|---|---|---|
| **POS Monosuko** | Small grilled-chicken restaurant: stone floor, plank back wall, counter, green-and-white awning (POS green `#1f7a4d`), the restaurant's round logo badge on a post above the awning, a charcoal grill with chicken pieces and rising smoke puffs, a table with two stools | POS cashier screen (landscape, 3.4 × 2.125 blocks) on the back wall above the counter | "Try the POS ↗" → `/demo/monosuko/` (inactive until 2E) |
| **Bee Furniture CRM** | Woodworking shed: plank floor, two walls, sloped roof, workbench with a half-built chair and a hand saw, log pile, a small bee buzzing figure-eights around the shed | CRM admin dashboard (landscape, 3.4 × 2.125) on a monitor stand in front of the shed | "Try the CRM ↗" → `/demo/bee/` (inactive until 2E) |
| **PeduliPasal** | Reading pavilion: stone floor, four posts, flat roof, a bookshelf of statute books, scales of justice on a small table (gently tilting), a tree | Chat screen inside a giant phone (portrait, 1.25 × 2.708) on a stone plinth | "Get the APK ↗" → the GitHub release (`aliefauzan/Bangkit-Project-PeduliPasal`, tag 1.5.3) |

Island boards (info board: title, line, year · tags):

- **POS Monosuko** · *A point-of-sale for a grilled-chicken restaurant: orders, tables, bills and portion stock.* ·
  2026 · React · Express · MySQL
- **Bee Furniture CRM** · *A CRM for a furniture maker: customers, products, sales and promos in one dashboard.* ·
  2025 · React · PostgreSQL
- **PeduliPasal** · *An Android chatbot that names the article of Indonesian criminal law that fits a described
  offence.* · 2024 · Kotlin · TensorFlow · Gemini

No stats on the mini boards (no real figures worth showing; Monosuko must never show testing figures).

## 5. Live screens

### 5.1 Structure

- `scene/islands/shared/LiveScreen.tsx`: one component for every program screen. It owns a canvas texture
  (logical size × 2 pixel scale), redraws only when the app state changed or the app reports it is animating (max
  15 fps), maps a pointer hit (raycast → UV → logical px) to the app's hit regions, and runs the app's idle demo.
- Each program is a framework-free module pair under `scene/islands/<app>/`: a **model** (state + pure actions) and a
  **draw** function, so the logic is unit-testable without WebGL. Shape:

```ts
interface HitRegion { x: number; y: number; w: number; h: number; action: string; arg?: number }
interface ScreenApp<S> {
  logical: { w: number; h: number };
  init(now: Date): S;
  act(s: S, action: string, arg: number | undefined, t: number): S;   // visitor input
  auto(s: S, t: number): S | null;                                    // idle demo step, null when it did nothing
  busy(s: S, t: number): boolean;                                     // animating (typing, toast, pulse)
  draw(ctx: CanvasRenderingContext2D, s: S, t: number): HitRegion[];
}
```

- **Idle demo**: when untouched, each screen plays its app by itself (adds orders and pays, records sales, runs the
  chat). After visitor input the demo pauses for 7 s. Demos only run while their island is in view.
- **Strings**: every visible string lives in one glossary file per app (`<app>/strings.ts`, English). 2E reuses the
  same glossaries to translate the real demo builds, so the mockup and the demo read the same.
- **Assets**: the six menu photos (as one sprite) and the logo badge are copied from the POS repo into
  `public/world/monosuko/` as small WebP. Bee and PeduliPasal need no images.

### 5.2 POS Monosuko (from the real "Input Order" page)

- Look: light theme, page `#f4f4f3`, white cards/sidebar/panel, borders `#e8ece9`, green `#1f7a4d` (prices
  `#1a623e`, tints `#f0faf3` / `#ddf3e5`), text `#1a201c` / `#5a655e` / `#6c756f`, Inter (fallback to the site's
  grotesk), 12 px card / 6 px button radii.
- Layout: sidebar (logo badge, "Ayam Bakar Banjar Monosuko", "Point of Sale", nav: Home, **Transactions** (active),
  Tables, History, Close Register, Stock) · header "Input Order" / "Morning shift" · search "Search menu…" · pills
  All, Grilled Chicken, Value Meals, Soups & Veg, Drinks · 3 × 2 menu cards (photo, name, variant/combo badge, price,
  stock badge) · order panel ("Order", "N items", Dine-in/Takeaway, "Choose a table" 1–9 with 2 and 7 occupied, order
  lines "Rp 30,000 × 2", empty state "No items yet" / "Pick a menu item to start the order.", Subtotal, "10%
  restaurant tax (PB1) is added at payment.", Save, **Pay**) · payment confirmation ("Payment", "Table N", total, check).
- Menu (seed prices): Grilled Chicken Piece (Variant) Rp 30,000 · Combo A (1 pax) (Combo) Rp 50,000 · Chicken Tauco
  Soup Rp 35,000 · Smashed Beef Empal Rp 25,000 · Steamed Rice Rp 10,000 · Iced Tea (Variant) Rp 8,000.
- Stock badges (portion items only), counting what is already in the order: green number → amber "N left" below the
  item's minimum → red "Sold out" at 0 (card faded to 60 %, not addable).
- Actions: tap a card to add it; tap a free table to select it; Pay commits the order, lowers stock and shows the
  confirmation for 1.6 s. When every portion item is below its minimum, the shift restocks (demo never runs dry).

### 5.3 Bee Furniture CRM (from the real `DashboardHome`)

- Look: page `#f9fafb`, white sidebar/header/cards (card shadow `0 4px 12px rgba(0,0,0,.08)`), indigo `#4F46E5`,
  active nav `#3E37F7` on `#f5f5ff` with a 3 px bar, text `#1F2937` / `#4B5563` / `#6b7280`, Inter.
- Layout: sidebar (indigo circle with 🐝, "Bee Furniture Admin", nav Dashboard (active), Customers, Products,
  Transactions, Promo, Analytics, Task To Do, Tickets, About) · header "Dashboard", "+ Add New", "Logout", search, "JD"
  avatar · "Main Dashboard" / "Monitor your business performance in real-time." · KPI cards Total Revenue
  (`#10B981`), Total Customers (`#3B82F6`), Total Transactions (`#F59E0B`), Active Promotions (`#8B5CF6`) · "Sales Trend
  (Last 7 Days)" line chart (dashed grid, Rp axis, `YYYY-MM-DD` dates, legend "Daily Revenue (Rp)") · "Upcoming Tasks"
  with View All (dot, task, "Due: Mon DD, YYYY", Pending/Completed badge).
- Data (example data, marked as such in code): KPIs start at the seed values (Rp 4,781,000 · 3 · 6 · 2). The 7-day
  series is example data built from the seed product prices (Rp 1,250,000 / 950,000 / 175,000). Tasks: "Prepare the
  monthly report" (due today, pending), "Check ergonomic chair stock" (due in 2 days, pending), "Follow up with
  customer Budi" (last week, completed).
- Actions: tap the chart card to record a sale (today's point, revenue and transaction count rise, the new point
  pulses); tap a task to toggle it. When today's value passes a cap, the series shifts one day.

### 5.4 PeduliPasal (from the real chat screen, night theme)

- Look: background `#111318`, text `#E2E2E9`, user bubble `#284777` (right), bot bubble `#44474E` (left), 8 dp corners,
  timestamps "HH.mm" `#C4C6D0` beside the bubble's inner side, accent `#AAC7FF`, Roboto. Status bar; toolbar with back
  arrow, chat topic title and share icon; indeterminate progress line while the bot answers; outlined pill
  suggestion chips; filled input "Type your message here" with a paper-plane send; ≡ FAB bottom-left and ↓ FAB
  bottom-right (as in the capstone screenshots); Android nav bar.
- Conversations (each a separate chat; the topic title changes). All content is the app's own, translated:
  1. **"Hit-and-run"**, from the capstone presentation screenshots: user *"Hi, I'd like to ask: in a hit-and-run
     case, which article would it violate?"* → bot *"To answer your question about the hit-and-run case, I need more
     detail. The article violated depends on several factors, including: 1. Was anyone killed? 2. Was anyone injured?
     3. How badly were the vehicle and/or other property damaged? 4. Did the driver flee the scene? 5. Was it
     negligence or intent? With more complete information I can identify the right article in the Road Traffic and
     Transport Law and the possible penalty. Please give more detail so I can answer more accurately."*
  2. **"Motorcycle theft"**, from the app's Gemini prompt examples: user *"Which article fits a motorcycle theft
     case?"* → bot *"Article 362: Whoever takes property belonging to another with the intent of unlawfully owning it
     is punishable by up to 5 years in prison or a fine of up to Rp900,000."* → user *"What if it happened at night,
     by two people?"* → bot *"Article 363: Aggravated theft (for example at night, or by two or more people).
     Penalty: 7 years in prison."*
- Chips (the repo's hard-coded set, translated): "Which article fits a motorcycle theft case", "Which article covers
  a land dispute", "Explain the articles on inheritance cases".
- Actions: tap the phone to advance (user message appears, progress line ~1.1 s, the bot answer types in). The
  conversations loop.

## 6. Closeup camera

- A new camera state on top of Tour and Play: `closeup: { targetId } | null` in the store.
- **Enter**: click/tap a screen or map board, or E / Enter on a focused one. The camera glides square-on to the target
  so it fills ~85 % of the frame height (or ~90 % of the width on narrow screens), computed from the target's world
  transform and size, re-evaluated each frame (islands bob).
- **While close**: pointer input goes to the target (raycast against its plane only → UV → hit regions). Ezra stays
  where he is.
- **Exit**: Esc, a "Back" button in the HUD, tapping outside the target, page scroll (Tour) or movement keys (Play).
  The camera returns to the tour path point or the follow camera.
- Reduced motion: cut instead of glide.
- Initially used by the three mini screens and the map boards. The GTID board and the Ezra Bot screen can opt in
  later without changes to the mechanism.

## 7. Year milestones and the graduation moment

### 7.1 Milestones

Three short stone pillars with a carved plaque facing the tour camera (year large in Pixelify Sans, one line in the
grotesk), placed along the Hero → GTID bridge. They are collision barriers and clickable (squash + sound), but they
are not tour stops: the camera slows slightly while passing.

| Year | Plaque | Placement |
|---|---|---|
| 2022 | Started Business Information Systems · Petra Christian University | Hero island, beside the bridge head |
| 2024 | Bangkit Academy · Mobile Development, graduated with Distinction | Its own small floating stone beside the bridge midpoint (off the walking path and the stepping stones) |
| 2026 | Graduated · Business Information Systems, Petra Christian University | GTID side, beside the bridge head |

Facts verified against Ezra's Bangkit graduation letter and certificate ("Graduated with Distinction", Bangkit 2024
Batch 2, Mobile Development, 6 Sep – 31 Dec 2024). The old config's "top graduate / top student in the cohort" is not
used anywhere.

### 7.2 Graduation moment

- **Play**: the first time Ezra comes within 2.5 blocks of the 2026 milestone in a session, a voxel graduation cap pops onto his head
  (added to the head part in `Ezra.tsx`, toggled by a runtime flag) with a pop sound and a `confetti` burst. The cap
  stays for the session. Clicking the milestone replays the confetti.
- **Tour**: Ezra is seated on the Hero island, so when the tour camera's progress passes the 2026 milestone's
  position on the Hero → GTID segment, a cap is tossed into the air
  from it (a short arc with spin) with confetti, once per page load; clicking replays it.
- Cap shape and colours (and whether a sash or gown is added) follow Ezra's graduation photo, which he will provide
  as the reference.

## 8. Map signposts (fast travel)

- One map board per island: Hero, GTID, Petak Umpet, Orbit, Ezra Bot, plaza, POS Monosuko, Bee Furniture CRM,
  PeduliPasal. Each stands near the island's arrival point (bridge head or station).
- The board is a canvas drawn **from the live layout** (island outlines from above, bridges, rails, island names, a
  "You are here" marker), so new islands appear on it automatically. It is a `LiveScreen` with one hit region per
  island.
- **Use**: activate → closeup on the board → pick an island.
  - **Play**: a dust puff at Ezra, he vanishes, the camera moves, and he reappears on the destination island at a safe
    landing column (existing `landingColumn`) with a landing puff.
  - **Tour**: the closeup exits and the page scrolls to that island's stop (existing `scrollToIsland`).
- Keyboard: Tab to the board, Enter, arrow keys move between islands on the map, Enter travels.

## 9. Content model and config

- `worldProjects` gains three entries (`tier: "mini"`, `district: "web"`): `pos-monosuko` (2026), `bee-furniture-crm`
  (2025), `pedulipasal` (2024), with the lines and tags in section 4.
- Schema (`config/schema.ts`):
  - remove `screenshot` and `island.template` (and the template list): leftovers of the dropped template plan;
  - links: accept `https://…` **or** a site path starting with a single `/` (e.g. `/demo/monosuko/`), so demos also
    work in local preview;
  - new `Milestone { year: number; title: string; line: string; moment?: "graduation" }` and `validateMilestones`:
    years ascending and in 2000–2100, title/line required, no process claims, at most one `graduation` moment.
- `milestones` data lives in `config/portfolio.ts` next to `worldProjects`.

## 10. SEO mirror

`SeoMirror` lists all world projects (stars and minis, with their links) and a new **Education** section rendered
from `milestones`. Link label for internal demo paths: "Try".

## 11. Performance

- Budget stays ≤ 200 draw calls. Phase 1 peaks at 148. Estimate: ~8 per mini island, plus the plaza, milestones and
  nine map boards, ≈ 185 in the widest view. Mitigations: static props per island in one instanced batch
  (`PropBlocks`), frustum culling, map boards and milestones batched per island.
- Live screens redraw at most 15 fps and only while visible and changing; canvases ≤ 2048 px.
- The widest views (plaza, Hero → GTID) are measured in a real browser with the dev `RenderStats`, not estimated.

## 12. Testing

- **Unit (Vitest)**: POS model (stock never negative, "N left" below minimum, sold-out cards not addable, Pay clears
  the order and lowers stock, restock rule); CRM model (sale raises KPIs and today's point, day shift, task toggle);
  chat model (order of messages, loading then typing, conversation loop); web-district placement rules (§3.2) and
  derived tour order; crossing kinds (Ezra Bot → plaza minecart, chain bridges); milestone and link validation;
  map-board hit regions → island ids; closeup pose (target fills ≥ 80 % of the frame at 16:9 and 9:19.5).
- **Visual**: headless shots (`npm run shot`) of the new stops and of each screen in closeup, desktop 1280×720 and
  phone 520×940.
- **Manual checklist** additions: closeup enter/exit in Tour, Play and on a phone; every map board in both modes;
  the graduation moment once per session in both modes; minecart Ezra Bot ↔ plaza both ways; idle demos pause after
  input and resume.

## 13. Out of scope and open items

- Out of scope: 2B (Ezra Bot Q&A, mailbox, resume), 2C (launch, retiring the old sections and the stale "Business
  Information Systems Student" title), 2D (Orbit subdomain), 2E (demo apps and their translation).
- Open: Ezra's graduation photo as the reference for the cap (§7.2). Bangkit's selection figure (4,636 selected from
  45,000+ registrants) is available for 2B's Q&A if wanted.

## 14. Content rules (recap)

English only; describe results, never process ("solo", "end-to-end", "self-hosted", "Dockerized"); real numbers only;
no testing figures for Monosuko; Bangkit wording is "graduated with Distinction"; translations of app content stay
faithful to the source and never add legal or product claims of their own.
