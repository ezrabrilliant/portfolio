import { describe, expect, it } from "vitest";
import { CHORDS, SCALE, chordAt, midiHz, nextNote, voiceFor } from "./music";
import { falloff } from "./ambient";

describe("music", () => {
  it("loops its chords", () => {
    expect(chordAt(0)).toBe(CHORDS[0]);
    expect(chordAt(CHORDS.length)).toBe(CHORDS[0]);
    expect(chordAt(-1)).toBe(CHORDS[CHORDS.length - 1]);
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
