// M58 / IDENT-010 + A11Y-002 — no interactive control lives in a dialog's
// DESCRIPTION, and the two highest-stakes confirmations are readable by ear.
//
// ── THE DEFECT CLASS ────────────────────────────────────────────────────────
// `AlertDialogDescription` / `DialogDescription` render the element that the
// dialog's `aria-describedby` points at. Putting controls and long copy inside
// that slot means a screen reader announces the entire thing as the dialog's
// "description" on open, before the customer can interact with anything — on the
// two screens in this product where money and access change hands.
//
// ── AND A WORSE ONE, FOUND WHILE FIXING IT ──────────────────────────────────
// `<AlertDialogDescription asChild>` wrapping a COMPONENT (rather than a DOM
// element) was not merely verbose: Radix renders the description as
// `<Primitive.p id={context.descriptionId} …>`, and `asChild` clones the child
// with that `id`. A function component that does not spread its props — which
// SeatChangeSummary and OwnershipTransferSummary both deliberately do not — drops
// it. The id never reached the DOM, so the dialog's `aria-describedby` pointed at
// nothing at all. Radix's own DescriptionWarning checks exactly this
// (`document.getElementById(descriptionId)`), which means the seat-change dialog
// had been logging that warning in development since M52.
//
// The guard below therefore bans BOTH shapes on the dialogs it governs: no
// interactive controls in a description, and no `asChild` component in one.
// It reads source rather than a rendered tree because Radix dialog content is
// portaled and needs a DOM, and this repository's harness is SSR renderToString.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFile(join(root, p), "utf8");

/** Every client source file. */
async function clientSources() {
  const out = [];
  async function walk(rel) {
    for (const e of await readdir(join(root, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === "content") continue;   // prose, not UI
        await walk(p);
      } else if (/\.jsx?$/.test(e.name)) {
        out.push(p);
      }
    }
  }
  await walk("client/src");
  return out;
}

/**
 * Every `<AlertDialogDescription …>…</AlertDialogDescription>` /
 * `<DialogDescription …>…</DialogDescription>` block in a source file, as
 * { file, tag, open, inner }.
 *
 * Deliberately a scan and not a parse: the shapes being banned are visible in
 * the opening tag and the immediate body, and a regex that a future engineer can
 * read and adjust is worth more here than an AST they will not touch.
 */
function descriptionBlocks(file, src) {
  const out = [];
  const re = /<((?:Alert)?DialogDescription)([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(src))) out.push({ file, tag: m[1], open: m[2], inner: m[3] });
  // Self-closing descriptions carry no body and cannot hold a control.
  return out;
}

// Interactive by role. `Select`/`Input`/`Checkbox`/`RadioGroup` are this repo's
// shared primitives; the bare HTML forms catch a hand-rolled control.
const INTERACTIVE = [
  /<(Select|SelectTrigger|Input|Textarea|Checkbox|Switch|RadioGroup|Slider|Button)\b/,
  /<(input|select|textarea|button)\b/,
  /\brole="(radiogroup|checkbox|button|combobox|switch|slider|tab)"/,
];

let sources;
beforeAll(async () => {
  const files = await clientSources();
  sources = await Promise.all(files.map(async (f) => ({ file: f, src: await read(f) })));
}, 60000);

