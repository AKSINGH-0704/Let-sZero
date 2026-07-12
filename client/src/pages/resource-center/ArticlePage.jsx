// M21-D — wires ArticleTemplate (M21-C) to a real article via the
// :product/:academy/:slug route params. M21-E adds BlogPosting +
// BreadcrumbList JSON-LD, the latter built from the exact same
// buildBreadcrumbItems() output the visual breadcrumb renders — one
// source of truth, not two hand-kept copies that could drift. M21-F adds
// related-content generation. M21-I: :product is resolved dynamically.
import { useRoute } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import { buildArticleJsonLd, buildBreadcrumbListJsonLd, buildFaqJsonLd } from "@shared/content/jsonLd.js";
import { buildBreadcrumbItems } from "@/components/resource-center/ResourceCenterBreadcrumb";
import { getRelatedArticles } from "@shared/content/relatedContent.js";
import ArticleTemplate from "@/components/resource-center/ArticleTemplate";
import ResourceCenterLayout from "@/components/resource-center/ResourceCenterLayout";
import NotFound from "@/pages/not-found";
import useJsonLd from "@/hooks/useJsonLd";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";

const CANONICAL_ORIGIN = "https://www.letszero.in";

export default function ArticlePage() {
  const [, params] = useRoute("/:product/learn/:academy/:slug");
  const product = useResourceCenterProduct(params?.product);
  const allArticles = product ? getArticlesForProduct(params.product) : [];
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
        // FAQPage — only present when the article has genuine, visible Q&A
        // (buildFaqJsonLd returns null otherwise, filtered out below).
        buildFaqJsonLd(article.faqs),
      ].filter(Boolean)
    : null;
  useJsonLd(jsonLdGraph);

  if (!product || !article) return <NotFound />;

  const relatedArticles = getRelatedArticles(article, allArticles, { limit: 3 });

  return (
    <ResourceCenterLayout product={product}>
      <ArticleTemplate
        article={article}
        author={article.author}
        product={product}
        readingTimeMinutes={article.readingTimeMinutes}
        relatedArticles={relatedArticles}
      />
    </ResourceCenterLayout>
  );
}
