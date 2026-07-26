// Password-reset & account-identity security — P0 regression suite.
//
// Root cause this suite guards against: email is an account identifier used by
// login (OAuth), password reset, and invites, but it was NOT canonical. createUser
// deduped case-SENSITIVELY while getUserByEmail matched case-INSENSITIVELY
// (memoryStorage) or case-sensitively with lowercased callers (Postgres), so
// `Victim@corp.com` and `victim@corp.com` could coexist and a reset lookup could
// resolve to whichever account was inserted first — a cross-account-reset /
// account-takeover vector. Secondary gap: reset-by-token validated and cleared
// the token in two non-atomic steps, so concurrent redemptions could both win.
//
// The fixes verified here:
//   1. normalizeEmail() canonicalizes every account-email read and write.
//   2. Email uniqueness is enforced case-insensitively at every creation/update
//      path (storage layer + POST /api/users).
//   3. getUserByEmail resolves deterministically to a single account.
//   4. A reset token is minted only for the account owning the supplied email
//      and delivered only to that account's own address.
//   5. reset-by-token consumes the token atomically → strict single-use, no
//      cross-account reset, no reuse, safe under concurrency.
//
// Drives the real Express routes over HTTP (same pattern as tenant-isolation)
// against the in-memory backend; only server/email.js is mocked so we can read
// exactly which address a reset link was delivered to.

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import { createServer } from "http";
import crypto from "crypto";
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
let sendTransactionalEmail;

beforeAll(async () => {
  ({ storage } = await import("../../server/storage.js"));
  ({ sendTransactionalEmail } = await import("../../server/email.js"));
  const { registerRoutes } = await import("../../server/routes.js");

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterAll(() => httpServer?.close());

// ── helpers ────────────────────────────────────────────────────────────────

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  const json = await res.json().catch(() => null);
  return { status: res.status, json, setCookie };
}

let seq = 0;
async function makeUser({ email, role = USER_ROLES.USER, emailVerified = true } = {}) {
  seq += 1;
  const uname = `pr_user_${seq}_${Math.random().toString(36).slice(2)}`;
  return storage.createUser({
    username: uname,
    email: email || `${uname}@example.com`,
    password: "OriginalPass123",
    role,
    emailVerified,
    mustResetPassword: false,
    isTrialUser: false,
  });
}

// Mint a reset token directly (mirrors what forgot-password does) so token-
// redemption tests don't each consume a forgot-password rate-limit slot.
async function mintToken(userId, { expiresInMs = 60 * 60 * 1000 } = {}) {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  await storage.setPasswordResetToken(userId, hash, new Date(Date.now() + expiresInMs));
  return raw;
}

function lastResetEmail() {
  const calls = sendTransactionalEmail.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const [to, subject, bodyText] = calls[i];
    if (subject && subject.includes("Reset your RepMail password")) {
      const m = bodyText.match(/\/reset-password\/token\/([a-f0-9]+)/);
      return { to, token: m ? m[1] : null };
    }
  }
  return null;
}

// ── 1. Account identity: canonical, unique, deterministic ────────────────────

