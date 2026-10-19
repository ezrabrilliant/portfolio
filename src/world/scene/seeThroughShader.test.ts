import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applySeeThrough, patchSceneSeeThrough, patchSeeThroughShader, seeThroughUniforms } from "./seeThroughShader";

describe("see-through capsule", () => {
  it("patches the vertex and fragment shaders at their chunks and shares the uniforms", () => {
    const shader = {
      uniforms: {},
      vertexShader: "void main(){\n#include <project_vertex>\n}",
      fragmentShader: "void main(){\n#include <clipping_planes_fragment>\n}",
    };
    patchSeeThroughShader(shader);
    expect(shader.vertexShader).toContain("vSeeWorld = ");
    expect(shader.fragmentShader).toContain("discard");
    expect(shader.uniforms).toMatchObject({ uSeeOn: seeThroughUniforms.uSeeOn });
  });

  it("skips subtrees marked noSeeThrough and patches each material once", () => {
    const prop = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    const terrainMat = new THREE.MeshStandardMaterial();
    const terrain = new THREE.Mesh(new THREE.BoxGeometry(), terrainMat);
    terrain.userData.noSeeThrough = true;
    const root = new THREE.Group();
    root.add(prop, terrain);
    patchSceneSeeThrough(root);
    const key = (prop.material as THREE.Material).customProgramCacheKey();
    expect(key).toContain("see");
    applySeeThrough(prop.material as THREE.Material);
    expect((prop.material as THREE.Material).customProgramCacheKey()).toBe(key);
    expect(terrainMat.customProgramCacheKey()).not.toContain("see");
  });

  // the graduation outfit's material is shared by Ezra (seeSolid: never faded) and the cap on the 2026 pillar (a prop,
  // faded on the camera line). Patched once with the pillar's flags, Ezra's gown and cap dithered on the camera line
  for (const pillarFirst of [true, false]) {
    it(`a material shared by a solid and a fading mesh gives each its own variant (${pillarFirst ? "prop" : "Ezra"} met first)`, () => {
      const shared = new THREE.MeshStandardMaterial();
      const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(), shared);
      const ezra = new THREE.Group();
      ezra.userData.seeSolid = true;
      const gown = new THREE.Mesh(new THREE.BoxGeometry(), shared);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(), shared);
      ezra.add(gown, cap);
      const root = new THREE.Group();
      if (pillarFirst) root.add(pillarCap, ezra);
      else root.add(ezra, pillarCap);
      patchSceneSeeThrough(root);
      const keyOf = (m: THREE.Mesh) => (m.material as THREE.Material).customProgramCacheKey();
      expect(keyOf(gown)).toContain("|solid");
      expect(keyOf(cap)).toContain("|solid");
      expect(keyOf(pillarCap)).toContain("see");
      expect(keyOf(pillarCap)).not.toContain("|solid");
      // Ezra's two pieces still share one material (no clone per mesh), and a second walk changes nothing
      expect(gown.material).toBe(cap.material);
      const before = [gown.material, cap.material, pillarCap.material];
      patchSceneSeeThrough(root);
      expect([gown.material, cap.material, pillarCap.material]).toEqual(before);
    });
  }
});
