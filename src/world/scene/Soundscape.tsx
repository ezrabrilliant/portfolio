import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { audioContext, playSfx, whenAudioReady } from "@/world/engine/audio/sfx";
import { setAmbientOn, updateAmbient, type AmbientSource } from "@/world/engine/audio/ambient";
import { setMusicMood, setMusicOn } from "@/world/engine/audio/music";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { daylight } from "./daylight";
import { BEE, MONOSUKO } from "./islands/layouts";
import { worldOf } from "./islands/shared/local";

/** Seconds between the odd cluck near the POS chicken, or chirp near a bridge (random in this range). */
const CALLS_EVERY = [5, 11] as const;

/**
 * The world's sound beyond the effects: the music and the ambience (engine/audio), on with the sound and off without
 * it, following the island in view, the golden hour and where the listener is (the camera in the tour, Ezra in Play).
 */
export function Soundscape() {
  const muted = useWorld((s) => s.muted);
  const sources = useMemo<AmbientSource[]>(() => {
    const pos = runtime.islandById("pos-monosuko");
    const bee = runtime.islandById("bee-furniture-crm");
    return [
      { kind: "sizzle", ...worldOf(pos, MONOSUKO.grill.x, 1.2, MONOSUKO.grill.z) },
      { kind: "buzz", ...worldOf(bee, BEE.bee.x, BEE.bee.y, BEE.bee.z) },
    ];
  }, []);
  const calls = useRef<number>(CALLS_EVERY[0]);
  useEffect(() => {
    let alive = true;
    if (muted) {
      setMusicOn(null, false);
      setAmbientOn(null, false);
      return;
    }
    // the audio loads on the first unmute
    void whenAudioReady().then(() => {
      if (!alive || useWorld.getState().muted) return;
      const ctx = audioContext();
      setMusicOn(ctx, true);
      setAmbientOn(ctx, true, sources);
    });
    return () => {
      alive = false;
    };
  }, [muted, sources]);
  useFrame(({ camera }, dt) => {
    if (muted) return;
    const w = useWorld.getState();
    setMusicMood(w.activeIsland, daylight.k);
    const play = w.mode === "play";
    const l = play ? runtime.player.pos : camera.position;
    updateAmbient(l.x, l.y + (play ? 1.5 : 0), l.z);
    // now and then a chicken clucks or a bird chirps, when one is near
    calls.current -= dt;
    if (calls.current <= 0) {
      calls.current = CALLS_EVERY[0] + Math.random() * (CALLS_EVERY[1] - CALLS_EVERY[0]);
      if (w.activeIsland === "pos-monosuko") playSfx("cluck");
      else if (Math.random() < 0.5) playSfx("chirp");
    }
  });
  return null;
}
