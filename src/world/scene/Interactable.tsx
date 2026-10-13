import { useEffect, useMemo, useRef } from "react";
import type { JSX, ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { FONT_URLS } from "./fonts";

export function Interactable({
  id,
  island,
  label,
  position,
  size,
  radius = 2.5,
  onActivate,
  enabled,
  children,
}: {
  id: string;
  island: string;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  radius?: number;
  onActivate: () => void;
  enabled?: () => boolean;
  children?: ReactNode;
}): JSX.Element {
  const mode = useWorld((s) => s.mode);
  const lift = useRef<THREE.Group>(null);
  const outline = useRef<THREE.Group>(null);
  const tag = useRef<THREE.Group>(null);
  const activate = useRef(onActivate);
  activate.current = onActivate;
  const isEnabled = useRef(enabled);
  isEnabled.current = enabled;
  const [px, py, pz] = position;
  const [sx, sy, sz] = size;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), [sx, sy, sz]);

  useEffect(
    () =>
      runtime.registry.register({
        id,
        island,
        label,
        position: { x: px, y: py, z: pz },
        hitbox: { min: { x: px - sx / 2, y: py - sy / 2, z: pz - sz / 2 }, max: { x: px + sx / 2, y: py + sy / 2, z: pz + sz / 2 } },
        radius,
        onActivate: () => {
          playSfx("click");
          activate.current();
        },
        enabled: () => (isEnabled.current ? isEnabled.current() : true),
      }),
    [id, island, label, px, py, pz, sx, sy, sz, radius],
  );

  useFrame((_, dt) => {
    const on = runtime.hoverId === id || runtime.focusId === id;
    if (lift.current) lift.current.position.y = THREE.MathUtils.damp(lift.current.position.y, on ? 0.1 : 0, 12, dt);
    if (outline.current) outline.current.visible = on;
    if (tag.current) tag.current.visible = on;
  });

  return (
    <>
      <group ref={lift}>{children}</group>
      <group ref={outline} position={position} visible={false}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#fff6dc" transparent opacity={0.9} />
        </lineSegments>
      </group>
      <group ref={tag} position={[px, py + sy / 2 + 0.5, pz]} visible={false}>
        <Billboard>
          <Text
            font={FONT_URLS.ui}
            fontSize={0.3}
            color="#fffaf0"
            outlineWidth={0.025}
            outlineColor="#13212b"
            anchorX="center"
            anchorY="middle"
          >
            {mode === "play" ? `E  ${label}` : label}
          </Text>
        </Billboard>
      </group>
    </>
  );
}
