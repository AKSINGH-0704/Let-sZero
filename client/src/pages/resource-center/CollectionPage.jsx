// M22-A — wires CollectionTemplate to a real collection + its resolved
// articles, via the :product/:collection route params. Same pattern as
// LearningPathPage.jsx.
import { useRoute } from "wouter";
import { getArticlesForProduct, getCollectionsForProduct, resolveArticleSlugs } from "@/lib/resourceCenterContent";
import { buildBreadcrumbListJsonLd } from "@shared/content/jsonLd.js";
import { buildBreadcrumbItems } from "@/components/resource-center/ResourceCenterBreadcrumb";
import CollectionTemplate from "@/components/resource-center/CollectionTemplate";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function CollectionPage() {
  const [, params] = useRoute("/:product/learn/collections/:collection");
  const product = useResourceCenterProduct(params?.product);
  const collections = product ? getCollectionsForProduct(params.product) : [];
  const collection = collections.find((c) => c.slug === params?.collection) ?? null;

  const jsonLd = collection
    ? buildBreadcrumbListJsonLd(
        buildBreadcrumbItems({
          resourceCenterName: product.resourceCenterName,
          resourceCenterHref: product.basePath,
          articleTitle: collection.name,
        }),
        { canonicalOrigin: CANONICAL_ORIGIN }
      )
    : null;
  useJsonLd(jsonLd);

  if (!product || !collection) return <NotFound />;

  const articles = getArticlesForProduct(params.product);
  const resolvedArticles = resolveArticleSlugs(collection.articleSlugs, articles);

  return <CollectionTemplate product={product} collection={collection} articles={resolvedArticles} />;
}
