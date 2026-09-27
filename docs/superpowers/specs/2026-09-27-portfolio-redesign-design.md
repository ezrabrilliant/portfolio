# Portfolio Redesign — Design Spec

**Date:** 2026-09-27
**Status:** Draft v3 — format locked: EzraOS (mini operating system). Landing-page anatomy permanently rejected. Visual/interaction validation via mockup 2026-09-27-mockup-ezra-os.html.
**Approved direction:** brand-new theme, zero inheritance from the current dark/teal design. User granted full creative license ("kalau kamu punya ide, gunakan").

> **History.** v2 explored three page-format directions (a-bursa, b-ledger, c-arena). Ezra
> rejected all three as "still feels like a landing page". He then explicitly chose the
> format **Mini OS ("EzraOS")**, full experience only, with **no** conventional fallback /
> HR mode. Everything in v2 except the content rules and the banned-generic-tells list is
> superseded by this document.

## Content rules (locked, from Ezra's feedback 2026-09-27)

- **BANNED as headline or metric anywhere:** "UAT 73/73", SUS scores, infra cost ($/month),
  VPS size ("1 GB"), "served from my own VPS", and any framing of self-hosting as cheapness.
- **Lead metrics, strongest first:**
  1. 2,700+ paid orders / 370+ unique buyers — Orbit Store (QRIS/Midtrans)
  2. 3.1M visits and 2.6K peak CCU — Petak Umpet
  3. ~14.5k requests/day — GTID
  4. 1,000+ members — Ezra Bot
  5. "41% faster transactions" — POS Monosuko
- **Systems board:** must include Orbit Store with the honest status "shipped", and must
  accommodate future rows (Ezra will deploy new systems at his new job — never name the
  employer without asking him).

## Banned generic tells (kept from v2 design review)

No gradients, no glows, no glass. No single-word color accent inside headlines; no
tracked-out ALL-CAPS eyebrow labels; no `01/02/03` numbered markers on non-sequences; no
middle-dot meta strings; no `→` appended to links; no uniform rounded cards; no uniform
opacity/translate fade-ups per section. Tech stacks are written as a plain sentence, never
as badge clouds.

## 1. Intent

The portfolio is not a page *about* Ezra's software — **it is Ezra's software.** EzraOS is a
small operating system whose pre-installed apps are his real product genres (a Discord-style
bot, a market exchange, a POS cashier, a task monitor, a game), filled with his real data.
Visitors **use** it, not read it.

Why: Ezra builds and runs production systems with real users and real money — a Discord
commerce bot with 2,700+ paid orders from 370+ unique buyers, a Roblox game with 3.1M visits
and 2.6K peak concurrent players, a market API doing ~14,500 requests/day, a Discord AI bot
serving a 1,000+ member community, and a restaurant POS that cut transaction time by 41%.
Any page layout (hero → sections → contact) reads as a landing page regardless of styling;
an operating system made of his own product genres cannot be mistaken for anyone else's.

Success criteria:

- Within the boot sequence (~2 s) a visitor understands "this person ships and operates real systems".
- Nothing in EzraOS could be copy-pasted onto another developer's portfolio.
- Every app is usable, not decorative: each one answers a real visitor question
  (who is he, what runs, what did he build, how do I reach him).
- Every number shown is real and verifiable. No invented stats ("500+ learning hours" dies).

## 2. Structure

The old page sections (hero, systems, selected work, ship log, contact, skills badge cloud,
animated background, scroll progress bar, intro overlay, avatar hero) are removed entirely.
There is no scrolling page. Mapping from old sections to apps:

| Old section | New home |
|---|---|
| Hero / About narrative | **Bot** app + "About Ezra" window |
| Systems board | **Monitor** app |
| Selected work + archive | **Market** app (featured) + **Files** app (full archive) |
| Ship log (experience + education) | Bot `/experience` + "About Ezra" window |
| Contact | **Kasir** app, Bot `/contact`, Terminal `contact` |

### 2.1 Boot sequence (~2 s)

