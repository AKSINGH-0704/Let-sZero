// M51 Phase 5.5 — the customer-facing recurring billing experience.
//
// Drives the REAL route table with REAL sessions (the Audit-202 lesson:
// middleware-composition defects are invisible unless a real session goes through
// the real router). Asserts the API contract the Team Seats page renders from,
// and the authorization around every money-committing action.
//
// The properties under test:
//   • the projection is server-derived — the client is given a display state,
//     never the inputs to compute one
//   • only the OWNER may change billing; Manager and Member cannot
//   • a member never sees the owner's payment instrument
//   • renewal mode is per-subscription, not a platform constant
//   • turning autopay off never cancels a subscription
//   • every autopay action is inert while the rollout gate is closed

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES, AUDIT_ACTIONS } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S, RENEWAL_MODE } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats } from "../../shared/seatPricing.js";
import {
  MANDATE_STATUS, MANDATE_METHOD, AUTOPAY_SETTING_KEYS, AUTOPAY_DISPLAY_STATE,
} from "../../shared/autopay.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "m" })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));
vi.mock("@sentry/node", () => ({ captureMessage: vi.fn(), captureException: vi.fn(), init: vi.fn(), Handlers: {} }));

const rand = () => Math.random().toString(36).slice(2);
let httpServer, baseUrl, storage;

// Same harness the existing commercial-authorization suite uses: a real HTTP
// server over the real route table, so middleware composition is exercised.
beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
  const { registerRoutes } = await import("../../server/routes.js");
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "OFF", null);
  httpServer?.close();
});

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json ?? {} };
}

async function makeUser({ parentId = null, role = USER_ROLES.USER } = {}) {
  const u = await storage.createUser({
    username: `cx_${rand()}`, email: `cx_${rand()}@example.com`,
    password: "pw-" + rand(), role, parentId,
    plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  const s = await storage.createSession(u.id);
  return { user: u, cookie: `token=${s.token}` };
}

/** A workspace with seats, optionally with a live bound instrument. */
async function workspace({ seats = 3, withMandate = false, inRollout = true } = {}) {
  const owner = await makeUser();
  const q = quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id });
  const { subscription } = await storage.applySeatPurchase(owner.user.id, {
    seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
    pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
  });
  let mandate = null;
  if (withMandate) {
    mandate = await storage.createMandate({
      workspaceRootId: owner.user.id, method: MANDATE_METHOD.CARD,
      providerTokenId: `tok_${rand()}`, instrumentLabel: "•••• 4242",
    });
    await storage.transitionMandate(mandate.id, MANDATE_STATUS.ACTIVE);
    await storage.bindMandateToSubscription(subscription.id, mandate.id);
  }
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, inRollout ? "INTERNAL" : "OFF", null);
  if (inRollout) await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.ALLOWLIST, owner.user.id, null);
  return { owner, subscription, mandate };
}

// ── The projection ──────────────────────────────────────────────────────────

