import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/world/engine/gen/rng";
import { useWorld } from "@/world/state/store";
import { VIEW_R } from "./islands/types";
import { DAY, daylight, daylightK, mixColor } from "./daylight";
import { seeThroughUniforms } from "./seeThroughShader";
import { windUniform } from "./islands/shared/wind";

// Spec sky: #8ab3d1 → #cbdce4. THREE.Color holds linear values; the shaders mix in linear space and
// convert to the output colour space themselves, so these hexes reach the screen untouched (no tone mapping).
const SKY_TOP = new THREE.Color("#8ab3d1");
const SKY_HORIZON = new THREE.Color("#cbdce4");
const FOG_NEAR = 70;
const FOG_FAR = 210;

// One gradient for the sky dome and for the clouds' distance fade, so far clouds melt into exactly the sky
// behind them. Mirrored below the horizon: the tour cameras look ~25° down, so that half is what shows.
// abs(h) is rounded off over ±~2° (sqrt(h² + k²) − k): pow(abs(h), 0.75) alone has an infinite slope at the
// horizon, which a level Play camera shows as a thin bright crease.
const SKY_GLSL = /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
vec3 skyGradient( float h ) {
  float a = max( 0.0, sqrt( h * h + 0.035 * 0.035 ) - 0.035 );
  return mix( uSkyHorizon, uSkyTop, pow( min( 1.0, a * 1.35 ), 0.75 ) );
}
`;

function skyUniforms() {
  return { uSkyTop: { value: SKY_TOP }, uSkyHorizon: { value: SKY_HORIZON } };
}

function SkyDome() {
  const sphere = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: skyUniforms(),
        vertexShader: /* glsl */ `
          varying vec3 vSkyWorld;
          void main() {
            vec4 world = modelMatrix * vec4( position, 1.0 );
            vSkyWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }`,
        fragmentShader: /* glsl */ `
          ${SKY_GLSL}
          varying vec3 vSkyWorld;
          void main() {
            gl_FragColor = vec4( skyGradient( normalize( vSkyWorld - cameraPosition ).y ), 1.0 );
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera }) => {
    sphere.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={sphere} material={material} renderOrder={-1}>
      <sphereGeometry args={[400, 32, 16]} />
    </mesh>
  );
}

/* ---------- cloud sea ---------- */

// The field is one tile of CELLS × CELLS cells, wrapped around the camera on the GPU, so it is endless in x/z
// and costs one draw call and no per-frame matrix uploads. The wrap seam (CLOUD_HALF from the camera) sits
// beyond CLOUD_FADE_FAR, where clouds have already faded into the sky.
const CELL = 16;
const CELLS = 28;
const CLOUD_HALF = (CELL * CELLS) / 2;      // 224
const CLOUD_FADE_NEAR = 60;
const CLOUD_FADE_FAR = 200;
const CLOUD_BASE_Y = -18;
const WIND_SPEED = 0.35;                    // blocks per second, drifting toward the tour's right
const CLOUD_TINTS = ["#f7f8f6", "#f1f4f4", "#eaf0f2"];

const wrapTile = (v: number) => ((v % (2 * CLOUD_HALF)) + 2 * CLOUD_HALF) % (2 * CLOUD_HALF);

interface CloudBox { x: number; y: number; z: number; sx: number; sy: number; sz: number; tint: number }

/** Blocky cumulus clusters: a low base slab with 2–4 taller puffs, one cluster per jittered cell (a few cells
 *  empty). Neighbouring clusters overlap (~68% of the sea is covered, ~3,000 boxes), so the field reads as one
 *  sea with gaps of sky rather than separate tiles. */
function cloudBoxes(): CloudBox[] {
  const r = mulberry32(7);
  const out: CloudBox[] = [];
  const tint = () => Math.floor(r() * CLOUD_TINTS.length);
  for (let i = 0; i < CELLS; i++) {
    for (let j = 0; j < CELLS; j++) {
      if (r() < 0.04) continue;
      const cx = -CLOUD_HALF + (i + r()) * CELL;
      const cz = -CLOUD_HALF + (j + r()) * CELL;
      const base = CLOUD_BASE_Y + Math.round((r() - 0.5) * 6) / 2;
      const sx = 12 + Math.round(r() * 8);
      const sz = 9 + Math.round(r() * 5);
      const sy = 1 + Math.round(r());
      out.push({ x: cx, y: base + sy / 2, z: cz, sx, sy, sz, tint: tint() });
      const puffs = 2 + Math.floor(r() * 3);
      for (let k = 0; k < puffs; k++) {
        const px = 5 + Math.round(r() * 6);
        const pz = 4 + Math.round(r() * 5);
        const py = 2 + Math.round(r() * 2);
        const lift = r() < 0.5 ? 0 : 0.5 + Math.round(r()) * 0.5;
        out.push({
          x: cx + (r() - 0.5) * sx * 0.8,
          y: base + lift + py / 2,
          z: cz + (r() - 0.5) * sz * 0.8,
          sx: px, sy: py, sz: pz,
          tint: tint(),
        });
      }
    }
  }
  return out;
}

