// M21-D — verifies the actual route-matching behavior for the one genuinely
// ambiguous case: /repmail/learn/authors/:author and
// /repmail/learn/:academy/:slug are both 3-segment paths. Reasoning about
// "declaration order should make this work" isn't the same as confirming
// wouter actually resolves it that way — this test renders the real
// <Switch> structure (a minimal reproduction of App.jsx's route block, in
// the same order) via SSR and confirms which route wins for real.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { Router, Switch, Route, useRoute } from "wouter";

// Matches this codebase's real convention (client/src/pages/DomainDetail.jsx
// and the M21-D pages): a page calls useRoute() itself to read params,
// Route's children is a plain no-arg render function — not a react-router-
// style render-prop that receives params as an argument. Using the wrong
// API shape here would test nothing real; matching the codebase's actual
// pattern is what makes the ambiguous-route assertion below trustworthy.
function AuthorProbe() {
  const [, params] = useRoute("/repmail/learn/authors/:author");
  return React.createElement("div", { "data-testid": "matched-author" }, `author:${params?.author}`);
}

function ArticleProbe() {
  const [, params] = useRoute("/repmail/learn/:academy/:slug");
  return React.createElement("div", { "data-testid": "matched-article" }, `academy:${params?.academy} slug:${params?.slug}`);
}

function ProbeSwitch({ ssrPath }) {
  return React.createElement(
    Router,
    { ssrPath },
    React.createElement(
      Switch,
      null,
      // Same order as client/src/App.jsx: authors/:author declared before :academy/:slug.
      React.createElement(Route, { path: "/repmail/learn/authors/:author", key: "author" }, () => React.createElement(AuthorProbe)),
      React.createElement(Route, { path: "/repmail/learn/:academy/:slug", key: "article" }, () => React.createElement(ArticleProbe))
    )
  );
}

describe("Resource Center route ordering — the real ambiguous case", () => {
  it("/repmail/learn/authors/jane-doe matches the author route, not the article route treating 'authors' as an academy slug", () => {
    const html = renderToString(React.createElement(ProbeSwitch, { ssrPath: "/repmail/learn/authors/jane-doe" }));
    expect(html).toContain('data-testid="matched-author"');
    expect(html).toContain("author:jane-doe");
    expect(html).not.toContain("matched-article");
  });

  it("/repmail/learn/deliverability/how-dkim-works still matches the article route correctly", () => {
    const html = renderToString(React.createElement(ProbeSwitch, { ssrPath: "/repmail/learn/deliverability/how-dkim-works" }));
    expect(html).toContain('data-testid="matched-article"');
    expect(html).toContain("academy:deliverability slug:how-dkim-works");
  });
});
