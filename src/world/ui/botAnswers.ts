import { config, milestones, worldCopy, worldProjects } from "@/config/portfolio";
import type { WorldProject } from "@/config/schema";

/**
 * Ezra Bot's answers (polish 2B): written from the portfolio's own data (the projects, their numbers and links, the
 * milestones), matched to what the visitor asks by keywords. No AI: every answer is one Ezra has already published.
 */
export interface BotReply {
  text: string;
  /** a link the answer points to */
  link?: { label: string; href: string };
  /** this answer offers the contact form */
  contact?: boolean;
}

/** The quick questions under the chat. */
export const SUGGESTIONS = ["Who is Ezra?", "What has he built?", "What does he use?", "How do I contact him?"] as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const has = (q: string, words: readonly string[]) => words.some((w) => new RegExp(`\\b${w}`).test(q));

function projectReply(p: WorldProject): BotReply {
  const stats = p.stats?.length ? ` ${p.stats.join(" · ")}.` : "";
  const href = p.links.demo || p.links.roblox || p.links.discord || "";
  const label = p.links.roblox ? "Play on Roblox" : p.links.discord ? "Add to Discord" : "Open it";
  return { text: `${p.title} (${p.year}): ${p.line}${stats} Built with ${p.tags.join(", ")}.`, ...(href ? { link: { label, href } } : {}) };
}

/** The project a question names, by its title or id (first match). */
function projectIn(q: string): WorldProject | undefined {
  return worldProjects.find((p) => q.includes(norm(p.title)) || q.includes(norm(p.id).replace(/ /g, " ")));
}

const graduated = milestones.find((m) => m.moment === "graduation");
const bangkit = milestones.find((m) => /bangkit/i.test(m.title));

/** Ezra Bot's reply to `question`. */
export function botReply(question: string): BotReply {
  const q = norm(question);
  const p = projectIn(q);
  if (p) return projectReply(p);
  if (has(q, ["contact", "email", "hire", "message", "reach", "talk", "work with"])) {
    return { text: `You can write to Ezra right here, or email ${config.personal.email}.`, contact: true };
  }
  if (has(q, ["skill", "tech", "stack", "use", "language", "framework", "tool"])) {
    const tags = [...new Set(worldProjects.flatMap((x) => x.tags))];
    return { text: `Across his projects: ${tags.join(", ")}.` };
  }
  if (has(q, ["built", "build", "project", "made", "make", "work", "portfolio", "app"])) {
    const stars = worldProjects.filter((x) => x.tier === "star").map((x) => x.title);
    const rest = worldProjects.filter((x) => x.tier !== "star").map((x) => x.title);
    return { text: `The big ones: ${stars.join(", ")}. Also ${rest.join(", ")}. Ask me about any of them by name.` };
  }
  if (has(q, ["study", "studied", "university", "degree", "graduat", "school", "educat", "bangkit", "campus"])) {
    const parts = [graduated && `Graduated in ${graduated.line} (${graduated.year})`, bangkit && `${bangkit.title} ${bangkit.year}: ${bangkit.line}`].filter(Boolean);
    return { text: `${parts.join(". ")}.` };
  }
  if (has(q, ["who", "about", "ezra", "yourself", "him", "introduc", "hello", "hi", "hey"])) {
    return { text: `${worldCopy.heroName}, from ${worldCopy.location}. ${worldCopy.heroLine}${graduated ? ` He graduated in ${graduated.line} in ${graduated.year}.` : ""}` };
  }
  if (has(q, ["github", "linkedin", "instagram", "social"])) {
    return { text: "He's on GitHub as ezrabrilliant.", link: { label: "GitHub", href: config.social.github } };
  }
  return { text: "I only know about Ezra and his projects. Try one of the questions below, or ask about GTID, Petak Umpet or Orbit Store." };
}
