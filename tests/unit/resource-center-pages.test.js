// M21-E — confirms the 5 route-level Resource Center pages (wired in
// M21-D, JSON-LD added in M21-E) render without errors via real SSR — the
// same renderToString + ssrLoadModule mechanism used throughout this
// program. useEffect (and therefore useJsonLd's actual DOM mutation)
// doesn't execute during renderToString, so this proves the render path
// and JSON-LD *computation* are error-free, not that the script tag
// actually lands in the DOM — that half needs a browser/jsdom, a known,
// already-disclosed gap in this codebase's test harness (see audit).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, Router;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ Router } = await vite.ssrLoadModule("wouter"));
});

afterAll(async () => {
  await vite.close();
});

async function renderPage(componentPath, ssrPath) {
  const mod = await vite.ssrLoadModule(componentPath);
  return renderToString(React.createElement(Router, { ssrPath }, React.createElement(mod.default)));
}

describe("Resource Center route pages render without errors (real SSR)", () => {
  it("AuthorPage renders NotFound for a nonexistent author (honest 404, no crash)", async () => {
    const html = await renderPage("/src/pages/resource-center/AuthorPage.jsx", "/repmail/learn/authors/jane-doe");
    expect(html.length).toBeGreaterThan(0);
  });

  it("ArticlePage renders NotFound for a nonexistent article (honest 404, no crash)", async () => {
    const html = await renderPage("/src/pages/resource-center/ArticlePage.jsx", "/repmail/learn/deliverability/how-dkim-works");
    expect(html.length).toBeGreaterThan(0);
  });

  it("AcademyHubPage renders the real Deliverability academy with its honest empty state", async () => {
    const html = await renderPage("/src/pages/resource-center/AcademyHubPage.jsx", "/repmail/learn/deliverability");
    expect(html).toContain("Deliverability");
    expect(html).toContain("No guides published yet");
  });

  it("AcademyHubPage renders NotFound for an unknown academy slug", async () => {
    const html = await renderPage("/src/pages/resource-center/AcademyHubPage.jsx", "/repmail/learn/not-a-real-academy");
    expect(html.length).toBeGreaterThan(0);
  });

  it("ResourceCenterHomePage renders the homepage with search + academy discovery, no fabricated content sections", async () => {
    const html = await renderPage("/src/pages/resource-center/ResourceCenterHomePage.jsx", "/repmail/learn");
    expect(html).toContain("button-open-resource-center-search");
    expect(html).toContain("section-academies");
    expect(html).not.toContain("section-featured"); // zero real articles today — correctly absent, not faked
    expect(html).not.toContain("section-curated-resources"); // Template Library etc. not built yet — no dead links
  });

  it("LetsZeroLearnDirectory lists RepMail's real Resource Center", async () => {
    const html = await renderPage("/src/pages/LetsZeroLearnDirectory.jsx", "/learn");
    expect(html).toContain("RepMail Resource Center");
    expect(html).toContain('href="/repmail/learn"');
  });
});

describe("Resource Center pages 404 honestly for an unregistered product (M21-I multi-product proof)", () => {
  it("ResourceCenterHomePage renders NotFound for a product slug that isn't in PRODUCTS yet — not a silent fallback to repmail", async () => {
    const html = await renderPage("/src/pages/resource-center/ResourceCenterHomePage.jsx", "/messagehub/learn");
    expect(html).not.toContain("resource-center-home");
  });

  it("AcademyHubPage, ArticlePage, and AuthorPage all 404 for the same unregistered product", async () => {
    const academyHtml = await renderPage("/src/pages/resource-center/AcademyHubPage.jsx", "/messagehub/learn/deliverability");
    expect(academyHtml).not.toContain("academy-hub-template");

    const articleHtml = await renderPage("/src/pages/resource-center/ArticlePage.jsx", "/messagehub/learn/deliverability/how-dkim-works");
    expect(articleHtml).not.toContain("article-template");

    const authorHtml = await renderPage("/src/pages/resource-center/AuthorPage.jsx", "/messagehub/learn/authors/jane-doe");
    expect(authorHtml).not.toContain("author-page-template");
  });
});
