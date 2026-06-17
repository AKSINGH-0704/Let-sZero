/**
 * Pre-deployment schema parity check.
 *
 * Run this against a target DATABASE_URL before deploying a new server build.
 * It compares the live DB schema (tables, columns, indexes) against the
 * canonical spec in server/schemaCheck.js and exits non-zero if there are
 * any critical mismatches.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/check-schema-parity.mjs
 *
 * On Railway:
 *   railway run node scripts/check-schema-parity.mjs
 *
 * Typical CI gate before a Railway deploy:
 *   railway run node scripts/check-schema-parity.mjs && railway up
 */

import pg from "pg";
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[PARITY] DATABASE_URL is not set — cannot run parity check.");
  process.exit(1);
}

// ── Spec (must stay in sync with server/schemaCheck.js) ─────────────────────

const REQUIRED_TABLES = [
  "users", "sessions", "templates", "contacts", "campaigns",
  "campaign_emails", "credit_transactions", "suppressions",
  "audit_logs", "ai_usage_logs", "payments", "invites",
  "platform_settings", "sns_events",
];

const REQUIRED_COLUMNS = [
  { table: "users", column: "id",                     critical: true  },
  { table: "users", column: "email",                  critical: true  },
  { table: "users", column: "password_hash",          critical: true  },
  { table: "users", column: "role",                   critical: true  },
  { table: "users", column: "is_active",              critical: true  },
  { table: "users", column: "credits_received",       critical: true  },
  { table: "users", column: "credits_used",           critical: true  },
  { table: "users", column: "credits_allocated",      critical: true  },
  { table: "users", column: "is_trial_user",          critical: true  },
  { table: "users", column: "send_paused",            critical: true  },
  { table: "users", column: "send_paused_reason",     critical: false },
  { table: "users", column: "send_paused_at",         critical: false },
  { table: "users", column: "free_credits_used",      critical: true  },
  { table: "users", column: "free_credits_reset_at",  critical: true  },
  { table: "users", column: "sender_name",            critical: true  },
  { table: "users", column: "sender_title",           critical: false },
  { table: "users", column: "sender_company",         critical: false },
  { table: "users", column: "reply_to_email",         critical: false },
  { table: "users", column: "is_dormant",             critical: true  },
  { table: "users", column: "last_activity_at",       critical: false },
  { table: "campaigns", column: "id",                 critical: true  },
  { table: "campaigns", column: "user_id",            critical: true  },
  { table: "campaigns", column: "status",             critical: true  },
  { table: "campaigns", column: "total_emails",       critical: true  },
  { table: "campaigns", column: "sent_emails",        critical: true  },
  { table: "campaigns", column: "failed_emails",      critical: true  },
  { table: "campaigns", column: "skipped_emails",     critical: true  },
  { table: "campaigns", column: "credits_used",       critical: true  },
  { table: "campaigns", column: "contact_ids",        critical: true  },
  { table: "campaign_emails", column: "id",           critical: true  },
  { table: "campaign_emails", column: "campaign_id",  critical: true  },
  { table: "campaign_emails", column: "user_id",      critical: true  },
  { table: "campaign_emails", column: "recipient_email", critical: true },
  { table: "campaign_emails", column: "ses_message_id",  critical: true },
  { table: "campaign_emails", column: "status",          critical: true },
  { table: "suppressions", column: "id",              critical: true },
  { table: "suppressions", column: "user_id",         critical: true },
  { table: "suppressions", column: "email",           critical: true },
  { table: "suppressions", column: "source",          critical: true },
  { table: "platform_settings", column: "key",        critical: true },
  { table: "platform_settings", column: "value",      critical: true },
  { table: "sns_events", column: "message_id",        critical: true },
  { table: "sns_events", column: "event_type",        critical: true },
  { table: "sns_events", column: "processed",         critical: true },
  { table: "credit_transactions", column: "id",       critical: true },
  { table: "credit_transactions", column: "user_id",  critical: true },
  { table: "credit_transactions", column: "type",     critical: true },
  { table: "credit_transactions", column: "amount",   critical: true },
];

const REQUIRED_INDEXES = [
  { index: "campaigns_user_id_idx",                 critical: true  },
  { index: "campaign_emails_ses_message_id_idx",    critical: true  },
  { index: "suppressions_user_email_unique",        critical: true  },
  { index: "sessions_expires_at_idx",               critical: false },
  { index: "users_active_activity_idx",             critical: false },
  { index: "invites_token_hash_idx",                critical: false },
];

// ── Main ──────────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });

async function main() {
  console.log("[PARITY] Connecting to database…");
  const client = await pool.connect();
  const errors   = [];
  const warnings = [];

  try {
    const tableResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const existingTables = new Set(tableResult.rows.map(r => r.table_name));

    for (const table of REQUIRED_TABLES) {
      if (!existingTables.has(table)) errors.push(`MISSING TABLE: ${table}`);
    }

    const colResult = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns WHERE table_schema = 'public'
    `);
    const existingColumns = new Set(
      colResult.rows.map(r => `${r.table_name}.${r.column_name}`)
    );

    for (const { table, column, critical } of REQUIRED_COLUMNS) {
      const key = `${table}.${column}`;
      if (!existingColumns.has(key)) {
        (critical ? errors : warnings).push(
          `MISSING COLUMN${critical ? " (critical)" : " (warn)"}: ${key}`
        );
      }
    }

    const idxResult = await client.query(`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `);
    const existingIndexes = new Set(idxResult.rows.map(r => r.indexname));

    for (const { index, critical } of REQUIRED_INDEXES) {
      if (!existingIndexes.has(index)) {
        (critical ? errors : warnings).push(
          `MISSING INDEX${critical ? " (critical)" : " (warn)"}: ${index}`
        );
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  if (warnings.length > 0) {
    console.warn(`\n[PARITY] ${warnings.length} non-critical warning(s):`);
    for (const w of warnings) console.warn(`  WARN: ${w}`);
  }

  if (errors.length > 0) {
    console.error(`\n[PARITY] FAIL — ${errors.length} critical error(s):`);
    for (const e of errors) console.error(`  ERROR: ${e}`);
    console.error("\n[PARITY] Run 'npm run db:migrate' (or db:push for dev) then re-run this check.");
    process.exit(1);
  }

  console.log(
    `\n[PARITY] PASS — ${REQUIRED_TABLES.length} tables, ` +
    `${REQUIRED_COLUMNS.length} columns, ${REQUIRED_INDEXES.length} indexes verified` +
    (warnings.length > 0 ? ` (${warnings.length} warning(s))` : "") +
    "\n[PARITY] Safe to deploy."
  );
  process.exit(0);
}

main().catch(err => {
  console.error(`[PARITY] Unexpected error: ${err.message}`);
  process.exit(1);
});
