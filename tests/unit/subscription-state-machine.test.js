// M42 Phase 1 — the seat-subscription lifecycle is deterministic.
//
// Mirrors tests/unit/payment-lifecycle.test.js: the transition table is the one
// authority, terminal states admit nothing, and — the commercially important part
// — a failed renewal degrades through a grace window instead of amputating a
// customer's team the moment a card expires.

import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_STATUS as S,
  SUBSCRIPTION_TRANSITIONS,
  SUBSCRIPTION_ENTITLING_STATUSES,
  canSubscriptionTransition,
  assertSubscriptionTransition,
  isSubscriptionTerminal,
  isEntitling,
  graceEndsAt,
  nextDunningAttemptAt,
  DUNNING_RETRY_DAYS,
  GRACE_PERIOD_DAYS,
} from "../../shared/subscriptionStateMachine.js";

describe("transition table", () => {
  it("covers every status exactly once", () => {
    expect(Object.keys(SUBSCRIPTION_TRANSITIONS).sort()).toEqual(Object.values(S).sort());
  });

  it("only ever names real statuses as successors", () => {
    const all = Object.values(S);
    for (const [from, tos] of Object.entries(SUBSCRIPTION_TRANSITIONS)) {
      for (const to of tos) expect(all, `${from} → ${to}`).toContain(to);
    }
  });

  it("never lists a self-transition", () => {
    for (const [from, tos] of Object.entries(SUBSCRIPTION_TRANSITIONS)) {
      expect(tos, from).not.toContain(from);
    }
  });

  it.each([
    [S.PENDING, S.ACTIVE], [S.PENDING, S.CANCELLED],
    [S.ACTIVE, S.PAST_DUE], [S.ACTIVE, S.CANCEL_SCHEDULED], [S.ACTIVE, S.EXPIRED],
    [S.PAST_DUE, S.ACTIVE], [S.PAST_DUE, S.EXPIRED], [S.PAST_DUE, S.CANCEL_SCHEDULED],
    [S.CANCEL_SCHEDULED, S.ACTIVE], [S.CANCEL_SCHEDULED, S.EXPIRED],
  ])("allows %s → %s", (from, to) => {
    expect(canSubscriptionTransition(from, to)).toBe(true);
    expect(assertSubscriptionTransition(from, to)).toBe(true);
  });

  it.each([
    [S.EXPIRED, S.ACTIVE],       // resubscribing creates a NEW row, never revives
    [S.CANCELLED, S.ACTIVE],
    [S.PENDING, S.PAST_DUE],     // cannot fail a renewal before first activation
    [S.PENDING, S.EXPIRED],
    [S.ACTIVE, S.PENDING],       // no going backwards
    [S.EXPIRED, S.PAST_DUE],
  ])("forbids %s → %s", (from, to) => {
    expect(canSubscriptionTransition(from, to)).toBe(false);
    expect(() => assertSubscriptionTransition(from, to)).toThrow(/Illegal subscription transition/);
  });

  it("treats EXPIRED and CANCELLED as terminal", () => {
    expect(isSubscriptionTerminal(S.EXPIRED)).toBe(true);
    expect(isSubscriptionTerminal(S.CANCELLED)).toBe(true);
    expect(SUBSCRIPTION_TRANSITIONS[S.EXPIRED]).toEqual([]);
    expect(SUBSCRIPTION_TRANSITIONS[S.CANCELLED]).toEqual([]);
  });

  it("rejects unknown statuses instead of silently allowing them", () => {
    expect(canSubscriptionTransition("BANANA", S.ACTIVE)).toBe(false);
    expect(canSubscriptionTransition(S.ACTIVE, "BANANA")).toBe(false);
    expect(canSubscriptionTransition(undefined, undefined)).toBe(false);
  });
});

describe("entitlement is retained through a payment hiccup", () => {
  it("grants seats while ACTIVE, PAST_DUE and CANCEL_SCHEDULED", () => {
    expect(isEntitling(S.ACTIVE)).toBe(true);
    expect(isEntitling(S.PAST_DUE)).toBe(true);      // dunning window — team keeps working
    expect(isEntitling(S.CANCEL_SCHEDULED)).toBe(true); // paid through period end
  });

  it("withdraws seats only once the subscription is terminal or unstarted", () => {
    expect(isEntitling(S.PENDING)).toBe(false);      // never grant before payment
    expect(isEntitling(S.EXPIRED)).toBe(false);
    expect(isEntitling(S.CANCELLED)).toBe(false);
  });

  it("every entitling status is reachable and non-terminal", () => {
    for (const s of SUBSCRIPTION_ENTITLING_STATUSES) {
      expect(isSubscriptionTerminal(s)).toBe(false);
    }
  });
});

describe("dunning schedule", () => {
  const firstFailure = new Date("2026-08-01T00:00:00Z");

  it("retries on the configured ladder then gives up", () => {
    DUNNING_RETRY_DAYS.forEach((days, i) => {
      const at = nextDunningAttemptAt(firstFailure, i);
      expect(at.getTime()).toBe(firstFailure.getTime() + days * 86400000);
    });
    expect(nextDunningAttemptAt(firstFailure, DUNNING_RETRY_DAYS.length)).toBeNull();
  });

  it("exhausts every retry strictly inside the grace window", () => {
    const graceEnd = graceEndsAt(firstFailure);
    expect(graceEnd.getTime()).toBe(firstFailure.getTime() + GRACE_PERIOD_DAYS * 86400000);
    for (const days of DUNNING_RETRY_DAYS) {
      expect(days).toBeLessThan(GRACE_PERIOD_DAYS);
    }
  });
});