The site's **single orchestrated motion moment.** Ink background, amber monospace log lines
that "start" his real systems, e.g.:

```text
mounting /projects ........ 12 found
starting ezra-bot ......... 1,000+ members connected
market feed ............... ~14.5k req/day
roblox bridge ............. 3.1M visits recorded
orbit store ............... 2,700+ orders settled
```

- The `/projects` count is derived from `portfolio.ts` at build time (currently 12 entries),
  never hard-coded.
- Skippable: any click or keypress jumps straight to the desktop.
- `prefers-reduced-motion`: boot is skipped entirely; the desktop renders immediately.
- Boot plays on every full page load in v1 (no "seen before" persistence — see §7).

### 2.2 Desktop

- **Wallpaper:** deep ink-indigo `#1E2333` with a faint tile-plus grid motif (a nod to
  Growtopia being a 2D tile game — the origin of GTID).
- **Top menu bar:** left, an "EzraOS" menu whose item "About Ezra" opens the About window
  (short bio, education, ship log); right, a real clock in WIB (Asia/Jakarta, UTC+7,
  updates each minute) and a status indicator reading "all systems live".
- **Desktop icons:** one per app (Bot, Monitor, Market, Kasir, Files, Terminal) plus the
  Petak Umpet icon (§2.3.7). Double-click (or Enter when focused) opens an app; single tap
  on touch.
- **Dock / taskbar:** bottom bar listing open and minimized windows; clicking an entry
  focuses or restores that window.
- **Default state after boot:** the Bot window opens focused, so a first-time visitor is
  greeted and guided instead of facing an empty desktop.

### 2.3 Apps

Each app is one of Ezra's real product genres, filled with his real data from
`src/config/portfolio.ts`.

#### 2.3.1 Bot — chat, Discord-DM style

- Ezra Bot greets the visitor and guides them. v1 is a **scripted command tree**, not AI.
- Commands offered as tappable chips (and typeable): `/projects`, `/systems`,
  `/experience`, `/contact`.
  - `/projects` → short list with hero metrics; each item opens its Market case-study window.
  - `/systems` → summary of live systems; offers to open Monitor.
  - `/experience` → the chronological ship log, one line per event, sourced from the
    existing `experience` / `education` config data.
  - `/contact` → email, GitHub, LinkedIn; offers to open Kasir.
- Unknown input gets a friendly reply that lists the four commands.
- Future hook (not v1): wire to his real Gemini + GPT engine.

#### 2.3.2 Monitor — task-manager style

Processes = his production systems. Columns: process, what, metric, status.

| process | what | metric | status |
|---|---|---|---|
| Orbit Store | Discord commerce, QRIS payments | 2,700+ orders | shipped |
| GTID | market platform + public API | 14.5k req/day | live |
| Petak Umpet | Roblox game | 3.1M visits | live |
| Ezra Bot | community AI with RAG memory | 1,000+ members | live |
| POS Monosuko | restaurant POS (thesis) | 41% faster checkout | live |
| *next system* (dimmed) | *deploying soon* | — | — |

- Rows come from a `liveSystems` array in config so new systems are added as data, not code.
- Status values are **static config values** in v1 (no uptime pinging — see §7).
- Selecting a row opens that system's case-study window (same window as Market).

#### 2.3.3 Market — "EZRA Exchange" (GTID vernacular)

- Projects listed as tradable assets: ticker-style name, one hero metric, a small
  sparkline. Featured assets first (the five lead-metric projects in the locked order),
  then the rest.
- Sparklines are **decorative shape only** — they must not carry axis values or imply
  historical data that does not exist. No fake price numbers.
- Opening an asset shows the **case study window**: one paragraph, the hero metric large,
  tech as a plain comma-separated sentence, links (live / repo where available).

#### 2.3.4 Kasir — POS (Monosuko / Orbit vernacular)

- A cashier screen. The visitor "orders" items: **Resume PDF**, **Contact card**,
  **Project list**. All items are free (price `Rp 0`).
