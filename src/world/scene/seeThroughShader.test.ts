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
});
