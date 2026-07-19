// M21-B — build-time static prerendering for public content routes.
// PAR §4: scoped to public/content routes only, zero new services, output
// into the existing dist/public/, authenticated routes (/app/*) untouched.
//
// Renders each route's real page component (the same one used client-side)
// via renderToString, using Vite's own SSR module loader so path aliases
// (@, @shared, @marketing) resolve exactly as they do in the client build —
// no separate alias-resolution logic to maintain.
//
// A failure on one route is NOT fatal to the overall build: that route's
// output simply falls back to the plain SPA shell (today's behavior,
// unchanged), and the failure is reported clearly. The build only exits
// non-zero if every route fails, since a partial SEO win across working
// routes is strictly better than blocking every deploy over one page.
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getPublicRoutes } from "./prerender-routes.js";

// Vite's ssrLoadModule resolves these from the *client* module graph (same
// aliases as the real app), so AuthProvider/Router here are the app's own
// providers, not reimplementations — the wrapper stack below exists only
// because these pages call useAuth()/useLocation() and expect their real
// context, not because the pages behave differently for prerendering.
async function loadProviders(vite) {
  const { AuthProvider } = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  const { Router } = await vite.ssrLoadModule("wouter");
  return { AuthProvider, Router };
}

const DIST_DIR = path.resolve(import.meta.dirname, "..", "dist", "public");

/**
 * PERF-007 — modulepreload hints for the chunk backing a prerendered route.
 *
 * Measured on production, /repmail/learn at 4x CPU throttle: the entry chunk
 * downloads 486-1121ms, but the route's own chunks are not requested until
 * 1718ms, because React has to parse and execute the entry bundle before it
 * reaches the dynamic import. The chunks themselves are small and download in
 * ~350ms. The cost is serialisation, not bytes, and it showed up as 916ms of
 * Suspense fallback covering already-correct prerendered HTML.
 *
 * A modulepreload link in the head lets the browser start those fetches while
 * it is still parsing the document, in parallel with the entry bundle, so the
 * chunk is in the memory cache by the time React asks for it.
 *
 * Emitted only for routes whose component is actually lazy-loaded on the
 * client. The prerendered public pages that App.jsx imports eagerly already
 * have their code in the entry chunk, and Vite writes modulepreload links for
 * that graph into index.html itself.
 */
async function loadManifest(distDir, log) {
  try {
    return JSON.parse(await readFile(path.join(distDir, ".vite", "manifest.json"), "utf-8"));
  } catch {
    // Manifest absent (e.g. an older build) is not fatal: no hints are emitted
    // and behaviour is exactly what it was before this optimisation.
    log("[prerender] no Vite manifest found — skipping modulepreload hints");
    return null;
  }
}

/**
 * M34 — per-route font preload.
 *
 * The self-hosted faces are declared in the bundled CSS, so the browser cannot
 * request one until that CSS has downloaded, parsed, and laid out text using
 * it. Measured without a hint: the first font byte was requested at 3251ms on
 * `/` and 4550ms on a Resource Center page. With `font-display: swap` that is
 * not invisible text, but it is several seconds of fallback before the swap,
 * which reads as a flash of unstyled text.
 *
 * A preload in client/index.html would fix that but is unconditional: index.html
 * is one shell for every route, so preloading Space Grotesk there pulled 23KB
 * into every Resource Center page, which only uses Open Sans.
 *
 * Since each route is prerendered into its own HTML file, the hint can instead
 * be exact — only the faces that route paints above the fold. Anything else the
 * page needs is still discovered from the stylesheet as before.
 */
const ROUTE_FONT_PRELOADS = [
  // Pricing and payments are the only surfaces using the Fontshare families.
  [/^\/pricing(\/|$)/, ["cabinet-grotesk-800-normal.woff2", "general-sans-400-normal.woff2"]],
  // The Resource Center sets body copy in Open Sans throughout.
  [/^\/repmail\/(learn|changelog)(\/|$)/, ["open-sans-300_800-normal.woff2"]],
  [/^\/learn(\/|$)/, ["open-sans-300_800-normal.woff2"]],
  // Marketing and product pages lead with a Space Grotesk headline.
  [/^\/($|products\/)/, ["space-grotesk-300_700-normal.woff2"]],
];

function fontPreloadTagsFor(routePath) {
  const match = ROUTE_FONT_PRELOADS.find(([re]) => re.test(routePath));
  if (!match) return "";
  return match[1]
    .map((f) => `<link rel="preload" as="font" type="font/woff2" href="/fonts/${f}" crossorigin />`)
    .join("\n    ");
}

