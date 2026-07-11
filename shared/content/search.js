// M21-F — on-site search scoring (PAR §5/§8: cmdk-based, "the intended
// long-term primary discovery tool"). Pure function, no fs/DOM — the actual
// cmdk command palette (client/src/components/resource-center/
// ResourceCenterSearch.jsx) uses this for its result ranking rather than
// cmdk's own built-in fuzzy scoring, so the ranking logic is independently
// testable and not locked to one UI library's internals.
//
// Simple substring scoring, deliberately not a fuzzy-match library: title
// match ranks highest, then tags, then description — matches how a person
// actually thinks about "did I find the right guide," and needs no new
// dependency for a Resource Center that (today) has zero real articles to
// search over.
export function searchArticles(query, articles) {
  const q = query?.trim().toLowerCase();
  if (!q) return [];

  const scored = articles
    .map((article) => {
      const title = article.title.toLowerCase();
      const tags = (article.tags ?? []).map((t) => t.toLowerCase());
      const description = article.description.toLowerCase();

      let score = 0;
      if (title.includes(q)) score += title === q ? 10 : 5;
      if (tags.some((t) => t.includes(q))) score += 3;
      if (description.includes(q)) score += 1;

      return { article, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.article);
}
