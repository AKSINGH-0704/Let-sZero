// M21-D — wires AuthorPageTemplate (M21-C) to a real author via the
// :author route param.
import { useRoute } from "wouter";
import { getArticlesForProduct, getAuthorsForProduct } from "@/lib/resourceCenterContent";
import { PRODUCTS } from "@shared/content/taxonomy.js";
import AuthorPageTemplate from "@/components/resource-center/AuthorPageTemplate";
import NotFound from "@/pages/not-found";

export default function AuthorPage() {
  const [, params] = useRoute("/repmail/learn/authors/:author");
  const product = PRODUCTS.repmail;
  const author = getAuthorsForProduct("repmail").get(params?.author);

  if (!author) return <NotFound />;

  const articles = getArticlesForProduct("repmail").filter((a) => a.author.slug === author.slug);

  return <AuthorPageTemplate author={author} articles={articles} product={product} />;
}
