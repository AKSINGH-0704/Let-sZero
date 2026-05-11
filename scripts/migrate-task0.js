// One-shot migration script for Task 0 schema changes.
// Run: node scripts/migrate-task0.js
// Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (dotenv not installed at top level, avoid the dependency)
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  envFile.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
} catch {}

import pg from "pg";

const { Client } = pg;

const SQL = `
-- ── 1. campaign_emails: drop and recreate (table was truncated, safe to drop) ──
DROP TABLE IF EXISTS campaign_emails;

CREATE TABLE campaign_emails (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  contact_id      UUID                 REFERENCES contacts(id),
  recipient_email TEXT        NOT NULL,
  ses_message_id  TEXT,
  status          TEXT        NOT NULL DEFAULT 'PENDING',
  failure_reason  TEXT,
  sent_at         TIMESTAMP,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX campaign_emails_ses_message_id_idx
  ON campaign_emails (ses_message_id);

CREATE INDEX campaign_emails_user_email_idx
  ON campaign_emails (user_id, recipient_email);

-- ── 2. campaigns: add skipped_emails column ──────────────────────────────────
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS skipped_emails INTEGER NOT NULL DEFAULT 0;

-- ── 3. suppressions: create table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppressions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  source      TEXT        NOT NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS suppressions_user_email_unique
  ON suppressions (user_id, email);
`;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("[MIGRATION] Connected to database");

  try {
    await client.query("BEGIN");
    await client.query(SQL);
    await client.query("COMMIT");
    console.log("[MIGRATION] All statements committed successfully");

    // Verify
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('campaign_emails','suppressions','campaigns')
      ORDER BY table_name
    `);
    console.log("[MIGRATION] Tables verified:", tables.rows.map(r => r.table_name));

    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'campaign_emails'
      ORDER BY ordinal_position
    `);
    console.log("[MIGRATION] campaign_emails columns:");
    cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`));

    const skipCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'campaigns'
        AND column_name = 'skipped_emails'
    `);
    console.log("[MIGRATION] campaigns.skipped_emails present:", skipCol.rows.length === 1);

    const idx = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'campaign_emails_ses_message_id_idx',
          'campaign_emails_user_email_idx',
          'suppressions_user_email_unique'
        )
      ORDER BY indexname
    `);
    console.log("[MIGRATION] Indexes verified:", idx.rows.map(r => r.indexname));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[MIGRATION] FAILED — rolled back:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
