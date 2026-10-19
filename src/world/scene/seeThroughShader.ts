import * as THREE from "three";

/** Only what stands this far or more in front of the face counts as covering it (the bezel and face sit closer). */
const FACE_FRONT = "0.03";

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
  /** Ezra's feet: a board or sign he walks through (passable, colliders.ts) fades around his body */
  uSeeBody: { value: new THREE.Vector3() },
  /** the closeup's face (CloseupCamera): what stands over its rectangle, between it and the camera, is cleared */
  uFace: { value: 0 },
  uFaceC: { value: new THREE.Vector3() },
  uFaceN: { value: new THREE.Vector3(0, 0, 1) },
  uFaceR: { value: new THREE.Vector3(1, 0, 0) },
  uFaceU: { value: new THREE.Vector3(0, 1, 0) },
  uFaceHalf: { value: new THREE.Vector2() },
  /** seconds (Sky writes it): drives the drifting cloud shade */
  uTime: { value: 0 },
  /** 1 = the cloud shade draws (high tier), 0 = skipped (low tier: fewer per-pixel sums on weak GPUs) */
  uShadeOn: { value: 1 },
};

/** Cloud shade on lit surfaces: patches `cell` blocks across, drifting `drift` blocks a second, `depth` dark at most. */
export const CLOUD_SHADE = { cell: 16, drift: 0.9, depth: 0.16 } as const;

/** Around Ezra's body, a passable prop fades within this horizontal radius, from his feet to just over his head. */
export const BODY_FADE = { radius: 0.75, top: 2.4 } as const;

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
uniform vec3 uSeeBody;
uniform float uFace;
uniform vec3 uFaceC;
uniform vec3 uFaceN;
uniform vec3 uFaceR;
uniform vec3 uFaceU;
uniform vec2 uFaceHalf;
uniform float uTime;
uniform float uShadeOn;
float seeHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float seeNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(seeHash(i), seeHash(i + vec2(1.0, 0.0)), u.x), mix(seeHash(i + vec2(0.0, 1.0)), seeHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float seeBayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float i = q.x + q.y * 4.0;
  // 4 x 4 ordered dither thresholds in (0, 1)
  return (mod(i * 7.0 + floor(i / 4.0) * 3.0, 16.0) + 0.5) / 16.0;
}
`;
const FRAGMENT_BODY = `
#ifndef SEE_SOLID
  if (uFace > 0.0) {
    // a closeup: whatever stands in front of the face and over its rectangle (seen from the camera) is cleared, dithered
    // in with the glide; props beside the face stay whole (the camera's near plane no longer cuts them)
    vec3 toP = vSeeWorld - uFaceC;
    vec3 ray = vSeeWorld - cameraPosition;
    float dn = dot(ray, uFaceN);
    if (dot(toP, uFaceN) > ${FACE_FRONT} && dn < -1e-4) {
      vec3 x = cameraPosition + ray * (dot(uFaceC - cameraPosition, uFaceN) / dn) - uFaceC;
      if (abs(dot(x, uFaceR)) < uFaceHalf.x && abs(dot(x, uFaceU)) < uFaceHalf.y && uFace * uFace * uFace > seeBayer(gl_FragCoord.xy)) discard;
    }
  }
  if (uSeeOn > 0.5) {
    vec3 seg = uSeeTo - uSeeFrom;
    float t = clamp(dot(vSeeWorld - uSeeFrom, seg) / max(dot(seg, seg), 1e-4), 0.0, 1.0);
    float d = length(vSeeWorld - (uSeeFrom + seg * t));
    // fully faded near the axis, none at the radius; and none right at Ezra's end, so what he stands against stays solid
    float fade = (1.0 - smoothstep(${(SEE_RADIUS * 0.45).toFixed(3)}, ${SEE_RADIUS.toFixed(3)}, d)) * (1.0 - smoothstep(0.82, 0.97, t)) * 0.85;
#ifdef SEE_PASSABLE
    vec2 off = vSeeWorld.xz - uSeeBody.xz;
    float h = vSeeWorld.y - uSeeBody.y;
    float body = (1.0 - smoothstep(${(BODY_FADE.radius * 0.6).toFixed(3)}, ${BODY_FADE.radius.toFixed(3)}, length(off))) * step(-0.1, h) * step(h, ${BODY_FADE.top.toFixed(3)});
    fade = max(fade, body * 0.8);
#endif
    if (fade > seeBayer(gl_FragCoord.xy)) discard;
  }
#endif
`;

/** Lit materials: soft cloud shadows drifting over the islands (on the lit colour, before tone mapping). */
const SHADE_BODY = `
#ifdef SEE_SHADE
  if (uShadeOn > 0.5) {
    vec2 cp = vSeeWorld.xz / ${CLOUD_SHADE.cell.toFixed(1)} + vec2(uTime * ${(CLOUD_SHADE.drift / CLOUD_SHADE.cell).toFixed(4)}, uTime * ${(CLOUD_SHADE.drift * 0.4 / CLOUD_SHADE.cell).toFixed(4)});
    float cloud = smoothstep(0.55, 0.78, seeNoise(cp));
    gl_FragColor.rgb *= 1.0 - ${CLOUD_SHADE.depth.toFixed(2)} * cloud;
  }
