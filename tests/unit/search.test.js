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
    // every one of the 6 real Academies is in the index, not just articles
    expect(index.filter((e) => e.type === "academy")).toHaveLength(6);
  });

  it("a query matching an Academy's own name/description surfaces the Academy itself, alongside any matching articles — one search, multiple content types, zero type-specific UI logic", () => {
    const index = buildSearchIndex(repmail, { articles: rawArticles });
    // "Compliance" matches only the Academy (no article in the fixture set is tagged/titled with it)
    const results = searchContent("compliance", index);
    expect(results.some((r) => r.type === "academy" && r.title === "Compliance")).toBe(true);
  });

  it("works correctly with zero articles — an Academy-only index is still valid and searchable (today's real state)", () => {
    const index = buildSearchIndex(repmail, { articles: [] });
    expect(index).toHaveLength(6); // 6 Academies, 0 articles
    const results = searchContent("deliverability", index);
    expect(results[0].type).toBe("academy");
  });
});
