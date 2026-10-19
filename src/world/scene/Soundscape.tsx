import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioAwake, playSfx, setListener, subscribeAudio } from "@/world/engine/audio/sfx";
import { setAmbientOn, updateAmbient, type AmbientSource } from "@/world/engine/audio/ambient";
import { setMusicMood, setMusicOn } from "@/world/engine/audio/music";
import { stopLoops } from "@/world/engine/audio/loops";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { daylight } from "./daylight";
import { BEE, MONOSUKO } from "./islands/layouts";
import { worldOf } from "./islands/shared/local";
import { birdPerches, chickenHome } from "./critters/places";

/** Seconds between the odd cluck from the POS chicken (random in this range). */
const CLUCK_EVERY = [5, 11] as const;
/** Seconds between birdsong by day (random in this range; fewer as the golden hour comes). */
const SONG_EVERY = [3, 8] as const;
/** The crickets come in with the fireflies (critters/Ambient.tsx): past a third of the way to golden hour. */
const crickets = (k: number) => Math.max(0, Math.min(1, (k - 0.35) / 0.4));

const right = new THREE.Vector3();
const between = (r: readonly [number, number]) => r[0] + Math.random() * (r[1] - r[0]);

/**
 * The world's sound beyond the effects: the music and the ambience (engine/audio), on with the sound and off without
 * it, following the island in view, Play, the golden hour and where the listener is (the camera in the tour, Ezra in
 * Play, heard with the camera's left and right). Also the world's own small calls: the chicken now and then, birdsong
 * by day near a bird, and a soft tick when something in Play comes into reach.
 */
export function Soundscape() {
  const awake = useSyncExternalStore(subscribeAudio, audioAwake, () => null);
  const sources = useMemo<AmbientSource[]>(() => {
    const pos = runtime.islandById("pos-monosuko");
    const bee = runtime.islandById("bee-furniture-crm");
    return [
      { kind: "sizzle", ...worldOf(pos, MONOSUKO.grill.x, 1.2, MONOSUKO.grill.z) },
      { kind: "buzz", ...worldOf(bee, BEE.bee.x, BEE.bee.y, BEE.bee.z) },
    ];
  }, []);
  const places = useMemo(() => ({ chicken: chickenHome(), perches: birdPerches().map((b) => b.perch) }), []);
  const calls = useRef<{ cluck: number; song: number }>({ cluck: CLUCK_EVERY[0], song: SONG_EVERY[0] });
  useEffect(() => {
    setMusicOn(awake, !!awake);
    setAmbientOn(awake, !!awake, sources);
    if (!awake) stopLoops();
  }, [awake, sources]);
  useEffect(
    () => () => {
      setMusicOn(null, false);
      setAmbientOn(null, false);
      stopLoops();
    },
    [],
  );
  // something in Play comes into reach (its prompt shows): a soft tick (sfx.ts spaces them out)
  useEffect(
    () =>
      useWorld.subscribe((s, prev) => {
        if (s.mode === "play" && s.prompt && s.prompt.id !== prev.prompt?.id) playSfx("tick");
      }),
    [],
  );
  useFrame(({ camera }, dt) => {
    if (!awake) return;
    const w = useWorld.getState();
    const play = w.mode === "play";
    setMusicMood(w.activeIsland, daylight.k, play);
    const l = play ? runtime.player.pos : camera.position;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    setListener(l.x, l.y + (play ? 1.5 : 0), l.z, right.x, right.z);
    updateAmbient(dt, crickets(daylight.k));
    // now and then the chicken clucks (heard only near it), and by day a bird sings on the post nearest the listener
    const c = calls.current;
    c.cluck -= dt;
    if (c.cluck <= 0) {
      c.cluck = between(CLUCK_EVERY);
      playSfx("cluck", { at: places.chicken });
    }
    c.song -= dt * (1 - 0.8 * daylight.k);
    if (c.song <= 0) {
      c.song = between(SONG_EVERY);
      let near = places.perches[0];
      let best = Infinity;
      for (const p of places.perches) {
        const d = Math.hypot(p.x - l.x, p.z - l.z);
        if (d < best) [best, near] = [d, p];
      }
      if (near) {
        const at = { x: near.x + (Math.random() - 0.5) * 3, y: near.y + 1, z: near.z + (Math.random() - 0.5) * 3 };
        playSfx(Math.random() < 0.7 ? "tweet" : "chirp", { at, volume: 0.8 });
      }
    }
  });
  return null;
}
