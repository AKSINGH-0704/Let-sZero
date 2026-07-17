// M23-A — the persistent Resource Center chrome (header + footer + global
// search). Rendered via real SSR (renderToString + ssrLoadModule), the same
// mechanism the prerender pipeline uses — so this also proves the chrome is
// prerender-safe, which matters because it must appear in the static HTML
// (crawlers/first paint), not only after client hydration.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { PRODUCTS } from "../../shared/content/taxonomy.js";

let vite, Router, ResourceCenterLayout;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ Router } = await vite.ssrLoadModule("wouter"));
  ResourceCenterLayout = (await vite.ssrLoadModule("/src/components/resource-center/ResourceCenterLayout.jsx")).default;
});

afterAll(async () => {
  await vite.close();
});

const repmail = PRODUCTS.repmail;

function render(ssrPath) {
  return renderToString(
    React.createElement(Router, { ssrPath },
      React.createElement(ResourceCenterLayout, { product: repmail },
        React.createElement("div", { "data-testid": "child-content" }, "page body")
      )
    )
  );
}

describe("ResourceCenterLayout — persistent chrome", () => {
  it("renders the header (home wordmark + global search) and footer around its children", () => {
    const html = render("/repmail/learn");
    expect(html).toContain("resource-center-layout");
    expect(html).toContain("link-rc-home");
    expect(html).toContain("button-rc-header-search");
    expect(html).toContain("child-content");
    expect(html).toContain(repmail.resourceCenterName); // footer wordmark
  });

  it("the home wordmark links to the Resource Center root", () => {
    const html = render("/repmail/learn/deliverability/why-your-emails-land-in-spam");
    expect(html).toContain(`href="${repmail.basePath}"`);
  });

  it("header nav lists only Academies that actually have content — never a dead '0 guides' link", () => {
    const html = render("/repmail/learn");
    // The Academies with real content. M27 filled outreach (comparisons),
    // infrastructure, email-platform, and glossary, so they legitimately
    // appear now; the rule under test is the filter, not the specific set.
    for (const filledSlug of ["deliverability", "cold-email", "outreach", "infrastructure", "email-platform", "glossary"]) {
      expect(html).toContain(`link-nav-academy-${filledSlug}`);
    }
    // The Academies that are still genuinely empty must NOT appear:
    for (const emptySlug of ["lead-generation", "compliance"]) {
      expect(html).not.toContain(`link-nav-academy-${emptySlug}`);
    }
  });

  it("surfaces Getting Started in the header (the real path exists), and search from every page", () => {
    const html = render("/repmail/learn/authors/repmail-team");
    expect(html).toContain("link-nav-getting-started");
    expect(html).toContain("button-rc-header-search"); // search reachable from a non-home page
  });
});
