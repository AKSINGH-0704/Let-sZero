// M21-D — wires AcademyHubTemplate (M21-C) to a real Academy + its real
// articles, via the :product/:academy route params. M21-E adds
// BreadcrumbList JSON-LD. M21-I: :product is resolved dynamically (was
// hardcoded to PRODUCTS.repmail) — a second product needs a PRODUCTS
// entry and content, not a new page component.
import { useRoute } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import { getAcademyBySlug } from "@shared/content/taxonomy.js";
import { buildBreadcrumbListJsonLd } from "@shared/content/jsonLd.js";
import { buildBreadcrumbItems } from "@/components/resource-center/ResourceCenterBreadcrumb";
import AcademyHubTemplate from "@/components/resource-center/AcademyHubTemplate";
import ResourceCenterLayout from "@/components/resource-center/ResourceCenterLayout";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function AcademyHubPage() {
  const [, params] = useRoute("/:product/learn/:academy");
  const product = useResourceCenterProduct(params?.product);
  const academy = product ? getAcademyBySlug(params.product, params.academy) : null;

  const jsonLd = academy
    ? buildBreadcrumbListJsonLd(
        buildBreadcrumbItems({
          resourceCenterName: product.resourceCenterName,
          resourceCenterHref: product.basePath,
          academy,
          academyHref: `${product.basePath}/${academy.slug}`,
        }),
        { canonicalOrigin: CANONICAL_ORIGIN }
      )
    : null;
  useJsonLd(jsonLd);

  if (!product || !academy) return <NotFound />;

  const articles = getArticlesForProduct(params.product).filter((a) => a.academy.slug === academy.slug);

  return (
    <ResourceCenterLayout product={product}>
      <AcademyHubTemplate product={product} academy={academy} articles={articles} />
    </ResourceCenterLayout>
  );
}
