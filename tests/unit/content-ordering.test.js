// M28 — the deterministic ordering behind Latest Guides and the All Guides
// index. This matters more than it looks: 49 of the 60 real articles share one
// publishedAt, so ordering is decided almost entirely by the tiebreak. If that
// tiebreak were the loader's directory order, the prerendered HTML and the
// client render could disagree, and an unrelated file rename would silently
// reshuffle the homepage.

import { describe, it, expect } from "vitest";
import path from "path";
import { sortGuidesForDisplay, latestGuides, groupGuidesByAcademy, academyCountNoun, contentTypeRank, findPathNavigation } from "../../shared/content/ordering.js";
import { loadAuthors, loadArticles } from "../../shared/content/loader.js";
import { PRODUCTS } from "../../shared/content/taxonomy.js";

const CONTENT_DIR = path.resolve(import.meta.dirname, "..", "..", "client", "src", "content");
const authors = await loadAuthors(CONTENT_DIR, "repmail", { log: () => {} });
const realArticles = await loadArticles(CONTENT_DIR, "repmail", authors, { log: () => {} });

const article = (over = {}) => ({
  slug: "a",
  title: "A title",
  contentType: "guide",
  publishedAt: "2026-07-17",
  featured: false,
  academy: { slug: "deliverability", name: "Deliverability" },
  ...over,
});

describe("sortGuidesForDisplay", () => {
  it("puts a genuinely newer article first, whatever its type or flags", () => {
    const older = article({ slug: "older", publishedAt: "2026-07-12", featured: true });
    const newer = article({ slug: "newer", publishedAt: "2026-07-17", featured: false, contentType: "glossary-term" });
    expect(sortGuidesForDisplay([older, newer]).map((a) => a.slug)).toEqual(["newer", "older"]);
  });

  it("within one publication wave, featured comes before unfeatured", () => {
    const plain = article({ slug: "plain", featured: false });
    const feat = article({ slug: "feat", featured: true });
    expect(sortGuidesForDisplay([plain, feat]).map((a) => a.slug)).toEqual(["feat", "plain"]);
  });

  it("within one wave at equal featured-ness, a guide outranks a glossary definition", () => {
    const term = article({ slug: "term", contentType: "glossary-term" });
    const guide = article({ slug: "guide", contentType: "guide" });
    expect(sortGuidesForDisplay([term, guide]).map((a) => a.slug)).toEqual(["guide", "term"]);
  });

  it("falls back to title alphabetically, so the order is total and never decided by input order", () => {
    const b = article({ slug: "b", title: "Bravo" });
    const a = article({ slug: "a", title: "Alpha" });
    expect(sortGuidesForDisplay([b, a]).map((a) => a.slug)).toEqual(["a", "b"]);
    // and the reverse input gives the identical result — that is the point
    expect(sortGuidesForDisplay([a, b]).map((a) => a.slug)).toEqual(["a", "b"]);
  });

  it("is stable against input order for the REAL content — the same list regardless of how the loader read the directory", () => {
    const forward = sortGuidesForDisplay(realArticles).map((a) => a.slug);
    const reversed = sortGuidesForDisplay([...realArticles].reverse()).map((a) => a.slug);
    const shuffled = sortGuidesForDisplay([...realArticles].sort((x, y) => x.slug.localeCompare(y.slug))).map((a) => a.slug);
    expect(reversed).toEqual(forward);
    expect(shuffled).toEqual(forward);
  });

  it("does not mutate the array it is given", () => {
    const input = [article({ slug: "b", title: "B" }), article({ slug: "a", title: "A" })];
    sortGuidesForDisplay(input);
    expect(input.map((a) => a.slug)).toEqual(["b", "a"]);
  });

  it("ranks an unknown content type after known ones but ahead of glossary terms, rather than throwing", () => {
    expect(contentTypeRank("guide")).toBeLessThan(contentTypeRank("something-new"));
    expect(contentTypeRank("something-new")).toBeLessThan(contentTypeRank("glossary-term"));
  });
});

describe("latestGuides", () => {
  it("returns the requested number, newest wave first", () => {
    const result = latestGuides(realArticles, { limit: 6 });
    expect(result).toHaveLength(6);
    // Derived rather than hardcoded: this previously asserted a literal date and
    // broke the moment a new content wave shipped, which is a property of the
    // fixture rather than of the ordering behaviour being tested.
    const newest = realArticles
      .map((a) => a.publishedAt)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    expect(result[0].publishedAt).toBe(newest);
  });

  it("leads with real pillar content, not 15 glossary definitions", () => {
    const result = latestGuides(realArticles, { limit: 6 });
    expect(result.every((a) => a.contentType !== "glossary-term")).toBe(true);
  });
});

