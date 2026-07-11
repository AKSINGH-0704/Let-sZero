// M21-B — prerender pipeline tests. Uses a tiny synthetic fixture route
// against a temp dist dir (not the real 6 production routes — those are
// exercised for real by `npm run build`, see Audit 126/127; a unit test
// re-rendering the full marketing pages on every test run would be slow
// and would duplicate what the build step already proves). This test
// verifies the pipeline mechanism itself: metadata injection, canonical
// URL construction, JSON-LD, graceful per-route failure, and the
// all-routes-failed guard.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { prerenderRoutes } from "../../script/prerender.js";

let fixtureDir;

const BASE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>LetsZero</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

// A minimal, genuinely SSR-safe component — no hooks, no context
// dependency — isolates the test from real page components' own
// correctness (that's what the build-time smoke run covers).
const FIXTURE_COMPONENT_SOURCE = `
export default function FixturePage() {
  return <main><h1>Fixture Page</h1><p>Hello from the prerender test fixture.</p></main>;
}
`;

const BROKEN_COMPONENT_SOURCE = `
export default function BrokenPage() {
  throw new Error("intentional fixture failure");
}
`;

beforeAll(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), "prerender-test-"));
  await writeFile(path.join(fixtureDir, "index.html"), BASE_HTML, "utf-8");
  await writeFile(path.join(fixtureDir, "FixturePage.jsx"), FIXTURE_COMPONENT_SOURCE, "utf-8");
  await writeFile(path.join(fixtureDir, "BrokenPage.jsx"), BROKEN_COMPONENT_SOURCE, "utf-8");
});

afterAll(async () => {
  if (fixtureDir) await rm(fixtureDir, { recursive: true, force: true });
});

describe("prerenderRoutes — mechanism", () => {
  it("renders a route's real component into the base HTML's #root, with per-page metadata", async () => {
    const logs = [];
    const results = await prerenderRoutes({
      distDir: fixtureDir,
      canonicalOrigin: "https://example.test",
      log: (msg) => logs.push(msg),
      routes: [
        {
          path: "/fixture",
          componentPath: path.join(fixtureDir, "FixturePage.jsx"),
          title: "Fixture Page Title",
          description: "Fixture page description.",
          jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "Fixture", url }),
        },
      ],
    });

    expect(results).toEqual([{ path: "/fixture", status: "ok" }]);

    const outHtml = await readFile(path.join(fixtureDir, "fixture.html"), "utf-8");
    expect(outHtml).toContain("<h1>Fixture Page</h1>");
    expect(outHtml).toContain("Hello from the prerender test fixture.");
    expect(outHtml).toContain("<title>Fixture Page Title</title>");
    expect(outHtml).toContain('<meta name="description" content="Fixture page description." />');
    expect(outHtml).toContain('<link rel="canonical" href="https://example.test/fixture" />');
    expect(outHtml).toContain('"@type":"WebPage"');
    expect(outHtml).toContain('"url":"https://example.test/fixture"');
    expect(logs.some((l) => l.includes("OK   /fixture"))).toBe(true);
  });

  it("writes the root route to distDir/index.html directly, not distDir//index.html", async () => {
    await prerenderRoutes({
      distDir: fixtureDir,
      routes: [{
        path: "/",
        componentPath: path.join(fixtureDir, "FixturePage.jsx"),
        title: "Root",
        description: "Root page.",
      }],
      log: () => {},
    });
    const outHtml = await readFile(path.join(fixtureDir, "index.html"), "utf-8");
    expect(outHtml).toContain("Fixture Page");
  });

  it("escapes HTML-significant characters in title/description so a quote or & can't break the injected tags", async () => {
    await prerenderRoutes({
      distDir: fixtureDir,
      routes: [{
        path: "/escaping",
        componentPath: path.join(fixtureDir, "FixturePage.jsx"),
        title: 'A "Quoted" Title & More',
        description: 'A description with <a "tag"> in it & an ampersand',
      }],
      log: () => {},
    });
    const outHtml = await readFile(path.join(fixtureDir, "escaping.html"), "utf-8");
    expect(outHtml).not.toContain('content="A description with <a "tag">'); // raw quote would break the attribute
    expect(outHtml).toContain("&quot;Quoted&quot;");
    expect(outHtml).toContain("&amp;");
  });

  it("a single route's render failure does not throw, falls back gracefully, and is reported", async () => {
    const logs = [];
    const results = await prerenderRoutes({
      distDir: fixtureDir,
      log: (msg) => logs.push(msg),
      routes: [
        { path: "/broken", componentPath: path.join(fixtureDir, "BrokenPage.jsx"), title: "Broken", description: "..." },
        { path: "/fixture", componentPath: path.join(fixtureDir, "FixturePage.jsx"), title: "Fixture", description: "..." },
      ],
    });

    expect(results.find((r) => r.path === "/broken").status).toBe("failed");
    expect(results.find((r) => r.path === "/fixture").status).toBe("ok");
    expect(logs.some((l) => l.includes("SKIP /broken"))).toBe(true);
  });

  it("throws only when every route fails — refuses to silently ship zero SEO coverage", async () => {
    await expect(
      prerenderRoutes({
        distDir: fixtureDir,
        log: () => {},
        routes: [{ path: "/broken", componentPath: path.join(fixtureDir, "BrokenPage.jsx"), title: "Broken", description: "..." }],
      })
    ).rejects.toThrow(/every route failed/);
  });

  it("writes flat route.html files, not route/index.html — avoids a trailing-slash redirect in production (paired with server/static.js's extensions option)", async () => {
    await prerenderRoutes({
      distDir: fixtureDir,
      routes: [{ path: "/flat-check", componentPath: path.join(fixtureDir, "FixturePage.jsx"), title: "T", description: "D" }],
      log: () => {},
    });
    const outHtml = await readFile(path.join(fixtureDir, "flat-check.html"), "utf-8");
    expect(outHtml).toContain("Fixture Page");
    await expect(readFile(path.join(fixtureDir, "flat-check", "index.html"), "utf-8")).rejects.toThrow();
  });

  it("falls back to a real, existing brand asset for og:image when a route doesn't specify one — never a nonexistent path", async () => {
    await prerenderRoutes({
      distDir: fixtureDir,
      canonicalOrigin: "https://example.test",
      log: () => {},
      routes: [{ path: "/no-image", componentPath: path.join(fixtureDir, "FixturePage.jsx"), title: "T", description: "D" }],
    });
    const outHtml = await readFile(path.join(fixtureDir, "no-image.html"), "utf-8");
    expect(outHtml).toContain('og:image" content="https://example.test/repmail-logo.png"');
  });
});
