// M21-D — wires ResourceCenterHome (M21-C template) to real content via
// the client-side loader. No fabricated placeholder articles: every module
// that has no real data yet simply doesn't render (each is conditional in
// the template itself), so this honestly reflects that the Resource Center
// has zero published content today, not a demo full of fake guides.
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import ResourceCenterHome from "@/components/resource-center/ResourceCenterHome";
import { PRODUCTS } from "@shared/content/taxonomy.js";

export default function ResourceCenterHomePage() {
  const product = PRODUCTS.repmail;
  const articles = getArticlesForProduct("repmail");

  const academyArticleCounts = Object.fromEntries(
    product.academies.map((a) => [a.slug, articles.filter((art) => art.academy.slug === a.slug).length])
  );

  // Template Library, Glossary, and Comparisons are their own later roadmap
  // phases (PAR §13 Phases 7/10) — no curated-resource links until those
  // pages actually exist. An empty array here means the section simply
  // doesn't render (ResourceCenterHome is conditional per module), not a
  // dead link to a page that returns 404 today.
  const curatedResources = [];

  return (
    <ResourceCenterHome
      product={product}
      featuredArticles={articles.filter((a) => a.featured)}
      learningPaths={[]}
      collections={[]}
      toolsAvailable={false}
      academyArticleCounts={academyArticleCounts}
      curatedResources={curatedResources}
      recentArticles={[...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 5)}
      onOpenSearch={() => {}} // wired to a real command palette in M21-F
    />
  );
}
