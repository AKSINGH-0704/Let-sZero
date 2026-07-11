// M21-E — build-time sitemap/RSS generator tests, against real temp
// directories and real file output (not mocked fs).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { generateSitemap } from "../../script/generate-sitemap.js";
import { generateRss } from "../../script/generate-rss.js";

describe("generateSitemap", () => {
  let distDir;
  beforeAll(async () => { distDir = await mkdtemp(path.join(tmpdir(), "sitemap-test-")); });
  afterAll(async () => { await rm(distDir, { recursive: true, force: true }); });

  it("writes a valid sitemap.xml with one <url> per route, using canonicalOrigin + lastmod", async () => {
    await generateSitemap({
      distDir,
      canonicalOrigin: "https://example.test",
      lastmod: "2026-07-12",
      log: () => {},
      routes: [
        { path: "/" },
        { path: "/pricing" },
      ],
    });
    const xml = await readFile(path.join(distDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain("<loc>https://example.test</loc>");
    expect(xml).toContain("<loc>https://example.test/pricing</loc>");
    expect(xml).toContain("<lastmod>2026-07-12</lastmod>");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("escapes XML-significant characters in URLs", async () => {
    await generateSitemap({
      distDir,
      canonicalOrigin: "https://example.test",
      log: () => {},
      routes: [{ path: "/a&b" }],
    });
    const xml = await readFile(path.join(distDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain("/a&amp;b");
    expect(xml).not.toContain("/a&b<"); // raw & would be invalid XML
  });
});

describe("generateRss", () => {
  let contentDir, distDir;
  const AUTHOR = { slug: "jane-doe", name: "Jane Doe", role: "Engineer", bio: "Writes guides." };
  const ARTICLE_MD = `---
contentType: guide
slug: how-dkim-works
title: How DKIM Works
description: A practical guide.
authorSlug: jane-doe
publishedAt: "2026-07-12"
assets:
  - type: checklist
    title: Checklist
    content: ["one"]
---
Body.
`;

  beforeAll(async () => {
    contentDir = await mkdtemp(path.join(tmpdir(), "rss-content-"));
    distDir = await mkdtemp(path.join(tmpdir(), "rss-dist-"));
    await mkdir(path.join(contentDir, "repmail", "authors"), { recursive: true });
    await writeFile(path.join(contentDir, "repmail", "authors", "jane-doe.json"), JSON.stringify(AUTHOR), "utf-8");
    await mkdir(path.join(contentDir, "repmail", "deliverability"), { recursive: true });
    await writeFile(path.join(contentDir, "repmail", "deliverability", "how-dkim-works.md"), ARTICLE_MD, "utf-8");
  });
  afterAll(async () => {
    await rm(contentDir, { recursive: true, force: true });
    await rm(distDir, { recursive: true, force: true });
  });

  it("produces a valid RSS feed with a real article as an <item>", async () => {
    const xml = await generateRss({ contentDir, distDir, canonicalOrigin: "https://example.test", log: () => {} });
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain("How DKIM Works");
    expect(xml).toContain("https://example.test/repmail/learn/deliverability/how-dkim-works");
    const written = await readFile(path.join(distDir, "repmail", "learn", "rss.xml"), "utf-8");
    expect(written).toBe(xml);
  });

  it("produces a valid, empty feed (not an error) when there is zero real content — today's actual state", async () => {
    const emptyContentDir = await mkdtemp(path.join(tmpdir(), "rss-empty-"));
    const xml = await generateRss({ contentDir: emptyContentDir, distDir, canonicalOrigin: "https://example.test", log: () => {} });
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).not.toContain("<item>");
    await rm(emptyContentDir, { recursive: true, force: true });
  });

  it("throws for an unknown product rather than silently producing an empty feed for the wrong reason", async () => {
    await expect(generateRss({ contentDir, distDir, productSlug: "not-a-real-product", log: () => {} })).rejects.toThrow(/unknown product/);
  });
});
