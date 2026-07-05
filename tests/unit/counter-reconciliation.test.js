// PAR-TRUST-017 §13 / TRUST-018 verification — post-finalization reconciliation
// of the campaigns.sentEmails/creditsUsed cache. Runs against the in-memory
// storage backend (DATABASE_URL unset — no real Postgres/AWS touched).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { storage } from "../../server/storage.js";
import { runCampaignLoop, waitForCampaignReleaseAndFinalize } from "../../server/campaignLoop.js";
import { RECONCILIATION_MIN_AGE_MS, RECONCILIATION_MAX_AGE_MS } from "../../server/campaignConfig.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` })),
}));

async function makeSendableUser() {
  const user = await storage.createUser({
    username: `user_${Math.random().toString(36).slice(2)}`,
    email: `${Math.random().toString(36).slice(2)}@example.com`,
    password: "x".repeat(20),
    creditsReceived: 1000,
    emailVerified: true,
  });
  await storage.updateUser(user.id, { senderName: "Test Sender", warmupDailyLimit: 100_000 });
  const domain = await storage.createSenderDomain({
    userId: user.id, domain: "example.com", fromEmail: "campaigns@example.com", status: "VERIFIED",
  });
  return { user, domain };
}

async function makeCampaignWithContacts(userId, senderDomainId, count) {
  const contacts = [];
  for (let i = 0; i < count; i++) {
    contacts.push(await storage.createContact({ userId, email: `contact${i}_${Math.random().toString(36).slice(2)}@example.com` }));
  }
  const campaign = await storage.createCampaign({
    userId, name: "Reconciliation test campaign", status: "PENDING", totalEmails: contacts.length,
    contactIds: contacts.map(c => c.id), senderDomainId, senderEmailSnapshot: "campaigns@example.com",
    templateSnapshot: { subject: "Hi", body: "Hello there" },
  });
  return { campaign, contacts };
}

