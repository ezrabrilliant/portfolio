import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { runtime } from "@/world/state/runtime";
import { STAR_ISLANDS } from "./islands";

export function InitialView() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const stop = STAR_ISLANDS.hero.tourStop(runtime.islandById("hero"));
    camera.position.set(stop.camera.x, stop.camera.y, stop.camera.z);
    camera.lookAt(stop.target.x, stop.target.y, stop.target.z);
  }, [camera]);
  return null;
}
