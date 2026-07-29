-- M42 — Team Seat Commercial System (Audit 193).
--
-- Adds the seat-entitlement authority and the payment-kind discriminator. Every
-- statement is idempotent (IF NOT EXISTS / ON CONFLICT), so re-running this
-- migration is safe and a partial failure can simply be re-applied.
--
-- MIGRATION SAFETY — this migration is ENTITLEMENT-NEUTRAL by construction:
--   • It creates no subscription rows, so no workspace's seat ceiling changes.
--   • Seat billing is inert until the platform flag `seat_billing_enabled` is set
--     to 'true' (seeded below as 'false'). Until then every workspace continues to
--     resolve the legacy flat MAX_TEAM_MEMBERS allowance exactly as before.
--   • Existing payments are back-filled to kind='CREDITS', which is what they are.
-- Rollback is therefore a config change (flag → 'false'), not a schema revert; the
-- DOWN section at the bottom exists for completeness but is not the rollback path.

-- ── 1. Payment kind discriminator ───────────────────────────────────────────
-- Before M42 every payment bought credits, so the fulfillment/refund/dispute
-- chain assumed "payment ⇒ credits". Seats break that assumption. NOT NULL with a
-- CREDITS default back-fills every historical row correctly in one statement.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'CREDITS';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "subscription_id" uuid;

-- Exact charge in MINOR units. `amount_inr` is an integer and a prorated seat
-- charge is frequently not a whole rupee (half a month of a band rate lands on a half rupee), so
-- rounding into amount_inr alone would record a figure that was never charged —
-- a reconciliation defect the moment proration exists. Nullable: legacy credit
-- rows are already exact in amount_inr and are deliberately not back-filled.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_minor" integer;

-- Supports the renewal/dunning reconciliation query "payments for this subscription".
CREATE INDEX IF NOT EXISTS "payments_subscription_idx"
  ON "payments" ("subscription_id") WHERE "subscription_id" IS NOT NULL;

-- ── 2. Seat entitlement authority ───────────────────────────────────────────
-- Keyed on the workspace ROOT user id — the existing ownership primitive
-- (ADR-017), not a new Workspace entity. There is deliberately NO denormalised
-- seat column on `users`: one authority, so entitlement cannot drift from billing.
CREATE TABLE IF NOT EXISTS "workspace_subscriptions" (
  "id"                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_root_id"          uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status"                     text NOT NULL DEFAULT 'ACTIVE',
  "seats"                      integer NOT NULL DEFAULT 0,
  "term"                       text NOT NULL,
  "pricing_version"            text NOT NULL,
  "currency"                   text NOT NULL DEFAULT 'INR',
  "region"                     text NOT NULL DEFAULT 'IN',
  "unit_price_override_minor"  integer,
  "coupon_code"                text,
  "renewal_amount_minor"       integer NOT NULL DEFAULT 0,
  "period_start"               timestamp NOT NULL,
  "period_end"                 timestamp NOT NULL,
  "scheduled_seats"            integer,
  "scheduled_term"             text,
  "cancel_at_period_end"       boolean NOT NULL DEFAULT false,
  "grandfathered_seats"        integer NOT NULL DEFAULT 0,
  "grandfathered_until"        timestamp,
  "dunning_attempts"           integer NOT NULL DEFAULT 0,
  "first_failure_at"           timestamp,
  "grace_ends_at"              timestamp,
  "last_payment_id"            uuid,
  "created_at"                 timestamp NOT NULL DEFAULT now(),
  "updated_at"                 timestamp NOT NULL DEFAULT now(),
  "activated_at"               timestamp,
  "ended_at"                   timestamp
);

-- Entitlement read on every seat claim, invite and team render.
CREATE INDEX IF NOT EXISTS "workspace_subscriptions_root_idx"
  ON "workspace_subscriptions" ("workspace_root_id");

-- Renewal and dunning sweeps.
CREATE INDEX IF NOT EXISTS "workspace_subscriptions_due_idx"
  ON "workspace_subscriptions" ("status", "period_end");

-- THE structural invariant: at most ONE live subscription per workspace. This is
-- what makes duplicate entitlement impossible at the database level rather than
-- merely unlikely — a duplicated webhook, a double-submitted checkout, or two
-- admins buying at once cannot produce two entitlements for one workspace.
-- The status list mirrors SUBSCRIPTION_ENTITLING_STATUSES
-- (shared/subscriptionStateMachine.js), which is asserted by a unit test.
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_subscriptions_one_live_uq"
  ON "workspace_subscriptions" ("workspace_root_id")
  WHERE "status" IN ('ACTIVE','PAST_DUE','CANCEL_SCHEDULED');

-- ── 3. Commercial configuration (platform_settings) ─────────────────────────
-- Seat billing ships DARK. Enabling it is an operator decision, and disabling it
-- again is the rollback — no deploy, no migration revert. While disabled,
-- resolveSeatEntitlement returns the legacy flat allowance for every workspace.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('seat_billing_enabled', 'false', NOW())
ON CONFLICT ("key") DO NOTHING;

-- Seats a workspace gets with no subscription at all. Set to the legacy flat
-- allowance so that enabling the flag cannot, by itself, reduce anyone's team.
-- The operator lowers this deliberately, after the grandfathering window.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('seat_free_floor', '25', NOW())
ON CONFLICT ("key") DO NOTHING;

-- ── DOWN (reference only — the supported rollback is the flag) ───────────────
-- DROP INDEX IF EXISTS "workspace_subscriptions_one_live_uq";
-- DROP INDEX IF EXISTS "workspace_subscriptions_due_idx";
-- DROP INDEX IF EXISTS "workspace_subscriptions_root_idx";
-- DROP TABLE IF EXISTS "workspace_subscriptions";
-- DROP INDEX IF EXISTS "payments_subscription_idx";
-- ALTER TABLE "payments" DROP COLUMN IF EXISTS "subscription_id";
-- ALTER TABLE "payments" DROP COLUMN IF EXISTS "kind";
