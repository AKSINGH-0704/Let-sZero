-- MXX-A — put the progressive warm-up ladder into force.
--
-- MXX shipped shared/warmupPolicy.js with a default ladder of 50 → 100 → 200, but
-- nothing ever wrote `warmup_ramp_schedule` into platform_settings. Migration 0003
-- (M13-B) had already seeded the PRE-LADDER flat limit
-- `warmup_custom_domain_daily_limit = '200'`, and resolveLadder() ranks a configured
-- flat limit ABOVE the shipped default ladder — deliberately, so an operator who has
-- not seeded a ladder keeps the policy they previously configured.
--
-- The consequence in production: the flat limit won, the ladder resolved to a single
-- terminal stage of 200/day, and EVERY sender — including a brand-new domain on day 1
-- — was granted 200 emails/day. The shipped 50/100/200 ladder was unreachable on any
-- database where 0003 had run, which is every real environment. Tests never caught it
-- because they run on memoryStorage, which starts with no platform_settings at all and
-- therefore falls through to the correct default ladder.
--
-- Seeding the ladder is sufficient: a valid `warmup_ramp_schedule` outranks the flat
-- limit, so the flat key becomes inert without being destroyed. ON CONFLICT DO NOTHING
-- preserves a ladder an operator has already tuned by hand (there is no admin route —
-- backlog OPS-011), so re-running this migration can never overwrite operator intent.
--
-- The JSON must satisfy parseLadder(): non-empty array, dailyLimit never decreasing,
-- throughDay strictly ascending, exactly one terminal stage (throughDay null) and it
-- must be last. A value that fails validation is IGNORED and logged, and the flat
-- limit would silently take over again — which is precisely the failure being fixed.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES (
  'warmup_ramp_schedule',
  '[{"throughDay":3,"dailyLimit":50},{"throughDay":7,"dailyLimit":100},{"throughDay":null,"dailyLimit":200}]',
  NOW()
)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
-- Dead key: ADR-009 removed the platform sending identity, so sendingIdentityType is
-- only ever 'custom_domain' or null and nothing has read this value since. It is left
-- behind only to mislead the next operator editing warm-up settings by hand.
DELETE FROM "platform_settings" WHERE "key" = 'warmup_platform_identity_daily_limit';
