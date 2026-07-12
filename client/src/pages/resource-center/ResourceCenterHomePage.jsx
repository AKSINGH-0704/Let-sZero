// M21-D — wires ResourceCenterHome (M21-C template) to real content via
// the client-side loader. No fabricated placeholder articles: every module
// that has no real data yet simply doesn't render (each is conditional in
// the template itself), so this honestly reflects that the Resource Center
// has zero published content today, not a demo full of fake guides.
// M21-F wires the real search command palette in place of the M21-D no-op.
// M21-I: :product is resolved dynamically from the route (was hardcoded to
// PRODUCTS.repmail) — a second LetsZero product needs a PRODUCTS entry and
// content, not a new page component or route path.
import { useRoute } from "wouter";
import { getArticlesForProduct, getLearningPathsForProduct, getCollectionsForProduct } from "@/lib/resourceCenterContent";
import ResourceCenterHome from "@/components/resource-center/ResourceCenterHome";
import ResourceCenterLayout from "@/components/resource-center/ResourceCenterLayout";
import NotFound from "@/pages/not-found";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";

// M22-A / M22 PAR §9 — "what are you trying to do?" intent cards. Wave-1-
// specific by design (real Academy slugs are stable/product-level, but the
// article/path slugs below are specific Wave 1 content) — each entry
// resolves against real loaded data and is simply omitted if its target
// doesn't exist yet, so this never produces a dead link. As later waves add
// more journeys, this list is expected to grow/change; it isn't meant to be
// a permanently-fixed set.
function buildIntentCards({ product, articles, learningPaths }) {
  const findArticle = (slug) => articles.find((a) => a.slug === slug);
  const hasPath = (slug) => learningPaths.some((p) => p.slug === slug);
  const academyHref = (academySlug) => `${product.basePath}/${academySlug}`;

  const candidates = [
    { slug: "improve-deliverability", label: "Improve deliverability", href: academyHref("deliverability"), when: true },
    { slug: "start-cold-email", label: "Start cold email", href: `${product.basePath}/paths/getting-started`, when: hasPath("getting-started") },
    { slug: "verify-a-domain", label: "Verify a domain", href: (() => { const a = findArticle("verify-your-sending-domain"); return a ? `${product.basePath}/${a.academy.slug}/${a.slug}` : null; })(), when: !!findArticle("verify-your-sending-domain") },
    { slug: "write-better-emails", label: "Write better emails", href: academyHref("cold-email"), when: true },
    { slug: "learn-repmail", label: "Learn RepMail", href: (() => { const a = findArticle("where-repmail-fits-in-your-workflow"); return a ? `${product.basePath}/${a.academy.slug}/${a.slug}` : null; })(), when: !!findArticle("where-repmail-fits-in-your-workflow") },
  ];

  return candidates.filter((c) => c.when && c.href);
}

export default function ResourceCenterHomePage() {
  const [, params] = useRoute("/:product/learn");
  const product = useResourceCenterProduct(params?.product);
  const articles = product ? getArticlesForProduct(params.product) : [];
  const learningPaths = product ? getLearningPathsForProduct(params.product) : [];
  const collections = product ? getCollectionsForProduct(params.product) : [];

  // Search (dialog + Cmd/Ctrl+K) now lives in ResourceCenterLayout, so it's
  // available on every Resource Center page, not just this one (M23-A).

  if (!product) return <NotFound />;

  const academyArticleCounts = Object.fromEntries(
    product.academies.map((a) => [a.slug, articles.filter((art) => art.academy.slug === a.slug).length])
  );

  // Template Library, Glossary, and Comparisons are their own later roadmap
  // phases (PAR §13 Phases 7/10) — no curated-resource links until those
  // pages actually exist. An empty array here means the section simply
  // doesn't render (ResourceCenterHome is conditional per module), not a
  // dead link to a page that returns 404 today.
  const curatedResources = [];
  const intents = buildIntentCards({ product, articles, learningPaths });

  return (
    <ResourceCenterLayout product={product}>
      <ResourceCenterHome
        product={product}
        intents={intents}
        featuredArticles={articles.filter((a) => a.featured)}
        learningPaths={learningPaths}
        collections={collections}
        toolsAvailable={false}
        academyArticleCounts={academyArticleCounts}
        curatedResources={curatedResources}
        recentArticles={[...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 5)}
      />
    </ResourceCenterLayout>
  );
}
