// M21-G — confirms RepMailChangelog.jsx actually renders the real,
// repo-root RELEASE_NOTES.md content via real SSR — not a fixture, the
// genuine file, since this whole milestone's point is "zero new writing,
// pure reuse."

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { shiftHeadingLevelsDown } from "../../client/src/pages/RepMailChangelog.jsx";

let vite, Router;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ Router } = await vite.ssrLoadModule("wouter"));
});

afterAll(async () => {
  await vite.close();
});

describe("shiftHeadingLevelsDown", () => {
  it("shifts h1-h5 down one level, leaving exactly one h1 on the page (the component's own page header)", () => {
    const input = "<h1>Release Notes</h1><h2>v1.8</h2><h3>Team Plans</h3>";
    const output = shiftHeadingLevelsDown(input);
    expect(output).toBe("<h2>Release Notes</h2><h3>v1.8</h3><h4>Team Plans</h4>");
    expect(output).not.toContain("<h1>");
  });

  it("preserves attributes on the opening tag and doesn't duplicate them onto the closing tag", () => {
    const input = '<h2 id="v1-8">v1.8</h2>';
    const output = shiftHeadingLevelsDown(input);
    expect(output).toBe('<h3 id="v1-8">v1.8</h3>');
  });

  it("does not touch h6 (nothing to shift it down to) or non-heading tags", () => {
    const input = "<h6>Deep heading</h6><p>Some <strong>text</strong>.</p>";
    expect(shiftHeadingLevelsDown(input)).toBe(input);
  });
});

describe("RepMailChangelog", () => {
  it("renders the real content of the repo-root RELEASE_NOTES.md, not a fixture or placeholder", async () => {
    const RepMailChangelog = (await vite.ssrLoadModule("/src/pages/RepMailChangelog.jsx")).default;
    const html = renderToString(
      React.createElement(Router, { ssrPath: "/repmail/changelog" }, React.createElement(RepMailChangelog))
    );

    const realReleaseNotes = await readFile(path.resolve(import.meta.dirname, "..", "..", "RELEASE_NOTES.md"), "utf-8");
    // Pull a real, distinctive heading out of the actual file and confirm
    // it made it into the rendered HTML — proves this is reading the real
    // file, not coincidentally matching on generic words.
    const firstHeading = realReleaseNotes.match(/^##\s+(.+)$/m)?.[1];
    expect(firstHeading).toBeTruthy();
    expect(html).toContain(firstHeading.replace(/&/g, "&amp;"));

    expect(html).toContain('data-testid="changelog-body"');
    // React inserts a <!-- --> hydration-safety comment between adjacent JSX
    // text expressions (the same real React SSR behavior that broke a naive
    // .toContain() assertion in M21-C's tests) — "What's New in " and
    // "{product.name}" are adjacent nodes here, so check them separately
    // rather than as one contiguous string.
    expect(html).toContain("What");
    expect(html).toContain("New in");
    expect(html).toMatch(/RepMail<\/h1>/);
  });
});