function preloadTagsFor(manifest, componentPath) {
  if (!manifest || !componentPath) return "";
  const key = componentPath.replace(/^\//, "");
  const root = manifest[key];
  if (!root) return "";

  // Walk the chunk's own static imports so the whole subtree is warm, not just
  // the entry point of it. Depth-bounded and de-duplicated: this is a latency
  // hint, and preloading an unbounded graph would compete for the same
  // connections it is meant to free up.
  const files = new Set();
  const seen = new Set();
  const visit = (k, depth) => {
    if (depth > 2 || seen.has(k)) return;
    seen.add(k);
    const entry = manifest[k];
    if (!entry) return;
    if (entry.file) files.add(entry.file);
    for (const imp of entry.imports ?? []) visit(imp, depth + 1);
  };
  visit(key, 0);

  return [...files]
    .map((f) => `<link rel="modulepreload" href="/${f}" />`)
    .join("\n    ");
}

function buildHeadInjection(meta, canonicalOrigin) {
  const canonicalUrl = `${canonicalOrigin}${meta.path === "/" ? "" : meta.path}`;
  // No per-page OG image asset pipeline exists yet (that's design-system
  // work, not this milestone) — fall back to a real, already-shipped brand
  // asset rather than inventing a path to a file that doesn't exist.
  const ogImage = meta.ogImage ?? `${canonicalOrigin}/repmail-logo.png`;
  const jsonLd = typeof meta.jsonLd === "function" ? meta.jsonLd(canonicalUrl) : meta.jsonLd;

  // M30 — every page previously declared og:type "website", including the 75
  // articles. Open Graph's article type carries published/modified time, section
  // and author, which are the freshness and hierarchy signals an article page
  // exists to emit; declaring an article a "website" throws all of them away.
  const ogType = meta.ogType ?? "website";

  const tags = [
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />`,
    // Lets Google show a large image preview and an unclipped snippet. Without
    // it the default is a small thumbnail, which is purely a lost opportunity.
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<meta property="og:type" content="${escapeAttr(ogType)}" />`,
    `<meta property="og:site_name" content="LetsZero" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta property="og:image:alt" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
    `<meta name="twitter:image:alt" content="${escapeAttr(meta.title)}" />`,
  ];

  if (ogType === "article") {
    if (meta.publishedTime) tags.push(`<meta property="article:published_time" content="${escapeAttr(meta.publishedTime)}" />`);
    if (meta.modifiedTime) tags.push(`<meta property="article:modified_time" content="${escapeAttr(meta.modifiedTime)}" />`);
    if (meta.section) tags.push(`<meta property="article:section" content="${escapeAttr(meta.section)}" />`);
    for (const tag of meta.articleTags ?? []) {
      tags.push(`<meta property="article:tag" content="${escapeAttr(tag)}" />`);
    }
  }
  if (jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
  }
  return tags.join("\n    ");
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export async function prerenderRoutes({
  canonicalOrigin = "https://www.letszero.in",
  log = console.log,
  distDir = DIST_DIR,
  routes,
} = {}) {
  routes ??= await getPublicRoutes();
  const baseHtmlPath = path.join(distDir, "index.html");
  const baseHtml = await readFile(baseHtmlPath, "utf-8");
  const manifest = await loadManifest(distDir, log);

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  const { AuthProvider, Router } = await loadProviders(vite);

  const results = [];
  try {
    for (const route of routes) {
      try {
        const mod = await vite.ssrLoadModule(route.componentPath);
        const PageComponent = mod.default;
        if (typeof PageComponent !== "function") {
          throw new Error(`${route.componentPath} has no default export function`);
        }

        // Fresh, unpopulated QueryClient per route — these pages render their
        // logged-out/no-data initial state server-side (exactly what a real
        // anonymous visitor's first paint looks like, including AuthProvider's
        // own /api/auth/me query never resolving synchronously); any
        // data-dependent UI finishes resolving after client hydration, same
        // as today. wouter's Router gets ssrPath so useLocation()/Link don't
        // touch window.location, which doesn't exist in this Node context.
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const app = React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(Router, { ssrPath: route.path }, React.createElement(PageComponent))
          )
        );

        const bodyHtml = renderToString(app);
        const headInjection = buildHeadInjection(route, canonicalOrigin);
        const preloads = [fontPreloadTagsFor(route.path), preloadTagsFor(manifest, route.componentPath)]
          .filter(Boolean)
          .join("\n    ");

        let pageHtml = baseHtml
          .replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(route.title)}</title>`)
          .replace("</head>", `    ${headInjection}${preloads ? "\n    " + preloads : ""}\n  </head>`)
          .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);

        // Flat "route.html" files, not "route/index.html" — paired with
        // express.static's `extensions: ["html"]` option (server/static.js),
        // this makes "/pricing" resolve directly with no 301-to-trailing-
        // slash hop, matching the no-trailing-slash URLs already used
        // throughout sitemap.xml and every internal <Link>.
        const outPath = route.path === "/" ? path.join(distDir, "index.html") : path.join(distDir, `${route.path.replace(/^\//, "")}.html`);
        await mkdirForFile(outPath);
        await writeFile(outPath, pageHtml, "utf-8");

        results.push({ path: route.path, status: "ok" });
        log(`[prerender] OK   ${route.path} -> ${path.relative(process.cwd(), outPath)}`);
      } catch (err) {
        results.push({ path: route.path, status: "failed", error: err.message });
        log(`[prerender] SKIP ${route.path} — falling back to SPA shell (${err.message})`);
      }
    }
  } finally {
    await vite.close();
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  log(`[prerender] ${okCount}/${results.length} routes prerendered.`);
  if (okCount === 0 && results.length > 0) {
    throw new Error("prerender: every route failed — refusing to silently ship zero SEO coverage. See per-route errors above.");
  }
  return results;
}

async function mkdirForFile(filePath) {
  const { mkdir } = await import("fs/promises");
  await mkdir(path.dirname(filePath), { recursive: true });
}

// Allow running standalone (`node script/prerender.js`) against an existing
// dist/public/, in addition to being called from script/build.js.
// pathToFileURL (not a raw `file://${argv[1]}` template) — the naive form
// silently never matches on Windows, where argv[1] uses backslashes and
// needs proper escaping, not string concatenation.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  prerenderRoutes().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
