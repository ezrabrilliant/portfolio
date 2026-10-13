import type { JSX } from "react";
import { worldCopy, worldProjects } from "@/config/portfolio";
import type { ProjectLinks } from "@/config/schema";

const LINK_LABELS: Record<keyof ProjectLinks, string> = {
  demo: "Visit",
  github: "Source code",
  discord: "Discord",
  roblox: "Play on Roblox",
};

export function SeoMirror({ visible = false }: { visible?: boolean }): JSX.Element {
  return (
    <main className={visible ? "seo-mirror seo-mirror--visible" : "seo-mirror sr-only"}>
      <header>
        <h1>{worldCopy.heroName}</h1>
        <p>{worldCopy.heroLine}</p>
        <p>{worldCopy.location}</p>
      </header>
      {worldProjects.map((p) => (
        <section key={p.id} aria-labelledby={`seo-${p.id}`}>
          <h2 id={`seo-${p.id}`}>{p.title}</h2>
          <p>{p.line}</p>
          {p.stats && p.stats.length > 0 && (
            <ul>
              {p.stats.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <p>
            {(Object.keys(p.links) as Array<keyof ProjectLinks>)
              .filter((k) => !!p.links[k])
              .map((k) => (
                <a key={k} href={p.links[k]} target="_blank" rel="noopener noreferrer">
                  {LINK_LABELS[k]} {p.title}
                </a>
              ))}
          </p>
        </section>
      ))}
    </main>
  );
}
