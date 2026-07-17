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

function buildHeadInjection(meta, canonicalOrigin) {
  const canonicalUrl = `${canonicalOrigin}${meta.path === "/" ? "" : meta.path}`;
  // No per-page OG image asset pipeline exists yet (that's design-system
  // work, not this milestone) — fall back to a real, already-shipped brand
  // asset rather than inventing a path to a file that doesn't exist.
  const ogImage = meta.ogImage ?? `${canonicalOrigin}/repmail-logo.png`;
  const jsonLd = typeof meta.jsonLd === "function" ? meta.jsonLd(canonicalUrl) : meta.jsonLd;

  const tags = [
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ];
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

        let pageHtml = baseHtml
          .replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(route.title)}</title>`)
          .replace("</head>", `    ${headInjection}\n  </head>`)
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
