// M51 Phase 5.1 — the AutoPay authority.
//
// These are the invariants that decide whether money may move without the
// customer acting. They test the PURE module, with no database and no gateway,
// because every consumer (both storage backends, the sweep, the routes, the
// client) is required to defer to it rather than re-derive the answer.
//
// The properties under test:
//   • autopay is a property of a SUBSCRIPTION, so two products cannot share a switch
//   • a mandate cannot be resurrected out of a terminal state by a late webhook
//   • liveness is evaluated at the CHARGE moment, not at "now"
//   • the rollout gate fails toward OFF and is stable across evaluations
//   • AFA is a threshold, not a reason to withdraw annual autopay
//   • an elapsed pause does not silently disagree with the stored status

import { describe, it, expect } from "vitest";
import {
  MANDATE_STATUS, MANDATE_METHOD, MANDATE_TRANSITIONS,
  canMandateTransition, assertMandateTransition, isMandateTerminal,
  isMandateExpired, isPauseElapsed,
  isAutopayLive, renewalModeFor,
  AFA_EXEMPT_LIMIT_MINOR, requiresAfa, predebitNoticeLeadHours, PREDEBIT_NOTICE_HOURS,
  CHARGE_OUTCOME,
  AUTOPAY_SCOPE, DEFAULT_AUTOPAY_SCOPE, parseAutopayScope,
  parseAutopayAllowlist, parseAutopayLimitPct, rolloutBucket, autopayAllowedFor,
  AUTOPAY_DISPLAY_STATE, autopayDisplayState,
} from "../../shared/autopay.js";
import { RENEWAL_MODE } from "../../shared/subscriptionStateMachine.js";

const DAY = 24 * 60 * 60 * 1000;
const at = (ms) => new Date(Date.now() + ms);

const mandate = (over = {}) => ({
  id: "m1", workspaceRootId: "w1", method: MANDATE_METHOD.CARD,
  status: MANDATE_STATUS.ACTIVE, expiresAt: null, pausedUntil: null, ...over,
});
const sub = (over = {}) => ({
  id: "s1", workspaceRootId: "w1",
  autopayEnabled: true, mandateId: "m1",
  periodEnd: at(30 * DAY), autopayAuthRequiredAt: null, ...over,
});

describe("mandate lifecycle", () => {
  it("every status has an explicit transition list", () => {
    for (const s of Object.values(MANDATE_STATUS)) {
      expect(Array.isArray(MANDATE_TRANSITIONS[s])).toBe(true);
    }
  });

  it("terminal statuses admit no successor", () => {
    for (const s of [MANDATE_STATUS.FAILED, MANDATE_STATUS.REVOKED, MANDATE_STATUS.EXPIRED]) {
      expect(isMandateTerminal(s)).toBe(true);
      expect(MANDATE_TRANSITIONS[s]).toEqual([]);
    }
  });

  // Phase 4 §1.2 — Razorpay does not guarantee webhook ordering, so a
  // token.confirmed can arrive AFTER the token.cancelled that superseded it.
  // Terminality is what stops a revoked bank authorisation being re-armed.
  it("a late confirmation cannot resurrect a revoked mandate", () => {
    expect(canMandateTransition(MANDATE_STATUS.REVOKED, MANDATE_STATUS.ACTIVE)).toBe(false);
    expect(() => assertMandateTransition(MANDATE_STATUS.REVOKED, MANDATE_STATUS.ACTIVE)).toThrow(/Illegal mandate transition/);
  });

  it("an expired mandate cannot be reactivated either", () => {
    expect(canMandateTransition(MANDATE_STATUS.EXPIRED, MANDATE_STATUS.ACTIVE)).toBe(false);
  });

  it("pause and resume are legal in both directions", () => {
    expect(canMandateTransition(MANDATE_STATUS.ACTIVE, MANDATE_STATUS.PAUSED)).toBe(true);
    expect(canMandateTransition(MANDATE_STATUS.PAUSED, MANDATE_STATUS.ACTIVE)).toBe(true);
  });

  it("a pending mandate may confirm, fail, or be abandoned", () => {
    expect(canMandateTransition(MANDATE_STATUS.PENDING, MANDATE_STATUS.ACTIVE)).toBe(true);
    expect(canMandateTransition(MANDATE_STATUS.PENDING, MANDATE_STATUS.FAILED)).toBe(true);
    expect(canMandateTransition(MANDATE_STATUS.PENDING, MANDATE_STATUS.REVOKED)).toBe(true);
    // but it cannot skip straight to paused — nothing to pause yet
    expect(canMandateTransition(MANDATE_STATUS.PENDING, MANDATE_STATUS.PAUSED)).toBe(false);
  });

  it("an elapsed pause is reported separately from liveness", () => {
    const m = mandate({ status: MANDATE_STATUS.PAUSED, pausedUntil: at(-1 * DAY) });
    // The sweep is told the pause has elapsed...
    expect(isPauseElapsed(m)).toBe(true);
    // ...but liveness still says NO until the status transition actually happens.
    // Two answers to "is this active?" is the drift this module exists to prevent.
    expect(isAutopayLive(sub(), m)).toBe(false);
  });

  it("a pause with no end date never elapses on its own", () => {
    expect(isPauseElapsed(mandate({ status: MANDATE_STATUS.PAUSED, pausedUntil: null }))).toBe(false);
  });
});

