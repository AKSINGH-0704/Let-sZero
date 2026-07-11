// M21-D — wires AcademyHubTemplate (M21-C) to a real Academy + its real
// articles, via the :academy route param. M21-E adds BreadcrumbList JSON-LD.
import { useRoute } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import { getAcademyBySlug, PRODUCTS } from "@shared/content/taxonomy.js";
import { buildBreadcrumbListJsonLd } from "@shared/content/jsonLd.js";
import { buildBreadcrumbItems } from "@/components/resource-center/ResourceCenterBreadcrumb";
import AcademyHubTemplate from "@/components/resource-center/AcademyHubTemplate";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function AcademyHubPage() {
  const [, params] = useRoute("/repmail/learn/:academy");
  const product = PRODUCTS.repmail;
  const academy = getAcademyBySlug("repmail", params?.academy);

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

  if (!academy) return <NotFound />;

  const articles = getArticlesForProduct("repmail").filter((a) => a.academy.slug === academy.slug);

  return <AcademyHubTemplate product={product} academy={academy} articles={articles} />;
}
