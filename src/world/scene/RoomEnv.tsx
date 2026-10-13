import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Low-intensity procedural environment so metal and glass props have something to reflect. */
export function RoomEnv({ intensity = 0.3 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      if (scene.environment === env) scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}