describe("autopay liveness", () => {
  it("is live when intent, pointer and an active mandate all agree", () => {
    expect(isAutopayLive(sub(), mandate())).toBe(true);
    expect(renewalModeFor(sub(), mandate())).toBe(RENEWAL_MODE.AUTOMATIC);
  });

  it("is not live without customer intent, even with a perfectly good mandate", () => {
    expect(isAutopayLive(sub({ autopayEnabled: false }), mandate())).toBe(false);
    expect(renewalModeFor(sub({ autopayEnabled: false }), mandate())).toBe(RENEWAL_MODE.MANUAL);
  });

  it("is not live with no mandate at all", () => {
    expect(isAutopayLive(sub({ mandateId: null }), null)).toBe(false);
    expect(isAutopayLive(sub(), null)).toBe(false);
  });

  // Guards a caller passing SOME mandate rather than THE mandate the
  // subscription points at — the shape of a cross-product or cross-tenant leak.
  it("rejects a mandate that is not the one the subscription points at", () => {
    expect(isAutopayLive(sub({ mandateId: "m1" }), mandate({ id: "m2" }))).toBe(false);
  });

  it("is not live for any non-ACTIVE mandate status", () => {
    for (const s of [MANDATE_STATUS.PENDING, MANDATE_STATUS.PAUSED,
      MANDATE_STATUS.FAILED, MANDATE_STATUS.REVOKED, MANDATE_STATUS.EXPIRED]) {
      expect(isAutopayLive(sub(), mandate({ status: s }))).toBe(false);
    }
  });

  // The point of evaluating expiry at periodEnd rather than now: a card that is
  // valid today but dead by the renewal cannot fund that renewal, and the
  // customer must learn that in advance rather than at the boundary.
  it("is evaluated at the CHARGE moment, not at now", () => {
    const expiringSoon = mandate({ expiresAt: at(10 * DAY) });
    expect(isMandateExpired(expiringSoon)).toBe(false);          // valid today
    expect(isAutopayLive(sub({ periodEnd: at(30 * DAY) }), expiringSoon)).toBe(false); // dead by renewal
    expect(isAutopayLive(sub({ periodEnd: at(5 * DAY) }), expiringSoon)).toBe(true);   // renews first
  });

  it("a null expiry never expires", () => {
    expect(isMandateExpired(mandate({ expiresAt: null }), at(1000 * DAY))).toBe(false);
  });
});

describe("autopay is per subscription, not per user or workspace", () => {
  // The defining property of the model. Two products in one workspace, sharing
  // one instrument: disabling one must not disable the other.
  it("two subscriptions sharing an instrument have independent switches", () => {
    const shared = mandate();
    const seats = sub({ id: "s-seats", autopayEnabled: true });
    const other = sub({ id: "s-other", autopayEnabled: false });

    expect(isAutopayLive(seats, shared)).toBe(true);
    expect(isAutopayLive(other, shared)).toBe(false);
  });

  it("revoking the shared instrument disables both, without cancelling either", () => {
    const revoked = mandate({ status: MANDATE_STATUS.REVOKED });
    expect(isAutopayLive(sub({ id: "s-seats" }), revoked)).toBe(false);
    expect(isAutopayLive(sub({ id: "s-other" }), revoked)).toBe(false);
    // Falling back to MANUAL is the whole point — neither subscription ends.
    expect(renewalModeFor(sub(), revoked)).toBe(RENEWAL_MODE.MANUAL);
  });
});

