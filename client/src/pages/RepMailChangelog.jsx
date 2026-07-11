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
import { PRODUCTS } from "@shared/content/taxonomy.js";

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

export default function RepMailChangelog() {
  const product = PRODUCTS.repmail;
  const bodyHtml = shiftHeadingLevelsDown(marked.parse(RELEASE_NOTES_RAW));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="repmail-changelog">
      <header className="mb-8">
        <p className="mb-2 text-sm text-muted-foreground">{product.name} / Changelog</p>
        <h1 className="text-3xl font-bold tracking-tight">What&rsquo;s New in {product.name}</h1>
      </header>
      <div
        className="prose prose-neutral dark:prose-invert max-w-none"
        data-testid="changelog-body"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </div>
  );
}
