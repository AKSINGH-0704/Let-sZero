// M22-A — wires LearningPathTemplate to a real path + its resolved articles,
// via the :product/:path route params. Same :product-resolution pattern
// established in M21-I (useResourceCenterProduct, honest 404 for an
// unregistered product or unknown path slug).
import { useRoute } from "wouter";
import { getArticlesForProduct, getLearningPathsForProduct, resolveArticleSlugs } from "@/lib/resourceCenterContent";
import { buildBreadcrumbListJsonLd } from "@shared/content/jsonLd.js";
import { buildBreadcrumbItems } from "@/components/resource-center/ResourceCenterBreadcrumb";
import LearningPathTemplate from "@/components/resource-center/LearningPathTemplate";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function LearningPathPage() {
  const [, params] = useRoute("/:product/learn/paths/:path");
  const product = useResourceCenterProduct(params?.product);
  const paths = product ? getLearningPathsForProduct(params.product) : [];
  const path = paths.find((p) => p.slug === params?.path) ?? null;

  const jsonLd = path
    ? buildBreadcrumbListJsonLd(
        buildBreadcrumbItems({
          resourceCenterName: product.resourceCenterName,
          resourceCenterHref: product.basePath,
          articleTitle: path.name,
        }),
        { canonicalOrigin: CANONICAL_ORIGIN }
      )
    : null;
  useJsonLd(jsonLd);

  if (!product || !path) return <NotFound />;

  const articles = getArticlesForProduct(params.product);
  const steps = resolveArticleSlugs(path.steps, articles);

  return <LearningPathTemplate product={product} path={path} steps={steps} />;
}
