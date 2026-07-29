// M42 — convergence guards.
//
// The engineering mandate for this milestone was "one pricing authority, one seat
// authority, one entitlement authority, one billing authority". Guards are how
// that survives the next milestone: these tests fail if someone reintroduces a
// duplicate, drifts the migration from the schema, or hardcodes a price.
//
// Same spirit as the existing warm-up single-ladder guard.

import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { workspaceSubscriptions, PAYMENT_KIND, MAX_TEAM_MEMBERS } from "../../shared/schema.js";
import { SUBSCRIPTION_ENTITLING_STATUSES, SUBSCRIPTION_LIVE_STATUS_SQL } from "../../shared/subscriptionStateMachine.js";
import { getSeatCatalog } from "../../shared/seatPricing.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFile(join(root, p), "utf8");
const catalog = getSeatCatalog();

describe("migration 0008 matches the schema it implements", () => {
  let sql;
  it("loads", async () => { sql = await read("migrations/0008_m42_seat_subscriptions.sql"); expect(sql.length).toBeGreaterThan(0); });

  it("creates every column the Drizzle table declares", async () => {
    sql = await read("migrations/0008_m42_seat_subscriptions.sql");
    // Drizzle table objects carry internal symbols/flags alongside columns, so
    // select only real column configs (those with a columnType).
    const declared = Object.values(workspaceSubscriptions)
      .filter((c) => c && typeof c === "object" && typeof c.name === "string" && c.columnType)
      .map((c) => c.name);
    expect(declared.length).toBeGreaterThan(10);
    for (const col of declared) {
      expect(sql, `migration is missing column "${col}"`).toContain(`"${col}"`);
    }
  });

  it("builds the one-live-subscription index over exactly the entitling statuses", async () => {
    sql = await read("migrations/0008_m42_seat_subscriptions.sql");
    expect(sql).toContain("workspace_subscriptions_one_live_uq");
    // The SQL literal and the runtime list must be the same set — this is the
    // structural guarantee against duplicate entitlement.
    expect(sql).toContain(`WHERE "status" IN (${SUBSCRIPTION_LIVE_STATUS_SQL})`);
    for (const s of SUBSCRIPTION_ENTITLING_STATUSES) expect(SUBSCRIPTION_LIVE_STATUS_SQL).toContain(s);
  });

  it("is entitlement-neutral: it creates no subscription rows and ships the flag OFF", async () => {
    sql = await read("migrations/0008_m42_seat_subscriptions.sql");
    expect(sql).not.toMatch(/INSERT\s+INTO\s+"workspace_subscriptions"/i);
    expect(sql).toContain("'seat_billing_enabled', 'false'");
    // The free floor is seeded at the legacy allowance so enabling the flag alone
    // can never shrink a team.
    expect(sql).toContain(`'seat_free_floor', '${MAX_TEAM_MEMBERS.free}'`);
  });

  it("is safely re-runnable", async () => {
    sql = await read("migrations/0008_m42_seat_subscriptions.sql");
    const creates = sql.match(/CREATE (TABLE|INDEX|UNIQUE INDEX)/gi) || [];
    const guarded = sql.match(/CREATE (TABLE|INDEX|UNIQUE INDEX) IF NOT EXISTS/gi) || [];
    expect(guarded.length).toBe(creates.length);
    for (const stmt of sql.match(/ALTER TABLE[^;]+ADD COLUMN[^;]+;/gi) || []) {
      expect(stmt).toContain("IF NOT EXISTS");
    }
    expect((sql.match(/INSERT INTO "platform_settings"/g) || []).length)
      .toBe((sql.match(/ON CONFLICT \("key"\) DO NOTHING/g) || []).length);
  });

  it("back-fills historical payments as CREDITS", async () => {
    sql = await read("migrations/0008_m42_seat_subscriptions.sql");
    expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT '${PAYMENT_KIND.CREDITS}'`);
  });
});

describe("ONE seat pricing authority", () => {
  it("no surface hardcodes a band rate", async () => {
    // Every band rate must come from shared/seatPricing.js. A literal ₹129/115/99
    // sitting in a page or a route is the start of the drift this milestone exists
    // to prevent (see TRUST-024: a stale ₹129/user/month constant already shipped
    // once and had to be deleted).
    const files = [
      "server/routes.js", "server/fulfillSeats.js", "server/seatRenewal.js",
      "client/src/pages/TeamSeats.jsx", "client/src/pages/TeamMembers.jsx",
      "client/src/components/pricing/SeatCalculator.jsx",
    ];
    const rates = catalog.bands.map((b) => b.rate);
    for (const f of files) {
      const text = await read(f);
      for (const rate of rates) {
        // Match the rate as a standalone number, not as part of a longer literal.
        const hit = new RegExp(`(?<![\\d.])${rate}(?![\\d.])`).test(text);
        expect(hit, `${f} hardcodes the band rate ${rate}`).toBe(false);
      }
    }
  });

  it("keeps a single catalog version constant", async () => {
    const text = await read("shared/seatPricing.js");
    // Word-bounded: SEAT_PRICING_VERSIONS (the plural list) is a different export.
    expect((text.match(/export const SEAT_PRICING_VERSION\b/g) || []).length).toBe(1);
  });

  it("derives the annual rate rather than restating a second table", async () => {
    const text = await read("shared/seatPricing.js");
    // One discount constant; no parallel annual band list.
    expect((text.match(/annualDiscount:/g) || []).length).toBe(1);
    expect(text).not.toMatch(/annualBands\s*[:=]/);
  });
});

describe("ONE seat entitlement authority", () => {
  it("no server module decides a seat ceiling from MAX_TEAM_MEMBERS", async () => {
    // resolveSeatEntitlement is the only place that constant may inform a
    // ceiling; routes and storage must go through it.
    for (const f of ["server/routes.js", "server/storage.js", "server/memoryStorage.js", "server/fulfillSeats.js", "server/seatRenewal.js"]) {
      const text = await read(f);
      expect(text.includes("MAX_TEAM_MEMBERS"), `${f} reads MAX_TEAM_MEMBERS directly`).toBe(false);
    }
  });

  it("the client reads the ceiling from the API, not from the constant", async () => {
    const text = await read("client/src/pages/TeamMembers.jsx");
    expect(text).toContain("/api/seats/subscription");
    expect(text.includes("MAX_TEAM_MEMBERS[")).toBe(false);
  });

  it("no denormalised seat column exists on users", async () => {
    // A cached ceiling on the user row is the classic source of entitlement /
    // billing drift; the whole design depends on there being exactly one copy.
    const text = await read("shared/schema.js");
    const usersBlock = text.slice(text.indexOf("export const users = pgTable"), text.indexOf("export const sessions"));
    expect(usersBlock).not.toMatch(/seats?_entitled|entitled_seats|seat_count/);
  });
});

describe("ONE billing authority", () => {
  it("seat money never routes through the credit clawback", async () => {
    const fulfil = await read("server/fulfillSeats.js");
    // Guard against CALLS, not mentions — the module's own header explains why it
    // deliberately avoids both, and that explanation must stay readable.
    expect(fulfil).not.toMatch(/storage\.refundPayment\s*\(/);
    expect(fulfil).not.toMatch(/(?<!`)\bupgradePlanIfHigher\s*\(/);
  });

  it("every value-moving webhook branch forks on payment kind", async () => {
    const hook = await read("server/razorpayWebhook.js");
    expect(hook).toContain("isSeatPayment");
    // The three branches that move value: fulfillment, refund, lost dispute.
    expect((hook.match(/isSeatPayment\(/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("both storage backends refuse a seat payment in the credit refund path", async () => {
    for (const f of ["server/storage.js", "server/memoryStorage.js"]) {
      expect(await read(f)).toContain("seat_payment_wrong_path");
    }
  });

  it("seat events are audited, never written to the credit ledger", async () => {
    const fulfil = await read("server/fulfillSeats.js");
    expect(fulfil).toContain("createAuditLog");
    expect(fulfil).not.toMatch(/creditTransactions|addCredits|deductCredit/);
  });
});

describe("storage backends stay in parity", () => {
  it("every seat method exists in both", async () => {
    const pg = await read("server/storage.js");
    const mem = await read("server/memoryStorage.js");
    const methods = [
      "getWorkspaceSubscription", "getSeatCommerceConfig", "resolveSeatEntitlement",
      "resolveSeatLimitInTx", "applySeatPurchase", "scheduleSeatChange",
      "transitionSubscription", "renewSubscription", "getSubscriptionsDue",
      "enforceSeatOverage", "transferWorkspaceOwnership",
      "getPendingWorkspaceInviteCount", "updatePayment", "transitionPaymentToRefunded",
    ];
    for (const m of methods) {
      expect(pg.includes(`async ${m}(`), `storage.js missing ${m}`).toBe(true);
      expect(mem.includes(`async ${m}(`), `memoryStorage.js missing ${m}`).toBe(true);
    }
  });
});
