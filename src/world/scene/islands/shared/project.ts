import { worldCopy, worldProjects } from "@/config/portfolio";
import type { WorldProject } from "@/config/schema";
import { WEB_PLAZA_ID } from "@/world/engine/gen/layout";

export function projectById(id: string): WorldProject {
  const p = worldProjects.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown world project: ${id}`);
  return p;
}

/** Display name of an island: its project's title, the hero's name, or the district name for the Web & Apps plaza. */
export function islandTitle(id: string): string {
  if (id === "hero") return worldCopy.heroName;
  if (id === WEB_PLAZA_ID) return worldCopy.webDistrict;
  return worldProjects.find((x) => x.id === id)?.title ?? id;
}
