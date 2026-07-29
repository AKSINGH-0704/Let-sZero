// M42 Phase 2 — the single seat entitlement authority.
//
// The commercially dangerous failure mode for this milestone is that enabling
// seat billing silently shrinks a live customer's team. These tests pin the
// property that makes that impossible: the entitlement is the MOST generous
// applicable grant, and a corrupt configuration fails toward the customer.

import { describe, it, expect } from "vitest";
import {
  resolveSeatEntitlement,
  seatsAtRisk,
  parseFreeFloor,
  grandfatherActive,
  SEAT_SOURCE,
  DEFAULT_FREE_FLOOR,
} from "../../shared/seatEntitlement.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { MAX_TEAM_MEMBERS } from "../../shared/schema.js";

const sub = (over = {}) => ({ id: "sub-1", status: S.ACTIVE, seats: 10, grandfatheredSeats: 0, grandfatheredUntil: null, ...over });

describe("rollout gate — disabled billing is exactly pre-M42 behaviour", () => {
  it.each(["free", "starter", "growth", "scale"])("%s falls back to the legacy flat allowance", (plan) => {
    const e = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: false });
    expect(e.seats).toBe(MAX_TEAM_MEMBERS[plan]);
    expect(e.source).toBe(SEAT_SOURCE.LEGACY_PLAN);
  });

  it("ignores a subscription entirely while the flag is off", () => {
    const e = resolveSeatEntitlement({ subscription: sub({ seats: 3 }), effectivePlan: "free", billingEnabled: false });
    expect(e.seats).toBe(25);          // NOT 3 — the flag has not been turned on
    expect(e.subscriptionId).toBeNull();
  });
});

describe("enterprise is unlimited regardless of rollout state", () => {
  it.each([true, false])("billingEnabled=%s", (billingEnabled) => {
    const e = resolveSeatEntitlement({ effectivePlan: "enterprise", billingEnabled });
    expect(e.seats).toBe(Infinity);
    expect(e.unlimited).toBe(true);
    expect(e.source).toBe(SEAT_SOURCE.ENTERPRISE);
  });
});

describe("entitlement is the most generous applicable grant", () => {
  it("uses paid seats when they beat the floor", () => {
    const e = resolveSeatEntitlement({ subscription: sub({ seats: 40 }), billingEnabled: true, freeFloor: 1 });
    expect(e.seats).toBe(40);
    expect(e.source).toBe(SEAT_SOURCE.SUBSCRIPTION);
    expect(e.subscriptionId).toBe("sub-1");
  });

  it("never drops below the free floor even with a smaller paid plan", () => {
    const e = resolveSeatEntitlement({ subscription: sub({ seats: 2 }), billingEnabled: true, freeFloor: 5 });
    expect(e.seats).toBe(5);
    expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
  });

  it("honours a grandfather grant that beats the paid count", () => {
    const e = resolveSeatEntitlement({
      subscription: sub({ seats: 3, grandfatheredSeats: 18 }), billingEnabled: true, freeFloor: 1,
    });
    expect(e.seats).toBe(18);
    expect(e.source).toBe(SEAT_SOURCE.GRANDFATHERED);
  });

  it("stops honouring a grandfather grant after its window closes", () => {
    const expired = sub({ seats: 3, grandfatheredSeats: 18, grandfatheredUntil: new Date("2026-01-01T00:00:00Z") });
    const e = resolveSeatEntitlement({ subscription: expired, billingEnabled: true, freeFloor: 1, now: new Date("2026-07-29T00:00:00Z") });
    expect(e.seats).toBe(3);
    expect(e.source).toBe(SEAT_SOURCE.SUBSCRIPTION);
  });

  it("treats a grant with no expiry as permanent", () => {
    expect(grandfatherActive(sub({ grandfatheredSeats: 9, grandfatheredUntil: null }))).toBe(true);
    expect(grandfatherActive(sub({ grandfatheredSeats: 0 }))).toBe(false);
    expect(grandfatherActive(null)).toBe(false);
  });
});

describe("MIGRATION SAFETY — turning billing on cannot shrink a live team", () => {
  it("holds for every plan when the floor is seeded at the legacy allowance", () => {
    // This is precisely what migration 0008 seeds: seat_free_floor = 25.
    for (const plan of ["free", "starter", "growth", "scale"]) {
      const before = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: false });
      const after = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR });
      expect(after.seats, plan).toBeGreaterThanOrEqual(before.seats);
    }
  });

  it("holds for a workspace grandfathered at its current headcount", () => {
    const before = resolveSeatEntitlement({ effectivePlan: "growth", billingEnabled: false }).seats;
    const after = resolveSeatEntitlement({
      subscription: sub({ seats: 0, grandfatheredSeats: before }),
      effectivePlan: "growth", billingEnabled: true, freeFloor: 0,
    });
    expect(after.seats).toBe(before);
  });
});

describe("lifecycle status decides whether a subscription entitles", () => {
  it.each([S.ACTIVE, S.PAST_DUE, S.CANCEL_SCHEDULED])("%s still grants its seats", (status) => {
    const e = resolveSeatEntitlement({ subscription: sub({ status, seats: 12 }), billingEnabled: true, freeFloor: 1 });
    expect(e.seats).toBe(12);
  });

  it("EXPIRED falls back to the free floor", () => {
    const e = resolveSeatEntitlement({ subscription: sub({ status: S.EXPIRED, seats: 12 }), billingEnabled: true, freeFloor: 1 });
    expect(e.seats).toBe(1);
    expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
    expect(e.subscriptionId).toBeNull();
  });

  it("an expired grandfathered subscription still loses its grant", () => {
    const e = resolveSeatEntitlement({
      subscription: sub({ status: S.EXPIRED, seats: 0, grandfatheredSeats: 20 }),
      billingEnabled: true, freeFloor: 1,
    });
    expect(e.seats).toBe(1);
  });
});

describe("configuration corruption fails toward the customer", () => {
  it.each([null, undefined, "", "abc", "-5", "3.5", "NaN", {}])("parseFreeFloor(%o) → legacy allowance", (raw) => {
    expect(parseFreeFloor(raw)).toBe(DEFAULT_FREE_FLOOR);
  });

  it("accepts a legitimate operator value", () => {
    expect(parseFreeFloor("1")).toBe(1);
    expect(parseFreeFloor("0")).toBe(0);
    expect(parseFreeFloor(7)).toBe(7);
  });

  it("a missing subscription is not an error, just the floor", () => {
    const e = resolveSeatEntitlement({ subscription: null, billingEnabled: true, freeFloor: 1 });
    expect(e.seats).toBe(1);
    expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
  });

  it("defaults are safe when called with no arguments at all", () => {
    const e = resolveSeatEntitlement();
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.free);
    expect(e.source).toBe(SEAT_SOURCE.LEGACY_PLAN);
  });
});

describe("seatsAtRisk drives the past-due messaging", () => {
  it("reports what a lapse would cost", () => {
    expect(seatsAtRisk({ subscription: sub({ seats: 10 }), effectivePlan: "growth", freeFloor: 1 })).toBe(9);
  });

  it("is zero when the floor already covers the paid seats", () => {
    expect(seatsAtRisk({ subscription: sub({ seats: 3 }), effectivePlan: "growth", freeFloor: 5 })).toBe(0);
  });

  it("is zero for enterprise", () => {
    expect(seatsAtRisk({ subscription: sub({ seats: 10 }), effectivePlan: "enterprise", freeFloor: 1 })).toBe(0);
  });
});
