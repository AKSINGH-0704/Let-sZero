// M22-A, rebuilt M23-D — the Getting Started path. Numbered, sequential (the
// one thing that distinguishes a path from an unordered Collection), now with
// an editorial header, a total-time estimate, and the shared numbered GuideRow.
import { Clock, Compass } from "lucide-react";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import GuideRow from "./GuideRow";
import { Badge } from "@/components/ui/badge";

const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export default function LearningPathTemplate({ product, path, steps }) {
  if (!path) return null;
  const list = steps ?? [];
  const totalMinutes = list.reduce((sum, a) => sum + (a.readingTimeMinutes || 0), 0);

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    articleTitle: path.name,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="learning-path-template">
      <ResourceCenterBreadcrumb items={breadcrumbItems} />
      <header className="mt-6 mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <Compass className="h-6 w-6" />
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Getting Started</Badge>
            {path.level && <Badge variant="outline">{LEVEL_LABELS[path.level] ?? path.level}</Badge>}
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{path.name}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{path.description}</p>
        {list.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            {list.length} steps
            {totalMinutes > 0 && (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                about {totalMinutes} min total
              </>
            )}
          </p>
        )}
      </header>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">This path doesn&rsquo;t have any published steps yet.</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border" data-testid="learning-path-steps">
          {list.map((article, i) => (
            <GuideRow key={article.slug} article={article} product={product} index={i} showAcademy testId={`link-path-step-${article.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
