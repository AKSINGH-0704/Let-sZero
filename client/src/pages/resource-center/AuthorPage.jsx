// M21-D — wires AuthorPageTemplate (M21-C) to a real author via the
// :product/:author route params. M21-E adds Person JSON-LD — the
// structured-data counterpart to the "no fictional personas" rule (a real
// Person entity pointing at a real page and a real body of work, not just
// a byline string an editor could quietly fabricate). M21-I: :product is
// resolved dynamically.
import { useRoute } from "wouter";
import { getArticlesForProduct, getAuthorsForProduct } from "@/lib/resourceCenterContent";
import { buildPersonJsonLd } from "@shared/content/jsonLd.js";
import AuthorPageTemplate from "@/components/resource-center/AuthorPageTemplate";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function AuthorPage() {
  const [, params] = useRoute("/:product/learn/authors/:author");
  const product = useResourceCenterProduct(params?.product);
  const author = product ? getAuthorsForProduct(params.product).get(params.author) : null;

  const canonicalUrl = author ? `${CANONICAL_ORIGIN}${product.basePath}/authors/${author.slug}` : null;
  useJsonLd(author ? buildPersonJsonLd(author, { canonicalUrl }) : null);

  if (!product || !author) return <NotFound />;

  const articles = getArticlesForProduct(params.product).filter((a) => a.author.slug === author.slug);

  return <AuthorPageTemplate author={author} articles={articles} product={product} />;
}
