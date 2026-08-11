// M58 / IDENT-011 — the two people a transfer affects are told, and it is audited.
//
// Before this, a transfer succeeded silently from the incoming owner's side.
// They acquired financial responsibility for a workspace and found out by
// noticing that billing controls had appeared. The outgoing owner was never told
// their saved payment method had been withdrawn — the consequence most likely to
// be discovered at a renewal that did not happen.
//
// Driven through the REAL route, like identity-lifecycle.test.js: real
// middleware, real authorization, in-memory storage, the transport mocked at the
// module boundary so the exact message can be read back.
//
// Every claim asserted here is a claim about somebody's money. Each one must
// match what `transferWorkspaceOwnership` really does (Audit 220 /
// IDENTITY_LIFECYCLE_MATRIX §5) — if the transaction changes, these become lies,
// so they are pinned rather than reviewed.

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES } from "../../shared/schema.js";

const sendTransactionalEmail = vi.fn(async () => {});
vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "mock" })),
  sendTransactionalEmail: (...args) => sendTransactionalEmail(...args),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

let httpServer, baseUrl, storage;

beforeAll(async () => {
  ({ storage } = await import("../../server/storage.js"));
  const { registerRoutes } = await import("../../server/routes.js");
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
}, 60000);

afterAll(() => httpServer?.close());
// Block body, NOT a concise arrow: `mockReset()` returns the mock, and a hook
// that returns a FUNCTION hands Vitest a teardown callback — so a concise arrow
// here makes Vitest CALL the mock after every test, which throws as soon as a
// test installs a failing implementation. Cost an hour; leaving the note.
beforeEach(() => { sendTransactionalEmail.mockReset().mockResolvedValue(undefined); });

const rnd = () => Math.random().toString(36).slice(2);

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function cookieFor(userId) {
  const s = await storage.createSession(userId);
  return `token=${s.token}`;
}

