-- M9 + M10 + M11 idempotent migration.
-- sender_domains (M9), tracking_tokens (M10), and their associated columns were deployed
-- via db:push on production before migration-based deployments were established.
-- All CREATE TABLE, ADD COLUMN, and CREATE INDEX statements carry IF NOT EXISTS guards
-- so this migration is safe to apply regardless of prior db:push state.
-- M11 additions (unsubscribed_at, unsubscribed_emails) are new on all environments.

CREATE TABLE IF NOT EXISTS "sender_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"from_email" text NOT NULL,
	"status" text DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"dkim_tokens" jsonb,
	"verify_record" jsonb,
	"verified_at" timestamp,
	"suspended_at" timestamp,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"bounced_count" integer DEFAULT 0 NOT NULL,
	"complained_count" integer DEFAULT 0 NOT NULL,
	"verification_window_days" integer DEFAULT 14 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"token_type" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"campaign_email_id" uuid NOT NULL,
	"link_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"first_used_at" timestamp,
	"used_count" integer DEFAULT 0 NOT NULL,
	"last_user_agent_category" text,
	"ip_hash" text,
	CONSTRAINT "tracking_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "campaign_emails" ADD COLUMN IF NOT EXISTS "unsubscribed_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "unsubscribed_emails" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "sender_domain_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "sender_email_snapshot" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sender_domains" ADD CONSTRAINT "sender_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tracking_tokens" ADD CONSTRAINT "tracking_tokens_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tracking_tokens" ADD CONSTRAINT "tracking_tokens_campaign_email_id_campaign_emails_id_fk" FOREIGN KEY ("campaign_email_id") REFERENCES "public"."campaign_emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sender_domain_id_sender_domains_id_fk" FOREIGN KEY ("sender_domain_id") REFERENCES "public"."sender_domains"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sender_domains_user_id_idx" ON "sender_domains" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sender_domains_user_domain_unique" ON "sender_domains" USING btree ("user_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tracking_tokens_token" ON "tracking_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tracking_tokens_campaign" ON "tracking_tokens" USING btree ("campaign_id","token_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tracking_tokens_campaign_email" ON "tracking_tokens" USING btree ("campaign_email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tracking_tokens_expires" ON "tracking_tokens" USING btree ("expires_at");
