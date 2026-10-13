/**
 * Orbit Store mark traced from showreel/brief/logo.jpg (coordinates in its 2000 px space): edges are least-squares lines
 * through the image's edge pixels, the ring an ellipse fitted to the stroke's centre line (max residual 1.5 px).
 */
export const ORBIT_LOGO = {
  size: 2.2, // tile face size in world units (the whole 2000 px image)
  src: 2000,
  outer: [[429, 603], [1588, 484], [1568, 1363], [409, 1524]],
  radii: [183, 172, 172, 183], // corner radii, px
  hole: [[686, 770], [1364, 670], [1330, 1222], [670, 1303]], // sharp corners
  ringCenter: [1004, 929],
  ringTilt: -0.1049, // rad, right side lower
  ra: 679, // ring semi-axes, px
  rb: 114,
  rd: 0.24, // ring depth (world units): front arc in front of the O, back arc behind it
  tube: 0.013, // ring stroke 19.6 px = 0.0216 wide; a touch thicker so it still reads from the tour camera
  rim: 0.022, // background-blue cut line along the ring's outer edge where its front arc crosses the O (19 px)
  standoff: 0.3, // mark distance in front of the tile face
  depth: 0.2, // O thickness: front face at +depth/2, back face at −depth/2 (bevel included)
} as const;

const S = ORBIT_LOGO.size / ORBIT_LOGO.src;

export function toTile(x: number, y: number): { x: number; y: number } {
  return { x: (x - 1000) * S, y: -(y - 1000) * S };
}

/** Point on the ring curve (relative to the ring centre, before the in-plane tilt). */
export function ringPoint(theta: number): { x: number; y: number; z: number } {
  return {
    x: ORBIT_LOGO.ra * S * Math.cos(theta),
    y: -ORBIT_LOGO.rb * S * Math.sin(theta),
    z: ORBIT_LOGO.rd * Math.sin(theta),
  };
}

export function pointInPolygon(p: { x: number; y: number }, poly: readonly { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
