// M21-C — the Academy hub page: a curated index, not a single article (PAR
// §5/§6 — this is what makes "Academies" a distinct content type/template,
// not just a label on a regular article).
import { Link } from "wouter";
import { Clock } from "lucide-react";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import CategoryRail from "./CategoryRail";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ArticleListItem({ article, href }) {
  return (
    <Link href={href} data-testid={`link-article-${article.slug}`}>
      <Card className="transition-colors hover:border-primary cursor-pointer">
        <CardContent className="flex items-start justify-between gap-4 p-4">
          <div>
            <h3 className="mb-1 font-medium">{article.title}</h3>
            <p className="text-sm text-muted-foreground">{article.description}</p>
          </div>
          {typeof article.readingTimeMinutes === "number" && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {article.readingTimeMinutes} min
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AcademyHubTemplate({ product, academy, articles }) {
  if (!academy) return null;

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    academy,
    academyHref: `${product.basePath}/${academy.slug}`,
  });

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[220px_1fr]" data-testid="academy-hub-template">
      <aside>
        <CategoryRail
          product={product}
          academies={product.academies}
          templateLibrary={product.templateLibrary}
          activeSlug={academy.slug}
        />
      </aside>

      <main>
        <ResourceCenterBreadcrumb items={breadcrumbItems} />
        <div className="mt-6 mb-8">
          <Badge variant="secondary" className="mb-3">Academy</Badge>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{academy.name}</h1>
          <p className="text-lg text-muted-foreground">{academy.description}</p>
        </div>

        <div className="space-y-3" data-testid="academy-article-list">
          {(articles ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No guides published yet.</p>
          ) : (
            articles.map((article) => (
              <ArticleListItem
                key={article.slug}
                article={article}
                href={`${product.basePath}/${academy.slug}/${article.slug}`}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
