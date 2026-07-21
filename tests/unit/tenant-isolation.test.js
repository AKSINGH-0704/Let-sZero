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
// Hoisted for the TRUST-028 invariant test, which walks the live Express route
// table to find /api/admin routes rather than trusting a hand-written list.
let app;

beforeAll(async () => {
  ({ storage } = await import("../../server/storage.js"));
  const { registerRoutes } = await import("../../server/routes.js");

  app = express();
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

  // ── M37: the two internal operations panels ────────────────────────────────
  //
  // Both were gated on req.isRootAdmin / rootAdminMiddleware, which any
  // customer's own workspace owner satisfies (and so does isSecondaryRoot).
  // Behind them sat genuinely platform-wide data: AI spend aggregated across
  // every tenant, and a delivery-health payload listing other tenants' email
  // addresses. The mutations on the delivery-health panel were already
  // platform-operator-only, so the reads were the doors left open.
  //
  // These assert the *shape of the gate*, not the numbers — the numbers are
  // whatever the shared in-memory store happens to hold when the suite runs.

  it("GET /api/dashboard/stats: a customer's own Root Admin never receives the platform-wide aiStats block", async () => {
    const a = await makeWorkspace();

    const stats = await api("GET", "/api/dashboard/stats", { cookie: a.cookie });
    expect(stats.status).toBe(200);
    expect(stats.json).not.toHaveProperty("aiStats");

    // The workspace-scoped figures must still be there — the fix separated the
    // two flags, it did not narrow what a workspace owner legitimately sees.
    expect(stats.json).toHaveProperty("totalCampaigns");
    expect(stats.json).toHaveProperty("monthlyChart");
  });

  it("GET /api/dashboard/stats: a secondary-root user does not receive aiStats either", async () => {
    const a = await makeWorkspace();
    const createSub = await api("POST", "/api/users", {
      cookie: a.cookie,
      body: { username: "a_sr_" + Math.random().toString(36).slice(2), email: `a_sr_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" },
    });
    const grant = await api("POST", "/api/admin/grant-root-access", { cookie: a.cookie, body: { userId: createSub.json.id } });
    expect(grant.status).toBe(200);

    const srCookie = await sessionCookieFor(createSub.json.id);
    await api("POST", "/api/auth/reset-password", { cookie: srCookie, body: { newPassword: "sr-reset-pw" } });

    const stats = await api("GET", "/api/dashboard/stats", { cookie: srCookie });
    expect(stats.status).toBe(200);
    expect(stats.json).not.toHaveProperty("aiStats");
  });

  it("GET /api/admin/delivery-health: forbidden to a customer's own Root Admin", async () => {
    const a = await makeWorkspace();
    const health = await api("GET", "/api/admin/delivery-health", { cookie: a.cookie });
    expect(health.status).toBe(403);
  });

  it("GET /api/auth/me: isPlatformOperator is false for a customer's own Root Admin", async () => {
    const a = await makeWorkspace();
    const me = await api("GET", "/api/auth/me", { cookie: a.cookie });
    expect(me.status).toBe(200);
    expect(me.json.isPlatformOperator).toBe(false);
    // Still a ROOT_ADMIN — the two are deliberately different signals.
    expect(me.json.role).toBe(USER_ROLES.ROOT_ADMIN);
  });
});

// ── TRUST-028: unscoped platform data requires the platform operator ─────────
//
// The invariant, stated in terms of DATA rather than routes:
//
//   Any handler whose storage call carries no tenant predicate must require
//   platform-operator privileges, whatever the route is named and whatever
//   middleware looks appropriate.
//
// TRUST-027 enumerated mutations and was silent about reads, so the reads it
// did not name kept rootAdminMiddleware while returning other tenants' rows.
// These tests protect the invariant rather than the enumeration: the last block
// walks the live Express route table, so a NEW unscoped admin route added later
// fails here without anyone remembering this file exists.
describe("TRUST-028 — unscoped platform data is platform-operator-only", () => {
  // Every persona that holds some flavour of elevated privilege, plus a plain
  // member. Only the first is RepMail staff; the rest all live inside a
  // customer workspace, and the middle two both satisfy req.isRootAdmin.
  async function makePersonas() {
    // The platform operator is identified by username, exactly as
    // platformOperatorMiddleware and initializeRootAdmin() identify it. Read
    // the env the same way the server does rather than hard-coding "admin".
    const operatorUsername = process.env.ADMIN_USERNAME || "admin";
    const operator = await storage.getUserByUsername(operatorUsername);
    expect(operator, `platform operator "${operatorUsername}" must exist`).toBeTruthy();

    // initializeRootAdmin() seeds this account with mustResetPassword: true, and
    // authMiddleware 403s every non-exempt path until it is cleared. Without
    // this the operator would appear to fail its own authorization checks and
    // the suite would report a gate as "too tight" when it is exactly right.
    const operatorCookie = await sessionCookieFor(operator.id);
    await api("POST", "/api/auth/reset-password", {
      cookie: operatorCookie,
      body: { newPassword: "operator-reset-pw" },
    });

    const rootWorkspace = await makeWorkspace();

    // Secondary root: a SUB_ADMIN granted root-tier access inside a customer
    // workspace. req.isRootAdmin is TRUE for this account and
    // req.isPlatformOperator is false — the account TRUST-028 exists for.
    const subForGrant = await api("POST", "/api/users", {
      cookie: rootWorkspace.cookie,
      body: { username: "t28_sr_" + Math.random().toString(36).slice(2), email: `t28_sr_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" },
    });
    const grant = await api("POST", "/api/admin/grant-root-access", {
      cookie: rootWorkspace.cookie,
      body: { userId: subForGrant.json.id },
    });
    expect(grant.status).toBe(200);

    // Plain sub-admin: elevated within the workspace, but not root-tier.
    const plainSub = await api("POST", "/api/users", {
      cookie: rootWorkspace.cookie,
      body: { username: "t28_sa_" + Math.random().toString(36).slice(2), email: `t28_sa_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "SUB_ADMIN" },
    });

    // Plain member. A root/secondary-root may only create sub-admins, so the
    // USER has to be created by the plain sub-admin.
    const plainSubCookie = await sessionCookieFor(plainSub.json.id);
    await api("POST", "/api/auth/reset-password", { cookie: plainSubCookie, body: { newPassword: "sa-reset-pw" } });
    const member = await api("POST", "/api/users", {
      cookie: plainSubCookie,
      body: { username: "t28_u_" + Math.random().toString(36).slice(2), email: `t28_u_${Math.random().toString(36).slice(2)}@example.com`, password: "pw-x", role: "USER" },
    });
    expect(member.status).toBe(201);

    const secondaryRootCookie = await sessionCookieFor(subForGrant.json.id);
    const memberCookie = await sessionCookieFor(member.json.id);

    // Accounts created through POST /api/users are seeded mustResetPassword,
    // and authMiddleware 403s every non-exempt path until that is cleared.
    // Clearing it matters for correctness of these tests, not convenience: a
    // persona still carrying the flag 403s on EVERYTHING, so an authorization
    // test asserting 403 would pass without the gate under test existing at
    // all. This is the difference between proving a gate and proving nothing.
    for (const cookie of [secondaryRootCookie, memberCookie]) {
      await api("POST", "/api/auth/reset-password", { cookie, body: { newPassword: "persona-reset-pw" } });
    }

    const personas = {
      operator: { label: "Platform Operator", cookie: operatorCookie, expected: 200 },
      customerRoot: { label: "Customer Root Admin", cookie: rootWorkspace.cookie, expected: 403 },
      secondaryRoot: { label: "Secondary Root", cookie: secondaryRootCookie, expected: 403 },
      subAdmin: { label: "Sub Admin", cookie: plainSubCookie, expected: 403 },
      member: { label: "Workspace User", cookie: memberCookie, expected: 403 },
    };

    // Liveness guard, for the same reason. Every persona must be able to reach
    // an ordinary authenticated endpoint; if one cannot, its 403s below are
    // meaningless and this fails loudly here instead of passing quietly there.
    for (const persona of Object.values(personas)) {
      const alive = await api("GET", "/api/auth/me", { cookie: persona.cookie });
      expect(alive.status, `${persona.label} must be a usable session`).toBe(200);
      const ordinary = await api("GET", "/api/campaigns", { cookie: persona.cookie });
      expect(ordinary.status, `${persona.label} must reach an ordinary endpoint`).toBe(200);
    }

    return personas;
  }

  // The endpoints corrected in this patch. Both return data with no tenant
  // predicate: getContactSubmissions() selects the whole table, and the queue
  // route reads BullMQ directly and returns failed jobs carrying campaignId and
  // userId from every tenant.
  const CORRECTED = [
    "/api/admin/contact-submissions",
    "/api/admin/queue/status",
  ];

  for (const endpoint of CORRECTED) {
    it(`GET ${endpoint}: operator 200, every workspace-side role 403`, async () => {
      const p = await makePersonas();
      for (const persona of Object.values(p)) {
        const res = await api("GET", endpoint, { cookie: persona.cookie });
        expect(
          res.status,
          `${persona.label} expected ${persona.expected} on ${endpoint}, got ${res.status}`,
        ).toBe(persona.expected);
      }
    });
  }

  it("the previously-corrected endpoints stay closed (delivery-health, aiStats)", async () => {
    const p = await makePersonas();

    for (const persona of [p.customerRoot, p.secondaryRoot, p.subAdmin, p.member]) {
      const health = await api("GET", "/api/admin/delivery-health", { cookie: persona.cookie });
      expect(health.status, `${persona.label} on delivery-health`).toBe(403);

      const stats = await api("GET", "/api/dashboard/stats", { cookie: persona.cookie });
      expect(stats.status).toBe(200);
      expect(stats.json, `${persona.label} must not receive aiStats`).not.toHaveProperty("aiStats");
    }

    const opHealth = await api("GET", "/api/admin/delivery-health", { cookie: p.operator.cookie });
    expect(opHealth.status).toBe(200);
    const opStats = await api("GET", "/api/dashboard/stats", { cookie: p.operator.cookie });
    expect(opStats.json).toHaveProperty("aiStats");
  });

  // The invariant itself, rather than a list of endpoints. Walks the live
  // Express route table so a NEW /api/admin route added later is caught here
  // even though nobody thought to update this file.
  //
  // Deliberately BEHAVIOURAL, not name-based: it calls each route and checks
  // the response, because the whole lesson of TRUST-027/028 is that middleware
  // names do not tell you whether the data underneath is scoped. Three domain
  // routes guard themselves with an inline req.isPlatformOperator check rather
  // than the middleware, and this test is satisfied by either.
  it("INVARIANT: no /api/admin route is reachable by a non-operator", async () => {
    const p = await makePersonas();

    const stack = app._router?.stack ?? [];
    const adminRoutes = stack
      .filter((l) => l.route?.path?.startsWith?.("/api/admin"))
      .map((l) => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));

    // If this ever returns nothing the test has silently stopped testing.
    expect(adminRoutes.length, "expected to discover /api/admin routes").toBeGreaterThan(5);

    // Workspace-scoped by design: these act only on the caller's OWN workspace
    // (both resolve the target through getWorkspaceMemberIds), so they are
    // correctly reachable by a customer's root admin and are not TRUST-028
    // subjects. Any OTHER route must be operator-only.
    const WORKSPACE_SCOPED = new Set([
      "/api/admin/grant-root-access",
      "/api/admin/revoke-root-access",
    ]);

    const violations = [];
    for (const { path, methods } of adminRoutes) {
      if (WORKSPACE_SCOPED.has(path)) continue;
      // Only probe routes we can call without inventing a resource id; a
      // parameterised route would 404 before reaching its gate and prove
      // nothing either way.
      if (path.includes(":")) continue;
      if (!methods.includes("get")) continue;

      for (const persona of [p.customerRoot, p.secondaryRoot, p.subAdmin, p.member]) {
        const res = await api("GET", path, { cookie: persona.cookie });
        if (res.status !== 403) {
          violations.push(`${persona.label} got ${res.status} on GET ${path} (expected 403)`);
        }
      }
      const asOperator = await api("GET", path, { cookie: p.operator.cookie });
      if (asOperator.status === 403) {
        violations.push(`Platform Operator got 403 on GET ${path} — gate is too tight`);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
