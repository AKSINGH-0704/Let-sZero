// M28 — the All Guides index: one flat, browsable view of everything published,
// grouped by Academy. This is the destination behind the homepage's "View all
// guides" action, and the surface that makes every article reachable from the
// homepage in one hop rather than only via its Academy hub or a direct URL.
//
// Entirely data-driven: it reads the same loader every other Resource Center
// page reads, so a new markdown file appears here with no code change. No new
// content model, no new routing pattern, no new design language — it reuses
// ResourceCenterLayout, GuideRow, the Academy theme, and the same ordering the
// homepage uses.
import { useRoute, Link } from "wouter";
import { getArticlesForProduct } from "@/lib/resourceCenterContent";
import { groupGuidesByAcademy, academyCountNoun } from "@shared/content/ordering.js";
import { academyTheme, academyAccentStyle } from "@/components/resource-center/academyTheme";
import ResourceCenterLayout from "@/components/resource-center/ResourceCenterLayout";
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "@/components/resource-center/ResourceCenterBreadcrumb";
import GuideRow from "@/components/resource-center/GuideRow";
import NotFound from "@/pages/not-found";
import useResourceCenterProduct from "@/hooks/useResourceCenterProduct";
import useJsonLd from "@/hooks/useJsonLd";

export default function AllGuidesPage() {
  const [, params] = useRoute("/:product/learn/guides");
  const product = useResourceCenterProduct(params?.product);
  const articles = product ? getArticlesForProduct(params.product) : [];
  const groups = product ? groupGuidesByAcademy(product, articles) : [];

  useJsonLd(
    product
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `All guides | ${product.resourceCenterName}`,
          url: `https://www.letszero.in${product.basePath}/guides`,
          hasPart: articles.map((a) => ({
            "@type": "BlogPosting",
            headline: a.title,
            url: `https://www.letszero.in${product.basePath}/${a.academy.slug}/${a.slug}`,
          })),
        }
      : null
  );

  if (!product) return <NotFound />;

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    articleTitle: "All guides",
  });

  return (
    <ResourceCenterLayout product={product}>
      <div className="mx-auto max-w-5xl px-4 py-10" data-testid="all-guides-page">
        <ResourceCenterBreadcrumb items={breadcrumbItems} />

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">All guides</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every guide, definition, and comparison in the {product.resourceCenterName}, grouped by
            topic. {articles.length} in total.
          </p>
        </header>

        {/* Jump nav — on a page this long the reader needs to get to a topic
            without scrolling past four others. */}
        {groups.length > 1 && (
          <nav aria-label="Jump to a topic" className="mb-10 flex flex-wrap gap-2" data-testid="nav-guides-jump">
            {groups.map(({ academy, articles: list }) => (
              <a
                key={academy.slug}
                href={`#${academy.slug}`}
                data-testid={`link-jump-${academy.slug}`}
                style={academyAccentStyle(academy.slug)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-[color:var(--academy-accent)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {academy.name}
                {/* RC-1 — `opacity-70` on top of already-muted text dropped this
                    count below the 4.5:1 AA threshold (axe color-contrast, 3
                    nodes on this page). The pill's own muted-foreground passes
                    on its own, and a count does not need to be dimmer than the
                    label it belongs to. */}
                <span className="text-xs tabular-nums">{list.length}</span>
              </a>
            ))}
          </nav>
        )}

        <div className="space-y-12">
          {groups.map(({ academy, articles: list }) => {
            const { Icon } = academyTheme(academy.slug);
            return (
              <section
                key={academy.slug}
                id={academy.slug}
                data-testid={`section-guides-${academy.slug}`}
                style={academyAccentStyle(academy.slug)}
                className="scroll-mt-20"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--academy-accent)]/10 text-[color:var(--academy-accent)]"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold tracking-tight">
                      <Link
                        href={`${product.basePath}/${academy.slug}`}
                        data-testid={`link-guides-academy-${academy.slug}`}
                        className="rounded outline-none hover:text-[color:var(--academy-accent)] focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {academy.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">{academyCountNoun(academy.slug, list.length)}</p>
                  </div>
                </div>

                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {list.map((article) => (
                    <GuideRow
                      key={article.slug}
                      article={article}
                      product={product}
                      testId={`link-all-guides-${article.slug}`}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </ResourceCenterLayout>
  );
}
