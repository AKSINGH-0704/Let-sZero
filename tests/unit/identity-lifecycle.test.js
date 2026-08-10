// M56 Phase A — identity lifecycle governance, driven through the real routes.
//
// The defect this file exists to keep closed: a workspace owner could deactivate
// THEMSELVES. Every existing guard passed — `adminMiddleware` admits
// `isWorkspaceOwner` explicitly, the ROOT_ADMIN guard only fires when the TARGET
// is ROOT_ADMIN (a customer owner is role USER, since ownership is tree
// position), and `getWorkspaceMemberIds` returns the root itself, so
// `isSameWorkspaceAdmin(owner, owner.id)` is true.
//
// The result was unrecoverable AND still billable: `authMiddleware` 401s them
// with "Contact your administrator" when they ARE the administrator, `reactivate`
// is tree-scoped so no operator route can restore them, the seat subscription
// stayed ACTIVE, and `/api/seats/cancel` is owner-gated — so the only person who
// could stop the charge was the one locked out.
//
// Same real-HTTP pattern as tenant-isolation.test.js: real middleware, real
// authorization, in-memory storage backend.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS } from "../../shared/subscriptionStateMachine.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "mock" })),
  sendTransactionalEmail: vi.fn(async () => {}),
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

async function cookieFor(userId) {
  const s = await storage.createSession(userId);
  return `token=${s.token}`;
}

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const rnd = () => Math.random().toString(36).slice(2);

/** An owner (parentId null = tree root) plus an optional child of a given role. */
async function makeWorkspace({ ownerRole = USER_ROLES.ROOT_ADMIN } = {}) {
  const owner = await storage.createUser({
    username: "own_" + rnd(), email: `own_${rnd()}@example.com`, password: "pw-" + rnd(),
    role: ownerRole, plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  return { owner, cookie: await cookieFor(owner.id) };
}

async function addChild(parentId, role) {
  return await storage.createUser({
    username: "u_" + rnd(), email: `u_${rnd()}@example.com`, password: "pw-" + rnd(),
    role, parentId, isTrialUser: false, mustResetPassword: false,
  });
}

// ── A1 ─────────────────────────────────────────────────────────────────────
describe("A1 — no identity can end its own access", () => {
  it("refuses a ROOT_ADMIN workspace owner deactivating themselves", async () => {
    const { owner, cookie } = await makeWorkspace();
    const res = await api("DELETE", `/api/users/${owner.id}`, { cookie });
    expect(res.status).toBe(409);
    expect(res.json.code).toBe("CANNOT_DEACTIVATE_SELF");

    // The account must still be usable — the point is that nothing happened.
    const after = await storage.getUserById(owner.id);
    expect(after.isActive).toBe(true);
  });

  it("refuses a role-USER workspace owner — the case every prior guard missed", async () => {
    // Ownership is tree position, not role (ADR-017). This owner is role USER,
    // so the ROOT_ADMIN guard never fires for them; only the self-check does.
    const { owner, cookie } = await makeWorkspace({ ownerRole: USER_ROLES.USER });
    const res = await api("DELETE", `/api/users/${owner.id}`, { cookie });
    expect(res.status).toBe(409);
    expect(res.json.code).toBe("CANNOT_DEACTIVATE_SELF");
    expect((await storage.getUserById(owner.id)).isActive).toBe(true);
  });

  it("refuses a manager deactivating themselves", async () => {
    const { owner } = await makeWorkspace();
    const manager = await addChild(owner.id, USER_ROLES.SUB_ADMIN);
    const res = await api("DELETE", `/api/users/${manager.id}`, { cookie: await cookieFor(manager.id) });
    expect(res.status).toBe(409);
    expect((await storage.getUserById(manager.id)).isActive).toBe(true);
  });

  it("still lets an admin deactivate someone else — the guard is not a blanket block", async () => {
    const { owner, cookie } = await makeWorkspace();
    const member = await addChild(owner.id, USER_ROLES.USER);
    const res = await api("DELETE", `/api/users/${member.id}`, { cookie });
    expect(res.status).toBe(200);
    expect((await storage.getUserById(member.id)).isActive).toBe(false);
  });

  it("holds under concurrent duplicate requests (double click, retried refresh)", async () => {
    const { owner, cookie } = await makeWorkspace();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => api("DELETE", `/api/users/${owner.id}`, { cookie }))
    );
    expect(results.every((r) => r.status === 409)).toBe(true);
    expect((await storage.getUserById(owner.id)).isActive).toBe(true);
  });

  it("cannot be bypassed by changing the case of the UUID in the path", async () => {
    // ⚠️ This test found a real defect in the first version of the fix, which
    // compared `req.params.id === req.user.id`. Postgres `uuid` comparison
    // normalises case, so an uppercased UUID resolves the SAME row while a
    // string `===` on the raw parameter is false — the guard was bypassable in
    // production. The in-memory backend does not normalise, so it 404s and the
    // original test passed for the wrong reason (the QA-002 / SEAT-010 parity
    // trap, met inside an authorization guard).
    //
    // The fix compares the CANONICAL `target.id` loaded from storage. The
    // status therefore differs by backend — 404 in memory, 409 on Postgres —
    // so this asserts the property that must hold on BOTH: the account is
    // never deactivated.
    const { owner, cookie } = await makeWorkspace();
    const res = await api("DELETE", `/api/users/${owner.id.toUpperCase()}`, { cookie });
    expect([404, 409]).toContain(res.status);
    expect((await storage.getUserById(owner.id)).isActive).toBe(true);
  });

  it("is checked before any side effect — a self-request leaves sessions intact", async () => {
    const { owner, cookie } = await makeWorkspace();
    await api("DELETE", `/api/users/${owner.id}`, { cookie });
    // If the guard ran late, deleteUserSessions would have invalidated this.
    const stillAuthed = await api("GET", "/api/auth/me", { cookie });
    expect(stillAuthed.status).toBe(200);
  });
});

