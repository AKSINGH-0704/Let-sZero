// Tenant isolation — emergency correctness milestone (found during M20 Teams/
// Workspace design research, not itself a Teams feature). Root cause: req.isRootAdmin
// meant "any ROOT_ADMIN/isSecondaryRoot account on the platform", not "the root
// admin of THIS resource's own workspace" — a distinction that didn't matter when
// RepMail was single-tenant, but breaks completely once every paying customer
// provisions their own independent ROOT_ADMIN account.
//
// Drives the real Express routes via real HTTP (same pattern as
// teams-end-to-end.test.js) — exercising real auth middleware and real
// authorization checks, not just the underlying storage logic in isolation.
// Only server/email.js is mocked. Runs against the in-memory storage backend
// (DATABASE_URL unset).

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES } from "../../shared/schema.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

let httpServer;
let baseUrl;
let storage;

beforeAll(async () => {
  ({ storage } = await import("../../server/storage.js"));
  const { registerRoutes } = await import("../../server/routes.js");

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  httpServer?.close();
});

// Mints a session directly via storage, bypassing the real login route and its
// rate limiter (5/IP/15min) — this file creates far more accounts/sessions per
// run than that limiter allows, and login itself isn't what's under test here.
async function sessionCookieFor(userId) {
  const session = await storage.createSession(userId);
  return `token=${session.token}`;
}

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function makeWorkspace(planName = "growth") {
  const password = "pw-" + Math.random().toString(36).slice(2);
  const root = await storage.createUser({
    username: "ws_root_" + Math.random().toString(36).slice(2),
    email: `ws_root_${Math.random().toString(36).slice(2)}@example.com`,
    password,
    role: USER_ROLES.ROOT_ADMIN,
    plan: planName,
    isTrialUser: false,
    mustResetPassword: false,
  });
  const cookie = await sessionCookieFor(root.id);
  return { root, cookie };
}

