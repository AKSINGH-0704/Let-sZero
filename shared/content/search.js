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

/**
 * Combines every currently-searchable content type into one flat index.
 * Extend by adding another `entries.push(...things.map(thingToSearchEntry))`
 * line as new content types ship (Templates/Tools/Comparisons/Glossary) —
 * searchContent() itself never changes.
 */
export function buildSearchIndex(product, { articles = [] } = {}) {
  const entries = [];
  entries.push(...product.academies.map((a) => academyToSearchEntry(a, product)));
  entries.push(...articles.map((a) => articleToSearchEntry(a, product)));
  return entries;
}
