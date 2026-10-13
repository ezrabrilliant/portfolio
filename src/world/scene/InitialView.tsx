import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { runtime } from "@/world/state/runtime";
import { STAR_ISLANDS } from "./islands";
import { portraitStop } from "./islands/framing";
import { isPortrait } from "./tour/tourBuild";

export function InitialView() {
  const camera = useThree((s) => s.camera);
  const get = useThree((s) => s.get);
  useEffect(() => {
    const hero = runtime.islandById("hero");
    const base = STAR_ISLANDS.hero.tourStop(hero);
    const { width, height } = get().size;
    // the same framing TourCamera's first stop uses on this screen
    const stop = isPortrait(width, height) ? portraitStop(hero, base) : base;
    camera.position.set(stop.camera.x, stop.camera.y, stop.camera.z);
    camera.lookAt(stop.target.x, stop.target.y, stop.target.z);
  }, [camera, get]);
  return null;
}
