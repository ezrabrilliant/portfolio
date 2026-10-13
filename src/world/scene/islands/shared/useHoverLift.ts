import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/world/state/store";

/** Ref for a group (kept at y = 0 inside a positioned parent) that rises 0.1 while interactable `id` is hovered. */
export function useHoverLift(id: string) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = useWorld.getState().hoveredId === id ? 0.1 : 0;
    g.position.y = THREE.MathUtils.damp(g.position.y, target, 14, dt);
  });
  return ref;
}
