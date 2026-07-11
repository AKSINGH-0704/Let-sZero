// Contact Management UX milestone (Audit — see engineering/ENGINEERING_MILESTONES.md
// "Contact Management UX"): role-address filtering was applied to Contact Library
// import for the first time (previously only enforced on the campaign wizard's
// raw-upload path — a role address imported into a saved list could persist
// indefinitely and be emailed by every list-based campaign with zero deliverability
// protection). memoryStorage.js's importContactsToList also had a confirmed
// duplicate-row-detection parity gap against storage.js — the in-memory backend
// silently processed intra-batch duplicate emails with no dedup step and
// hardcoded failedRows: 0, meaning the duplicate-row-error UI could never be
// exercised in dev/test mode. Both are regression-tested here via the real HTTP
// route, against the in-memory storage backend (DATABASE_URL unset) — same
// pattern as tests/unit/tenant-isolation.test.js.

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

async function makeUser() {
  const password = "pw-" + Math.random().toString(36).slice(2);
  const user = await storage.createUser({
    username: "user_" + Math.random().toString(36).slice(2),
    email: `user_${Math.random().toString(36).slice(2)}@example.com`,
    password,
    role: USER_ROLES.ROOT_ADMIN,
    plan: "growth",
    isTrialUser: false,
    mustResetPassword: false,
  });
  const cookie = await sessionCookieFor(user.id);
  return { user, cookie };
}

describe("Contact Library import — role-address filtering and duplicate-row parity", () => {
  it("filters role-based addresses out of Contact Library import, same as the campaign wizard's raw-upload path", async () => {
    const { cookie } = await makeUser();
    const listRes = await api("POST", "/api/contact-lists", { cookie, body: { name: "List " + Math.random().toString(36).slice(2) } });
    expect(listRes.status).toBe(201);
    const listId = listRes.json.id;

    const importRes = await api("POST", `/api/contact-lists/${listId}/import`, {
      cookie,
      body: {
        rows: [
          { email: "real.person@example.com" },
          { email: "support@example.com" },
          { email: "admin@example.com" },
        ],
      },
    });

    expect(importRes.status).toBe(201);
    expect(importRes.json.addedToList).toBe(1);
    expect(importRes.json.failedRows).toBe(2);
    const roleReasons = importRes.json.rowErrors.filter(e => e.reason.includes("Role-based address"));
    expect(roleReasons.length).toBe(2);

    const contacts = await api("GET", `/api/contact-lists/${listId}/contacts?page=1&limit=50`, { cookie });
    expect(contacts.json.rows.map(c => c.email)).toEqual(["real.person@example.com"]);
  });

  it("reports intra-batch duplicate emails as row errors (memoryStorage.js parity fix)", async () => {
    const { cookie } = await makeUser();
    const listRes = await api("POST", "/api/contact-lists", { cookie, body: { name: "List " + Math.random().toString(36).slice(2) } });
    const listId = listRes.json.id;

    const importRes = await api("POST", `/api/contact-lists/${listId}/import`, {
      cookie,
      body: {
        rows: [
          { email: "dup@example.com", name: "First occurrence" },
          { email: "unique@example.com" },
          { email: "dup@example.com", name: "Second occurrence — should win" },
        ],
      },
    });

    expect(importRes.status).toBe(201);
    // Only the last occurrence of the duplicate email is kept, matching storage.js's
    // documented "last row in the file wins" behavior.
    expect(importRes.json.newContacts).toBe(2);
    expect(importRes.json.failedRows).toBe(1);
    const dupReasons = importRes.json.rowErrors.filter(e => e.reason.includes("Duplicate of row"));
    expect(dupReasons.length).toBe(1);

    const contacts = await api("GET", `/api/contact-lists/${listId}/contacts?page=1&limit=50&search=dup@example.com`, { cookie });
    expect(contacts.json.rows.length).toBe(1);
    expect(contacts.json.rows[0].name).toBe("Second occurrence — should win");
  });

  it("POST /api/contact-lists/:id/bulk-remove removes exactly the requested contacts and preserves the rest", async () => {
    const { cookie } = await makeUser();
    const listRes = await api("POST", "/api/contact-lists", { cookie, body: { name: "List " + Math.random().toString(36).slice(2) } });
    const listId = listRes.json.id;

    await api("POST", `/api/contact-lists/${listId}/import`, {
      cookie,
      body: { rows: [{ email: "a@example.com" }, { email: "b@example.com" }, { email: "c@example.com" }] },
    });
    const before = await api("GET", `/api/contact-lists/${listId}/contacts?page=1&limit=50`, { cookie });
    const toRemove = before.json.rows.filter(c => c.email !== "c@example.com").map(c => c.id);

    const bulkRes = await api("POST", `/api/contact-lists/${listId}/bulk-remove`, { cookie, body: { contactIds: toRemove } });
    expect(bulkRes.status).toBe(200);
    expect(bulkRes.json.removed).toBe(2);

    const after = await api("GET", `/api/contact-lists/${listId}/contacts?page=1&limit=50`, { cookie });
    expect(after.json.rows.map(c => c.email)).toEqual(["c@example.com"]);
  });
});
