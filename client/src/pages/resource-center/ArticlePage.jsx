// M21-D — wires ArticleTemplate (M21-C) to a real article via the
// :academy/:slug route params. M21-E adds BlogPosting + BreadcrumbList
// JSON-LD, the latter built from the exact same buildBreadcrumbItems()
// output the visual breadcrumb renders — one source of truth, not two
// hand-kept copies that could drift. M21-F adds related-content generation.
import { useRoute } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import { PRODUCTS } from "@shared/content/taxonomy.js";
import { buildArticleJsonLd, buildBreadcrumbListJsonLd } from "@shared/content/jsonLd.js";
import { buildBreadcrumbItems } from "@/components/resource-center/ResourceCenterBreadcrumb";
import { getRelatedArticles } from "@shared/content/relatedContent.js";
import ArticleTemplate from "@/components/resource-center/ArticleTemplate";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function ArticlePage() {
  const [, params] = useRoute("/repmail/learn/:academy/:slug");
  const product = PRODUCTS.repmail;
  const allArticles = getArticlesForProduct("repmail");
  const article = allArticles.find(
    (a) => a.academy.slug === params?.academy && a.slug === params?.slug
  );

  const jsonLdGraph = article
    ? [
        buildArticleJsonLd(article, {
          canonicalUrl: `${CANONICAL_ORIGIN}${product.basePath}/${article.academy.slug}/${article.slug}`,
          authorUrl: `${CANONICAL_ORIGIN}${product.basePath}/authors/${article.author.slug}`,
        }),
        buildBreadcrumbListJsonLd(
          buildBreadcrumbItems({
            resourceCenterName: product.resourceCenterName,
            resourceCenterHref: product.basePath,
            academy: article.academy,
            academyHref: `${product.basePath}/${article.academy.slug}`,
            articleTitle: article.title,
          }),
          { canonicalOrigin: CANONICAL_ORIGIN }
        ),
      ]
    : null;
  useJsonLd(jsonLdGraph);

  if (!article) return <NotFound />;

  const relatedArticles = getRelatedArticles(article, allArticles, { limit: 3 });

  return (
    <ArticleTemplate
      article={article}
      author={article.author}
      product={product}
      readingTimeMinutes={article.readingTimeMinutes}
      relatedArticles={relatedArticles}
    />
  );
}
