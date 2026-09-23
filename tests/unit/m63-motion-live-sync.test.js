// M63 — the landing page's reduced-motion read must track the preference
// while the page is open.
//
// The defect these guard: framer's `useReducedMotion()` resolves the media
// query once and never revisits it. Measured against production, flipping the
// OS setting on an open page fired `change` on a listener registered against
// the same MediaQueryList and flipped the stylesheet inside 500ms, while the
// hook's value stayed put at 500ms, 1.5s, 4s and across a resize. That left
// three states contradicting the screen:
//
//   * ten Aurora blobs and the hero's scroll cue kept moving after a switch TO
//     reduced motion — framer drives those on its own rAF loop, which no
//     stylesheet rule reaches — while the pause control unmounted, so the
//     motion could not be stopped by hand either;
//   * the tickers started after a switch AWAY from reduced motion with no
//     pause control present, which is the WCAG 2.2.2 mechanism Audit 235 added;
//   * a "Pause motion" button offering to pause loops the sheet had removed.
//
// The suite has no DOM environment (vitest runs `environment: "node"`, and
// jsdom/@testing-library are not installed), so a mounted-component test is not
// available here. These assertions therefore cover what is checkable without
// one — the SSR contract, the shipped hook's subscription, and the binding that
// reaches every infinite loop. The behavioural proof is the CDP run recorded in
// the M63 report, which was mutation-tested: the same probe reads
// blobs=10/10 + controls=2 against unfixed production and blobs=0/10 +
// controls=0 against this build after an identical flip.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import fs from "node:fs";
import path from "node:path";

const LEDGER = path.resolve(import.meta.dirname, "../../marketing/LZ_ledger");
const read = (f) => fs.readFileSync(path.join(LEDGER, f), "utf8");

let vite, html, theme;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  const { Router } = await vite.ssrLoadModule("wouter");
  const LandingExperience = (await vite.ssrLoadModule("@marketing/LZ_ledger/LandingExperience")).default;
  theme = await vite.ssrLoadModule("@marketing/LZ_ledger/theme.jsx");
  html = renderToString(
    React.createElement(Router, { ssrPath: "/" }, React.createElement(LandingExperience)),
  );
}, 60000);

afterAll(async () => {
  await vite?.close();
});

/**
 * Which reduced-motion hook the identifier `name` was last bound from before
 * `pos`. Scope-correct where it matters: theme.jsx binds `reduce` from framer
 * in Reveal/Counter/Tilt and from the live hook in Aurora, so a file-wide
 * search would answer for the wrong function. Taking the nearest declaration
 * above the use site picks the enclosing one.
 */
function bindingFor(src, name, pos) {
  const before = src.slice(0, pos);
  const live = before.lastIndexOf(`const ${name} = useReducedMotionLive()`);
  const oneShot = before.lastIndexOf(`const ${name} = useReducedMotion()`);
  if (live === -1 && oneShot === -1) return null;
  return live > oneShot ? "live" : "one-shot";
}