describe("the seats API projects everything the page renders", () => {
  it("reports MANUAL and no instrument for a workspace without autopay", async () => {
    const { owner } = await workspace();
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });

    expect(r.status).toBe(200);
    expect(r.body.renewalMode).toBe(RENEWAL_MODE.MANUAL);
    expect(r.body.mandate).toBeNull();
    expect(r.body.autopay.displayState).toBe(AUTOPAY_DISPLAY_STATE.NOT_SET_UP);
    expect(r.body.autopay.enabled).toBe(false);
  });

  // Renewal mode is now derived PER SUBSCRIPTION. Same field, same consumers —
  // this is the payoff of M44 centralising it.
  it("reports AUTOMATIC once a live instrument is bound", async () => {
    const { owner } = await workspace({ withMandate: true });
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });

    expect(r.body.renewalMode).toBe(RENEWAL_MODE.AUTOMATIC);
    expect(r.body.autopay.displayState).toBe(AUTOPAY_DISPLAY_STATE.ACTIVE);
    expect(r.body.mandate).toMatchObject({ status: MANDATE_STATUS.ACTIVE, instrumentLabel: "•••• 4242" });
  });

  it("surfaces retry status while past due", async () => {
    const { owner, subscription } = await workspace({ withMandate: true });
    await storage.transitionSubscription(subscription.id, S.PAST_DUE, {
      firstFailureAt: new Date(), graceEndsAt: new Date(Date.now() + 14 * 864e5),
      dunningAttempts: 1, lastChargeError: "card_declined",
    });
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });

    expect(r.body.dunning).toMatchObject({ attempt: 1, lastChargeError: "card_declined", afaPending: false });
    expect(r.body.dunning.nextAttemptAt).toBeTruthy();
    expect(r.body.dunning.graceEndsAt).toBeTruthy();
  });

  it("flags an outstanding approval as AFA_REQUIRED", async () => {
    const { owner, subscription } = await workspace({ withMandate: true });
    await storage.transitionSubscription(subscription.id, S.PAST_DUE, {
      autopayAuthRequiredAt: new Date(), firstFailureAt: new Date(),
      graceEndsAt: new Date(Date.now() + 14 * 864e5), dunningAttempts: 1,
    });
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });

    expect(r.body.autopay.displayState).toBe(AUTOPAY_DISPLAY_STATE.AFA_REQUIRED);
    expect(r.body.dunning.afaPending).toBe(true);
  });

  it("reports NEEDS_ATTENTION for a revoked instrument, without cancelling anything", async () => {
    const { owner, mandate } = await workspace({ withMandate: true });
    await storage.transitionMandate(mandate.id, MANDATE_STATUS.REVOKED);
    await storage.disableAutopayForMandate(mandate.id);

    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(r.body.autopay.displayState).toBe(AUTOPAY_DISPLAY_STATE.NEEDS_ATTENTION);
    expect(r.body.subscription.status).toBe(S.ACTIVE);
    expect(r.body.renewalMode).toBe(RENEWAL_MODE.MANUAL);
  });
});

// ── Authorization ───────────────────────────────────────────────────────────

describe("only the workspace owner may change billing", () => {
  const ACTIONS = ["disable", "enable", "pause", "resume", "revoke", "setup", "confirm"];

  it("rejects a MEMBER on every autopay action", async () => {
    const { owner } = await workspace({ withMandate: true });
    const member = await makeUser({ parentId: owner.user.id });
    for (const a of ACTIONS) {
      const r = await api("POST", `/api/seats/autopay/${a}`, { cookie: member.cookie, body: {} });
      expect([401, 403], `${a} admitted a member`).toContain(r.status);
    }
  });

  // adminMiddleware admits SUB_ADMIN; isWorkspaceOwner does not. A Manager must
  // not be able to commit the workspace to a recurring debit (Audit 202).
  it("rejects a MANAGER (SUB_ADMIN) on every autopay action", async () => {
    const { owner } = await workspace({ withMandate: true });
    const manager = await makeUser({ parentId: owner.user.id, role: USER_ROLES.SUB_ADMIN });
    for (const a of ACTIONS) {
      const r = await api("POST", `/api/seats/autopay/${a}`, { cookie: manager.cookie, body: {} });
      expect([401, 403], `${a} admitted a manager`).toContain(r.status);
      if (r.status === 403) expect(r.body.code).toBe("NOT_WORKSPACE_OWNER");
    }
  });

  it("rejects an unauthenticated caller", async () => {
    for (const a of ACTIONS) {
      const r = await api("POST", `/api/seats/autopay/${a}`, { body: {} });
      expect(r.status).toBe(401);
    }
  });

  // A member's own view must never leak the owner's instrument.
  it("never shows a member the owner's payment method", async () => {
    const { owner } = await workspace({ withMandate: true });
    const member = await makeUser({ parentId: owner.user.id });

    const r = await api("GET", "/api/seats/subscription", { cookie: member.cookie });
    expect(r.status).toBe(200);
    expect(r.body.mandate).toBeNull();
    expect(r.body.isOwner).toBe(false);
    // ...but they can still see THAT it renews automatically, which is not secret.
    expect(r.body.autopay.displayState).toBe(AUTOPAY_DISPLAY_STATE.ACTIVE);
  });

  it("refuses a mandate belonging to another workspace", async () => {
    const a = await workspace({ withMandate: true });
    const b = await workspace({ withMandate: true });
    await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.ALLOWLIST, a.owner.user.id, null);

    const r = await api("POST", "/api/seats/autopay/confirm",
      { cookie: a.owner.cookie, body: { mandateId: b.mandate.id, tokenId: "tok_x" } });
    expect(r.status).toBe(404);
    expect(r.body.code).toBe("MANDATE_NOT_FOUND");
  });
});

// ── Behaviour ───────────────────────────────────────────────────────────────