function cloudMaterial(uniforms: Record<string, THREE.IUniform>): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1.3, 1.3, 1.3), // a touch brighter than white so sunlit tops read white after tone mapping
    roughness: 1,
    metalness: 0,
    emissive: "#c9dbe8",                      // cool sky bounce: shaded sides stay airy blue-white, never grey
    emissiveIntensity: 0.22,
    fog: false, // the clouds fade into the sky gradient themselves (below)
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec2 uCloudCenter;
        uniform vec2 uCloudWind;`,
      )
      .replace(
        "#include <project_vertex>",
        `vec4 mvPosition = instanceMatrix * vec4( transformed, 1.0 );
        // wrap each instance's origin (not each vertex) into the tile centred on the camera
        vec2 cloudOrigin = instanceMatrix[3].xz + uCloudWind;
        vec2 cloudWrapped = uCloudCenter + mod( cloudOrigin - uCloudCenter + ${CLOUD_HALF.toFixed(1)}, ${(2 * CLOUD_HALF).toFixed(1)} ) - ${CLOUD_HALF.toFixed(1)};
        mvPosition.xz += cloudWrapped - instanceMatrix[3].xz;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${SKY_GLSL}`)
      .replace(
        "#include <fog_fragment>",
        `float cloudFade = smoothstep( ${CLOUD_FADE_NEAR.toFixed(1)}, ${CLOUD_FADE_FAR.toFixed(1)}, length( vViewPosition ) );
        vec3 cloudDir = normalize( ( vec4( -vViewPosition, 0.0 ) * viewMatrix ).xyz );
        gl_FragColor.rgb = mix( gl_FragColor.rgb, linearToOutputTexel( vec4( skyGradient( cloudDir.y ), 1.0 ) ).rgb, cloudFade );`,
      );
  };
  m.customProgramCacheKey = () => "voxel-cloud-sea";
  return m;
}

function CloudSea() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const boxes = useMemo(cloudBoxes, []);
  const uniforms = useMemo(
    () => ({ ...skyUniforms(), uCloudCenter: { value: new THREE.Vector2() }, uCloudWind: { value: new THREE.Vector2() } }),
    [],
  );
  const material = useMemo(() => cloudMaterial(uniforms), [uniforms]);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const tints = CLOUD_TINTS.map((hex) => new THREE.Color(hex));
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      m.makeScale(b.sx, b.sy, b.sz).setPosition(b.x, b.y, b.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, tints[b.tint]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes]);
  useFrame(({ camera }, delta) => {
    uniforms.uCloudCenter.value.set(camera.position.x, camera.position.z);
    // reduced motion: the sea holds still (and resumes from the same place when motion is allowed again)
    if (useWorld.getState().reducedMotion) return;
    // each axis wraps by the tile period, which the GPU wrap makes invisible
    const w = uniforms.uCloudWind.value;
    w.set(wrapTile(w.x + VIEW_R.x * WIND_SPEED * delta), wrapTile(w.y + VIEW_R.z * WIND_SPEED * delta));
  });
  return <instancedMesh ref={ref} args={[geometry, material, boxes.length]} frustumCulled={false} userData={{ noSeeThrough: true }} />;
}

/** Day to golden hour (daylight.ts): the sky gradient, the background and the fog warm together. */
function Daylight() {
  const scene = useThree((s) => s.scene);
  useFrame(({ clock }) => {
    const k = daylightK(clock.elapsedTime);
    daylight.k = k;
    mixColor(SKY_TOP, DAY.skyTop, k);
    mixColor(SKY_HORIZON, DAY.skyHorizon, k);
    if (scene.background instanceof THREE.Color) scene.background.copy(SKY_HORIZON);
    if (scene.fog) scene.fog.color.copy(SKY_HORIZON);
    seeThroughUniforms.uTime.value = clock.elapsedTime;
    windUniform.value = useWorld.getState().reducedMotion ? 0 : 1;
  });
  return null;
}

export function Sky() {
  return (
    <>
      <color attach="background" args={["#cbdce4"]} />
      <fog attach="fog" args={["#cbdce4", FOG_NEAR, FOG_FAR]} />
      <Daylight />
      <SkyDome />
      <CloudSea />
    </>
  );
}
