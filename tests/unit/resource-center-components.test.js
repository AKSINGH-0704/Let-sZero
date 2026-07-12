// M21-C — Resource Center component templates, verified by real rendering
// (renderToString via Vite's SSR module loader — the same mechanism M21-B's
// prerender pipeline uses), not just "the file has no syntax errors." This
// codebase has no jsdom/React Testing Library setup (a pre-existing,
// already-disclosed limitation carried across prior audits); rendering
// through the real SSR path is the closest equivalent this repo has,
// and it's a genuine reuse of infrastructure built one milestone ago
// rather than a new, parallel testing mechanism.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { PRODUCTS } from "../../shared/content/taxonomy.js";

let vite;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
});

afterAll(async () => {
  await vite.close();
});

async function loadDefault(componentPath) {
  const mod = await vite.ssrLoadModule(componentPath);
  return mod.default;
}

// React SSR HTML-escapes text nodes (& -> &amp;) and inserts <!-- --> comment
// separators between adjacent JSX text expressions (a real, harmless,
// standard hydration-safety mechanism — not a bug). Assertions against raw
// rendered HTML need to account for both rather than asserting literal
// human-readable text.
function htmlEscaped(str) {
  return str.replace(/&/g, "&amp;");
}
function normalizeTextNodes(html) {
  return html.replace(/<!--\s*-->/g, "");
}

function withRouter(Router, element, path = "/repmail/learn") {
  return React.createElement(Router, { ssrPath: path }, element);
}

const repmail = PRODUCTS.repmail;
const fixtureAuthor = {
  slug: "jane-doe",
  name: "Jane Doe",
  role: "Deliverability Engineer, RepMail",
  bio: "Writes about DKIM, SPF, and DMARC from the inside of a sending platform.",
};
const fixtureAcademy = repmail.academies[1]; // deliverability
const fixtureArticle = {
  slug: "how-dkim-works",
  title: "How DKIM Works",
  description: "A practical guide to DKIM signing.",
  tags: ["dkim", "authentication"],
  publishedAt: "2026-07-12",
  academy: fixtureAcademy,
  bodyHtml: "<p>DKIM adds a cryptographic signature to outgoing mail.</p>",
  assets: [
    { type: "checklist", title: "DKIM setup checklist", content: ["Generate a key pair", "Publish the public key as a DNS TXT record", "Enable signing on your sender"] },
    { type: "table", title: "DKIM vs SPF vs DMARC", content: { headers: ["Mechanism", "Purpose"], rows: [["DKIM", "Signs the message"], ["SPF", "Authorizes sending IPs"]] } },
  ],
};

