// M21-C, rebuilt M23-D — the Academy hub: a curated index with the Academy's
// own visual identity (icon + accent header), consistent guide rows with
// metadata scent, and a category rail that marks empty/unbuilt sections as
// "Soon" rather than dead links. `liveSlugs` (Academies with content) is
// passed by the page so the rail is honest.
import ResourceCenterBreadcrumb, { buildBreadcrumbItems } from "./ResourceCenterBreadcrumb";
import CategoryRail from "./CategoryRail";
import GuideRow from "./GuideRow";
import { academyTheme, academyAccentStyle } from "./academyTheme";

export default function AcademyHubTemplate({ product, academy, articles, liveSlugs }) {
  if (!academy) return null;

  const { Icon } = academyTheme(academy.slug);
  const accentStyle = academyAccentStyle(academy.slug);

  const breadcrumbItems = buildBreadcrumbItems({
    resourceCenterName: product.resourceCenterName,
    resourceCenterHref: product.basePath,
    academy,
    academyHref: `${product.basePath}/${academy.slug}`,
  });

  const list = articles ?? [];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[220px_1fr]" data-testid="academy-hub-template" style={accentStyle}>
      <aside className="md:pt-2">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topics</p>
        <CategoryRail
          product={product}
          academies={product.academies}
          templateLibrary={product.templateLibrary}
          activeSlug={academy.slug}
          liveSlugs={liveSlugs}
        />
      </aside>

      <main>
        <ResourceCenterBreadcrumb items={breadcrumbItems} />
        <header className="mt-6 mb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--academy-accent)]/10 text-[color:var(--academy-accent)]" aria-hidden="true">
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--academy-accent)]">Academy</span>
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{academy.name}</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{academy.description}</p>
          {list.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">{list.length} guide{list.length === 1 ? "" : "s"}</p>
          )}
        </header>

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center" data-testid="academy-empty">
            <p className="font-medium">No guides here yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&rsquo;re actively building out this Academy. Check back soon.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border" data-testid="academy-article-list">
            {list.map((article) => (
              <GuideRow key={article.slug} article={article} product={product} testId={`link-article-${article.slug}`} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
