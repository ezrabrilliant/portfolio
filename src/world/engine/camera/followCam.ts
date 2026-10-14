import type { Vec3 } from "@/world/engine/types";

export interface FollowCam { yaw: number; pitch: number; distance: number }

const MIN_PITCH = 0.05, MAX_PITCH = 1.2;
const MIN_DIST = 3, MAX_DIST = 14;
const FOLLOW_RATE = 2.5;
const HEAD = 1.4;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function createFollowCam(): FollowCam {
  return { yaw: 0, pitch: 0.35, distance: 7 };
}

export function updateFollowCam(
  cam: FollowCam, target: Vec3, heading: number, moving: boolean, dt: number,
  input: { orbitX: number; orbitY: number; zoom: number },
): { position: Vec3; lookAt: Vec3 } {
  // game-style look: a drag to the right turns the view right (the camera swings left around Ezra), matching the
  // vertical axis where a drag down looks further down
  cam.yaw -= input.orbitX;
  cam.pitch = clamp(cam.pitch + input.orbitY, MIN_PITCH, MAX_PITCH);
  cam.distance = clamp(cam.distance * (1 + input.zoom), MIN_DIST, MAX_DIST);
  if (moving && input.orbitX === 0 && input.orbitY === 0) {
    const desired = heading + Math.PI;
    cam.yaw += wrap(desired - cam.yaw) * (1 - Math.exp(-FOLLOW_RATE * dt));
  }
  const lookAt = { x: target.x, y: target.y + HEAD, z: target.z };
  const cp = Math.cos(cam.pitch);
  return {
    position: {
      x: lookAt.x + Math.sin(cam.yaw) * cp * cam.distance,
      y: lookAt.y + Math.sin(cam.pitch) * cam.distance,
      z: lookAt.z + Math.cos(cam.yaw) * cp * cam.distance,
    },
    lookAt,
  };
}