// ── A2 ─────────────────────────────────────────────────────────────────────
describe("A2 — deactivating an owner never leaves a live subscription", () => {
  async function ownerWithSubscription() {
    const { owner } = await makeWorkspace();
    // A second ROOT_ADMIN in the same tree is the only identity that may
    // deactivate an owner, now that self-deactivation is closed.
    const admin = await addChild(owner.id, USER_ROLES.ROOT_ADMIN);
    await storage.applySeatPurchase(owner.id, {
      seats: 5, term: "MONTHLY", pricingVersion: "2026-07-29.1", renewalAmountMinor: 39500,
    });
    return { owner, adminCookie: await cookieFor(admin.id) };
  }

  it("schedules the subscription to stop at period end, and does not end it now", async () => {
    const { owner, adminCookie } = await ownerWithSubscription();
    const res = await api("DELETE", `/api/users/${owner.id}`, { cookie: adminCookie });
    expect(res.status).toBe(200);

    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub).toBeTruthy();                                   // still entitling
    expect(sub.status).toBe(SUBSCRIPTION_STATUS.CANCEL_SCHEDULED);
    expect(sub.cancelAtPeriodEnd).toBe(true);
    // The commercial relationship is not terminated — the paid period stands.
    expect(sub.seats).toBe(5);
    expect(new Date(sub.periodEnd).getTime()).toBeGreaterThan(Date.now());
  });

  it("records why the subscription was scheduled to stop", async () => {
    const { owner, adminCookie } = await ownerWithSubscription();
    await api("DELETE", `/api/users/${owner.id}`, { cookie: adminCookie });
    const logs = await storage.getAuditLogs({ limit: 200 });
    const entry = logs.find(
      (l) => l.action === "SUBSCRIPTION_CANCEL_SCHEDULED" && l.details?.workspaceRootId === owner.id
    );
    expect(entry, "no audit entry explaining the scheduled cancellation").toBeTruthy();
    expect(entry.details.reason).toMatch(/owner deactivated/i);
  });

  it("does not touch billing when the deactivated user is NOT the owner", async () => {
    const { owner, adminCookie } = await ownerWithSubscription();
    const member = await addChild(owner.id, USER_ROLES.USER);
    await api("DELETE", `/api/users/${member.id}`, { cookie: adminCookie });
    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
    expect(sub.cancelAtPeriodEnd).toBe(false);
  });

  it("deactivates an owner with no subscription without inventing one", async () => {
    const { owner } = await makeWorkspace();
    const admin = await addChild(owner.id, USER_ROLES.ROOT_ADMIN);
    const res = await api("DELETE", `/api/users/${owner.id}`, { cookie: await cookieFor(admin.id) });
    expect(res.status).toBe(200);
    expect(await storage.getWorkspaceSubscription(owner.id)).toBeNull();
  });
});

