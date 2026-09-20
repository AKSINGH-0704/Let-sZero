import express from "express";
import fs from "fs";
import path from "path";

// __dirname is provided by esbuild in CJS output

// distPath is injectable (defaults to the real esbuild-provided __dirname
// join used in production) specifically so this function is testable with
// a real Express server against a real temp directory — the only way the
// M21-I redirect defect (a real directory at a route path forcing an
// unwanted 301) could be covered by an automated test instead of only a
// manual curl check that won't run again on the next change.
export function serveStatic(app, distPath = path.resolve(__dirname, "public")) {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // extensions: ["html"] lets a prerendered route (M21-B — e.g. /pricing ->
  // dist/public/pricing.html) resolve with no trailing-slash redirect,
  // matching the no-trailing-slash URLs already used throughout
  // sitemap.xml and every internal <Link>. Has no effect on /app/* — those
  // routes never match a static file here, so they fall through to the
  // catch-all exactly as before.
  //
  // redirect: false (M21-I) — a real directory can exist at a route path
  // that isn't itself prerendered (e.g. dist/public/repmail/learn/ exists
  // only because generate-rss.js writes rss.xml there — M21-E — while
  // /repmail/learn itself is deliberately unprerendered per M21-D). Without
  // this, express.static's default directory-redirect behavior 301s
  // "/repmail/learn" -> "/repmail/learn/" before the request ever reaches
  // the SPA catch-all below — found via a real production-server check
  // during the M21 operator review (2026-07-12), not assumed safe.
  // redirect:false only changes behavior for an exact directory-path match
  // like this one; it has zero effect on the extensions-based flat-file
  // lookup above, which is a separate mechanism.
  // M23-E — prerendered flat file FIRST, before express.static's directory
  // handling. A "container" route can have both a prerendered file and a real
  // child directory at the same path: /repmail/learn has dist/public/repmail/
  // learn.html (the prerendered homepage) AND dist/public/repmail/learn/ (its
  // child articles + rss.xml). express.static's `extensions: ["html"]`
  // fallback does NOT fire when the path resolves to a directory, so those
  // routes were silently served the SPA shell (no prerendered metadata,
  // defeating the whole prerender/SEO effort for exactly the homepage and
  // Academy hub pages). This resolver serves "<route>.html" when it exists,
  // winning over the directory shadow. Leaf routes (articles, authors) are
  // unaffected — they already resolve via extensions since no directory
  // shadows them; this just also handles the container case. /app/* and /api/*
  // have no matching .html and fall through untouched.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const urlPath = req.path;
    if (urlPath === "/" || urlPath.endsWith("/") || path.extname(urlPath)) return next();
    const candidate = path.join(distPath, urlPath.replace(/^\/+/, "")) + ".html";
    // Defense in depth against path traversal (req.path is already normalized).
    if (!candidate.startsWith(distPath + path.sep)) return next();
    fs.access(candidate, fs.constants.F_OK, (err) => {
      if (err) return next();
      res.sendFile(candidate);
    });
  });

  // Audit 232 — cache lifetimes. Express defaults every static response to
  // `Cache-Control: public, max-age=0`, which was what production served for
  // ALL of it: the content-hashed bundles, the fonts, the images. max-age=0
  // does not mean "do not cache", it means "revalidate before every reuse", so
  // a repeat visitor paid a conditional request per asset — ~20 round trips
  // that all answer 304 — before anything could render. On a 150-300ms mobile
  // link that is the dominant cost of a second visit.
  //
  // The lifetimes differ because the safety of each differs:
  //
  //   /assets/*  Vite writes a content hash into the filename, so a changed
  //              file is a different URL and a cached copy can never be stale.
  //              This is the one case where `immutable` is provably correct.
  //   /fonts/*   Stable filenames, but the bytes behind them are Fontsource
  //              releases that do not change in place. Long, and deliberately
  //              NOT immutable, so the window is bounded if one ever does.
  //   images     Stable filenames whose bytes DO change in place — Audit 231
  //              re-encoded servers.webp and globe.webp without renaming them.
  //              A week bounds how long a visitor can hold a superseded one.
  //   .html      Unchanged at max-age=0. The documents carry the asset URLs, so
  //              caching them is what would actually break a deploy: a stale
  //              document would reference bundles that no longer exist.
  const YEAR = 31536000, MONTH = 2592000, WEEK = 604800;
  app.use(express.static(distPath, {
    extensions: ["html"],
    redirect: false,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".html") {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        return;
      }
      const rel = path.relative(distPath, filePath).split(path.sep).join("/");
      if (rel.startsWith("assets/")) {
        res.setHeader("Cache-Control", `public, max-age=${YEAR}, immutable`);
      } else if (rel.startsWith("fonts/")) {
        res.setHeader("Cache-Control", `public, max-age=${MONTH}`);
      } else if ([".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".avif"].includes(ext)) {
        res.setHeader("Cache-Control", `public, max-age=${WEEK}`);
      }
      // Everything else (sitemap.xml, robots.txt, rss.xml) keeps the express
      // default: these are crawler-facing and are expected to be re-read.
    },
  }));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
