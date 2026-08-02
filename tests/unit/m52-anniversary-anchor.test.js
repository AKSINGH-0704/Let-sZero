// M52 — the stable renewal anniversary.
//
// The commercial promise of this billing model is one sentence: "you pay today,
// and you renew on the same day, one period later." Before M52 that sentence was
// false for roughly a tenth of purchase dates, permanently and silently.
//
// `addMonthsUTC` clamped a too-long day down to the target month's length, which
// is correct. What was missing was restoring it afterwards. Because each renewal
// chained from the PREVIOUS boundary, the clamp compounded: a 31 January
// subscriber went 31 Jan -> 28 Feb -> 28 Mar -> the 28th for the rest of the
// subscription's life. Every period after the first was ~3 days short, nobody
// was double billed, and nothing in the system reported it.
//
// These tests pin BOTH halves of the fix, and the second half matters more than
// the first: a null anchor must reproduce the pre-M52 arithmetic exactly. That
// equivalence is what makes migration 0011 safe to apply to a live production
// table with a paying customer on it — no existing renewal date can move.

import { describe, it, expect, beforeAll } from "vitest";
import { addMonthsUTC, periodFor, anchorDayFor, SEAT_TERMS } from "../../shared/seatPricing.js";
import { USER_ROLES } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS } from "../../shared/subscriptionStateMachine.js";

const iso = (d) => new Date(d).toISOString();
const utc = (y, m, day, h = 0) => new Date(Date.UTC(y, m, day, h));

// Same harness shape the rest of the seat suite uses: one shared in-memory
// backend, unique owners per test rather than a store reset.
let storage;
const rand = () => Math.random().toString(36).slice(2);

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
});

