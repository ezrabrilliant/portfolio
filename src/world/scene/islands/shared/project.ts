import { worldProjects } from "@/config/portfolio";
import type { WorldProject } from "@/config/schema";

export function projectById(id: string): WorldProject {
  const p = worldProjects.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown world project: ${id}`);
  return p;
}
