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
      // M43-FIX — the shapes that survived the first M43 pass. "up to 25 members
      // each" slipped through because the original alternation required the word
      // "team" before "members"; a guard is only as good as the phrasing someone
      // actually wrote, so match the bare noun too.
      /up to \d+ (?:members|users)\b/i,
      /\b\d+-seat limit/i,
      /\bincludes? \d+ seats?\b/i,
      // The bundled-model assertion itself, with or without a number. This is the
      // claim that becomes false when seat_billing_enabled flips, so no surface
      // may state it as a literal — it must come from the commercial model.
      /\b(?:team )?seats? (?:are|is) included in every plan/i,
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

  it("prerendered meta states no seat count and no bundled-seat claim", async () => {
    // M43-FIX — prerendered <title>/<meta> is baked at build time and CANNOT read
    // the commercial state, so it can never be made flag-aware; the only correct
    // move is to say nothing about seats. The first M43 pass narrowed the /pricing
    // title and left the description promising "up to 25 team members" — the
    // string Google and every social card render.
    const src = stripComments(await read("script/prerender-routes.js"));
    const BANNED = [/\b\d+ team members?\b/i, /\b\d+ (?:team )?seats?\b/i, /seats? (?:are|is) included/i];
    const offenders = BANNED.map(re => re.exec(src)?.[0]).filter(Boolean);
    expect(offenders, `static meta cannot be flag-aware: ${offenders.join(", ")}`).toEqual([]);
  });

  it("no host page passes a commercial caption into the shared capacity block", async () => {
    // M43-FIX — `rolesNote` was a prop, and BOTH callers filled it with a
    // hardcoded seat promise that rendered verbatim directly beneath the
    // server-derived capacity rows. The caption is about roles, is identical on
    // both surfaces, and is now stated once inside the component.
    const offenders = [];
    for (const f of await customerSurfaces()) {
      if (/rolesNote\s*=/.test(stripComments(await read(f)))) offenders.push(f);
    }
    expect(offenders, `passes a caption into TeamCapabilities: ${offenders.join(", ")}`).toEqual([]);
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

  it("no 'seats cost nothing' claim is made outside a flag-aware surface", async () => {
    // M43-FIX — PostPurchaseActivation had its seat COUNT migrated to the server
    // while the sentence beneath it still read "Included in your plan, at no extra
    // cost", shown immediately after a payment. The claim itself is fine — it is
    // true today — but only a surface that can see `seat_billing_enabled` is
    // allowed to make it, because only that surface stops making it on rollout.
    const CLAIM = /at no (?:extra|additional) cost|no purchase required|included with your plan/i;
    const FLAG_AWARE = /billingEnabled|useCommercialModel|seatBillingEnabled|seatBillingLive/;
    const offenders = [];
    for (const f of await customerSurfaces()) {
      const src = await read(f);
      const stripped = stripComments(src);
      if (CLAIM.test(stripped) && !FLAG_AWARE.test(src)) offenders.push(`${f}: ${CLAIM.exec(stripped)[0]}`);
    }
    expect(offenders, `states seats are free but cannot see the flag:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the seat-limit rejection is rendered as the server wrote it", async () => {
    // M43-FIX — server/routes.js seatLimitError() builds ONE flag-aware message
    // from the entitlement authority. Users.jsx appended a hardcoded "Every plan
    // includes 25 seats" to it, contradicting the sentence it was concatenated to.
    // A client may show `err.message`; it may not extend it with a seat claim.
    const src = stripComments(await read("client/src/pages/Users.jsx"));
    const appended = /err\.message\s*\+\s*["'`][^"'`]*seats?/i.exec(src);
    expect(appended?.[0], "client appends its own seat claim to the server's message").toBeUndefined();
  });

  it("no surface promises an automatic renewal charge the platform cannot make", async () => {
    // M44 — v1 is prepaid: there is NO stored mandate, so the renewal sweep never
    // charges anyone (server/seatRenewal.js). The seat page nonetheless offered
    // "Turn off auto-renewal" and promised "Next charge ₹X on <date>". A customer
    // who believed it and did nothing would enter a 14-day grace window unaware
    // and lose seats. Any such phrasing must now sit behind the server's
    // `renewalMode`, so it appears only if autopay is genuinely integrated.
    const BANNED = [/auto-?renewal/i, /Next charge/i, /renews automatically/i, /charged automatically/i];
    const GATED = /autoRenews|renewalMode/;
    const offenders = [];
    for (const f of await customerSurfaces()) {
      const src = await read(f);
      const stripped = stripComments(src);
      for (const re of BANNED) {
        const m = re.exec(stripped);
        if (m && !GATED.test(src)) offenders.push(`${f}: "${m[0]}" is not gated on renewalMode`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("renewal mode is server state, not a client constant", async () => {
    // The client may READ renewalMode; it may not decide it. If a surface ever
    // hardcodes the mode, the fix above has been undone.
    const src = stripComments(await read("client/src/pages/TeamSeats.jsx"));
    expect(src).toMatch(/data\.renewalMode/);
    expect(src, "client hardcodes the renewal mode").not.toMatch(/renewalMode\s*=\s*["']/);
  });

  it("the commercial model exposes no price of its own", async () => {
    // Prices come from the quote endpoints / SeatCalculator. If this module ever
    // computes one, the single pricing authority has been forked.
    const src = await read("client/src/lib/commerce/commercialModel.js");
    expect(src).not.toMatch(/quoteSeats|calculateCreditPurchase|totalMinor\s*=/);
  });
});
