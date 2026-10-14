import { isSiteLink, type ProjectLinks } from "@/config/schema";

const LINK_LABELS: Record<keyof ProjectLinks, string> = {
  demo: "Visit",
  github: "Source code",
  discord: "Discord",
  roblox: "Play on Roblox",
};

export interface SeoLink { href: string; label: string; external: boolean }

/**
 * A project link as the text mirror shows it: an https link keeps its kind's label and opens in a new tab; a path on
 * this site (a demo build such as /demo/monosuko/) reads "Try <title>" and opens in the same tab. Null for an empty
 * link (an inactive sign) or anything that is not a site link.
 */
export function seoLink(key: keyof ProjectLinks, url: string | undefined, title: string): SeoLink | null {
  if (!url || !isSiteLink(url)) return null;
  const external = url.startsWith("https://");
  return { href: url, label: `${external ? LINK_LABELS[key] : "Try"} ${title}`, external };
}
