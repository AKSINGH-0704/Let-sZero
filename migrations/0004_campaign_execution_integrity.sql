-- PAR-TRUST-017 — campaign execution & credit finalization integrity.
-- See Let-sZero-private/architecture/PAR-TRUST-017_campaign-execution-integrity.md
--
-- 1. campaigns.finalized_at — set exactly once, atomically, by finalizeCampaign()
--    when a campaign reaches a terminal status (COMPLETED/CANCELLED/FAILED).
--    NULL means "not yet finalized" — credit reclaim must wait on this (§7.6).
-- 2. Two partial unique indexes on campaign_emails enforcing at-most-once send
--    per (campaign, contact) at the database layer (§7.1) — the structural fix
--    that makes double-send/double-charge impossible regardless of how many
--    ways a future code change might cause overlapping execution of the same
--    campaign's send loop.

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "finalized_at" timestamp;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_emails_contact_uq"
  ON "campaign_emails" USING btree ("campaign_id", "contact_id")
  WHERE "contact_id" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_emails_recipient_uq"
  ON "campaign_emails" USING btree ("campaign_id", "recipient_email")
  WHERE "contact_id" IS NULL;
