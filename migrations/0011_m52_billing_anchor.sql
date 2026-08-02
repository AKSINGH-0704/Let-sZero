-- M52 — the stable renewal anniversary.
--
-- Every statement is idempotent (IF NOT EXISTS), so re-running is safe and a
-- partial failure can simply be re-applied.
--
-- MIGRATION SAFETY — this migration is BEHAVIOUR-NEUTRAL for every existing
-- subscription, and that is its most important property:
--   • It adds ONE nullable column and touches no other column, table or index.
--   • It creates no rows and moves no data. There is deliberately NO BACKFILL.
--   • The column is left NULL for every subscription that already exists, and
--     `addMonthsUTC(date, months, null)` is byte-for-byte the pre-M52 arithmetic.
--     So no live customer's `period_end` can move as a result of applying this.
--   • Only subscriptions created AFTER the M52 code deploys carry an anchor.
--
-- WHY THE COLUMN EXISTS. Renewal chained each period from the PREVIOUS boundary,
-- and `addMonthsUTC` clamps a too-long day down to the target month's length. The
-- clamp was correct; the missing half was restoring the day afterwards. So a
-- 31 January subscriber went 31 Jan -> 28 Feb -> 28 Mar -> the 28th permanently:
-- one short month silently shortened every subsequent period for the life of the
-- subscription. Carrying the customer's original day-of-month forward makes the
-- clamp a per-period accommodation instead of a permanent loss:
--   31 Jan -> 28 Feb -> 31 Mar -> 30 Apr -> 31 May ...
--
-- No index is added: the column is only ever read from a row already fetched by
-- primary key inside the subscription's own transaction.
--
-- DEPLOY ORDER — apply this BEFORE deploying the M52 code. The new renewal path
-- reads this column, so deploy-then-migrate would break `renewSubscription` for
-- the length of the gap. Applying it early is safe against the currently
-- deployed build because Drizzle emits explicit column lists, so an unknown
-- extra column is inert to it.

ALTER TABLE "workspace_subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_anchor_day" integer;

COMMENT ON COLUMN "workspace_subscriptions"."billing_anchor_day" IS
  'M52: original day-of-month (1-31) the subscription was purchased on. NULL = pre-M52 row; arithmetic falls back to the previous period-end day.';

-- ── DOWN (reference only) ───────────────────────────────────────────────────
-- The column is nullable and inert to any build that does not read it, so a code
-- rollback needs no schema change at all. Dropping it is offered only for
-- completeness and is NOT part of the rollback procedure.
-- ALTER TABLE "workspace_subscriptions" DROP COLUMN IF EXISTS "billing_anchor_day";
