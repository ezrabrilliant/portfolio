export type SfxName =
  | "click" | "hover" | "punch" | "burst" | "jump" | "land" | "step" | "stepWood" | "coin" | "print" | "chat" | "link" | "bounce" | "cart" | "pop" | "poof";

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
  // a gold block picked up: a bright two-step chime
  coin: [0.45, 0, 988, 0, 0.04, 0.22, 0, 1.6, 0, 0, 330, 0.06],
  // a hollow knock on a bridge plank
  stepWood: [0.3, 0.08, 330, 0, 0.004, 0.06, 1, 1.4, -6],
  print: [0.4, 0, 520, 0, 0.3, 0.05, 2, 1, 0, 0, 0, 0, 0.05, 0.5],
  chat: [0.4, 0, 880, 0.01, 0.05, 0.1, 0, 1, 0, 0, 440, 0.05],
  link: [0.4, 0, 660, 0, 0.06, 0.15, 0, 1, 0, 0, 220, 0.06],
  bounce: [0.6, 0, 200, 0, 0.08, 0.2, 1, 1, 20],
  cart: [0.4, 0.1, 90, 0.05, 0.4, 0.2, 2, 1, 0, 0, 0, 0, 0.08, 0.3],
  // the graduation cap popping on (or the toss): a short soft blip sliding up
  pop: [0.4, 0.02, 520, 0, 0.02, 0.08, 0, 1.6, 18],
  // a fast-travel dust puff: a quiet noise burst falling away
  poof: [0.3, 0.1, 150, 0.01, 0.04, 0.2, 4, 1, -3, 0, 0, 0, 0, 0.6],
};

type ZzfxModule = typeof import("zzfx");

let muted = true;
let zz: ZzfxModule | null = null;
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (!loading) {
    loading = import("zzfx")
      .then((m) => {
        zz = m;
        m.ZZFX.volume = 0.25;
      })
      .catch((err: unknown) => {
        loading = null;
        console.warn("[sfx] audio failed to load; staying silent", err);
      });
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
