// M21-E — build-time sitemap.xml generation (PAR §7: "regenerated at build
// time, not hand-maintained... includes lastmod per page"). Replaces the
// static, hand-written client/public/sitemap.xml (still present as a
// dev-mode fallback — Vite's client build copies it into dist/public/
// verbatim before this runs; this step overwrites it in production only).
//
// Sources its URL list from the same route config the prerender pipeline
// (M21-B) already uses — one list, not two hand-kept copies that could drift
// out of sync with what's actually being prerendered. Since M27 that list is
// itself derived from the real content files.
import { writeFile } from "fs/promises";
import path from "path";
import { getPublicRoutes } from "./prerender-routes.js";

export async function generateSitemap({
  distDir = path.resolve(import.meta.dirname, "..", "dist", "public"),
  canonicalOrigin = "https://www.letszero.in",
  routes,
  lastmod = new Date().toISOString().slice(0, 10),
  log = console.log,
} = {}) {
  routes ??= await getPublicRoutes();
  const urls = routes
    .map((route) => {
      const loc = `${canonicalOrigin}${route.path === "/" ? "" : route.path}`;
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  const outPath = path.join(distDir, "sitemap.xml");
  await writeFile(outPath, xml, "utf-8");
  log(`[sitemap] wrote ${routes.length} URLs -> ${path.relative(process.cwd(), outPath)}`);
  return xml;
}

function escapeXml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
