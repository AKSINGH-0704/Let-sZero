// Audit 232 — cache lifetimes for static assets, tested over real HTTP.
//
// Production served `Cache-Control: public, max-age=0` for every static file,
// including the content-hashed bundles. max-age=0 is not "do not cache", it is
// "revalidate before every reuse", so a repeat visitor issued a conditional
// request per asset and waited for ~20 304s before the page could render.
//
// The properties worth pinning are not the exact numbers but the ORDERING and
// the two hard constraints:
//
//   - HTML must never be cached, because the documents name the hashed bundles.
//     A stale document points at files that no longer exist.
//   - Only /assets may be `immutable`, because only its filenames carry a
//     content hash. /fonts and the images have stable names whose bytes can
//     change in place (Audit 231 re-encoded servers.webp without renaming it),
//     so an immutable promise there would be a lie with a one-year expiry.
//
// Uses serveStatic's injectable distPath against a real Express server and a
// real temp directory, the same mechanism the M21-I test established.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { serveStatic } from "../../server/static.js";

let httpServer, baseUrl, distPath;

beforeAll(async () => {
  distPath = await mkdtemp(path.join(tmpdir(), "a232-cache-"));
  await mkdir(path.join(distPath, "assets"), { recursive: true });
  await mkdir(path.join(distPath, "fonts"), { recursive: true });
  await mkdir(path.join(distPath, "images", "landing"), { recursive: true });
  await writeFile(path.join(distPath, "index.html"), "<html><body>SPA</body></html>", "utf-8");
  await writeFile(path.join(distPath, "pricing.html"), "<html><body>PRICING</body></html>", "utf-8");
  await writeFile(path.join(distPath, "assets", "index-AbCdEfGh.js"), "console.log(1)", "utf-8");
  await writeFile(path.join(distPath, "assets", "index-ZyXwVuTs.css"), "body{}", "utf-8");
  await writeFile(path.join(distPath, "fonts", "general-sans-400-normal.woff2"), "FONT", "utf-8");
  await writeFile(path.join(distPath, "images", "landing", "servers.webp"), "IMG", "utf-8");
  await writeFile(path.join(distPath, "sitemap.xml"), "<urlset></urlset>", "utf-8");

  const app = express();
  serveStatic(app, distPath);
  httpServer = createServer(app);
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterAll(async () => {
  await new Promise((r) => httpServer.close(r));
  await rm(distPath, { recursive: true, force: true });
});

const cc = async (p) => (await fetch(`${baseUrl}${p}`)).headers.get("cache-control") || "";
const maxAge = (v) => { const m = /max-age=(\d+)/.exec(v); return m ? Number(m[1]) : null; };

describe("Audit 232 — HTML is never cached", () => {
  it.each(["/", "/index.html", "/pricing", "/pricing.html"])("%s carries max-age=0", async (p) => {
    const v = await cc(p);
    expect(maxAge(v), `${p} -> ${v}`).toBe(0);
    expect(v).not.toMatch(/immutable/);
  });
});

describe("Audit 232 — hashed bundles are immutable", () => {
  it.each(["/assets/index-AbCdEfGh.js", "/assets/index-ZyXwVuTs.css"])("%s is immutable and long-lived", async (p) => {
    const v = await cc(p);
    expect(v).toMatch(/immutable/);
    expect(maxAge(v)).toBeGreaterThanOrEqual(31536000);
  });
});

describe("Audit 232 — stable-filename assets are long-lived but NOT immutable", () => {
  it("a font caches for a long time without promising immutability", async () => {
    const v = await cc("/fonts/general-sans-400-normal.woff2");
    expect(maxAge(v)).toBeGreaterThan(86400);
    expect(v, "fonts must not be immutable — the filename carries no content hash").not.toMatch(/immutable/);
  });

  it("an image caches, but for less than a font, and is not immutable", async () => {
    const v = await cc("/images/landing/servers.webp");
    expect(maxAge(v)).toBeGreaterThan(3600);
    expect(v).not.toMatch(/immutable/);
    expect(maxAge(v)).toBeLessThan(maxAge(await cc("/fonts/general-sans-400-normal.woff2")));
  });
});

describe("Audit 232 — the existing serving behaviour is unchanged", () => {
  it("a prerendered flat file still wins and is still served", async () => {
    const res = await fetch(`${baseUrl}/pricing`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("PRICING");
  });

  it("an unknown route still falls through to the SPA shell", async () => {
    const res = await fetch(`${baseUrl}/app/dashboard`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("SPA");
  });

  it("crawler files keep the default lifetime rather than being pinned", async () => {
    expect(maxAge(await cc("/sitemap.xml"))).toBe(0);
  });
});