/** An owner, an active successor, and a real seat subscription to be continued. */
async function workspace({ withSubscription = true } = {}) {
  const owner = await storage.createUser({
    username: "Priya" + rnd(), email: `own_${rnd()}@example.com`, password: "pw-" + rnd(),
    role: USER_ROLES.ROOT_ADMIN, plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  const successor = await storage.createUser({
    username: "Ravi" + rnd(), email: `nxt_${rnd()}@example.com`, password: "pw-" + rnd(),
    role: USER_ROLES.USER, parentId: owner.id, isTrialUser: false, mustResetPassword: false,
  });
  if (withSubscription) {
    await storage.applySeatPurchase(owner.id, {
      seats: 4, term: "MONTHLY", pricingVersion: "2026-07-29.1", renewalAmountMinor: 31600,
    });
  }
  return { owner, successor, cookie: await cookieFor(owner.id) };
}

/** The message addressed to `email`, as { subject, body }. */
function messageTo(email) {
  const call = sendTransactionalEmail.mock.calls.find(([to]) => to === email);
  return call ? { subject: call[1], body: call[2] } : null;
}

async function transfer() {
  const w = await workspace();
  const res = await api("POST", "/api/workspace/transfer-ownership", {
    cookie: w.cookie, body: { newOwnerId: w.successor.id },
  });
  expect(res.status).toBe(200);
  return w;
}

describe("both parties are notified", () => {
  it("emails the incoming owner and the outgoing owner", async () => {
    const { owner, successor } = await transfer();
    expect(messageTo(successor.email), "the new owner was never told").toBeTruthy();
    expect(messageTo(owner.email), "the previous owner was never told").toBeTruthy();
  });

  it("sends nothing at all when the transfer is refused", async () => {
    // A refusal must not generate a notification about a change that did not
    // happen — the most alarming email this system could send.
    const { owner, successor, cookie } = await workspace();
    await api("DELETE", `/api/users/${successor.id}`, { cookie });
    sendTransactionalEmail.mockClear();

    const res = await api("POST", "/api/workspace/transfer-ownership", {
      cookie, body: { newOwnerId: successor.id },
    });
    expect(res.status).toBe(403);
    expect(messageTo(successor.email)).toBeNull();
    expect(messageTo(owner.email)).toBeNull();
  });
});

describe("the incoming owner is told what they have taken on", () => {
  it("names the person who handed it over, in the subject", async () => {
    const { owner, successor } = await transfer();
    const m = messageTo(successor.email);
    expect(m.subject).toContain(owner.username);
    expect(m.subject).toMatch(/transferred/i);
  });

  it("states that billing is now theirs", async () => {
    const m = messageTo((await transfer()).successor.email);
    expect(m.body).toMatch(/you are now its owner/i);
    expect(m.body).toMatch(/billing for this workspace is now yours/i);
    expect(m.body).toMatch(/seats, renewals, the payment method and invoices/i);
  });

  it("tells them AUTOMATIC RENEWAL IS OFF and that they must set up their own", async () => {
    // The single most consequential fact for this person. The previous owner's
    // mandate is revoked inside the transfer transaction, so this workspace
    // arrives with no automatic renewal — and the cost of not knowing is the
    // team being deactivated at the end of the period.
    const m = messageTo((await transfer()).successor.email);
    expect(m.body).toMatch(/automatic renewal is currently off/i);
    expect(m.body).toMatch(/renewal is manual/i);
    expect(m.body).toMatch(/nothing is charged automatically/i);
    expect(m.body).toMatch(/\/app\/team\/seats/);
  });

  it("states subscription continuity with the real seats, date and amount", async () => {
    const m = messageTo((await transfer()).successor.email);
    expect(m.body).toMatch(/carries on exactly as it is/i);
    expect(m.body).toMatch(/same 4 seats/i);
    expect(m.body).toMatch(/₹316/);              // renewalAmountMinor 31600
    expect(m.body).toMatch(/nothing is cancelled/i);
  });

  it("does not invent a payment method that never existed", async () => {
    // SELF-REVIEW. The first draft told every incoming owner that the previous
    // owner's card "was withdrawn as part of the handover" — even when there had
    // never been one. A fabricated event, in the message whose whole job is to
    // make this person trust what just happened.
    const m = messageTo((await transfer()).successor.email);
    expect(m.body).toMatch(/there was none on this one, so nothing carried over/i);
    expect(m.body).not.toMatch(/was withdrawn as part of the handover/i);
  });

  it("names the withdrawal when there WAS one", async () => {
    const { owner, successor, cookie } = await workspace();
    const mandate = await storage.createMandate({
      workspaceRootId: owner.id, provider: "RAZORPAY", method: "CARD",
      providerTokenId: "tok_" + rnd(), instrumentLabel: "•••• 4242",
    });
    await storage.transitionMandate(mandate.id, "ACTIVE");
    sendTransactionalEmail.mockClear();

    await api("POST", "/api/workspace/transfer-ownership", { cookie, body: { newOwnerId: successor.id } });
    const m = messageTo(successor.email);
    expect(m.body).toMatch(/was withdrawn as part of the handover/i);
    expect(m.body).toMatch(/can never be charged for this workspace again/i);
  });

  it("gives them a way out if they were not expecting this", async () => {
    const m = messageTo((await transfer()).successor.email);
    expect(m.body).toMatch(/support@letszero\.in/);
  });

  it("says nothing about a subscription when the workspace has none", async () => {
    // Inventing a renewal that does not exist would be worse than saying less.
    const { successor, cookie } = await workspace({ withSubscription: false });
    await api("POST", "/api/workspace/transfer-ownership", { cookie, body: { newOwnerId: successor.id } });
    const m = messageTo(successor.email);
    expect(m.body).not.toMatch(/same renewal date/i);
    expect(m.body).not.toMatch(/same amount/i);
    expect(m.body).not.toMatch(/same \d+ seat/i);
    expect(m.body).not.toMatch(/carries on exactly as it is/i);
    expect(m.body).toMatch(/every campaign, contact, template and verified sending domain/i);
  });
});

describe("the outgoing owner gets a receipt, not a surprise", () => {
  it("confirms who owns it now and that they remain a member", async () => {
    const { owner, successor } = await transfer();
    const m = messageTo(owner.email);
    expect(m.subject).toContain(successor.username);
    expect(m.body).toMatch(/now belongs to/i);
    expect(m.body).toMatch(/you are now a regular member/i);
    expect(m.body).toMatch(/your own credits/i);
  });

  it("says only the new owner can transfer it back", async () => {
    const { owner, successor } = await transfer();
    expect(messageTo(owner.email).body)
      .toMatch(new RegExp(`only ${successor.username} can transfer the workspace back`, "i"));
  });

  it("does not claim a payment method was withdrawn when there was none", async () => {
    // The workspaces above have no mandate. Telling someone their bank
    // authorisation was cancelled when they never had one is a support ticket.
    const m = messageTo((await transfer()).owner.email);
    expect(m.body).toMatch(/no automatic renewal set up/i);
    expect(m.body).not.toMatch(/has been withdrawn, with us and with your bank/i);
  });

  it("states the withdrawal plainly when a mandate WAS revoked", async () => {
    const { owner, successor, cookie } = await workspace();
    const mandate = await storage.createMandate({
      workspaceRootId: owner.id, provider: "RAZORPAY", method: "CARD",
      providerTokenId: "tok_" + rnd(), instrumentLabel: "•••• 4242",
    });
    await storage.transitionMandate(mandate.id, "ACTIVE");
    sendTransactionalEmail.mockClear();

    const res = await api("POST", "/api/workspace/transfer-ownership", {
      cookie, body: { newOwnerId: successor.id },
    });
    expect(res.status).toBe(200);
    const m = messageTo(owner.email);
    expect(m.body).toMatch(/your payment method has been removed/i);
    expect(m.body).toMatch(/with us and with your bank/i);
    expect(m.body).toMatch(/never charged for a workspace you no longer own/i);
  });
});

describe("delivery is audited, including when it fails", () => {
  it("records that both people were told", async () => {
    const { owner, successor } = await transfer();
    const logs = await storage.getAuditLogs({ limit: 300 });
    const entry = logs.find(
      (l) => l.action === "WORKSPACE_OWNERSHIP_TRANSFER_NOTIFIED" && l.targetId === successor.id
    );
    expect(entry, "no audit entry for the notification").toBeTruthy();
    expect(entry.details.newOwnerNotified).toBe(true);
    expect(entry.details.previousOwnerNotified).toBe(true);
    expect(entry.details.allDelivered).toBe(true);
    expect(entry.details.previousOwnerId).toBe(owner.id);
  });

  it("does not fail the transfer when the email cannot be sent", async () => {
    // The transfer has already committed. Reporting a bounced email as a failed
    // transfer sends the customer looking for a rollback that does not exist.
    const { owner, successor, cookie } = await workspace();
    sendTransactionalEmail.mockImplementation(async () => { throw new Error("SES is down"); });

    const res = await api("POST", "/api/workspace/transfer-ownership", {
      cookie, body: { newOwnerId: successor.id },
    });
    expect(res.status).toBe(200);
    expect((await storage.getUserById(successor.id)).parentId).toBeNull();
    expect((await storage.getUserById(owner.id)).parentId).toBe(successor.id);
  });

  it("records the failure, so support can see nobody was told", async () => {
    const { successor, cookie } = await workspace();
    sendTransactionalEmail.mockImplementation(async () => { throw new Error("SES is down"); });
    await api("POST", "/api/workspace/transfer-ownership", { cookie, body: { newOwnerId: successor.id } });

    const logs = await storage.getAuditLogs({ limit: 300 });
    const entry = logs.find(
      (l) => l.action === "WORKSPACE_OWNERSHIP_TRANSFER_NOTIFIED" && l.targetId === successor.id
    );
    expect(entry).toBeTruthy();
    expect(entry.details.newOwnerNotified).toBe(false);
    expect(entry.details.previousOwnerNotified).toBe(false);
    expect(entry.details.allDelivered).toBe(false);
  });

  it("still tells the other person when ONE address fails", async () => {
    const { owner, successor, cookie } = await workspace();
    sendTransactionalEmail.mockImplementation(async (to) => {
      if (to === successor.email) throw new Error("mailbox full");
    });

    await api("POST", "/api/workspace/transfer-ownership", { cookie, body: { newOwnerId: successor.id } });
    expect(messageTo(owner.email)).toBeTruthy();

    const logs = await storage.getAuditLogs({ limit: 300 });
    const entry = logs.find(
      (l) => l.action === "WORKSPACE_OWNERSHIP_TRANSFER_NOTIFIED" && l.targetId === successor.id
    );
    expect(entry.details.newOwnerNotified).toBe(false);
    expect(entry.details.previousOwnerNotified).toBe(true);
    expect(entry.details.allDelivered).toBe(false);
  });
});

describe("the messages never leak internal vocabulary", () => {
  it("uses no engineering or gateway terms", async () => {
    const { owner, successor } = await transfer();
    for (const m of [messageTo(owner.email), messageTo(successor.email)]) {
      for (const leak of [/mandate/i, /gateway/i, /razorpay/i, /parentId/i, /rootId/i,
        /workspaceRootId/i, /AutoPay/, /\bnull\b/, /undefined/]) {
        expect(m.body, `leaked: ${leak}`).not.toMatch(leak);
      }
    }
  });
});
