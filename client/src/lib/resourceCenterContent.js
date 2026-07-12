// M21-D — client-side content loading for the Resource Center SPA routes.
// Uses Vite's own import.meta.glob (build-time file scanning built into the
// bundler already in use — no new build tooling) to pull in raw markdown
// and author JSON from client/src/content/, then parses them with the same
// platform-agnostic parseArticle() the Node build-time loader uses
// (shared/content/parseArticle.js — no fs import, safe in a browser bundle).
//
// This lives in client/src/content/ (inside Vite's root), not a repo-root
// content/ directory, specifically so import.meta.glob's root-relative
// pattern resolution stays simple and reliable — glob patterns are not
// guaranteed to resolve through Vite path aliases the way normal imports are.
import { authorSchema, learningPathSchema, collectionSchema } from "@shared/content/schema.js";
import { parseArticle } from "@shared/content/parseArticle.js";

const authorModules = import.meta.glob("/src/content/*/authors/*.json", { eager: true, query: "?raw", import: "default" });
const articleModules = import.meta.glob("/src/content/*/*/*.md", { eager: true, query: "?raw", import: "default" });
// M22-A — learningPathSchema/collectionSchema existed since M21-A with no
// loader ever reading real data for them (ResourceCenterHomePage.jsx hardcoded
// learningPaths={[]}/collections={[]}). Same glob-per-content-type pattern as
// authorModules/articleModules above, not a new mechanism.
const pathModules = import.meta.glob("/src/content/*/paths/*.json", { eager: true, query: "?raw", import: "default" });
const collectionModules = import.meta.glob("/src/content/*/collections/*.json", { eager: true, query: "?raw", import: "default" });

function parsePathSegments(globKey) {
  // "/src/content/{product}/{academyOrAuthors}/{file}"
  const parts = globKey.split("/");
  return { product: parts[3], segment: parts[4], file: parts[5] };
}

function loadAuthorsForProduct(productSlug) {
  const authors = new Map();
  for (const [key, raw] of Object.entries(authorModules)) {
    const { product, file } = parsePathSegments(key);
    if (product !== productSlug || !file.endsWith(".json")) continue;
    try {
      const author = authorSchema.parse(JSON.parse(raw));
      authors.set(author.slug, author);
    } catch (err) {
      console.warn(`[resource-center] skipping invalid author file ${key}: ${err.message}`);
    }
  }
  return authors;
}

/**
 * Returns every valid, published article for a product, resolved with real
 * author/academy objects. Client-bundle equivalent of shared/content/loader.js's
 * loadArticles — same non-fatal, skip-invalid-and-log-it behavior.
 */
export function getArticlesForProduct(productSlug) {
  const authors = loadAuthorsForProduct(productSlug);
  const articles = [];
  for (const [key, raw] of Object.entries(articleModules)) {
    const { product, segment: academySlug, file } = parsePathSegments(key);
    if (product !== productSlug || !file.endsWith(".md")) continue;
    const article = parseArticle(raw, { productSlug, academySlug, authors, sourcePath: key, log: console.warn });
    if (article) articles.push(article);
  }
  return articles;
}

export function getAuthorsForProduct(productSlug) {
  return loadAuthorsForProduct(productSlug);
}

/**
 * M22-A — first real consumer of learningPathSchema/collectionSchema
 * (schemas existed since M21-A with nothing loading them). Same
 * non-fatal, skip-invalid-and-log-it behavior, and the same product-slug
 * injection convenience parseArticle() already gives articles (the
 * directory already encodes which product a file belongs to, so the
 * author doesn't have to repeat it in the JSON).
 */
export function getLearningPathsForProduct(productSlug) {
  const paths = [];
  for (const [key, raw] of Object.entries(pathModules)) {
    const { product, file } = parsePathSegments(key);
    if (product !== productSlug || !file.endsWith(".json")) continue;
    try {
      paths.push(learningPathSchema.parse({ ...JSON.parse(raw), product: productSlug }));
    } catch (err) {
      console.warn(`[resource-center] skipping invalid learning path file ${key}: ${err.message}`);
    }
  }
  return paths;
}

export function getCollectionsForProduct(productSlug) {
  const collections = [];
  for (const [key, raw] of Object.entries(collectionModules)) {
    const { product, file } = parsePathSegments(key);
    if (product !== productSlug || !file.endsWith(".json")) continue;
    try {
      collections.push(collectionSchema.parse({ ...JSON.parse(raw), product: productSlug }));
    } catch (err) {
      console.warn(`[resource-center] skipping invalid collection file ${key}: ${err.message}`);
    }
  }
  return collections;
}

/**
 * Resolves a learning path's/collection's ordered article slugs into real
 * article objects, silently dropping any slug that doesn't resolve to a
 * real, valid article — a broken step is never worse than a missing one.
 */
export function resolveArticleSlugs(slugs, articles) {
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  return slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
}