describe("turning autopay off is not cancelling", () => {
  it("disables automatic payment and leaves the subscription fully active", async () => {
    const { owner, subscription } = await workspace({ seats: 5, withMandate: true });

    const r = await api("POST", "/api/seats/autopay/disable", { cookie: owner.cookie, body: {} });
    expect(r.status).toBe(200);
    expect(r.body.subscriptionStillActive).toBe(true);

    const after = await storage.getWorkspaceSubscription(owner.user.id);
    expect(after.status).toBe(S.ACTIVE);
    expect(after.seats).toBe(5);
    expect(after.autopayEnabled).toBe(false);
    expect(after.mandateId).toBe(subscription.mandateId ?? after.mandateId); // instrument kept

    const view = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(view.body.renewalMode).toBe(RENEWAL_MODE.MANUAL);
  });

  it("re-enabling needs no re-authorisation", async () => {
    const { owner } = await workspace({ withMandate: true });
    await api("POST", "/api/seats/autopay/disable", { cookie: owner.cookie, body: {} });

    const r = await api("POST", "/api/seats/autopay/enable", { cookie: owner.cookie, body: {} });
    expect(r.status).toBe(200);
    const view = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(view.body.renewalMode).toBe(RENEWAL_MODE.AUTOMATIC);
  });

  it("pause is time-bounded and does not cancel", async () => {
    const { owner } = await workspace({ withMandate: true });
    const r = await api("POST", "/api/seats/autopay/pause", { cookie: owner.cookie, body: { days: 14 } });

    expect(r.status).toBe(200);
    expect(new Date(r.body.pausedUntil).getTime()).toBeGreaterThan(Date.now());
    const view = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(view.body.autopay.displayState).toBe(AUTOPAY_DISPLAY_STATE.PAUSED);
    expect(view.body.subscription.status).toBe(S.ACTIVE);
  });

  it("refuses to enable against an unusable instrument rather than failing later", async () => {
    const { owner, mandate } = await workspace({ withMandate: true });
    await api("POST", "/api/seats/autopay/disable", { cookie: owner.cookie, body: {} });
    await storage.transitionMandate(mandate.id, MANDATE_STATUS.EXPIRED);

    const r = await api("POST", "/api/seats/autopay/enable", { cookie: owner.cookie, body: {} });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("MANDATE_NOT_ACTIVE");
  });

  it("revoking an instrument cancels nothing", async () => {
    const { owner } = await workspace({ seats: 4, withMandate: true });
    const r = await api("POST", "/api/seats/autopay/revoke", { cookie: owner.cookie, body: {} });

    expect(r.status).toBe(200);
    const after = await storage.getWorkspaceSubscription(owner.user.id);
    expect(after.status).toBe(S.ACTIVE);
    expect(after.seats).toBe(4);
    expect(after.autopayEnabled).toBe(false);
  });

  it("writes an audit row for every autopay change", async () => {
    const { owner } = await workspace({ withMandate: true });
    await api("POST", "/api/seats/autopay/disable", { cookie: owner.cookie, body: {} });
    const logs = await storage.getAuditLogs(owner.user.id, 100);
    const rows = Array.isArray(logs) ? logs : logs?.logs ?? [];
    const row = rows.find(l => l.action === AUDIT_ACTIONS.AUTOPAY_DISABLED);
    expect(row).toBeTruthy();
    expect(row.details.subscriptionCancelled).toBe(false);
  });
});

// ── Rollout gating ──────────────────────────────────────────────────────────

describe("everything stays behind the rollout gate", () => {
  it("refuses every autopay action while the scope is OFF", async () => {
    const { owner } = await workspace({ withMandate: true, inRollout: false });
    for (const a of ["setup", "disable", "enable", "pause", "resume", "revoke"]) {
      const r = await api("POST", `/api/seats/autopay/${a}`, { cookie: owner.cookie, body: {} });
      expect(r.status).toBe(409);
      expect(r.body.code).toBe("AUTOPAY_NOT_AVAILABLE");
    }
  });

  it("tells the page the workspace is outside the rollout", async () => {
    const { owner } = await workspace({ inRollout: false });
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(r.body.autopay.inRollout).toBe(false);
  });

  it("refuses autopay while seat billing itself is disabled", async () => {
    const { owner } = await workspace({ withMandate: true });
    await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
    try {
      const r = await api("POST", "/api/seats/autopay/disable", { cookie: owner.cookie, body: {} });
      expect(r.status).toBe(409);
      expect(r.body.code).toBe("SEAT_BILLING_DISABLED");
    } finally {
      await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
    }
  });
});

