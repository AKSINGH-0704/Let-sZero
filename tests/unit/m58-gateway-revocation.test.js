// M58 / IDENT-008 — a revocation the gateway refused is finished later.
//
// ── THE GAP ─────────────────────────────────────────────────────────────────
// `revokeMandate` withdraws an instrument at the provider, then records it
// locally. When the provider call failed it reported to Sentry and moved on: the
// LOCAL row said REVOKED — so we would never charge it — while the customer's
// standing authorisation stayed live at their bank. On the ownership-transfer
// path that is a DEPARTED owner left authorised for a workspace they no longer
// own, and both the confirmation dialog and the M58 handover email tell them, in
// as many words, that it has been withdrawn.
//
// `storage.transferWorkspaceOwnership` has carried a comment since M51 saying
// "the reconciliation sweep catches any drift". No such sweep existed. This
// tests the one that now does — inside the EXISTING hourly seat sweep, not a
// second scheduler.

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { GATEWAY_REVOKE_PENDING, MANDATE_STATUS } from "../../shared/autopay.js";

// The gateway, mocked at the module boundary — the seam between our intent and
// the bank's answer. The real `providerFor` / `available()` / `revoke()` wiring
// in autopayCharge.js stays in the path under test; only the SDK call at the
// very end of it is a double. `revoke` here IS `rzp.customers.deleteToken`,
// which is what the Razorpay adapter's `revoke({ mandate })` calls.
const revoke = vi.fn(async () => {});
vi.mock("../../server/gateways.js", () => ({
  rzp: {
    customers: { create: vi.fn(), fetch: vi.fn(), deleteToken: (...a) => revoke(...a) },
    orders: { create: vi.fn() },
    payments: { createRecurringPayment: vi.fn(), fetch: vi.fn(), refund: vi.fn() },
  },
  RAZORPAY_KEY_ID: "rzp_test_key",
}));

// An authorisation left open at a customer's bank is not a log line. The
// escalation is part of the contract, so it is asserted rather than assumed.
const captureMessage = vi.fn();
vi.mock("@sentry/node", () => ({
  captureMessage: (...a) => captureMessage(...a),
  captureException: vi.fn(),
  init: vi.fn(),
  setUser: vi.fn(),
}));

let storage, revokeMandate, retryGatewayRevocation, runMandateRevocationPass;

beforeAll(async () => {
  ({ storage } = await import("../../server/storage.js"));
  const charge = await import("../../server/autopayCharge.js");
  revokeMandate = charge.revokeMandate;
  retryGatewayRevocation = charge.retryGatewayRevocation;
  ({ runMandateRevocationPass } = await import("../../server/seatRenewal.js"));
}, 60000);

const rnd = () => Math.random().toString(36).slice(2);

