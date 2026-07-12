// M22-A, rebuilt M23-D — a Collection: an unordered thematic bundle (unlike
// the sequential learning path, deliberately not numbered), now with an
// editorial header and the shared GuideRow so it matches every other list.
import { Layers } from "lucide-react";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import GuideRow from "./GuideRow";
import { Badge } from "@/components/ui/badge";

export default function CollectionTemplate({ product, collection, articles }) {
  if (!collection) return null;
  const list = articles ?? [];

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    articleTitle: collection.name,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="collection-template">
      <ResourceCenterBreadcrumb items={breadcrumbItems} />
      <header className="mt-6 mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
            <Layers className="h-6 w-6" />
          </span>
          <Badge variant="secondary">Collection</Badge>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{collection.name}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{collection.description}</p>
        {list.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">{list.length} guide{list.length === 1 ? "" : "s"}</p>
        )}
      </header>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">This collection doesn&rsquo;t have any published guides yet.</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border" data-testid="collection-article-list">
          {list.map((article) => (
            <GuideRow key={article.slug} article={article} product={product} showAcademy testId={`link-collection-article-${article.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
