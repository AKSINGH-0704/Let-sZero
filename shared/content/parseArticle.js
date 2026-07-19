// M21-D — pure, platform-agnostic article parsing (no `fs`, safe to import
// in both Node build scripts and the browser client bundle). Given a raw
// markdown+frontmatter string, does the validation/parsing/reading-time
// work; the *how do I get the raw file contents* part differs by platform
// (Node's `fs.readdir`/`readFile` for the build-time prerender pipeline,
// Vite's `import.meta.glob` for the client SPA router) and lives in each
// platform's own loader instead of being force-unified here.
import yaml from "js-yaml";
import { marked } from "marked";
import { validateArticle } from "./schema.js";
import { PRODUCTS } from "./taxonomy.js";

const WORDS_PER_MINUTE = 225;

// This file's whole contract is "pure and platform-agnostic — safe in both a
// Node build script and the browser bundle". gray-matter silently broke that:
// it calls Buffer.from() on every parse (node_modules/gray-matter/lib/to-file.js),
// and `Buffer` does not exist in a browser. Vite bundles it without complaint, so
// the failure only appeared at runtime, after hydration, as
// "[parseArticle] skipping invalid article ...: Buffer is not defined" — once per
// article, catching in the handler below and yielding ZERO articles client-side
// while the Node-rendered prerender output stayed perfect. Every Academy, path,
// collection and All Guides page therefore rendered its empty state in the real
// UI, and article pages 404'd, on a build whose served HTML was correct.
//
// So frontmatter is split here directly and parsed with js-yaml (pure JS, no
// Node globals — it was already in the tree as gray-matter's own YAML engine).
// No behavioural difference for this content: every file is LF, BOM-less, and
// opens with a `---` fence.
const FRONTMATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

/**
 * Splits a raw markdown file into { data, content }, the same shape
 * gray-matter returned. A file with no frontmatter fence is not an error —
 * it is simply all body, which validateArticle() then rejects for missing
 * required fields, exactly as before.
 */
export function splitFrontmatter(raw) {
  const match = FRONTMATTER.exec(raw);
  if (!match) return { data: {}, content: raw.replace(/^﻿/, "") };
  const data = yaml.load(match[1]) ?? {};
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("frontmatter must be a YAML mapping");
  }
  return { data, content: match[2] ?? "" };
}

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
    const { data, content: body } = splitFrontmatter(rawFileContents);
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
