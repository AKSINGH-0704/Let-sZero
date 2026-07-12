// M21-C, rebuilt M23-D — the persistent Academy navigation rail. Now carries
// each Academy's icon + accent (matching the rest of the Resource Center's
// identity) and, given the set of Academies that actually have content,
// renders empty ones (and the not-yet-built Template Library) as muted
// "Soon" rows instead of live links to empty pages — closing what were
// latent dead links.
import { Link } from "wouter";
import { academyTheme, academyAccentStyle } from "./academyTheme";
import { cn } from "@/lib/utils";

export default function CategoryRail({ product, academies, templateLibrary, activeSlug, liveSlugs }) {
  // If liveSlugs isn't provided, treat every Academy as live (backward-safe).
  const isLive = (slug) => (liveSlugs ? liveSlugs.has(slug) : true);
  const items = [
    ...academies.map((a) => ({ slug: a.slug, name: a.name, live: isLive(a.slug) })),
    // The Template Library has no page yet — always "Soon" until it ships.
    { slug: templateLibrary.slug, name: templateLibrary.name, live: false },
  ];

  return (
    <nav aria-label="Resource Center categories" className="space-y-0.5">
      {items.map((item) => {
        const { Icon } = academyTheme(item.slug);
        if (!item.live) {
          return (
            <div
              key={item.slug}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
              data-testid={`rail-soon-${item.slug}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">Soon</span>
            </div>
          );
        }
        const active = item.slug === activeSlug;
        return (
          <Link
            key={item.slug}
            href={`${product.basePath}/${item.slug}`}
            data-testid={`link-rail-${item.slug}`}
            aria-current={active ? "page" : undefined}
            style={academyAccentStyle(item.slug)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-[color:var(--academy-accent)]/10 font-medium text-[color:var(--academy-accent)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