- Checkout prints a **receipt** in the window containing the answers: resume download link
  (`/resume.pdf`, already in `public/`), contact details, project list with hero metrics.
- The receipt is downloadable as a plain-text `.txt` file generated client-side (no PDF
  library added for this).

#### 2.3.5 Files — archive

- The full project archive as folders by year; each file opens the same case-study window.
- Requires a `year` field on each project in `portfolio.ts` (not present today). Years are
  **data values → confirm with Ezra before writing them.**

#### 2.3.6 Terminal

- Commands: `help`, `whoami`, `projects`, `contact`, `clear`. Output mirrors the Bot's
  content in plain-text form.
- Easter eggs allowed (non-persistent, see §7). Unknown command → `command not found; try help`.

#### 2.3.7 Petak Umpet icon — hide-and-seek

- A desktop icon that flees from the cursor when the pointer comes within a short radius,
  staying inside the desktop bounds.
- Catching (clicking) it 3 times opens the Petak Umpet case-study window.
- Keyboard and screen-reader users: the icon is focusable and opens the window on Enter
  directly (no chase). Under `prefers-reduced-motion` it stays still and a single click
  opens the window.
- Signature personal touch; there is exactly one such toy on the desktop.

### 2.4 Mobile — phone-OS mode

Below the desktop breakpoint (pointer: coarse or width < 768 px), the metaphor adapts
instead of dying:

- Home screen: icon grid on the same wallpaper; status bar with the WIB clock.
- Apps open **full-screen** with a back control; one app visible at a time.
- **No** window dragging on touch.
- Petak Umpet icon: touch has no hover, so it cannot flee from an approaching pointer.
  Instead it hops to a random free grid slot each time it is tapped; the 3rd tap opens its
  window (reduced motion: first tap opens it, as on desktop).
- Boot sequence follows §2.1 unchanged (tap skips it).
- Minimum supported width: 360 px.

## 3. Window manager

- **Single state store** for all windows: id, app, open/minimized, position, size,
  z-order, focused.
- Draggable windows by title bar — **desktop only**.
- Click anywhere in a window focuses it and raises it to the top of the z-order.
- Close and minimize buttons; minimize sends the window to the dock.
- Sensible default placement: new windows cascade from the top-left of the free area and
  are always fully within the viewport.
- `Esc` closes the focused window.
- Keyboard cycling between open windows via one shortcut. The binding is fixed during
  implementation, must not collide with browser or OS shortcuts (so not `Alt+Tab` or
  `Ctrl+Tab`), and is listed in Terminal `help` and the "About Ezra" window.
- Tab order stays inside the focused window (focus containment); focus returns to the
  launching icon or dock entry when a window closes.
- **All windows are DOM** (no canvas-rendered text) for accessibility and SEO. App content
  must be indexable: either pre-rendered into the HTML at build time or exposed via a
  `<noscript>` block containing the bio, the lead metrics, and the project list.

## 4. Visual language

> To be validated by the mockup; not final until Ezra approves it.

NOT Windows-95 grey kitsch, NOT a macOS clone. Printed-matter feel: flat, hard-edged.

| Token | Hex | Role |
| --- | --- | --- |
| `desk` | `#1E2333` | Desktop / wallpaper (deep ink-indigo), tile-plus grid motif |
| `paper` | `#F4F1E8` | Window body background |
| `ink` | `#1D1B16` | Window text; 1 px solid borders; inactive title bar background; boot background |
| `amber` | `#FFB300` | Active title bar background; boot log text |

- Windows: `paper` body, `ink` text, 1 px solid `ink` border, hard flat offset shadow
  (no blur).
- Active window title bar: `amber` background, `ink` text. Inactive title bars: `ink`
  background, `paper` text.
- Boot screen: `ink` background, `amber` log text.
- Type: **IBM Plex Mono** for OS chrome (menu bar, title bars, terminal, boot);
  **IBM Plex Sans** for app content. Numbers use tabular figures.
- Retired: Archivo, Spline Sans Mono, Space Grotesk, Plus Jakarta Sans, JetBrains Mono,
  and the v2 `kertas`/`tinta`/`merah`/`abu`/`layar` palette.

