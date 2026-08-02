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
import { workspaceSubscriptions, paymentMandates, webhookEvents, PAYMENT_KIND, MAX_TEAM_MEMBERS } from "../../shared/schema.js";
import { SUBSCRIPTION_ENTITLING_STATUSES, SUBSCRIPTION_LIVE_STATUS_SQL } from "../../shared/subscriptionStateMachine.js";
import { getSeatCatalog } from "../../shared/seatPricing.js";
import { MANDATE_STATUS, AUTOPAY_SETTING_KEYS, DEFAULT_AUTOPAY_SCOPE } from "../../shared/autopay.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFile(join(root, p), "utf8");
const catalog = getSeatCatalog();

/**
 * Migrations that own columns on `workspace_subscriptions`. Append here when a
 * milestone extends the table — the guard below checks the union, so a column
 * added to the schema with no migration anywhere still fails.
 */
const SUBSCRIPTION_MIGRATIONS = [
  "0008_m42_seat_subscriptions.sql",
  "0009_m51_autopay_mandates.sql",
  "0011_m52_billing_anchor.sql",
];

describe("migration 0008 matches the schema it implements", () => {
  let sql;
  it("loads", async () => { sql = await read("migrations/0008_m42_seat_subscriptions.sql"); expect(sql.length).toBeGreaterThan(0); });

  it("creates every column the Drizzle table declares", async () => {
    // The table now spans more than one migration (M51 added the autopay
    // columns in 0009), so convergence is checked against the UNION of the
    // migrations that own it. Registering a migration here is deliberate: a
    // future milestone that adds a column WITHOUT a migration still fails,
    // which is the drift this guard exists to catch.
    const owning = await Promise.all(
      SUBSCRIPTION_MIGRATIONS.map((f) => read(`migrations/${f}`))
    );
    const combined = owning.join("\n");
    // Drizzle table objects carry internal symbols/flags alongside columns, so
    // select only real column configs (those with a columnType).
    const declared = Object.values(workspaceSubscriptions)
      .filter((c) => c && typeof c === "object" && typeof c.name === "string" && c.columnType)
      .map((c) => c.name);
    expect(declared.length).toBeGreaterThan(10);
    for (const col of declared) {
      expect(combined, `no migration creates column "${col}"`).toContain(`"${col}"`);
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

// M51 — the same convergence discipline applied to the autopay migration.
describe("migration 0009 matches the schema it implements", () => {
  const FILE = "migrations/0009_m51_autopay_mandates.sql";

  it("creates every column the mandate table declares", async () => {
    const sql = await read(FILE);
    const declared = Object.values(paymentMandates)
      .filter((c) => c && typeof c === "object" && typeof c.name === "string" && c.columnType)
      .map((c) => c.name);
    expect(declared.length).toBeGreaterThan(10);
    for (const col of declared) {
      expect(sql, `migration is missing column "${col}"`).toContain(`"${col}"`);
    }
  });

  it("ships the mandate default status the state machine expects", async () => {
    const sql = await read(FILE);
    // Whitespace-tolerant: the migration aligns its column definitions, and the
    // fact under test is the DEFAULT, not the formatting.
    expect(sql).toMatch(
      new RegExp(`"status"\\s+text NOT NULL DEFAULT '${MANDATE_STATUS.PENDING}'`)
    );
  });

  // The idempotency guarantee for token.* webhooks: unlike order.paid they have
  // no pre-existing local row to dedup against, so uniqueness has to be structural.
  it("enforces one local row per gateway token, scoped per provider", async () => {
    const sql = await read(FILE);
    expect(sql).toContain("payment_mandates_provider_token_uq");
    expect(sql).toMatch(/UNIQUE INDEX IF NOT EXISTS "payment_mandates_provider_token_uq"[\s\S]*WHERE "provider_token_id" IS NOT NULL/);
  });

  // The mandate model must stay provider-NEUTRAL so a second gateway can coexist
  // without a schema redesign. A column named after a specific gateway is the
  // start of exactly that redesign.
  it("names no gateway in its columns", async () => {
    const sql = await read(FILE);
    const mandateTable = sql.slice(sql.indexOf("payment_mandates"), sql.indexOf("workspace_subscriptions"));
    expect(mandateTable).not.toMatch(/"razorpay_/);
    expect(sql).toMatch(/"provider"\s+text NOT NULL DEFAULT '[A-Z_]+'/);
  });

  // Deleting an instrument must never delete the subscription it funded — the
  // subscription reverts to manual renewal instead.
  it("detaches an instrument without destroying the subscription", async () => {
    const sql = await read(FILE);
    expect(sql).toMatch(/REFERENCES "payment_mandates"\("id"\) ON DELETE SET NULL/);
  });

  it("is billing-neutral: no mandates created, autopay defaults off, scope ships OFF", async () => {
    const sql = await read(FILE);
    expect(sql).not.toMatch(/INSERT\s+INTO\s+"payment_mandates"/i);
    expect(sql).toContain(`"autopay_enabled" boolean NOT NULL DEFAULT false`);
    expect(sql).toContain(`'${AUTOPAY_SETTING_KEYS.SCOPE}', '${DEFAULT_AUTOPAY_SCOPE}'`);
    expect(sql).toContain(`'${AUTOPAY_SETTING_KEYS.LIMIT_PCT}', '0'`);
  });

  it("is safely re-runnable", async () => {
    const sql = await read(FILE);
    const creates = sql.match(/^CREATE (TABLE|INDEX|UNIQUE INDEX)/gim) || [];
    const guarded = sql.match(/^CREATE (TABLE|INDEX|UNIQUE INDEX) IF NOT EXISTS/gim) || [];
    expect(guarded.length).toBe(creates.length);
    for (const stmt of sql.match(/^ALTER TABLE[^;]+ADD COLUMN[^;]+;/gim) || []) {
      expect(stmt).toContain("IF NOT EXISTS");
    }
    expect((sql.match(/INSERT INTO "platform_settings"/g) || []).length)
      .toBe((sql.match(/ON CONFLICT \("key"\) DO NOTHING/g) || []).length);
  });

  // MEMORY-013 / M42 lesson: drizzle-kit applies the JOURNAL, not the folder. An
  // unjournaled .sql is silently skipped while the migrate command reports success.
  it("is registered in the migration journal", async () => {
    const journal = JSON.parse(await read("migrations/meta/_journal.json"));
    expect(journal.entries.map(e => e.tag)).toContain("0009_m51_autopay_mandates");
  });
});

// M51 Phase 5.3 — the webhook event ledger.
describe("migration 0010 matches the schema it implements", () => {
  const FILE = "migrations/0010_m51_webhook_event_ledger.sql";

  it("creates every column the ledger table declares", async () => {
    const sql = await read(FILE);
    const declared = Object.values(webhookEvents)
      .filter((c) => c && typeof c === "object" && typeof c.name === "string" && c.columnType)
      .map((c) => c.name);
    expect(declared.length).toBeGreaterThan(5);
    for (const col of declared) {
      expect(sql, `migration is missing column "${col}"`).toContain(`"${col}"`);
    }
  });

  // THE structural idempotency guarantee. Insert-first against this index is what
  // makes duplicate detection a database decision rather than a racy read-then-write.
  it("enforces one row per (provider, event id)", async () => {
    const sql = await read(FILE);
    expect(sql).toMatch(/UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_event_uq"[\s\S]*\("provider", "event_id"\)/);
  });

  // The ledger is additive: it must not touch any table that already carries
  // money or entitlement.
  it("touches no existing table", async () => {
    const sql = await read(FILE);
    expect(sql).not.toMatch(/ALTER TABLE/i);
    for (const t of ["payments", "workspace_subscriptions", "payment_mandates", "users", "platform_settings"]) {
      expect(sql).not.toMatch(new RegExp(`(CREATE|ALTER|INSERT INTO|DROP)[^;]*"${t}"`, "i"));
    }
  });

  it("is safely re-runnable and creates no rows", async () => {
    const sql = await read(FILE);
    const creates = sql.match(/^CREATE (TABLE|INDEX|UNIQUE INDEX)/gim) || [];
    const guarded = sql.match(/^CREATE (TABLE|INDEX|UNIQUE INDEX) IF NOT EXISTS/gim) || [];
    expect(guarded.length).toBe(creates.length);
    expect(sql).not.toMatch(/^INSERT INTO/im);
  });

  it("is registered in the migration journal", async () => {
    const journal = JSON.parse(await read("migrations/meta/_journal.json"));
    expect(journal.entries.map(e => e.tag)).toContain("0010_m51_webhook_event_ledger");
  });

  // The runbook migrates AFTER deploying, so the code runs for a window with no
  // ledger table. Registering it as schemaCheck-critical would hard-fail startup
  // in exactly that window — the M42 lesson, restated as a guard.
  it("is not registered as schemaCheck-critical in the milestone that adds it", async () => {
    const guard = await read("server/schemaCheck.js");
    expect(guard).not.toContain("webhook_events");
  });
});

// M52 — the stable renewal anniversary. Same convergence discipline, and one
// extra invariant this migration has that the others do not: it must be
// BEHAVIOUR-NEUTRAL for every subscription that already exists.
describe("migration 0011 matches the schema it implements", () => {
  const FILE = "migrations/0011_m52_billing_anchor.sql";

  it("adds the anchor column the Drizzle table declares", async () => {
    const sql = await read(FILE);
    expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "billing_anchor_day"`);
    const declared = Object.values(workspaceSubscriptions)
      .filter((c) => c && typeof c === "object" && typeof c.name === "string" && c.columnType)
      .map((c) => c.name);
    expect(declared).toContain("billing_anchor_day");
  });

  // The column must be NULLABLE with no default and no backfill. That is not a
  // style preference: a null anchor is what makes addMonthsUTC reproduce the
  // pre-M52 arithmetic, so any default or backfill here would silently move the
  // renewal date of a live, paying subscription.
  it("is nullable, has no default, and backfills nothing", async () => {
    const sql = await read(FILE);
    expect(sql).not.toMatch(/billing_anchor_day"?\s+integer[^;]*NOT NULL/i);
    expect(sql).not.toMatch(/billing_anchor_day"?\s+integer[^;]*DEFAULT/i);
    expect(sql).not.toMatch(/^\s*UPDATE\s+"workspace_subscriptions"/im);
    expect(sql).not.toMatch(/^\s*INSERT INTO/im);
  });

  it("touches no other table and adds no index", async () => {
    const sql = await read(FILE);
    for (const t of ["payments", "payment_mandates", "users", "platform_settings", "webhook_events"]) {
      expect(sql).not.toMatch(new RegExp(`(CREATE|ALTER|INSERT INTO|DROP)[^;]*"${t}"`, "i"));
    }
    expect(sql).not.toMatch(/^\s*CREATE (UNIQUE )?INDEX/im);
  });

  it("is safely re-runnable", async () => {
    const sql = await read(FILE);
    const alters = sql.match(/^ALTER TABLE[\s\S]*?ADD COLUMN/gim) || [];
    const guarded = sql.match(/ADD COLUMN IF NOT EXISTS/gim) || [];
    expect(guarded.length).toBe(alters.length);
  });

  // MEMORY-013 / M42 lesson: drizzle-kit applies the JOURNAL, not the folder.
  it("is registered in the migration journal", async () => {
    const journal = JSON.parse(await read("migrations/meta/_journal.json"));
    expect(journal.entries.map(e => e.tag)).toContain("0011_m52_billing_anchor");
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

  it("states the annual rate on the band, and nobody re-derives it", async () => {
    // M46 — this guard used to assert the annual rate must be DERIVED from a
    // single discount constant. That was an engineering decision overriding the
    // client's commercial specification, and it produced three wrong prices. The
    // specification states each band's annual rate, so the invariant inverts:
    // every band in the ACTIVE catalog carries an explicit annualRate...
    const { getSeatCatalog } = await import("../../shared/seatPricing.js");
    const active = getSeatCatalog();
    for (const b of active.bands) {
      expect(b.annualRate, `band ${b.min}-${b.max} has no explicit annual rate`).toBeTypeOf("number");
    }

    // ...and no surface recomputes one from a discount constant. That inline
    // derivation is what made the seat calculator a second pricing authority.
    const DERIVATION = /\brate\s*\*\s*\(\s*1\s*-\s*[\w.?]*annualDiscount/;
    for (const f of ["client/src/components/pricing/SeatCalculator.jsx",
                     "client/src/lib/commerce/commercialModel.js",
                     "client/src/pages/PublicPricing.jsx",
                     "client/src/pages/TeamSeats.jsx"]) {
      expect(DERIVATION.test(await read(f)), `${f} re-derives the annual rate`).toBe(false);
    }
  });

  it("no route lets a client supply its own per-seat price", async () => {
    // M46 — a negotiated override now bypasses the >25 Contact Sales gate, so
    // that it stays possible to fulfil and RENEW a contract workspace. That is
    // only safe because the override comes from the stored subscription row and
    // never from a request body. If a route ever destructures it from req.body,
    // a customer can name their own price and buy past the ceiling.
    const text = await read("server/routes.js");
    const bodyReads = text.match(/(?:const|let)\s*\{[^}]*unitPriceOverrideMinor[^}]*\}\s*=\s*req\.body/g) || [];
    expect(bodyReads, `routes.js reads the price override from the request body`).toEqual([]);
  });
});

describe("ONE seat entitlement authority", () => {
  it("no server module decides a seat ceiling from MAX_TEAM_MEMBERS", async () => {
    // shared/seatEntitlement.js is the only module that may read that constant;
    // routes and storage must go through it (resolveSeatEntitlement for a
    // ceiling, planSeatAllowance for a catalog projection).
    //
    // Checks USAGE, not mentions: an import of the symbol, or a subscript read.
    // A prose reference in a comment is allowed — twice now a substring match has
    // failed on a comment that existed precisely to explain why the constant is
    // NOT used here, and a guard that cries wolf gets deleted by someone in a
    // hurry. Being exact makes it stronger, not weaker.
    const IMPORTED = /import\s*\{[^}]*\bMAX_TEAM_MEMBERS\b[^}]*\}/;
    const SUBSCRIPTED = /\bMAX_TEAM_MEMBERS\s*\[/;
    for (const f of ["server/routes.js", "server/storage.js", "server/memoryStorage.js", "server/fulfillSeats.js", "server/seatRenewal.js"]) {
      const text = await read(f);
      expect(IMPORTED.test(text), `${f} imports MAX_TEAM_MEMBERS`).toBe(false);
      expect(SUBSCRIPTED.test(text), `${f} reads MAX_TEAM_MEMBERS[...] directly`).toBe(false);
    }
    // And the authority itself must still be the one that owns it.
    const authority = await read("shared/seatEntitlement.js");
    expect(IMPORTED.test(authority)).toBe(true);
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

describe("MIGRATION REGISTRATION — a .sql file that is not journaled is dead code", () => {
  it("every migrations/*.sql has a drizzle journal entry", async () => {
    // drizzle-kit migrate applies the JOURNAL, not the folder. An unjournaled
    // .sql file is silently skipped and the run still reports
    // "migrations applied successfully" — which is exactly what happened to
    // 0008 during M42 launch validation: the file existed, the deploy succeeded,
    // the migrate command reported success, and the table did not exist.
    // Same failure class as INCIDENT-001: shipped, but never in force.
    const { readdir, readFile } = await import("fs/promises");
    const files = (await readdir(join(root, "migrations")))
      .filter(f => f.endsWith(".sql"))
      .map(f => f.replace(/\.sql$/, ""))
      .sort();
    const journal = JSON.parse(await readFile(join(root, "migrations/meta/_journal.json"), "utf8"));
    const tags = journal.entries.map(e => e.tag).sort();

    const unjournaled = files.filter(f => !tags.includes(f));
    expect(unjournaled, `unjournaled migration(s) — these will NEVER run: ${unjournaled.join(", ")}`).toEqual([]);

    const orphanTags = tags.filter(t => !files.includes(t));
    expect(orphanTags, `journal references missing file(s): ${orphanTags.join(", ")}`).toEqual([]);
  });

  it("journal entries are ordered and uniquely indexed", async () => {
    const { readFile } = await import("fs/promises");
    const journal = JSON.parse(await readFile(join(root, "migrations/meta/_journal.json"), "utf8"));
    const idxs = journal.entries.map(e => e.idx);
    expect(new Set(idxs).size).toBe(idxs.length);
    for (let i = 1; i < journal.entries.length; i++) {
      expect(journal.entries[i].idx).toBeGreaterThan(journal.entries[i - 1].idx);
      // `when` drives apply order; a non-monotonic value reorders migrations.
      expect(journal.entries[i].when).toBeGreaterThan(journal.entries[i - 1].when);
    }
  });

  it("registers the M42 migration specifically", async () => {
    const { readFile } = await import("fs/promises");
    const journal = JSON.parse(await readFile(join(root, "migrations/meta/_journal.json"), "utf8"));
    expect(journal.entries.map(e => e.tag)).toContain("0008_m42_seat_subscriptions");
  });
});
