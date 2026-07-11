// M21-D — pure, platform-agnostic article parsing (no `fs`, safe to import
// in both Node build scripts and the browser client bundle). Given a raw
// markdown+frontmatter string, does the validation/parsing/reading-time
// work; the *how do I get the raw file contents* part differs by platform
// (Node's `fs.readdir`/`readFile` for the build-time prerender pipeline,
// Vite's `import.meta.glob` for the client SPA router) and lives in each
// platform's own loader instead of being force-unified here.
import matter from "gray-matter";
import { marked } from "marked";
import { validateArticle } from "./schema.js";
import { PRODUCTS } from "./taxonomy.js";

const WORDS_PER_MINUTE = 225;

export function estimateReadingTimeMinutes(markdownBody) {
  const words = markdownBody.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Parses one raw markdown file's contents into a fully-resolved article
 * object (frontmatter validated, author resolved, academy resolved, body
 * rendered to HTML, reading time computed) — or returns null with a logged
 * reason if it's invalid, never throwing. One bad file is never fatal to
 * whatever's loading a batch of these.
 */
export function parseArticle(rawFileContents, { productSlug, academySlug, authors, log = console.warn, sourcePath = "(unknown file)" } = {}) {
  const product = PRODUCTS[productSlug];
  if (!product) {
    log(`[parseArticle] unknown product "${productSlug}" for ${sourcePath}`);
    return null;
  }

  try {
    const { data, content: body } = matter(rawFileContents);
    const frontmatter = validateArticle({ ...data, product: productSlug, academy: academySlug });

    const author = authors.get(frontmatter.authorSlug);
    if (!author) {
      throw new Error(`authorSlug "${frontmatter.authorSlug}" has no matching registered author — every article needs a real author (PAR §9)`);
    }

    const academy = product.academies.find((a) => a.slug === academySlug) ?? product.templateLibrary;

    return {
      ...frontmatter,
      academy,
      author,
      bodyHtml: marked.parse(body),
      readingTimeMinutes: estimateReadingTimeMinutes(body),
    };
  } catch (err) {
    log(`[parseArticle] skipping invalid article ${sourcePath}: ${err.message}`);
    return null;
  }
}
