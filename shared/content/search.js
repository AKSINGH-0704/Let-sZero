// M21-F/M21-I — on-site search scoring (PAR §5/§8: cmdk-based, "the
// intended long-term primary discovery tool"). Pure function, no fs/DOM.
//
// Operates on a generic, content-type-agnostic SearchEntry shape
// { type, title, description, tags, url, subtitle }, not directly on
// Article objects — adding a new searchable content type (Templates,
// Tools, Comparisons, Glossary terms, as those phases ship) means adding
// one small mapper function below, not changing this file's ranking logic
// or the UI that calls it. buildSearchIndex() is where those mappers are
// combined into one flat, uniformly-rankable list.
//
// Simple substring scoring, deliberately not a fuzzy-match library: title
// match ranks highest, then tags, then description — matches how a person
// actually thinks about "did I find the right thing."
export function searchContent(query, entries) {
  const q = query?.trim().toLowerCase();
  if (!q) return [];

  const scored = entries
    .map((entry) => {
      const title = entry.title.toLowerCase();
      const tags = (entry.tags ?? []).map((t) => t.toLowerCase());
      const description = (entry.description ?? "").toLowerCase();

      let score = 0;
      if (title.includes(q)) score += title === q ? 10 : 5;
      if (tags.some((t) => t.includes(q))) score += 3;
      if (description.includes(q)) score += 1;

      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.entry);
}

// --- SearchEntry adapters — one per content type, all producing the same
// shape. This is the one place that knows how each real content object
// maps to something searchable; searchContent() never needs to know. ---

export function articleToSearchEntry(article, product) {
  return {
    type: "article",
    title: article.title,
    description: article.description,
    tags: article.tags ?? [],
    url: `${product.basePath}/${article.academy.slug}/${article.slug}`,
    subtitle: article.academy.name,
  };
}

export function academyToSearchEntry(academy, product) {
  return {
    type: "academy",
    title: academy.name,
    description: academy.description,
    tags: [],
    url: `${product.basePath}/${academy.slug}`,
    subtitle: "Academy",
  };
}

export function collectionToSearchEntry(collection, product) {
  return {
    type: "collection",
    title: collection.name,
    description: collection.description,
    tags: [],
    url: `${product.basePath}/collections/${collection.slug}`,
    subtitle: "Collection",
  };
}

export function learningPathToSearchEntry(path, product) {
  return {
    type: "path",
    title: path.name,
    description: path.description,
    tags: [],
    url: `${product.basePath}/paths/${path.slug}`,
    subtitle: "Learning path",
  };
}

/**
 * Combines every currently-searchable content type into one flat index.
 * Extend by adding another `entries.push(...things.map(thingToSearchEntry))`
 * line as new content types ship — searchContent() itself never changes.
 *
 * M28-B — two corrections to what belongs in the index:
 *
 * 1. Only Academies that actually have a published article are indexed. Every
 *    other navigation surface (the header nav, CategoryRail, the homepage
 *    Academy cards, the sitemap, the prerender route list) already derives
 *    itself from real content and so already omits the empty ones. Search was
 *    the last surface still offering them, which made it the only way for a
 *    reader to reach "This Academy is being written now" — a page that is
 *    deliberately neither prerendered nor indexed. Derived from the articles
 *    passed in, exactly like those other surfaces, so an Academy becomes
 *    searchable by gaining content, not by being added to a list here.
 *
 * 2. Collections and learning paths are indexed. Both have been real, routed,
 *    prerendered destinations since M22-A, but were never added here, so 11
 *    live pages were unreachable through the site's primary discovery tool.
 */
export function buildSearchIndex(product, { articles = [], collections = [], learningPaths = [] } = {}) {
  const liveAcademySlugs = new Set(articles.map((a) => a.academy.slug));
  const entries = [];
  entries.push(...product.academies.filter((a) => liveAcademySlugs.has(a.slug)).map((a) => academyToSearchEntry(a, product)));
  entries.push(...articles.map((a) => articleToSearchEntry(a, product)));
  entries.push(...collections.map((c) => collectionToSearchEntry(c, product)));
  entries.push(...learningPaths.map((p) => learningPathToSearchEntry(p, product)));
  return entries;
}
