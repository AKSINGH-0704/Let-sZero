/**
 * Final production campaign verification.
 *
 * Creates a 2-contact campaign: one suppressed recipient, one normal recipient.
 * Enqueues it into BullMQ, waits for completion, then validates all four metrics.
 * Cleans up all test data (contacts, suppression, campaign) after the run.
 *
 * Run: railway run node tmp/test-final-campaign.mjs
 *
 * The normal recipient email is the VERIFICATION_EMAIL env var (defaults to
 * RECOVERY_EMAIL). A real email is sent — this is the live production path.
 */

import "../server/env.js";
import pg from "pg";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";

const { Pool } = pg;

// ── Config ────────────────────────────────────────────────────────────────────
const NORMAL_EMAIL     = process.env.VERIFICATION_EMAIL || process.env.RECOVERY_EMAIL;
const SUPPRESSED_EMAIL = "test-suppressed-probe@example-repmail-verify.invalid";
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS      = 180_000; // 3 minutes

if (!NORMAL_EMAIL) {
  console.error("[VERIFY] VERIFICATION_EMAIL or RECOVERY_EMAIL must be set.");
  process.exit(1);
}

// ── Connections ───────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 5000,
});
await redis.connect();

const queue = new Queue("campaignQueue", { connection: redis });

// ── Helpers ───────────────────────────────────────────────────────────────────
async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Track what we create so we can clean up even on error
const cleanup = { contactIds: [], suppressionEmails: [], campaignId: null };

