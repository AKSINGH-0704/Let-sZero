// M30 — technical SEO signals that are emitted at build time, so they can only
// be verified against the route config and the head builder, not the DOM.

import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { getPublicRoutes, STATIC_ROUTES } from "../../script/prerender-routes.js";
import { generateSitemap } from "../../script/generate-sitemap.js";

let routes, articleRoute, academyRoute, collectionRoute, staticRoute;

beforeAll(async () => {
  routes = await getPublicRoutes({ log: () => {} });
  articleRoute = routes.find((r) => r.path === "/repmail/learn/outreach/instantly-pricing");
  academyRoute = routes.find((r) => r.path === "/repmail/learn/deliverability");
  collectionRoute = routes.find((r) => r.path === "/repmail/learn/collections/tool-reviews");
  staticRoute = routes.find((r) => r.path === "/pricing");
});

describe("Open Graph article signals", () => {
  it("article routes declare og:type article with real published and modified times", () => {
    expect(articleRoute).toBeTruthy();
    expect(articleRoute.ogType).toBe("article");
    // Dates come from frontmatter, so they cannot drift from the article.
    expect(articleRoute.publishedTime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(articleRoute.modifiedTime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(articleRoute.section).toBe("Outreach & Sales Engagement");
    expect(articleRoute.articleTags.length).toBeGreaterThan(0);
  });

  it("every article route carries article metadata, not just the one sampled", () => {
    const articleRoutes = routes.filter((r) => r.componentPath?.endsWith("ArticlePage.jsx"));
    expect(articleRoutes.length).toBeGreaterThan(70);
    const missing = articleRoutes.filter((r) => r.ogType !== "article" || !r.publishedTime || !r.section);
    expect(missing.map((r) => r.path)).toEqual([]);
  });

  it("non-article routes do not claim to be articles", () => {
    expect(academyRoute.ogType).toBeUndefined();
    expect(staticRoute.ogType).toBeUndefined();
  });
});

describe("sitemap lastmod is a real freshness signal", () => {
  it("article routes carry their own lastmod, not the build date", () => {
    expect(articleRoute.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(articleRoute.lastmod).toBe(articleRoute.modifiedTime);
  });

  it("hubs, paths and collections inherit the newest date among their members", () => {
    // A hub is only as fresh as its freshest guide; claiming otherwise on every
    // deploy is the pattern that makes lastmod worthless.
    expect(academyRoute.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(collectionRoute.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const articleDates = routes
      .filter((r) => r.componentPath?.endsWith("ArticlePage.jsx") && r.path.startsWith("/repmail/learn/deliverability/"))
      .map((r) => r.lastmod)
      .sort();
    expect(academyRoute.lastmod).toBe(articleDates[articleDates.length - 1]);
  });

  it("the generated XML uses per-URL lastmod rather than one date for everything", async () => {
    const distDir = await mkdtemp(path.join(tmpdir(), "sitemap-"));
    // A sentinel build date: any content-derived URL that still shows it would
    // mean the per-route lastmod never reached the XML.
    const xml = await generateSitemap({ routes, distDir, lastmod: "1999-01-01", log: () => {} });

    const entries = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
      .map(([, loc, mod]) => ({ loc, mod }));
    expect(entries.length).toBe(routes.length);

    const articleEntry = entries.find((e) => e.loc.endsWith("/repmail/learn/outreach/instantly-pricing"));
    expect(articleEntry.mod).toBe(articleRoute.lastmod);
    expect(articleEntry.mod).not.toBe("1999-01-01");

    // More than one distinct date across the sitemap is the whole point.
    expect(new Set(entries.map((e) => e.mod)).size).toBeGreaterThan(1);

    // Only the hand-written static pages may carry the build date.
    const sentinel = entries.filter((e) => e.mod === "1999-01-01").map((e) => new URL(e.loc).pathname);
    const staticPaths = new Set(STATIC_ROUTES.map((r) => r.path));
    expect(sentinel.every((p) => staticPaths.has(p) || p === "")).toBe(true);

    await rm(distDir, { recursive: true, force: true });
  });

  it("hand-written static routes still fall back to the build date", () => {
    for (const s of STATIC_ROUTES) {
      const r = routes.find((x) => x.path === s.path);
      expect(r.lastmod).toBeUndefined();
    }
  });
});
