// M21-E — build-time RSS feed generation per product Resource Center (PAR
// §7). Uses the Node content loader from M21-D (shared/content/loader.js) —
// with zero real articles today, this correctly produces a valid, empty
// feed rather than nothing at all: a feed reader or aggregator that's
// already subscribed sees zero items, not a broken URL, whenever real
// content starts publishing. RSS isn't indexed/ranked the way pages are,
// so an empty valid feed carries none of the "thin content" risk that kept
// the Resource Center's own pages out of the sitemap this milestone (M21-D).
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { loadAuthors, loadArticles } from "../shared/content/loader.js";
import { PRODUCTS } from "../shared/content/taxonomy.js";

export async function generateRss({
  contentDir = path.resolve(import.meta.dirname, "..", "client", "src", "content"),
  distDir = path.resolve(import.meta.dirname, "..", "dist", "public"),
  canonicalOrigin = "https://www.letszero.in",
  productSlug = "repmail",
  log = console.log,
} = {}) {
  const product = PRODUCTS[productSlug];
  if (!product) throw new Error(`generateRss: unknown product "${productSlug}"`);

  const authors = await loadAuthors(contentDir, productSlug, { log });
  const articles = await loadArticles(contentDir, productSlug, authors, { log });
  const sorted = [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const items = sorted
    .map((article) => {
      const url = `${canonicalOrigin}${product.basePath}/${article.academy.slug}/${article.slug}`;
      return [
        "  <item>",
        `    <title>${escapeXml(article.title)}</title>`,
        `    <link>${escapeXml(url)}</link>`,
        `    <guid>${escapeXml(url)}</guid>`,
        `    <description>${escapeXml(article.description)}</description>`,
        `    <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>`,
        "  </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `  <title>${escapeXml(product.resourceCenterName)}</title>`,
    `  <link>${escapeXml(canonicalOrigin + product.basePath)}</link>`,
    `  <description>Guides and resources from ${escapeXml(product.name)}.</description>`,
    items,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");

  const outDir = path.join(distDir, product.basePath.replace(/^\//, ""));
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "rss.xml");
  await writeFile(outPath, xml, "utf-8");
  log(`[rss] wrote ${sorted.length} item(s) for ${productSlug} -> ${path.relative(process.cwd(), outPath)}`);
  return xml;
}

function escapeXml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