// ── A3 ─────────────────────────────────────────────────────────────────────
describe("A3 — only invitations that become invalid are revoked", () => {
  it("revokes invites issued BY the deactivated user", async () => {
    // Acceptance sets parentId: invite.invitedBy, so these would create an
    // active member hanging off an inactive parent.
    const { owner, cookie } = await makeWorkspace();
    const manager = await addChild(owner.id, USER_ROLES.SUB_ADMIN);
    await storage.createInvite({
      email: `inv_${rnd()}@example.com`, role: USER_ROLES.USER, invitedBy: manager.id,
      token: rnd() + rnd(), expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    expect(await storage.getPendingInvitesByAdmin(manager.id)).toHaveLength(1);

    const res = await api("DELETE", `/api/users/${manager.id}`, { cookie });
    expect(res.status).toBe(200);
    expect(await storage.getPendingInvitesByAdmin(manager.id)).toHaveLength(0);
    expect(res.json).toBeTruthy();
  });

  it("leaves invites from OTHER active admins untouched", async () => {
    // The workspace still exists and its seats still exist; revoking a
    // colleague's pending hire would be collateral damage.
    const { owner, cookie } = await makeWorkspace();
    const managerA = await addChild(owner.id, USER_ROLES.SUB_ADMIN);
    const managerB = await addChild(owner.id, USER_ROLES.SUB_ADMIN);
    await storage.createInvite({
      email: `a_${rnd()}@example.com`, role: USER_ROLES.USER, invitedBy: managerA.id,
      token: rnd() + rnd(), expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    await storage.createInvite({
      email: `b_${rnd()}@example.com`, role: USER_ROLES.USER, invitedBy: managerB.id,
      token: rnd() + rnd(), expiresAt: new Date(Date.now() + 7 * 86400000),
    });

    await api("DELETE", `/api/users/${managerA.id}`, { cookie });

    expect(await storage.getPendingInvitesByAdmin(managerA.id)).toHaveLength(0);
    expect(await storage.getPendingInvitesByAdmin(managerB.id)).toHaveLength(1);
  });

  it("records the revocation with its reason", async () => {
    const { owner, cookie } = await makeWorkspace();
    const manager = await addChild(owner.id, USER_ROLES.SUB_ADMIN);
    await storage.createInvite({
      email: `r_${rnd()}@example.com`, role: USER_ROLES.USER, invitedBy: manager.id,
      token: rnd() + rnd(), expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    await api("DELETE", `/api/users/${manager.id}`, { cookie });
    const logs = await storage.getAuditLogs({ limit: 200 });
    const entry = logs.find((l) => l.action === "INVITE_REVOKED" && l.details?.invitedBy === manager.id);
    expect(entry, "invite revoked without an audit trail").toBeTruthy();
    expect(entry.details.reason).toMatch(/inviter deactivated/i);
  });
});
