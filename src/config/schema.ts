export type District = "game" | "discord" | "web";
export type IslandTemplate = "workshop" | "shop" | "tower" | "garden" | "lab";

export interface ProjectLinks { demo?: string; github?: string; discord?: string; roblox?: string }

export interface WorldProject {
  id: string;
  title: string;
  year: number;
  line: string;
  stats?: string[];
  tags: string[];
  district: District;
  tier: "star" | "mini";
  links: ProjectLinks;
  screenshot?: string;
  island?: { template?: IslandTemplate; accent?: string };
}

export interface ValidationIssue { id: string; message: string }

export const DISTRICTS: readonly District[] = ["game", "discord", "web"];
const TEMPLATES: readonly IslandTemplate[] = ["workshop", "shop", "tower", "garden", "lab"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROCESS_CLAIMS = /\b(solo|end-to-end|self-hosted|self-managed|dockerized)\b/i;

export function validateProjects(list: readonly WorldProject[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const id = p.id || "(missing id)";
    const add = (message: string) => issues.push({ id, message });
    if (!p.id || !SLUG.test(p.id)) add("id must be a lowercase slug");
    if (p.id && seen.has(p.id)) add("duplicate id");
    seen.add(p.id);
    if (!p.title || !p.title.trim()) add("title is required");
    if (!p.line || !p.line.trim()) add("line is required");
    if (p.line && PROCESS_CLAIMS.test(p.line)) add("line must describe the result, not the process");
    if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2100) add("year must be a 4-digit year");
    if (!DISTRICTS.includes(p.district)) add(`unknown district "${p.district}"`);
    if (p.tier !== "star" && p.tier !== "mini") add('tier must be "star" or "mini"');
    const template = p.island?.template;
    if (template && !TEMPLATES.includes(template)) add(`unknown island template "${template}"`);
    const accent = p.island?.accent;
    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) add("island.accent must be #RRGGBB");
    for (const [key, url] of Object.entries(p.links ?? {})) {
      if (url && !url.startsWith("https://")) add(`links.${key} must start with https://`);
    }
  }
  return issues;
}
