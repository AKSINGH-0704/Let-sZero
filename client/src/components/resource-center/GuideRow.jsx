// M23-D — one consistent article list item, reused across the Academy hub,
// author page, learning path, and collection so guides look the same
// everywhere (metadata scent + the article's Academy accent). Whole row is a
// single link — no nested interactives. An optional leading `index` renders
// the numbered-step affordance the learning path needs.
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import ContentMeta from "./ContentMeta";
import { academyTheme, academyAccentStyle } from "./academyTheme";

export default function GuideRow({ article, product, index, showAcademy = false, testId }) {
  const { Icon } = academyTheme(article.academy.slug);
  return (
    <Link
      href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
      data-testid={testId ?? `link-guide-${article.slug}`}
      className="group flex items-center gap-4 px-4 py-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      style={academyAccentStyle(article.academy.slug)}
    >
      {typeof index === "number" ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--academy-accent)]/10 text-sm font-semibold text-[color:var(--academy-accent)]">
          {index + 1}
        </span>
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--academy-accent)]/10 text-[color:var(--academy-accent)]" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-medium leading-snug tracking-tight group-hover:text-[color:var(--academy-accent)]">{article.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{article.description}</p>
        <ContentMeta article={article} showAcademy={showAcademy} className="mt-1.5" />
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
    </Link>
  );
}