describe("Account identity — email resolves deterministically to one account", () => {
  it("createUser rejects a case-variant duplicate email (no case-collision takeover surface)", async () => {
    await makeUser({ email: "Victim@corp.com", role: USER_ROLES.ROOT_ADMIN });
    await expect(
      makeUser({ email: "victim@corp.com" }) // differs only by case
    ).rejects.toThrow(/email already exists/i);
  });

  it("stores email in canonical (lowercased/trimmed) form", async () => {
    const u = await makeUser({ email: "  MixedCase@Example.COM  " });
    expect(u.email).toBe("mixedcase@example.com");
  });

  it("getUserByEmail resolves the same single account regardless of caller casing", async () => {
    const u = await makeUser({ email: "Determinism@corp.com" });
    const a = await storage.getUserByEmail("determinism@corp.com");
    const b = await storage.getUserByEmail("DETERMINISM@CORP.COM");
    const c = await storage.getUserByEmail("  Determinism@corp.com ");
    expect(a?.id).toBe(u.id);
    expect(b?.id).toBe(u.id);
    expect(c?.id).toBe(u.id);
  });

  it("updateUser refuses to change an email to one another account already owns", async () => {
    const a = await makeUser({ email: "owner-a@corp.com" });
    await makeUser({ email: "owner-b@corp.com" });
    await expect(
      storage.updateUser(a.id, { email: "OWNER-B@corp.com" })
    ).rejects.toThrow(/email already exists/i);
  });

  it("POST /api/users rejects a colliding email (case-insensitive) with 409, not just a duplicate username", async () => {
    const admin = await makeUser({ email: "adminroute@corp.com", role: USER_ROLES.ROOT_ADMIN });
    const session = await storage.createSession(admin.id);
    const cookie = `token=${session.token}`;

    // Seed a member whose email the admin will then try to reuse.
    const seeded = `member_${Math.random().toString(36).slice(2)}`;
    const first = await api("POST", "/api/users", {
      cookie,
      body: { username: seeded, email: "shared-seat@corp.com", password: "MemberPass123", role: "SUB_ADMIN" },
    });
    expect(first.status).toBe(201);

    const collision = await api("POST", "/api/users", {
      cookie,
      body: { username: `${seeded}_2`, email: "SHARED-SEAT@corp.com", password: "MemberPass123", role: "SUB_ADMIN" },
    });
    expect(collision.status).toBe(409);
  });
});

// ── 2. Reset token redemption: single-use, single-account ────────────────────

