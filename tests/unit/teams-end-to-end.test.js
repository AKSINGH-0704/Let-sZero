// Teams Correctness & Readiness — end-to-end behavioral verification (Audit 102
// follow-up, per explicit operator request). Unlike team-plan-propagation.test.js
// (which calls storage functions directly), this drives the REAL Express routes
// registered by server/routes.js's registerRoutes() over real HTTP (Node's
// built-in fetch, against an ephemeral-port server started in this file) —
// exercising real auth middleware, real cookie-based sessions, real admin/role
// checks, not just the underlying logic in isolation.
//
// Only server/email.js is mocked (matching the exact pattern already used in
// campaign-execution-integrity.test.js) — to capture the real invite-accept
// token that would otherwise only ever leave the process inside a real email
// body, without ever attempting a real AWS SES send. Everything else — the
// actual route handlers, actual storage calls, actual middleware — is real.
//
// Runs against the in-memory storage backend (DATABASE_URL unset).

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { MAX_TEAM_MEMBERS, USER_ROLES } from "../../shared/schema.js";

const sentEmails = [];

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` })),
  sendTransactionalEmail: vi.fn(async (to, subject, text) => {
    sentEmails.push({ to, subject, text });
  }),
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

async function login(username, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const setCookie = res.headers.get("set-cookie");
  const token = setCookie?.match(/token=([^;]+)/)?.[1];
  expect(token, `login failed for ${username}: ${res.status} ${JSON.stringify(await res.json().catch(() => null))}`).toBeTruthy();
  return `token=${token}`;
}

function extractInviteToken(emailText) {
  const m = emailText.match(/[?&]token=([a-f0-9]+)/);
  return m?.[1] ?? null;
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

describe("Teams end-to-end behavioral verification (real HTTP routes, real middleware, mocked email only)", () => {
  it("Root Admin invites Sub-Admin -> accepts -> Sub-Admin invites User -> accepts -> limits enforce -> Root Admin/Enterprise/Trial unaffected", async () => {
    const rootPassword = "root-pw-" + Math.random().toString(36).slice(2);
    const rootAdmin = await storage.createUser({
      username: "e2e_root_" + Math.random().toString(36).slice(2),
      email: `e2e_root_${Math.random().toString(36).slice(2)}@example.com`,
      password: rootPassword,
      role: USER_ROLES.ROOT_ADMIN,
      plan: "growth", // MAX_TEAM_MEMBERS.growth = 10
      isTrialUser: false,
      mustResetPassword: false,
    });

    const rootCookie = await login(rootAdmin.username, rootPassword);

    // ── Root Admin invites a Sub-Admin ──────────────────────────────────────
    const subAdminEmail = `e2e_subadmin_${Math.random().toString(36).slice(2)}@example.com`;
    const invite1 = await api("POST", "/api/users/invite", {
      cookie: rootCookie,
      body: { email: subAdminEmail, role: "SUB_ADMIN" },
    });
    expect(invite1.status).toBe(201);

    // Real transactional email was "sent" (mocked) — extract the real token
    // exactly as a real Sub-Admin would from their inbox.
    const subAdminInviteEmail = sentEmails.find(e => e.to === subAdminEmail);
    expect(subAdminInviteEmail).toBeTruthy();
    const subAdminToken = extractInviteToken(subAdminInviteEmail.text);
    expect(subAdminToken).toBeTruthy();

    // Validate (public, pre-accept) works
    const validate1 = await api("GET", `/api/invites/validate?token=${subAdminToken}`);
    expect(validate1.status).toBe(200);
    expect(validate1.json.role).toBe("SUB_ADMIN");

    // ── Sub-Admin accepts — this is the exact TEAMS-001 code path. The
    // Sub-Admin's own .plan will default to "free"; before the fix this
    // would have failed unconditionally (MAX_TEAM_MEMBERS["free"] = 0). ──
    const subAdminUsername = "e2e_subadmin_" + Math.random().toString(36).slice(2);
    const subAdminPassword = "sub-pw-" + Math.random().toString(36).slice(2);
    const accept1 = await api("POST", "/api/invites/accept", {
      body: { token: subAdminToken, username: subAdminUsername, password: subAdminPassword },
    });
    expect(accept1.status, `Sub-Admin accept failed: ${JSON.stringify(accept1.json)}`).toBe(201);
    expect(accept1.json.user.role).toBe("SUB_ADMIN");
    expect(accept1.json.user.plan).toBe("free"); // confirms the reproduction precondition genuinely held
    const subAdmin = accept1.json.user;

    const subAdminCookie = await login(subAdminUsername, subAdminPassword);

    // ── Sub-Admin invites a User ─────────────────────────────────────────────
    const userEmail = `e2e_user_${Math.random().toString(36).slice(2)}@example.com`;
    const invite2 = await api("POST", "/api/users/invite", {
      cookie: subAdminCookie,
      body: { email: userEmail, role: "USER" },
    });
    expect(invite2.status, `Sub-Admin invite creation failed: ${JSON.stringify(invite2.json)}`).toBe(201);

    const userInviteEmail = sentEmails.find(e => e.to === userEmail);
    expect(userInviteEmail).toBeTruthy();
    const userToken = extractInviteToken(userInviteEmail.text);

    // ── User accepts — Sub-Admin's raw plan is still "free" here too ────────
    const userUsername = "e2e_user_" + Math.random().toString(36).slice(2);
    const userPassword = "user-pw-" + Math.random().toString(36).slice(2);
    const accept2 = await api("POST", "/api/invites/accept", {
      body: { token: userToken, username: userUsername, password: userPassword },
    });
    expect(accept2.status, `User accept failed: ${JSON.stringify(accept2.json)}`).toBe(201);
    expect(accept2.json.user.role).toBe("USER");

    // ── Team limits still enforce correctly (Starter/Growth/Scale caps) ─────
    // Sub-Admin's inherited effective plan is "growth" (limit 10). Seed the
    // remaining 8 direct children straight via storage (not through the real
    // invite/accept HTTP round trip, deliberately — inviteLimiter is 5/admin/
    // hour and registrationLimiter is 5/IP/24h; real invite creation and real
    // acceptance are already proven above with the Sub-Admin's and User's own
    // flow, and again below with the boundary-testing call itself, which IS
    // a real HTTP request). This reaches the real limit without exhausting
    // rate limits meant to protect this exact endpoint in production.
    for (let i = 0; i < 8; i++) {
      await storage.createUser({
        username: `e2e_fill_${i}_${Math.random().toString(36).slice(2)}`,
        email: `e2e_fill_${i}_${Math.random().toString(36).slice(2)}@example.com`,
        password: "fill-pw-" + Math.random().toString(36).slice(2),
        role: USER_ROLES.USER,
        parentId: subAdmin.id,
        plan: "free",
      });
    }
    // Sub-Admin now has 1 (the earlier real invite-accepted User) + 8 (seeded) = 9 direct children.
    const activeCountBeforeBoundary = await storage.getChildUserCount(subAdmin.id);
    expect(activeCountBeforeBoundary).toBe(9);

    // One more real invite (still a real HTTP call through the real route) —
    // this is the 10th, exactly at the growth-plan limit, and MUST be allowed.
    const lastSeatEmail = `e2e_lastseat_${Math.random().toString(36).slice(2)}@example.com`;
    const lastSeatInvite = await api("POST", "/api/users/invite", { cookie: subAdminCookie, body: { email: lastSeatEmail, role: "USER" } });
    expect(lastSeatInvite.status, `10th (limit) invite unexpectedly rejected: ${JSON.stringify(lastSeatInvite.json)}`).toBe(201);
    const lastSeatMail = sentEmails.find(e => e.to === lastSeatEmail);
    const lastSeatToken = extractInviteToken(lastSeatMail.text);
    const lastSeatAccept = await api("POST", "/api/invites/accept", {
      body: { token: lastSeatToken, username: `e2e_lastseat_${Math.random().toString(36).slice(2)}`, password: "lastseat-pw-" + Math.random().toString(36).slice(2) },
    });
    expect(lastSeatAccept.status, `10th (limit) accept unexpectedly rejected: ${JSON.stringify(lastSeatAccept.json)}`).toBe(201);
    // Sub-Admin now has exactly 10 direct children — at the growth limit.
    const overLimitInvite = await api("POST", "/api/users/invite", {
      cookie: subAdminCookie,
      body: { email: `e2e_overlimit_${Math.random().toString(36).slice(2)}@example.com`, role: "USER" },
    });
    expect(overLimitInvite.status).toBe(403);
    expect(overLimitInvite.json.error).toBe("PLAN_LIMIT");

    // ── Root Admin's own flow is unaffected by everything the Sub-Admin did ──
    const teamUsage = await api("GET", "/api/users/team-usage", { cookie: rootCookie });
    expect(teamUsage.status).toBe(200);
    expect(teamUsage.json.totalMembers).toBe(1); // only the Sub-Admin is Root Admin's DIRECT child
    // Root Admin can still invite under their own (separate) 10-seat allowance.
    const rootStillWorks = await api("POST", "/api/users/invite", {
      cookie: rootCookie,
      body: { email: `e2e_root_invite_${Math.random().toString(36).slice(2)}@example.com`, role: "SUB_ADMIN" },
    });
    expect(rootStillWorks.status).toBe(201);
  });

  it("Enterprise plan behavior is unchanged — unlimited team members, no plan-limit rejection", async () => {
    const password = "ent-pw-" + Math.random().toString(36).slice(2);
    const entAdmin = await storage.createUser({
      username: "e2e_enterprise_" + Math.random().toString(36).slice(2),
      email: `e2e_enterprise_${Math.random().toString(36).slice(2)}@example.com`,
      password,
      role: USER_ROLES.ROOT_ADMIN,
      plan: "enterprise",
      isTrialUser: false,
      mustResetPassword: false,
    });
    const cookie = await login(entAdmin.username, password);

    expect(MAX_TEAM_MEMBERS.enterprise).toBe(Infinity);
    for (let i = 0; i < 3; i++) {
      const r = await api("POST", "/api/users/invite", {
        cookie,
        body: { email: `e2e_ent_member_${i}_${Math.random().toString(36).slice(2)}@example.com`, role: "SUB_ADMIN" },
      });
      expect(r.status, `enterprise invite ${i} unexpectedly rejected`).toBe(201);
    }
  });

  it("Trial plan behavior is unchanged — zero team seats, invite blocked immediately", async () => {
    const password = "trial-pw-" + Math.random().toString(36).slice(2);
    const trialAdmin = await storage.createUser({
      username: "e2e_trial_" + Math.random().toString(36).slice(2),
      email: `e2e_trial_${Math.random().toString(36).slice(2)}@example.com`,
      password,
      role: USER_ROLES.ROOT_ADMIN,
      plan: "trial",
      isTrialUser: true,
      mustResetPassword: false,
    });
    const cookie = await login(trialAdmin.username, password);

    expect(MAX_TEAM_MEMBERS.trial).toBe(0);
    const r = await api("POST", "/api/users/invite", {
      cookie,
      body: { email: `e2e_trial_invite_${Math.random().toString(36).slice(2)}@example.com`, role: "USER" },
    });
    expect(r.status).toBe(403);
    expect(r.json.error).toBe("PLAN_LIMIT");
    expect(r.json.limit).toBe(0);
  });
});
