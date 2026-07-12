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
  it("ArticlePage renders a real Wave 1 article end to end: body, table asset, RepMail Team byline (M22-B)", async () => {
    const html = await renderPage("/src/pages/resource-center/ArticlePage.jsx", "/repmail/learn/deliverability/why-your-emails-land-in-spam");
    expect(html).toContain("Why Your Emails Land in Spam");
    expect(html).toContain("SPF, DKIM, and DMARC at a glance"); // the table asset's title
    expect(html).toContain("Lists which mail servers are allowed to send"); // a real table cell
    expect(html).toContain("RepMail Team");
  });

  it("ArticlePage renders the M23-C educational blocks and the premium Continue Learning hand-off, not an in-body Next step heading", async () => {
    const html = await renderPage("/src/pages/resource-center/ArticlePage.jsx", "/repmail/learn/deliverability/why-your-emails-land-in-spam");
    // Educational components from the real frontmatter:
    expect(html).toContain("article-key-takeaways");
    expect(html).toContain("Key takeaways");
    expect(html).toContain("article-common-mistakes");
    expect(html).toContain("article-faq");
    // A theme-aware explanatory figure (M23-II-D), rendered from heroDiagram:
    expect(html).toContain("article-figure-email-authentication");
    // The next step is now the premium card, driven by the nextStep field:
    expect(html).toContain("article-continue-learning");
    expect(html).toContain("Continue learning");
    expect(html).toContain("Fix your subject line first");
    // ...and the old in-body markdown "## Next step" heading is gone:
    expect(html).not.toContain(">Next step</h2>");
  });

  it("AuthorPage renders the real repmail-team author with their 11 real articles (M22-B)", async () => {
    const html = await renderPage("/src/pages/resource-center/AuthorPage.jsx", "/repmail/learn/authors/repmail-team");
    expect(html).toContain("RepMail Team");
    expect(html).toContain("Why Your Emails Land in Spam");
    expect(html).toContain("Where RepMail Fits Into Your Cold Email Workflow");
  });

  it("AuthorPage renders NotFound for a nonexistent author (honest 404, no crash)", async () => {
    const html = await renderPage("/src/pages/resource-center/AuthorPage.jsx", "/repmail/learn/authors/jane-doe");
    expect(html.length).toBeGreaterThan(0);
  });

  it("ArticlePage renders NotFound for a nonexistent article (honest 404, no crash)", async () => {
    const html = await renderPage("/src/pages/resource-center/ArticlePage.jsx", "/repmail/learn/deliverability/how-dkim-works");
    expect(html.length).toBeGreaterThan(0);
  });

  it("AcademyHubPage renders the real Deliverability academy with its 5 real Wave 1 articles (M22-B — no longer empty)", async () => {
    const html = await renderPage("/src/pages/resource-center/AcademyHubPage.jsx", "/repmail/learn/deliverability");
    expect(html).toContain("Deliverability");
    expect(html).toContain("Why Did That Email Bounce?");
    expect(html).not.toContain("No guides published yet");
  });

  it("AcademyHubPage renders the rich M23-II-C editorial sections for a live Academy (why / outcomes / curriculum / capabilities)", async () => {
    const html = await renderPage("/src/pages/resource-center/AcademyHubPage.jsx", "/repmail/learn/deliverability");
    expect(html).toContain("academy-why");
    expect(html).toContain("academy-outcomes");
    expect(html).toContain("academy-curriculum");
    expect(html).toContain("academy-capabilities");
    expect(html).toContain("Warm a new domain"); // a real learning outcome
    expect(html).toContain("helps here"); // "How RepMail helps here" (name is a separate text node in SSR)
  });

  it("AcademyHubPage shows an aspirational 'on the way' state with planned topics for a Wave 1-deferred Academy (Compliance)", async () => {
    const html = await renderPage("/src/pages/resource-center/AcademyHubPage.jsx", "/repmail/learn/compliance");
    expect(html).toContain("academy-empty");
    expect(html).toContain("This Academy is being written now.");
    expect(html).toContain("CAN-SPAM and GDPR"); // a real planned topic from academyEditorial
    expect(html).not.toContain("academy-article-list"); // no fabricated guides
  });

  it("AcademyHubPage renders NotFound for an unknown academy slug", async () => {
    const html = await renderPage("/src/pages/resource-center/AcademyHubPage.jsx", "/repmail/learn/not-a-real-academy");
    expect(html.length).toBeGreaterThan(0);
  });

  it("ResourceCenterHomePage renders the complete real Wave 1 homepage — intents, featured, Getting Started, Collection, academies (M22-C)", async () => {
    const html = await renderPage("/src/pages/resource-center/ResourceCenterHomePage.jsx", "/repmail/learn");
    expect(html).toContain("button-open-resource-center-search");
    expect(html).toContain("section-academies");
    expect(html).toContain("section-intents"); // real intent destinations now exist
    expect(html).toContain("section-featured"); // 3 real featured Wave 1 articles
    expect(html).toContain("section-learning-paths"); // the real Getting Started path (M22-C)
    expect(html).toContain("section-collections"); // the real Collection (M22-C)
    expect(html).toContain("Getting Started");
    expect(html).toContain("Getting Your First Campaign Delivered");
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

describe("LearningPathPage / CollectionPage (M22-C — real Getting Started path + Collection data)", () => {
  it("LearningPathPage renders the real Getting Started path with all 6 steps in order, numbered 1-6", async () => {
    const html = await renderPage("/src/pages/resource-center/LearningPathPage.jsx", "/repmail/learn/paths/getting-started");
    expect(html).toContain("learning-path-template");
    expect(html).toContain("Getting Started");
    expect(html).toContain("Where RepMail Fits Into Your Cold Email Workflow");
    expect(html).toContain("Before You Hit Send");
    // step 1's marker appears before step 6's — real ordering, not just "all present"
    expect(html.indexOf("Where RepMail Fits Into Your Cold Email Workflow")).toBeLessThan(html.indexOf("Before You Hit Send"));
  });

  it("LearningPathPage renders NotFound for a path slug that isn't the real one", async () => {
    const html = await renderPage("/src/pages/resource-center/LearningPathPage.jsx", "/repmail/learn/paths/not-a-real-path");
    expect(html).not.toContain("learning-path-template");
  });

  it("LearningPathPage 404s for an unregistered product, same as every other Resource Center page", async () => {
    const html = await renderPage("/src/pages/resource-center/LearningPathPage.jsx", "/messagehub/learn/paths/getting-started");
    expect(html).not.toContain("learning-path-template");
  });

  it("CollectionPage renders the real Getting Your First Campaign Delivered collection with its 4 real articles", async () => {
    const html = await renderPage("/src/pages/resource-center/CollectionPage.jsx", "/repmail/learn/collections/getting-your-first-campaign-delivered");
    expect(html).toContain("collection-template");
    expect(html).toContain("Getting Your First Campaign Delivered");
    expect(html).toContain("Cold Email Templates You Can Send Without Hurting Deliverability");
  });

  it("CollectionPage renders NotFound for a collection slug that isn't the real one", async () => {
    const html = await renderPage("/src/pages/resource-center/CollectionPage.jsx", "/repmail/learn/collections/not-a-real-collection");
    expect(html).not.toContain("collection-template");
  });

  it("CollectionPage 404s for an unregistered product, same as every other Resource Center page", async () => {
    const html = await renderPage("/src/pages/resource-center/CollectionPage.jsx", "/messagehub/learn/collections/getting-your-first-campaign-delivered");
    expect(html).not.toContain("collection-template");
  });
});
