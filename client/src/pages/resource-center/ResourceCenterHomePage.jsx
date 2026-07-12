// M21-D — wires ResourceCenterHome (M21-C template) to real content via
// the client-side loader. No fabricated placeholder articles: every module
// that has no real data yet simply doesn't render (each is conditional in
// the template itself), so this honestly reflects that the Resource Center
// has zero published content today, not a demo full of fake guides.
// M21-F wires the real search command palette in place of the M21-D no-op.
// M21-I: :product is resolved dynamically from the route (was hardcoded to
// PRODUCTS.repmail) — a second LetsZero product needs a PRODUCTS entry and
// content, not a new page component or route path.
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import ResourceCenterHome from "@/components/resource-center/ResourceCenterHome";
import ResourceCenterSearch from "@/components/resource-center/ResourceCenterSearch";
import NotFound from "@/pages/not-found";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";

export default function ResourceCenterHomePage() {
  const [, params] = useRoute("/:product/learn");
  const product = useResourceCenterProduct(params?.product);
  const articles = product ? getArticlesForProduct(params.product) : [];
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K — the "keyboard-accessible search" PAR §5/§8 calls for
  // explicitly, not just a clickable button. Registered unconditionally
  // (hooks can't be called conditionally) — a no-op if product is null,
  // since the dialog it would open never renders in that case either.
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  return (
    <>
      <ResourceCenterHome
        product={product}
        featuredArticles={articles.filter((a) => a.featured)}
        learningPaths={[]}
        collections={[]}
        toolsAvailable={false}
        academyArticleCounts={academyArticleCounts}
        curatedResources={curatedResources}
        recentArticles={[...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 5)}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <ResourceCenterSearch open={searchOpen} onOpenChange={setSearchOpen} articles={articles} product={product} />
    </>
  );
}
