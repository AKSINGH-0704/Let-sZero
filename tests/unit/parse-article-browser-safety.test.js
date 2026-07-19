// Regression guard for the defect that broke the entire Resource Center UI in
// production while every server-side check passed.
//
// shared/content/parseArticle.js is contractually "pure and platform-agnostic —
// safe in both a Node build script and the browser bundle", because the SPA
// imports it directly via Vite's import.meta.glob. It imported gray-matter,
// which calls Buffer.from() on every parse. Vite bundled that happily, Node
// prerendering worked perfectly, and the served HTML was correct — so curl,
// the sitemap, the prerender count and every SSR test all passed. Only after
// React hydrated in a real browser did every article throw
// "Buffer is not defined", get swallowed by parseArticle's own catch, and leave
// the client with ZERO articles: empty Academies, empty learning paths, an empty
// All Guides index, and 404s on article pages.
//
// These tests run parseArticle with the Node globals a browser does not have
// removed, so a future dependency that reintroduces a Node-only global fails
// here rather than silently in production.

import { describe, it, expect, afterEach } from "vitest";
import { parseArticle, splitFrontmatter } from "../../shared/content/parseArticle.js";

const AUTHORS = new Map([["jane-doe", { slug: "jane-doe", name: "Jane Doe", role: "Engineer", bio: "Bio.", authorType: "Person" }]]);

const ARTICLE = `---
contentType: guide
slug: how-dkim-works
title: How DKIM Works
description: A practical guide to DKIM signing and why it matters.
authorSlug: jane-doe
publishedAt: "2026-07-12"
tags: ["dkim", "authentication"]
assets:
  - type: checklist
    title: DKIM setup checklist
    content: "Generate a key"
---

## Mechanism

DKIM signs the message.
`;

// The globals a browser genuinely does not provide. Removing them here
// reproduces the browser environment inside Node.
const NODE_ONLY_GLOBALS = ["Buffer", "process"];

function withoutNodeGlobals(fn) {
  const saved = {};
  for (const g of NODE_ONLY_GLOBALS) {
    saved[g] = globalThis[g];
    delete globalThis[g];
  }
  try {
    return fn();
  } finally {
    for (const g of NODE_ONLY_GLOBALS) globalThis[g] = saved[g];
  }
}

describe("parseArticle is genuinely browser-safe", () => {
  afterEach(() => {
    // belt and braces — a thrown assertion must never leak a deleted global
    expect(typeof globalThis.Buffer).toBe("function");
  });

  it("parses a real article with no Buffer global, the way the browser bundle runs it", () => {
    const article = withoutNodeGlobals(() =>
      parseArticle(ARTICLE, {
        productSlug: "repmail",
        academySlug: "deliverability",
        authors: AUTHORS,
        log: () => {},
      })
    );

    // The original defect made this null, and parseArticle's catch made that
    // look like an ordinary invalid-file skip rather than an environment fault.
    expect(article).not.toBeNull();
    expect(article.title).toBe("How DKIM Works");
    expect(article.slug).toBe("how-dkim-works");
    expect(article.author.name).toBe("Jane Doe");
    expect(article.bodyHtml).toContain("<h2");
    expect(article.readingTimeMinutes).toBeGreaterThan(0);
  });

  it("splitFrontmatter works with no Buffer global", () => {
    const { data, content } = withoutNodeGlobals(() => splitFrontmatter(ARTICLE));
    expect(data.slug).toBe("how-dkim-works");
    expect(data.tags).toEqual(["dkim", "authentication"]);
    expect(content.trim().startsWith("## Mechanism")).toBe(true);
  });
});

describe("splitFrontmatter — the gray-matter behaviours the content relies on", () => {
  it("handles CRLF line endings", () => {
    const { data, content } = splitFrontmatter("---\r\ntitle: X\r\n---\r\nbody\r\n");
    expect(data.title).toBe("X");
    expect(content.trim()).toBe("body");
  });

  it("handles a leading BOM", () => {
    const { data } = splitFrontmatter("﻿---\ntitle: X\n---\nbody\n");
    expect(data.title).toBe("X");
  });

  it("treats a file with no frontmatter fence as all body, not a crash", () => {
    const { data, content } = splitFrontmatter("# Just markdown\n");
    expect(data).toEqual({});
    expect(content).toBe("# Just markdown\n");
  });

  it("parses nested YAML (assets are a list of mappings)", () => {
    const { data } = splitFrontmatter(ARTICLE);
    expect(data.assets).toHaveLength(1);
    expect(data.assets[0].type).toBe("checklist");
  });

  it("keeps a quoted date a string rather than coercing it to a Date", () => {
    // schema.js validates publishedAt with z.string().date(); a YAML Date object
    // would fail that, so this is load-bearing.
    const { data } = splitFrontmatter(ARTICLE);
    expect(typeof data.publishedAt).toBe("string");
    expect(data.publishedAt).toBe("2026-07-12");
  });

  it("rejects frontmatter that is not a mapping", () => {
    expect(() => splitFrontmatter("---\n- a\n- b\n---\nbody")).toThrow(/mapping/);
  });
});

describe("every real article parses without Node globals", async () => {
  // The unit fixture above proves the mechanism; this proves it against the
  // actual 60 files that ship, which is what production renders.
  const { loadAuthors } = await import("../../shared/content/loader.js");
  const { readFile, readdir } = await import("fs/promises");
  const path = (await import("path")).default;

  const CONTENT = path.resolve(import.meta.dirname, "..", "..", "client", "src", "content");

  it("parses all real repmail articles with Buffer removed", async () => {
    const authors = await loadAuthors(CONTENT, "repmail", { log: () => {} });
    const productDir = path.join(CONTENT, "repmail");
    const dirs = (await readdir(productDir, { withFileTypes: true })).filter((d) => d.isDirectory());

    // Read every file first — fs needs the Node globals we are about to remove.
    const files = [];
    for (const d of dirs) {
      for (const f of (await readdir(path.join(productDir, d.name))).filter((f) => f.endsWith(".md"))) {
        files.push({ academySlug: d.name, raw: await readFile(path.join(productDir, d.name, f), "utf-8"), name: f });
      }
    }
    expect(files.length).toBeGreaterThan(0);

    const failures = withoutNodeGlobals(() =>
      files
        .map((f) => ({
          name: f.name,
          article: parseArticle(f.raw, { productSlug: "repmail", academySlug: f.academySlug, authors, log: () => {} }),
        }))
        .filter((r) => r.article === null)
        .map((r) => r.name)
    );

    expect(failures, `these articles do not parse in a browser environment: ${failures.join(", ")}`).toEqual([]);
  });
});
