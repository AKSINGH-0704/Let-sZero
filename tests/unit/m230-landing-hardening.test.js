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

/**
 * The hero's right-hand collage: the domain-health card and its two supporting
 * panels. Bounded by the column class and the first section anchor, because
 * the section eyebrows are uppercased by CSS and do not appear as uppercase
 * text in the HTML — matching on "THE PROBLEM" silently selects the whole
 * document instead of the hero.
 */
function heroCollage() {
  const start = html.indexOf("lg:col-span-5");
  expect(start, "hero collage column not found").toBeGreaterThan(-1);
  const end = html.indexOf('id="system"');
  expect(end, "no section anchor to bound the hero").toBeGreaterThan(start);
  return html.slice(start, end);
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

describe("Audit 230 M4 — nav link geometry does not depend on font weight", () => {
  /** The rendered <a> for a nav label, as a string. */
  function navAnchor(label) {
    const all = html.match(/<a[^>]*class="relative inline-flex[\s\S]*?<\/a>/g) || [];
    const hit = all.find((a) => a.includes(label));
    expect(hit, `no nav anchor rendered for ${label}`).toBeTruthy();
    return hit;
  }

  // "How it works" is the only multi-word item, and the only one that broke.
  const LABEL = "How it works";

  it("exposes the label to assistive tech exactly once", () => {
    const a = navAnchor(LABEL);
    const spans = a.match(/<span[^>]*>/g) || [];
    const readable = spans.filter((t) => !t.includes('aria-hidden="true"'));
    expect(readable.length, "more than one readable copy of the label").toBe(1);
    // Three copies are drawn; two of them must be hidden from the name.
    expect((a.match(new RegExp(LABEL, "g")) || []).length).toBe(3);
  });

  it("sizes the anchor from an in-flow copy at the heaviest weight", () => {
    const a = navAnchor(LABEL);
    const sizing = (a.match(/<span[^>]*>/g) || [])[0];
    expect(sizing).toMatch(/aria-hidden="true"/);
    expect(sizing, "the sizing layer is visible").toMatch(/invisible/);
    expect(sizing, "the sizing layer must not wrap").toMatch(/whitespace-nowrap/);
    expect(sizing, "the sizing layer is not the heaviest state").toMatch(/font-medium/);
    expect(sizing, "the sizing layer must stay in flow to give the anchor a width")
      .not.toMatch(/absolute/);
  });

  it("keeps both visible layers out of flow and on one line", () => {
    const a = navAnchor(LABEL);
    const layers = (a.match(/<span[^>]*absolute inset-0[^>]*>/g) || []);
    expect(layers.length).toBe(2);
    for (const l of layers) expect(l).toMatch(/whitespace-nowrap/);
  });

  it("gives a keyboard the same state a mouse gets", () => {
    const a = navAnchor(LABEL);
    // Every hover-driven state change has a focus-visible twin.
    const hovers = (a.match(/group-hover:[a-z-]+(?:-\[?[^\s"']*\]?)?/g) || []);
    expect(hovers.length).toBeGreaterThan(0);
    for (const h of hovers) {
      const twin = h.replace("group-hover:", "group-focus-visible:");
      expect(a, `${h} has no focus-visible equivalent`).toContain(twin);
    }
  });
});

describe("Audit 230 M5 — every interaction affordance is truthful", () => {
  // A `data-cursor` label makes the custom cursor swell into a puck announcing
  // an action. On the hero's two decorative ImageCards it announced "VIEW" for
  // something with no destination and no handler, while `cursor: none` removed
  // the arrow that would have told the truth.
  it("puts a cursor label only on elements that actually do something", () => {
    const tagged = [...html.matchAll(/<(\w+)([^>]*\sdata-cursor="[^"]*"[^>]*)>/g)]
      .map((m) => ({ tag: m[1], attrs: m[2] }));
    expect(tagged.length, "no cursor affordances rendered at all").toBeGreaterThan(0);

    for (const el of tagged) {
      expect(["a", "button"], `<${el.tag}> carries a cursor label but is not a control`)
        .toContain(el.tag);
      if (el.tag === "a") {
        expect(el.attrs, "an anchor carries a cursor label but has no destination")
          .toMatch(/\shref="[^"]+"/);
      }
    }
  });

  it("no longer promises VIEW on the decorative hero imagery", () => {
    expect(html).not.toContain('data-cursor="VIEW"');
  });

  it("leaves the decorative hero imagery inert", () => {
    // M6 went further and removed the decorative image cards altogether, so
    // the strongest form of this guard is that nothing in the hero column is
    // dressed up as interactive at all.
    const collage = heroCollage();
    expect(collage).not.toMatch(/data-cursor/);
    expect(collage, "something decorative claims a pointer").not.toMatch(/cursor-pointer/);
    expect(collage, "something decorative is focusable").not.toMatch(/tabindex="0"/);
  });

  it("keeps a pointer cursor only where there is a destination", () => {
    // `cursor-pointer` appears on the platform cards, but only the ones with
    // an href become anchors at all.
    const pointer = html.match(/<(\w+)([^>]*cursor-pointer[^>]*)>/g) || [];
    for (const el of pointer) {
      expect(el, "cursor-pointer on something with no href").toMatch(/\shref="[^"]+"/);
    }
  });
});

describe("Audit 230 M6 — the hero's supporting visuals are product evidence", () => {
  it("uses no photography in the hero collage", () => {
    // The collage used to hold two stock photographs. Every landing photograph
    // the page still renders belongs to the resource cards, far below.
    const imgs = heroCollage().match(/<img[^>]*src="[^"]*"/g) || [];
    for (const i of imgs) {
      expect(i, "the hero still renders a landing photograph").not.toMatch(/\/images\/landing\//);
    }
  });

  it("no longer references the retired circuit asset anywhere", () => {
    expect(html).not.toContain("circuit.webp");
  });

  it("states only claims the implementation backs", () => {
    // Each of these is read from the sending path or the tracking classifier;
    // see the comment at the call site in Hero.jsx for the source of each.
    for (const line of [
      "Already sent", "Suppressed", "Bounced before", "Complained",
      "Human opens", "Apple MPP", "Gmail proxy", "Link scanners",
    ]) {
      expect(html, `panel line missing: ${line}`).toContain(line);
    }
  });

  it("puts no fabricated counts, customers or uptime in the panels", () => {
    // Text of the two ProductPanels only — the domain-health card beside them
    // carries real thresholds and is audited separately in M8.
    const panels = heroCollage().match(
      /<div class="relative rounded-2xl overflow-hidden flex flex-col[\s\S]*?<\/div><\/div>/g,
    ) || [];
    expect(panels.length, "the product panels did not render").toBe(2);
    const text = panels.join(" ").replace(/<[^>]*>/g, " ");
    expect(text).not.toMatch(/\d{1,3}(,\d{3})+/);
    expect(text).not.toMatch(/\buptime\b/i);
    expect(text).not.toMatch(/\bcustomers?\b/i);
    expect(text, "a panel quotes a percentage it cannot source").not.toMatch(/\d+(\.\d+)?%/);
  });

  it("keeps the panels in the card's design language", () => {
    // Same radius and the same paperHi ground as the domain-health card, so
    // the three read as one system rather than a card between two photos.
    const panel = html.match(/<div class="relative rounded-2xl overflow-hidden flex flex-col[^"]*"[^>]*style="([^"]*)"/);
    expect(panel, "product panel did not render").toBeTruthy();
    expect(panel[1]).toMatch(/background:#FDFBF5/i);
    expect(panel[1]).toMatch(/border:1px solid #15120D1F/i);
  });
});

describe("Audit 230 M7 — in-page anchors clear the fixed header", () => {
  it("reserves room for the header on the scroll container", () => {
    // The header is position:fixed and 73px tall at desktop, 65px at mobile.
    // Without this, every anchor put its target's top edge at viewport 0 and
    // the navigation covered the heading naming the section just jumped to.
    const css = globalSheet();
    const rule = css.match(/html\s*\{([^}]*)\}/);
    expect(rule, "no html rule in the landing sheet").toBeTruthy();
    expect(rule[1], "the scroll container reserves no room for the header")
      .toMatch(/scroll-padding-top:\s*(\d+)px/);
    const base = Number(rule[1].match(/scroll-padding-top:\s*(\d+)px/)[1]);
    expect(base, "reserved room is smaller than the mobile header").toBeGreaterThanOrEqual(65);

    // And a larger reservation once the header grows at md.
    const wide = css.match(/@media \(min-width: 768px\)\s*\{\s*html\s*\{([^}]*)\}/);
    expect(wide, "no wider reservation for the taller desktop header").toBeTruthy();
    const desktop = Number(wide[1].match(/scroll-padding-top:\s*(\d+)px/)[1]);
    expect(desktop, "reserved room is smaller than the desktop header").toBeGreaterThanOrEqual(73);
    expect(desktop).toBeGreaterThanOrEqual(base);
  });

  it("still scrolls smoothly rather than jumping", () => {
    expect(globalSheet()).toMatch(/scroll-behavior:\s*smooth/);
  });
});

describe("Audit 230 M8 — the domain card reads as an example, not as your data", () => {
  it("does not claim to have inspected the reader's domain", () => {
    // Nothing on a public marketing page has looked at the visitor's domain,
    // and this page has no way to. The figures under this heading are static
    // literals in Hero.jsx.
    expect(html).not.toMatch(/YOUR DOMAIN, RIGHT NOW/i);
  });

  it("says plainly that the view is an example", () => {
    expect(html).toContain("EXAMPLE DOMAIN VIEW");
  });

  it("tells assistive tech which numbers are illustrative and which are real", () => {
    const note = html.match(/<p class="sr-only">([\s\S]*?)<\/p>/);
    expect(note, "no clarification for screen readers").toBeTruthy();
    expect(note[1]).toMatch(/illustrative/i);
  });

  it("keeps the thresholds that production actually runs on", () => {
    // Verified against Railway on 2026-09-20:
    //   COMPLAINT_RATE_PAUSE_THRESHOLD = 0.0005  -> 0.05%
    //   BOUNCE_RATE_PAUSE_THRESHOLD    = 0.03    -> 3%
    //   SES_RATE_PER_SECOND unset                -> code default 14
    //   AUDIT_LOG_RETENTION_DAYS unset           -> code default 180
    expect(html).toContain("auto-pause at 0.05%");
    expect(html).toContain("auto-pause at 3%");
    expect(html).toContain("14/sec");
    expect(html).toContain("account ceiling, matched to SES");
    expect(html).toContain("180 days");
  });

  it("states no threshold the configuration contradicts", () => {
    // The incoming design carried 0.1% and 8%. Those are the code defaults,
    // not the live values, and both are looser than what production enforces.
    expect(html).not.toMatch(/auto-pause at 0\.1%/);
    expect(html).not.toMatch(/auto-pause at 8%/);
  });
});