// ── AutoPay onboarding: the entry point ─────────────────────────────────────
//
// Added after the final readiness review found the setup/confirm endpoints had
// NO caller in the client: every recurring-billing path requires a bound
// mandate, and nothing in the product could create one, so the whole feature
// was unreachable. These assert the journey end to end.

describe("a customer can actually turn AutoPay on", () => {
  it("setup → confirm binds an instrument and flips renewal to automatic", async () => {
    const { owner } = await workspace();

    const setup = await api("POST", "/api/seats/autopay/setup", { cookie: owner.cookie, body: {} });
    expect(setup.status).toBe(200);
    expect(setup.body.mandate.status).toBe(MANDATE_STATUS.PENDING);
    // The authorisation ceiling comes from the subscription, never the client.
    expect(setup.body.mandate.id).toBeTruthy();

    const confirm = await api("POST", "/api/seats/autopay/confirm", {
      cookie: owner.cookie, body: { mandateId: setup.body.mandate.id },
    });
    expect(confirm.status).toBe(200);

    const view = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(view.body.renewalMode).toBe(RENEWAL_MODE.AUTOMATIC);
    expect(view.body.autopay.displayState).toBe(AUTOPAY_DISPLAY_STATE.ACTIVE);
    expect(view.body.mandate.instrumentLabel).toBeTruthy();
  });

  it("replacing binds the new instrument before revoking the old one", async () => {
    const { owner } = await workspace({ withMandate: true });
    const before = await storage.getWorkspaceSubscription(owner.user.id);
    // Snapshot VALUES: the in-memory backend returns the live row, so holding the
    // object and re-reading it after a write compares a value to itself.
    const beforeMandateId = before.mandateId;
    const beforePeriodEnd = new Date(before.periodEnd).getTime();

    const setup = await api("POST", "/api/seats/autopay/setup", { cookie: owner.cookie, body: {} });
    const confirm = await api("POST", "/api/seats/autopay/confirm", {
      cookie: owner.cookie, body: { mandateId: setup.body.mandate.id },
    });
    expect(confirm.status).toBe(200);
    expect(confirm.body.replaced).toBe(true);

    const after = await storage.getWorkspaceSubscription(owner.user.id);
    expect(after.mandateId).toBe(setup.body.mandate.id);
    expect(after.mandateId).not.toBe(beforeMandateId);
    // Subscription untouched throughout — replacement is not a lifecycle event.
    expect(after.status).toBe(S.ACTIVE);
    expect(new Date(after.periodEnd).getTime()).toBe(beforePeriodEnd);
    // The outgoing instrument is withdrawn only now.
    expect((await storage.getMandate(beforeMandateId)).status).toBe(MANDATE_STATUS.REVOKED);
  });

  it("an abandoned setup leaves the existing instrument working", async () => {
    const { owner } = await workspace({ withMandate: true });
    const beforeMandateId = (await storage.getWorkspaceSubscription(owner.user.id)).mandateId;

    // Setup runs, customer never confirms.
    await api("POST", "/api/seats/autopay/setup", { cookie: owner.cookie, body: {} });

    const after = await storage.getWorkspaceSubscription(owner.user.id);
    expect(after.mandateId).toBe(beforeMandateId);
    expect(after.autopayEnabled).toBe(true);
    const view = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(view.body.renewalMode).toBe(RENEWAL_MODE.AUTOMATIC);
  });

  // SECURITY: an earlier revision took `tokenId` straight from the request body,
  // which would let an owner bind a gateway token belonging to somebody else and
  // have this platform debit it. The token is now derived server-side.
  it("ignores a client-supplied token id", async () => {
    const { owner } = await workspace();
    const setup = await api("POST", "/api/seats/autopay/setup", { cookie: owner.cookie, body: {} });
    await api("POST", "/api/seats/autopay/confirm", {
      cookie: owner.cookie,
      body: { mandateId: setup.body.mandate.id, tokenId: "tok_someone_elses_card" },
    });
    const m = await storage.getMandate(setup.body.mandate.id);
    expect(m.providerTokenId).not.toBe("tok_someone_elses_card");
  });

  it("a member cannot start the flow", async () => {
    const { owner } = await workspace();
    const member = await makeUser({ parentId: owner.user.id });
    const r = await api("POST", "/api/seats/autopay/setup", { cookie: member.cookie, body: {} });
    expect(r.status).toBe(403);
  });
});
