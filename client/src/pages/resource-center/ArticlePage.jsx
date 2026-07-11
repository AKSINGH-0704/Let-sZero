// M21-D — wires ArticleTemplate (M21-C) to a real article via the
// :academy/:slug route params.
import { useRoute } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import { PRODUCTS } from "@shared/content/taxonomy.js";
import ArticleTemplate from "@/components/resource-center/ArticleTemplate";
import NotFound from "@/pages/not-found";

export default function ArticlePage() {
  const [, params] = useRoute("/repmail/learn/:academy/:slug");
  const product = PRODUCTS.repmail;
  const article = getArticlesForProduct("repmail").find(
    (a) => a.academy.slug === params?.academy && a.slug === params?.slug
  );

  if (!article) return <NotFound />;

  return <ArticleTemplate article={article} author={article.author} product={product} readingTimeMinutes={article.readingTimeMinutes} />;
}
