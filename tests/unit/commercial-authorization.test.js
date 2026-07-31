// Commercial endpoint authorization — the server must enforce the role matrix.
//
// Found in a scoped authorization audit after the TRUST-014 fix:
// POST /api/payments/initiate carried authMiddleware alone, so ANY authenticated
// account could open a Razorpay order against the workspace. The product's own
// role matrix (client/src/components/pricing/TeamCapabilities.jsx) says:
//
//     Purchase credits   Admin ✓   Manager ✗   Member ✗
//     Allocate credits   Admin ✓   Manager ✓   Member ✗
//
// Credits are ALLOCATED to members by the owner. They are not bought by them.
//
// Every case below is driven through the real Express route table with a real
// session, because the defect was in middleware composition — a unit test of the
// handler would have passed while the endpoint stayed open.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES } from "../../shared/schema.js";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

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

/** Owner (parentId null), a Manager (SUB_ADMIN) and a Member (USER) beneath them. */
async function workspace() {
  const owner = await storage.createUser({
    username: `own_${rand()}`, email: `own_${rand()}@example.com`, password: `pw-${rand()}`,
    role: USER_ROLES.ROOT_ADMIN, plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  const manager = await storage.createUser({
    username: `mgr_${rand()}`, email: `mgr_${rand()}@example.com`, password: `pw-${rand()}`,
    role: USER_ROLES.SUB_ADMIN, parentId: owner.id, mustResetPassword: false,
  });
  const member = await storage.createUser({
    username: `mem_${rand()}`, email: `mem_${rand()}@example.com`, password: `pw-${rand()}`,
    role: USER_ROLES.USER, parentId: owner.id, mustResetPassword: false,
  });
  return {
    owner, manager, member,
    ownerCookie: await cookieFor(owner.id),
    managerCookie: await cookieFor(manager.id),
    memberCookie: await cookieFor(member.id),
  };
}

const BUY = { planId: "starter", paymentMethod: "RAZORPAY", currency: "INR" };

describe("purchase credits — Admin only", () => {
  it("a MEMBER cannot initiate a credit purchase", async () => {
    const w = await workspace();
    const r = await api("POST", "/api/payments/initiate", { cookie: w.memberCookie, body: BUY });
    expect(r.status).toBe(403);
    expect(r.json?.code).toBe("NOT_WORKSPACE_OWNER");
  });

  it("a MANAGER cannot initiate a credit purchase either", async () => {
    // The distinction that matters: adminMiddleware would have ADMITTED a Manager.
    // The matrix excludes them, so the gate is workspace ownership, not "admin".
    const w = await workspace();
    const r = await api("POST", "/api/payments/initiate", { cookie: w.managerCookie, body: BUY });
    expect(r.status).toBe(403);
    expect(r.json?.code).toBe("NOT_WORKSPACE_OWNER");
  });

  it("the OWNER is not blocked by the gate", async () => {
    // Asserts only that authorization passed. Razorpay is unconfigured in tests, so
    // the request legitimately fails further down — what must never happen is a 403
    // with NOT_WORKSPACE_OWNER, which would mean the owner had been locked out of
    // their own billing.
    const w = await workspace();
    const r = await api("POST", "/api/payments/initiate", { cookie: w.ownerCookie, body: BUY });
    expect(r.json?.code).not.toBe("NOT_WORKSPACE_OWNER");
    if (r.status === 403) expect(r.json?.message).not.toMatch(/workspace owner/i);
  });

  it("an unauthenticated caller is rejected before the role gate", async () => {
    const r = await api("POST", "/api/payments/initiate", { body: BUY });
    expect(r.status).toBe(401);
  });

  it("no seat purchase is reachable by a member or manager either", async () => {
    // The other way money is spent on a workspace. Same gate, same answer — the two
    // commercial paths must not disagree about who may spend.
    const w = await workspace();
    for (const cookie of [w.memberCookie, w.managerCookie]) {
      const r = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 1, term: "MONTHLY" } });
      expect(r.status).toBe(403);
    }
  });
});

describe("allocate credits — Admin and Manager, never a Member", () => {
  it("a MEMBER cannot allocate credits", async () => {
    const w = await workspace();
    const r = await api("POST", `/api/users/${w.member.id}/allocate-credits`, {
      cookie: w.memberCookie, body: { credits: 10 },
    });
    expect(r.status).toBe(403);
  });

  it("a MANAGER is permitted by the gate — the matrix allows it", async () => {
    const w = await workspace();
    const r = await api("POST", `/api/users/${w.member.id}/allocate-credits`, {
      cookie: w.managerCookie, body: { credits: 10 },
    });
    expect(r.status).not.toBe(403);
  });
});

