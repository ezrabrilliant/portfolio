import type { JSX } from "react";
import { milestones, worldCopy, worldProjects } from "@/config/portfolio";
import type { ProjectLinks } from "@/config/schema";
import { seoLink, type SeoLink } from "./seoLinks";

export function SeoMirror({ visible = false }: { visible?: boolean }): JSX.Element {
  return (
    <main className={visible ? "seo-mirror seo-mirror--visible" : "seo-mirror sr-only"}>
      <header>
        <h1>{worldCopy.heroName}</h1>
        <p>{worldCopy.heroLine}</p>
        <p>{worldCopy.location}</p>
      </header>
      {worldProjects.map((p) => {
        const links = (Object.keys(p.links) as Array<keyof ProjectLinks>)
          .map((k) => [k, seoLink(k, p.links[k], p.title)] as const)
          .filter((e): e is readonly [keyof ProjectLinks, SeoLink] => e[1] !== null);
        return (
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
            {links.length > 0 && (
              <p>
                {links.map(([k, l]) =>
                  l.external ? (
                    <a key={k} href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  ) : (
                    <a key={k} href={l.href}>
                      {l.label}
                    </a>
                  ),
                )}
              </p>
            )}
          </section>
        );
      })}
      <section aria-labelledby="seo-education">
        <h2 id="seo-education">Education</h2>
        <ul>
          {milestones.map((m) => (
            <li key={m.year}>
              <time>{m.year}</time>
              {` ${m.title} · ${m.line}`}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
