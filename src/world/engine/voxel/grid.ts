import type { IsSolid } from "@/world/engine/types";
import { blockDef, type BlockId } from "@/world/engine/voxel/blocks";

const OFFSET = 1024;          // supported coordinates: [-1024, 1023] on every axis
const SPAN = 2048;

function key(x: number, y: number, z: number): number {
  return ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET);
}

function inRange(v: number): boolean {
  return Number.isInteger(v) && v >= -OFFSET && v < OFFSET;
}

/** Sparse world of blocks. Block (x, y, z) fills [x, x+1) × [y, y+1) × [z, z+1). */
export class VoxelGrid {
  private cells = new Map<number, BlockId>();

  set(x: number, y: number, z: number, id: BlockId): void {
    if (!inRange(x) || !inRange(y) || !inRange(z)) {
      throw new Error(`VoxelGrid.set: coordinates must be integers in [-1024, 1023], got ${x},${y},${z}`);
    }
    const k = key(x, y, z);
    if (id === 0) this.cells.delete(k);
    else this.cells.set(k, id);
  }

  get(x: number, y: number, z: number): BlockId {
    return this.cells.get(key(x, y, z)) ?? 0;
  }

  /** Floors its inputs, so callers may pass world positions. */
  isSolid: IsSolid = (x, y, z) => {
    const id = this.get(Math.floor(x), Math.floor(y), Math.floor(z));
    return id !== 0 && (blockDef(id)?.solid ?? false);
  };

  forEach(cb: (x: number, y: number, z: number, id: BlockId) => void): void {
    for (const [k, id] of this.cells) {
      const z = (k % SPAN) - OFFSET;
      const rest = Math.floor(k / SPAN);
      const y = (rest % SPAN) - OFFSET;
      const x = Math.floor(rest / SPAN) - OFFSET;
      cb(x, y, z, id);
    }
  }

  get size(): number {
    return this.cells.size;
  }
}