describe("member management — Admin and Manager, never a Member", () => {
  it.each([
    ["POST", "/api/users", { username: `x_${rand()}`, email: `x_${rand()}@example.com`, password: "pw-x", role: "USER" }],
    ["POST", "/api/users/invite", { email: `y_${rand()}@example.com`, role: "USER" }],
  ])("a MEMBER cannot %s %s", async (method, path, body) => {
    const w = await workspace();
    const r = await api(method, path, { cookie: w.memberCookie, body });
    expect(r.status).toBe(403);
  });
});

describe("seat billing controls — workspace owner only", () => {
  it.each([
    ["/api/seats/renew", {}],
    ["/api/seats/cancel", {}],
    ["/api/seats/resume", {}],
  ])("a MANAGER cannot call %s", async (path, body) => {
    const w = await workspace();
    const r = await api("POST", path, { cookie: w.managerCookie, body });
    expect(r.status).toBe(403);
  });

  it.each([
    ["/api/seats/renew", {}],
    ["/api/seats/cancel", {}],
    ["/api/seats/resume", {}],
  ])("a MEMBER cannot call %s", async (path, body) => {
    const w = await workspace();
    const r = await api("POST", path, { cookie: w.memberCookie, body });
    expect(r.status).toBe(403);
  });
});

describe("payment records stay inside the caller's own account", () => {
  it("a member cannot read another account's payment by id", async () => {
    const a = await workspace();
    const b = await workspace();
    const payment = await storage.createPayment({
      userId: b.owner.id, amount: 390, credits: 3000, planName: "Starter",
      paymentMethod: "RAZORPAY", status: "PENDING",
    });
    const r = await api("GET", `/api/payments/${payment.id}`, { cookie: a.memberCookie });
    expect(r.status).toBe(403);
  });

  it("refunds are platform-operator only, not workspace-owner", async () => {
    // A refund moves money and reverses credits; no customer role may reach it.
    const w = await workspace();
    const payment = await storage.createPayment({
      userId: w.owner.id, amount: 390, credits: 3000, planName: "Starter",
      paymentMethod: "RAZORPAY", status: "SUCCESS",
    });
    for (const cookie of [w.ownerCookie, w.managerCookie, w.memberCookie]) {
      const r = await api("POST", `/api/admin/payments/${payment.id}/refund`, { cookie, body: {} });
      expect(r.status).toBe(403);
    }
  });
});

describe("UX-AUTHZ — the UI never offers what the server would refuse", () => {
  // Audit 203. The server was already correct after Audit 202; the problem was
  // that Payments, the Dashboard and the Team page all still presented purchase
  // journeys to a Manager or Member that could only end in 403.
  //
  // Source guards rather than renders: each surface needs a different provider
  // tree and a seeded role, and what actually matters is that no purchase
  // affordance exists outside an ownership check.
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("Payments gates its purchase surfaces on workspace ownership", async () => {
    const src = strip(await readFile(join(ROOT, "client/src/pages/Payments.jsx"), "utf8"));
    // The gate exists, is derived from the same ownership signal the server uses...
    expect(src).toMatch(/const canPurchase\s*=\s*!user \|\| isWorkspaceOwner/);
    // ...the estimator is behind it, and a non-owner is told who can buy instead.
    expect(src).toMatch(/canPurchase \?[\s\S]{0,400}PricingCalculator/);
    expect(src).toContain("purchase-owner-only");
  });

  it("the Dashboard hides Purchase Credits from a known non-owner", async () => {
    const src = strip(await readFile(join(ROOT, "client/src/pages/Dashboard.jsx"), "utf8"));
    expect(src).toMatch(/\(!user \|\| isWorkspaceOwner\)[\s\S]{0,600}Purchase Credits/);
  });

  it("the Team page hides Buy credits from a Manager", async () => {
    // This page is reachable by canManageTeam, which includes SUB_ADMIN — so the
    // gate here must be ownership, not "can manage the team".
    const src = strip(await readFile(join(ROOT, "client/src/pages/TeamMembers.jsx"), "utf8"));
    expect(src).toMatch(/\(!user \|\| isWorkspaceOwner\)[\s\S]{0,400}Buy credits/);
  });

  it("no purchase affordance restricts on a role check instead of ownership", async () => {
    // adminMiddleware admits a Manager; ownership does not. If a purchase surface
    // is ever gated on isAdmin/canManageTeam, Managers get a 403 journey back.
    for (const f of ["client/src/pages/Payments.jsx", "client/src/pages/Dashboard.jsx"]) {
      const src = strip(await readFile(join(ROOT, f), "utf8"));
      expect(src).not.toMatch(/(isAdmin|canManageTeam)[\s\S]{0,80}Purchase Credits/);
    }
  });

  it("the seat page already explains ownership rather than dead-ending", async () => {
    const src = strip(await readFile(join(ROOT, "client/src/pages/TeamSeats.jsx"), "utf8"));
    expect(src).toContain("seat-not-owner");
    expect(src).toMatch(/Only the workspace owner can change seats or billing/);
  });
});