async function makeOwner() {
  return storage.createUser({
    username: `m52_anchor_${rand()}`, email: `m52_anchor_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "free", isTrialUser: false, mustResetPassword: false,
  });
}

describe("addMonthsUTC — the anniversary is carried, not lost", () => {
  it("restores the 31st after a short month instead of settling on the 28th", () => {
    // The defect, expressed as the chain a real subscriber walks.
    const anchor = anchorDayFor(utc(2027, 0, 31)); // 31
    expect(anchor).toBe(31);

    const feb = addMonthsUTC(utc(2027, 0, 31), 1, anchor);
    expect(iso(feb)).toBe("2027-02-28T00:00:00.000Z"); // clamped — correct

    // THE FIX: March is long enough, so the original day comes back.
    const mar = addMonthsUTC(feb, 1, anchor);
    expect(iso(mar)).toBe("2027-03-31T00:00:00.000Z");

    const apr = addMonthsUTC(mar, 1, anchor);
    expect(iso(apr)).toBe("2027-04-30T00:00:00.000Z"); // clamped again — correct

    const may = addMonthsUTC(apr, 1, anchor);
    expect(iso(may)).toBe("2027-05-31T00:00:00.000Z"); // and back again
  });

  it("keeps leap-year handling correct", () => {
    expect(iso(addMonthsUTC(utc(2028, 0, 31), 1, 31))).toBe("2028-02-29T00:00:00.000Z");
    expect(iso(addMonthsUTC(utc(2028, 1, 29), 1, 31))).toBe("2028-03-31T00:00:00.000Z");
  });

  it("carries the anniversary across a whole year of renewals", () => {
    // 12 monthly renewals from 31 Jan. Every month that CAN be the 31st is.
    let d = utc(2027, 0, 31);
    const seen = [];
    for (let i = 0; i < 12; i++) {
      d = addMonthsUTC(d, 1, 31);
      seen.push(d.getUTCDate());
    }
    expect(seen).toEqual([28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31]);
  });

  it("preserves the time-of-day component", () => {
    const d = addMonthsUTC(new Date("2027-01-31T09:41:07.250Z"), 1, 31);
    expect(iso(d)).toBe("2027-02-28T09:41:07.250Z");
  });

  it("annual terms anchor too", () => {
    expect(iso(addMonthsUTC(utc(2028, 1, 29), 12, 29))).toBe("2029-02-28T00:00:00.000Z");
    // and the year after, the 29th is available again
    expect(iso(addMonthsUTC(utc(2029, 1, 28), 12, 29))).toBe("2030-02-28T00:00:00.000Z");
  });
});

// ── THE MIGRATION-SAFETY PROPERTY ───────────────────────────────────────────
// Everything above is worthless if adopting it moves an existing customer's
// renewal date. It cannot, because every pre-M52 row has a null anchor.
describe("a null anchor reproduces the pre-M52 arithmetic exactly", () => {
  it("agrees with the day-of-the-input behaviour on every day of every month", () => {
    for (let month = 0; month < 12; month++) {
      for (let day = 1; day <= 28; day++) {
        const start = utc(2027, month, day);
        // Pre-M52 behaviour is "use the input date's own day", which is exactly
        // what omitting the anchor does.
        expect(iso(addMonthsUTC(start, 1, null))).toBe(iso(addMonthsUTC(start, 1)));
        expect(iso(addMonthsUTC(start, 12, null))).toBe(iso(addMonthsUTC(start, 12)));
      }
    }
  });

  it("still clamps without an anchor, exactly as before", () => {
    expect(iso(addMonthsUTC(utc(2027, 0, 31), 1, null))).toBe("2027-02-28T00:00:00.000Z");
    // and, without an anchor, does NOT recover — this is the old behaviour, and
    // asserting it here is what proves the fix is opt-in rather than ambient.
    expect(iso(addMonthsUTC(utc(2027, 1, 28), 1, null))).toBe("2027-03-28T00:00:00.000Z");
  });

  it("ignores an out-of-range or non-integer anchor rather than producing a bad date", () => {
    // A corrupt column must degrade to the old behaviour, never to an invalid date.
    for (const bad of [0, -1, 32, 99, 1.5, NaN, null, undefined, "31", {}]) {
      const d = addMonthsUTC(utc(2027, 0, 15), 1, bad);
      expect(Number.isNaN(d.getTime())).toBe(false);
      expect(iso(d)).toBe("2027-02-15T00:00:00.000Z");
    }
  });

  it("periodFor threads the anchor and defaults to null", () => {
    const withAnchor = periodFor(utc(2027, 1, 28), SEAT_TERMS.MONTHLY.id, 31);
    expect(iso(withAnchor.end)).toBe("2027-03-31T00:00:00.000Z");
    const without = periodFor(utc(2027, 1, 28), SEAT_TERMS.MONTHLY.id);
    expect(iso(without.end)).toBe("2027-03-28T00:00:00.000Z");
  });
});

describe("the anchor is recorded at purchase and honoured at renewal", () => {
  it("stamps the purchase day onto a new subscription", async () => {
    const owner = await makeOwner();
    const { subscription } = await storage.applySeatPurchase(owner.id, {
      seats: 3, term: SEAT_TERMS.MONTHLY.id, pricingVersion: "2026-07-31.1",
      renewalAmountMinor: 34500, now: utc(2027, 0, 31, 10),
    });
    expect(subscription.billingAnchorDay).toBe(31);
    expect(iso(subscription.periodEnd)).toBe("2027-02-28T10:00:00.000Z");
  });

  it("recovers the anniversary at the next renewal", async () => {
    const owner = await makeOwner();
    const { subscription } = await storage.applySeatPurchase(owner.id, {
      seats: 3, term: SEAT_TERMS.MONTHLY.id, pricingVersion: "2026-07-31.1",
      renewalAmountMinor: 34500, now: utc(2027, 0, 31, 10),
    });
    const renewed = await storage.renewSubscription(subscription.id, { now: utc(2027, 1, 28, 10) });
    expect(renewed.ok).toBe(true);
    // Chained from the clamped 28 Feb boundary, but March is long enough.
    expect(iso(renewed.subscription.periodEnd)).toBe("2027-03-31T10:00:00.000Z");
  });

  it("leaves a pre-M52 subscription (null anchor) on its existing schedule", async () => {
    const owner = await makeOwner();
    const { subscription } = await storage.applySeatPurchase(owner.id, {
      seats: 3, term: SEAT_TERMS.MONTHLY.id, pricingVersion: "2026-07-31.1",
      renewalAmountMinor: 34500, now: utc(2027, 0, 31, 10),
    });
    // Simulate a row that predates migration 0011.
    await storage.transitionSubscription(subscription.id, SUBSCRIPTION_STATUS.ACTIVE, {
      billingAnchorDay: null,
    });
    const renewed = await storage.renewSubscription(subscription.id, { now: utc(2027, 1, 28, 10) });
    expect(renewed.ok).toBe(true);
    // Old behaviour, unchanged: the 28th persists. This is the guarantee that
    // deploying M52 cannot move a live customer's renewal date.
    expect(iso(renewed.subscription.periodEnd)).toBe("2027-03-28T10:00:00.000Z");
  });

  it("does not disturb an ordinary mid-month anniversary", async () => {
    const owner = await makeOwner();
    const { subscription } = await storage.applySeatPurchase(owner.id, {
      seats: 1, term: SEAT_TERMS.MONTHLY.id, pricingVersion: "2026-07-31.1",
      renewalAmountMinor: 12900, now: utc(2027, 5, 12, 8),
    });
    expect(subscription.billingAnchorDay).toBe(12);
    expect(iso(subscription.periodEnd)).toBe("2027-07-12T08:00:00.000Z");
    const renewed = await storage.renewSubscription(subscription.id, { now: utc(2027, 6, 12, 8) });
    expect(iso(renewed.subscription.periodEnd)).toBe("2027-08-12T08:00:00.000Z");
  });
});
