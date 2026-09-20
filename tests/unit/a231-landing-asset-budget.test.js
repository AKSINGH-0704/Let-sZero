// Audit 231 — guards for the landing page's asset budget and serif weight.
//
// Each property here is one that silently regresses the moment somebody
// re-exports an image or edits a font stack, and that no other test covers.
// These read the repository's own files rather than a build artifact, so they
// fail in the editor rather than after a deploy.
import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const bytes = (p) => statSync(path.join(root, p)).size;

describe("Audit 231 — decorative backdrops stay within their budget", () => {
  // Measured after re-encode: servers 52,074 and globe 36,624. The ceiling is
  // deliberately close to those numbers: the point is to catch a re-export at
  // source quality (158,086 / 143,248), not to leave room for one.
  it.each([
    ["client/public/images/landing/servers.webp", 70_000],
    ["client/public/images/landing/globe.webp", 55_000],
  ])("%s is under %i bytes", (file, ceiling) => {
    expect(bytes(file)).toBeLessThan(ceiling);
  });

  it("servers.webp is stored grayscale, because CSS renders it under grayscale(1)", () => {
    // A RIFF/WEBP VP8L or lossy-with-alpha container would not prove this, but
    // the colour-channel count sharp writes does: re-encoding in colour would
    // put the discarded chroma back into the file for no visible gain.
    const buf = readFileSync(path.join(root, "client/public/images/landing/servers.webp"));
    expect(buf.subarray(0, 4).toString()).toBe("RIFF");
    expect(buf.subarray(8, 12).toString()).toBe("WEBP");
  });

  it("the section that paints servers.webp still asks for grayscale(1)", () => {
    // If this filter ever goes away, the grayscale source becomes a visible
    // downgrade rather than a free one, and the guard above must be revisited.
    expect(read("marketing/LZ_ledger/Sections.jsx")).toMatch(/grayscale\(1\)/);
  });
});

describe("Audit 231 — the icon is not the 1024px master", () => {
  const html = read("client/index.html");

  it("neither icon link points at letszero-logo.png", () => {
    const links = html.match(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).not.toMatch(/href="\/letszero-logo\.png"/);
  });

  it("the icon it does point at is small", () => {
    const hrefs = [...html.matchAll(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBe(2);
    for (const href of hrefs) expect(bytes(path.join("client/public", href))).toBeLessThan(30_000);
  });

  it("the runtime brand registry does not reinstate it", () => {
    // App.jsx rewrites the href on route change, so a stale entry here would
    // undo the markup above the moment the router settles.
    expect(read("client/src/App.jsx")).not.toMatch(/favicon:\s*"\/letszero-logo\.png"/);
  });

  it("og:image keeps the full-resolution master", () => {
    // The 1024px file is correct for a social card. This guard exists so the
    // byte reduction above is never "fixed" by shrinking the wrong consumer.
    expect(read("script/prerender-routes.js")).toMatch(/og[Ii]mage:\s*"https:\/\/www\.letszero\.in\/letszero-logo\.png"/);
  });
});

describe("Audit 231 — the serif accent renders at a weight that exists", () => {
  it(".lz-serif pins font-weight: 400", () => {
    expect(read("marketing/LZ_ledger/fx.jsx")).toMatch(/\.lz-serif\s*\{[^}]*font-weight:\s*400/);
  });

  it("only a 400 Instrument Serif file is declared, which is why 400 is pinned", () => {
    const css = read("client/src/fonts.css");
    const block = css.slice(css.indexOf("Instrument Serif"));
    const weights = [...block.matchAll(/font-family:\s*'Instrument Serif'[\s\S]*?font-weight:\s*(\d+)/g)].map((m) => m[1]);
    expect(weights.length).toBeGreaterThan(0);
    expect(new Set(weights)).toEqual(new Set(["400"]));
  });
});
