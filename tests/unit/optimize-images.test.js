// M21-H — image optimization pipeline tests, against a real synthetic
// fixture image (generated with sharp itself, not a checked-in binary) and
// real file output — not mocked.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import sharp from "sharp";
import { optimizeImages } from "../../script/optimize-images.js";

let sourceDir, outDir;

beforeAll(async () => {
  sourceDir = await mkdtemp(path.join(tmpdir(), "optimize-images-src-"));
  outDir = await mkdtemp(path.join(tmpdir(), "optimize-images-out-"));

  // A real 1600x900 synthetic image — large enough that all 3 target
  // widths (400/800/1200) are genuine downscales, not upscales.
  await mkdir(path.join(sourceDir, "repmail", "deliverability", "images"), { recursive: true });
  await sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: 20, g: 100, b: 180 } } })
    .png()
    .toFile(path.join(sourceDir, "repmail", "deliverability", "images", "dkim-flow.png"));
});

// Windows occasionally holds a brief file-handle lock right after sharp
// finishes writing (antivirus scanning, buffered-write flush timing) —
// EBUSY on rm() here is an OS/environment timing quirk, not a defect in
// optimizeImages itself (every test's own functional assertions already
// passed by the time cleanup runs, every run). Best-effort cleanup with
// retries; a leftover OS-temp-dir on the rare persistent-lock case is a
// cosmetic issue the OS reclaims on its own, not a reason to fail a suite
// whose actual test outcomes were correct.
async function rmBestEffort(target, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      await rm(target, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}

afterAll(async () => {
  await rmBestEffort(sourceDir);
  await rmBestEffort(outDir);
});

describe("optimizeImages", () => {
  it("generates a real WebP variant at each configured width, preserving directory structure", async () => {
    const results = await optimizeImages({ sourceDir, outDir, widths: [400, 800], log: () => {} });
    expect(results.filter((r) => r.status === "ok")).toHaveLength(2);

    const smallPath = path.join(outDir, "repmail", "deliverability", "images", "dkim-flow-400.webp");
    const meta = await sharp(smallPath).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(400);
  });

  it("never upscales — a width wider than the source produces the source's own width, not artificial upscaling", async () => {
    await optimizeImages({ sourceDir, outDir, widths: [3000], log: () => {} });
    const outPath = path.join(outDir, "repmail", "deliverability", "images", "dkim-flow-3000.webp");
    const meta = await sharp(outPath).metadata();
    expect(meta.width).toBe(1600); // the real source width — withoutEnlargement held
  });

  it("returns an empty result set (not an error) when there are zero source images — today's actual state", async () => {
    const emptySourceDir = await mkdtemp(path.join(tmpdir(), "optimize-images-empty-"));
    const results = await optimizeImages({ sourceDir: emptySourceDir, outDir, log: () => {} });
    expect(results).toEqual([]);
    await rm(emptySourceDir, { recursive: true, force: true });
  });

  it("skips a corrupt/unreadable image file without failing the whole batch", async () => {
    const mixedDir = await mkdtemp(path.join(tmpdir(), "optimize-images-mixed-"));
    await mkdir(path.join(mixedDir, "repmail", "cold-email", "images"), { recursive: true });
    const fs = await import("fs/promises");
    await fs.writeFile(path.join(mixedDir, "repmail", "cold-email", "images", "broken.png"), "not a real png", "utf-8");

    const logs = [];
    const results = await optimizeImages({ sourceDir: mixedDir, outDir, widths: [400], log: (m) => logs.push(m) });
    expect(results.every((r) => r.status === "failed")).toBe(true);
    expect(logs.some((l) => l.includes("SKIP"))).toBe(true);
    await rm(mixedDir, { recursive: true, force: true });
  });
});
