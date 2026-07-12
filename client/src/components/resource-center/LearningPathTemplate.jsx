// M22-A — the first real template for learningPathSchema (M21-A schema,
// never rendered until now). Numbered, sequential — the one thing that
// distinguishes a path from a Collection (CollectionTemplate.jsx), which is
// an unordered thematic bundle instead.
import { Link } from "wouter";
import { Clock } from "lucide-react";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LEVEL_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function StepItem({ index, article, href }) {
  return (
    <Link href={href} data-testid={`link-path-step-${article.slug}`}>
      <Card className="transition-colors hover:border-primary cursor-pointer">
        <CardContent className="flex items-start gap-4 p-4">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {index + 1}
          </span>
          <div className="flex-1">
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

// steps: already-resolved real article objects, in order (resolveArticleSlugs
// in resourceCenterContent.js silently drops any slug that doesn't resolve —
// this template only ever sees real, real articles, never a broken step).
export default function LearningPathTemplate({ product, path, steps }) {
  if (!path) return null;

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    articleTitle: path.name,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="learning-path-template">
      <ResourceCenterBreadcrumb items={breadcrumbItems} />
      <div className="mt-6 mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary">Getting Started</Badge>
          {path.level && <Badge variant="outline">{LEVEL_LABELS[path.level] ?? path.level}</Badge>}
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{path.name}</h1>
        <p className="text-lg text-muted-foreground">{path.description}</p>
      </div>

      <div className="space-y-3" data-testid="learning-path-steps">
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">This path doesn't have any published steps yet.</p>
        ) : (
          steps.map((article, i) => (
            <StepItem
              key={article.slug}
              index={i}
              article={article}
              href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