/** Every `repeat: Infinity` loop, with the identifiers guarding it. */
function infiniteLoops(file) {
  const src = read(file);
  const lines = src.split("\n");
  const out = [];
  lines.forEach((line, i) => {
    if (!/repeat:\s*Infinity/.test(line)) return;
    // The guard is either on the same line (`animate={x || paused ? ...}`) or
    // on the conditional wrapper a few lines above (`{!x && (`). Eight lines
    // covers both shapes as written; a loop guarded from further away would
    // read as unguarded here, which fails loudly rather than passing quietly.
    const window = lines.slice(Math.max(0, i - 8), i + 1).join("\n");
    const pos = src.indexOf(line);
    const guards = new Set();
    for (const m of window.matchAll(/animate=\{\s*!?([A-Za-z_$][\w$]*)/g)) guards.add(m[1]);
    for (const m of window.matchAll(/\{\s*!([A-Za-z_$][\w$]*)\s*&&/g)) guards.add(m[1]);
    out.push({ file, line: i + 1, text: line.trim(), guards: [...guards], pos, src });
  });
  return out;
}

const LOOP_FILES = ["Hero.jsx", "Sections.jsx", "theme.jsx", "fx.jsx", "Closing.jsx"];

describe("M63 — infinite framer loops read a live reduced-motion value", () => {
  it("finds the loops it is meant to be guarding", () => {
    const loops = LOOP_FILES.flatMap(infiniteLoops);
    // Aurora's blobs, the hero scroll cue and the pipeline scan dot. If this
    // count moves, a loop was added or removed and the guard below needs to
    // have been considered for it.
    expect(loops.length, "no infinite framer loops found — the scan is broken").toBeGreaterThanOrEqual(3);
  });

  it("gates every infinite loop on a reduced-motion value that tracks changes", () => {
    const offenders = [];
    for (const loop of LOOP_FILES.flatMap(infiniteLoops)) {
      // `paused` is the M61 attribute, not a reduced-motion read; only the
      // reduced-motion identifiers are in question here.
      const motionGuards = loop.guards.filter((g) => /reduce/i.test(g));
      if (motionGuards.length === 0) {
        offenders.push(`${loop.file}:${loop.line} — no reduced-motion guard at all`);
        continue;
      }
      for (const g of motionGuards) {
        const kind = bindingFor(loop.src, g, loop.pos);
        if (kind !== "live") {
          offenders.push(`${loop.file}:${loop.line} — \`${g}\` is bound from ${kind ?? "nothing"}, not useReducedMotionLive()`);
        }
      }
    }
    expect(offenders, "an infinite loop reads a reduced-motion value that never updates").toEqual([]);
  });
});

describe("M63 — the live hook's subscription contract", () => {
  it("is exported and callable", () => {
    expect(typeof theme.useReducedMotionLive, "useReducedMotionLive is not exported").toBe("function");
  });

  it("subscribes to the MediaQueryList change event and unsubscribes", () => {
    const src = theme.useReducedMotionLive.toString();
    expect(src, "the hook never listens for a preference change").toMatch(
      /addEventListener\(\s*["']change["']/,
    );
    expect(src, "the hook never removes its listener, so a remount stacks them").toMatch(
      /removeEventListener\(\s*["']change["']/,
    );
  });

  it("watches rather than polls", () => {
    const src = theme.useReducedMotionLive.toString();
    // M63's brief is explicit: no polling, no timers, no rAF. The whole point
    // of the media query is that it pushes.
    for (const banned of ["setInterval", "setTimeout", "requestAnimationFrame"]) {
      expect(src, `the hook polls with ${banned}`).not.toContain(banned);
    }
  });
});

describe("M63 — the prerender contract is unchanged", () => {
  it("still ships no pause control in the static document", () => {
    // MotionToggle is gated behind useMounted(), so the prerendered HTML has
    // no button and React's first client pass agrees with it. The live hook
    // falls back to framer's value until its effect runs precisely so this
    // stays true; a hook that read matchMedia during render would break it.
    expect(html).not.toMatch(/aria-label="(Pause|Play) motion"/);
  });

  it("still renders both tracks into the static document", () => {
    expect(html).toMatch(/lz-ticker-track/);
    expect(html).toMatch(/lz-marquee-track/);
  });
});

describe("M63 — the M61/Audit 235 contract was not touched", () => {
  const sheet = () => read("fx.jsx");

  it("keeps the reduced-motion branch stopping both tracks", () => {
    expect(sheet()).toMatch(/\.lz-ticker-track,\s*\.lz-marquee-track,[\s\S]*?animation:\s*none/);
  });

  it("keeps the in-content pause rule driving off the html attribute", () => {
    expect(sheet()).toMatch(/html\[data-motion-paused\]\s*\[data-ambient\]\s*\{\s*animation-play-state:\s*paused\s*!important/);
  });

  it("keeps the ticker and marquee at the speeds M61 measured", () => {
    expect(sheet()).toMatch(/\.lz-ticker-track\s+\{\s*animation:\s*lz-ticker\s+44s\s+linear\s+infinite/);
    expect(sheet()).toMatch(/\.lz-marquee-track\s+\{\s*animation:\s*lz-ticker\s+28s\s+linear\s+infinite/);
  });
});
