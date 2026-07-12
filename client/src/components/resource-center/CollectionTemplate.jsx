// M22-A — the first real template for collectionSchema (M21-A schema, never
// rendered until now). Unordered thematic bundle — unlike LearningPathTemplate,
// a Collection deliberately doesn't number its articles, since it isn't a
// sequence (PAR-M21 §6: "thematic groupings that can cross pillars").
import { Link } from "wouter";
import { Clock } from "lucide-react";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ArticleCard({ article, href }) {
  return (
    <Link href={href} data-testid={`link-collection-article-${article.slug}`}>
      <Card className="h-full transition-colors hover:border-primary cursor-pointer">
        <CardContent className="p-4">
          <h3 className="mb-1 font-medium">{article.title}</h3>
          <p className="mb-2 text-sm text-muted-foreground">{article.description}</p>
          {typeof article.readingTimeMinutes === "number" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {article.readingTimeMinutes} min
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// articles: already-resolved real article objects (resolveArticleSlugs in
// resourceCenterContent.js silently drops any slug that doesn't resolve).
export default function CollectionTemplate({ product, collection, articles }) {
  if (!collection) return null;

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    articleTitle: collection.name,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10" data-testid="collection-template">
      <ResourceCenterBreadcrumb items={breadcrumbItems} />
      <div className="mt-6 mb-8">
        <Badge variant="secondary" className="mb-3">Collection</Badge>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{collection.name}</h1>
        <p className="text-lg text-muted-foreground">{collection.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="collection-article-list">
        {articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">This collection doesn't have any published articles yet.</p>
        ) : (
          articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
