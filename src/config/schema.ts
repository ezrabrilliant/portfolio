export type District = "game" | "discord" | "web";

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
  island?: { accent?: string };
}

/** A year milestone on the Hero → GTID bridge; `moment: "graduation"` marks the one that plays the graduation moment. */
export interface Milestone { year: number; title: string; line: string; moment?: "graduation" }

export interface ValidationIssue { id: string; message: string }

export const DISTRICTS: readonly District[] = ["game", "discord", "web"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROCESS_CLAIMS = /\b(solo|end-to-end|self-hosted|self-managed|dockerized)\b/i;

/**
 * A link the site may open: an absolute `https://` URL, or a path on this site that starts with exactly one "/"
 * (`/demo/monosuko/`), so demos also work in a local preview. Never `//host` (protocol-relative) or whitespace.
 */
export function isSiteLink(url: string): boolean {
  return /^https:\/\/\S+$/.test(url) || /^\/(?!\/)\S*$/.test(url);
}

const validYear = (y: number) => Number.isInteger(y) && y >= 2000 && y <= 2100;

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
    if (!validYear(p.year)) add("year must be a 4-digit year");
    if (!DISTRICTS.includes(p.district)) add(`unknown district "${p.district}"`);
    if (p.tier !== "star" && p.tier !== "mini") add('tier must be "star" or "mini"');
    const accent = p.island?.accent;
    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) add("island.accent must be #RRGGBB");
    for (const [key, url] of Object.entries(p.links ?? {})) {
      if (url && !isSiteLink(url)) add(`links.${key} must be an https:// URL or a site path starting with one /`);
    }
  }
  return issues;
}

/** Years ascending and in 2000–2100, title and line required, results not process, at most one graduation moment. */
export function validateMilestones(list: readonly Milestone[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let graduations = 0;
  list.forEach((m, i) => {
    const add = (message: string) => issues.push({ id: `milestone ${m.year}`, message });
    if (!validYear(m.year)) add("year must be a 4-digit year");
    if (i > 0 && !(m.year > list[i - 1].year)) add("years must be in ascending order");
    if (!m.title || !m.title.trim()) add("title is required");
    if (!m.line || !m.line.trim()) add("line is required");
    if (PROCESS_CLAIMS.test(`${m.title ?? ""} ${m.line ?? ""}`)) add("milestone must describe the result, not the process");
    if (m.moment !== undefined && m.moment !== "graduation") add(`unknown moment "${m.moment as string}"`);
    if (m.moment === "graduation") graduations++;
  });
  if (graduations > 1) issues.push({ id: "milestones", message: "at most one graduation moment" });
  return issues;
}
