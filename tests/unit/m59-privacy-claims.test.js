// M59 / LEGAL-001 — the customer-facing claims must match what the code does.
//
// The published policies asserted, in five separate places, that this platform
// uses no advertising networks, no ad-tracking pixels, no advertising cookies,
// and shares nothing with advertising networks. Shipping the Google Ads tag
// falsified all five. The earlier scoping of this blocker found two of them.
//
// So the point of this suite is not to spell-check prose. It is to make the
// policy a TESTED artefact: every claim below is cross-checked against the
// implementation that has to be true for it, so a future change to the payload,
// the consent signals, or the cookie sweep fails here rather than silently
// turning a published promise into a false one.
//
// Rendered, not grepped, wherever the claim is about what a customer reads — a
// sentence assembled across JSX elements is only observable in the output.

import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import React from "react";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFile(join(root, p), "utf8");

/**
 * Source with comments removed.
 *
 * Necessary, not tidy: googleAds.js explains in prose that `ad_user_data` is a
 * consent signal rather than Enhanced Conversions, and conversions.js explains
 * that the transaction id "carries no tenant meaning". Asserting those words
 * are absent from the raw file would fail on the very comments that document
 * why they are absent from the CODE.
 */
const code = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Source with newlines collapsed, so a sentence wrapped in JSX still matches. */
const flat = (src) => src.replace(/\s+/g, " ");

/**
 * Rendered text of a page, with markup and entities collapsed away.
 *
 * Wrapped in wouter's Router with an `ssrPath`, exactly as script/prerender.js
 * does, so Link and useLocation never reach for window.location — which does
 * not exist in this Node test environment, and does not exist during prerender
 * either. This renders the page the same way production actually builds it.
 */
