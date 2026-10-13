import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { worldCopy, worldProjects } from "@/config/portfolio";
import { WorldBoundary, WorldLoadFailed } from "./WorldBoundary";

describe("WorldBoundary (around the lazily loaded 3D world)", () => {
  it("renders its children until something below throws", () => {
    const b = new WorldBoundary({ onError: () => undefined, children: "world" });
    expect(b.render()).toBe("world");
  });

  it("catches a render error or a failed chunk download: renders nothing and reports it once", () => {
    const onError = vi.fn();
    const b = new WorldBoundary({ onError, children: "world" });
    const err = new Error("Failed to fetch dynamically imported module");
    b.state = { ...b.state, ...WorldBoundary.getDerivedStateFromError() };
    expect(b.render()).toBeNull();
    b.componentDidCatch(err);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe("WorldLoadFailed (what the page shows instead)", () => {
  const html = renderToStaticMarkup(createElement(WorldLoadFailed, { onRetry: () => undefined }));

  it("says what happened in plain English and offers a retry", () => {
    expect(html).toContain("The 3D world couldn&#x27;t load. Here&#x27;s everything in text instead.");
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Try again<\/button>/);
  });

  it("shows all the content as readable text, not hidden for screen readers only", () => {
    expect(html).toContain("seo-mirror--visible");
    expect(html).not.toContain("sr-only");
    expect(html).toContain(worldCopy.heroName);
    for (const p of worldProjects) expect(html).toContain(p.title);
  });

  it("has no loader overlay", () => {
    expect(html).not.toContain("loader");
  });
});
