// M21-C, rebuilt M23-D, completed M28 — the persistent Academy navigation rail.
// Carries each Academy's icon + accent, matching the rest of the Resource
// Center's identity.
//
// M23-D rendered empty Academies and the unbuilt Template Library as muted
// "Soon" rows, which closed the dead links they used to be. M28 goes further
// and omits them: a row that can never be clicked is a placeholder, and the
// rail is navigation, so anything in it should navigate. Same rule the homepage
// now applies to Academy cards — if it has no content, it does not appear.
import { Link } from "wouter";
import { academyTheme, academyAccentStyle } from "./academyTheme";
import { cn } from "@/lib/utils";

export default function CategoryRail({ product, academies, activeSlug, liveSlugs }) {
  // If liveSlugs isn't provided, treat every Academy as live (backward-safe).
  const isLive = (slug) => (liveSlugs ? liveSlugs.has(slug) : true);
  const items = academies.filter((a) => isLive(a.slug)).map((a) => ({ slug: a.slug, name: a.name }));

  return (
    <nav aria-label="Resource Center categories" className="space-y-0.5">
      {items.map((item) => {
        const { Icon } = academyTheme(item.slug);
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