describe("reset-by-token — token is single-use and bound to exactly one account", () => {
  it("valid token resets the password and issues a session for the token's OWN account", async () => {
    const b = await makeUser({ email: "token-owner@corp.com" });
    const raw = await mintToken(b.id);

    const redeem = await api("POST", "/api/auth/reset-by-token", { body: { token: raw, newPassword: "BrandNewPass456" } });
    expect(redeem.status).toBe(200);
    expect(redeem.setCookie).toBeTruthy();

    // The session that was minted must belong to B — never another account.
    const cookie = redeem.setCookie.split(";")[0];
    const me = await api("GET", "/api/auth/me", { cookie });
    expect(me.status).toBe(200);
    expect(me.json.id).toBe(b.id);

    // New password works; old password no longer does.
    const updated = await storage.getUserById(b.id);
    expect(await storage.validatePassword(await raw_user(b.id), "BrandNewPass456")).toBe(true);
    expect(await storage.validatePassword(await raw_user(b.id), "OriginalPass123")).toBe(false);
    expect(updated.mustResetPassword).toBe(false);
  });

  it("an unknown/garbage token is rejected", async () => {
    const res = await api("POST", "/api/auth/reset-by-token", { body: { token: "deadbeef".repeat(8), newPassword: "Whatever123" } });
    expect(res.status).toBe(400);
  });

  it("an expired token is rejected", async () => {
    const e = await makeUser({ email: "expired@corp.com" });
    const raw = await mintToken(e.id, { expiresInMs: -1000 }); // already expired
    const res = await api("POST", "/api/auth/reset-by-token", { body: { token: raw, newPassword: "Whatever123" } });
    expect(res.status).toBe(400);
    // Password unchanged.
    expect(await storage.validatePassword(await raw_user(e.id), "OriginalPass123")).toBe(true);
  });

  it("a token cannot be reused — second redemption fails (single-use)", async () => {
    const r = await makeUser({ email: "reuse@corp.com" });
    const raw = await mintToken(r.id);
    const first = await api("POST", "/api/auth/reset-by-token", { body: { token: raw, newPassword: "FirstUse123" } });
    expect(first.status).toBe(200);
    const second = await api("POST", "/api/auth/reset-by-token", { body: { token: raw, newPassword: "SecondUse123" } });
    expect(second.status).toBe(400);
    // The password remains the one set by the FIRST (only valid) use.
    expect(await storage.validatePassword(await raw_user(r.id), "FirstUse123")).toBe(true);
    expect(await storage.validatePassword(await raw_user(r.id), "SecondUse123")).toBe(false);
  });

  it("concurrent redemptions of the same token: exactly one succeeds (atomic single-use)", async () => {
    const c = await makeUser({ email: "concurrent@corp.com" });
    const raw = await mintToken(c.id);
    const [a, b] = await Promise.all([
      api("POST", "/api/auth/reset-by-token", { body: { token: raw, newPassword: "RaceWinner123" } }),
      api("POST", "/api/auth/reset-by-token", { body: { token: raw, newPassword: "RaceLoser123" } }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 400]);
  });

  it("token minted for one account can never reset a DIFFERENT account", async () => {
    const victim = await makeUser({ email: "cross-victim@corp.com", role: USER_ROLES.ROOT_ADMIN });
    const attacker = await makeUser({ email: "cross-attacker@corp.com" });
    const attackerToken = await mintToken(attacker.id);

    const res = await api("POST", "/api/auth/reset-by-token", { body: { token: attackerToken, newPassword: "AttackerControlled1" } });
    expect(res.status).toBe(200);

    // The session belongs to the attacker's own account, NOT the victim admin.
    const cookie = res.setCookie.split(";")[0];
    const me = await api("GET", "/api/auth/me", { cookie });
    expect(me.json.id).toBe(attacker.id);
    expect(me.json.id).not.toBe(victim.id);

    // The victim admin's password is untouched.
    expect(await storage.validatePassword(await raw_user(victim.id), "OriginalPass123")).toBe(true);
    expect(await storage.validatePassword(await raw_user(victim.id), "AttackerControlled1")).toBe(false);
  });
});

// ── 3. forgot-password: mints for the owner, delivers only to the owner ───────

describe("forgot-password — token minted only for the owning account, delivered only to it", () => {
  it("delivers the reset link to the account's own registered address and nowhere else", async () => {
    const a = await makeUser({ email: "forgot-owner@corp.com" });
    const res = await api("POST", "/api/auth/forgot-password", { body: { email: "Forgot-Owner@corp.com" } }); // mixed case
    expect(res.status).toBe(200);

    const mail = lastResetEmail();
    expect(mail).toBeTruthy();
    expect(mail.to).toBe("forgot-owner@corp.com"); // canonical owner address, not the caller's casing games
    expect(mail.token).toBeTruthy();

    // The delivered token resets exactly this account.
    const redeem = await api("POST", "/api/auth/reset-by-token", { body: { token: mail.token, newPassword: "OwnerReset123" } });
    expect(redeem.status).toBe(200);
    const me = await api("GET", "/api/auth/me", { cookie: redeem.setCookie.split(";")[0] });
    expect(me.json.id).toBe(a.id);
  });

  it("an unknown email returns a generic 200 and mints/sends nothing (no enumeration)", async () => {
    const before = sendTransactionalEmail.mock.calls.length;
    const res = await api("POST", "/api/auth/forgot-password", { body: { email: "nobody-here@nowhere.example" } });
    expect(res.status).toBe(200);
    expect(sendTransactionalEmail.mock.calls.length).toBe(before); // no email sent
  });

  it("repeated requests within the throttle window do not mint a second token", async () => {
    const t = await makeUser({ email: "throttle@corp.com" });
    const first = await api("POST", "/api/auth/forgot-password", { body: { email: "throttle@corp.com" } });
    expect(first.status).toBe(200);
    const tokenAfterFirst = (await storage.getUserById(t.id)).resetToken;

    const countAfterFirst = sendTransactionalEmail.mock.calls.length;
    const second = await api("POST", "/api/auth/forgot-password", { body: { email: "throttle@corp.com" } });
    expect(second.status).toBe(200);
    // No new email, and the stored token is unchanged (no silent re-mint).
    expect(sendTransactionalEmail.mock.calls.length).toBe(countAfterFirst);
    expect((await storage.getUserById(t.id)).resetToken).toBe(tokenAfterFirst);
  });
});

// getUserById sanitizes (strips passwordHash), so validatePassword needs the raw
// stored record. This reaches it through the same normalized-email lookup the
// app uses, proving the account is still resolvable post-reset.
async function raw_user(id) {
  const u = await storage.getUserById(id);
  return storage.getUserByEmail(u.email);
}
