/**
 * Startup schema integrity check.
 *
 * Runs once during boot against the live PostgreSQL pool. Verifies that all
 * required tables, critical columns, and performance indexes exist before any
 * request is served. If a critical check fails the process exits with code 1
 * so Railway restarts it rather than serving requests against a broken schema.
 *
 * This is NOT a replacement for migrations. It is a last-line-of-defence guard
 * that catches deployments where drizzle-kit push was skipped.
 */

import { pool } from "./db.js";

// ── Spec ─────────────────────────────────────────────────────────────────────
//
// Each required column carries a `critical` flag.
//   true  → missing column → process.exit(1)
//   false → missing column → console.error only (degraded functionality)
//
// The distinction lets us fail-hard on columns the core send path reads
// (e.g. send_paused, free_credits_used) while degrading gracefully on
// optional analytics columns that were added later.

const REQUIRED_TABLES = [
  "users",
  "sessions",
  "templates",
  "contacts",
  "campaigns",
  "campaign_emails",
  "credit_transactions",
  "suppressions",
  "audit_logs",
  "ai_usage_logs",
  "payments",
  "invites",
  "platform_settings",
  "sns_events",
  "sender_domains",
  "tracking_tokens",
];

const REQUIRED_COLUMNS = [
  // ── users — core auth + credit + sender health ───────────────────────────
  { table: "users", column: "id",                     critical: true  },
  { table: "users", column: "email",                  critical: true  },
  { table: "users", column: "password_hash",          critical: true  },
  { table: "users", column: "role",                   critical: true  },
  { table: "users", column: "is_active",              critical: true  },
  { table: "users", column: "credits_received",       critical: true  },
  { table: "users", column: "credits_used",           critical: true  },
  { table: "users", column: "credits_allocated",      critical: true  },
  { table: "users", column: "is_trial_user",          critical: true  },
  { table: "users", column: "send_paused",            critical: true  }, // auto-pause gate
  { table: "users", column: "send_paused_reason",     critical: false },
  { table: "users", column: "send_paused_at",         critical: false },
  // Free Plan pool — added in Free Plan implementation
  { table: "users", column: "free_credits_used",      critical: true  },
  { table: "users", column: "free_credits_reset_at",  critical: true  },
  // Sender identity — added for AI signature injection
  { table: "users", column: "sender_name",            critical: true  },
  { table: "users", column: "sender_title",           critical: false },
  { table: "users", column: "sender_company",         critical: false },
  { table: "users", column: "reply_to_email",         critical: false },
  // Inactivity governance
  { table: "users", column: "is_dormant",             critical: true  },
  { table: "users", column: "last_activity_at",       critical: false },
  { table: "users", column: "inactivity_warning_sent_at",       critical: false },
  { table: "users", column: "inactivity_keep_token",            critical: false },
  { table: "users", column: "inactivity_keep_token_expires_at", critical: false },
  // M13B: Trust model — read by the Sender Authorization Service on every campaign start.
  // All are critical: a missing column causes SAS to treat every user as unauthorized.
  { table: "users", column: "email_verified",                     critical: true  },
  { table: "users", column: "email_verification_token",           critical: false },
  { table: "users", column: "email_verification_expires_at",     critical: false },
  { table: "users", column: "sending_identity_type",             critical: true  },
  { table: "users", column: "platform_identity_acknowledged_at", critical: true  },
  { table: "users", column: "first_send_at",                     critical: true  },
  { table: "users", column: "warmup_daily_limit",                critical: true  },
  { table: "users", column: "warmup_emails_sent_today",          critical: true  },
  { table: "users", column: "warmup_emails_reset_at",            critical: true  },

  // ── sessions ────────────────────────────────────────────────────────────
  { table: "sessions", column: "id",         critical: true },
  { table: "sessions", column: "user_id",    critical: true },
  { table: "sessions", column: "token",      critical: true },
  { table: "sessions", column: "expires_at", critical: true },

  // ── campaigns ───────────────────────────────────────────────────────────
  { table: "campaigns", column: "id",             critical: true  },
  { table: "campaigns", column: "user_id",        critical: true  },
  { table: "campaigns", column: "status",         critical: true  },
  { table: "campaigns", column: "total_emails",   critical: true  },
  { table: "campaigns", column: "sent_emails",    critical: true  },
  { table: "campaigns", column: "failed_emails",  critical: true  },
  { table: "campaigns", column: "skipped_emails", critical: true  }, // required for suppression UX
  { table: "campaigns", column: "credits_used",   critical: true  },
  { table: "campaigns", column: "contact_ids",    critical: true  },
  { table: "campaigns", column: "completed_at",   critical: false },
  { table: "campaigns", column: "scheduled_at",   critical: false },

  // ── campaign_emails ──────────────────────────────────────────────────────
  { table: "campaign_emails", column: "id",              critical: true  },
  { table: "campaign_emails", column: "campaign_id",     critical: true  },
  { table: "campaign_emails", column: "user_id",         critical: true  },
  { table: "campaign_emails", column: "recipient_email", critical: true  },
  { table: "campaign_emails", column: "ses_message_id",  critical: true  }, // SNS bounce/click lookup
  { table: "campaign_emails", column: "status",          critical: true  },
  { table: "campaign_emails", column: "opened_at",         critical: false },
  { table: "campaign_emails", column: "clicked_at",        critical: false },
  // M11: unsubscribe analytics — critical: false, analytics fail gracefully
  { table: "campaign_emails", column: "unsubscribed_at",   critical: false },

  // ── suppressions ────────────────────────────────────────────────────────
  { table: "suppressions", column: "id",         critical: true },
  { table: "suppressions", column: "user_id",    critical: true },
  { table: "suppressions", column: "email",      critical: true },
  { table: "suppressions", column: "source",     critical: true },

  // ── platform_settings ───────────────────────────────────────────────────
  { table: "platform_settings", column: "key",   critical: true },
  { table: "platform_settings", column: "value", critical: true },

  // ── sns_events (deduplication) ──────────────────────────────────────────
  { table: "sns_events", column: "message_id",  critical: true },
  { table: "sns_events", column: "event_type",  critical: true },
  { table: "sns_events", column: "processed",   critical: true },

  // ── credit_transactions ──────────────────────────────────────────────────
  { table: "credit_transactions", column: "id",          critical: true },
  { table: "credit_transactions", column: "user_id",     critical: true },
  { table: "credit_transactions", column: "type",        critical: true },
  { table: "credit_transactions", column: "amount",      critical: true },
  { table: "credit_transactions", column: "campaign_id", critical: false },

  // ── sender_domains (M9) ──────────────────────────────────────────────────
  { table: "sender_domains", column: "id",            critical: true },
  { table: "sender_domains", column: "user_id",       critical: true },
  { table: "sender_domains", column: "domain",        critical: true },
  { table: "sender_domains", column: "from_email",    critical: true },
  { table: "sender_domains", column: "status",        critical: true },
  { table: "sender_domains", column: "dkim_tokens",   critical: false },
  { table: "sender_domains", column: "verify_record", critical: false },

  // ── campaigns — M9 additions ─────────────────────────────────────────────
  { table: "campaigns", column: "sender_domain_id",      critical: false },
  { table: "campaigns", column: "sender_email_snapshot", critical: false },

  // ── campaigns — M11 additions ─────────────────────────────────────────────
  { table: "campaigns", column: "unsubscribed_emails",   critical: false },

  // ── tracking_tokens (M10) ────────────────────────────────────────────────
  // critical: false throughout — tracking fails gracefully (delivery is unaffected)
  { table: "tracking_tokens", column: "id",                      critical: false },
  { table: "tracking_tokens", column: "token",                   critical: false },
  { table: "tracking_tokens", column: "token_type",              critical: false },
  { table: "tracking_tokens", column: "campaign_id",             critical: false },
  { table: "tracking_tokens", column: "campaign_email_id",       critical: false },
  { table: "tracking_tokens", column: "link_url",                critical: false },
  { table: "tracking_tokens", column: "created_at",              critical: false },
  { table: "tracking_tokens", column: "expires_at",              critical: false },
  { table: "tracking_tokens", column: "first_used_at",           critical: false },
  { table: "tracking_tokens", column: "used_count",              critical: false },
  { table: "tracking_tokens", column: "last_user_agent_category",critical: false },
  { table: "tracking_tokens", column: "ip_hash",                 critical: false },
];

