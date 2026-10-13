import { describe, expect, it } from "vitest";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";

const noInput = { orbitX: 0, orbitY: 0, zoom: 0 };
const target = { x: 10, y: 5, z: -3 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

describe("followCam", () => {
  it("starts with the documented defaults", () => {
    expect(createFollowCam()).toEqual({ yaw: 0, pitch: 0.35, distance: 7 });
  });

  it("orbits, clamps pitch and zoom", () => {
    const cam = createFollowCam();
    updateFollowCam(cam, target, 0, false, 1 / 60, { orbitX: 0.5, orbitY: 5, zoom: 10 });
    expect(cam.yaw).toBeCloseTo(0.5, 9);
    expect(cam.pitch).toBe(1.2);
    expect(cam.distance).toBe(14);
    updateFollowCam(cam, target, 0, false, 1 / 60, { orbitX: 0, orbitY: -5, zoom: -0.99 });
    expect(cam.pitch).toBe(0.05);
    expect(cam.distance).toBe(3);
  });

  it("keeps the camera `distance` away from a look-at above the target", () => {
    const cam = createFollowCam();
    const { position, lookAt } = updateFollowCam(cam, target, 0, false, 1 / 60, noInput);
    expect(lookAt.x).toBe(10);
    expect(lookAt.y).toBeCloseTo(6.4, 12);
    expect(lookAt.z).toBe(-3);
    expect(Math.hypot(position.x - lookAt.x, position.y - lookAt.y, position.z - lookAt.z)).toBeCloseTo(7, 9);
    expect(position.y).toBeGreaterThan(lookAt.y);
  });

  it("swings behind a moving character", () => {
    const cam = createFollowCam();
    for (let i = 0; i < 180; i++) updateFollowCam(cam, target, 0, true, 1 / 60, noInput);
    expect(Math.abs(wrap(cam.yaw - Math.PI))).toBeLessThan(0.05);
    const { position } = updateFollowCam(cam, target, 0, true, 1 / 60, noInput);
    expect(position.z).toBeLessThan(target.z);        // facing +z, so the camera sits on the -z side
  });

  it("takes the short way round", () => {
    const cam = { yaw: 3.0, pitch: 0.35, distance: 7 };
    const heading = -3.0 - Math.PI;                     // desired yaw ≡ -3.0, i.e. just past +π
    updateFollowCam(cam, target, heading, true, 0.1, noInput);
    expect(cam.yaw).toBeGreaterThan(3.0);
  });

  it("holds yaw while standing still", () => {
    const cam = createFollowCam();
    updateFollowCam(cam, target, 2, false, 1, noInput);
    expect(cam.yaw).toBe(0);
  });
});