describe("AFA policy", () => {
  it("uses the RBI ceiling as a threshold, not a capability switch", () => {
    expect(AFA_EXEMPT_LIMIT_MINOR).toBe(1_500_000);
    expect(requiresAfa(AFA_EXEMPT_LIMIT_MINOR)).toBe(false);      // exactly at the cap is exempt
    expect(requiresAfa(AFA_EXEMPT_LIMIT_MINOR + 1)).toBe(true);
  });

  // The operator's ruling: annual autopay is RETAINED and AFA is handled in the
  // execution layer. These are the two real prices from ADR-020 at 25 seats.
  it("25 seats monthly is exempt; 25 seats annual crosses the ceiling", () => {
    const monthly = 25 * 129 * 100;          // ₹3,225
    const annual = 25 * 65 * 12 * 100;       // ₹19,500
    expect(requiresAfa(monthly)).toBe(false);
    expect(requiresAfa(annual)).toBe(true);
  });

  it("an AFA-required charge gets a longer notice window", () => {
    expect(predebitNoticeLeadHours(1_000_000)).toBe(PREDEBIT_NOTICE_HOURS.STANDARD);
    expect(predebitNoticeLeadHours(1_950_000)).toBe(PREDEBIT_NOTICE_HOURS.AFA);
    expect(PREDEBIT_NOTICE_HOURS.AFA).toBeGreaterThan(PREDEBIT_NOTICE_HOURS.STANDARD);
  });

  // AUTH_REQUIRED must never be collapsed into FAILED: doing so burns a dunning
  // rung for something the customer has done nothing wrong about.
  it("AUTH_REQUIRED is a distinct outcome from FAILED", () => {
    expect(CHARGE_OUTCOME.AUTH_REQUIRED).not.toBe(CHARGE_OUTCOME.FAILED);
    expect(new Set(Object.values(CHARGE_OUTCOME)).size).toBe(3);
  });
});

describe("staged rollout gate", () => {
  const cfg = (over = {}) => ({ scope: AUTOPAY_SCOPE.OFF, allowlist: [], limitPct: 0, ...over });

  it("defaults to OFF, and every malformed value parses to OFF", () => {
    expect(DEFAULT_AUTOPAY_SCOPE).toBe(AUTOPAY_SCOPE.OFF);
    for (const raw of [undefined, null, "", "  ", "yes", "true", "ON", "GA!", "0", "internal "]) {
      const parsed = parseAutopayScope(raw);
      if (raw === "internal ") expect(parsed).toBe(AUTOPAY_SCOPE.INTERNAL); // trimmed + uppercased
      else expect(parsed).toBe(AUTOPAY_SCOPE.OFF);
    }
  });

  it("parses the canonical scopes case-insensitively", () => {
    expect(parseAutopayScope("ga")).toBe(AUTOPAY_SCOPE.GA);
    expect(parseAutopayScope(" Pilot ")).toBe(AUTOPAY_SCOPE.PILOT);
  });

  it("OFF admits nobody, GA admits everyone", () => {
    expect(autopayAllowedFor("w1", cfg({ scope: AUTOPAY_SCOPE.OFF }))).toBe(false);
    expect(autopayAllowedFor("w1", cfg({ scope: AUTOPAY_SCOPE.GA }))).toBe(true);
  });

  it("INTERNAL and PILOT admit the allowlist only", () => {
    for (const scope of [AUTOPAY_SCOPE.INTERNAL, AUTOPAY_SCOPE.PILOT]) {
      expect(autopayAllowedFor("w1", cfg({ scope, allowlist: ["w1"] }))).toBe(true);
      expect(autopayAllowedFor("w2", cfg({ scope, allowlist: ["w1"] }))).toBe(false);
    }
  });

  it("LIMITED admits the allowlist plus a percentage bucket", () => {
    expect(autopayAllowedFor("w-x", cfg({ scope: AUTOPAY_SCOPE.LIMITED, allowlist: ["w-x"], limitPct: 0 }))).toBe(true);
    expect(autopayAllowedFor("w-y", cfg({ scope: AUTOPAY_SCOPE.LIMITED, limitPct: 100 }))).toBe(true);
    expect(autopayAllowedFor("w-y", cfg({ scope: AUTOPAY_SCOPE.LIMITED, limitPct: 0 }))).toBe(false);
  });

  it("a missing workspace id is never admitted, even at GA", () => {
    expect(autopayAllowedFor(null, cfg({ scope: AUTOPAY_SCOPE.GA }))).toBe(false);
    expect(autopayAllowedFor("", cfg({ scope: AUTOPAY_SCOPE.GA }))).toBe(false);
  });

  // STABILITY is the point. A random draw would let a workspace drift in and out
  // between hourly sweep ticks, telling the same customer "renews automatically"
  // on Monday and "renewal is manual" on Tuesday.
  it("the bucket is stable across evaluations", () => {
    const id = "3f2a1b4c-0000-4000-8000-abcdefabcdef";
    const first = rolloutBucket(id);
    for (let i = 0; i < 50; i++) expect(rolloutBucket(id)).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(100);
  });

  it("the bucket distributes across the range", () => {
    const seen = new Set();
    for (let i = 0; i < 400; i++) seen.add(rolloutBucket(`ws-${i}`));
    // A constant or near-constant hash would silently make limitPct meaningless.
    expect(seen.size).toBeGreaterThan(50);
  });

  it("raising the percentage only ever adds workspaces", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `ws-${i}`);
    const at10 = ids.filter(id => autopayAllowedFor(id, cfg({ scope: AUTOPAY_SCOPE.LIMITED, limitPct: 10 })));
    const at50 = ids.filter(id => autopayAllowedFor(id, cfg({ scope: AUTOPAY_SCOPE.LIMITED, limitPct: 50 })));
    for (const id of at10) expect(at50).toContain(id);
  });

  it("parses allowlist and percentage defensively", () => {
    expect(parseAutopayAllowlist("a, b ,, a")).toEqual(["a", "b"]);
    expect(parseAutopayAllowlist(null)).toEqual([]);
    expect(parseAutopayLimitPct("abc")).toBe(0);
    expect(parseAutopayLimitPct("-5")).toBe(0);
    expect(parseAutopayLimitPct("250")).toBe(100);
    expect(parseAutopayLimitPct("25")).toBe(25);
  });
});