describe("groupGuidesByAcademy", () => {
  const product = PRODUCTS.repmail;

  it("groups the real content and drops Academies with nothing published", () => {
    const groups = groupGuidesByAcademy(product, realArticles);
    const slugs = groups.map((g) => g.academy.slug);
    expect(slugs).not.toContain("lead-generation"); // genuinely empty
    expect(slugs).not.toContain("compliance"); // genuinely empty
    expect(slugs).toContain("deliverability");
    expect(slugs).toContain("glossary");
    for (const g of groups) expect(g.articles.length).toBeGreaterThan(0);
  });

  it("preserves the taxonomy's editorial Academy order rather than sorting alphabetically", () => {
    const groups = groupGuidesByAcademy(product, realArticles);
    const slugs = groups.map((g) => g.academy.slug);
    const taxonomyOrder = product.academies.map((a) => a.slug).filter((s) => slugs.includes(s));
    expect(slugs).toEqual(taxonomyOrder);
  });

  it("accounts for every article exactly once — the index can never quietly drop one", () => {
    const groups = groupGuidesByAcademy(product, realArticles);
    const total = groups.reduce((n, g) => n + g.articles.length, 0);
    expect(total).toBe(realArticles.length);
  });
});

describe("academyCountNoun", () => {
  it("counts glossary entries as definitions and everything else as guides", () => {
    expect(academyCountNoun("glossary", 15)).toBe("15 definitions");
    expect(academyCountNoun("deliverability", 20)).toBe("20 guides");
  });

  it("singularizes", () => {
    expect(academyCountNoun("glossary", 1)).toBe("1 definition");
    expect(academyCountNoun("cold-email", 1)).toBe("1 guide");
  });
});

describe("findPathNavigation (M28 — Previous/Next inside a learning path)", () => {
  const bySlug = new Map([
    ["one", article({ slug: "one", title: "One" })],
    ["two", article({ slug: "two", title: "Two" })],
    ["three", article({ slug: "three", title: "Three" })],
  ]);
  const paths = [{ slug: "p", name: "A Path", steps: ["one", "two", "three"] }];

  it("gives both neighbours in the middle of a path, with the reader's position", () => {
    const nav = findPathNavigation("two", paths, bySlug);
    expect(nav.previous.slug).toBe("one");
    expect(nav.next.slug).toBe("three");
    expect(nav.position).toBe(2);
    expect(nav.total).toBe(3);
    expect(nav.path.name).toBe("A Path");
  });

  it("has no previous at the first step and no next at the last", () => {
    expect(findPathNavigation("one", paths, bySlug).previous).toBeNull();
    expect(findPathNavigation("one", paths, bySlug).next.slug).toBe("two");
    expect(findPathNavigation("three", paths, bySlug).next).toBeNull();
    expect(findPathNavigation("three", paths, bySlug).previous.slug).toBe("two");
  });

  it("returns null for an article in no path — a standalone guide gets no fake sequence", () => {
    expect(findPathNavigation("orphan", paths, bySlug)).toBeNull();
  });

  it("skips a neighbour that doesn't resolve to a real article rather than emitting a dead link", () => {
    const withGap = [{ slug: "p", name: "P", steps: ["one", "ghost", "three"] }];
    const nav = findPathNavigation("three", withGap, bySlug);
    expect(nav.previous).toBeNull(); // "ghost" isn't a real article
    expect(nav.position).toBe(3);
  });

  it("resolves against the first path containing the article, deterministically", () => {
    const multi = [
      { slug: "a", name: "A", steps: ["x", "two"] },
      { slug: "b", name: "B", steps: ["two", "y"] },
    ];
    expect(findPathNavigation("two", multi, bySlug).path.slug).toBe("a");
  });

  it("works against the REAL paths and content: every path member gets navigation, and every neighbour is a real article", async () => {
    const pathsDir = path.resolve(import.meta.dirname, "..", "..", "client", "src", "content", "repmail", "paths");
    const { readdir, readFile } = await import("fs/promises");
    const files = (await readdir(pathsDir)).filter((f) => f.endsWith(".json"));
    const realPaths = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(pathsDir, f), "utf-8"))));
    const map = new Map(realArticles.map((a) => [a.slug, a]));

    let checked = 0;
    for (const p of realPaths) {
      for (const slug of p.steps) {
        const nav = findPathNavigation(slug, realPaths, map);
        expect(nav, `no navigation for real path member ${slug}`).toBeTruthy();
        if (nav.previous) expect(map.has(nav.previous.slug)).toBe(true);
        if (nav.next) expect(map.has(nav.next.slug)).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(15); // the real paths have 20 steps between them
  });
});