async function workspaceWithMandate({ token = "tok_" + rnd() } = {}) {
  const owner = await storage.createUser({
    username: "own_" + rnd(), email: `own_${rnd()}@example.com`, password: "pw-" + rnd(),
    role: "ROOT_ADMIN", plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  const mandate = await storage.createMandate({
    workspaceRootId: owner.id, provider: "RAZORPAY", method: "CARD",
    providerTokenId: token, providerCustomerId: "cust_" + rnd(),
    instrumentLabel: "•••• 4242",
  });
  await storage.transitionMandate(mandate.id, MANDATE_STATUS.ACTIVE);
  return { owner, mandate: await storage.getMandate(mandate.id) };
}

// Block body, not a concise arrow: a hook that RETURNS a function hands Vitest
// a teardown callback, and a mock is a function.
beforeEach(() => {
  revoke.mockReset().mockResolvedValue(undefined);
  captureMessage.mockReset();
});

/** The alert names raised by `runMandateRevocationPass`. */
const escalations = () =>
  captureMessage.mock.calls.filter(([msg]) => /GATEWAY_REVOKE_UNRESOLVED/.test(msg));

describe("a failed gateway revocation is remembered, not lost", () => {
  it("marks the mandate so something can finish the job", async () => {
    const { mandate } = await workspaceWithMandate();
    revoke.mockRejectedValueOnce(new Error("gateway timeout"));

    await revokeMandate(mandate, { reason: "ownership_transferred" });

    const after = await storage.getMandate(mandate.id);
    // Local revocation still happened — that is the safe direction and must
    // never be conditional on the network.
    expect(after.status).toBe(MANDATE_STATUS.REVOKED);
    expect(after.lastError).toMatch(new RegExp(`^${GATEWAY_REVOKE_PENDING}:`));
    expect(after.lastError).toMatch(/gateway timeout/);
  });

  it("leaves no marker when the gateway accepted it", async () => {
    const { mandate } = await workspaceWithMandate();
    await revokeMandate(mandate, { reason: "customer_revoked" });
    const after = await storage.getMandate(mandate.id);
    expect(after.status).toBe(MANDATE_STATUS.REVOKED);
    expect(after.lastError).toBeNull();
  });

  it("does not queue a mandate that never reached the gateway", async () => {
    // No token means there is nothing on the other side to withdraw. Marking
    // these would fill the queue with work that can never complete.
    const owner = await storage.createUser({
      username: "own_" + rnd(), email: `own_${rnd()}@example.com`, password: "pw-" + rnd(),
      role: "ROOT_ADMIN", plan: "growth", isTrialUser: false, mustResetPassword: false,
    });
    const mandate = await storage.createMandate({
      workspaceRootId: owner.id, provider: "RAZORPAY", method: "CARD",
    });
    revoke.mockRejectedValueOnce(new Error("gateway timeout"));

    await revokeMandate(await storage.getMandate(mandate.id), { reason: "customer_revoked" });

    const after = await storage.getMandate(mandate.id);
    expect(after.status).toBe(MANDATE_STATUS.REVOKED);
    expect(after.lastError).toBeNull();
  });
});

describe("the queue is exactly the work that is outstanding", () => {
  it("returns only marked, tokenised, revoked mandates", async () => {
    const stuck = await workspaceWithMandate();
    revoke.mockRejectedValueOnce(new Error("gateway timeout"));
    await revokeMandate(stuck.mandate, { reason: "ownership_transferred" });

    const clean = await workspaceWithMandate();
    await revokeMandate(clean.mandate, { reason: "customer_revoked" });

    const live = await workspaceWithMandate();   // never revoked at all

    const queue = await storage.getMandatesPendingGatewayRevocation(50);
    const ids = queue.map((m) => m.id);
    expect(ids).toContain(stuck.mandate.id);
    expect(ids).not.toContain(clean.mandate.id);
    expect(ids).not.toContain(live.mandate.id);
  });
});

describe("the sweep finishes what the request path could not", () => {
  it("clears the marker once the provider accepts the withdrawal", async () => {
    const { mandate } = await workspaceWithMandate();
    revoke.mockRejectedValueOnce(new Error("gateway timeout"));
    await revokeMandate(mandate, { reason: "ownership_transferred" });
    expect((await storage.getMandate(mandate.id)).lastError).toBeTruthy();

    const out = await runMandateRevocationPass({ now: new Date(), limit: 50 });
    expect(out.resolved).toBeGreaterThanOrEqual(1);

    const after = await storage.getMandate(mandate.id);
    expect(after.lastError).toBeNull();
    expect(after.status).toBe(MANDATE_STATUS.REVOKED);   // unchanged, as intended
  });

  it("keeps the mandate queued while the provider keeps refusing", async () => {
    const { mandate } = await workspaceWithMandate();
    revoke.mockRejectedValue(new Error("gateway down"));
    await revokeMandate(mandate, { reason: "ownership_transferred" });

    const out = await runMandateRevocationPass({ now: new Date(), limit: 50 });
    expect(out.resolved).toBe(0);
    expect(out.stillPending).toBeGreaterThanOrEqual(1);

    const still = await storage.getMandatesPendingGatewayRevocation(50);
    expect(still.map((m) => m.id)).toContain(mandate.id);
  });

  it("is idempotent — a second pass over resolved work does nothing", async () => {
    const { mandate } = await workspaceWithMandate();
    revoke.mockRejectedValueOnce(new Error("gateway timeout"));
    await revokeMandate(mandate, { reason: "ownership_transferred" });

    await runMandateRevocationPass({ now: new Date(), limit: 50 });
    const second = await runMandateRevocationPass({ now: new Date(), limit: 50 });
    expect(second.considered).toBe(0);
    expect(second.resolved).toBe(0);
  });

  it("never restores a charging capability", async () => {
    // The narrow-blast-radius guarantee: every mandate this pass touches is
    // already REVOKED, so the worst a bug here can do is withdraw twice.
    const { mandate } = await workspaceWithMandate();
    revoke.mockRejectedValueOnce(new Error("gateway timeout"));
    await revokeMandate(mandate, { reason: "ownership_transferred" });
    await runMandateRevocationPass({ now: new Date(), limit: 50 });
    expect((await storage.getMandate(mandate.id)).status).toBe(MANDATE_STATUS.REVOKED);
  });

  it("survives a storage failure without taking the sweep down", async () => {
    const original = storage.getMandatesPendingGatewayRevocation;
    storage.getMandatesPendingGatewayRevocation = async () => { throw new Error("db gone"); };
    try {
      const out = await runMandateRevocationPass({ now: new Date(), limit: 50 });
      expect(out).toEqual({ considered: 0, resolved: 0, stillPending: 0, errors: 0 });
    } finally {
      storage.getMandatesPendingGatewayRevocation = original;
    }
  });
});

describe("an authorisation nobody can withdraw becomes a human's problem", () => {
  it("stays quiet while a retry is still young", async () => {
    const { mandate } = await workspaceWithMandate();
    revoke.mockRejectedValue(new Error("gateway down"));
    await revokeMandate(mandate, { reason: "ownership_transferred" });

    await runMandateRevocationPass({ now: new Date(), limit: 50 });
    expect(escalations()).toHaveLength(0);
  });

  it("alerts once the authorisation has been open for a week", async () => {
    // Nothing here is self-healing after this point: somebody has to open the
    // provider's dashboard. A log line nobody reads is not that somebody.
    const { mandate } = await workspaceWithMandate();
    revoke.mockRejectedValue(new Error("gateway down"));
    await revokeMandate(mandate, { reason: "ownership_transferred" });

    const eightDaysOn = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await runMandateRevocationPass({ now: eightDaysOn, limit: 50 });

    const alerts = escalations();
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    const [, options] = alerts[0];
    expect(options.level).toBe("error");
    expect(options.tags.alert).toBe("GATEWAY_REVOKE_UNRESOLVED");
    // The alert must carry enough to act on without a database session.
    expect(options.extra.mandateId).toBeTruthy();
    expect(options.extra.workspaceRootId).toBeTruthy();
    expect(options.extra.openForDays).toBeGreaterThanOrEqual(7);
  });
});

describe("retryGatewayRevocation refuses work it cannot do", () => {
  it("does nothing for a mandate with no gateway token", async () => {
    const r = await retryGatewayRevocation({ id: "x", provider: "RAZORPAY", providerTokenId: null });
    expect(r).toEqual({ retried: false, revoked: false, reason: "no_token" });
    expect(revoke).not.toHaveBeenCalled();
  });
});
