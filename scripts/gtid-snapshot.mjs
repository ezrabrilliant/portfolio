// Captures real gtid.pro data into the bundled fallback the GTID board shows when /api/gtid is unreachable.
// Usage: npm run gtid:snapshot
import { writeFileSync } from "node:fs";
import { createGtidProxy } from "../server/gtidProxy.js";

const proxy = createGtidProxy();
const [price, history, mods] = await Promise.all(["price", "history", "mods"].map((k) => proxy.get(k)));
const snapshot = { price: price.data, history: history.data, mods: mods.data, capturedAt: new Date().toISOString() };
const file = new URL("../src/world/scene/islands/gtid/snapshot.ts", import.meta.url);
writeFileSync(
  file,
  `// Captured from gtid.pro by scripts/gtid-snapshot.mjs. Fallback when the live proxy is unreachable.\n` +
    `import type { GtidSnapshot } from "./types";\n\n` +
    `export const GTID_SNAPSHOT: GtidSnapshot = ${JSON.stringify(snapshot, null, 2)};\n`,
);
console.log(`snapshot written (${snapshot.capturedAt}): DL buy ${snapshot.price.buy}, ${snapshot.history.points.length} points, ${snapshot.mods.online.length} mods`);