describe("derived display state", () => {
  it("no subscription and no mandate read as not set up", () => {
    expect(autopayDisplayState(null, null)).toBe(AUTOPAY_DISPLAY_STATE.NOT_SET_UP);
    expect(autopayDisplayState(sub({ mandateId: null }), null)).toBe(AUTOPAY_DISPLAY_STATE.NOT_SET_UP);
  });

  it("a live mandate reads as active", () => {
    expect(autopayDisplayState(sub(), mandate())).toBe(AUTOPAY_DISPLAY_STATE.ACTIVE);
  });

  it("an unfinished authorisation reads as pending", () => {
    expect(autopayDisplayState(sub(), mandate({ status: MANDATE_STATUS.PENDING })))
      .toBe(AUTOPAY_DISPLAY_STATE.PENDING_AUTH);
  });

  // The annual case. It outranks every other state because it is the only one
  // where the customer must act to avoid losing seats they are paying for.
  it("an outstanding AFA demand outranks everything else", () => {
    expect(autopayDisplayState(sub({ autopayAuthRequiredAt: new Date() }), mandate()))
      .toBe(AUTOPAY_DISPLAY_STATE.AFA_REQUIRED);
  });

  // A choice and a fault must not render the same. (M50-C: this distinction is
  // not verified until it has been rendered and looked at — that is a Phase 5.5
  // requirement; this test only guarantees the STATES differ.)
  it("a customer's choice and a dead instrument are different states", () => {
    const paused = autopayDisplayState(sub(), mandate({ status: MANDATE_STATUS.PAUSED }));
    const switchedOff = autopayDisplayState(sub({ autopayEnabled: false }), mandate());
    const revoked = autopayDisplayState(sub(), mandate({ status: MANDATE_STATUS.REVOKED }));
    const expired = autopayDisplayState(sub(), mandate({ expiresAt: at(-1 * DAY) }));

    expect(paused).toBe(AUTOPAY_DISPLAY_STATE.PAUSED);
    expect(switchedOff).toBe(AUTOPAY_DISPLAY_STATE.PAUSED);
    expect(revoked).toBe(AUTOPAY_DISPLAY_STATE.NEEDS_ATTENTION);
    expect(expired).toBe(AUTOPAY_DISPLAY_STATE.NEEDS_ATTENTION);
    expect(paused).not.toBe(revoked);
  });
});
