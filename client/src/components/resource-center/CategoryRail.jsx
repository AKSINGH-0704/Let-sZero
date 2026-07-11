// M21-C — the persistent Academy navigation rail (PAR §8: "a small, curated
// category rail, not a mega-menu"). Deliberately short and static — the
// seven pillars from shared/content/taxonomy.js, not a dynamically-grown
// list, so it stays scannable as content volume grows.
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function CategoryRail({ product, academies, templateLibrary, activeSlug }) {
  const items = [
    ...academies.map((a) => ({ slug: a.slug, name: a.name })),
    { slug: templateLibrary.slug, name: templateLibrary.name },
  ];

  return (
    <nav aria-label="Resource Center categories" className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.slug}
          href={`${product.basePath}/${item.slug}`}
          data-testid={`link-rail-${item.slug}`}
          className={cn(
            "block rounded-md px-3 py-2 text-sm transition-colors",
            item.slug === activeSlug
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
