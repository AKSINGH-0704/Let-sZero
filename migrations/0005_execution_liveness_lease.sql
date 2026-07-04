-- PAR-TRUST-017 §7.7 — execution liveness lease, replacing the reclaim gate's
-- fixed elapsed-time timeout with a self-verifying renewal signal.
-- See Let-sZero-private/architecture/PAR-TRUST-017_campaign-execution-integrity.md §7.7

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "execution_lease_expires_at" timestamp;