const REQUIRED_INDEXES = [
  // Perf-critical: campaign list page and dashboard (called every page load)
  { index: "campaigns_user_id_idx",                 critical: true  },
  // Correctness-critical: SNS bounce/complaint event → campaign_emails lookup
  { index: "campaign_emails_ses_message_id_idx",    critical: true  },
  // Correctness-critical: prevents duplicate suppressions
  { index: "suppressions_user_email_unique",        critical: true  },
  // Perf: daily session cleanup
  { index: "sessions_expires_at_idx",               critical: false },
  // Perf: inactivity governance query
  { index: "users_active_activity_idx",             critical: false },
  // Correctness: invite token uniqueness
  { index: "invites_token_hash_idx",                critical: false },
  // M9: sender domain uniqueness per user
  { index: "sender_domains_user_domain_unique",     critical: false },
  // M10: tracking token lookup — hit on every open/click resolution
  { index: "idx_tracking_tokens_token",             critical: false },
];

// ── Runner ────────────────────────────────────────────────────────────────────

export async function runSchemaCheck() {
  if (!pool) {
    // Dev mode — no real DB; skip silently
    console.log("[SCHEMA-CHECK] Dev mode — skipping (no database pool)");
    return;
  }

  console.log("[SCHEMA-CHECK] Running startup schema integrity check…");
  const errors   = [];
  const warnings = [];

  const client = await pool.connect();
  try {
    // ── 1. Tables ──────────────────────────────────────────────────────────
    const tableResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);
    const existingTables = new Set(tableResult.rows.map(r => r.table_name));

    for (const table of REQUIRED_TABLES) {
      if (!existingTables.has(table)) {
        errors.push(`MISSING TABLE: ${table}`);
      }
    }

    // ── 2. Columns ─────────────────────────────────────────────────────────
    const colResult = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    const existingColumns = new Set(
      colResult.rows.map(r => `${r.table_name}.${r.column_name}`)
    );

    for (const { table, column, critical } of REQUIRED_COLUMNS) {
      const key = `${table}.${column}`;
      if (!existingColumns.has(key)) {
        if (critical) {
          errors.push(`MISSING COLUMN (critical): ${key}`);
        } else {
          warnings.push(`MISSING COLUMN (warn): ${key}`);
        }
      }
    }

    // ── 3. Indexes ─────────────────────────────────────────────────────────
    const idxResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    const existingIndexes = new Set(idxResult.rows.map(r => r.indexname));

    for (const { index, critical } of REQUIRED_INDEXES) {
      if (!existingIndexes.has(index)) {
        if (critical) {
          errors.push(`MISSING INDEX (critical): ${index}`);
        } else {
          warnings.push(`MISSING INDEX (warn): ${index}`);
        }
      }
    }
  } finally {
    client.release();
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  if (warnings.length > 0) {
    for (const w of warnings) console.warn(`[SCHEMA-CHECK] WARN: ${w}`);
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(`[SCHEMA-CHECK] ERROR: ${e}`);
    console.error(`[SCHEMA-CHECK] ${errors.length} critical schema error(s) — cannot start safely. Run: npm run db:migrate`);
    process.exit(1);
  }

  console.log(
    `[SCHEMA-CHECK] OK — ${REQUIRED_TABLES.length} tables, ` +
    `${REQUIRED_COLUMNS.length} columns, ` +
    `${REQUIRED_INDEXES.length} indexes verified` +
    (warnings.length > 0 ? ` (${warnings.length} non-critical warning(s))` : "")
  );
}
