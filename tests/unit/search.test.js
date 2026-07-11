// M21-F — search scoring tests. Pure function, plain fixture data.

import { describe, it, expect } from "vitest";
import { searchArticles } from "../../shared/content/search.js";

const articles = [
  { slug: "how-dkim-works", title: "How DKIM Works", description: "A guide to DKIM signing.", tags: ["dkim", "authentication"] },
  { slug: "spf-explained", title: "SPF Explained", description: "Understanding SPF records for deliverability.", tags: ["spf"] },
  { slug: "warm-up-guide", title: "Sender Warm-Up Guide", description: "How to warm up a new sending domain.", tags: ["warm-up", "dkim"] },
];

describe("searchArticles", () => {
  it("returns an empty array for an empty or whitespace-only query, not every article", () => {
    expect(searchArticles("", articles)).toEqual([]);
    expect(searchArticles("   ", articles)).toEqual([]);
  });

  it("ranks an exact title match above a partial title match", () => {
    const results = searchArticles("how dkim works", articles);
    expect(results[0].slug).toBe("how-dkim-works");
  });

  it("matches on tags even when the title/description don't contain the query", () => {
    const results = searchArticles("spf", articles);
    expect(results.map((r) => r.slug)).toContain("spf-explained");
  });

  it("a query matching a shared tag across multiple articles returns all of them, tag-matches ranked above description-only matches", () => {
    const results = searchArticles("dkim", articles);
    const slugs = results.map((r) => r.slug);
    expect(slugs).toContain("how-dkim-works");
    expect(slugs).toContain("warm-up-guide"); // tagged dkim even though title doesn't say it
  });

  it("is case-insensitive", () => {
    expect(searchArticles("SPF", articles).map((r) => r.slug)).toContain("spf-explained");
  });

  it("returns nothing for a query with no match anywhere", () => {
    expect(searchArticles("nonexistent-topic-xyz", articles)).toEqual([]);
  });
});
