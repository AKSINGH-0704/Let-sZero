-- M13B trust model — adds sender identity, warm-up, and email verification columns.
-- Includes a one-time backfill that enables existing users to pass the new SAS checks
-- immediately on deployment, with no separate migration step required.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sending_identity_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "platform_identity_acknowledged_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_send_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "warmup_daily_limit" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "warmup_emails_sent_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "warmup_emails_reset_at" timestamp;--> statement-breakpoint
-- Backfill existing users so they can pass SAS identity checks on deployment.
-- Users with a VERIFIED custom domain → custom_domain path.
-- All other non-root users → platform identity (acknowledged immediately, since they
-- were already sending on the platform identity without an explicit choice).
-- ROOT_ADMIN bypasses SAS entirely, so their trust fields are left at defaults.
UPDATE "users"
SET
  email_verified = true,
  sending_identity_type = CASE
    WHEN EXISTS (
      SELECT 1 FROM "sender_domains"
      WHERE "sender_domains"."user_id" = "users"."id"
        AND "sender_domains"."status" = 'VERIFIED'
    ) THEN 'custom_domain'
    ELSE 'platform'
  END,
  platform_identity_acknowledged_at = CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM "sender_domains"
      WHERE "sender_domains"."user_id" = "users"."id"
        AND "sender_domains"."status" = 'VERIFIED'
    ) THEN NOW()
    ELSE NULL
  END,
  warmup_emails_reset_at = NOW()
WHERE role != 'ROOT_ADMIN';--> statement-breakpoint
-- Backfill firstSendAt from earliest completed campaign for users who have sent before.
-- Warm-up is bypassed for these users if firstSendAt + warmup_duration_days < NOW().
UPDATE "users"
SET first_send_at = (
  SELECT MIN(c.started_at)
  FROM "campaigns" c
  WHERE c.user_id = "users"."id"
    AND c.status = 'COMPLETED'
    AND c.started_at IS NOT NULL
)
WHERE first_send_at IS NULL
  AND EXISTS (
    SELECT 1 FROM "campaigns" c
    WHERE c.user_id = "users"."id"
      AND c.status = 'COMPLETED'
  );--> statement-breakpoint
-- Seed warm-up defaults into platform_settings if not already present.
-- ON CONFLICT DO NOTHING preserves any values an admin has already set.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES
  ('warmup_custom_domain_daily_limit',    '200', NOW()),
  ('warmup_platform_identity_daily_limit', '100', NOW()),
  ('warmup_duration_days',                 '30',  NOW())
ON CONFLICT ("key") DO NOTHING;