async function renderedText(importPath, ssrPath = "/privacy") {
  const mod = await import(importPath);
  const html = renderToStaticMarkup(
    React.createElement(Router, { ssrPath }, React.createElement(mod.default)),
  );
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&rsquo;|&#x27;|&#39;/g, "'")
    .replace(/&ldquo;|&rdquo;|&quot;|&#34;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    // JSX turns &rsquo;/&ldquo; into the real characters at compile time, so
    // the rendered output carries curly punctuation, not entities. Fold it to
    // ASCII so the assertions below can be written in plain quotes.
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

let letszero, repmail;

describe("published privacy claims (LEGAL-001)", () => {
  beforeAll(async () => {
    letszero = await renderedText("../../client/src/pages/Privacy.jsx");
    repmail = await renderedText("../../client/src/pages/RepMailPrivacy.jsx", "/repmail/privacy");
  });

  // ── The five falsified absolutes ───────────────────────────────────────────
  //
  // Each was published and became false the moment the tag shipped. Pinned
  // individually so a revert of any ONE is a named failure, not a diff nobody
  // reads.

  it("no longer claims no advertising cookies are used", () => {
    expect(letszero).not.toMatch(/do not use advertising cookies/i);
    expect(letszero).not.toMatch(/do not use .{0,30}third-party tracking cookies/i);
  });

  it("no longer claims no advertising networks or ad-tracking pixels are used", () => {
    // The CSP allows googleadservices.com and googleads.g.doubleclick.net in
    // img-src precisely so conversion pixels can load. That allowlist entry and
    // this sentence cannot both be true.
    expect(letszero).not.toMatch(/do not use third-party advertising networks/i);
    expect(letszero).not.toMatch(/ad-tracking pixels\./i);
  });

  it("no longer claims data is never used for advertising", () => {
    expect(letszero).not.toMatch(/do not use your data for advertising/i);
  });

  it("no longer claims data is never shared with advertising networks", () => {
    expect(letszero).not.toMatch(/do not share your data with advertising networks/i);
  });

  it("no longer claims nothing at all is shared for advertising purposes", () => {
    // The unqualified form. The qualified form ("apart from the consent-based
    // advertising measurement described in section 2.7") is correct and stays.
    expect(letszero).not.toMatch(
      /We do not sell your data or share it for marketing or advertising purposes/i,
    );
  });

  it("still says the true things it said before", () => {
    // The amendment corrects false statements. It must not quietly drop a
    // commitment that remains true and that customers rely on.
    expect(letszero).toMatch(/do not sell your data/i);
    // RepMail's promise was "no PERSISTENT tracking cookies". Retained
    // deliberately: the job is to correct a false statement, not to broaden a
    // commitment the business has not chosen to make.
    expect(repmail).toMatch(/persistent/i);
  });

  // ── Claims cross-checked against the implementation ────────────────────────

  it("describes a payload that matches what the code actually sends", async () => {
    const conversions = await read("client/src/lib/analytics/conversions.js");

    const purchase = /export function trackPurchase[\s\S]*?^}/m.exec(conversions)[0];
    const keys = [...purchase.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
    expect(new Set(keys)).toEqual(new Set(["value", "currency", "transaction_id"]));

    // ...and that is exactly what the policy enumerates.
    expect(letszero).toMatch(/limited to which conversion occurred/i);
    expect(letszero).toMatch(/the amount, the currency, and a random reference/i);

    // The reference really is random, and carries no tenant meaning.
    const schema = await read("shared/schema.js");
    expect(schema).toMatch(/payments = pgTable[\s\S]*?id: uuid\("id"\)\.defaultRandom\(\)/);
  });

  it("claims Enhanced Conversions is off, and it is", async () => {
    for (const src of await Promise.all([
      read("client/src/lib/analytics/googleAds.js"),
      read("client/src/lib/analytics/conversions.js"),
    ])) {
      // `ad_user_data` is the Consent Mode signal and is expected; a bare
      // `user_data` payload is Enhanced Conversions and must not exist.
      expect(code(src)).not.toMatch(/(?<!ad_)user_data/);
      expect(code(src)).not.toMatch(/sha256|hashedEmail|email_address/);
    }
    expect(letszero).toMatch(/Enhanced Conversions is not enabled/i);
    expect(letszero).toMatch(/do not send Google hashed identifiers/i);
  });

  it("claims no name, email or account details are sent, and none are", async () => {
    const conversions = await read("client/src/lib/analytics/conversions.js");
    const fired = /export function track[\s\S]*$/m.exec(code(conversions))[0];
    for (const forbidden of [/\bemail\b/, /\busername\b/, /workspace/, /planName/, /tenant/]) {
      expect(fired).not.toMatch(forbidden);
    }
    expect(letszero).toMatch(
      /never includes your email address, your name, your account or workspace details, or which plan you bought/i,
    );
    expect(repmail).toMatch(
      /never includes your email address, your name, or your account details/i,
    );
  });

  it("bounds the cookie-clearing claim to what the sweep can actually do", async () => {
    const googleAds = await read("client/src/lib/analytics/googleAds.js");

    // The sweep only ever writes path=/, so a cookie on another path survives.
    // The policy must not promise otherwise.
    expect(googleAds).toContain("path=/");
    expect(letszero).toMatch(/cookies this site is able to remove/i);
    expect(letszero).toMatch(/not ours to remove/i);
    expect(letszero).toMatch(
      /cannot guarantee that a cookie stored under a different path is cleared/i,
    );

    // Never an unbounded promise.
    expect(letszero).not.toMatch(/(delete|remove) all (google |advertising )?cookies/i);
  });

  it("discloses that consent is per-browser, since no server-side record exists", async () => {
    // PRIV-001 is an accepted limitation. It gets disclosed rather than papered
    // over, and the policy must not imply evidence we cannot produce.
    const consent = await read("client/src/lib/consent.js");
    expect(consent).toContain("window.localStorage");
    expect(letszero).toMatch(/recorded in your browser's local storage/i);
    expect(letszero).toMatch(/we will ask again/i);
  });

  it("does not claim anything about Google's downstream processing", () => {
    // We can evidence what we SEND. We cannot evidence what Google does with
    // it, and what an already-loaded gtag.js transmits was never observed.
    for (const text of [letszero, repmail]) {
      expect(text).not.toMatch(/Google (does not|will not|never) (store|retain|use|share|sell)/i);
      expect(text).not.toMatch(/Google receives (no|nothing)/i);
      expect(text).not.toMatch(/solely for/i);
      expect(text).not.toMatch(/(GDPR|CCPA|DPDP)[- ]compliant/i);
    }
  });

  it("re-dates the policies it materially amended, and only those", async () => {
    // A policy whose substance changed while its date did not tells customers
    // nothing changed. Both amended notices carry the amendment month; the two
    // Terms pages are untouched this milestone and must keep their own date,
    // so a blanket find-and-replace fails here.
    expect(letszero).toMatch(/Last updated: August 2026/i);
    expect(repmail).toMatch(/Last updated: August 2026/i);
    for (const t of ["client/src/pages/Terms.jsx", "client/src/pages/RepMailTerms.jsx"]) {
      expect(await read(t)).toContain("Last updated: June 2026");
    }
  });

  it("keeps the counter-inference that a request to Google is still a request", () => {
    // Without this sentence, "we never send your email address" invites the
    // reading that Google learns nothing identifying. It does receive the
    // ordinary metadata any third-party request carries (LEGAL-002).
    expect(letszero).toMatch(/IP address and browser type/i);
  });

  it("points customers at a control that exists on the pages it names", async () => {
    expect(letszero).toMatch(/"Cookie preferences" in the footer/i);
    expect(repmail).toMatch(/"Cookie preferences" in the footer/i);
    // Scoped to public pages, because the authenticated app has no footer.
    expect(letszero).toMatch(/footer of our public pages/i);
    expect(await read("client/src/pages/Privacy.jsx")).toContain("CookiePreferencesLink");
  });

  it("agrees with the consent surface about what is being asked", async () => {
    // Policy, banner and dialog must describe ONE purpose. Surfaces describing
    // one thing differently is the M53 CDP-1 defect shape.
    const banner = await read("client/src/components/consent/ConsentBanner.jsx");
    const dialog = await read("client/src/components/consent/CookiePreferencesDialog.jsx");
    for (const src of [banner, dialog]) {
      expect(flat(src)).toMatch(/measure\s+which advertising brings people here/i);
    }
    expect(letszero).toMatch(/which advertising brings people to us/i);
    expect(letszero).not.toMatch(/personali[sz]ed advertising|remarketing/i);

    // ...and the signals actually sent must not exceed that purpose.
    expect(await read("client/src/lib/analytics/googleAds.js")).toMatch(
      /ad_personalization: "denied"/,
    );
  });
});
