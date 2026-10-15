import * as THREE from "three";

/**
 * Props between the Play camera and Ezra fade out (dithered) instead of pushing the camera in (spec: voxel controls §1).
 * One set of uniforms for every patched material: a capsule from the camera to Ezra's chest. Fragments inside it are
 * discarded on an ordered-dither pattern that thickens toward the capsule's axis, so a post or a board in the way
 * becomes a screen-door ghost and Ezra stays in view. Terrain, Ezra and the sky opt out (userData.noSeeThrough).
 */
export const seeThroughUniforms = {
  uSeeFrom: { value: new THREE.Vector3() },
  uSeeTo: { value: new THREE.Vector3() },
  /** 0 = off (tour, closeups), 1 = on */
  uSeeOn: { value: 0 },
};

/** Radius of the capsule around the camera → chest line, in blocks. */
export const SEE_RADIUS = 0.9;

const VERTEX_HEAD = "varying vec3 vSeeWorld;\n";
const VERTEX_BODY = `
#ifdef USE_INSTANCING
  vSeeWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vSeeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
`;
const FRAGMENT_HEAD = `
varying vec3 vSeeWorld;
uniform vec3 uSeeFrom;
uniform vec3 uSeeTo;
uniform float uSeeOn;
float seeBayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float i = q.x + q.y * 4.0;
  // 4 x 4 ordered dither thresholds in (0, 1)
  return (mod(i * 7.0 + floor(i / 4.0) * 3.0, 16.0) + 0.5) / 16.0;
}
`;
const FRAGMENT_BODY = `
  if (uSeeOn > 0.5) {
    vec3 seg = uSeeTo - uSeeFrom;
    float t = clamp(dot(vSeeWorld - uSeeFrom, seg) / max(dot(seg, seg), 1e-4), 0.0, 1.0);
    float d = length(vSeeWorld - (uSeeFrom + seg * t));
    // fully faded near the axis, none at the radius; and none right at Ezra's end, so what he stands against stays solid
    float fade = (1.0 - smoothstep(${(SEE_RADIUS * 0.45).toFixed(3)}, ${SEE_RADIUS.toFixed(3)}, d)) * (1.0 - smoothstep(0.82, 0.97, t)) * 0.85;
    if (fade > seeBayer(gl_FragCoord.xy)) discard;
  }
`;

/** Shader source shape onBeforeCompile hands over (the part this patch touches). */
interface ShaderLike {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
}

/** Adds the see-through capsule to a built-in material's shaders (exported for the test). */
export function patchSeeThroughShader(shader: ShaderLike): void {
  Object.assign(shader.uniforms, seeThroughUniforms);
  shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n${VERTEX_BODY}`);
  shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${FRAGMENT_BODY}`);
}

const patched = new WeakSet<THREE.Material>();

/** Patches one material once (later calls do nothing). Only lit and basic mesh materials take it. */
export function applySeeThrough(m: THREE.Material): void {
  if (patched.has(m)) return;
  // troika's text material derives from a base material (its prototype) and owns onBeforeCompile through a getter that
  // calls whatever is set on it, so wrapping it recursed forever: patch the base, which troika compiles first
  if ((m as THREE.Material & { isDerivedMaterial?: boolean }).isDerivedMaterial) {
    patched.add(m);
    applySeeThrough(Object.getPrototypeOf(m) as THREE.Material);
    m.needsUpdate = true;
    return;
  }
  if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshBasicMaterial)) return;
  patched.add(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    patchSeeThroughShader(shader);
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${prevKey()}|see`;
  m.needsUpdate = true;
}

/** Walks the scene and patches every mesh material, skipping subtrees marked userData.noSeeThrough. */
export function patchSceneSeeThrough(root: THREE.Object3D): void {
  if (root.userData.noSeeThrough) return;
  const mesh = root as THREE.Mesh;
  if (mesh.isMesh) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) if (m) applySeeThrough(m);
  }
  for (const c of root.children) patchSceneSeeThrough(c);
}
