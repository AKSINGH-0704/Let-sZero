// M21-C, rebuilt M23-B — the Resource Center homepage as an editorial
// destination, not an admin list. Module order is preserved from the M22
// PAR §9 decision (search/hero → intents → featured → paths → collections →
// academies → curated → recent) and asserted by test; what changed is the
// treatment: a real hero, an intent module with icons + descriptions +
// per-goal accent, Academy-themed featured/topic cards, metadata scent on
// every guide, and deliberate "coming soon" empty Academies.
import { Link } from "wouter";
import { Search, ArrowRight, Sparkles, Compass, Layers } from "lucide-react";
import AcademyCard from "./AcademyCard";
import ContentMeta from "./ContentMeta";
import { academyTheme, academyAccentStyle } from "./academyTheme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useResourceCenterSearch } from "./ResourceCenterLayout";

function Section({ title, eyebrow, subtitle, children, testId }) {
  return (
    <section className="mb-14" data-testid={testId}>
      <div className="mb-5">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-balance">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// A guide card with its Academy's accent + metadata scent, reused by the
// Featured module (and available to others). Whole card is one link — no
// nested interactives.
function GuideCard({ article, product, testIdPrefix }) {
  const { Icon } = academyTheme(article.academy.slug);
  return (
    <Link
      href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
      data-testid={`${testIdPrefix}-${article.slug}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={academyAccentStyle(article.academy.slug)}
    >
      <Card className="h-full border-border transition-all hover:-translate-y-0.5 hover:border-[color:var(--academy-accent)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--academy-accent)]/10 text-[color:var(--academy-accent)]" aria-hidden="true">
              <Icon className="h-4 w-4" />
            </span>
            <ContentMeta article={article} />
          </div>
          <h3 className="mb-1.5 font-semibold leading-snug tracking-tight">{article.title}</h3>
          <p className="text-sm text-muted-foreground">{article.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ResourceCenterHome({
  product,
  intents = [],
  featuredArticles = [],
  learningPaths = [],
  collections = [],
  toolsAvailable = false,
  academyArticleCounts = {},
  curatedResources = [],
  recentArticles = [],
}) {
  const openSearch = useResourceCenterSearch();
  const totalGuides = Object.values(academyArticleCounts).reduce((sum, n) => sum + (n || 0), 0);
  const liveAcademyCount = Object.values(academyArticleCounts).filter((n) => n > 0).length;
  const primaryPath = learningPaths[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14" data-testid="resource-center-home">
      {/* Hero — a confident statement of what this place is, with search as
          the primary action. */}
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {product.resourceCenterName}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Get your cold email into the inbox.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Practical, no-fluff guides on deliverability and cold email — from the team
          that builds {product.name}&rsquo;s sending infrastructure.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={openSearch}
            data-testid="button-open-resource-center-search"
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-muted-foreground shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-md"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-sm">Search guides, topics, and setup steps…</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
          </button>
          {primaryPath && (
            <Button asChild size="lg" className="gap-2">
              <Link href={`${product.basePath}/paths/${primaryPath.slug}`} data-testid="link-hero-getting-started">
                <Compass className="h-4 w-4" aria-hidden="true" />
                {primaryPath.name}
              </Link>
            </Button>
          )}
        </div>

        {totalGuides > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {totalGuides} guides across {liveAcademyCount} {liveAcademyCount === 1 ? "topic" : "topics"} · free, no signup required
          </p>
        )}
      </header>

      {/* Intents — start from a goal, not a table of contents. */}
      {intents.length > 0 && (
        <Section title="What are you trying to do?" testId="section-intents">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {intents.map((intent) => {
              const IntentIcon = intent.Icon ?? Compass;
              return (
                <Link
                  key={intent.slug}
                  href={intent.href}
                  data-testid={`link-intent-${intent.slug}`}
                  className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full border-border transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
                    <CardContent className="flex h-full items-start gap-3 p-5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        <IntentIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-semibold tracking-tight">{intent.label}</h3>
                        {intent.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{intent.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Featured */}
      {featuredArticles.length > 0 && (
        <Section eyebrow="Editor's picks" title="Featured guides" testId="section-featured">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article) => (
              <GuideCard key={article.slug} article={article} product={product} testIdPrefix="link-featured" />
            ))}
          </div>
        </Section>
      )}

      {/* Learning paths ("Getting Started") */}
      {learningPaths.length > 0 && (
        <Section
          eyebrow="Guided"
          title="Start here"
          subtitle="A sequenced path from setup to your first delivered campaign."
          testId="section-learning-paths"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {learningPaths.map((path) => (
              <Link
                key={path.slug}
                href={`${product.basePath}/paths/${path.slug}`}
                data-testid={`card-learning-path-${path.slug}`}
                className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full border-border transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                      <Compass className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <h3 className="font-semibold tracking-tight">{path.name}</h3>
                        {path.steps && <span className="text-xs text-muted-foreground">{path.steps.length} steps</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{path.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <Section eyebrow="Curated" title="Collections" subtitle="Themed bundles that cut across topics." testId="section-collections">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`${product.basePath}/collections/${c.slug}`}
                data-testid={`card-collection-${c.slug}`}
                className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full border-border transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
                  <CardContent className="flex items-start gap-4 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent" aria-hidden="true">
                      <Layers className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <h3 className="font-semibold tracking-tight">{c.name}</h3>
                        {c.articleSlugs && <span className="text-xs text-muted-foreground">{c.articleSlugs.length} guides</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Tools (still gated off until real) */}
      {toolsAvailable && (
        <Section title="Tools" testId="section-tools">
          <Link href={`${product.basePath}/tools`} data-testid="link-tools" className="block rounded-xl">
            <Card className="transition-colors hover:border-primary"><CardContent className="p-4">Free tools</CardContent></Card>
          </Link>
        </Section>
      )}

      {/* Academy discovery — the primary long-term navigation, now themed and
          honest about what's launched vs. coming soon. */}
      <Section eyebrow="Browse" title="Explore by topic" testId="section-academies">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {product.academies.map((academy) => (
            <AcademyCard
              key={academy.slug}
              academy={academy}
              href={`${product.basePath}/${academy.slug}`}
              articleCount={academyArticleCounts[academy.slug] ?? 0}
            />
          ))}
        </div>
      </Section>

      {/* Curated resources (Template Library / Glossary / Comparisons — still
          gated until those surfaces exist). */}
      {curatedResources.length > 0 && (
        <Section title="More resources" testId="section-curated-resources">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {curatedResources.map((r) => (
              <Link key={r.href} href={r.href} data-testid={`link-curated-${r.slug}`} className="block rounded-xl">
                <Card className="h-full transition-colors hover:border-primary"><CardContent className="p-4 font-medium">{r.name}</CardContent></Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Recently published */}
      {recentArticles.length > 0 && (
        <Section title="Recently published" testId="section-recent">
          <div className="divide-y divide-border rounded-xl border border-border">
            {recentArticles.map((article) => (
              <Link
                key={article.slug}
                href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
                data-testid={`link-recent-${article.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={academyAccentStyle(article.academy.slug)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{article.title}</p>
                  <ContentMeta article={article} showAcademy className="mt-0.5" />
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
