// M21-C — the article page template. Pure presentational (accepts data as
// props) — no data-fetching wired up yet, that's M21-D's MDX pipeline. Built
// and reviewed against placeholder content now (PAR §13 Phase 3), same
// component real content renders through later.
import { Link } from "wouter";
import ContentAsset from "./ContentAsset";
import AuthorByline from "./AuthorByline";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import { Badge } from "@/components/ui/badge";

// article: the parsed+validated frontmatter (shared/content/schema.js) plus
// `bodyHtml` (rendered markdown body) and `academy` (resolved taxonomy entry).
// relatedArticles (M21-F, PAR §8): generated via shared/content/relatedContent.js,
// passed in already-computed rather than computed inside this presentational
// component — keeps the scoring logic in one pure, independently-tested place.
export default function ArticleTemplate({ article, author, product, readingTimeMinutes, relatedArticles = [] }) {
  if (!article) return null;

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    academy: article.academy,
    academyHref: `${product.basePath}/${article.academy.slug}`,
    articleTitle: article.title,
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10" data-testid="article-template">
      <ResourceCenterBreadcrumb items={breadcrumbItems} />

      <header className="mt-6 mb-8">
        {article.tags?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{article.title}</h1>
        <p className="mb-5 text-lg text-muted-foreground">{article.description}</p>
        <AuthorByline
          author={author}
          basePath={product.basePath}
          publishedAt={article.publishedAt}
          readingTimeMinutes={readingTimeMinutes}
        />
      </header>

      {/* prose: @tailwindcss/typography, already installed, previously unused
          anywhere in this codebase (PAR §2/§8).
          bodyHtml is build-time output from markdown files committed to this
          repo (never user input, never runtime-submitted content — same
          trust boundary as the rest of the source tree), so
          dangerouslySetInnerHTML is the standard, low-risk SSG pattern here,
          not a shortcut around a real XSS concern. M21-D (the markdown/MDX
          pipeline) owns the actual parser choice and decides whether that
          stays HTML-string output or switches to a React-element renderer
          (e.g. react-markdown) — this prop shape is deliberately the
          simplest thing that could work for M21-C's template-only scope,
          not a locked-in decision. */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none"
        data-testid="article-body"
        dangerouslySetInnerHTML={{ __html: article.bodyHtml ?? "" }}
      />

      {article.assets?.length > 0 && (
        <section className="mt-10 space-y-4" aria-label="Practical resources" data-testid="article-assets">
          <h2 className="text-lg font-semibold">Resources in this guide</h2>
          {article.assets.map((asset, i) => (
            <ContentAsset key={i} asset={asset} />
          ))}
        </section>
      )}

      {/* Restrained — 2-3 items, not an aggressive full-width grid (PAR §8) */}
      {relatedArticles.length > 0 && (
        <section className="mt-10 border-t pt-6" aria-label="Related guides" data-testid="article-related">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Related guides</h2>
          <ul className="space-y-2">
            {relatedArticles.map((related) => (
              <li key={related.slug}>
                <Link
                  href={`${product.basePath}/${related.academy.slug}/${related.slug}`}
                  className="text-sm text-primary hover:underline"
                  data-testid={`link-related-${related.slug}`}
                >
                  {related.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
