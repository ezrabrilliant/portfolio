import type { IslandPlacement } from "@/world/engine/gen/layout";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/**
 * The plaza sign's line under the district name: how many Web & Apps minis are chained from the plaza in the layout
 * ("Three projects ahead"), spelt out up to twelve. A mini added to the config changes it with the islands.
 */
export function projectsAheadLine(islands: readonly Pick<IslandPlacement, "kind" | "district">[]): string {
  const n = islands.filter((i) => i.kind === "mini" && i.district === "web").length;
  return `${n < WORDS.length ? WORDS[n] : String(n)} ${n === 1 ? "project" : "projects"} ahead`;
}
