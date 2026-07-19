// M23-A — the persistent chrome that turns a set of routes into a
// *destination*. Every Resource Center page wraps its success content in
// this (not App.jsx-level, deliberately: script/prerender.js renders each
// page component directly, so chrome placed only in the router would be
// absent from prerendered HTML — a real SEO/first-paint regression. Putting
// it in the page-rendered tree keeps it in the static output).
//
// Owns the on-site search (previously homepage-only — now reachable from
// every page and via Cmd/Ctrl+K anywhere in the Resource Center) and a slim
// editorial header/footer. The header nav is computed from real content
// (only Academies that actually have guides, and Getting Started only if the
// path exists) so it never renders a dead link.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { GraduationCap, Search, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ResourceCenterSearch from "./ResourceCenterSearch";
import {
  getArticlesForProduct,
  getLearningPathsForProduct,
  getCollectionsForProduct,
} from "@/lib/resourceCenterContent";

// Lets any descendant (e.g. a prominent homepage search trigger) open the
// single, layout-owned search dialog rather than instantiating its own —
// one dialog, one Cmd/Ctrl+K binding, per Resource Center page.
const SearchContext = createContext(() => {});
export function useResourceCenterSearch() {
  return useContext(SearchContext);
}

export default function ResourceCenterLayout({ product, children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  // Cmd/Ctrl+K from anywhere inside the Resource Center — not just the
  // homepage, where it used to live. Effect never runs during SSR, so this
  // is prerender-safe.
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const articles = useMemo(() => getArticlesForProduct(product.slug), [product.slug]);

  // Only Academies that actually have published guides appear in the header
  // nav — in editorial order, never a dead "0 guides" link.
  const liveAcademies = useMemo(() => {
    const withContent = new Set(articles.map((a) => a.academy.slug));
    return product.academies.filter((a) => withContent.has(a.slug));
  }, [articles, product.academies]);

  // M28-B — collections and paths are searchable content types too, so the
  // layout (which owns the single search dialog) loads them alongside articles
  // rather than the dialog reaching for the loader itself.
  const learningPaths = useMemo(() => getLearningPathsForProduct(product.slug), [product.slug]);
  const collections = useMemo(() => getCollectionsForProduct(product.slug), [product.slug]);

  const gettingStarted = useMemo(
    () => learningPaths.find((p) => p.slug === "getting-started") ?? null,
    [learningPaths]
  );

  const isActive = (href) => location === href;

  return (
    <SearchContext.Provider value={() => setSearchOpen(true)}>
    {/* rc-editorial (M23-II) scopes the premium editorial palette to the
        Resource Center only — the app-wide M19 tokens are untouched. */}
    <div className="rc-editorial flex min-h-screen flex-col bg-background text-foreground" data-testid="resource-center-layout">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link
            href={product.basePath}
            className="group flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="link-rc-home"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {product.name}{" "}
              {/* The qualifier is the first thing worth dropping on a narrow
                  bar: the mark plus product name still identifies the page. */}
              <span className="hidden text-muted-foreground sm:inline">Resource Center</span>
            </span>
          </Link>

          {/* M30 — the academy nav needs ~600px once every Academy is live, so at
              the old `md` breakpoint (768px) the bar laid out to 1018px and
              body{overflow-x:hidden} silently ate the last 250px: the search
              button and the product link were unreachable between roughly 768
              and 1020px. Two changes make that structurally impossible rather
              than tuned-for-today: the nav only appears at `lg`, and it is
              `min-w-0 flex-1 overflow-x-auto` so it yields space instead of
              pushing its siblings out when more Academies are added. */}
          <nav
            className="ml-2 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Resource Center sections"
          >
            {gettingStarted && (
              <Link
                href={`${product.basePath}/paths/${gettingStarted.slug}`}
                className={navLinkClass(isActive(`${product.basePath}/paths/${gettingStarted.slug}`))}
                data-testid="link-nav-getting-started"
              >
                Getting Started
              </Link>
            )}
            {liveAcademies.map((academy) => (
              <Link
                key={academy.slug}
                href={`${product.basePath}/${academy.slug}`}
                className={navLinkClass(isActive(`${product.basePath}/${academy.slug}`))}
                data-testid={`link-nav-academy-${academy.slug}`}
              >
                {academy.name.replace(/ & .*/, "")}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setSearchOpen(true)}
              data-testid="button-rc-header-search"
              aria-label="Search the Resource Center"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
              {/* RC-1 — aria-hidden so the shortcut hint is not counted as part
                  of the button's visible label. Without it the visible text
                  reads "Search ⌘K" while the accessible name is "Search the
                  Resource Center", which fails WCAG 2.5.3 Label in Name
                  (Lighthouse label-content-name-mismatch). The hint is
                  decoration; the key binding is announced by nothing and needs
                  no accessible representation. */}
              <kbd aria-hidden="true" className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground lg:inline">
                ⌘K
              </kbd>
            </Button>
            <Link
              href="/products/repmail"
              className="hidden items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
              data-testid="link-rc-back-to-product"
            >
              {product.name} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{product.resourceCenterName}</span>
          </div>
          {/* M31-D — these were 20px-tall hit targets, below the 24px WCAG 2.5.8
              minimum. This is the same defect fixed in the marketing footer this
              milestone, and it appears on all 105 Resource Center pages, so it
              is corrected here despite the Resource Center otherwise being
              frozen: it is link padding, not architecture or content.
              Inline prose links and the breadcrumb trail are deliberately not
              changed, because 2.5.8 exempts targets whose size is constrained by
              the line-height of surrounding text. */}
          <nav className="flex flex-wrap items-center gap-x-5" aria-label="Resource Center footer">
            {[
              { href: product.basePath, label: "All guides" },
              { href: "/products/repmail", label: "Product" },
              { href: "/pricing", label: "Pricing" },
              { href: "/repmail/changelog", label: "Changelog" },
              { href: "/contact", label: "Contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-[24px] items-center rounded py-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>

      <ResourceCenterSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        articles={articles}
        collections={collections}
        learningPaths={learningPaths}
        product={product}
      />
    </div>
    </SearchContext.Provider>
  );
}

function navLinkClass(active) {
  return [
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}
