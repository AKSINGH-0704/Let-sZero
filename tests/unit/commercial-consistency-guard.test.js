// M43 — repository-wide commercial consistency guard.
//
// This is the test that makes M43 stick. It does not look for implementation
// bugs; it looks for customer-visible statements that contradict the M42
// commercial architecture, and it fails the build if one reappears.
//
// Two rules, both learned the hard way earlier in this programme:
//   • match USAGE, not prose — a guard that fails on an explanatory comment gets
//     deleted by whoever is in a hurry (this happened twice in M42);
//   • allow-list deliberately, in code, with the reason — so an exception is a
//     decision someone made and can be reviewed, not an accident.

import { describe, it, expect } from "vitest";
import { readFile, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFile(join(root, p), "utf8");

/** Every customer-visible client source. */
async function customerSurfaces() {
  const out = [];
  async function walk(rel) {
    for (const e of await readdir(join(root, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) {
        // Article content is prose about the market, not product UI — it is
        // governed separately by content-product-claims.test.js.
        if (e.name === "content") continue;
        await walk(p);
      } else if (/\.(jsx?|tsx?)$/.test(e.name)) {
        out.push(p);
      }
    }
  }
  await walk("client/src");
  return out;
}

/** Strip line and block comments so guards match rendered strings, not prose. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("no surface claims team seats are free or bundled at a fixed number", () => {
  it("contains no hardcoded seat-count promise in rendered code", async () => {
    // The exact shapes M43 removed. Each would become false the moment
    // seat_billing_enabled is turned on.
    const BANNED = [
      /invite up to \d+ people/i,
      /up to \d+ (?:team members|people|seats|teammates)[^.]*\bfree\b/i,
      /free, on any plan/i,
      /no purchase required[^.]*\b\d+\b/i,
      /\b\d+ team seats at no (?:additional|extra) cost/i,
      /includes up to \d+ team members at no extra cost/i,
    ];
    const offenders = [];
    for (const f of await customerSurfaces()) {
      const src = stripComments(await read(f));
      for (const re of BANNED) {
        const m = re.exec(src);
        if (m) offenders.push(`${f}: ${m[0].slice(0, 90)}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("no client surface derives a seat ceiling from the plan constant", async () => {
    // SeatSummary is the one allowed mention: it is a presentational component
    // whose doc comment explains the rule it mirrors. It reads no constant.
    const IMPORTED = /import\s*\{[^}]*\bMAX_TEAM_MEMBERS\b[^}]*\}/;
    const SUBSCRIPTED = /\bMAX_TEAM_MEMBERS\s*\[/;
    const offenders = [];
    for (const f of await customerSurfaces()) {
      const src = await read(f);
      if (IMPORTED.test(src)) offenders.push(`${f} imports MAX_TEAM_MEMBERS`);
      if (SUBSCRIPTED.test(stripComments(src))) offenders.push(`${f} reads MAX_TEAM_MEMBERS[...]`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("the plan feature matrix carries no seat entry", async () => {
    // Team capacity is not a property of a credit pack.
    expect(await read("client/src/lib/commerce/planCatalog.js")).not.toMatch(/teamMembers:\s*["'{]/);
  });
});

describe("credit claims stay true under both commercial states", () => {
  it("makes no absolute 'no subscriptions' claim in rendered code", async () => {
    // RepMail now sells a subscription (seats). The claim that remains
    // permanently true is the narrower one: CREDITS are one-time and never
    // expire. An unqualified "no subscriptions" contradicts the seat product.
    const BANNED = [
      /\bno subscriptions?\b/i,
      /\bno recurring charges?, subscriptions?\b/i,
      /\bno auto[- ]renewals?\b/i,
    ];
    const offenders = [];
    for (const f of [...await customerSurfaces(), "script/prerender-routes.js"]) {
      const src = stripComments(await read(f));
      for (const re of BANNED) {
        const m = re.exec(src);
        if (m) offenders.push(`${f}: "${m[0]}"`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("still asserts the claim that IS true — credits never expire", async () => {
    const pricing = await read("client/src/pages/PublicPricing.jsx");
    expect(pricing).toMatch(/never expire/i);
  });
});

describe("commercial journeys lead somewhere that works", () => {
  it("no customer-facing surface links to the operator-only /app/users", async () => {
    // /app/users is role-gated to platform operators; a customer following it is
    // bounced to the dashboard. The customer team page is /app/team. M41-FIX made
    // this correction on the Payments page; M43 found the onboarding modal still
    // dead-ended the same way.
    const CUSTOMER_FACING = [
      "client/src/components/teams/TeamsWelcomeModal.jsx",
      "client/src/components/payments/PostPurchaseActivation.jsx",
      "client/src/pages/Payments.jsx",
      "client/src/pages/TeamMembers.jsx",
      "client/src/pages/TeamSeats.jsx",
    ];
    const offenders = [];
    for (const f of CUSTOMER_FACING) {
      const src = stripComments(await read(f));
      if (/["'`]\/app\/users/.test(src)) offenders.push(f);
    }
    expect(offenders, `these dead-end for a customer: ${offenders.join(", ")}`).toEqual([]);
  });

  it("the seat page is reachable from the team page", async () => {
    expect(await read("client/src/pages/TeamMembers.jsx")).toContain("/app/team/seats");
  });
});

describe("surfaces that show commercial state read it from the server", () => {
  it.each([
    ["client/src/pages/TeamMembers.jsx", "/api/seats/subscription"],
    ["client/src/pages/Payments.jsx", "/api/seats/subscription"],
    ["client/src/pages/Users.jsx", "/api/seats/subscription"],
    ["client/src/components/payments/PostPurchaseActivation.jsx", "/api/seats/subscription"],
    ["client/src/pages/PublicPricing.jsx", "useCommercialModel"],
    ["client/src/components/pricing/TeamCapabilities.jsx", "useCommercialModel"],
  ])("%s reads %s", async (file, marker) => {
    expect(await read(file)).toContain(marker);
  });

  it("the commercial model exposes no price of its own", async () => {
    // Prices come from the quote endpoints / SeatCalculator. If this module ever
    // computes one, the single pricing authority has been forked.
    const src = await read("client/src/lib/commerce/commercialModel.js");
    expect(src).not.toMatch(/quoteSeats|calculateCreditPurchase|totalMinor\s*=/);
  });
});
