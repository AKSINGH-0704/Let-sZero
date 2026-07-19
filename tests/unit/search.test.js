// M21-F/M21-I — search scoring + content-type-agnostic index tests.

import { describe, it, expect } from "vitest";
import { searchContent, buildSearchIndex, articleToSearchEntry, academyToSearchEntry } from "../../shared/content/search.js";
import { PRODUCTS } from "../../shared/content/taxonomy.js";

const repmail = PRODUCTS.repmail;

const rawArticles = [
  { slug: "how-dkim-works", title: "How DKIM Works", description: "A guide to DKIM signing.", tags: ["dkim", "authentication"], academy: repmail.academies[1] },
  { slug: "spf-explained", title: "SPF Explained", description: "Understanding SPF records for deliverability.", tags: ["spf"], academy: repmail.academies[1] },
  { slug: "warm-up-guide", title: "Sender Warm-Up Guide", description: "How to warm up a new sending domain.", tags: ["warm-up", "dkim"], academy: repmail.academies[1] },
];

const entries = rawArticles.map((a) => articleToSearchEntry(a, repmail));

describe("searchContent (generic, content-type-agnostic)", () => {
  it("returns an empty array for an empty or whitespace-only query, not every entry", () => {
    expect(searchContent("", entries)).toEqual([]);
    expect(searchContent("   ", entries)).toEqual([]);
  });

  it("ranks an exact title match above a partial title match", () => {
    const results = searchContent("how dkim works", entries);
    expect(results[0].title).toBe("How DKIM Works");
  });

  it("matches on tags even when the title/description don't contain the query", () => {
    const results = searchContent("spf", entries);
    expect(results.map((r) => r.title)).toContain("SPF Explained");
  });

  it("is case-insensitive", () => {
    expect(searchContent("SPF", entries).map((r) => r.title)).toContain("SPF Explained");
  });

  it("returns nothing for a query with no match anywhere", () => {
    expect(searchContent("nonexistent-topic-xyz", entries)).toEqual([]);
  });
});

describe("SearchEntry adapters", () => {
  it("articleToSearchEntry produces a real, navigable url and the Academy name as subtitle", () => {
    const entry = articleToSearchEntry(rawArticles[0], repmail);
    expect(entry.type).toBe("article");
    expect(entry.url).toBe("/repmail/learn/deliverability/how-dkim-works");
    expect(entry.subtitle).toBe("Deliverability & Sender Reputation");
  });

  it("academyToSearchEntry produces a real, navigable url to the Academy hub", () => {
    const entry = academyToSearchEntry(repmail.academies[0], repmail);
    expect(entry.type).toBe("academy");
    expect(entry.url).toBe("/repmail/learn/cold-email");
    expect(entry.subtitle).toBe("Academy");
  });
});

describe("buildSearchIndex — proves search scales beyond articles without new architecture", () => {
  it("combines Academies and Articles into one flat, uniformly-searchable index", () => {
    const index = buildSearchIndex(repmail, { articles: rawArticles });
    expect(index.some((e) => e.type === "academy")).toBe(true);
    expect(index.some((e) => e.type === "article")).toBe(true);
  });

  it("a query matching an Academy's own name/description surfaces the Academy itself, alongside any matching articles — one search, multiple content types, zero type-specific UI logic", () => {
    const index = buildSearchIndex(repmail, { articles: rawArticles });
    // "Deliverability" matches the Academy the fixture articles live in, plus articles
    const results = searchContent("deliverability", index);
    expect(results.some((r) => r.type === "academy" && r.title === "Deliverability & Sender Reputation")).toBe(true);
    expect(results.some((r) => r.type === "article")).toBe(true);
  });

  // M28-B — search was the last surface that could send a reader to an Academy
  // with nothing published in it. Every other surface (header nav, CategoryRail,
  // homepage cards, sitemap, prerender) already derives itself from real content.
  it("indexes only Academies that have a published article, so search can never lead to an empty Academy", () => {
    const index = buildSearchIndex(repmail, { articles: rawArticles });
    const academies = index.filter((e) => e.type === "academy");
    // the fixture articles all live in one Academy, so exactly one is live
    expect(academies).toHaveLength(1);
    expect(academies[0].url).toBe("/repmail/learn/deliverability");
    // "Compliance" is a real taxonomy Academy with zero published articles —
    // it must not be reachable through search
    expect(searchContent("compliance", index).some((r) => r.type === "academy")).toBe(false);
  });

  it("works correctly with zero articles — an empty index rather than a list of empty Academies", () => {
    expect(buildSearchIndex(repmail, { articles: [] })).toHaveLength(0);
  });

  // M28-B — collections and paths have been routed, prerendered destinations
  // since M22-A but were never indexed, so search could not reach them.
  it("indexes Collections and Learning Paths as first-class, navigable results", () => {
    const index = buildSearchIndex(repmail, {
      articles: rawArticles,
      collections: [{ slug: "escaping-the-spam-folder", name: "Escaping the Spam Folder", description: "Why mail lands in spam and how to fix it.", articleSlugs: [] }],
      learningPaths: [{ slug: "getting-started", name: "Getting Started", description: "From setup to first campaign.", steps: [] }],
    });

    const collection = searchContent("escaping the spam folder", index).find((r) => r.type === "collection");
    expect(collection?.url).toBe("/repmail/learn/collections/escaping-the-spam-folder");
    expect(collection?.subtitle).toBe("Collection");

    const path = searchContent("getting started", index).find((r) => r.type === "path");
    expect(path?.url).toBe("/repmail/learn/paths/getting-started");
    expect(path?.subtitle).toBe("Learning path");
  });
});
