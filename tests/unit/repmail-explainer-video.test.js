// RepMail explainer video — prerender behaviour, asset integrity, placement.
//
// Rendered through real SSR (`ssrLoadModule` + `renderToString`), the same
// mechanism script/prerender.js uses, so what is asserted about the markup is
// what a visitor and a crawler receive before any JavaScript runs.
//
// The property that matters most is a NETWORK one: a ~29MB narrated video must
// cost nothing until someone presses play. In the prerendered markup that means
// the <video> has no src and no <source> — an element with nothing to load
// cannot fetch, whatever a browser does with `preload`. The click-time
// behaviour (src assigned, play() inside the gesture, end card, chapters) is
// verified in a real browser; this environment has no DOM.
//
// The asset checks read the actual bytes: the MP4's own `mvhd` box is the
// authority for the duration the page advertises, and `moov` must precede
// `mdat` or playback cannot begin until the whole file has downloaded.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicFile = (url) => path.join(root, "client/public", url.replace(/^\//, ""));

let vite, ProductVideo, toSeconds, EXPLAINER, homeHtml, repmailHtml, playerHtml;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  const { Router } = await vite.ssrLoadModule("wouter");
  const pv = await vite.ssrLoadModule("@/components/marketing/ProductVideo");
  ProductVideo = pv.default;
  toSeconds = pv.toSeconds;
  EXPLAINER = (await vite.ssrLoadModule("@/components/marketing/repmailExplainer")).REPMAIL_EXPLAINER;
  const LandingExperience = (await vite.ssrLoadModule("@marketing/LZ_ledger/LandingExperience")).default;
  const Landing = (await vite.ssrLoadModule("@/pages/Landing")).default;
  const at = (p, C) => renderToString(React.createElement(Router, { ssrPath: p }, React.createElement(C)));
  homeHtml = at("/", LandingExperience);
  repmailHtml = at("/products/repmail", Landing);
  playerHtml = renderToString(React.createElement(ProductVideo, EXPLAINER));
}, 60000);

afterAll(async () => {
  await vite?.close();
});

const videoTags = (html) => html.match(/<video\b[^>]*>/g) ?? [];
const count = (html, re) => (html.match(re) ?? []).length;

/** Top-level ISO-BMFF boxes as [type, offset, size]. */
function boxes(buf) {
  const out = [];
  for (let off = 0; off < buf.length; ) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString("latin1", off + 4, off + 8);
    if (size === 1) size = Number(buf.readBigUInt64BE(off + 8));
    if (size === 0) size = buf.length - off;
    out.push([type, off, size]);
    off += size;
  }
  return out;
}

/** The MP4's own duration in seconds, from its `mvhd` box. */
function mp4Seconds(buf) {
  const [, moovOff] = boxes(buf).find(([t]) => t === "moov");
  const mvhd = buf.indexOf("mvhd", moovOff, "latin1") - 4;
  const version = buf[mvhd + 8];
  const timescale = buf.readUInt32BE(mvhd + (version === 1 ? 28 : 20));
  const duration = version === 1 ? Number(buf.readBigUInt64BE(mvhd + 32)) : buf.readUInt32BE(mvhd + 24);
  return duration / timescale;
}

describe("the player costs nothing until someone presses play", () => {
  it("prerenders exactly one <video>, with no source to fetch", () => {
    const tags = videoTags(playerHtml);
    expect(tags).toHaveLength(1);
    expect(tags[0]).not.toMatch(/\ssrc=/);
    expect(playerHtml).not.toMatch(/<source\b/);
    expect(playerHtml).not.toContain(EXPLAINER.src);
  });

  it("never autoplays, loops or mutes, and asks the browser to preload nothing", () => {
    const [tag] = videoTags(playerHtml);
    expect(tag).toMatch(/preload="none"/);
    expect(tag).not.toMatch(/\sautoplay|\sloop|\smuted/i);
    expect(tag).toMatch(/playsinline/i);
    // Controls appear only once the visitor has started it; before that the
    // element is inert and hidden from assistive tech behind the play button.
    expect(tag).not.toMatch(/\scontrols/);
    expect(tag).toMatch(/aria-hidden="true"/);
    expect(tag).toMatch(/tabindex="-1"/);
  });

  it("keeps the poster out of the prerendered markup entirely", () => {
    // Native loading="lazy" was measured to fetch it inside the critical
    // window on a phone (+~250ms text LCP on Slow 4G), so the <img> is only
    // attached client-side when the player nears the viewport — and the
    // eager `poster` attribute is never prerendered either.
    const [tag] = videoTags(playerHtml);
    expect(tag).not.toMatch(/\sposter=/);
    expect(playerHtml).not.toMatch(/<img\b/);
    expect(playerHtml).not.toContain("repmail-explainer-poster");
  });

  it("the deferred poster still declares a srcset whose candidates exist and a 16:9 intrinsic size", () => {
    expect(EXPLAINER.poster.width / EXPLAINER.poster.height).toBeCloseTo(16 / 9, 3);
    expect(EXPLAINER.poster.srcSet).toMatch(/960w.*1920w/);
  });

  it("reserves 16:9 before anything loads, so neither poster nor video can shift the page", () => {
    expect(playerHtml).toMatch(/data-product-video=""[^>]*class="[^"]*\[aspect-ratio:16\/9\]/);
  });
});

