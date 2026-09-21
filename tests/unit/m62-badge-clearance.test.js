// M62 — the hero rotating badge must clear the xl supporting panel.
//
// Rendered through real SSR (`ssrLoadModule` + `renderToString`), the same
// mechanism `script/prerender.js` uses, so the numbers asserted here are the
// ones production actually ships.
//
// This is deliberately NOT a pixel test. Every term below is read back out of
// the rendered artefact — the badge's own offsets and size, the panel's offset
// and its painted ring, and the float amplitude out of the stylesheet's own
// keyframes — and then the clearance is computed. If anyone moves the badge,
// moves the panel, resizes either, widens the ring or increases the float, the
// arithmetic changes and this goes red. Matching a class string would not.
//
// The defect it protects against: both elements are anchored to the same
// column's right edge, but the panel only exists from `xl` up, so the badge's
// `lg` position was inherited into a breakpoint that fills that space. Measured
// on production at 1280/1366/1440/1600/1920 the overlap was 18.6px at every
// width, worst at the top of the float.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, html;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  const { Router } = await vite.ssrLoadModule("wouter");
  const LandingExperience = (await vite.ssrLoadModule("@marketing/LZ_ledger/LandingExperience")).default;
  html = renderToString(
    React.createElement(Router, { ssrPath: "/" }, React.createElement(LandingExperience)),
  );
}, 60000);

afterAll(async () => {
  await vite?.close();
});

/** Tailwind spacing step -> px. `-top-8` is -32px, `top-16` is 64px. */
const STEP_PX = 4;

/** The element whose class list contains `needle`, as a raw tag string. */
function tagWithClass(needle) {
  const re = new RegExp(`<[a-z]+[^>]*class="[^"]*${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*"[^>]*>`, "i");
  const m = html.match(re);
  expect(m, `no element carrying "${needle}" in the rendered hero`).toBeTruthy();
  return m[0];
}

function classesOf(tag) {
  return tag.match(/class="([^"]*)"/)[1].split(/\s+/);
}

/**
 * The vertical offset a class list declares at a given breakpoint, in px.
 * `xl` falls back to the unprefixed value, which is exactly the inheritance
 * that produced the defect — so if the `xl:` override is deleted this returns
 * the `lg` value and the clearance assertion fails, rather than silently
 * finding nothing to check.
 */
function topOffsetPx(classes, breakpoint) {
  const prefix = breakpoint ? `${breakpoint}:` : "";
  const re = new RegExp(`^${prefix}(-?)top-(\\d+)$`);
  for (const c of classes) {
    const m = c.match(re);
    if (m) return (m[1] === "-" ? -1 : 1) * Number(m[2]) * STEP_PX;
  }
  return breakpoint ? topOffsetPx(classes, null) : null;
}

describe("M62 — hero rotating badge clears the xl supporting panel", () => {
  it("the badge and the panel it must avoid are both present and anchored right", () => {
    const badgeWrap = tagWithClass("-top-8");
    expect(classesOf(badgeWrap)).toContain("right-0");
    expect(classesOf(badgeWrap)).toContain("absolute");

    const panelWrap = tagWithClass("xl:block");
    expect(classesOf(panelWrap)).toContain("absolute");
    expect(classesOf(panelWrap)).toContain("hidden"); // only from xl up
  });

  it("at xl the badge's visible circle clears the panel's float envelope", () => {
    const badgeWrap = tagWithClass("-top-8");
    const panelWrap = tagWithClass("xl:block");

    const badgeTop = topOffsetPx(classesOf(badgeWrap), "xl");
    const panelTop = topOffsetPx(classesOf(panelWrap), "xl");
    expect(badgeTop, "badge has no vertical offset").not.toBeNull();
    expect(panelTop, "panel has no vertical offset").not.toBeNull();

    // Badge size is declared inline by RotatingBadge; the visible ink is the
    // inscribed circle, so the box height is the right term. Rotation grows the
    // axis-aligned box to 141px but moves no ink, so it is correctly absent.
    const badgeTag = tagWithClass("lz-badge-spin");
    const size = Number(badgeTag.match(/width:\s*(\d+)px/)[1]);
    expect(size).toBeGreaterThan(0);

    // The panel paints a solid ring outside its box (`0 0 0 Npx`), so its
    // visual top edge is that much higher than its layout box.
    const ring = Number(html.match(/box-shadow:[^;"]*?0 0 0 (\d+)px/)[1]);

    // ...and `lz-float` lifts it by the keyframe's own translate.
    const floatRise = Math.abs(
      Number(html.match(/@keyframes lz-float[\s\S]*?translateY\(\s*(-\d+)px\s*\)/)[1]),
    );

    const badgeBottom = badgeTop + size;
    const panelVisualTop = panelTop - ring - floatRise;
    const clearance = panelVisualTop - badgeBottom;

    // Production measured -18.6px before this fix and +13.1px after. Require a
    // real gap, not merely "not touching": a 0px result is a design that has
    // already drifted back to the edge of the defect.
    expect(
      clearance,
      `badge bottom ${badgeBottom}px vs panel painted top ${panelVisualTop}px ` +
        `(top ${panelTop} - ring ${ring} - float ${floatRise}) = ${clearance}px`,
    ).toBeGreaterThanOrEqual(8);
  });

  it("below xl, where the panel does not exist, the badge keeps its original position", () => {
    // The fix must not move the badge at `lg`, where that space is empty and
    // -32px is the designed placement.
    const classes = classesOf(tagWithClass("-top-8"));
    expect(topOffsetPx(classes, null)).toBe(-32);
  });
});
