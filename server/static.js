import express from "express";
import fs from "fs";
import path from "path";

// __dirname is provided by esbuild in CJS output

export function serveStatic(app) {
  const distPath = path.resolve(__dirname, "public");
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
  app.use(express.static(distPath, { extensions: ["html"] }));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