**Contrast (WCAG 2.1 relative-luminance formula, computed 2026-09-27):**

| Pair | Ratio | AA (4.5:1) |
| --- | --- | --- |
| ink on paper | 15.23:1 | pass |
| ink on amber | 9.59:1 | pass |
| paper on ink | 15.23:1 | pass |
| amber on ink | 9.59:1 | pass |
| paper on desk (icon labels, menu bar) | 13.84:1 | pass |
| amber on desk | 8.71:1 | pass |

Any colour added during implementation (e.g. a muted secondary text, the dimmed "next
system" row, status colours) must be computed the same way and pass ≥ 4.5:1 for text
before it ships. Visible keyboard focus on every interactive element.

## 5. Motion

- **GSAP only** (^3.13). **framer-motion is removed.**
- Boot = the one orchestrated sequence.
- Window open / close / minimize = fast scale + translate snaps (well under 200 ms).
- Everything else answers user action (drag, hover, the fleeing icon). No ambient loops
  except the clock updating.
- `prefers-reduced-motion`: boot skipped, window snaps become instant, Petak Umpet icon
  does not flee.

## 6. Technical decisions

- Keep: React 19, Vite, Tailwind 4, TypeScript, `src/config/portfolio.ts` as the single
  content source, Cloudinary image helper, Express server + Docker/Caddy deployment.
- Add: `gsap` (^3.13). Remove: `framer-motion`. Remove `lucide-react` where feasible
  (app icons are drawn for EzraOS, not taken from an icon set).
- One window-manager state store (§3); apps are components rendered inside a shared
  window frame.
- All components rewritten; old components deleted, not themed-over.
- Content additions to `portfolio.ts`: `liveSystems` array (name, what, metric, status),
  `shipLog` array, and a `year` field per project. Ask Ezra before changing or inventing any
  *data* value; OS/UI copy is design-owned.
- **Task — rewrite the copy in `src/config/portfolio.ts` during implementation** so project and
  experience descriptions lead with scale/money metrics (orders, buyers, visits, requests,
  members) instead of UAT/SUS. Today's POS Monosuko copy (project description and experience
  achievement) puts "UAT 73/73" and "SUS 75.8" ahead of the 41% result — the root cause of
  every AI tool over-emphasizing UAT.
- EmailJS (`@emailjs/browser`) has no home in the v3 structure. **Open decision for Ezra:**
  drop it, or add a "Kirim pesan" item to Kasir. Do not add it without his answer.
- Quality floor: works from 360 px, WCAG AA contrast (§4), full keyboard operability (§3),
  `prefers-reduced-motion` respected, PageSpeed target ≥ 95 (fonts subset + preloaded).

## 7. Out of scope (v1)

- Real AI chat backend (Bot is scripted; Gemini + GPT hook is future work).
- Real uptime pings (Monitor statuses are static config).
- Multiplayer, and any persistence of easter eggs, window layout, or "boot already seen".
- **HR / conventional fallback mode — explicitly rejected by Ezra (2026-09-27). Do not
  re-add a "simple view", "skip to resume page", or scrolling-page alternative in future
  sessions.** The Kasir resume item and the `<noscript>` content (§3) are the only
  plain-content paths.
- Dark/light theme toggle, blog, routing/subpages, CMS, i18n toggle (Indonesian appears as
  deliberate accents — "Kasir", "Kirim pesan" — not a full translation).

## 8. Reference

Rejected v2 direction mockups — **superseded**, kept on disk as history only. Ezra rejected
all three as "still landing pages":

- `docs/superpowers/specs/2026-09-27-mockup-a-bursa.html`
- `docs/superpowers/specs/2026-09-27-mockup-b-ledger.html`
- `docs/superpowers/specs/2026-09-27-mockup-c-arena.html`

Current reference (being generated; throwaway, not production code — open directly in a
browser):

- `docs/superpowers/specs/2026-09-27-mockup-ezra-os.html`
