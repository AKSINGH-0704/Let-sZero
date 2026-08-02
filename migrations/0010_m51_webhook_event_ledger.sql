-- M51 Phase 5.3 — webhook event ledger.
--
-- Every statement is idempotent (IF NOT EXISTS), so re-running is safe and a
-- partial failure can simply be re-applied.
--
-- MIGRATION SAFETY — this migration is BEHAVIOUR-NEUTRAL for existing traffic:
--   • It creates one new table and touches no existing table, column or index.
--   • It creates no rows.
--   • The ledger is a DEDUP layer above handlers that were already idempotent by
--     state (payment status, the seatsFulfilledAt marker, the mandate transition
--     table). It can only ever SKIP work that would previously have been redone
--     and discarded — it can never cause work to be performed that wasn't before.
--
-- ⚠️ DEPLOY ORDER — the runbook migrates AFTER the deploy, so there is a window
-- in which the code is live and this table does not exist. The ledger is written
-- to FAIL OPEN for exactly that reason: if the table is missing, recording
-- degrades to a logged no-op and the webhook proceeds on the pre-M51 state-based
-- guards, which is precisely today's behaviour. It is therefore deliberately NOT
-- registered as schemaCheck-critical in the milestone that introduces it.

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider"     text NOT NULL DEFAULT 'RAZORPAY',
  "event_id"     text NOT NULL,
  "event_type"   text,
  "outcome"      text,
  "received_at"  timestamp NOT NULL DEFAULT NOW(),
  "processed_at" timestamp
);

-- THE structural idempotency guarantee: one row per (provider, event id).
-- Insert-first means a unique violation IS the duplicate detection, decided by
-- the database rather than by a read-then-write that two concurrent redeliveries
-- could both pass.
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_event_uq"
  ON "webhook_events" ("provider", "event_id");

-- Supports operator queries and any future retention sweep.
CREATE INDEX IF NOT EXISTS "webhook_events_received_idx"
  ON "webhook_events" ("received_at");

-- ── DOWN (reference only) ───────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "webhook_events_received_idx";
-- DROP INDEX IF EXISTS "webhook_events_provider_event_uq";
-- DROP TABLE IF EXISTS "webhook_events";
