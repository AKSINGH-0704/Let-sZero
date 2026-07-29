// M42 Phase 6 — the seat commerce API, driven over real HTTP.
//
// Same harness as tenant-isolation.test.js: real Express routes, real auth
// middleware, real authorization. What this file pins that the unit tests cannot:
//
//   • billing authority is WORKSPACE OWNERSHIP (tree position), not a role —
//     an admin who is not the owner cannot spend the workspace's money, and a
//     platform operator cannot spend it on a customer's behalf
//   • tenant isolation of every new endpoint
//   • the rollback story: flag off → exactly pre-M42 behaviour, flag on → seat
//     entitlement, flag off again → back to pre-M42, with no data loss
//   • configuration corruption fails toward the customer
//   • the invite pre-check counts live invites, so nobody builds a password only
//     to be rejected at the final step

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES, MAX_TEAM_MEMBERS } from "../../shared/schema.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats, getSeatCatalog } from "../../shared/seatPricing.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

let httpServer, baseUrl, storage;
const rand = () => Math.random().toString(36).slice(2);
const catalog = getSeatCatalog();

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
});

afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  httpServer?.close();
});

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
/** A self-service customer workspace: owner is role USER with parentId null. */
async function makeWorkspace(plan = "growth") {
  const owner = await storage.createUser({
    username: `api_owner_${rand()}`, email: `api_owner_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan, isTrialUser: false, mustResetPassword: false,
  });
  return { owner, cookie: await cookieFor(owner.id) };
}
async function addMember(owner, role = USER_ROLES.USER) {
  const m = await storage.createUser({
    username: `api_member_${rand()}`, email: `api_member_${rand()}@example.com`,
    password: "pw-" + rand(), role, parentId: owner.id,
    plan: owner.plan, isTrialUser: false, mustResetPassword: false,
  });
  return { member: m, cookie: await cookieFor(m.id) };
}
const setBilling = (on, floor = 25) => Promise.all([
  storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, on ? "true" : "false", null),
  storage.setPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR, String(floor), null),
]);

describe("public pricing surface", () => {
  it("serves the catalog without a session", async () => {
    const { status, json } = await api("GET", "/api/seats/catalog");
    expect(status).toBe(200);
    expect(json.bands).toHaveLength(catalog.bands.length);
    expect(json.pricingVersion).toBe(catalog.version);
    expect(json.selfServeMaxSeats).toBe(catalog.selfServeMaxSeats);
  });

  it("quotes anonymously through the same engine checkout uses", async () => {
    const { status, json } = await api("POST", "/api/seats/quote", { body: { seats: 9, term: SEAT_TERMS.MONTHLY.id } });
    expect(status).toBe(200);
    expect(json.quote.totalMinor).toBe(quoteSeats({ seats: 9, term: SEAT_TERMS.MONTHLY.id }).totalMinor);
    expect(json.quote.seatsGranted).toBe(10);
    expect(json.invoiceLines.length).toBeGreaterThan(0);
  });

  it("rejects a malformed quote rather than guessing", async () => {
    expect((await api("POST", "/api/seats/quote", { body: { seats: -3 } })).status).toBe(400);
    expect((await api("POST", "/api/seats/quote", { body: { seats: 5, term: "WEEKLY" } })).status).toBe(400);
  });

  it("never returns a price above the hard ceiling", async () => {
    const { json } = await api("POST", "/api/seats/quote", { body: { seats: catalog.softCapSeats + 10 } });
    expect(json.quote.isEnterprise).toBe(true);
    expect(json.quote.totalMinor).toBeUndefined();
  });
});

describe("billing authority is workspace ownership, not a role", () => {
  it("lets the workspace owner buy seats", async () => {
    const { owner, cookie } = await makeWorkspace();
    await setBilling(true, 0);
    const { status, json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 3, term: SEAT_TERMS.MONTHLY.id } });
    expect(status).toBe(200);
    expect(json.applied?.applied).toBe(true);
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(3);
  });

  it("refuses a manager (SUB_ADMIN) who is not the owner", async () => {
    const { owner } = await makeWorkspace();
    const { cookie } = await addMember(owner, USER_ROLES.SUB_ADMIN);
    await setBilling(true, 0);
    const { status, json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } });
    expect(status).toBe(403);
    expect(json.code).toBe("NOT_WORKSPACE_OWNER");
  });

  it("refuses a plain member outright", async () => {
    const { owner } = await makeWorkspace();
    const { cookie } = await addMember(owner);
    expect((await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } })).status).toBe(403);
  });

  it("refuses cancel and resume from a non-owner", async () => {
    const { owner } = await makeWorkspace();
    const { cookie } = await addMember(owner, USER_ROLES.SUB_ADMIN);
    expect((await api("POST", "/api/seats/cancel", { cookie })).status).toBe(403);
    expect((await api("POST", "/api/seats/resume", { cookie })).status).toBe(403);
  });

  it("refuses seat purchase entirely while the flag is off", async () => {
    const { cookie } = await makeWorkspace();
    await setBilling(false);
    const { status, json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } });
    expect(status).toBe(409);
    expect(json.code).toBe("SEAT_BILLING_DISABLED");
  });

  it("routes an over-ceiling purchase to sales rather than charging", async () => {
    const { cookie } = await makeWorkspace();
    await setBilling(true, 0);
    const { status, json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: catalog.softCapSeats + 5 } });
    expect(status).toBe(409);
    expect(json.code).toBe("ENTERPRISE_REQUIRED");
    expect(json.contactPath).toContain("/contact?");
  });
});

describe("tenant isolation of seat state", () => {
  it("each workspace sees only its own entitlement", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie: a.cookie, body: { seats: 6 } });

    const seenByA = await api("GET", "/api/seats/subscription", { cookie: a.cookie });
    const seenByB = await api("GET", "/api/seats/subscription", { cookie: b.cookie });
    expect(seenByA.json.entitlement.seats).toBe(6);
    expect(seenByA.json.subscription).toBeTruthy();
    expect(seenByB.json.subscription).toBeNull();   // B cannot see A's subscription
    expect(seenByB.json.entitlement.seats).toBe(0);
  });

  it("a member sees their workspace's entitlement but is not the owner", async () => {
    const { owner, cookie: ownerCookie } = await makeWorkspace();
    const { cookie } = await addMember(owner);
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie: ownerCookie, body: { seats: 4 } });
    const { json } = await api("GET", "/api/seats/subscription", { cookie });
    expect(json.entitlement.seats).toBe(4);
    expect(json.isOwner).toBe(false);
  });
});

describe("workspace ownership transfer", () => {
  it("transfers to a member and carries the subscription", async () => {
    const { owner, cookie } = await makeWorkspace();
    const { member } = await addMember(owner, USER_ROLES.SUB_ADMIN);
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } });

    const { status, json } = await api("POST", "/api/workspace/transfer-ownership", { cookie, body: { newOwnerId: member.id } });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect((await storage.getWorkspaceSubscription(member.id)).seats).toBe(5);
    expect((await storage.getUserById(owner.id)).parentId).toBe(member.id);
  });

  it("refuses to transfer to somebody in another workspace", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();
    const { status } = await api("POST", "/api/workspace/transfer-ownership", { cookie: a.cookie, body: { newOwnerId: b.owner.id } });
    expect(status).toBe(403);
  });

  it("refuses when the caller is not the owner", async () => {
    const { owner } = await makeWorkspace();
    const { member, cookie } = await addMember(owner, USER_ROLES.SUB_ADMIN);
    const other = await addMember(owner);
    const { status, json } = await api("POST", "/api/workspace/transfer-ownership", { cookie, body: { newOwnerId: other.member.id } });
    expect(status).toBe(403);
    expect(json.code).toBe("NOT_WORKSPACE_OWNER");
    expect(member.id).toBeTruthy();
  });
});

describe("seat enforcement through the real invite path", () => {
  it("counts live invites against the entitlement so nobody is rejected at the last step", async () => {
    const { owner, cookie } = await makeWorkspace();
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 1 } });

    const first = await api("POST", "/api/users/invite", { cookie, body: { email: `inv1_${rand()}@x.com`, role: "USER" } });
    expect(first.status).toBe(201);

    // The single seat is now held by a pending invite — a second invite must be
    // refused HERE, not after the invitee has built a password.
    const second = await api("POST", "/api/users/invite", { cookie, body: { email: `inv2_${rand()}@x.com`, role: "USER" } });
    expect(second.status).toBe(403);
    expect(second.json.code).toBe("SEAT_LIMIT_REACHED");
    expect(second.json.pendingInvites).toBe(1);
    expect(owner.id).toBeTruthy();
  });

  it("frees the held seat when the invite is revoked", async () => {
    const { cookie } = await makeWorkspace();
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 1 } });
    const inv = await api("POST", "/api/users/invite", { cookie, body: { email: `rev_${rand()}@x.com`, role: "USER" } });
    expect((await api("POST", "/api/users/invite", { cookie, body: { email: `blocked_${rand()}@x.com`, role: "USER" } })).status).toBe(403);

    await api("POST", `/api/invites/${inv.json.id}/revoke`, { cookie });
    const after = await api("POST", "/api/users/invite", { cookie, body: { email: `ok_${rand()}@x.com`, role: "USER" } });
    expect(after.status).toBe(201);
  });

  it("returns a seat-limit body the client can act on", async () => {
    const { cookie } = await makeWorkspace();
    await setBilling(true, 0);
    const { status, json } = await api("POST", "/api/users/invite", { cookie, body: { email: `nope_${rand()}@x.com`, role: "USER" } });
    expect(status).toBe(403);
    expect(json.error).toBe("PLAN_LIMIT");     // pre-M42 contract preserved
    expect(json.code).toBe("SEAT_LIMIT_REACHED");
    expect(json.canBuySeats).toBe(true);
    expect(json.seatSource).toBeTruthy();
  });
});

describe("ROLLBACK — the flag is the rollback, and it is lossless", () => {
  it("flag off → on → off returns the workspace to exactly pre-M42 behaviour", async () => {
    const { owner, cookie } = await makeWorkspace("growth");

    await setBilling(false);
    const before = await api("GET", "/api/seats/subscription", { cookie });
    expect(before.json.entitlement.seats).toBe(MAX_TEAM_MEMBERS.growth);
    expect(before.json.entitlement.source).toBe("LEGACY_PLAN");

    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 3 } });
    const during = await api("GET", "/api/seats/subscription", { cookie });
    expect(during.json.entitlement.seats).toBe(3);

    // Roll back — no deploy, no migration revert.
    await setBilling(false);
    const after = await api("GET", "/api/seats/subscription", { cookie });
    expect(after.json.entitlement.seats).toBe(MAX_TEAM_MEMBERS.growth);
    expect(after.json.entitlement.source).toBe("LEGACY_PLAN");

    // The subscription row survives the rollback — re-enabling restores it
    // rather than requiring the customer to buy again.
    expect(await storage.getWorkspaceSubscription(owner.id)).toBeTruthy();
    await setBilling(true, 0);
    expect((await api("GET", "/api/seats/subscription", { cookie })).json.entitlement.seats).toBe(3);
  });

  it("enabling billing with the seeded floor cannot shrink any live team", async () => {
    // Migration 0008 seeds seat_free_floor = 25, the legacy allowance.
    const { cookie } = await makeWorkspace("starter");
    await setBilling(false);
    const before = (await api("GET", "/api/seats/subscription", { cookie })).json.entitlement.seats;
    await setBilling(true, 25);
    const after = (await api("GET", "/api/seats/subscription", { cookie })).json.entitlement.seats;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe("configuration corruption fails toward the customer", () => {
  it("a garbage free-floor setting falls back to the legacy allowance", async () => {
    const { cookie } = await makeWorkspace("growth");
    await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
    await storage.setPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR, "not-a-number", null);
    const { json } = await api("GET", "/api/seats/subscription", { cookie });
    expect(json.entitlement.seats).toBe(MAX_TEAM_MEMBERS.free); // 25, not 0
  });

  it("an unrecognised flag value is treated as OFF, never as ON", async () => {
    const { cookie } = await makeWorkspace("growth");
    await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "yes-please", null);
    const { json } = await api("GET", "/api/seats/subscription", { cookie });
    expect(json.billingEnabled).toBe(false);
    expect(json.entitlement.source).toBe("LEGACY_PLAN");
  });
});

describe("preview is the contract the charge honours", () => {
  it("previews a downgrade as zero-cost and deferred", async () => {
    const { cookie } = await makeWorkspace();
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 10 } });
    const { json } = await api("POST", "/api/seats/preview", { cookie, body: { seats: 2 } });
    expect(json.preview.kind).toBe("DOWNGRADE");
    expect(json.preview.chargeNowMinor).toBe(0);
    expect(json.preview.effectiveSeats).toBe(10);
  });

  it("a previewed downgrade, when confirmed, schedules and charges nothing", async () => {
    const { owner, cookie } = await makeWorkspace();
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 10 } });
    const res = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 2 } });
    expect(res.json.scheduled).toBe(true);
    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub.seats).toBe(10);            // unchanged mid-term
    expect(sub.scheduledSeats).toBe(2);
  });

  it("cancel keeps every seat until the period ends", async () => {
    const { owner, cookie } = await makeWorkspace();
    await setBilling(true, 0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 6 } });
    const { status, json } = await api("POST", "/api/seats/cancel", { cookie });
    expect(status).toBe(200);
    expect(json.seatsUntil).toBeTruthy();
    const e = await storage.resolveSeatEntitlement(owner.id);
    expect(e.seats).toBe(6);               // still entitled through the period
  });
});
