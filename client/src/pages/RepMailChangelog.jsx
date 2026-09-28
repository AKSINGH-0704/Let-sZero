// M21-G — publishes the existing RELEASE_NOTES.md at /repmail/changelog.
// Zero new writing (PAR §6/§13 Phase 11: "reuses RELEASE_NOTES.md verbatim")
// — this is real, substantive, already-published engineering content, not
// a fabricated placeholder, so unlike the still-empty Resource Center
// Academy pages it's genuinely worth prerendering and indexing now (see
// script/prerender-routes.js).
//
// Reads the repo-root RELEASE_NOTES.md via Vite's import.meta.glob (a
// relative path, not the @shared alias — glob patterns aren't guaranteed
// to resolve through path aliases the same way normal imports are, the
// same reasoning already documented in resourceCenterContent.js).
import { marked } from "marked";
import { Link } from "wouter";
import { PRODUCTS } from "@shared/content/taxonomy.js";
import CookiePreferencesLink from "@/components/consent/CookiePreferencesLink";

const releaseNotesModules = import.meta.glob("../../../RELEASE_NOTES.md", { eager: true, query: "?raw", import: "default" });
const RELEASE_NOTES_RAW = Object.values(releaseNotesModules)[0] ?? "";

// The page already has its own <h1> above; the markdown source's headings
// (starting with its own top-level "# RepMail — Release Notes") need to
// nest one level below it, not compete with it — two <h1>s on one page is
// a real semantic-HTML/SEO defect, not a style nitpick. Shifting h1-h5 down
// to h2-h6 via a regex on the rendered output is deliberately
// version-independent (not tied to marked's internal renderer/token API
// shape, which has changed across major versions).
export function shiftHeadingLevelsDown(html) {
  return html.replace(/<(\/?)h([1-5])(\s[^>]*)?>/g, (_match, closing, level, attrs = "") => `<${closing}h${Number(level) + 1}${closing ? "" : attrs}>`);
}

// The release notes carry 3- and 4-column tables whose longest words need
// ~322px, wider than the 288px column at a 320px viewport. The page's
// overflow-x clipping then cut the last column off instead of letting it
// scroll. Each table gets its own horizontal scroll region, focusable so a
// keyboard user can scroll it too (WCAG 2.1.1).
export function wrapTables(html) {
  return html
    .replace(/<table>/g, '<div class="changelog-table-scroll" role="region" aria-label="Table" tabindex="0"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

export default function RepMailChangelog() {
  const product = PRODUCTS.repmail;
  const bodyHtml = wrapTables(shiftHeadingLevelsDown(marked.parse(RELEASE_NOTES_RAW)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="repmail-changelog">
      <header className="mb-8">
        <p className="mb-2 text-sm text-muted-foreground">{product.name} / Changelog</p>
        <h1 className="text-3xl font-bold tracking-tight">What&rsquo;s New in {product.name}</h1>
      </header>
      <div
        className="prose prose-neutral dark:prose-invert max-w-none [&_.changelog-table-scroll]:overflow-x-auto"
        data-testid="changelog-body"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {/* M59 / CONSENT-002 — this is a public, prerendered, indexed page, and
          it rendered no footer at all. The ADS-005 guard proves every footer
          CARRIES the withdrawal control; it cannot see a public page that has
          no footer to inspect, so this gap was invisible to it. A visitor who
          has already decided and lands here had no in-page way to change their
          mind.

          Deliberately the smallest thing that closes it: the existing
          CookiePreferencesLink beside the two policies that already exist, in
          the same token-styled idiom and with the same 24px minimum hit target
          as the Resource Center footer (M31-D). No new component, no shared
          footer abstraction — every public footer in this codebase is styled
          independently, and one inlined here keeps this page inside the
          existing tree-walk guard rather than hiding it behind an indirection
          the guard cannot follow. */}
      <footer className="mt-12 border-t border-border pt-6">
        <nav
          className="flex flex-wrap items-center gap-x-5 text-sm text-muted-foreground"
          aria-label="Changelog footer"
        >
          {[
            { href: `${product.basePath}`, label: "Guides" },
            { href: "/repmail/privacy", label: "Privacy" },
            { href: "/repmail/terms", label: "Terms" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-[24px] items-center rounded py-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.label}
            </Link>
          ))}
          <CookiePreferencesLink className="inline-flex min-h-[24px] items-center rounded py-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring" />
        </nav>
      </footer>
    </div>
  );
}