describe("the play control is one honest, named button", () => {
  const button = () => playerHtml.match(/<button\b[^>]*aria-label="Play[^"]*"[^>]*>([\s\S]*?)<\/button>/);

  it("names what plays, how long it is, and that it is narrated", () => {
    const m = button();
    expect(m).toBeTruthy();
    expect(m[0]).toContain(`aria-label="Play ${EXPLAINER.title} — ${EXPLAINER.duration} with narration"`);
    expect(m[0]).toMatch(/type="button"/);
  });

  it("contains no nested interactive element", () => {
    const inner = button()[1];
    expect(inner).not.toMatch(/<(a|button|input|select|textarea|video)\b/);
  });

  it("shows the visible duration label", () => {
    expect(button()[1]).toContain(`>${EXPLAINER.durationLabel}<`);
  });

  // A prerendered `default` track is fetched at page load (measured in Chrome:
  // twice, before any interaction). The track is attached in the browser when
  // the player nears the viewport, like the poster — so the markup has none.
  // That it then shows and syncs during playback is verified in a real browser.
  it("captions are configured but not in the prerendered markup", () => {
    expect(EXPLAINER.captionsSrc).toMatch(/^\/media\/.+\.vtt$/);
    expect(playerHtml).not.toMatch(/<track\b/);
    expect(homeHtml).not.toMatch(/<track\b/);
    expect(repmailHtml).not.toMatch(/<track\b/);
  });

  // Whatever VTT is wired must be one the browser will actually parse, and must
  // fit the video it captions: a cue past the end, or out of order, is a file
  // written for a different cut (the 2026-10-18 VTT was, against the first
  // export — every cue after 1:48 was ~7s early; against the 2026-10-25 cut it
  // ran ~10s past the end).
  it("the captions file is served, valid WebVTT, ordered, and inside the video", () => {
    const vtt = readFileSync(publicFile(EXPLAINER.captionsSrc), "utf8");
    expect(vtt).toMatch(/^WEBVTT(?:[ \t][^\n]*)?\n/);
    const t = (s) => s.split(":").reduce((a, x) => a * 60 + Number(x), 0);
    const cues = [...vtt.matchAll(/^(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})\n(.+)/gm)].map((m) => ({
      start: t(m[1]),
      end: t(m[2]),
      text: m[3],
    }));
    expect(cues.length).toBeGreaterThan(40);
    for (let i = 0; i < cues.length; i++) {
      expect(cues[i].end).toBeGreaterThan(cues[i].start);
      if (i) expect(cues[i].start).toBeGreaterThanOrEqual(cues[i - 1].end);
    }
    expect(cues.at(-1).end).toBeLessThanOrEqual(mp4Seconds(readFileSync(publicFile(EXPLAINER.src))));
    expect(vtt).not.toMatch(/repmail\.com/i);
  });

  // Narration earlier cuts carried and the current one does not, because the
  // product does not do it: RepMail asks for three DKIM CNAMEs (not SPF and
  // DMARC), sends the template with plain field merges (no per-email wording),
  // and scores the template (not each outgoing email).
  it("the captions carry none of the narration that was cut for overstating the product", () => {
    const vtt = readFileSync(publicFile(EXPLAINER.captionsSrc), "utf8");
    expect(vtt).not.toMatch(/SPF, DKIM and DMARC/);
    expect(vtt).not.toMatch(/shifts from one email to the next/);
    expect(vtt).not.toMatch(/Every email is scored/);
    expect(vtt).not.toMatch(/\{\{role\}\}/);
    expect(vtt).not.toMatch(/Repmail/);
  });
});

describe("chapters", () => {
  it("parse to ascending start times inside the video", () => {
    const secs = EXPLAINER.chapters.map((c) => toSeconds(c.at));
    expect(secs[0]).toBe(0);
    for (let i = 1; i < secs.length; i++) expect(secs[i]).toBeGreaterThan(secs[i - 1]);
    expect(secs.at(-1)).toBeLessThan(toSeconds(EXPLAINER.durationLabel));
    expect(toSeconds("2:00")).toBe(120);
  });

  it("each renders as a button that says where it plays from", () => {
    // React's SSR separates adjacent text nodes with <!-- -->; the browser
    // reads them as one string, so the assertion does too.
    const text = playerHtml.replace(/<!-- -->/g, "");
    for (const c of EXPLAINER.chapters) {
      expect(text).toContain(`Play from ${c.at}: </span>${c.label}`);
    }
  });
});

