// M49 — platform roles must never originate from customer-controlled input.
//
// Found in the M48 independent review. POST /api/users read `role` straight from
// the request body and validated it nowhere — not in the route, not in
// storage.createUser. Its two guards are both NEGATIVE (they constrain SUB_ADMIN
// and ROOT_ADMIN callers), so a workspace OWNER — role USER, parent_id NULL, the
// shape every self-service customer has — matched neither and could submit
// `role: "ROOT_ADMIN"`.
//
// The sibling endpoint /api/users/invite already did this correctly with a
// positive whitelist. This file pins both, so the two customer paths that can
// mint an account can never disagree about which roles a customer may assign.
//
// Note on the roles named in the review: USER_ROLES has exactly three members —
// ROOT_ADMIN, SUB_ADMIN, USER. There is no PLATFORM_OPERATOR or SUPPORT_RECOVERY
// *role*; the operator is identified by username (ADMIN_USERNAME) and
// `support_recovery` is simply an account holding ROOT_ADMIN. So rejecting those
// names is the same requirement as rejecting any unrecognised role, and both are
// covered below.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES } from "../../shared/schema.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

let httpServer, baseUrl, storage;
const rand = () => Math.random().toString(36).slice(2);

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
});
afterAll(() => httpServer?.close());

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** A self-service customer workspace owner: role USER, parent_id NULL. */
async function owner() {
  const u = await storage.createUser({
    username: `own_${rand()}`, email: `own_${rand()}@example.com`, password: `pw-${rand()}`,
    role: USER_ROLES.USER, plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  const s = await storage.createSession(u.id);
  return { user: u, cookie: `token=${s.token}` };
}

const newUser = (role) => ({
  username: `mem_${rand()}`, email: `mem_${rand()}@example.com`, password: `pw-${rand()}`, role,
});

// Every value a customer must not be able to assign. The first is the real
// escalation; the rest are the shapes an attacker actually tries.
const FORBIDDEN = [
  "ROOT_ADMIN",
  "PLATFORM_OPERATOR",
  "SUPPORT_RECOVERY",
  "SUPER_ADMIN",
  "root_admin",      // lower case
  "Root_Admin",      // mixed case
  " ROOT_ADMIN",     // leading space
  "ROOT_ADMIN ",     // trailing space
  "",                // empty
  "ADMIN",
  "nonsense",
];

describe("POST /api/users — a customer may not assign a platform role", () => {
  it.each(FORBIDDEN)("rejects role %j", async (role) => {
    const o = await owner();
    const r = await api("POST", "/api/users", { cookie: o.cookie, body: newUser(role) });
    expect(r.status, `role ${JSON.stringify(role)} was accepted`).toBe(403);
  });

  it("creates NOTHING when the role is rejected", async () => {
    // A 403 that still persisted the row would be the vulnerability with extra
    // steps, so assert the absence of the account, not just the status code.
    const o = await owner();
    const body = newUser("ROOT_ADMIN");
    await api("POST", "/api/users", { cookie: o.cookie, body });
    const created = await storage.getUserByUsername(body.username);
    expect(created, "a rejected role must never reach the database").toBeFalsy();
  });

  it("still allows the customer roles the RBAC model permits", async () => {
    // The fix must not narrow legitimate behaviour: a workspace owner may create
    // a Manager (SUB_ADMIN) or a Member (USER).
    for (const role of [USER_ROLES.SUB_ADMIN, USER_ROLES.USER]) {
      const o = await owner();
      const r = await api("POST", "/api/users", { cookie: o.cookie, body: newUser(role) });
      expect(r.status, `role ${role} should be permitted`).toBeLessThan(400);
    }
  });

  it("a Manager may still create a Member, and still may not create a Manager", async () => {
    const o = await owner();
    const mgrBody = newUser(USER_ROLES.SUB_ADMIN);
    await api("POST", "/api/users", { cookie: o.cookie, body: mgrBody });
    const mgr = await storage.getUserByUsername(mgrBody.username);
    // Provisioned accounts are created with mustResetPassword, which 403s every
    // request. Left set, every assertion below would pass for the WRONG reason —
    // so clear it, then prove the session is actually live before asserting on
    // anything this test is meant to be about.
    await storage.updateUser(mgr.id, { mustResetPassword: false });
    const s = await storage.createSession(mgr.id);
    const mgrCookie = `token=${s.token}`;
    expect((await api("GET", "/api/auth/me", { cookie: mgrCookie })).status,
      "manager session must be live before role assertions mean anything").toBe(200);

    expect((await api("POST", "/api/users", { cookie: mgrCookie, body: newUser(USER_ROLES.USER) })).status).toBeLessThan(400);
    expect((await api("POST", "/api/users", { cookie: mgrCookie, body: newUser(USER_ROLES.SUB_ADMIN) })).status).toBe(403);
    expect((await api("POST", "/api/users", { cookie: mgrCookie, body: newUser("ROOT_ADMIN") })).status).toBe(403);
  });
});

describe("POST /api/users/invite — already correct, pinned so it stays that way", () => {
  it.each(FORBIDDEN)("rejects role %j", async (role) => {
    const o = await owner();
    const r = await api("POST", "/api/users/invite", {
      cookie: o.cookie, body: { email: `inv_${rand()}@example.com`, role },
    });
    expect(r.status, `role ${JSON.stringify(role)} was accepted`).toBeGreaterThanOrEqual(400);
  });

  it("still allows inviting a Manager and a Member", async () => {
    for (const role of [USER_ROLES.SUB_ADMIN, USER_ROLES.USER]) {
      const o = await owner();
      const r = await api("POST", "/api/users/invite", {
        cookie: o.cookie, body: { email: `inv_${rand()}@example.com`, role },
      });
      expect(r.status, `invite role ${role} should be permitted`).toBeLessThan(400);
    }
  });
});

describe("storage rejects an unrecognised role — validation, not authorization", () => {
  // Storage cannot make an AUTHORIZATION decision: it has no caller, so it cannot
  // know whether ROOT_ADMIN is legitimate (it is, for initializeRootAdmin at
  // boot) or an escalation. What it CAN do is refuse a value that is not a role
  // at all, which costs nothing and cannot break the bootstrap path.
  it.each(["PLATFORM_OPERATOR", "SUPPORT_RECOVERY", "root_admin", "nonsense", "ADMIN"])(
    "refuses to persist role %j", async (role) => {
      await expect(storage.createUser({
        username: `bad_${rand()}`, email: `bad_${rand()}@example.com`,
        password: `pw-${rand()}`, role,
      })).rejects.toThrow(/role/i);
    });

  it.each([USER_ROLES.USER, USER_ROLES.SUB_ADMIN, USER_ROLES.ROOT_ADMIN])(
    "still persists the known role %s", async (role) => {
      const u = await storage.createUser({
        username: `ok_${rand()}`, email: `ok_${rand()}@example.com`,
        password: `pw-${rand()}`, role,
      });
      expect(u.role).toBe(role);
    });

  it("still defaults to USER when no role is supplied", async () => {
    const u = await storage.createUser({
      username: `def_${rand()}`, email: `def_${rand()}@example.com`, password: `pw-${rand()}`,
    });
    expect(u.role).toBe(USER_ROLES.USER);
  });
});
