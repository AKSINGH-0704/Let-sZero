// Audit 230 — guards for the landing page's post-deployment hardening.
//
// Rendered through real SSR (`ssrLoadModule` + `renderToString`), the same
// mechanism `script/prerender.js` uses, so these assertions run against the
// HTML production actually serves before any JavaScript executes. That matters
// for every property here: each one is about what a visitor gets from the
// static document, or about what the stylesheet does when motion is refused.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, html, LEDGER_EVENTS, MARQUEE_CLAIMS;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  const { Router } = await vite.ssrLoadModule("wouter");
  const LandingExperience = (await vite.ssrLoadModule("@marketing/LZ_ledger/LandingExperience")).default;
  ({ LEDGER_EVENTS, MARQUEE_CLAIMS } = await vite.ssrLoadModule("@marketing/LZ_ledger/theme.jsx"));
  html = renderToString(
    React.createElement(Router, { ssrPath: "/" }, React.createElement(LandingExperience)),
  );
}, 60000);

afterAll(async () => {
  await vite?.close();
});

/** The <style> the page emits, isolated from the markup around it. */
function globalSheet() {
  const m = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  expect(m, "the landing page emits no <style> block").toBeTruthy();
  return m[1];
}

/** The body of the `prefers-reduced-motion: reduce` at-rule, brace-matched. */
function reducedMotionBlock() {
  const css = globalSheet();
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  expect(start, "no reduced-motion at-rule in the landing stylesheet").toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error("unterminated reduced-motion at-rule");
}

describe("Audit 230 M3 — reduced motion keeps the ticker's content", () => {
  // Both tracks are far wider than any viewport (measured 7,534px and 6,212px
  // against ~1,280px of visible box). Freezing them inside `overflow: hidden`
  // strands most of the content with no scrollbar and no way to reach it, and
  // what is stranded is the page's product evidence, not decoration.
  it("releases the clip so nothing is stranded outside the box", () => {
    const block = reducedMotionBlock();
    expect(block, "the ticker/marquee clip is never released").toMatch(
      /\.lz-ticker\s*,\s*\.lz-marquee\s*\{[^}]*overflow:\s*visible/,
    );
  });

  it("lets the tracks wrap instead of running off as one line", () => {
    const block = reducedMotionBlock();
    const tracks = block.match(/\.lz-ticker-track\s*,\s*\n?\s*\.lz-marquee-track\s*\{([^}]*)\}/);
    expect(tracks, "no combined rule for the two tracks").toBeTruthy();
    expect(tracks[1]).toMatch(/width:\s*auto/);
    expect(tracks[1]).toMatch(/flex-wrap:\s*wrap/);
    expect(tracks[1]).toMatch(/white-space:\s*normal/);
  });

  it("drops the loop's duplicate copies rather than printing them twice", () => {
    expect(reducedMotionBlock()).toMatch(/\[data-dup\][^{]*\{\s*display:\s*none/);
  });

  it("stops the animation on both tracks", () => {
    expect(reducedMotionBlock()).toMatch(/\.lz-ticker-track\s*,\s*\.lz-marquee-track\s*,[\s\S]*?animation:\s*none/);
  });
});

describe("Audit 230 M3 — the loop's duplicates are marked, not just drawn", () => {
  // The duplicate copies exist so translateX(-50%) lands on an identical frame.
  // They are a rendering device; unmarked, a screen reader reads the whole
  // ledger twice and the static layout prints it twice.
  it("marks every duplicated ledger event as a duplicate and hides it from AT", () => {
    const events = [...html.matchAll(/<span([^>]*)>\s*<span[^>]*>\d{2}:\d{2}:\d{2}</g)].map((m) => m[1]);
    expect(events.length, "ledger ticker did not render").toBeGreaterThan(0);
    const dupes = events.filter((a) => a.includes("data-dup"));
    const originals = events.filter((a) => !a.includes("data-dup"));

    expect(originals.length).toBe(LEDGER_EVENTS.length);
    expect(dupes.length).toBe(LEDGER_EVENTS.length);
    for (const a of dupes) expect(a).toMatch(/aria-hidden="true"/);
  });

  it("marks the marquee's repeat copies and its duplicate row", () => {
    const claims = [...html.matchAll(/<span([^>]*class="lz-mono text-\[12px\][^"]*")/g)].map((m) => m[1]);
    expect(claims.length, "marquee did not render").toBeGreaterThan(0);
    const originals = claims.filter((a) => !a.includes("data-dup"));
    // Two rows are rendered, each carrying one un-duplicated pass of the claims.
    expect(originals.length).toBe(MARQUEE_CLAIMS.length * 2);
    for (const a of claims.filter((x) => x.includes("data-dup"))) {
      expect(a).toMatch(/aria-hidden="true"/);
    }
    expect(html).toMatch(/data-dup-row/);
    expect(reducedMotionBlock()).toMatch(/\.lz-marquee\[data-dup-row\]\s*\{\s*display:\s*none/);
  });
});

describe("Audit 230 M1 — the prerender paints critical content", () => {
  // The same SSR output the browser receives first. These properties are only
  // observable here: once React hydrates, everything ends up visible either
  // way, and the defect was the window before that.
  it("does not hide the header, and so does not hide the primary nav CTA", () => {
    const header = html.match(/<header[^>]*style="([^"]*)"/);
    expect(header, "no header rendered").toBeTruthy();
    expect(header[1], "the header prerenders invisible").not.toMatch(/opacity:\s*0(?!\.)/);
  });

  it("does not hide the hero's supporting paragraph", () => {
    const i = html.indexOf("Your domain&#x27;s reputation");
    expect(i, "hero paragraph not found in the prerendered HTML").toBeGreaterThan(-1);
    const tag = html.lastIndexOf("<p", i);
    const open = html.slice(tag, html.indexOf(">", tag) + 1);
    expect(open, "the hero paragraph prerenders invisible").not.toMatch(/opacity:\s*0(?!\.)/);
  });

  it("ships no full-screen curtain over the page it just painted", () => {
    // The preloader rendered at z-[110] across `fixed inset-0`.
    expect(html).not.toMatch(/z-\[110\]/);
    expect(html).not.toMatch(/OPENING THE LEDGER/);
  });
});
