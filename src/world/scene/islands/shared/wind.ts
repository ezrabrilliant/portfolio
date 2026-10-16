import * as THREE from "three";
import { seeThroughUniforms } from "@/world/scene/seeThroughShader";

/** Wind on leaves (polish #2): each swaying block's top drifts this far (blocks) on a slow gust, its own phase. */
export const WIND = { amp: 0.06, speed: 1.6 } as const;
/** 1 = the wind blows, 0 = still (reduced motion); Sky sets it. */
export const windUniform = { value: 1 };

/** The props' material with the wind's sway (for meshes that have any swaying block). */
export const WIND_MATERIAL = (() => {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = seeThroughUniforms.uTime;
    shader.uniforms.uWind = windUniform;
    shader.vertexShader =
      "attribute float aSway;\nuniform float uTime;\nuniform float uWind;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          vec3 iw = instanceMatrix[3].xyz;
          float lift = clamp(position.y + 0.5, 0.0, 1.0);
          float g = sin(uTime * ${WIND.speed.toFixed(2)} + iw.x * 0.7 + iw.z * 0.5) + 0.4 * sin(uTime * ${(WIND.speed * 2.3).toFixed(2)} + iw.z * 1.3);
          transformed.x += g * ${WIND.amp.toFixed(3)} * aSway * lift * uWind;
          transformed.z += g * ${(WIND.amp * 0.6).toFixed(3)} * aSway * lift * uWind;
        }`,
      );
  };
  m.customProgramCacheKey = () => "prop-wind";
  return m;
})();
