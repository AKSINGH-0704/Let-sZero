// Guards factual claims the Resource Center makes about RepMail's OWN product,
// against the code that actually implements them.
//
// The credit-expiry claim has now been wrong in production twice. RELEASE_NOTES.md
// records the first correction: "Some pages previously stated credits expire after
// 6 months; this did not match how credits actually work. All pages now consistently
// state that purchased credits never expire." It then regressed into eight
// Resource Center articles, because content lives in markdown that no test read.
//
// There is no credit-expiry mechanism anywhere in the schema: `payments` has no
// expiry column and no job ages credits out. The pricing page states "Credits never
// expire" in four places. So any Resource Center page claiming a credit lifespan is
// contradicting both the product and the company's own published correction.

import { describe, it, expect } from "vitest";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { CREDIT_TIERS, MIN_CREDIT_PURCHASE, calculateCreditPurchase } from "../../shared/schema.js";

const CONTENT = path.resolve(import.meta.dirname, "..", "..", "client", "src", "content", "repmail");

async function allArticles() {
  const out = [];
  for (const d of await readdir(CONTENT, { withFileTypes: true })) {
    if (!d.isDirectory() || ["authors", "paths", "collections"].includes(d.name)) continue;
    for (const f of (await readdir(path.join(CONTENT, d.name))).filter((f) => f.endsWith(".md"))) {
      out.push({ file: `${d.name}/${f}`, text: await readFile(path.join(CONTENT, d.name, f), "utf-8") });
    }
  }
  return out;
}

describe("Resource Center claims about RepMail match the product", () => {
  it("no article claims RepMail credits expire or have a limited lifespan", async () => {
    // Sentences that attach a lifespan to RepMail's credits. Competitor credit
    // expiry (Apollo's per-cycle credits, for instance) is real and allowed, so
    // the patterns are anchored to RepMail/purchased credits specifically.
    // Anchored to a single line: a comparison table puts "RepMail" in a header
    // cell and a competitor's terms in another cell, so a pattern allowed to
    // cross newlines matches rows that are actually about the competitor.
    const FORBIDDEN = [
      /RepMail[^.\n]{0,80}credits[^.\n]{0,80}(6[- ]month|six month|180 day|lifespan|valid for)/i,
      /credits[^.\n]{0,60}(carry|stay valid|remain valid)[^.\n]{0,40}(six month|6[- ]month|180 day)/i,
      /(6[- ]month|six[- ]month)\s+credit\s+(lifespan|validity|window)/i,
    ];

    const offenders = [];
    for (const { file, text } of await allArticles()) {
      for (const re of FORBIDDEN) {
        const m = re.exec(text);
        if (m) offenders.push(`${file}: "${m[0].slice(0, 110)}"`);
      }
    }

    expect(
      offenders,
      `RepMail credits never expire (see RELEASE_NOTES.md and the pricing page). These pages claim otherwise:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("any per-credit rate quoted in content matches CREDIT_TIERS", async () => {
    const validRates = new Set(CREDIT_TIERS.map((t) => t.perCredit.toFixed(2)));
    const offenders = [];
    for (const { file, text } of await allArticles()) {
      // matches "₹0.13 per credit" / "₹0.13 a credit" style claims
      for (const m of text.matchAll(/₹\s?(\d+\.\d{2})\s*(?:per|a|\/)\s*credit/gi)) {
        if (!validRates.has(m[1])) offenders.push(`${file}: ₹${m[1]} per credit is not a real tier`);
      }
    }
    expect(offenders, `valid rates are ${[...validRates].join(", ")}`).toEqual([]);
  });

  it("any credit-pack price quoted in content matches calculateCreditPurchase", async () => {
    // Content quotes packs as "N credits for ₹P". Verify P against the real
    // pricing function, allowing for the bonus-credit total as well as the
    // base amount, since marketing legitimately quotes either.
    const offenders = [];
    for (const { file, text } of await allArticles()) {
      for (const m of text.matchAll(/([\d,]{4,})\s+credits[^.\n]{0,40}?₹\s?([\d,]+)/gi)) {
        const credits = Number(m[1].replace(/,/g, ""));
        const price = Number(m[2].replace(/,/g, ""));
        if (credits < MIN_CREDIT_PURCHASE) continue;

        const direct = calculateCreditPurchase(credits);
        // the quoted credits may be the post-bonus total, so search for a base
        // purchase whose totalCredits equals the quoted number
        let matched = direct && direct.priceINR === price;
        if (!matched) {
          for (const base of [3000, 10000, 15000, 30000, 50000, 100000, 150000, 300000]) {
            const p = calculateCreditPurchase(base);
            if (p && p.totalCredits === credits && p.priceINR === price) { matched = true; break; }
          }
        }
        if (!matched) offenders.push(`${file}: "${credits} credits for ₹${price}" does not match the pricing function`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no article claims RepMail sells a subscription", async () => {
    // RepMail sells one-time credit packs. "Plan" is the highest pack ever bought;
    // there is no recurring billing and no downgrade path anywhere in the code.
    const offenders = [];
    for (const { file, text } of await allArticles()) {
      const m = /RepMail[^.\n]{0,60}(monthly subscription|subscription plan|per[- ]seat pricing|billed monthly)/i.exec(text);
      if (m) offenders.push(`${file}: "${m[0].slice(0, 110)}"`);
    }
    expect(offenders).toEqual([]);
  });
});