describe("the assets the pages reference are the ones on disk", () => {
  const mp4 = () => readFileSync(publicFile(EXPLAINER.src));

  it("the MP4 is fast-start: moov precedes mdat", () => {
    const types = boxes(mp4()).map(([t]) => t);
    expect(types[0]).toBe("ftyp");
    expect(types.indexOf("moov")).toBeGreaterThan(-1);
    expect(types.indexOf("moov")).toBeLessThan(types.indexOf("mdat"));
  });

  it("the advertised duration is the file's own (mvhd), to the second", () => {
    const secs = Math.round(mp4Seconds(mp4()));
    expect(secs).toBe(toSeconds(EXPLAINER.durationLabel));
    const spoken = `${Math.floor(secs / 60)} minutes${secs % 60 ? ` ${secs % 60} seconds` : ""}`;
    expect(spoken).toBe(EXPLAINER.duration);
  });

  it("the MP4 stays inside its budget (well under GitHub's 50MB warning)", () => {
    expect(statSync(publicFile(EXPLAINER.src)).size).toBeLessThan(32_000_000);
  });

  it.each(["/media/repmail-explainer-poster-960.webp", "/media/repmail-explainer-poster-1920.webp"])(
    "%s is a real WebP and small",
    (url) => {
      const buf = readFileSync(publicFile(url));
      expect(buf.subarray(0, 4).toString()).toBe("RIFF");
      expect(buf.subarray(8, 12).toString()).toBe("WEBP");
      expect(buf.length).toBeLessThan(60_000);
    },
  );

  it("every srcset candidate exists", () => {
    for (const cand of EXPLAINER.poster.srcSet.split(",")) {
      const url = cand.trim().split(/\s+/)[0];
      expect(statSync(publicFile(url)).size).toBeGreaterThan(0);
    }
  });
});

describe("placement — LetsZero homepage", () => {
  it("has one player, directly after the hero and before section 02", () => {
    expect(videoTags(homeHtml)).toHaveLength(1);
    const h1 = homeHtml.indexOf("<h1");
    const walk = homeHtml.indexOf('id="walkthrough"');
    const problem = homeHtml.indexOf("The problem");
    expect(h1).toBeGreaterThan(-1);
    expect(walk).toBeGreaterThan(h1);
    expect(problem).toBeGreaterThan(walk);
  });

  it("the hero is unchanged: its primary CTA still leads to the product", () => {
    expect(homeHtml.slice(0, homeHtml.indexOf('id="walkthrough"'))).toContain("Explore RepMail");
    expect(count(homeHtml, /id="walkthrough"/g)).toBe(1);
  });

  it("frames the video as RepMail inside the platform, not as the platform", () => {
    const section = homeHtml.slice(homeHtml.indexOf('id="walkthrough"'), homeHtml.indexOf("The problem"));
    expect(section).toContain("Inside RepMail");
    // No chapter list on the platform page.
    expect(section).not.toMatch(/Chapters in /);
  });
});

describe("placement — RepMail product page", () => {
  it("has one player, in the slot under the hero, with chapters", () => {
    expect(videoTags(repmailHtml)).toHaveLength(1);
    const h1 = repmailHtml.indexOf("<h1");
    const walk = repmailHtml.indexOf('id="walkthrough"');
    const how = repmailHtml.indexOf("How It Works");
    expect(walk).toBeGreaterThan(h1);
    expect(how).toBeGreaterThan(walk);
    expect(repmailHtml).toContain(`aria-label="Chapters in ${EXPLAINER.title}"`);
  });

  it("replaces the illustrative dashboard mockup rather than stacking a second hero visual", () => {
    expect(repmailHtml).not.toContain("app.repmail.com");
    expect(repmailHtml).not.toContain("28,543");
  });

  it("the hero offers the walkthrough as a plain link that works without JavaScript", () => {
    const hero = repmailHtml.slice(repmailHtml.indexOf("<h1"), repmailHtml.indexOf('id="walkthrough"'));
    expect(hero).toMatch(/<a[^>]*href="#walkthrough"[^>]*>[\s\S]*?Watch the 3-min walkthrough/);
    // The primary conversion path is untouched and still comes first.
    expect(hero.indexOf("Start Free Trial")).toBeGreaterThan(-1);
    expect(hero.indexOf("Start Free Trial")).toBeLessThan(hero.indexOf("Watch the 3-min walkthrough"));
  });
});
