// M21-C, rebuilt M23-D, elevated M23-II-C — the Academy hub. Previously a
// header plus a list, which felt sparse. Now a real landing page: a branded
// header, why-this-matters framing, learning outcomes, the curriculum, and
// the related RepMail capabilities. Empty Academies get an aspirational
// "on the way" panel with the planned syllabus, never a bare empty line.
import { Link } from "wouter";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import CategoryRail from "./CategoryRail";
import GuideRow from "./GuideRow";
import { academyTheme, academyAccentStyle } from "./academyTheme";
import { academyEditorial } from "./academyEditorial";
import { Button } from "@/components/ui/button";

export default function AcademyHubTemplate({ product, academy, articles, liveSlugs }) {
  if (!academy) return null;

  const { Icon } = academyTheme(academy.slug);
  const accentStyle = academyAccentStyle(academy.slug);
  const editorial = academyEditorial(academy.slug);
  const list = articles ?? [];

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    academy,
    academyHref: `${product.basePath}/${academy.slug}`,
  });

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[220px_1fr]" data-testid="academy-hub-template" style={accentStyle}>
      <aside className="md:pt-2">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topics</p>
        <CategoryRail
          product={product}
          academies={product.academies}
          activeSlug={academy.slug}
          liveSlugs={liveSlugs}
        />
      </aside>

      <main>
        <ResourceCenterBreadcrumb items={breadcrumbItems} />

        {/* Branded header */}
        <header className="relative mt-5 overflow-hidden rounded-2xl border border-card-border bg-card p-6 sm:p-8">
          <div className="absolute inset-0 rc-dot-grid opacity-50" aria-hidden="true" />
          <Icon className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-[color:var(--academy-accent)]/10" aria-hidden="true" strokeWidth={1} />
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--academy-accent)]/12 text-[color:var(--academy-accent)]" aria-hidden="true">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--academy-accent)]">Academy</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{academy.name}</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{academy.description}</p>
            {list.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">{list.length} guide{list.length === 1 ? "" : "s"} and growing</p>
            )}
          </div>
        </header>

        {list.length === 0 ? (
          /* Aspirational "on the way" panel */
          <section className="mt-6 rounded-2xl border border-dashed border-[color:var(--academy-accent)]/40 p-8" data-testid="academy-empty">
            <div className="flex items-center gap-2 text-[color:var(--academy-accent)]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-wide">On the way</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">This Academy is being written now.</h2>
            <p className="mt-1 max-w-xl text-muted-foreground">
              We publish in depth rather than in volume, so this one is still in the works. Here is what it will cover.
            </p>
            {editorial.plannedTopics?.length > 0 && (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {editorial.plannedTopics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--academy-accent)]" aria-hidden="true" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link href={product.basePath} data-testid="link-empty-browse">Browse published guides</Link></Button>
              <Button asChild variant="outline"><Link href={`${product.basePath}/paths/getting-started`}>Start with the basics</Link></Button>
            </div>
          </section>
        ) : (
          <>
            {/* Why it matters */}
            {editorial.whyItMatters && (
              <section className="mt-6 rounded-2xl border-l-4 border-[color:var(--academy-accent)] bg-[color:var(--academy-accent)]/5 p-5 sm:p-6" data-testid="academy-why">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--academy-accent)]">Why this matters</p>
                <p className="text-[15px] leading-relaxed">{editorial.whyItMatters}</p>
              </section>
            )}

            {/* Learning outcomes */}
            {editorial.outcomes?.length > 0 && (
              <section className="mt-8" data-testid="academy-outcomes">
                <h2 className="mb-4 text-lg font-semibold tracking-tight">What you&rsquo;ll be able to do</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {editorial.outcomes.map((o, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-card-border bg-card p-4">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--academy-accent)]/12 text-[color:var(--academy-accent)]" aria-hidden="true">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm">{o}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Curriculum */}
            <section className="mt-10" data-testid="academy-curriculum">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">The guides</h2>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-card-border bg-card" data-testid="academy-article-list">
                {list.map((article) => (
                  <GuideRow key={article.slug} article={article} product={product} testId={`link-article-${article.slug}`} />
                ))}
              </div>
            </section>

            {/* Related product capabilities */}
            {editorial.capabilities?.length > 0 && (
              <section className="mt-10 rounded-2xl border border-card-border bg-muted/40 p-6 sm:p-7" data-testid="academy-capabilities">
                <div className="sm:flex sm:items-start sm:justify-between sm:gap-8">
                  <div className="max-w-md">
                    <h2 className="text-lg font-semibold tracking-tight">How {product.name} helps here</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The guides teach the craft. These are the parts {product.name} handles for you.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link href="/products/repmail" data-testid="link-academy-product">Explore {product.name} <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" /></Link>
                    </Button>
                  </div>
                  <ul className="mt-5 grid flex-1 gap-2 sm:mt-0">
                    {editorial.capabilities.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--academy-accent)]" aria-hidden="true" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
