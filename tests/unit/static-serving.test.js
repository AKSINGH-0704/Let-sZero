// M21-I — real HTTP test for server/static.js, added after a genuine
// production defect was found via manual curl checks during the M21
// operator review (2026-07-12): a real directory existing at a route path
// that isn't itself prerendered (dist/public/repmail/learn/, created only
// because generate-rss.js writes rss.xml there) made express.static
// 301-redirect "/repmail/learn" -> "/repmail/learn/" before the request
// ever reached the SPA catch-all. Fixed with redirect:false. This test
// reproduces the exact directory shape against a real Express server and a
// real temp directory (injected via serveStatic's new distPath parameter,
// added specifically so this is testable without fighting __dirname/CJS-
// vs-ESM differences), so the fix is covered by an automated test, not
// only a manual curl check that won't run again on the next change.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { serveStatic } from "../../server/static.js";

let httpServer, baseUrl, distPath;

beforeAll(async () => {
  distPath = await mkdtemp(path.join(tmpdir(), "static-serving-test-"));
  await writeFile(path.join(distPath, "index.html"), "<html><body>SPA SHELL</body></html>", "utf-8");
  await writeFile(path.join(distPath, "pricing.html"), "<html><body>PRICING PAGE</body></html>", "utf-8");
  // The real deployment shape (M23-E): a "container" route has BOTH a
  // prerendered flat file (repmail/learn.html) AND a real child directory at
  // the same path (repmail/learn/, holding rss.xml + child article files).
  await mkdir(path.join(distPath, "repmail", "learn"), { recursive: true });
  await writeFile(path.join(distPath, "repmail", "learn.html"), "<html><head><meta name='description' content='x'></head><body>PRERENDERED LEARN</body></html>", "utf-8");
  await writeFile(path.join(distPath, "repmail", "learn", "rss.xml"), "<rss></rss>", "utf-8");
  await writeFile(path.join(distPath, "repmail", "learn", "an-article.html"), "<html><body>ARTICLE</body></html>", "utf-8");

  const app = express();
  serveStatic(app, distPath);
  httpServer = createServer(app);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  httpServer?.close();
  if (distPath) await rm(distPath, { recursive: true, force: true }).catch(() => {});
});

async function get(path_) {
  return fetch(`${baseUrl}${path_}`, { redirect: "manual" });
}

describe("serveStatic — prerendered flat file wins over a shadowing directory (M23-E fix)", () => {
  it("GET /repmail/learn serves the PRERENDERED file (not the SPA shell), even though repmail/learn/ is a real directory — the SEO fix", async () => {
    const res = await get("/repmail/learn");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("PRERENDERED LEARN");
    expect(body).not.toContain("SPA SHELL");
  });

  it("no redirect is issued (M21-I behavior preserved)", async () => {
    const res = await get("/repmail/learn");
    expect(res.status).toBe(200); // not 301
  });

  it("a file inside that same directory is still directly reachable", async () => {
    const res = await get("/repmail/learn/rss.xml");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<rss>");
  });

  it("a leaf article inside the directory still resolves (via the flat-file resolver or extensions)", async () => {
    const res = await get("/repmail/learn/an-article");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("ARTICLE");
  });

  it("flat prerendered .html files still resolve via the extensions option, unaffected by redirect:false", async () => {
    const res = await get("/pricing");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("PRICING PAGE");
  });

  it("an unknown path still falls through to the SPA shell (catch-all unaffected)", async () => {
    const res = await get("/some/deep/unknown/route");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("SPA SHELL");
  });
});
