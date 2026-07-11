// M21-D — wires AcademyHubTemplate (M21-C) to a real Academy + its real
// articles, via the :academy route param.
import { useRoute } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import { getAcademyBySlug, PRODUCTS } from "@shared/content/taxonomy.js";
import AcademyHubTemplate from "@/components/resource-center/AcademyHubTemplate";
import NotFound from "@/pages/not-found";

export default function AcademyHubPage() {
  const [, params] = useRoute("/repmail/learn/:academy");
  const product = PRODUCTS.repmail;
  const academy = getAcademyBySlug("repmail", params?.academy);

  if (!academy) return <NotFound />;

  const articles = getArticlesForProduct("repmail").filter((a) => a.academy.slug === academy.slug);

  return <AcademyHubTemplate product={product} academy={academy} articles={articles} />;
}
