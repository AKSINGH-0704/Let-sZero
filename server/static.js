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
  app.use(express.static(distPath, { extensions: ["html"], redirect: false }));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
