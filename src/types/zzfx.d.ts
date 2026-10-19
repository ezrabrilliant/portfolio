declare module "zzfx" {
  export function zzfx(...parameters: (number | undefined)[]): AudioBufferSourceNode;
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    play(...parameters: (number | undefined)[]): AudioBufferSourceNode;
    /** Renders a sound's samples (mono, at ZZFX.sampleRate) without playing it. */
    buildSamples(...parameters: (number | undefined)[]): Float32Array;
  };
}
