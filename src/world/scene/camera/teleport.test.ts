import { describe, expect, it } from "vitest";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import { TELEPORT_DIST, isTeleport, yawBehind } from "./teleport";

const still = { orbitX: 0, orbitY: 0, zoom: 0 };

describe("isTeleport", () => {
  it("is a step for moves up to TELEPORT_DIST and a teleport beyond", () => {
    const a = { x: 10, y: 5, z: -3 };
    expect(isTeleport(a, { x: 10.3, y: 5, z: -3.2 })).toBe(false);
    expect(isTeleport(a, { x: 10 + TELEPORT_DIST, y: 5, z: -3 })).toBe(false);
    expect(isTeleport(a, { x: 10 + TELEPORT_DIST + 0.01, y: 5, z: -3 })).toBe(true);
    expect(isTeleport(a, { x: 40, y: 7, z: 12 })).toBe(true);
  });
});

describe("yawBehind (the follow camera after a fast travel's arrival or a respawn)", () => {
  it("puts the camera straight behind Ezra's heading, whatever yaw it had before", () => {
    for (const heading of [0, 0.4, Math.PI / 2, 2.84, -2.2, Math.PI]) {
      const cam = { ...createFollowCam(), yaw: 1.7 };
      cam.yaw = yawBehind(heading);
      const feet = { x: 3, y: 2, z: -4 };
      const { position, lookAt } = updateFollowCam(cam, feet, heading, false, 1 / 60, still);
      const back = { x: position.x - lookAt.x, z: position.z - lookAt.z };
      const len = Math.hypot(back.x, back.z);
      // the camera sits opposite the way he faces
      expect(back.x / len).toBeCloseTo(-Math.sin(heading), 9);
      expect(back.z / len).toBeCloseTo(-Math.cos(heading), 9);
    }
  });

  it("stays in (−π, π]", () => {
    for (const heading of [-3, -1, 0, 1, 3, 7, -9]) {
      const y = yawBehind(heading);
      expect(y).toBeGreaterThan(-Math.PI - 1e-12);
      expect(y).toBeLessThanOrEqual(Math.PI + 1e-12);
    }
  });
});
