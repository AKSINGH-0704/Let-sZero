import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { prerenderRoutes } from "./prerender.js";
import { generateSitemap } from "./generate-sitemap.js";
import { generateRss } from "./generate-rss.js";
import { optimizeImages } from "./optimize-images.js";

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("prerendering public routes...");
  // M21-B: static prerendering for public/content routes only (PAR §4).
  // Non-fatal per-route — a route that fails to prerender keeps today's
  // SPA-shell behavior for that one page rather than blocking the build.
  await prerenderRoutes();

  console.log("generating sitemap.xml...");
  // M21-E: overwrites the static file Vite's client build already copied
  // from client/public/sitemap.xml, with a build-time-generated, lastmod-
  // annotated version sourced from the same route list the prerender step
  // just used — one source of truth, not two hand-kept copies (PAR §7).
  await generateSitemap();

  console.log("generating RSS feed...");
  // M21-E (PAR §7). Zero real articles today produces a valid, empty feed —
  // not an error, not skipped (see script/generate-rss.js for why an empty
  // feed carries none of the "thin content" risk that kept the Resource
  // Center's own pages out of the sitemap in M21-D).
  await generateRss();

  console.log("optimizing content images...");
  // M21-H (PAR §7). Zero real content images today produces zero output,
  // not an error — same honest-empty-state pattern as generateRss() above.
  // Ready the moment real Resource Center images exist, no build-step
  // change needed then.
  await optimizeImages();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.js"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
