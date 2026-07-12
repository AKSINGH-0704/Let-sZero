// M21-D/M21-I — verifies the actual route-matching behavior for the one
// genuinely ambiguous case: /:product/learn/authors/:author and
// /:product/learn/:academy/:slug are both 3-segment paths after :product.
// Reasoning about "declaration order should make this work" isn't the same
// as confirming wouter actually resolves it that way — this test renders
// the real <Switch> structure (a minimal reproduction of App.jsx's route
// block, in the same order, using the real product-parameterized patterns
// introduced in M21-I) via SSR and confirms which route wins for real.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { Router, Switch, Route, useRoute } from "wouter";
import useResourceCenterProduct from "../../client/src/hooks/useResourceCenterProduct.js";
import { PRODUCTS } from "../../shared/content/taxonomy.js";

// Matches this codebase's real convention (client/src/pages/DomainDetail.jsx
// and the M21-D/M21-I Resource Center pages): a page calls useRoute() itself
// to read params, Route's children is a plain no-arg render function — not
// a react-router-style render-prop that receives params as an argument.
function AuthorProbe() {
  const [, params] = useRoute("/:product/learn/authors/:author");
  return React.createElement("div", { "data-testid": "matched-author" }, `product:${params?.product} author:${params?.author}`);
}

function ArticleProbe() {
  const [, params] = useRoute("/:product/learn/:academy/:slug");
  return React.createElement("div", { "data-testid": "matched-article" }, `product:${params?.product} academy:${params?.academy} slug:${params?.slug}`);
}

function ProbeSwitch({ ssrPath }) {
  return React.createElement(
    Router,
    { ssrPath },
    React.createElement(
      Switch,
      null,
      // Same order as client/src/App.jsx: authors/:author declared before :academy/:slug.
      React.createElement(Route, { path: "/:product/learn/authors/:author", key: "author" }, () => React.createElement(AuthorProbe)),
      React.createElement(Route, { path: "/:product/learn/:academy/:slug", key: "article" }, () => React.createElement(ArticleProbe))
    )
  );
}

describe("Resource Center route ordering — the real ambiguous case, product-parameterized", () => {
  it("/repmail/learn/authors/jane-doe matches the author route, not the article route treating 'authors' as an academy slug", () => {
    const html = renderToString(React.createElement(ProbeSwitch, { ssrPath: "/repmail/learn/authors/jane-doe" }));
    expect(html).toContain('data-testid="matched-author"');
    expect(html).toContain("product:repmail author:jane-doe");
    expect(html).not.toContain("matched-article");
  });

  it("/repmail/learn/deliverability/how-dkim-works still matches the article route correctly, with :product resolved too", () => {
    const html = renderToString(React.createElement(ProbeSwitch, { ssrPath: "/repmail/learn/deliverability/how-dkim-works" }));
    expect(html).toContain('data-testid="matched-article"');
    expect(html).toContain("product:repmail academy:deliverability slug:how-dkim-works");
  });

  it("a hypothetical second product's routes resolve through the exact same pattern — no product-specific route needed", () => {
    const html = renderToString(React.createElement(ProbeSwitch, { ssrPath: "/messagehub/learn/deliverability/how-dkim-works" }));
    expect(html).toContain("product:messagehub academy:deliverability slug:how-dkim-works");
  });
});

describe("useResourceCenterProduct — the operator-review-requested multi-product proof", () => {
  it("resolves the real repmail config for the real product slug", () => {
    expect(useResourceCenterProduct("repmail")).toBe(PRODUCTS.repmail);
  });

  it("returns null for a product that doesn't exist yet — not a hardcoded fallback to repmail", () => {
    expect(useResourceCenterProduct("messagehub")).toBeNull();
    expect(useResourceCenterProduct("notifystream")).toBeNull();
    expect(useResourceCenterProduct("")).toBeNull();
  });
});
