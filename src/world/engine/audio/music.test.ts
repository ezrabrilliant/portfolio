import { afterEach, describe, expect, it, vi } from "vitest";
import { CHORDS, CHORDS_B, SCALE, SECTION, chordAt, midiHz, mixFor, nextNote, progressionAt, resync, voiceFor } from "./music";
import { falloff } from "./ambient";
import { installFakeBrowser } from "./testAudio";

describe("music", () => {
  it("loops its chords", () => {
    expect(chordAt(0)).toBe(CHORDS[0]);
    expect(chordAt(CHORDS.length)).toBe(CHORDS[0]);
    expect(chordAt(-1)).toBe(CHORDS[CHORDS.length - 1]);
  });
  it("turns to the B section for the last four bars of every cycle", () => {
    for (let n = 0; n < SECTION - 4; n++) expect(progressionAt(n)).toBe(chordAt(n));
    expect(progressionAt(SECTION - 4)).toBe(CHORDS_B[0]);
    expect(progressionAt(SECTION - 1)).toBe(CHORDS_B[3]);
    expect(progressionAt(SECTION)).toBe(CHORDS[0]);
  });
  it("tunes A4 to 440 Hz", () => {
    expect(midiHz(69)).toBeCloseTo(440, 9);
  });
  it("walks the melody in small steps inside the scale, with rests", () => {
    let n = -1, rests = 0;
    for (let i = 0; i < 500; i++) {
      const next = nextNote(n, Math.random(), Math.random());
      if (next < 0) rests++;
      else {
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(SCALE.length);
        if (n >= 0) expect(Math.abs(next - n)).toBeLessThanOrEqual(2);
      }
      n = next;
    }
    expect(rests).toBeGreaterThan(100);
  });
  it("gives GTID a chip voice and Petak Umpet a bell", () => {
    expect(voiceFor("gtid")).toBe("chip");
    expect(voiceFor("petak-umpet")).toBe("bell");
    expect(voiceFor("hero")).toBe("soft");
  });
  it("remixes the layers by island, and Play brings the percussion in", () => {
    expect(mixFor("hero", false).perc).toBe(0);
    expect(mixFor("gtid", false).perc).toBeGreaterThan(0);
    expect(mixFor("hero", true).perc).toBeGreaterThan(0);
    expect(mixFor("an-unknown-island", false)).toEqual({ pad: 1, bass: 1, lead: 1, perc: 0, arp: 0 });
  });
  it("moves a time that fell behind to just ahead of now, and leaves a time ahead alone", () => {
    expect(resync(5, 100)).toBeCloseTo(100.1, 9);
    expect(resync(101, 100)).toBe(101);
  });
});

describe("the music engine", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  async function start() {
    vi.resetModules();
    vi.useFakeTimers();
    const b = installFakeBrowser();
    const core = await import("./core");
    const music = await import("./music");
    core.setMuted(false);
    music.setMusicOn(core.getMixer(), true);
    return { b, ctx: b.ctx(), music };
  }

  it("plays into the music bus, never straight to the speakers", async () => {
    const { ctx } = await start();
    const comp = ctx.nodes.find((n) => n.kind === "compressor")!;
    expect(ctx.nodes.filter((n) => n.connected.includes(ctx.destination))).toEqual([comp]);
  });

  it("back from a hidden tab, picks up from now instead of bursting through the missed bars", async () => {
    const { ctx, music } = await start();
    const before = ctx.nodes.length;
    ctx.currentTime = 600;
    vi.advanceTimersByTime(120);
    expect(music.musicState().nextBar).toBeGreaterThan(600);
    expect(music.musicState().nextBar).toBeLessThan(600 + 3.2);
    // one bar's worth of notes at most, not two hundred
    expect(ctx.nodes.length - before).toBeLessThan(80);
  });

  it("after a short stall, skips the missed eighths and keeps playing on the bar's grid (no silent wait for the next bar)", async () => {
    const { ctx, music } = await start();
    // an island with an arpeggio on every other eighth: something is due at each even step whatever the melody does
    music.setMusicMood("gtid", 0, false);
    vi.advanceTimersByTime(120);
    const { nextBar } = music.musicState();
    // a heavy frame of 0.9 s: the eighths fell behind, the bar is still ahead
    ctx.currentTime = nextBar - 1.2;
    const before = ctx.nodes.length;
    vi.advanceTimersByTime(120);
    expect(music.musicState().nextBar).toBe(nextBar);
    // the melody, percussion or arpeggio went on in this half second, not a whole bar's burst
    expect(ctx.nodes.length - before).toBeGreaterThan(0);
    expect(ctx.nodes.length - before).toBeLessThan(40);
  });

  it("schedules nothing while the context sleeps", async () => {
    const { ctx } = await start();
    ctx.state = "suspended";
    const before = ctx.nodes.length;
    ctx.currentTime = 30;
    vi.advanceTimersByTime(600);
    expect(ctx.nodes.length).toBe(before);
  });

  it("stopping silences and cuts every note already scheduled, then lets go of the graph", async () => {
    const { ctx, music } = await start();
    expect(music.musicState().notes).toBeGreaterThan(0);
    const sources = ctx.nodes.filter((n) => n.kind === "osc" || n.kind === "buffer");
    music.setMusicOn(null, false);
    expect(music.musicState().on).toBe(false);
    for (const s of sources) expect(s.stopped).not.toBeNull();
    for (const s of sources) expect(s.stopped!).toBeLessThanOrEqual(ctx.currentTime + 1);
    vi.advanceTimersByTime(2600);
    const delay = ctx.nodes.find((n) => n.kind === "delay")!;
    expect(delay.disconnected).toBeGreaterThan(0);
  });
});

describe("ambient falloff", () => {
  it("is full near, gone far, fading between", () => {
    expect(falloff(1, 3, 20)).toBe(1);
    expect(falloff(25, 3, 20)).toBe(0);
    const mid = falloff(10, 3, 20);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
