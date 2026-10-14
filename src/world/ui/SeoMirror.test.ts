import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { SeoMirror } from "./SeoMirror";

/** How renderToStaticMarkup escapes text. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("SeoMirror (the text version of the world)", () => {
  const html = renderToStaticMarkup(createElement(SeoMirror, { visible: true }));

  it("lists every world project, stars and Web & Apps minis, with its line", () => {
    for (const p of worldProjects) {
      expect(html).toContain(`<h2 id="seo-${p.id}">${esc(p.title)}</h2>`);
      expect(html).toContain(esc(p.line));
    }
  });

  it("links the live projects in a new tab and leaves out inactive demo signs", () => {
    expect(html).toContain('<a href="https://gtid.pro" target="_blank" rel="noopener noreferrer">Visit GTID</a>');
    expect(html).toContain(
      '<a href="https://github.com/aliefauzan/Bangkit-Project-PeduliPasal/releases/tag/1.5.3" target="_blank" rel="noopener noreferrer">Visit PeduliPasal</a>',
    );
    expect(html).not.toContain("Try POS Monosuko");
    expect(html).not.toContain("Try Bee Furniture CRM");
    expect(html).not.toContain('href=""');
  });

  it("has an Education section with the three milestones, in order", () => {
    expect(html).toContain('<h2 id="seo-education">Education</h2>');
    const years = [
      "<time>2022</time> Started Business Information Systems · Petra Christian University",
      "<time>2024</time> Bangkit Academy · Mobile Development, graduated with Distinction",
      "<time>2026</time> Graduated · Business Information Systems, Petra Christian University",
    ];
    for (const y of years) expect(html).toContain(y);
    expect(html.indexOf(years[0])).toBeLessThan(html.indexOf(years[1]));
    expect(html.indexOf(years[1])).toBeLessThan(html.indexOf(years[2]));
    expect(html).not.toMatch(/top (graduate|student)/i);
  });
});
