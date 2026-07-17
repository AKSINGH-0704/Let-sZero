// M28 — deterministic display ordering for guide lists.
//
// The Resource Center publishes in waves: 49 of the 60 articles share the
// publishedAt 2026-07-17 (the M27 wave) and 11 share 2026-07-12. That is
// correct, not a data defect — those waves really were published at once. But
// it means publishedAt alone leaves a 49-way tie, and a tie resolved by the
// loader's filesystem/import order is not stable: it would reorder the homepage
// on an unrelated rename and produce a different prerendered page than the
// client renders.
//
// So ordering is fully specified here, from fields the content already has. No
// manual rank/weight field was introduced: `featured` is the existing editorial
// signal (the pillar hubs all carry it), and contentType already encodes the
// difference between a full guide and a one-paragraph glossary definition.

// Lower sorts first. A type not listed sorts after every listed one, so adding
// a content type to the taxonomy can never crash this — it just lands last,
// ahead of glossary terms only if it is genuinely unranked.
const CONTENT_TYPE_RANK = {
  guide: 0,
  "knowledge-base": 1,
  tutorial: 2,
  "product-education": 3,
  comparison: 4,
  research: 5,
  "case-study": 6,
  "engineering-article": 7,
  template: 8,
  "release-notes": 9,
  // A glossary term is a definition that funnels elsewhere, not a destination
  // read. It sorts last so a "latest guides" list is not 15 definitions deep
  // before it reaches a guide.
  "glossary-term": 99,
};

export function contentTypeRank(contentType) {
  return CONTENT_TYPE_RANK[contentType] ?? 50;
}

/**
 * Orders articles for any "latest / all guides" surface.
 *
 * 1. publishedAt, newest first — a genuinely newer wave always outranks.
 * 2. featured first — the existing editorial signal; the pillar hubs carry it.
 * 3. content type — a full guide outranks a glossary definition.
 * 4. title, alphabetically — the final tiebreak, so the result is total and
 *    never depends on the order the loader happened to read the directory in.
 *
 * Pure and non-mutating: callers pass loader output straight in.
 */
export function sortGuidesForDisplay(articles) {
  return [...articles].sort((a, b) => {
    const byDate = new Date(b.publishedAt) - new Date(a.publishedAt);
    if (byDate !== 0) return byDate;

    const byFeatured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (byFeatured !== 0) return byFeatured;

    const byType = contentTypeRank(a.contentType) - contentTypeRank(b.contentType);
    if (byType !== 0) return byType;

    return a.title.localeCompare(b.title);
  });
}

/**
 * The newest N articles for the homepage's Latest Guides module.
 */
export function latestGuides(articles, { limit = 6 } = {}) {
  return sortGuidesForDisplay(articles).slice(0, limit);
}

/**
 * Groups articles under their Academy for the All Guides index, using the
 * product's own editorial Academy order (taxonomy order, not alphabetical) and
 * dropping Academies that have nothing published. Returns [] entries never.
 */
export function groupGuidesByAcademy(product, articles) {
  return product.academies
    .map((academy) => ({
      academy,
      articles: sortGuidesForDisplay(articles.filter((a) => a.academy.slug === academy.slug)),
    }))
    .filter((group) => group.articles.length > 0);
}

/**
 * The noun an Academy counts its content in. A Glossary holds definitions, not
 * guides, and calling 15 definitions "15 guides" overstates what is there.
 */
export function academyCountNoun(academySlug, count) {
  const noun = academySlug === "glossary" ? "definition" : "guide";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * M28 — where an article sits inside a learning path, so an article read as
 * part of a sequence can offer Previous/Next.
 *
 * Derived from the path data, never hand-maintained per article: an article
 * does not know it is in a path, the path knows. Reordering a path's steps
 * therefore updates every affected article's prev/next automatically.
 *
 * An article can appear in more than one path. It resolves against the first
 * path (in the given order) that contains it, so navigation is deterministic
 * rather than dependent on which path the reader arrived from — which the
 * article page cannot know without carrying state through the URL.
 *
 * Returns null when the article is in no path at all, which is the common case:
 * only 20 of the 60 articles are path members.
 */
export function findPathNavigation(articleSlug, learningPaths, articlesBySlug) {
  for (const path of learningPaths) {
    const steps = path.steps ?? [];
    const index = steps.indexOf(articleSlug);
    if (index === -1) continue;

    const resolve = (slug) => (slug ? articlesBySlug.get(slug) ?? null : null);
    // A step that does not resolve to a real article is skipped rather than
    // rendered as a dead link. The loader already drops invalid articles, so
    // this is the same posture: a missing neighbour is better than a broken one.
    return {
      path,
      position: index + 1,
      total: steps.length,
      previous: resolve(steps[index - 1]),
      next: resolve(steps[index + 1]),
    };
  }
  return null;
}
