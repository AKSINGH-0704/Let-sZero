// M21-C, rebuilt M23-C — the article reading experience. Presentational
// (accepts already-parsed/validated data as props). What changed in M23-C:
// an editorial header with the Academy's identity + metadata scent, the
// optional educational blocks (key takeaways, prerequisites, common
// mistakes, FAQ) rendered in designed positions, a premium "Continue
// learning" hand-off (the schema `nextStep`, replacing the old in-body
// markdown section), and tuned long-form typography. The engineering
// contract is unchanged — same props, same bodyHtml pipeline.
import { Link } from "wouter";
import ContentAsset from "./ContentAsset";
import ContentMeta from "./ContentMeta";
import RcFigure from "./RcFigures";
import AuthorByline from "./AuthorByline";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import { academyTheme, academyAccentStyle } from "./academyTheme";
import {
  KeyTakeaways,
  Prerequisites,
  CommonMistakes,
  ArticleFaq,
  ContinueLearning,
  PathNavigation,
} from "./ArticleBlocks";
import { Badge } from "@/components/ui/badge";

export default function ArticleTemplate({ article, author, product, readingTimeMinutes, relatedArticles = [], pathNavigation = null }) {
  if (!article) return null;

  const { Icon } = academyTheme(article.academy.slug);
  const accentStyle = academyAccentStyle(article.academy.slug);

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    academy: article.academy,
    academyHref: `${product.basePath}/${article.academy.slug}`,
    articleTitle: article.title,
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10" data-testid="article-template" style={accentStyle}>
      <ResourceCenterBreadcrumb items={breadcrumbItems} />

      <header className="mt-6 mb-8">
        {/* Academy identity + metadata scent */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={`${product.basePath}/${article.academy.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--academy-accent)]/10 px-2.5 py-1 text-xs font-medium text-[color:var(--academy-accent)] hover:bg-[color:var(--academy-accent)]/15"
            data-testid="link-article-academy"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {article.academy.name}
          </Link>
          <ContentMeta article={{ ...article, readingTimeMinutes }} />
        </div>

        <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">{article.title}</h1>
        <p className="mb-6 text-lg text-muted-foreground">{article.description}</p>
        <AuthorByline
          author={author}
          basePath={product.basePath}
          publishedAt={article.publishedAt}
          readingTimeMinutes={readingTimeMinutes}
        />
      </header>

      <KeyTakeaways items={article.keyTakeaways} />
      <Prerequisites items={article.prerequisites} />
      {article.heroDiagram && <RcFigure name={article.heroDiagram} />}

      {/* prose: @tailwindcss/typography, tuned for comfortable long-form
          reading. bodyHtml is build-time output from repo-committed markdown
          (never user input — same trust boundary as source), so
          dangerouslySetInnerHTML is the standard SSG pattern here, not an XSS
          shortcut. */}
      {/* M30 — measure. `max-w-none` removed the typography plugin's own line
          length, so body copy ran the full 768px column, about 95 characters
          per line against a 50-75 comfortable range. Constraining the block
          elements to 68ch rather than narrowing the article keeps headings,
          tables and figures full width while bringing running text back to a
          readable measure. */}
      <div
        className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight prose-a:font-medium prose-a:text-primary hover:prose-a:underline prose-li:my-1 prose-p:max-w-[68ch] prose-ul:max-w-[68ch] prose-ol:max-w-[68ch] prose-blockquote:max-w-[68ch] lg:prose-lg lg:prose-p:max-w-[68ch] lg:prose-ul:max-w-[68ch] lg:prose-ol:max-w-[68ch]"
        data-testid="article-body"
        dangerouslySetInnerHTML={{ __html: article.bodyHtml ?? "" }}
      />

      {article.assets?.length > 0 && (
        <section className="mt-10 space-y-4" aria-label="Practical resources" data-testid="article-assets">
          <h2 className="text-lg font-semibold tracking-tight">Resources in this guide</h2>
          {article.assets.map((asset, i) => (
            <ContentAsset key={i} asset={asset} />
          ))}
        </section>
      )}

      <CommonMistakes items={article.commonMistakes} />

      {article.tags?.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-1.5" data-testid="article-tags">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      )}

      <ArticleFaq faqs={article.faqs} />

      {/* The premium hand-off — the M23 "Continue Learning" experience that
          replaces the old in-body "## Next step" markdown. */}
      <ContinueLearning nextStep={article.nextStep} accentStyle={accentStyle} />

      {/* M28 — sequential navigation when this article is a step in a learning
          path. Derived from the path's step order, not authored per article. */}
      <PathNavigation navigation={pathNavigation} product={product} />

      {/* Algorithmic related guides (shared-tag scoring) — complements, doesn't
          replace, the editorial next step above. Restrained: 2-3 items. */}
      {relatedArticles.length > 0 && (
        <section className="mt-12 border-t border-border pt-6" aria-label="Related guides" data-testid="article-related">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">More on this topic</h2>
          <ul className="space-y-3">
            {relatedArticles.map((related) => (
              <li key={related.slug}>
                <Link
                  href={`${product.basePath}/${related.academy.slug}/${related.slug}`}
                  className="group flex items-center justify-between gap-3 text-sm"
                  data-testid={`link-related-${related.slug}`}
                >
                  <span className="font-medium text-foreground group-hover:text-primary">{related.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{related.readingTimeMinutes} min</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
