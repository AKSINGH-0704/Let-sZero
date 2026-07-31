// M45 — the two questions that decide whether seat billing may be switched on.
//
//   1. Does activation take anything away from an existing customer?
//   2. Does a customer who pays actually receive something?
//
// The launch audit found the answer to (2) was NO under the live configuration,
// and that fixing it would have broken (1). These tests pin both, because they
// are in tension: the free floor is what protects existing teams AND what makes
// a purchase worthless, and only the migration window lets one move without the
// other breaking.

import { describe, it, expect } from "vitest";
import {
  resolveSeatEntitlement, legacyProtectionFloor, parseTimestampSetting,
  DEFAULT_FREE_FLOOR, SEAT_SOURCE,
} from "../../shared/seatEntitlement.js";
import { MAX_TEAM_MEMBERS } from "../../shared/schema.js";
import { SELF_SERVE_MAX_SEATS } from "../../shared/pricing.js";

const PAID_PLANS = ["trial", "starter", "growth", "scale"];
const sub = (seats) => ({ id: "s1", status: "ACTIVE", seats, grandfatheredSeats: 0, grandfatheredUntil: null });

describe("activation is entitlement-neutral at the shipped free floor", () => {
  it.each(PAID_PLANS)("a %s workspace loses nothing when the flag flips", (plan) => {
    const before = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: false });
    const after = resolveSeatEntitlement({
      effectivePlan: plan, billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR,
    });
    expect(after.seats).toBeGreaterThanOrEqual(before.seats);
  });

  it("enterprise stays unlimited on both sides of the flag", () => {
    for (const billingEnabled of [false, true]) {
      const e = resolveSeatEntitlement({ effectivePlan: "enterprise", billingEnabled });
      expect(e.unlimited).toBe(true);
      expect(e.source).toBe(SEAT_SOURCE.ENTERPRISE);
    }
  });
});

describe("THE DEFECT — at freeFloor 25 the seat product delivers nothing", () => {
  // This is why activation was withheld. It is kept as a live test rather than a
  // comment so that if anyone raises the floor back to the legacy allowance while
  // seats are on sale, the suite says so instead of the customers.
  it("buying any self-serve quantity grants no more than not buying", () => {
    const free = resolveSeatEntitlement({
      effectivePlan: "starter", billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR,
    }).seats;
    for (const paid of [1, 5, 10, SELF_SERVE_MAX_SEATS]) {
      const bought = resolveSeatEntitlement({
        subscription: sub(paid), effectivePlan: "starter",
        billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR,
      }).seats;
      expect(bought).toBe(free);
    }
  });

  it("names the arithmetic, so the fix is a config change and not a code hunt", () => {
    // The floor equals the legacy allowance equals the self-serve ceiling. While
    // all three are 25, max(paid, floor) can never exceed the floor.
    expect(DEFAULT_FREE_FLOOR).toBe(MAX_TEAM_MEMBERS.free);
    expect(SELF_SERVE_MAX_SEATS).toBe(DEFAULT_FREE_FLOOR);
  });
});

describe("the migration window lets the floor drop without shrinking live teams", () => {
  const ACTIVATED = new Date("2026-08-01T00:00:00Z");
  const UNTIL = new Date("2027-08-01T00:00:00Z");
  const OLD = new Date("2026-05-01T00:00:00Z");   // existed before activation
  const NEW = new Date("2026-09-01T00:00:00Z");   // joined after
  const window = { activatedAt: ACTIVATED, grandfatherUntil: UNTIL, freeFloor: 1, billingEnabled: true };

  it("an existing workspace keeps its pre-billing allowance after the floor drops to 1", () => {
    const e = resolveSeatEntitlement({ ...window, effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2026-09-01T00:00:00Z") });
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.starter);
    expect(e.source).toBe(SEAT_SOURCE.LEGACY_PROTECTED);
  });

  it("a workspace created after activation gets the new floor — it was never promised the old model", () => {
    const e = resolveSeatEntitlement({ ...window, effectivePlan: "starter", workspaceCreatedAt: NEW, now: new Date("2026-10-01T00:00:00Z") });
    expect(e.seats).toBe(1);
    expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
  });

  it("protection ends when the window closes", () => {
    const e = resolveSeatEntitlement({ ...window, effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2027-08-02T00:00:00Z") });
    expect(e.seats).toBe(1);
  });

  it("a protected workspace that BUYS more seats gets what it paid for", () => {
    // The whole point: protection is a floor, never a ceiling. A customer who
    // outgrows the legacy allowance must still be able to buy past it.
    const e = resolveSeatEntitlement({ ...window, subscription: sub(40), effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2026-09-01T00:00:00Z") });
    expect(e.seats).toBe(40);
    expect(e.source).toBe(SEAT_SOURCE.SUBSCRIPTION);
  });

  it("and paying BELOW the protected floor never costs them seats", () => {
    const e = resolveSeatEntitlement({ ...window, subscription: sub(3), effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2026-09-01T00:00:00Z") });
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.starter);
  });
});

describe("the window fails closed", () => {
  // Every part of the mechanism is a platform setting, so every part can be
  // missing or corrupt. None of those states may silently shrink a team, and
  // none may silently hand out free seats forever either.
  it.each([
    ["no activation timestamp", { grandfatherUntil: new Date("2027-01-01") }],
    ["no window end", { activatedAt: new Date("2026-01-01") }],
    ["no workspace creation date", { activatedAt: new Date("2026-01-01"), grandfatherUntil: new Date("2027-01-01"), workspaceCreatedAt: null }],
  ])("%s disables protection rather than guessing", (_label, opts) => {
    expect(legacyProtectionFloor({
      effectivePlan: "starter", workspaceCreatedAt: new Date("2025-01-01"), ...opts,
    })).toBe(0);
  });

  it("a corrupt timestamp setting parses to null, not to Invalid Date", () => {
    expect(parseTimestampSetting("not-a-date")).toBeNull();
    expect(parseTimestampSetting("")).toBeNull();
    expect(parseTimestampSetting(null)).toBeNull();
    expect(parseTimestampSetting("2026-08-01T00:00:00Z")).toBeInstanceOf(Date);
  });

  it("an unknown plan contributes no protected floor", () => {
    expect(legacyProtectionFloor({
      effectivePlan: "nonexistent", workspaceCreatedAt: new Date("2025-01-01"),
      activatedAt: new Date("2026-01-01"), grandfatherUntil: new Date("2027-01-01"),
    })).toBe(0);
  });

  it("enterprise (Infinity) contributes no numeric floor — it is handled earlier", () => {
    expect(legacyProtectionFloor({
      effectivePlan: "enterprise", workspaceCreatedAt: new Date("2025-01-01"),
      activatedAt: new Date("2026-01-01"), grandfatherUntil: new Date("2027-01-01"),
    })).toBe(0);
  });
});

describe("the mechanism is inert until it is configured", () => {
  it("changes nothing for anyone while the settings are unset — today's state", () => {
    for (const plan of PAID_PLANS) {
      const e = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR });
      expect(e.seats).toBe(DEFAULT_FREE_FLOOR);
      expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
    }
  });
});
