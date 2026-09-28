import { config } from './portfolio';

export interface CaseStudy {
  slug: string;
  title: string;
  year: number;
  status: 'live' | 'shipped' | 'completed';
  metric?: string;
  description: string;
  techSentence: string;
  links: { label: string; href: string }[];
}
export interface LiveSystem {
  proc: string; slug: string; name: string; what: string; metric: string;
  status: 'live' | 'shipped';
}
export interface ShipLogEntry { date: string; text: string; }

export const FEATURED_ORDER = [
  'orbit-store', 'petak-umpet', 'gtid', 'ezra-bot', 'pos-monosuko',
] as const;

function techSentence(techs: readonly string[]): string {
  if (techs.length === 1) return `Built with ${techs[0]}.`;
  return `Built with ${techs.slice(0, -1).join(', ')} and ${techs[techs.length - 1]}.`;
}

function linksOf(p: { github: string; demo: string }): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (p.demo) links.push({ label: new URL(p.demo).host.replace(/^www\./, ''), href: p.demo });
  if (p.github) links.push({ label: 'source', href: p.github });
  return links;
}

const statusBySlug = new Map<string, 'live' | 'shipped'>(
  config.liveSystems.map((s) => [s.slug, s.status]),
);

export function getCaseStudies(): CaseStudy[] {
  return config.projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    year: p.year,
    status: statusBySlug.get(p.slug) ?? 'completed',
    metric: 'metric' in p ? (p as { metric: string }).metric : undefined,
    description: p.description,
    techSentence: techSentence(p.technologies),
    links: linksOf(p),
  }));
}

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return getCaseStudies().find((c) => c.slug === slug);
}

export function getFeaturedCases(): CaseStudy[] {
  return FEATURED_ORDER.map((slug) => getCaseStudy(slug)!);
}

export function getMarketList(): CaseStudy[] {
  const rest = getCaseStudies()
    .filter((c) => !(FEATURED_ORDER as readonly string[]).includes(c.slug))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  return [...getFeaturedCases(), ...rest];
}

export function getLiveSystems(): LiveSystem[] {
  return [...config.liveSystems];
}

export function getFoldersByYear(): { year: number; slugs: string[] }[] {
  const map = new Map<number, string[]>();
  for (const p of config.projects) map.set(p.year, [...(map.get(p.year) ?? []), p.slug]);
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([year, slugs]) => ({ year, slugs }));
}

export function getShipLog(): ShipLogEntry[] {
  return [...config.shipLog].sort((a, b) => a.date.localeCompare(b.date));
}

export function getProjectCount(): number {
  return config.projects.length;
}

export function getContact(): { email: string; github: string; linkedin: string; resume: string } {
  return {
    email: config.personal.email,
    github: config.social.github,
    linkedin: config.social.linkedin,
    resume: config.personal.resume,
  };
}

export function getBio(): { name: string; location: string; paragraph: string } {
  return {
    name: config.personal.fullName,
    location: config.personal.location,
    paragraph: config.about.introduction,
  };
}

/** The university entry shown by whoami: chosen by degree text, not array position, so reordering
 *  config.education cannot swap in Bangkit. Falls back to the most recent entry by startDate. */
export function getEducation(): { degree: string; institution: string } {
  const pick = config.education.find((e) => e.degree.includes('Business Information Systems'))
    ?? [...config.education].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  return { degree: pick.degree, institution: pick.institution };
}

/** Link text from a configured URL: strips scheme, "www." and a trailing slash,
 *  so "https://github.com/ezrabrilliant/" becomes "github.com/ezrabrilliant". */
export function bare(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}
