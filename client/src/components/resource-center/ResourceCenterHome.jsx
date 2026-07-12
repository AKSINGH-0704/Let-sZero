// M21-C, rebuilt M23-B, elevated M23-II-B — the Resource Center homepage as a
// premium editorial destination. Module order is preserved from the M22 PAR §9
// decision (search/hero -> intents -> featured -> paths -> collections ->
// academies -> curated -> recent) and asserted by test. M23-II adds emotional
// impact: a two-column hero with an illustration and a gradient headline, a
// tinted "start here" intent band, an asymmetric featured layout (one lead
// story plus supporting guides, so the page stops looking like a wall of
// identical cards), and a closing conversion band.
import { Link } from "wouter";
import { Search, ArrowRight, Sparkles, Compass, Layers } from "lucide-react";
import AcademyCard from "./AcademyCard";
import ContentMeta from "./ContentMeta";
import RcHeroArt from "./RcHeroArt";
import { academyTheme, academyAccentStyle } from "./academyTheme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useResourceCenterSearch } from "./ResourceCenterLayout";

function Section({ title, eyebrow, subtitle, children, testId, tinted = false }) {
  return (
    <section className={tinted ? "mb-14 rounded-2xl border border-border bg-muted/40 p-6 sm:p-8" : "mb-16"} data-testid={testId}>
      <div className="mb-5">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-balance">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// Compact themed guide card (Academy accent + metadata scent).
function GuideCard({ article, product, testIdPrefix }) {
  const { Icon } = academyTheme(article.academy.slug);
  return (
    <Link
      href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
      data-testid={`${testIdPrefix}-${article.slug}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={academyAccentStyle(article.academy.slug)}
    >
      <Card className="h-full border-card-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-[color:var(--academy-accent)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
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

// The lead story: a large, horizontal editorial card that anchors the page and
// breaks the grid rhythm.
function FeaturedLead({ article, product }) {
  const { Icon } = academyTheme(article.academy.slug);
  return (
    <Link
      href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
      data-testid={`link-featured-${article.slug}`}
      className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={academyAccentStyle(article.academy.slug)}
    >
      <Card className="overflow-hidden border-card-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
        <div className="grid gap-0 sm:grid-cols-[1.4fr_1fr]">
          <CardContent className="flex flex-col justify-center p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--academy-accent)]/10 text-[color:var(--academy-accent)]" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <ContentMeta article={article} showAcademy />
            </div>
            <h3 className="mb-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">{article.title}</h3>
            <p className="text-muted-foreground">{article.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--academy-accent)]">
              Read the guide
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </span>
          </CardContent>
          <div className="relative hidden items-center justify-center bg-[color:var(--academy-accent)]/10 sm:flex">
            <div className="absolute inset-0 rc-dot-grid opacity-60" aria-hidden="true" />
            <Icon className="relative h-20 w-20 text-[color:var(--academy-accent)]/40" aria-hidden="true" strokeWidth={1.25} />
          </div>
        </div>
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
  const [lead, ...restFeatured] = featuredArticles;

  return (
    <div data-testid="resource-center-home">
      {/* Hero — the emotional entry point. */}
      <header className="relative rc-glow overflow-hidden">
        <div className="absolute inset-0 rc-dot-grid opacity-[0.5]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="rc-rise">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {product.resourceCenterName}
            </p>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
              Everything it takes to <span className="rc-gradient-text">reach the inbox</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Deep, practical guides on cold email deliverability and outreach, written by the team
              that builds {product.name}&rsquo;s sending infrastructure. No fluff, no gated PDFs.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openSearch}
                data-testid="button-open-resource-center-search"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-muted-foreground shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-sm">Search guides and setup steps</span>
                <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
              </button>
              {primaryPath && (
                <Button asChild size="lg" className="gap-2">
                  <Link href={`${product.basePath}/paths/${primaryPath.slug}`} data-testid="link-hero-getting-started">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    Start here
                  </Link>
                </Button>
              )}
            </div>

            {totalGuides > 0 && (
              <p className="mt-5 text-sm text-muted-foreground">
                {totalGuides} in-depth guides across {liveAcademyCount} {liveAcademyCount === 1 ? "topic" : "topics"}, free and updated as the craft changes.
              </p>
            )}
          </div>

          <div className="rc-rise hidden md:block">
            <RcHeroArt className="w-full" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-8">
        {/* Intents — a distinct "start from your goal" band. */}
        {intents.length > 0 && (
          <div className="-mt-2 mb-16">
            <Section title="What are you here to do?" eyebrow="Start here" testId="section-intents" tinted>
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
                      <Card className="h-full border-card-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
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
          </div>
        )}

        {/* Featured — one lead story, then supporting guides. */}
        {featuredArticles.length > 0 && (
          <Section eyebrow="Editors&rsquo; picks" title="Featured guides" testId="section-featured">
            {lead && <div className="mb-4"><FeaturedLead article={lead} product={product} /></div>}
            {restFeatured.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {restFeatured.map((article) => (
                  <GuideCard key={article.slug} article={article} product={product} testIdPrefix="link-featured" />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Getting Started path(s) */}
        {learningPaths.length > 0 && (
          <Section
            eyebrow="Guided"
            title="Start from zero"
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
                  <Card className="h-full border-card-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
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
                  <Card className="h-full border-card-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
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

        {toolsAvailable && (
          <Section title="Tools" testId="section-tools">
            <Link href={`${product.basePath}/tools`} data-testid="link-tools" className="block rounded-xl">
              <Card className="transition-colors hover:border-primary"><CardContent className="p-4">Free tools</CardContent></Card>
            </Link>
          </Section>
        )}

        {/* Academy discovery */}
        <Section eyebrow="Browse" title="Explore by topic" subtitle="Each Academy goes deep on one part of getting email delivered." testId="section-academies">
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
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {recentArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
                  data-testid={`link-recent-${article.slug}`}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        {/* Closing conversion band — the natural bridge from learning to the product. */}
        <aside className="relative mt-4 overflow-hidden rounded-2xl border border-border p-8 text-center sm:p-12" data-testid="section-cta">
          <div className="absolute inset-0 rc-dot-grid opacity-40" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Ready to put this into practice?
            </h2>
            <p className="mt-3 text-muted-foreground">
              {product.name} handles the sending infrastructure, authentication, and deliverability so you
              can focus on the message. Start sending on a verified domain in minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/products/repmail" data-testid="link-cta-product">Explore {product.name}</Link>
              </Button>
              {primaryPath && (
                <Button asChild size="lg" variant="outline">
                  <Link href={`${product.basePath}/paths/${primaryPath.slug}`} data-testid="link-cta-getting-started">Start the guide</Link>
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
