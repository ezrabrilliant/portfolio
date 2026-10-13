import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { characterCollides } from "@/world/engine/physics/character";
import { worldCopy, worldProjects } from "@/config/portfolio";
import { PAD_SIZE, SIGN_OFFSET, SIGN_WIDTH, STATION_SIZE, padPair, railEnds } from "@/world/scene/crossings/geometry";
import { EZRA, FOOTPRINTS, GTID, HERO, INFO_HALF_SPAN, ORBIT, PETAK } from "./layouts";
import { projectById } from "./shared/project";
import { infoBoardRows } from "./shared/text";

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
});

describe("board and sign collision", () => {
  // InfoBoard: posts 1.0 tall, then the text panel (shared/InfoBoard.tsx); its height grows with the wrapped copy
  const infoTop = (title: string, lines: readonly string[]) => 1.0 + infoBoardRows(title, lines).height;
  const stats = (id: string) => projectById(id).stats ?? [];
  const g = GTID.board;
  const s = EZRA.screen;
  // every panel on two posts: where the posts stand (± half around `at`, turned by ry) and its top edge above the grass
  const boards = [
    { id: "hero", what: "about board", at: HERO.info, half: INFO_HALF_SPAN, ry: HERO.info.ry, top: infoTop(worldCopy.location, [worldCopy.heroLine]) },
    { id: "gtid", what: "price board", at: g, half: g.w / 2 - 0.3, ry: g.ry, top: g.y + g.h / 2 - 0.4 + (g.h + 0.16) / 2 }, // Gtid.tsx PriceBoard
    { id: "gtid", what: "info board", at: GTID.info, half: INFO_HALF_SPAN, ry: GTID.info.ry, top: infoTop("gtid.pro", stats("gtid")) },
    { id: "petak-umpet", what: "title sign", at: PETAK.sign, half: PETAK.sign.w / 2 - 0.3, ry: PETAK.sign.ry, top: 0.55 + PETAK.sign.h }, // PetakUmpet.tsx SIGN_BOTTOM 0.55
    { id: "petak-umpet", what: "info board", at: PETAK.info, half: INFO_HALF_SPAN, ry: PETAK.info.ry, top: infoTop("Roblox", stats("petak-umpet")) },
    { id: "orbit-store", what: "info board", at: ORBIT.info, half: INFO_HALF_SPAN, ry: ORBIT.info.ry, top: infoTop("Orbit Store", stats("orbit-store")) },
    { id: "ezra-bot", what: "screen", at: s, half: s.w / 2 - 0.25, ry: s.ry, top: s.y + s.h / 2 - 0.2 + (s.h + 0.14) / 2 }, // EzraBot.tsx SCREEN_GEO
    { id: "ezra-bot", what: "info board", at: EZRA.info, half: INFO_HALF_SPAN, ry: EZRA.info.ry, top: infoTop("Discord", stats("ezra-bot")) },
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
});
