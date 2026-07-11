// M21-H — build-time responsive image optimization for Resource Center
// content images (PAR §7: "responsive/WebP/AVIF images with descriptive
// alt text — a direct Core Web Vitals input, not a nice-to-have").
//
// Uses `sharp`, already a devDependency in this codebase (present but
// previously unused for any runtime image pipeline — see the original
// M21 PAR codebase audit) — not a new dependency.
//
// Scope decision: WebP only, not also AVIF, for now. AVIF encodes
// meaningfully slower and the Resource Center has zero real content
// images today (§ "Deliberately not done" below) — adding AVIF now would
// be optimizing an unmeasured hypothetical. WebP alone already covers the
// large majority of the file-size win over unoptimized PNG/JPEG source
// images; AVIF is a one-line addition to FORMATS once real usage exists
// to justify the extra build time.
//
// Convention: source images live at
// client/src/content/{product}/{academy}/images/*.{png,jpg,jpeg}
// (alongside the markdown they illustrate, following this program's
// existing "content lives near what it describes" pattern), output to
// dist/public/content-images/{product}/{academy}/{name}-{width}.webp.
import sharp from "sharp";
import { readdir, mkdir } from "fs/promises";
import path from "path";

const WIDTHS = [400, 800, 1200];
const SOURCE_EXTENSIONS = [".png", ".jpg", ".jpeg"];

export async function optimizeImages({
  sourceDir = path.resolve(import.meta.dirname, "..", "client", "src", "content"),
  outDir = path.resolve(import.meta.dirname, "..", "dist", "public", "content-images"),
  widths = WIDTHS,
  log = console.log,
} = {}) {
  const results = [];
  const imageFiles = await findImageFiles(sourceDir);

  for (const { filePath, relativeDir, baseName } of imageFiles) {
    try {
      const targetDir = path.join(outDir, relativeDir);
      await mkdir(targetDir, { recursive: true });

      for (const width of widths) {
        const outPath = path.join(targetDir, `${baseName}-${width}.webp`);
        await sharp(filePath).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(outPath);
        results.push({ source: filePath, output: outPath, width, status: "ok" });
      }
      log(`[optimize-images] OK   ${path.relative(process.cwd(), filePath)} -> ${widths.length} WebP variant(s)`);
    } catch (err) {
      results.push({ source: filePath, status: "failed", error: err.message });
      log(`[optimize-images] SKIP ${filePath} — ${err.message}`);
    }
  }

  log(`[optimize-images] ${results.filter((r) => r.status === "ok").length}/${results.length} variant(s) generated from ${imageFiles.length} source image(s).`);
  return results;
}

async function findImageFiles(dir, relativeDir = "") {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // no content directory yet is not an error — zero images is the real, current state
  }

  const found = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findImageFiles(fullPath, path.join(relativeDir, entry.name))));
    } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      found.push({ filePath: fullPath, relativeDir, baseName: path.basename(entry.name, path.extname(entry.name)) });
    }
  }
  return found;
}

if (import.meta.url === (await import("url")).pathToFileURL(process.argv[1]).href) {
  optimizeImages().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
