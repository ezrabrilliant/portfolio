export type BlockName = "grass" | "earth" | "stone" | "plank" | "wood" | "roof" | "leaf" | "crate"
  | "orange" | "blue" | "white" | "iron" | "barrier";
export type BlockId = number;

export interface BlockDef { id: BlockId; name: BlockName; colors: string[]; solid: boolean; visible: boolean }

// Muted natural palette from the approved sketch (spec §4). Order defines ids: never reorder, only append.
const DEFS: Array<Omit<BlockDef, "id">> = [
  { name: "grass", colors: ["#8ea769", "#86a062", "#97ae73", "#7f995d"], solid: true, visible: true },
  { name: "earth", colors: ["#94714f", "#8a6849", "#9d7a57"], solid: true, visible: true },
  { name: "stone", colors: ["#b5afa5", "#a9a399", "#bfb9af", "#a19b91"], solid: true, visible: true },
  { name: "plank", colors: ["#b98f62", "#ad8458"], solid: true, visible: true },
  { name: "wood", colors: ["#6b4f37"], solid: true, visible: true },
  { name: "roof", colors: ["#b5674b", "#a85d43", "#bb6f52"], solid: true, visible: true },
  { name: "leaf", colors: ["#6e8e57", "#7a9862", "#66854f", "#82a068"], solid: true, visible: true },
  { name: "crate", colors: ["#a87f55", "#9c744c", "#b08659"], solid: true, visible: true },
  { name: "orange", colors: ["#FA5D19"], solid: true, visible: true },
  { name: "blue", colors: ["#3D62F8"], solid: true, visible: true },
  { name: "white", colors: ["#f4f3ef"], solid: true, visible: true },
  { name: "iron", colors: ["#3b3d42", "#45474c"], solid: true, visible: true },
  { name: "barrier", colors: ["#000000"], solid: true, visible: false },
];

const BY_ID: BlockDef[] = DEFS.map((d, i) => ({ ...d, id: i + 1 }));
const BY_NAME = new Map<BlockName, BlockDef>(BY_ID.map((d) => [d.name, d]));

export const BLOCK_NAMES: readonly BlockName[] = DEFS.map((d) => d.name);

export function blockId(name: BlockName): BlockId {
  const def = BY_NAME.get(name);
  if (!def) throw new Error(`unknown block "${name}"`);
  return def.id;
}

export function blockDef(id: BlockId): BlockDef | undefined {
  return id > 0 ? BY_ID[id - 1] : undefined;
}
