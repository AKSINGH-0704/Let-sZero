-- M51 Phase 5.1 — AutoPay mandate model.
--
-- Every statement is idempotent (IF NOT EXISTS / ON CONFLICT), so re-running this
-- migration is safe and a partial failure can simply be re-applied.
--
-- MIGRATION SAFETY — this migration is BILLING-NEUTRAL by construction:
--   • It creates no mandate rows, so nobody gains a stored payment instrument.
--   • Every added subscription column is nullable or defaults to the value that
--     reproduces today's behaviour exactly (`autopay_enabled` = false), so no
--     workspace's renewal mode changes and no charge becomes possible.
--   • `seat_autopay_scope` is seeded 'OFF' and the accessor fails toward OFF on a
--     missing or malformed value, so autopay is inert on two independent grounds.
--   • AutoPay additionally inherits the existing `seat_billing_enabled` gate — if
--     seat billing is off, the renewal sweep returns before reaching any charge
--     path, so the rollout scope can never be the ONLY thing standing between a
--     customer and a debit.
-- Rollback is therefore a config change (`seat_autopay_scope` → 'OFF'), not a
-- schema revert; the DOWN section at the bottom exists for completeness but is
-- not the rollback path.

-- ── 1. The instrument ───────────────────────────────────────────────────────
-- Modelled separately from the DECISION to use it (which lives on the
-- subscription row, added in §2). A mandate belongs to the PERSON who authorised
-- it at their bank, which is why it never transfers with a workspace.
CREATE TABLE IF NOT EXISTS "payment_mandates" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_root_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  -- Provider-NEUTRAL by design: the handles are not named after Razorpay, so a
  -- second gateway coexists without a schema redesign or a rename of live columns.
  "provider"              text NOT NULL DEFAULT 'RAZORPAY',
  "provider_customer_id"  text,
  "provider_token_id"     text,
  "method"                text NOT NULL,
  "status"                text NOT NULL DEFAULT 'PENDING',
  "max_amount_minor"      integer,
  "expires_at"            timestamp,
  "instrument_label"      text,
  "paused_until"          timestamp,
  "last_error"            text,
  "created_at"            timestamp NOT NULL DEFAULT NOW(),
  "updated_at"            timestamp NOT NULL DEFAULT NOW(),
  "confirmed_at"          timestamp,
  "revoked_at"            timestamp
);

CREATE INDEX IF NOT EXISTS "payment_mandates_root_idx"
  ON "payment_mandates" ("workspace_root_id");

-- Supports the expiring-mandate sweep (T-30/T-7 notices) — the only advance
-- warning a customer gets before an involuntary lapse.
CREATE INDEX IF NOT EXISTS "payment_mandates_expiry_idx"
  ON "payment_mandates" ("status", "expires_at");

-- ONE local row per gateway token, PER PROVIDER. This is the structural
-- idempotency guarantee for token.* webhooks: unlike order.paid, they have no
-- pre-existing local row to dedup against, so a redelivered token.confirmed
-- would otherwise create a second mandate for the same bank authorisation.
-- Scoping by provider lets two gateways hold colliding token ids.
CREATE UNIQUE INDEX IF NOT EXISTS "payment_mandates_provider_token_uq"
  ON "payment_mandates" ("provider", "provider_token_id")
  WHERE "provider_token_id" IS NOT NULL;

-- ── 2. The decision (per SUBSCRIPTION, never per user or workspace) ──────────
-- A per-user or per-workspace flag would make every future commercial product
-- share one autopay switch, and revoking a card for one product would silently
-- disable another. Keeping the decision on the subscription row makes a second
-- product a data change rather than a redesign.
ALTER TABLE "workspace_subscriptions"
  ADD COLUMN IF NOT EXISTS "autopay_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "workspace_subscriptions"
  ADD COLUMN IF NOT EXISTS "mandate_id" uuid;

-- Set when a charge returns AUTH_REQUIRED (an AFA-gated debit — typically an
-- annual renewal above the ₹15,000 RBI ceiling). This is NOT a failure:
-- entitlement is retained and the dunning ladder does not advance on that tick.
ALTER TABLE "workspace_subscriptions"
  ADD COLUMN IF NOT EXISTS "autopay_auth_required_at" timestamp;

-- The mandatory pre-debit notice, keyed to the PERIOD it was sent for. The period
-- is part of the key so a rescheduled renewal cannot reuse a stale notice to
-- satisfy a regulatory obligation it never actually met.
ALTER TABLE "workspace_subscriptions"
  ADD COLUMN IF NOT EXISTS "predebit_notice_sent_at" timestamp;
ALTER TABLE "workspace_subscriptions"
  ADD COLUMN IF NOT EXISTS "predebit_notice_period_end" timestamp;

ALTER TABLE "workspace_subscriptions"
  ADD COLUMN IF NOT EXISTS "last_charge_error" text;

-- ON DELETE SET NULL, not CASCADE: deleting an instrument must never delete the
-- subscription it funded. The subscription simply reverts to manual renewal —
-- degradation, not amputation, the same principle that keeps PAST_DUE entitling.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_subscriptions_mandate_id_fk'
  ) THEN
    ALTER TABLE "workspace_subscriptions"
      ADD CONSTRAINT "workspace_subscriptions_mandate_id_fk"
      FOREIGN KEY ("mandate_id") REFERENCES "payment_mandates"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- ── 3. Rollout configuration (platform_settings) ────────────────────────────
-- AutoPay ships DARK behind a STAGED scope, reusing the ADR-021 `warmup_scope`
-- enum-setting pattern rather than a second rollout mechanism.
--   OFF → INTERNAL → PILOT → LIMITED → GA
-- Unset or malformed parses to OFF, so a typo can never open the rollout.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('seat_autopay_scope', 'OFF', NOW())
ON CONFLICT ("key") DO NOTHING;

-- CSV of workspace root ids. Consulted for INTERNAL and PILOT (and additively
-- for LIMITED). Empty by design: the operator names the internal workspace.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('seat_autopay_allowlist', '', NOW())
ON CONFLICT ("key") DO NOTHING;

-- Percentage bucket for LIMITED, applied to a STABLE hash of the workspace id so
-- a workspace cannot drift in and out of the rollout between hourly sweep ticks
-- and receive contradictory copy about how its money moves.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('seat_autopay_limit_pct', '0', NOW())
ON CONFLICT ("key") DO NOTHING;

-- ── DOWN (not the rollback path — see the header) ───────────────────────────
-- ALTER TABLE "workspace_subscriptions" DROP CONSTRAINT IF EXISTS "workspace_subscriptions_mandate_id_fk";
-- ALTER TABLE "workspace_subscriptions" DROP COLUMN IF EXISTS "last_charge_error";
-- ALTER TABLE "workspace_subscriptions" DROP COLUMN IF EXISTS "predebit_notice_period_end";
-- ALTER TABLE "workspace_subscriptions" DROP COLUMN IF EXISTS "predebit_notice_sent_at";
-- ALTER TABLE "workspace_subscriptions" DROP COLUMN IF EXISTS "autopay_auth_required_at";
-- ALTER TABLE "workspace_subscriptions" DROP COLUMN IF EXISTS "mandate_id";
-- ALTER TABLE "workspace_subscriptions" DROP COLUMN IF EXISTS "autopay_enabled";
-- DROP TABLE IF EXISTS "payment_mandates";
