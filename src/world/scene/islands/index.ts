import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