describe("no dialog describes itself with a control", () => {
  it("finds description blocks at all (the guard is not vacuous)", () => {
    const blocks = sources.flatMap(({ file, src }) => descriptionBlocks(file, src));
    // If a refactor renames the primitive, this fails loudly instead of the
    // guard silently passing over zero blocks forever.
    expect(blocks.length).toBeGreaterThan(8);
  });

  it("puts no interactive control inside aria-describedby", () => {
    const offenders = [];
    for (const { file, src } of sources) {
      for (const b of descriptionBlocks(file, src)) {
        const hit = INTERACTIVE.find((re) => re.test(b.inner));
        if (hit) offenders.push(`${file}: <${b.tag}> contains ${hit}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("never uses `asChild` on a description to wrap a component", () => {
    // The id-dropping shape. A DOM element child is fine — it receives the id —
    // so only a capitalised (component) first child is rejected.
    const offenders = [];
    for (const { file, src } of sources) {
      for (const b of descriptionBlocks(file, src)) {
        if (!/\basChild\b/.test(b.open)) continue;
        const firstTag = b.inner.match(/<\s*([A-Za-z][\w.]*)/);
        if (firstTag && /^[A-Z]/.test(firstTag[1])) {
          offenders.push(`${file}: <${b.tag} asChild> wraps <${firstTag[1]}>, which drops the description id`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("the ownership-transfer dialog is structured for a screen reader", () => {
  let src;
  beforeAll(async () => { src = await read("client/src/pages/TeamMembers.jsx"); });

  it("keeps the teammate picker out of the description", () => {
    const blocks = descriptionBlocks("TeamMembers.jsx", src);
    expect(blocks.some((b) => /select-transfer-to/.test(b.inner))).toBe(false);
    expect(src).toContain('data-testid="select-transfer-to"');   // still there, just moved
  });

  it("still has a short, static description for aria-describedby", () => {
    const blocks = descriptionBlocks("TeamMembers.jsx", src);
    const transfer = blocks.find((b) => /takes over this workspace/.test(b.inner));
    expect(transfer, "the transfer dialog lost its description entirely").toBeTruthy();
    expect(transfer.inner.trim().length).toBeLessThan(200);
  });

  it("moves initial focus to the control that unblocks the customer", () => {
    // The confirm button is disabled until a teammate is chosen, so landing on
    // Cancel gives a keyboard user nothing to do.
    expect(src).toMatch(/onOpenAutoFocus/);
    expect(src).toMatch(/transferSelectRef\.current\.focus\(\)/);
  });

  it("explains a disabled control where the control is, not after it", () => {
    // A disabled button is not focusable; an explanation in a sibling paragraph
    // is never reached by anyone tabbing the page.
    expect(src).toMatch(/description=\{\s*\n?\s*transferCandidates\.length === 0/);
  });
});

describe("the seat-change confirmation is structured for a screen reader", () => {
  let src;
  beforeAll(async () => { src = await read("client/src/pages/TeamSeats.jsx"); });

  it("keeps the renewal choice out of the description", () => {
    const blocks = descriptionBlocks("TeamSeats.jsx", src);
    expect(blocks.some((b) => /SeatChangeSummary/.test(b.inner))).toBe(false);
    expect(src).toContain("<SeatChangeSummary");                 // still rendered
  });

  it("still has a short, static description", () => {
    const blocks = descriptionBlocks("TeamSeats.jsx", src);
    const confirm = blocks.find((b) => /before you confirm/.test(b.inner));
    expect(confirm, "the seat-change dialog lost its description entirely").toBeTruthy();
    expect(confirm.inner.trim().length).toBeLessThan(200);
  });
});

// ── Rendered evidence ───────────────────────────────────────────────────────
// M50-C: a UI change is not verified until it has been rendered and looked at.
// Both summaries are plain components, so the SSR harness can render them and
// the markup can be asserted rather than the source.
describe("rendered: the summaries carry real semantics", () => {
  let vite, Ownership, SeatChange;
  beforeAll(async () => {
    vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
    Ownership = (await vite.ssrLoadModule("/src/components/teams/OwnershipTransferSummary.jsx")).default;
    SeatChange = (await vite.ssrLoadModule("/src/components/teams/SeatChangeSummary.jsx")).default;
  }, 60000);
  afterAll(async () => { await vite?.close(); });

  it("groups the transfer consequences under real headings", () => {
    const html = renderToStaticMarkup(React.createElement(Ownership, { newOwnerName: "Ravi" }));
    // Styled paragraphs are invisible to a listener skimming for structure.
    expect(html).toMatch(/<h3[^>]*>What changes<\/h3>/);
    expect(html).toMatch(/<h3[^>]*>What stays exactly as it is<\/h3>/);
    expect(html).toMatch(/<section[^>]*aria-labelledby="transfer-changes-heading"/);
    expect(html).toMatch(/<section[^>]*aria-labelledby="transfer-keeps-heading"/);
    // Lists stay lists — a screen reader announces "list, 3 items".
    expect(html).toMatch(/<ul[^>]*>[\s\S]*<li/);
  });

  it("does not change what the transfer summary SAYS", () => {
    // The a11y work must not have touched a single money claim (Audit 221).
    const html = renderToStaticMarkup(React.createElement(Ownership, { newOwnerName: "Ravi" }));
    expect(html).toMatch(/Ravi becomes the workspace owner/);
    expect(html).toMatch(/Automatic renewal is switched off/);
    expect(html).toMatch(/verified sending domains/i);
    expect(html).toMatch(/Only the new owner can transfer the workspace back/);
  });

  it("names each renewal option by its title and describes it with its consequence", () => {
    const preview = {
      currency: "INR", chargeNowMinor: 39500, effectiveSeats: 5, kind: "UPGRADE",
      renewal: { totalMinor: 39500, at: "2026-09-02T00:00:00.000Z", term: "MONTHLY" },
    };
    const html = renderToStaticMarkup(React.createElement(SeatChange, {
      preview, renewalMode: "AUTOMATIC", offerAutopay: true, autopayAtCheckout: true,
    }));
    // Without this the accessible NAME of each radio was its entire forty-word
    // consequence, announced again on focus.
    const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    const described = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((m) => m[1]);
    expect(labelled).toHaveLength(2);
    expect(described).toHaveLength(2);
    // Every reference must actually resolve to an element in the same markup.
    for (const id of [...labelled, ...described]) {
      expect(html, `dangling reference: ${id}`).toContain(`id="${id}"`);
    }
    expect(html).toMatch(/role="radiogroup"/);
    expect(html).toMatch(/aria-label="How would you like to renew\?"/);
  });

  it("does not change what the seat-change summary SAYS", () => {
    const preview = {
      currency: "INR", chargeNowMinor: 39500, effectiveSeats: 5, kind: "UPGRADE",
      renewal: { totalMinor: 39500, at: "2026-09-02T00:00:00.000Z", term: "MONTHLY" },
    };
    const html = renderToStaticMarkup(React.createElement(SeatChange, {
      preview, renewalMode: "AUTOMATIC", offerAutopay: true, autopayAtCheckout: true,
    }));
    expect(html).toMatch(/Today you pay/);
    expect(html).toMatch(/Renew automatically/);
    expect(html).toMatch(/Remind me instead/);
    expect(html).toMatch(/is the full amount charged today/);
  });
});
