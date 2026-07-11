// M21-D — Resource Center content loader, Node/build-time only (uses `fs`).
// Scans markdown files under content/{product}/{academy}/{slug}.md and
// content/{product}/authors/*.json on disk, delegating the actual
// parsing/validation to the platform-agnostic parseArticle.js so that logic
// isn't duplicated between this (used by the build-time prerender pipeline)
// and the client-side loader (used by the SPA router via Vite's
// import.meta.glob, which can't import this file — `fs` doesn't exist in
// the browser).
import { readFile, readdir } from "fs/promises";
import path from "path";
import { authorSchema } from "./schema.js";
import { PRODUCTS } from "./taxonomy.js";
import { parseArticle } from "./parseArticle.js";

/**
 * Loads and validates every author in content/{product}/authors/*.json.
 * Returns a Map keyed by author slug. An author file that fails validation
 * is skipped with a logged warning, not a hard failure.
 */
export async function loadAuthors(contentDir, productSlug, { log = console.warn } = {}) {
  const authorsDir = path.join(contentDir, productSlug, "authors");
  const authors = new Map();
  let files;
  try {
    files = await readdir(authorsDir);
  } catch {
    return authors; // no authors/ directory yet is not an error — zero authors is a valid, honest state
  }
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(await readFile(path.join(authorsDir, file), "utf-8"));
      const author = authorSchema.parse(raw);
      authors.set(author.slug, author);
    } catch (err) {
      log(`[content-loader] skipping invalid author file ${file}: ${err.message}`);
    }
  }
  return authors;
}

/**
 * Loads and validates every article markdown file for a product.
 */
export async function loadArticles(contentDir, productSlug, authors, { log = console.warn } = {}) {
  const product = PRODUCTS[productSlug];
  if (!product) return [];

  const productDir = path.join(contentDir, productSlug);
  const academySlugs = product.academies.map((a) => a.slug).concat(product.templateLibrary.slug);
  const articles = [];

  for (const academySlug of academySlugs) {
    const academyDir = path.join(productDir, academySlug);
    let files;
    try {
      files = await readdir(academyDir);
    } catch {
      continue; // no content in this academy yet — valid, not an error
    }
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(academyDir, file);
      const raw = await readFile(filePath, "utf-8");
      const article = parseArticle(raw, { productSlug, academySlug, authors, log, sourcePath: filePath });
      if (article) articles.push(article);
    }
  }

  return articles;
}