beforeEach(async () => {
  vi.resetAllMocks();
  const { sendCampaignEmail } = await import("../../server/email.js");
  sendCampaignEmail.mockImplementation(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` }));
});

describe("PAR-TRUST-017 §13 — reconcileCampaignCounters", () => {
  it("is a no-op on an already-correct, finalized campaign", async () => {
    const { user, domain } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, domain.id, 3);
    await runCampaignLoop(campaign.id, user.id, { logTag: "[TEST]" });

    const corrected = await storage.reconcileCampaignCounters(campaign.id);
    expect(corrected).toBe(false); // nothing to fix
  });

  it("refuses to touch a campaign that is not yet finalized", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 2);
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    const corrected = await storage.reconcileCampaignCounters(campaign.id);
    expect(corrected).toBe(false);
    const stillRunning = await storage.getCampaign(campaign.id);
    expect(stillRunning.status).toBe("RUNNING"); // untouched
  });

  it("heals the exact TRUST-018 drift: corrects sentEmails/creditsUsed to match campaign_emails after a stale finalize snapshot", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 4);

    // Simulate the confirmed TRUST-018 scenario directly: campaign_emails
    // ground truth has 4 SENT rows (all 4 contacts genuinely sent — e.g. 2 by
    // each of two overlapping executions), but the campaigns row is left at a
    // stale snapshot (2) captured by whichever execution won the finalize race
    // before the other's remaining 2 sends had landed.
    for (const c of contacts) {
      const rec = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c.id, recipientEmail: c.email });
      await storage.updateCampaignEmail(rec.id, { status: "SENT", sentAt: new Date() });
      await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${c.email}`);
    }
    await storage.updateCampaign(campaign.id, {
      status: "CANCELLED", finalizedAt: new Date(), sentEmails: 2, creditsUsed: 2, // the stale, "won" snapshot
    });

    const beforeReconcile = await storage.getCampaign(campaign.id);
    expect(beforeReconcile.sentEmails).toBe(2); // confirmed drifted

    const corrected = await storage.reconcileCampaignCounters(campaign.id);
    expect(corrected).toBe(true);

    const afterReconcile = await storage.getCampaign(campaign.id);
    expect(afterReconcile.sentEmails).toBe(4); // healed to match campaign_emails
    expect(afterReconcile.creditsUsed).toBe(4);
    expect(afterReconcile.status).toBe("CANCELLED"); // status/finalizedAt untouched
    expect(afterReconcile.finalizedAt).toBeTruthy();

    // Audit trail: exactly one reconciliation entry, describing the correction.
    const logs = await storage.getAuditLogs({ targetId: campaign.id, limit: 1000 });
    const reconcileLogs = logs.filter(l => l.action === "CAMPAIGN_COUNTERS_RECONCILED");
    expect(reconcileLogs.length).toBe(1);
    expect(reconcileLogs[0].details.before.sentEmails).toBe(2);
    expect(reconcileLogs[0].details.after.sentEmails).toBe(4);
  });

  it("never drifts again once reconciled — a second pass is a no-op", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);
    for (const c of contacts) {
      const rec = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c.id, recipientEmail: c.email });
      await storage.updateCampaignEmail(rec.id, { status: "SENT", sentAt: new Date() });
    }
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });
    await storage.finalizeCampaign(campaign.id, "CANCELLED");
    await storage.updateCampaign(campaign.id, { sentEmails: 0 }); // force drift

    expect(await storage.reconcileCampaignCounters(campaign.id)).toBe(true);
    expect(await storage.reconcileCampaignCounters(campaign.id)).toBe(false); // already correct now
  });

  it("concurrent reconciliation (e.g. two horizontally-scaled instances' independent 15-min timers both picking up the same drifted campaign) writes exactly one audit entry", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);
    for (const c of contacts) {
      const rec = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c.id, recipientEmail: c.email });
      await storage.updateCampaignEmail(rec.id, { status: "SENT", sentAt: new Date() });
    }
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });
    await storage.finalizeCampaign(campaign.id, "CANCELLED");
    await storage.updateCampaign(campaign.id, { sentEmails: 0 }); // force drift

    const results = await Promise.all(
      Array.from({ length: 5 }, () => storage.reconcileCampaignCounters(campaign.id))
    );
    expect(results.filter(Boolean).length).toBe(1); // exactly one caller actually wrote the correction

    const logs = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    expect(logs.filter(l => l.action === "CAMPAIGN_COUNTERS_RECONCILED").length).toBe(1); // no duplicate audit
  });
});

describe("PAR-TRUST-017 §13 — getCampaignsPendingReconciliation window", () => {
  it("excludes campaigns finalized too recently (inside the min-age guard)", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 1);
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });
    await storage.finalizeCampaign(campaign.id, "CANCELLED"); // finalizedAt = now

    const candidates = await storage.getCampaignsPendingReconciliation(RECONCILIATION_MIN_AGE_MS, RECONCILIATION_MAX_AGE_MS);
    expect(candidates.some(c => c.id === campaign.id)).toBe(false);
  });

  it("includes campaigns finalized within the reconciliation window", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 1);
    await storage.updateCampaign(campaign.id, {
      status: "CANCELLED",
      finalizedAt: new Date(Date.now() - RECONCILIATION_MIN_AGE_MS - 60_000), // just past the min-age guard
    });

    const candidates = await storage.getCampaignsPendingReconciliation(RECONCILIATION_MIN_AGE_MS, RECONCILIATION_MAX_AGE_MS);
    expect(candidates.some(c => c.id === campaign.id)).toBe(true);
  });

  it("excludes campaigns finalized beyond the max-age window", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 1);
    await storage.updateCampaign(campaign.id, {
      status: "CANCELLED",
      finalizedAt: new Date(Date.now() - RECONCILIATION_MAX_AGE_MS - 60_000),
    });

    const candidates = await storage.getCampaignsPendingReconciliation(RECONCILIATION_MIN_AGE_MS, RECONCILIATION_MAX_AGE_MS);
    expect(candidates.some(c => c.id === campaign.id)).toBe(false);
  });

  it("excludes campaigns that are not finalized at all", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 1);
    await storage.updateCampaign(campaign.id, { status: "RUNNING" }); // never finalized

    const candidates = await storage.getCampaignsPendingReconciliation(0, RECONCILIATION_MAX_AGE_MS);
    expect(candidates.some(c => c.id === campaign.id)).toBe(false);
  });
});

