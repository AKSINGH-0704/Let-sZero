// M23-B — the one metadata treatment reused on every card and list row, so a
// reader can triage at a glance (the "no scent" finding). Content type +
// reading time, optionally the Academy. Deliberately quiet — small, muted,
// uppercase-tracked — so it informs without competing with the title.
//
// M28 adds an optional updated date for the homepage's Latest Guides cards.
// Only 12 of 60 articles carry updatedAt, so it renders only when genuinely
// present rather than falling back to publishedAt, which would present a first
// publication as a freshness signal it is not.
import { Clock } from "lucide-react";

const TYPE_LABELS = {
  "guide": "Guide",
  "tutorial": "Tutorial",
  "comparison": "Comparison",
  "template": "Template",
  "knowledge-base": "Knowledge base",
  "release-notes": "Release notes",
  "research": "Research",
  "product-education": "Product education",
  "engineering-article": "Engineering",
  "case-study": "Case study",
  "glossary-term": "Glossary",
};

export function contentTypeLabel(type) {
  return TYPE_LABELS[type] ?? "Guide";
}

// Renders as "12 Jul 2026" in every locale the site serves, avoiding both the
// ambiguous 07/12 ordering and a hydration mismatch from the server and client
// resolving different default locales.
function formatUpdated(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function ContentMeta({ article, showAcademy = false, showUpdated = false, className = "" }) {
  if (!article) return null;
  const updated = showUpdated && article.updatedAt ? formatUpdated(article.updatedAt) : null;
  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground ${className}`} data-testid="content-meta">
      <span className="font-medium uppercase tracking-wide text-[color:var(--academy-accent,hsl(var(--primary)))]">
        {contentTypeLabel(article.contentType)}
      </span>
      {typeof article.readingTimeMinutes === "number" && (
        <>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {article.readingTimeMinutes} min read
          </span>
        </>
      )}
      {showAcademy && article.academy?.name && (
        <>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span>{article.academy.name}</span>
        </>
      )}
      {updated && (
        <>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span data-testid="text-updated-at">Updated {updated}</span>
        </>
      )}
    </div>
  );
}
