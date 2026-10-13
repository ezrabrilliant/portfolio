export interface FollowGate {
  /** Heading to hand to `updateFollowCam` (pulled toward the camera's forward when off-axis). */
  heading: number;
  /** Whether `updateFollowCam` should auto-follow at all this frame. */
  follow: boolean;
}

const smoothstep = (x: number, lo: number, hi: number) => {
  const t = x <= lo ? 0 : x >= hi ? 1 : (x - lo) / (hi - lo);
  return t * t * (3 - 2 * t);
};

/**
 * Decides how much the follow camera trails Ezra. Movement is camera-relative, so trailing a
 * strafe/backpedal heading feeds back into the input and spins the camera. The weight fades from
 * 1 (moving straight away) to 0 at ~26° off-axis, so keyboard diagonals and strafes never drive the
 * camera, while a slightly angled analog stick steers with a turn rate that fades out smoothly
 * (no lock-on cliff at the gate edge). Rides always trail fully.
 * Writes into `out` (called every frame).
 */
export function followGate(heading: number, camYaw: number, moving: boolean, riding: boolean, out: FollowGate): FollowGate {
  const d = heading + Math.PI - camYaw;
  const err = Math.atan2(Math.sin(d), Math.cos(d)); // 0 = moving straight away from the camera
  const w = riding ? 1 : moving ? smoothstep(Math.cos(err), 0.9, 1) : 0;
  // updateFollowCam eases the yaw by (heading + π − yaw) = err; pulling the heading back by (1 − w)·err
  // scales that to w·err
  out.heading = heading - (1 - w) * err;
  out.follow = w > 0;
  return out;
}