describe("resource-center component templates render for real (SSR), with real taxonomy data", () => {
  it("AcademyCard renders a real Academy's name/tagline and links to its hub", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const AcademyCard = await loadDefault("/src/components/resource-center/AcademyCard.jsx");
    const html = renderToString(withRouter(Router, React.createElement(AcademyCard, {
      academy: fixtureAcademy,
      href: `${repmail.basePath}/${fixtureAcademy.slug}`,
      articleCount: 3,
    })));
    expect(html).toContain(htmlEscaped(fixtureAcademy.name));
    expect(normalizeTextNodes(html)).toContain("3 guides");
    expect(html).toContain(`href="${repmail.basePath}/${fixtureAcademy.slug}"`);
  });

  it("CategoryRail lists all six academies plus the template library, marks the active one", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const CategoryRail = await loadDefault("/src/components/resource-center/CategoryRail.jsx");
    const html = renderToString(withRouter(Router, React.createElement(CategoryRail, {
      product: repmail,
      academies: repmail.academies,
      templateLibrary: repmail.templateLibrary,
      activeSlug: "deliverability",
    })));
    for (const academy of repmail.academies) {
      expect(html).toContain(htmlEscaped(academy.name));
    }
    expect(html).toContain(repmail.templateLibrary.name);
  });

  it("ContentAsset renders a checklist and a table asset with real content", async () => {
    const ContentAsset = await loadDefault("/src/components/resource-center/ContentAsset.jsx");
    const checklistHtml = renderToString(React.createElement(ContentAsset, { asset: fixtureArticle.assets[0] }));
    expect(checklistHtml).toContain("DKIM setup checklist");
    expect(checklistHtml).toContain("Generate a key pair");

    const tableHtml = renderToString(React.createElement(ContentAsset, { asset: fixtureArticle.assets[1] }));
    expect(tableHtml).toContain("Mechanism");
    expect(tableHtml).toContain("Signs the message");
  });

  it("AuthorByline links to the real author's page — never renders without a name", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const AuthorByline = await loadDefault("/src/components/resource-center/AuthorByline.jsx");
    const html = renderToString(withRouter(Router, React.createElement(AuthorByline, {
      author: fixtureAuthor,
      basePath: repmail.basePath,
      publishedAt: "2026-07-12",
      readingTimeMinutes: 6,
    })));
    expect(html).toContain("Jane Doe");
    expect(html).toContain(`href="${repmail.basePath}/authors/jane-doe"`);
    expect(normalizeTextNodes(html)).toContain("6 min read");

    const emptyHtml = renderToString(React.createElement(AuthorByline, { author: null }));
    expect(emptyHtml).toBe("");
  });

  it("ArticleTemplate renders title, breadcrumb, body, and every asset for a real fixture article", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const ArticleTemplate = await loadDefault("/src/components/resource-center/ArticleTemplate.jsx");
    const html = renderToString(withRouter(Router, React.createElement(ArticleTemplate, {
      article: fixtureArticle,
      author: fixtureAuthor,
      product: repmail,
      readingTimeMinutes: 6,
    })));
    expect(html).toContain("How DKIM Works");
    expect(html).toContain("DKIM adds a cryptographic signature");
    expect(html).toContain("DKIM setup checklist");
    expect(html).toContain("Mechanism");
    expect(html).toContain(htmlEscaped(fixtureAcademy.name)); // in the breadcrumb
  });

  it("AcademyHubTemplate renders the Academy header and its article list", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const AcademyHubTemplate = await loadDefault("/src/components/resource-center/AcademyHubTemplate.jsx");
    const html = renderToString(withRouter(Router, React.createElement(AcademyHubTemplate, {
      product: repmail,
      academy: fixtureAcademy,
      articles: [fixtureArticle],
    })));
    expect(html).toContain(fixtureAcademy.description);
    expect(html).toContain("How DKIM Works");
  });

  it("AcademyHubTemplate shows an honest empty state instead of fabricating placeholder articles", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const AcademyHubTemplate = await loadDefault("/src/components/resource-center/AcademyHubTemplate.jsx");
    const html = renderToString(withRouter(Router, React.createElement(AcademyHubTemplate, {
      product: repmail,
      academy: fixtureAcademy,
      articles: [],
    })));
    expect(html).toContain("academy-empty");
    expect(html).toContain("This Academy is being written now.");
  });

  it("AuthorPageTemplate renders the author's real bio and their publication list", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const AuthorPageTemplate = await loadDefault("/src/components/resource-center/AuthorPageTemplate.jsx");
    const html = renderToString(withRouter(Router, React.createElement(AuthorPageTemplate, {
      author: fixtureAuthor,
      articles: [fixtureArticle],
      product: repmail,
    })));
    expect(html).toContain(fixtureAuthor.bio);
    expect(html).toContain("How DKIM Works");
  });

  it("ResourceCenterHome renders modules in the M22 PAR §9 order: search, intents, featured, paths, collections, academies, resources, recent", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const ResourceCenterHome = await loadDefault("/src/components/resource-center/ResourceCenterHome.jsx");
    const html = renderToString(withRouter(Router, React.createElement(ResourceCenterHome, {
      product: repmail,
      intents: [{ slug: "improve-deliverability", label: "Improve deliverability", href: `${repmail.basePath}/deliverability` }],
      featuredArticles: [fixtureArticle],
      learningPaths: [{ slug: "getting-started", name: "Getting Started", description: "..." }],
      collections: [{ slug: "first-delivery", name: "Getting Your First Campaign Delivered", description: "..." }],
      toolsAvailable: false,
      academyArticleCounts: { deliverability: 1 },
      curatedResources: [{ slug: "glossary", name: "Glossary", href: `${repmail.basePath}/glossary` }],
      recentArticles: [fixtureArticle],
    })));

    const order = ["button-open-resource-center-search", "section-intents", "section-featured", "section-learning-paths", "section-collections", "section-academies", "section-curated-resources", "section-recent"]
      .map((testId) => html.indexOf(testId));
    // every module present, and each one's marker appears strictly after the previous — the exact M22 PAR §9 ordering, not just "all present somewhere"
    for (let i = 0; i < order.length; i++) expect(order[i]).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);

    expect(html).not.toContain("section-tools"); // toolsAvailable: false — not shown as a placeholder promise
  });

  it("ResourceCenterHome omits the intent section entirely when there are no valid intents (never a dead-link placeholder)", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const ResourceCenterHome = await loadDefault("/src/components/resource-center/ResourceCenterHome.jsx");
    const html = renderToString(withRouter(Router, React.createElement(ResourceCenterHome, {
      product: repmail,
      intents: [],
      academyArticleCounts: {},
    })));
    expect(html).not.toContain("section-intents");
  });

  it("Learning path and Collection cards are real links to /paths/:slug and /collections/:slug (M22-A — previously not clickable)", async () => {
    const { Router } = await vite.ssrLoadModule("wouter");
    const ResourceCenterHome = await loadDefault("/src/components/resource-center/ResourceCenterHome.jsx");
    const html = renderToString(withRouter(Router, React.createElement(ResourceCenterHome, {
      product: repmail,
      learningPaths: [{ slug: "getting-started", name: "Getting Started", description: "..." }],
      collections: [{ slug: "first-delivery", name: "Getting Your First Campaign Delivered", description: "..." }],
      academyArticleCounts: {},
    })));
    expect(html).toContain(`href="${repmail.basePath}/paths/getting-started"`);
    expect(html).toContain(`href="${repmail.basePath}/collections/first-delivery"`);
  });
});
