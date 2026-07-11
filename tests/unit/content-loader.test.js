// M21-D — content loader tests, against real temp markdown/JSON fixture
// files (not mocked fs) — this is a file-scanning/parsing pipeline, so
// exercising it against real files on disk is the meaningful test, not a
// mock that could silently drift from real gray-matter/marked behavior.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { loadAuthors, loadArticles } from "../../shared/content/loader.js";

let contentDir;

const VALID_AUTHOR = {
  slug: "jane-doe",
  name: "Jane Doe",
  role: "Deliverability Engineer, RepMail",
  bio: "Writes about DKIM, SPF, and DMARC from the inside of a sending platform.",
};

const VALID_ARTICLE_MD = `---
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
    content:
      - Generate a key pair
      - Publish the public key as a DNS TXT record
---

DKIM adds a cryptographic signature to outgoing mail. This is the body of
the article, several sentences long so a reading-time estimate has
something real to compute against rather than a single short line.
`;

const MISSING_AUTHOR_MD = `---
contentType: guide
slug: orphaned-article
title: Orphaned Article
description: This article references an author who was never registered.
authorSlug: nobody-registered
publishedAt: "2026-07-12"
assets:
  - type: checklist
    title: A checklist
    content: ["one"]
---
Body text.
`;

const INVALID_FRONTMATTER_MD = `---
contentType: guide
slug: no-assets-article
title: An Article With No Assets
description: This violates the assets.min(1) publish requirement.
authorSlug: jane-doe
publishedAt: "2026-07-12"
assets: []
---
Body text.
`;

beforeAll(async () => {
  contentDir = await mkdtemp(path.join(tmpdir(), "content-loader-test-"));
  await mkdir(path.join(contentDir, "repmail", "authors"), { recursive: true });
  await writeFile(path.join(contentDir, "repmail", "authors", "jane-doe.json"), JSON.stringify(VALID_AUTHOR), "utf-8");

  await mkdir(path.join(contentDir, "repmail", "deliverability"), { recursive: true });
  await writeFile(path.join(contentDir, "repmail", "deliverability", "how-dkim-works.md"), VALID_ARTICLE_MD, "utf-8");
  await writeFile(path.join(contentDir, "repmail", "deliverability", "orphaned-article.md"), MISSING_AUTHOR_MD, "utf-8");
  await writeFile(path.join(contentDir, "repmail", "deliverability", "no-assets-article.md"), INVALID_FRONTMATTER_MD, "utf-8");
});

afterAll(async () => {
  if (contentDir) await rm(contentDir, { recursive: true, force: true });
});

describe("loadAuthors", () => {
  it("loads a valid author file, keyed by slug", async () => {
    const authors = await loadAuthors(contentDir, "repmail", { log: () => {} });
    expect(authors.get("jane-doe")).toEqual(VALID_AUTHOR);
  });

  it("returns an empty Map (not an error) when no authors/ directory exists yet — zero real authors is an honest state", async () => {
    const emptyDir = await mkdtemp(path.join(tmpdir(), "content-loader-empty-"));
    const authors = await loadAuthors(emptyDir, "repmail", { log: () => {} });
    expect(authors.size).toBe(0);
    await rm(emptyDir, { recursive: true, force: true });
  });
});

describe("loadArticles", () => {
  it("loads a valid article, resolves its real author and academy, computes reading time, renders markdown to HTML", async () => {
    const authors = await loadAuthors(contentDir, "repmail", { log: () => {} });
    const articles = await loadArticles(contentDir, "repmail", authors, { log: () => {} });
    const article = articles.find((a) => a.slug === "how-dkim-works");

    expect(article).toBeTruthy();
    expect(article.author).toEqual(VALID_AUTHOR);
    expect(article.academy.slug).toBe("deliverability");
    expect(article.academy.name).toBe("Deliverability & Sender Reputation");
    expect(article.bodyHtml).toContain("<p>");
    expect(article.bodyHtml).toContain("DKIM adds a cryptographic signature");
    expect(typeof article.readingTimeMinutes).toBe("number");
    expect(article.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    expect(article.assets).toHaveLength(1);
  });

  it("skips an article whose authorSlug has no matching registered author, without failing the whole load", async () => {
    const authors = await loadAuthors(contentDir, "repmail", { log: () => {} });
    const logs = [];
    const articles = await loadArticles(contentDir, "repmail", authors, { log: (m) => logs.push(m) });

    expect(articles.find((a) => a.slug === "orphaned-article")).toBeUndefined();
    expect(logs.some((l) => l.includes("orphaned-article") && l.includes("no matching registered author"))).toBe(true);
    // the valid article still loaded — one bad file doesn't take down the batch
    expect(articles.find((a) => a.slug === "how-dkim-works")).toBeTruthy();
  });

  it("skips an article that fails schema validation (zero assets), without failing the whole load", async () => {
    const authors = await loadAuthors(contentDir, "repmail", { log: () => {} });
    const logs = [];
    const articles = await loadArticles(contentDir, "repmail", authors, { log: (m) => logs.push(m) });

    expect(articles.find((a) => a.slug === "no-assets-article")).toBeUndefined();
    expect(logs.some((l) => l.includes("no-assets-article"))).toBe(true);
  });

  it("returns an empty array (not an error) for a product/academy with no content yet — the real state of this repo today", async () => {
    const emptyDir = await mkdtemp(path.join(tmpdir(), "content-loader-empty2-"));
    const authors = await loadAuthors(emptyDir, "repmail", { log: () => {} });
    const articles = await loadArticles(emptyDir, "repmail", authors, { log: () => {} });
    expect(articles).toEqual([]);
    await rm(emptyDir, { recursive: true, force: true });
  });

  it("returns an empty array for an unknown product rather than throwing", async () => {
    const articles = await loadArticles(contentDir, "not-a-real-product", new Map(), { log: () => {} });
    expect(articles).toEqual([]);
  });
});