describe("Tenant isolation — cross-workspace access must be denied", () => {
  it("GET /api/audit-logs: a Root Admin sees only their own workspace's audit entries, never another workspace's", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();

    // Generate a distinctive audit entry in each workspace.
    await api("POST", "/api/users", { cookie: a.cookie, body: { username: "a_member_" + Math.random().toString(36).slice(2), email: `a_member_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });
    await api("POST", "/api/users", { cookie: b.cookie, body: { username: "b_member_" + Math.random().toString(36).slice(2), email: `b_member_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });

    const listA = await api("GET", "/api/audit-logs", { cookie: a.cookie });
    expect(listA.status).toBe(200);
    const targetIdsA = listA.json.map(l => l.userId);
    expect(targetIdsA).not.toContain(b.root.id);
    expect(listA.json.every(l => l.userId === a.root.id || targetIdsA.includes(l.userId))).toBe(true);

    // Explicitly requesting the other workspace's root as userId must be rejected, not silently ignored.
    const crossRequest = await api("GET", `/api/audit-logs?userId=${b.root.id}`, { cookie: a.cookie });
    expect(crossRequest.status).toBe(403);
  });

  it("GET /api/audit-logs/export: export is scoped identically, not platform-wide", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace("scale"); // canExportAudit requires Scale+

    // Generate a distinctive, findable audit entry in each workspace.
    const aMarker = "a_marker_" + Math.random().toString(36).slice(2);
    const bMarker = "b_marker_" + Math.random().toString(36).slice(2);
    await api("POST", "/api/users", { cookie: a.cookie, body: { username: aMarker, email: `${aMarker}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });
    await api("POST", "/api/users", { cookie: b.cookie, body: { username: bMarker, email: `${bMarker}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });

    const res = await fetch(`${baseUrl}/api/audit-logs/export`, { headers: { Cookie: b.cookie } });
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain(bMarker);      // B's own action is present
    expect(csv).not.toContain(aMarker);  // A's action must never appear in B's export
  });

  it("GET /api/users: a Root Admin's team list never includes another workspace's members", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();

    const bMemberEmail = `b_member_${Math.random().toString(36).slice(2)}@example.com`;
    const createB = await api("POST", "/api/users", { cookie: b.cookie, body: { username: "b_member_" + Math.random().toString(36).slice(2), email: bMemberEmail, password: "pw-x", role: "SUB_ADMIN" } });
    expect(createB.status).toBe(201);

    const usersA = await api("GET", "/api/users", { cookie: a.cookie });
    expect(usersA.status).toBe(200);
    expect(usersA.json.find(u => u.email === bMemberEmail)).toBeUndefined();
  });

  it("GET /api/campaigns and /api/dashboard/stats: a Root Admin never sees another workspace's campaigns", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();

    await storage.createCampaign({
      userId: b.root.id,
      name: "b-only-campaign-" + Math.random().toString(36).slice(2),
      status: "DRAFT",
      totalEmails: 0,
      contactIds: [],
    });

    const campaignsA = await api("GET", "/api/campaigns", { cookie: a.cookie });
    expect(campaignsA.status).toBe(200);
    expect(campaignsA.json.some(c => c.userId === b.root.id)).toBe(false);

    const statsA = await api("GET", "/api/dashboard/stats", { cookie: a.cookie });
    expect(statsA.status).toBe(200);
    expect(statsA.json.totalCampaigns).toBe(0);
  });

  // Regression for a confirmed memoryStorage/storage.js parity gap (Analytics &
  // Reporting milestone, Audit 113): getDashboardStats used to omit deliveryRate/
  // avgOpenRate/avgClickRate/activeContacts/monthlyChart in dev/test mode entirely,
  // and defined activeCampaigns as RUNNING+PAUSED only (excluding PENDING, unlike
  // storage.js) — a live metric-definition divergence between the two backends.
  it("GET /api/dashboard/stats: memoryStorage returns the full field set, matching storage.js's shape", async () => {
    const a = await makeWorkspace();

    const sent = await storage.createCampaign({
      userId: a.root.id,
      name: "sent-campaign-" + Math.random().toString(36).slice(2),
      status: "COMPLETED",
      totalEmails: 10,
      contactIds: [],
    });
    await storage.updateCampaign(sent.id, {
      sentEmails: 10,
      deliveredEmails: 9,
      openedEmails: 4,
      clickedEmails: 2,
    });
    await storage.createCampaign({
      userId: a.root.id,
      name: "scheduled-campaign-" + Math.random().toString(36).slice(2),
      status: "PENDING",
      totalEmails: 5,
      contactIds: [],
    });

    const stats = await api("GET", "/api/dashboard/stats", { cookie: a.cookie });
    expect(stats.status).toBe(200);
    // PENDING must count toward activeCampaigns, matching storage.js's definition.
    expect(stats.json.activeCampaigns).toBe(1);
    expect(stats.json.deliveryRate).toBeCloseTo(90, 5);
    expect(stats.json.avgOpenRate).toBeCloseTo(40, 5);
    expect(stats.json.avgClickRate).toBeCloseTo(20, 5);
    expect(Array.isArray(stats.json.monthlyChart)).toBe(true);
    expect(stats.json.monthlyChart.length).toBe(6);
    expect(typeof stats.json.activeContacts).toBe("number");
  });

  it("Domain routes: a Root Admin cannot view, check, or delete another workspace's domain", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();

    const bDomain = await storage.createSenderDomain({
      userId: b.root.id,
      domain: "b-workspace-" + Math.random().toString(36).slice(2) + ".example.com",
      fromEmail: "campaigns@example.com",
      status: "VERIFIED",
      dkimTokens: [],
      verificationWindowDays: 14,
    });

    const getA = await api("GET", `/api/domains/${bDomain.id}`, { cookie: a.cookie });
    expect(getA.status).toBe(403);

    const dnsA = await api("GET", `/api/domains/${bDomain.id}/dns-instructions`, { cookie: a.cookie });
    expect(dnsA.status).toBe(403);

    const deleteA = await api("DELETE", `/api/domains/${bDomain.id}`, { cookie: a.cookie });
    expect(deleteA.status).toBe(403);

    // Owning workspace can still access its own domain — regression guard.
    const getB = await api("GET", `/api/domains/${bDomain.id}`, { cookie: b.cookie });
    expect(getB.status).toBe(200);
  });

  it("DELETE /api/users/:id and POST /reactivate: a Root Admin cannot deactivate or reactivate another workspace's member", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();

    const createB = await api("POST", "/api/users", { cookie: b.cookie, body: { username: "b_member_" + Math.random().toString(36).slice(2), email: `b_member_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });
    const bMemberId = createB.json.id;

    const deactivateAttempt = await api("DELETE", `/api/users/${bMemberId}`, { cookie: a.cookie });
    expect(deactivateAttempt.status).toBe(403);

    // Owning workspace can still deactivate/reactivate its own member — regression guard.
    const ownDeactivate = await api("DELETE", `/api/users/${bMemberId}`, { cookie: b.cookie });
    expect(ownDeactivate.status).toBe(200);

    const reactivateAttempt = await api("POST", `/api/users/${bMemberId}/reactivate`, { cookie: a.cookie });
    expect(reactivateAttempt.status).toBe(403);

    const ownReactivate = await api("POST", `/api/users/${bMemberId}/reactivate`, { cookie: b.cookie });
    expect(ownReactivate.status).toBe(200);
  });

  it("POST /api/admin/grant-root-access: a Root Admin cannot grant secondary-root access to another workspace's user", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();

    const createB = await api("POST", "/api/users", { cookie: b.cookie, body: { username: "b_member_" + Math.random().toString(36).slice(2), email: `b_member_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });
    const bMemberId = createB.json.id;

    const grantAttempt = await api("POST", "/api/admin/grant-root-access", { cookie: a.cookie, body: { userId: bMemberId } });
    expect(grantAttempt.status).toBe(403);

    // Owning workspace can still grant within its own team — regression guard.
    const ownGrant = await api("POST", "/api/admin/grant-root-access", { cookie: b.cookie, body: { userId: bMemberId } });
    expect(ownGrant.status).toBe(200);

    const revokeAttempt = await api("POST", "/api/admin/revoke-root-access", { cookie: a.cookie, body: { userId: bMemberId } });
    expect(revokeAttempt.status).toBe(403);
  });

  it("Regression guard: existing SUB_ADMIN direct-child-only scoping is unchanged", async () => {
    const a = await makeWorkspace();

    const createSubA = await api("POST", "/api/users", { cookie: a.cookie, body: { username: "a_sub1_" + Math.random().toString(36).slice(2), email: `a_sub1_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });
    const createSubB = await api("POST", "/api/users", { cookie: a.cookie, body: { username: "a_sub2_" + Math.random().toString(36).slice(2), email: `a_sub2_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });
    const sub1Cookie = await sessionCookieFor(createSubA.json.id);
    await api("POST", "/api/auth/reset-password", { cookie: sub1Cookie, body: { newPassword: "sub1-reset-pw" } }); // clear forced mustResetPassword
    const sub2Id = createSubB.json.id;

    // Sub-Admin 1 still cannot touch Sub-Admin 2's sibling account (same workspace, different branch).
    const crossSiblingDeactivate = await api("DELETE", `/api/users/${sub2Id}`, { cookie: sub1Cookie });
    expect(crossSiblingDeactivate.status).toBe(403);
  });

  it("Regression guard: a workspace's own Root Admin retains full workspace-wide reach", async () => {
    const a = await makeWorkspace();

    const createSub = await api("POST", "/api/users", { cookie: a.cookie, body: { username: "a_sub_" + Math.random().toString(36).slice(2), email: `a_sub_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" } });
    const subId = createSub.json.id;
    const subCookie = await sessionCookieFor(createSub.json.id);
    await api("POST", "/api/auth/reset-password", { cookie: subCookie, body: { newPassword: "sub-reset-pw" } }); // clear forced mustResetPassword
    const createGrandchild = await api("POST", "/api/users", { cookie: subCookie, body: { username: "a_gc_" + Math.random().toString(36).slice(2), email: `a_gc_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "USER" } });
    const gcId = createGrandchild.json.id;

    // Root Admin can see and deactivate a grandchild (SUB_ADMIN's own USER), not just direct children.
    const usersA = await api("GET", "/api/users", { cookie: a.cookie });
    expect(usersA.json.some(u => u.id === gcId)).toBe(true);

    const deactivateGrandchild = await api("DELETE", `/api/users/${gcId}`, { cookie: a.cookie });
    expect(deactivateGrandchild.status).toBe(200);
  });
});
