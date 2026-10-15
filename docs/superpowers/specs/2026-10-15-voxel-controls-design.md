# Voxel world controls redesign (scheme A, "Thumb corners")

Date: 2026-10-15. Branch `voxel-world`. Mockups: https://claude.ai/artifact/QyV8Tp7u7eGxZgk1Z5w96x

Scope: only the controls and their on-screen UI (camera, collision feel, HUD, hints, buttons, joystick, interaction
prompts, closeup entry/exit, map/travel access). No new islands or content.

## Problems Ezra reported
- **Camera:** no zoom on phones; a prop behind Ezra pulls the camera in, and it jitters back and forth.
- **Collision:** every prop blocks as a whole 1 × 1 block. For example, the jemuran on Petak Umpet can't be reached from
  the bridge, and jumping doesn't help.
- **Tour on phones:** swiping left/right should move between islands.
- **Everything else:** HUD, closeup entry/exit, and desktop movement and camera need a pass too.

## Design

### 1. Camera (PlayCamera, pullIn)
- **What holds the camera back:** only the voxel grid. After step 2 the grid holds just terrain and buildings, so props
  never pull the camera in.
- **Probing:** ~5 rays (centre plus a small ring, radius ~0.2) give a sphere-like probe, so a ray grazing a block edge
  can't flicker.
- **Smoothing:** we smooth the *distance*, not the position:
  - towards a nearer limit: fast exponential (~20/s), never a hard snap;
  - back out: slow (~3/s), only after the limit has stayed farther for ~0.25 s (hysteresis).
- **Easing:** the unpulled follow position is what eases; only the rendered camera is pulled in.
- **See-through props:** a prop between the camera and Ezra's head becomes see-through.
  - A shared material patch dithers away fragments inside a capsule from the camera to Ezra's chest (radius ~0.9).
  - It applies to prop materials only, never terrain or Ezra.
  - It is off in Tour and in closeups.
- **Phone zoom:** pinch, into the same zoom accumulator as the mouse wheel.

### 2. Thin collision (physics + layouts)
- **Props move to colliders.** A world-space AABB list in a coarse bucket hash replaces their barrier cells. Props
  covered:
  - posts: lanterns, jemuran, table posts, sign/map/info posts;
  - board/sign panels;
  - gentong, crates, trunks.
- **The grid keeps** terrain, houses, walls, counters, stalls, roofs and stairs.
- **Rotated panels** become a short row of small AABBs along the panel.
- **Physics** (`characterCollides`, `moveAxis`, vertical move) tests grid ∪ colliders:
  - The contact snap becomes a binary-search sweep, so Ezra stops flush against a thin post and can land on a box top.
  - Step-up also tries the top of a blocking collider within `stepHeight`.
- **Tests:** layout tests map colliders to the cells they touch, so placement rules still run. Head-clearance rules use
  the real boxes.

### 3. Phone Play input (MobileControls)
- **Look:** a full-screen look layer under the controls. One-finger drag turns (x) and tilts (y); two fingers pinch-zoom.
- **Stick:** floats where the thumb lands in the lower-left zone (left 45 %, bottom 45 %), with a faint resting ring
  until the first move.
- **Action button:** shown only with a prompt, short verb label, above Jump; no disabled "Use".
- **Jump:** stays bottom-right.

### 4. HUD (Hud.tsx, world.css)
- **Phone:**
  - top-left: a "← Tour" chip in Play, a "Play" chip in Tour;
  - top-right: 44 px icon buttons for Map and Sound (a crossed speaker when muted).
- **Desktop:**
  - top-left: a Tour | Play switch that shows the current mode;
  - top-right: icon buttons for Map, Sound and Help (?);
  - E prompt pill at the bottom centre: "E Open POS · or click it".
- **Closeup:** a large Back at the bottom centre; position dots when a wide screen pans.
- **Hints:** no always-on hint line.
  - Play shows a key/touch legend on its first entry and fades it after a few seconds of moving.
  - ? (desktop) brings the legend back.
  - Tour shows one short line until the first scroll or swipe.

### 5. Tour navigation
- **Phone:** a horizontal swipe (|dx| > 50 px and |dx| > 1.5 |dy|) glides to the next/previous stop. Vertical scroll is
  unchanged.
- **Desktop:**
  - ← / → go to the previous/next stop, plus small arrow buttons;
  - ← / → no longer enter Play; WASD and ↑ / ↓ still do.

### 6. Map from anywhere
- **Opening:** the Map button or M opens an overlay with the same island map as the map boards.
- **Travel:** picking an island runs the existing travel (fade, no swoop).
- **Tour:** the same overlay jumps the tour to that stop.

### 7. Desktop click to use
- In Play, a primary click (not a drag) on an interactable within reach uses it. Outside reach, the click does nothing.

## Kept as is
- reduced-motion cuts;
- primary-button-only closeup taps;
- held keys waiting for release when a closeup opens;
- the clear follow-camera landing;
- no swoop after travel;
- Tab to boards, Enter, arrows on map closeups;
- all tests green;
- ≤ 200 draw calls.

## Build order (beta after each)
1. Camera
2. Thin collision
3. Phone input + HUD
4. Tour swipe/arrows, map overlay, click to use
5. Hints