// Production-issues milestone (2026-07-05) — real financial-correctness bug
// found via direct production reproduction: a legitimately-sent, legitimately-
// charged email that later bounces/complains was silently dropped from both
// sentEmails and creditsUsed on the next reconciliation pass, because
// deriveCountsFromCampaignEmails counted only status===SENT. BOUNCED/COMPLAINED
// are states a message reaches only *after* a successful send, never instead
// of one — the credit_transactions ledger never reverses that charge, so the
// cached counter must not either.
describe("Production-issues milestone — BOUNCED/COMPLAINED count as sent", () => {
  it("deriveCountsFromCampaignEmails counts BOUNCED and COMPLAINED rows as sent, not dropped", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 3);
    const [c1, c2, c3] = contacts;

    // Each contact goes through the real send+deduct pairing (claim -> SENT ->
    // deductCreditAtomic) exactly as campaignLoop.js does it, not just a status
    // write — creditsUsed is now ledger-derived (see storage.js), so a test that
    // only sets campaign_emails.status without a real deduction would no longer
    // exercise what this test is actually about.
    const r1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c1.id, recipientEmail: c1.email });
    await storage.updateCampaignEmail(r1.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${c1.email}`);
    const r2 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c2.id, recipientEmail: c2.email });
    await storage.updateCampaignEmail(r2.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${c2.email}`);
    await storage.updateCampaignEmailBounced(r2.id); // simulates the real SNS bounce transition, arriving after the send+deduct above
    const r3 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c3.id, recipientEmail: c3.email });
    await storage.updateCampaignEmail(r3.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${c3.email}`);
    await storage.updateCampaignEmailComplained(r3.id);

    const derived = await storage.deriveCountsFromCampaignEmails(campaign.id);
    expect(derived.sentEmails).toBe(3); // all three were genuinely sent — 1 clean, 1 bounced, 1 complained
    expect(derived.creditsUsed).toBe(3); // credit_transactions never reverses a legitimate charge
    expect(derived.bouncedEmails).toBe(1);
    expect(derived.complainedEmails).toBe(1);
  });

  it("creditsUsed reflects the ledger exactly, even when a SENT row has no matching deduction (the disclosed accounting-drift edge case)", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);
    // Contact 1: real send + real deduction — the normal case.
    const r1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[0].id, recipientEmail: contacts[0].email });
    await storage.updateCampaignEmail(r1.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${contacts[0].email}`);
    // Contact 2: marked SENT (the send itself succeeded) but deliberately no
    // deductCreditAtomic call — simulates the exact "DB error after successful
    // send" drift storage.js's own comment names as a known, narrow, pre-existing
    // possibility. sentEmails counts this row; creditsUsed correctly must not.
    const r2 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[1].id, recipientEmail: contacts[1].email });
    await storage.updateCampaignEmail(r2.id, { status: "SENT", sentAt: new Date() });

    const derived = await storage.deriveCountsFromCampaignEmails(campaign.id);
    expect(derived.sentEmails).toBe(2); // both sends genuinely happened
    expect(derived.creditsUsed).toBe(1); // only one was actually charged — the ledger, not the row count, is authoritative
  });

  it("updateCampaignEmailBounced/Complained are idempotent per row — a second SNS notification for the same recipient does not double-count", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 1);
    const record = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[0].id, recipientEmail: contacts[0].email });
    await storage.updateCampaignEmail(record.id, { status: "SENT", sentAt: new Date() });

    const first = await storage.updateCampaignEmailBounced(record.id);
    expect(first.wasFirst).toBe(true);
    const second = await storage.updateCampaignEmailBounced(record.id); // simulates SES/SNS redelivering the bounce notification
    expect(second.wasFirst).toBe(false);

    const derived = await storage.deriveCountsFromCampaignEmails(campaign.id);
    expect(derived.bouncedEmails).toBe(1); // not 2 — this is exactly what would have inflated Bounce Rate and could have triggered auto-pause early
  });
});

