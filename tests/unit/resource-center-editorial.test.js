// M23-B — the editorial design foundation: per-Academy identity registry,
// metadata chips, and the themed/coming-soon Academy cards + hero. Rendering
// assertions use real SSR (the prerender mechanism); academyTheme is a pure
// registry and is asserted directly.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { PRODUCTS } from "../../shared/content/taxonomy.js";
import { academyTheme } from "../../client/src/components/resource-center/academyTheme.js";

describe("academyTheme — per-Academy identity registry", () => {
  it("gives each real Academy its own icon and a token-backed accent (never inline hex)", () => {
    const slugs = ["deliverability", "cold-email", "outreach", "infrastructure", "lead-generation", "compliance"];
    const icons = new Set();
    for (const slug of slugs) {
      const theme = academyTheme(slug);
      expect(theme.Icon).toBeTruthy();
      // accent reads a CSS custom property (index.css --rc-*), not a literal colour.
      expect(theme.accent).toMatch(/^hsl\(var\(--rc-[a-z-]+\)\)$/);
      icons.add(theme.Icon);
    }
    // Distinct icons per Academy — the point of the registry.
    expect(icons.size).toBe(slugs.length);
  });

  it("falls back to a safe default (no crash) for an unknown slug", () => {
    const theme = academyTheme("not-a-real-academy");
    expect(theme.Icon).toBeTruthy();
    expect(theme.accent).toMatch(/^hsl\(var\(--\w[\w-]*\)\)$/);
  });
});

let vite, Router;
const repmail = PRODUCTS.repmail;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ Router } = await vite.ssrLoadModule("wouter"));
});

afterAll(async () => {
  await vite.close();
});

async function loadDefault(path) {
  return (await vite.ssrLoadModule(path)).default;
}

// React SSR inserts <!-- --> comment nodes between adjacent text
// expressions ("11" + " guides across " + "2" ...). The content is correct;
// strip the markers so string assertions can span those boundaries — the
// same well-worn workaround used elsewhere in this suite.
const noComments = (html) => html.replace(/<!-- -->/g, "");

describe("ContentMeta — the reused metadata chip", () => {
  it("renders a human content-type label and reading time", async () => {
    const ContentMeta = await loadDefault("/src/components/resource-center/ContentMeta.jsx");
    const html = noComments(renderToString(
      React.createElement(ContentMeta, { article: { contentType: "tutorial", readingTimeMinutes: 4 } })
    ));
    expect(html).toContain("Tutorial");
    expect(html).toContain("4 min read");
  });
});

describe("AcademyCard — themed live card vs. deliberate coming-soon", () => {
  it("a live Academy renders as a link with its guide count", async () => {
    const AcademyCard = await loadDefault("/src/components/resource-center/AcademyCard.jsx");
    const academy = repmail.academies.find((a) => a.slug === "deliverability");
    const html = noComments(renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn" },
        React.createElement(AcademyCard, { academy, href: "/repmail/learn/deliverability", articleCount: 5 })
      )
    ));
    expect(html).toContain("link-academy-deliverability");
    expect(html).toContain("5 guides");
    expect(html).not.toContain("Coming soon");
  });

  it("an empty Academy renders as a non-link 'Coming soon' card, not a dead link to an empty page", async () => {
    const AcademyCard = await loadDefault("/src/components/resource-center/AcademyCard.jsx");
    const academy = repmail.academies.find((a) => a.slug === "compliance");
    const html = renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn" },
        React.createElement(AcademyCard, { academy, href: "/repmail/learn/compliance", articleCount: 0 })
      )
    );
    expect(html).toContain("Coming soon");
    expect(html).toContain("card-academy-compliance");
    expect(html).not.toContain("link-academy-compliance");
  });
});

describe("CategoryRail — themed nav that marks empty sections 'Soon', not dead links (M23-D)", () => {
  it("live Academies are links; empty Academies and the unbuilt Template Library are non-link 'Soon' rows", async () => {
    const CategoryRail = await loadDefault("/src/components/resource-center/CategoryRail.jsx");
    const liveSlugs = new Set(["deliverability", "cold-email"]);
    const html = noComments(renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn/deliverability" },
        React.createElement(CategoryRail, {
          product: repmail,
          academies: repmail.academies,
          templateLibrary: repmail.templateLibrary,
          activeSlug: "deliverability",
          liveSlugs,
        })
      )
    ));
    // Live → real links
    expect(html).toContain("link-rail-deliverability");
    expect(html).toContain("link-rail-cold-email");
    // Empty Academies + Template Library → "Soon" markers, not links
    expect(html).toContain("rail-soon-compliance");
    expect(html).toContain("rail-soon-templates");
    expect(html).not.toContain("link-rail-compliance");
    expect(html).not.toContain("link-rail-templates");
    expect(html).toContain("Soon");
  });
});

describe("Homepage hero", () => {
  it("renders the editorial hero, a prominent search trigger, and an honest guide count", async () => {
    const ResourceCenterHome = await loadDefault("/src/components/resource-center/ResourceCenterHome.jsx");
    const html = noComments(renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn" },
        React.createElement(ResourceCenterHome, {
          product: repmail,
          academyArticleCounts: { deliverability: 5, "cold-email": 6 },
          recentArticles: [],
        })
      )
    ));
    expect(html).toContain("reach the inbox"); // hero headline (gradient span on this phrase)
    expect(html).toContain("button-open-resource-center-search");
    // honest, real total (5 + 6) across the two live topics — not a fabricated stat.
    expect(html).toContain("11 in-depth guides across 2 topics");
  });

  it("renders a closing conversion band linking to the product (M23-II-B)", async () => {
    const ResourceCenterHome = await loadDefault("/src/components/resource-center/ResourceCenterHome.jsx");
    const html = renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn" },
        React.createElement(ResourceCenterHome, {
          product: repmail,
          academyArticleCounts: { deliverability: 5 },
          recentArticles: [],
        })
      )
    );
    expect(html).toContain("section-cta");
    expect(html).toContain("Ready to put this into practice");
    expect(html).toContain("link-cta-product");
  });
});
