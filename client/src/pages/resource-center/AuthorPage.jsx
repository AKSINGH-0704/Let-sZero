// M21-D — wires AuthorPageTemplate (M21-C) to a real author via the
// :author route param. M21-E adds Person JSON-LD — the structured-data
// counterpart to the "no fictional personas" rule (a real Person entity
// pointing at a real page and a real body of work, not just a byline
// string an editor could quietly fabricate).
import { useRoute } from "wouter";
import { getArticlesForProduct, getAuthorsForProduct } from "@/lib/resourceCenterContent";
import { PRODUCTS } from "@shared/content/taxonomy.js";
import { buildPersonJsonLd } from "@shared/content/jsonLd.js";
import AuthorPageTemplate from "@/components/resource-center/AuthorPageTemplate";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function AuthorPage() {
  const [, params] = useRoute("/repmail/learn/authors/:author");
  const product = PRODUCTS.repmail;
  const author = getAuthorsForProduct("repmail").get(params?.author);

  const canonicalUrl = author ? `${CANONICAL_ORIGIN}${product.basePath}/authors/${author.slug}` : null;
  useJsonLd(author ? buildPersonJsonLd(author, { canonicalUrl }) : null);

  if (!author) return <NotFound />;

  const articles = getArticlesForProduct("repmail").filter((a) => a.author.slug === author.slug);

  return <AuthorPageTemplate author={author} articles={articles} product={product} />;
}
