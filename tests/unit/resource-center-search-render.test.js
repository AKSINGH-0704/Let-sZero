// M21-F — confirms the search command palette and related-content section
// render without error via real SSR, and that ResourceCenterHomePage
// (now wired to the real search dialog + keyboard shortcut) still renders
// cleanly end to end.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { PRODUCTS } from "../../shared/content/taxonomy.js";

let vite, Router;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ Router } = await vite.ssrLoadModule("wouter"));
});

afterAll(async () => {
  await vite.close();
});

const repmail = PRODUCTS.repmail;

describe("ResourceCenterSearch renders for real (SSR)", () => {
  it("renders the CommandDialog closed by default, with no crash from cmdk/Radix Dialog SSR", async () => {
    const ResourceCenterSearch = (await vite.ssrLoadModule("/src/components/resource-center/ResourceCenterSearch.jsx")).default;
    const html = renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn" },
        React.createElement(ResourceCenterSearch, { open: false, onOpenChange: () => {}, articles: [], product: repmail })
      )
    );
    expect(html.length).toBeGreaterThanOrEqual(0); // closed dialog may render nothing — no crash is the assertion
  });
});

describe("ArticleTemplate's related-content section", () => {
  it("renders related guides when relatedArticles is non-empty, is absent when empty", async () => {
    const ArticleTemplate = (await vite.ssrLoadModule("/src/components/resource-center/ArticleTemplate.jsx")).default;
    const academy = repmail.academies[1];
    const article = {
      slug: "how-dkim-works", title: "How DKIM Works", description: "...", tags: [], academy,
      publishedAt: "2026-07-12", bodyHtml: "<p>Body</p>", assets: [],
    };
    const related = [{ slug: "spf-explained", title: "SPF Explained", academy }];
    const author = { name: "Jane Doe", slug: "jane-doe", role: "Engineer", bio: "..." };

    const withRelated = renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn/deliverability/how-dkim-works" },
        React.createElement(ArticleTemplate, { article, author, product: repmail, readingTimeMinutes: 3, relatedArticles: related })
      )
    );
    expect(withRelated).toContain("article-related");
    expect(withRelated).toContain("SPF Explained");

    const withoutRelated = renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn/deliverability/how-dkim-works" },
        React.createElement(ArticleTemplate, { article, author, product: repmail, readingTimeMinutes: 3, relatedArticles: [] })
      )
    );
    expect(withoutRelated).not.toContain("article-related");
  });
});

describe("ResourceCenterHomePage with real search wiring", () => {
  it("still renders end to end with the search dialog + keyboard shortcut added", async () => {
    const ResourceCenterHomePage = (await vite.ssrLoadModule("/src/pages/resource-center/ResourceCenterHomePage.jsx")).default;
    const html = renderToString(
      React.createElement(Router, { ssrPath: "/repmail/learn" }, React.createElement(ResourceCenterHomePage))
    );
    expect(html).toContain("button-open-resource-center-search");
  });
});
