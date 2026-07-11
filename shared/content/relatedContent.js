// M21-F — related-content generation (PAR §7/§8: "generated from shared
// tags/pillar membership, not hand-curated lists that rot"). Pure function,
// no fs/DOM — usable client-side (ArticleTemplate's related section) and,
// later, in the build-time prerender path once Resource Center pages join
// that pipeline.
//
// Scoring: shared tags count double a shared academy, since two articles
// tagged identically are a tighter match than two articles that merely
// live in the same Academy (which could easily be a dozen loosely-related
// guides). Ties broken by most recently published, so the related block
// stays fresh as an Academy grows rather than freezing on whichever
// article happened to publish first.
export function getRelatedArticles(article, allArticles, { limit = 3 } = {}) {
  if (!article) return [];

  const candidates = allArticles.filter((a) => a.slug !== article.slug || a.academy.slug !== article.academy.slug);
  const articleTags = new Set(article.tags ?? []);

  const scored = candidates
    .map((candidate) => {
      const sharedTags = (candidate.tags ?? []).filter((t) => articleTags.has(t)).length;
      const sameAcademy = candidate.academy.slug === article.academy.slug ? 1 : 0;
      const score = sharedTags * 2 + sameAcademy;
      return { candidate, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.candidate.publishedAt) - new Date(a.candidate.publishedAt);
    });

  return scored.slice(0, limit).map((s) => s.candidate);
}