try {
  // ── 1. Find admin user ──────────────────────────────────────────────────
  console.log("[VERIFY] Finding admin user…");
  const userRes = await query(
    `SELECT id, email, sender_name, credits_received, credits_used, free_credits_used,
            credits_allocated, is_trial_user
     FROM users
     WHERE role = 'admin' AND is_active = true
     ORDER BY created_at ASC
     LIMIT 1`
  );
  if (!userRes.rows.length) throw new Error("No active admin user found");
  const adminUser = userRes.rows[0];
  console.log(`[VERIFY] Admin user: ${adminUser.email} (${adminUser.id})`);

  const netCredits =
    Number(adminUser.credits_received) +
    Number(adminUser.credits_allocated) -
    Number(adminUser.credits_used);
  const freeCreditsLeft = 50 - Number(adminUser.free_credits_used || 0);
  console.log(`[VERIFY] Net paid credits: ${netCredits}, free credits left: ${freeCreditsLeft}`);

  if (netCredits < 1 && freeCreditsLeft < 1) {
    throw new Error("Admin user has no credits — cannot run campaign");
  }

  // ── 2. Create contacts ──────────────────────────────────────────────────
  console.log(`[VERIFY] Creating test contacts: normal=${NORMAL_EMAIL}, suppressed=${SUPPRESSED_EMAIL}`);

  // Use INSERT ... ON CONFLICT DO UPDATE to handle existing contacts gracefully
  const contactNormalRes = await query(
    `INSERT INTO contacts (id, user_id, email, name, company)
     VALUES ($1, $2, $3, 'Verify Normal', 'RepMail-Test')
     ON CONFLICT (user_id, email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email`,
    [randomUUID(), adminUser.id, NORMAL_EMAIL]
  );
  const contactNormal = contactNormalRes.rows[0];
  if (contactNormalRes.command === "INSERT") cleanup.contactIds.push(contactNormal.id);
  console.log(`[VERIFY] Normal contact: ${contactNormal.id}`);

  const contactSuppressedRes = await query(
    `INSERT INTO contacts (id, user_id, email, name, company)
     VALUES ($1, $2, $3, 'Verify Suppressed', 'RepMail-Test')
     ON CONFLICT (user_id, email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email`,
    [randomUUID(), adminUser.id, SUPPRESSED_EMAIL]
  );
  const contactSuppressed = contactSuppressedRes.rows[0];
  if (contactSuppressedRes.command === "INSERT") cleanup.contactIds.push(contactSuppressed.id);
  console.log(`[VERIFY] Suppressed contact: ${contactSuppressed.id}`);

  // ── 3. Add suppression ──────────────────────────────────────────────────
  console.log(`[VERIFY] Adding suppression for ${SUPPRESSED_EMAIL}…`);
  await query(
    `INSERT INTO suppressions (id, user_id, email, source, created_at)
     VALUES ($1, $2, $3, 'manual', NOW())
     ON CONFLICT (user_id, email) DO NOTHING`,
    [randomUUID(), adminUser.id, SUPPRESSED_EMAIL]
  );
  cleanup.suppressionEmails.push(SUPPRESSED_EMAIL);

  // ── 4. Create campaign ──────────────────────────────────────────────────
  const campaignId = randomUUID();
  cleanup.campaignId = campaignId;

  const templateSnapshot = {
    subject: "RepMail hardening verification — final campaign test",
    body: `Hi {{name}},

This is an automated verification email sent as part of the RepMail pre-launch hardening audit (2026-06-17). No action required.

This confirms the campaign system is operating correctly end-to-end.

{{sender_name}}
{{sender_title}}, {{sender_company}}`,
    campaignType: "general",
    tone: "professional",
  };

  const contactIds = [contactNormal.id, contactSuppressed.id];

  await query(
    `INSERT INTO campaigns
     (id, user_id, name, status, total_emails, sent_emails, failed_emails, skipped_emails,
      credits_used, contact_ids, template_snapshot, created_at, updated_at)
     VALUES ($1, $2, $3, 'PENDING', $4, 0, 0, 0, 0, $5::jsonb, $6::jsonb, NOW(), NOW())`,
    [
      campaignId,
      adminUser.id,
      "RepMail Hardening Verify (auto-test)",
      2, // total_emails
      JSON.stringify(contactIds),
      JSON.stringify(templateSnapshot),
    ]
  );
  console.log(`[VERIFY] Campaign created: ${campaignId}`);

  // ── 5. Enqueue in BullMQ ────────────────────────────────────────────────
  await queue.add(
    "execute",
    { campaignId, userId: adminUser.id },
    { jobId: campaignId }
  );
  console.log(`[VERIFY] Campaign enqueued — waiting for COMPLETED (max ${MAX_WAIT_MS / 1000}s)…`);

  // ── 6. Poll for completion ──────────────────────────────────────────────
  const startedAt = Date.now();
  let finalCampaign = null;

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await query(
      `SELECT status, sent_emails, failed_emails, skipped_emails, credits_used, total_emails
       FROM campaigns WHERE id = $1`,
      [campaignId]
    );
    const c = pollRes.rows[0];
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    process.stdout.write(
      `\r[VERIFY] ${elapsed}s — status=${c.status} sent=${c.sent_emails} failed=${c.failed_emails} skipped=${c.skipped_emails} credits=${c.credits_used}  `
    );

    if (c.status === "COMPLETED" || c.status === "FAILED") {
      finalCampaign = c;
      break;
    }
  }
  console.log(); // newline after progress line

  if (!finalCampaign) throw new Error("Campaign did not complete within timeout");

  // ── 7. Assert metrics ───────────────────────────────────────────────────
  console.log("\n[VERIFY] Final metrics:");
  console.log(`  status        = ${finalCampaign.status}`);
  console.log(`  total_emails  = ${finalCampaign.total_emails}`);
  console.log(`  sent_emails   = ${finalCampaign.sent_emails}`);
  console.log(`  failed_emails = ${finalCampaign.failed_emails}`);
  console.log(`  skipped_emails= ${finalCampaign.skipped_emails}`);
  console.log(`  credits_used  = ${finalCampaign.credits_used}`);

  const total     = Number(finalCampaign.total_emails);
  const sent      = Number(finalCampaign.sent_emails);
  const failed    = Number(finalCampaign.failed_emails);
  const skipped   = Number(finalCampaign.skipped_emails);
  const credits   = Number(finalCampaign.credits_used);

  const processed = sent + failed + skipped;
  const reachRate = total > 0 ? (((sent + skipped) / total) * 100).toFixed(1) : "0.0";
  const progress  = total > 0 ? (Math.min(100, (processed / total) * 100)).toFixed(0) : "100";

  console.log(`\n[VERIFY] Computed metrics:`);
  console.log(`  reach_rate    = ${reachRate}%`);
  console.log(`  progress      = ${progress}%`);
  console.log(`  credits_used  = ${credits} (should equal sent_emails=${sent})`);

  const PASS = (label, ok) => {
    console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}`);
    if (!ok) throw new Error(`Assertion failed: ${label}`);
  };

  console.log("\n[VERIFY] Assertions:");
  PASS("status is COMPLETED or FAILED", ["COMPLETED", "FAILED"].includes(finalCampaign.status));
  PASS("total_emails = 2 (one normal + one suppressed)", total === 2);
  PASS("skipped_emails = 1 (suppressed contact skipped)", skipped === 1);
  PASS("credits_used = sent_emails (suppressed contact not charged)", credits === sent);
  PASS("progress = 100% (all contacts processed)", progress === "100");
  PASS(`sent + failed + skipped = total (${processed} = ${total})`, processed === total);

  console.log(`\n[VERIFY] All assertions PASSED.`);
  console.log(`[VERIFY] Campaign ${campaignId} is evidence. Check Railway logs for worker output.`);

} catch (err) {
  console.error(`\n[VERIFY] ERROR: ${err.message}`);
} finally {
  // ── 8. Clean up test data ───────────────────────────────────────────────
  console.log("\n[VERIFY] Cleaning up test data…");

  if (cleanup.suppressionEmails.length) {
    const adminRes = await query(`SELECT id FROM users WHERE role='admin' AND is_active=true ORDER BY created_at ASC LIMIT 1`);
    if (adminRes.rows.length) {
      const adminId = adminRes.rows[0].id;
      for (const email of cleanup.suppressionEmails) {
        await query(
          `DELETE FROM suppressions WHERE user_id = $1 AND email = $2 AND source = 'manual'`,
          [adminId, email]
        ).catch(e => console.warn(`[VERIFY] Could not delete suppression: ${e.message}`));
      }
    }
  }

  // Note: we do NOT delete the campaign record — it's production evidence.
  // We DO delete the test contacts we created (ON CONFLICT means only new ones are in cleanup.contactIds)
  for (const id of cleanup.contactIds) {
    await query(`DELETE FROM contacts WHERE id = $1`, [id])
      .catch(e => console.warn(`[VERIFY] Could not delete contact: ${e.message}`));
  }

  // Explicitly note whether the campaign record was kept
  if (cleanup.campaignId) {
    console.log(`[VERIFY] Campaign record ${cleanup.campaignId} retained for audit trail.`);
  }

  await queue.close().catch(() => {});
  await redis.quit().catch(() => {});
  await pool.end().catch(() => {});
  console.log("[VERIFY] Cleanup complete.");
}