#endif
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
  shader.fragmentShader =
    FRAGMENT_HEAD +
    shader.fragmentShader
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${FRAGMENT_BODY}`)
      .replace("#include <tonemapping_fragment>", `${SHADE_BODY}\n#include <tonemapping_fragment>`);
}

/** The flags each patched material was compiled with (seeFlags). */
const patched = new WeakMap<THREE.Material, string>();
/** A patched material's own hooks from before the patch, so a variant can start from them. */
const original = new WeakMap<THREE.Material, { onBeforeCompile: THREE.Material["onBeforeCompile"]; key: () => string }>();
/** Per material, the variants made for meshes that need other flags than it was patched with. */
const variants = new WeakMap<THREE.Material, Map<string, THREE.Material>>();
const seeFlags = (passable: boolean, solid: boolean) => `${passable ? "pass" : ""}|${solid ? "solid" : ""}`;

/**
 * Patches one material once (later calls do nothing). Only lit and basic mesh materials take it. `passable`: the
 * material belongs to a board or sign Ezra walks through (userData.passable on an ancestor), which also fades around
 * his body.
 */
export function applySeeThrough(m: THREE.Material, passable = false, solid = false): void {
  if (patched.has(m)) return;
  // troika's text material derives from a base material (its prototype) and owns onBeforeCompile through a getter that
  // calls whatever is set on it, so wrapping it recursed forever: patch the base, which troika compiles first
  if ((m as THREE.Material & { isDerivedMaterial?: boolean }).isDerivedMaterial) {
    patched.set(m, seeFlags(passable, solid));
    applySeeThrough(Object.getPrototypeOf(m) as THREE.Material, passable, solid);
    m.needsUpdate = true;
    return;
  }
  if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshBasicMaterial)) return;
  patched.set(m, seeFlags(passable, solid));
  original.set(m, { onBeforeCompile: m.onBeforeCompile, key: m.customProgramCacheKey });
  // lit surfaces take the cloud shade; screens and other unlit ones keep their own colours
  const lit = !(m instanceof THREE.MeshBasicMaterial);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    patchSeeThroughShader(shader);
    const defs = [passable && "SEE_PASSABLE", solid && "SEE_SOLID", lit && "SEE_SHADE"].filter(Boolean);
    shader.fragmentShader = defs.map((d) => `#define ${d}\n`).join("") + shader.fragmentShader;
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${prevKey()}|see${passable ? "|pass" : ""}${solid ? "|solid" : ""}`;
  m.needsUpdate = true;
}

/**
 * The material a mesh should draw with for these flags: `m` itself, patched on first sight; or, when `m` was already
 * patched with other flags (a material shared by meshes that need different variants: the graduation outfit worn by a
 * seeSolid Ezra and on the 2026 pillar), one clone per flag set, patched from m's own pre-patch hooks.
 */
export function seeThroughMaterial(m: THREE.Material, passable = false, solid = false): THREE.Material {
  const want = seeFlags(passable, solid);
  const have = patched.get(m);
  if (have === undefined) {
    applySeeThrough(m, passable, solid);
    return m;
  }
  const hooks = original.get(m);
  if (have === want || !hooks) return m;
  let byFlags = variants.get(m);
  if (!byFlags) variants.set(m, (byFlags = new Map()));
  let v = byFlags.get(want);
  if (!v) {
    v = m.clone();
    v.onBeforeCompile = hooks.onBeforeCompile;
    v.customProgramCacheKey = hooks.key;
    applySeeThrough(v, passable, solid);
    byFlags.set(want, v);
  }
  return v;
}

/**
 * Walks the scene and patches every mesh material, skipping subtrees marked userData.noSeeThrough; under one marked
 * userData.passable (boards and signs) they also fade around Ezra's body. A mesh whose shared material was patched for
 * other flags draws with its own variant (seeThroughMaterial).
 */
export function patchSceneSeeThrough(root: THREE.Object3D, passable = false, solid = false): void {
  if (root.userData.noSeeThrough) return;
  const pass = passable || root.userData.passable === true;
  // seeSolid (terrain, Ezra): never faded, but still under the drifting cloud shade
  const firm = solid || root.userData.seeSolid === true;
  const mesh = root as THREE.Mesh;
  if (mesh.isMesh) {
    if (Array.isArray(mesh.material)) {
      const mats = mesh.material.map((m) => (m ? seeThroughMaterial(m, pass, firm) : m));
      if (mats.some((m, i) => m !== (mesh.material as THREE.Material[])[i])) mesh.material = mats;
    } else if (mesh.material) {
      const m = seeThroughMaterial(mesh.material, pass, firm);
      if (m !== mesh.material) mesh.material = m;
    }
  }
  for (const c of root.children) patchSceneSeeThrough(c, pass, firm);
}
