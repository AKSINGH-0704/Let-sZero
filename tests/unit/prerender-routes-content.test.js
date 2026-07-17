// M22-D / M27 — structural tests on the real route list itself (data, not the
// prerender mechanism — that's tested against a fixture in prerender.test.js
// per its own header comment).
//
// M27 changed the subject under test: routes are no longer a hand-written
// array, they are derived from the real content directory by getPublicRoutes().
// So the load-bearing assertion is no longer "these 17 specific paths exist"
// but "every article on disk has a route" — the invariant whose absence let the
// M27 content ship with a 24-URL sitemap while RSS reported 60 articles.

import { describe, it, expect } from "vitest";
import path from "path";
import { getPublicRoutes, STATIC_ROUTES } from "../../script/prerender-routes.js";
import { loadAuthors, loadArticles } from "../../shared/content/loader.js";

const CANONICAL = "https://www.letszero.in/repmail/learn";
const CONTENT_DIR = path.resolve(import.meta.dirname, "..", "..", "client", "src", "content");

const routes = await getPublicRoutes();
const authors = await loadAuthors(CONTENT_DIR, "repmail", { log: () => {} });
const articles = await loadArticles(CONTENT_DIR, "repmail", authors, { log: () => {} });

function findRoute(p) {
  return routes.find((r) => r.path === p);
}

describe("getPublicRoutes — derived from the real content, never hand-maintained", () => {
  it("emits a route for every article on disk — the sitemap can never silently lag the content again", () => {
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      const expected = `/repmail/learn/${article.academy.slug}/${article.slug}`;
      expect(findRoute(expected), `missing route for article ${article.slug}`).toBeTruthy();
    }
  });

  it("carries the M22-D Wave 1 routes forward unchanged, alongside the M27 additions", () => {
    const expectedPaths = [
      "/repmail/learn",
      "/repmail/learn/deliverability",
      "/repmail/learn/cold-email",
      "/repmail/learn/deliverability/why-your-emails-land-in-spam",
      "/repmail/learn/cold-email/where-repmail-fits-in-your-workflow",
      "/repmail/learn/authors/repmail-team",
      "/repmail/learn/paths/getting-started",
      "/repmail/learn/collections/getting-your-first-campaign-delivered",
      // M27 — the new academies, a glossary term, a comparison, a path, a collection.
      "/repmail/learn/glossary",
      "/repmail/learn/email-platform",
      "/repmail/learn/glossary/dkim",
      "/repmail/learn/outreach/instantly-vs-repmail",
      "/repmail/learn/paths/deliverability-mastery",
      "/repmail/learn/collections/complete-guides",
    ];
    for (const p of expectedPaths) expect(findRoute(p), `missing route ${p}`).toBeTruthy();
  });

  it("only emits an Academy hub once that Academy has content — an empty Academy is never indexed as a thin page", () => {
    const academySlugsWithContent = new Set(articles.map((a) => a.academy.slug));
    expect(academySlugsWithContent.has("lead-generation")).toBe(false);
    expect(findRoute("/repmail/learn/lead-generation")).toBeFalsy();
    expect(findRoute("/repmail/learn/compliance")).toBeFalsy();
  });

  it("every article route reuses buildArticleJsonLd — BlogPosting with an Organization author (repmail-team, ADR-014), built from the real frontmatter", () => {
    const route = findRoute("/repmail/learn/deliverability/why-your-emails-land-in-spam");
    const jsonLd = route.jsonLd(`${CANONICAL}/deliverability/why-your-emails-land-in-spam`);
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.headline).toBe("Why Your Emails Land in Spam, and How to Fix It");
    expect(jsonLd.author).toEqual({
      "@type": "Organization",
      name: "RepMail Team",
      url: "https://www.letszero.in/repmail/learn/authors/repmail-team",
    });
  });

  it("the author route reuses buildPersonJsonLd — emits Organization, not Person, for the team byline", () => {
    const route = findRoute("/repmail/learn/authors/repmail-team");
    const jsonLd = route.jsonLd(`${CANONICAL}/authors/repmail-team`);
    expect(jsonLd["@type"]).toBe("Organization");
    expect(jsonLd.name).toBe("RepMail Team");
    expect("jobTitle" in jsonLd).toBe(false); // Person-only property, correctly absent
  });

  it("every Resource Center route points at a real Resource Center page component", () => {
    const resourceCenterRoutes = routes.filter((r) => r.path.startsWith("/repmail/learn"));
    expect(resourceCenterRoutes.length).toBeGreaterThan(60);
    for (const route of resourceCenterRoutes) {
      expect(route.componentPath).toMatch(/^\/src\/pages\/(resource-center\/\w+Page\.jsx)$/);
    }
  });

  it("titles and descriptions come from the content, so they cannot drift from the page they describe", () => {
    const article = articles.find((a) => a.slug === "dkim");
    const route = findRoute("/repmail/learn/glossary/dkim");
    expect(route.title).toBe(`${article.title} | RepMail Resource Center`);
    expect(route.description).toBe(article.description);
  });

  it("keeps the hand-written static routes, which have no backing content file to derive from", () => {
    for (const route of STATIC_ROUTES) {
      expect(findRoute(route.path), `missing static route ${route.path}`).toBeTruthy();
    }
    expect(findRoute("/pricing")).toBeTruthy();
    expect(findRoute("/repmail/changelog")).toBeTruthy();
  });
});