describe("Production-issues milestone — SUPPRESSED recipients reconcile correctly", () => {
  it("a SUPPRESSED row is counted in skippedEmails, never charged, and does not become an orphan-flip FAILED row on finalization", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);
    const [c1, c2] = contacts;

    // c1: genuine send + charge — the control.
    const r1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c1.id, recipientEmail: c1.email });
    await storage.updateCampaignEmail(r1.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${c1.email}`);

    // c2: the loop's suppression check (campaignLoop.js ~line 542) finds the
    // contact on the suppression list and writes SUPPRESSED directly — this
    // recipient is never claimed as PENDING at all, and no credit is ever
    // deducted for it.
    const r2 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c2.id, recipientEmail: c2.email });
    await storage.updateCampaignEmail(r2.id, { status: "SUPPRESSED" });
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    await storage.finalizeCampaign(campaign.id, "COMPLETED");

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.sentEmails).toBe(1);
    expect(finalCampaign.skippedEmails).toBe(1); // SUPPRESSED counted here, not as failedEmails
    expect(finalCampaign.failedEmails).toBe(0); // the orphan-flip must never touch a SUPPRESSED row (it only matches status=PENDING)
    expect(finalCampaign.creditsUsed).toBe(1); // suppression never charges
    expect(finalCampaign.sentEmails + finalCampaign.failedEmails + finalCampaign.skippedEmails).toBe(finalCampaign.totalEmails);

    const logs = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    const finalizedLog = logs.find(l => l.action === "CAMPAIGN_FINALIZED");
    expect(finalizedLog.details.skippedEmails).toBe(1);
    expect(finalizedLog.details.creditsUsed).toBe(1);
  });
});

describe("Production-issues milestone — finalizeCampaign writes the true-outcome audit record", () => {
  it("writes CAMPAIGN_FINALIZED exactly once, with the true derived counts, distinct from the decision-time CAMPAIGN_CANCELLED entry", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);
    // Simulate one send already having landed before cancellation is decided —
    // this is exactly the race confirmed live: the decision-time audit entry
    // cannot know about it, only finalizeCampaign's own entry can.
    const r1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[0].id, recipientEmail: contacts[0].email });
    await storage.updateCampaignEmail(r1.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${contacts[0].email}`);
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    await storage.finalizeCampaign(campaign.id, "CANCELLED");

    const logs = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    const finalizedLogs = logs.filter(l => l.action === "CAMPAIGN_FINALIZED");
    expect(finalizedLogs.length).toBe(1);
    expect(finalizedLogs[0].details.sentEmails).toBe(1);
    expect(finalizedLogs[0].details.creditsUsed).toBe(1);
    expect(finalizedLogs[0].details.toStatus).toBe("CANCELLED");

    // Idempotent finalization (e.g. a duplicate call from a racing execution)
    // must not write a second CAMPAIGN_FINALIZED entry.
    await storage.finalizeCampaign(campaign.id, "CANCELLED");
    const logsAfter = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    expect(logsAfter.filter(l => l.action === "CAMPAIGN_FINALIZED").length).toBe(1);
  });

  it("counts the orphaned PENDING→FAILED(campaign_terminated) rows in the SAME finalize call that creates them — audit entry must not be a pre-flip snapshot", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);
    const r1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[0].id, recipientEmail: contacts[0].email });
    await storage.updateCampaignEmail(r1.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${contacts[0].email}`);
    // Contact 2 is claimed (a real PENDING row exists — e.g. the loop had
    // started sending it) but never resolved before cancellation lands.
    // finalizeCampaign's own bulk-orphan-cleanup is what turns this into
    // FAILED("campaign_terminated") — the counts it writes must reflect that
    // conversion, not a snapshot taken before it happened.
    await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[1].id, recipientEmail: contacts[1].email });
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    await storage.finalizeCampaign(campaign.id, "CANCELLED");

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.sentEmails).toBe(1);
    expect(finalCampaign.failedEmails).toBe(1); // the orphaned row, now FAILED
    expect(finalCampaign.sentEmails + finalCampaign.failedEmails).toBe(finalCampaign.totalEmails); // fully reconciled — no residual

    const logs = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    const finalizedLog = logs.find(l => l.action === "CAMPAIGN_FINALIZED");
    expect(finalizedLog.details.failedEmails).toBe(1); // audit entry must match, not undercount
  });

  it("racing finalizeCampaign calls (e.g. cancel-endpoint + crash-recovery both deciding CANCELLED at once) produce exactly one winner, one audit entry, one set of counts — no duplicate financial movement", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 3);
    const r1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[0].id, recipientEmail: contacts[0].email });
    await storage.updateCampaignEmail(r1.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${contacts[0].email}`);
    // contacts[1] claimed but never resolved (in-flight when the race lands);
    // contacts[2] never even claimed (arithmetic UNSENT residual).
    await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[1].id, recipientEmail: contacts[1].email });
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    // Five concurrent callers race to finalize the same campaign — simulates
    // overlapping executions/retries all reaching their terminal decision at
    // once. Exactly one may win the claim; the rest must no-op cleanly.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => storage.finalizeCampaign(campaign.id, "CANCELLED"))
    );
    expect(results.filter(Boolean).length).toBe(1); // exactly one winner

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.sentEmails).toBe(1);
    expect(finalCampaign.failedEmails).toBe(1); // only the claimed-orphan, not the never-claimed contact
    expect(finalCampaign.creditsUsed).toBe(1);

    const logs = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    expect(logs.filter(l => l.action === "CAMPAIGN_FINALIZED").length).toBe(1); // no duplicate audit

    // The user's actual ledger must show exactly one deduction — racing
    // finalization must never itself move money.
    const txns = await storage.getCreditTransactions(user.id, 100);
    const campaignTxns = txns.filter(t => t.campaignId === campaign.id);
    expect(campaignTxns.length).toBe(1);
  });

  it("worker-restart / lease-expiry: a crashed execution's lease has already lapsed, so the reclaim gate force-finalizes near-instantly with true counts — no 30s stall", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);
    const r1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[0].id, recipientEmail: contacts[0].email });
    await storage.updateCampaignEmail(r1.id, { status: "SENT", sentAt: new Date() });
    await storage.deductCreditAtomic(user.id, campaign.id, `Email to ${contacts[0].email}`);
    // contacts[1] claimed (in-flight) when the worker holding the lease crashed
    // — its lease is set but already in the past, exactly as a dead worker's
    // last-renewed lease looks after a crash (nothing clears it on a crash;
    // only a graceful PAUSED/finalize path clears it).
    await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[1].id, recipientEmail: contacts[1].email });
    await storage.updateCampaign(campaign.id, {
      status: "RUNNING",
      executionLeaseExpiresAt: new Date(Date.now() - 60_000), // lapsed a minute ago
    });

    const start = Date.now();
    await waitForCampaignReleaseAndFinalize(campaign.id, "CANCELLED", "[TEST-RECLAIM]");
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(2_000); // must recognize "already lapsed" immediately, not poll/wait

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.finalizedAt).toBeTruthy();
    expect(finalCampaign.status).toBe("CANCELLED");
    expect(finalCampaign.sentEmails).toBe(1);
    expect(finalCampaign.failedEmails).toBe(1); // the in-flight orphan, correctly failed
    expect(finalCampaign.creditsUsed).toBe(1);

    const logs = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    expect(logs.filter(l => l.action === "CAMPAIGN_FINALIZED").length).toBe(1);

    // The "dead" worker is not actually dead — it wakes up after the reclaim
    // gate already force-finalized (e.g. a delayed BullMQ retry or a network
    // partition that resolves late) and calls finalizeCampaign itself. This
    // must be a clean no-op: no second audit entry, no count changes, no
    // second credit movement.
    const zombieResult = await storage.finalizeCampaign(campaign.id, "CANCELLED");
    expect(zombieResult).toBe(false);
    const logsAfterZombie = await storage.getAuditLogs({ targetId: campaign.id, limit: 100 });
    expect(logsAfterZombie.filter(l => l.action === "CAMPAIGN_FINALIZED").length).toBe(1);
    const campaignAfterZombie = await storage.getCampaign(campaign.id);
    expect(campaignAfterZombie.creditsUsed).toBe(1);
  });
});
