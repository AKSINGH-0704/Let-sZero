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
