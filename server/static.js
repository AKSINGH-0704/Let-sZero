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

  app.use(express.static(distPath, { extensions: ["html"], redirect: false }));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
