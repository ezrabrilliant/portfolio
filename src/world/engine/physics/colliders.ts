/**
 * Prop collision (spec: voxel controls §2): boxes the size of what is drawn (a post, a board's panel, a gentong), turned
 * about y, instead of whole barrier blocks. The voxel grid keeps terrain and buildings; these hold everything thin, so
 * Ezra slips between posts and the camera (which only sees the grid) passes props by.
 */
export interface Collider {
  /** centre (world) */
  x: number; y: number; z: number;
  /** half sizes along the box's own axes */
  hx: number; hy: number; hz: number;
  /** turn about +y (Three's convention: local x maps to (cos, −sin) in world x/z) */
  ry: number;
  /** what it is (debugging, tests) */
  what?: string;
}

/** An axis-aligned box, min/max corners. */
export interface Aabb { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }

/** The collider's own axes in world x/z (unit vectors). */
function axes(c: Collider): { ux: number; uz: number; vx: number; vz: number } {
  const cos = Math.cos(c.ry);
  const sin = Math.sin(c.ry);
  return { ux: cos, uz: -sin, vx: sin, vz: cos };
}

/** The collider's world-space bounding box. */
export function colliderBounds(c: Collider): Aabb {
  const { ux, uz, vx, vz } = axes(c);
  const ex = Math.abs(ux) * c.hx + Math.abs(vx) * c.hz;
  const ez = Math.abs(uz) * c.hx + Math.abs(vz) * c.hz;
  return { x0: c.x - ex, y0: c.y - c.hy, z0: c.z - ez, x1: c.x + ex, y1: c.y + c.hy, z1: c.z + ez };
}

const GAP = 1e-9;

/** True when the box and the collider overlap (touching faces do not count): y intervals, then a 2-D separating-axis test. */
export function overlaps(b: Aabb, c: Collider): boolean {
  if (b.y1 <= c.y - c.hy + GAP || b.y0 >= c.y + c.hy - GAP) return false;
  const bx = (b.x0 + b.x1) / 2, bz = (b.z0 + b.z1) / 2;
  const bhx = (b.x1 - b.x0) / 2, bhz = (b.z1 - b.z0) / 2;
  const dx = c.x - bx, dz = c.z - bz;
  const { ux, uz, vx, vz } = axes(c);
  // world x and z axes
  if (Math.abs(dx) >= bhx + Math.abs(ux) * c.hx + Math.abs(vx) * c.hz - GAP) return false;
  if (Math.abs(dz) >= bhz + Math.abs(uz) * c.hx + Math.abs(vz) * c.hz - GAP) return false;
  // the collider's axes
  if (Math.abs(dx * ux + dz * uz) >= c.hx + bhx * Math.abs(ux) + bhz * Math.abs(uz) - GAP) return false;
  if (Math.abs(dx * vx + dz * vz) >= c.hz + bhx * Math.abs(vx) + bhz * Math.abs(vz) - GAP) return false;
  return true;
}

/** Colliders bucketed by the world columns their bounds cover, for quick box queries. */
export class ColliderSet {
  readonly all: readonly Collider[];
  private readonly buckets = new Map<string, number[]>();
  private readonly seen: number[] = [];
  private stamp = 0;

  constructor(colliders: readonly Collider[]) {
    this.all = colliders;
    colliders.forEach((c, i) => {
      const b = colliderBounds(c);
      for (let x = Math.floor(b.x0); x <= Math.floor(b.x1); x++) {
        for (let z = Math.floor(b.z0); z <= Math.floor(b.z1); z++) {
          const key = `${x},${z}`;
          const list = this.buckets.get(key);
          if (list) list.push(i);
          else this.buckets.set(key, [i]);
        }
      }
      this.seen.push(0);
    });
  }

  /** Calls `fn` once per collider whose bucket the box's columns reach; stops early when fn returns true. */
  private visit(b: Aabb, fn: (c: Collider) => boolean | void): boolean {
    const mark = ++this.stamp;
    for (let x = Math.floor(b.x0); x <= Math.floor(b.x1); x++) {
      for (let z = Math.floor(b.z0); z <= Math.floor(b.z1); z++) {
        const list = this.buckets.get(`${x},${z}`);
        if (!list) continue;
        for (const i of list) {
          if (this.seen[i] === mark) continue;
          this.seen[i] = mark;
          if (fn(this.all[i])) return true;
        }
      }
    }
    return false;
  }

  /** Does the box overlap any collider? */
  hits(b: Aabb): boolean {
    return this.visit(b, (c) => overlaps(b, c));
  }

  /** The highest top among colliders the box overlaps (−Infinity for none): where a step-up or a landing could stand. */
  topOf(b: Aabb): number {
    let top = -Infinity;
    this.visit(b, (c) => {
      if (overlaps(b, c)) top = Math.max(top, c.y + c.hy);
    });
    return top;
  }

  /**
   * The highest top, at most `feetY` (+ a hair), among colliders the box overlaps (−Infinity for none): what feet at
   * `feetY` could stand on. Unlike topOf, a post or panel that rises past the feet is skipped, not taken as a floor.
   */
  floorUnder(b: Aabb, feetY: number): number {
    let top = -Infinity;
    this.visit(b, (c) => {
      const t = c.y + c.hy;
      if (t <= feetY + 0.01 && overlaps(b, c)) top = Math.max(top, t);
    });
    return top;
  }

  /** Does any collider reach into the world cell (x, y, z)? Landing, seats and rails treat such a cell as taken. */
  touchesCell(x: number, y: number, z: number): boolean {
    return this.hits({ x0: x, y0: y, z0: z, x1: x + 1, y1: y + 1, z1: z + 1 });
  }
}

export const NO_COLLIDERS = new ColliderSet([]);
