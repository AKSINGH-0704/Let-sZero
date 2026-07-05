// PAR-TRUST-017 verification — campaign execution & credit finalization integrity.
// Runs entirely against the in-memory storage backend (DATABASE_URL is unset in
// the test environment, so server/db.js activates dev/in-memory mode automatically
// — no real Postgres, no real AWS/SES is ever touched).
//
// Covers the verification plan in
// Let-sZero-private/architecture/PAR-TRUST-017_campaign-execution-integrity.md §10:
//   1. atomic claim under real concurrency (exactly one winner per contact)
//   2. claim correctly reclaims retryable rows vs. skips terminal ones
//   3. finalizeCampaign idempotency, legal-transition guard, concurrent-caller safety
//   4. full end-to-end: two concurrent runCampaignLoop executions for the same
//      campaign (the exact R1/TRUST-017 class) — reconciliation proof that
//      unique recipients processed == emails sent == credits charged ==
//      campaign counters == credit_transactions ledger entries, with zero
//      duplicates, under real concurrency.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { storage } from "../../server/storage.js";
import { runCampaignLoop } from "../../server/campaignLoop.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` })),
}));

async function makeSendableUser(overrides = {}) {
  const user = await storage.createUser({
    username: `user_${Math.random().toString(36).slice(2)}`,
    email: `${Math.random().toString(36).slice(2)}@example.com`,
    password: "x".repeat(20),
    creditsReceived: 1000,
    emailVerified: true,
    ...overrides,
  });
  await storage.updateUser(user.id, {
    senderName: "Test Sender",
    warmupDailyLimit: 100_000, // admin override — bypasses warm-up daily-limit math entirely
  });
  const domain = await storage.createSenderDomain({
    userId: user.id,
    domain: "example.com",
    fromEmail: "campaigns@example.com",
    status: "VERIFIED",
  });
  return { user, domain };
}

async function makeCampaignWithContacts(userId, senderDomainId, count) {
  const contacts = [];
  for (let i = 0; i < count; i++) {
    const c = await storage.createContact({ userId, email: `contact${i}_${Math.random().toString(36).slice(2)}@example.com` });
    contacts.push(c);
  }
  const campaign = await storage.createCampaign({
    userId,
    name: "Integrity test campaign",
    status: "PENDING",
    totalEmails: contacts.length,
    contactIds: contacts.map(c => c.id),
    senderDomainId,
    senderEmailSnapshot: "campaigns@example.com",
    templateSnapshot: { subject: "Hi", body: "Hello there" },
  });
  return { campaign, contacts };
}

async function countCreditTransactions(userId, campaignId) {
  const all = await storage.getCreditTransactions(userId, 1000);
  return (all || []).filter(t => t.campaignId === campaignId);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PAR-TRUST-017 §7.1 — claimCampaignEmail atomicity", () => {
  it("exactly one of N concurrent claims for the same contact wins", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 1);
    const contact = contacts[0];

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        storage.claimCampaignEmail({
          campaignId: campaign.id,
          userId: user.id,
          contactId: contact.id,
          recipientEmail: contact.email,
        })
      )
    );

    const winners = results.filter(Boolean);
    expect(winners.length).toBe(1);

    const rows = await storage.getCampaignEmailsByCampaign(campaign.id, 100);
    const rowsForContact = rows.filter(r => r.contactId === contact.id);
    expect(rowsForContact.length).toBe(1); // exactly one row ever created — no duplicates
  });

  it("never reclaims a PENDING row — a second claim attempt is a no-op, not a win", async () => {
    // This is the exact bug this PAR's own concurrency test caught: reclaiming
    // PENDING→PENDING is a no-op transition (the guarded value never changes),
    // so it provides no exclusion — every concurrent claimant would "win" the
    // same row. A PENDING row must be left strictly alone by every other caller;
    // it is either actively held, or will be cleaned up by finalizeCampaign.
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 1);
    const contact = contacts[0];

    const first = await storage.claimCampaignEmail({
      campaignId: campaign.id, userId: user.id, contactId: contact.id, recipientEmail: contact.email,
    });
    expect(first).toBeTruthy();
    expect(first.status).toBe("PENDING");

    const second = await storage.claimCampaignEmail({
      campaignId: campaign.id, userId: user.id, contactId: contact.id, recipientEmail: contact.email,
    });
    expect(second).toBeNull();

    const rows = (await storage.getCampaignEmailsByCampaign(campaign.id, 100)).filter(r => r.contactId === contact.id);
    expect(rows.length).toBe(1);
  });

  it("reclaims a FAILED('campaign_terminated') row after finalization — the orphan-cleanup path", async () => {
    // Reproduces the legitimate case a PENDING row eventually becomes retryable:
    // finalizeCampaign's orphan cleanup converts it to FAILED("campaign_terminated"),
    // a transient (non-permanent) reason.
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 1);
    const contact = contacts[0];

    const first = await storage.claimCampaignEmail({
      campaignId: campaign.id, userId: user.id, contactId: contact.id, recipientEmail: contact.email,
    });
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });
    await storage.finalizeCampaign(campaign.id, "FAILED");

    const afterFinalize = await storage.getCampaignEmailsByCampaign(campaign.id, 10);
    expect(afterFinalize[0].status).toBe("FAILED");
    expect(afterFinalize[0].failureReason).toBe("campaign_terminated");

    const reclaimed = await storage.claimCampaignEmail({
      campaignId: campaign.id, userId: user.id, contactId: contact.id, recipientEmail: contact.email,
    });
    expect(reclaimed).toBeTruthy();
    expect(reclaimed.id).toBe(first.id);
    expect(reclaimed.status).toBe("PENDING");
  });

  it("reclaims a transient FAILED row but never a permanent one", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 2);

    const [transient, permanent] = contacts;
    const t1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: transient.id, recipientEmail: transient.email });
    await storage.updateCampaignEmail(t1.id, { status: "FAILED", failureReason: "smtp_timeout" });

    const p1 = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: permanent.id, recipientEmail: permanent.email });
    await storage.updateCampaignEmail(p1.id, { status: "FAILED", failureReason: "hard_bounce" });

    const reclaimedTransient = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: transient.id, recipientEmail: transient.email });
    expect(reclaimedTransient).toBeTruthy();
    expect(reclaimedTransient.id).toBe(t1.id);
    expect(reclaimedTransient.status).toBe("PENDING");

    const blockedPermanent = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: permanent.id, recipientEmail: permanent.email });
    expect(blockedPermanent).toBeNull(); // hard_bounce must never be retried
  });
});

describe("PAR-TRUST-017 §7.3/§7.5 — finalizeCampaign", () => {
  it("rejects PAUSED as an illegal finalization target", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 1);
    await expect(storage.finalizeCampaign(campaign.id, "PAUSED")).rejects.toThrow(/illegal toStatus/);
  });

  it("is idempotent — only the first of N concurrent calls applies", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 3);
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    const N = 6;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        storage.finalizeCampaign(campaign.id, "CANCELLED")
      )
    );
    expect(results.filter(Boolean).length).toBe(1);

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.status).toBe("CANCELLED");
    expect(finalCampaign.finalizedAt).toBeTruthy();
  });

  it("COMPLETED guard refuses to fire if status is no longer RUNNING", async () => {
    const { user } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, null, 1);
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    // Someone else cancels first.
    await storage.finalizeCampaign(campaign.id, "CANCELLED");

    // The loop's own natural-completion path must not overwrite it to COMPLETED.
    const completed = await storage.finalizeCampaign(campaign.id, "COMPLETED");
    expect(completed).toBe(false);

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.status).toBe("CANCELLED"); // never overwritten
  });

  it("marks orphaned PENDING campaign_emails FAILED on finalization", async () => {
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 1);
    await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: contacts[0].id, recipientEmail: contacts[0].email });

    await storage.finalizeCampaign(campaign.id, "FAILED");

    const rows = await storage.getCampaignEmailsByCampaign(campaign.id, 10);
    expect(rows[0].status).toBe("FAILED");
    expect(rows[0].failureReason).toBe("campaign_terminated");
  });
});

describe("PAR-TRUST-017 — end-to-end: overlapping executions of the same campaign", () => {
  it("two concurrent runCampaignLoop executions never double-send or double-charge a contact", async () => {
    const { user, domain } = await makeSendableUser();
    const CONTACT_COUNT = 12;
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, domain.id, CONTACT_COUNT);

    // Simulate the R1/TRUST-017 class directly: two executions of the loop run
    // concurrently for the SAME campaignId, exactly the scenario a stalled BullMQ
    // job redelivery, an inline-fallback double-trigger, or (pre-fix) a deactivation
    // that failed to stop an in-flight loop could all produce.
    await Promise.all([
      runCampaignLoop(campaign.id, user.id, { logTag: "[TEST][A]" }),
      runCampaignLoop(campaign.id, user.id, { logTag: "[TEST][B]" }),
    ]);

    const finalCampaign = await storage.getCampaign(campaign.id);
    const emailRows = await storage.getCampaignEmailsByCampaign(campaign.id, 100);
    const sentRows = emailRows.filter(r => r.status === "SENT");
    const ledger = await countCreditTransactions(user.id, campaign.id);

    // I1 — at-most-once send: exactly one row per contact, ever.
    expect(emailRows.length).toBe(CONTACT_COUNT);
    const uniqueContactIds = new Set(emailRows.map(r => r.contactId));
    expect(uniqueContactIds.size).toBe(CONTACT_COUNT);

    // Reconciliation (PAR §10.6): unique recipients sent == SENT rows == campaign
    // counter == credit_transactions ledger rows — all under real concurrency.
    expect(sentRows.length).toBe(CONTACT_COUNT);
    expect(finalCampaign.sentEmails).toBe(CONTACT_COUNT);
    expect(finalCampaign.creditsUsed).toBe(CONTACT_COUNT);
    expect(finalCampaign.status).toBe("COMPLETED");
    expect(finalCampaign.finalizedAt).toBeTruthy();
    expect(ledger.length).toBe(CONTACT_COUNT);

    // The user's real balance-affecting field must reflect exactly CONTACT_COUNT
    // deductions — not double-charged despite two overlapping executions.
    const finalUser = await storage.getUserById(user.id);
    expect(finalUser.creditsUsed).toBe(CONTACT_COUNT);

    // Audit records: exactly one CAMPAIGN_COMPLETED entry despite both executions
    // racing to finalize (I7 — finalization never duplicates the decision log).
    const completedLogs = (await storage.getAuditLogs({ targetId: campaign.id, limit: 1000 }))
      .filter(l => l.action === "CAMPAIGN_COMPLETED");
    expect(completedLogs.length).toBe(1);
  });

  it("finalizes correctly when called from outside any live loop (worker.js's BullMQ-failure path)", async () => {
    // Reproduces R5: a loop throws before reaching its own finalization (e.g. a
    // DB error during setup), and worker.js's `failed` handler — which has no
    // local counters at all — must still be able to finalize accurately from
    // whatever partial campaign_emails state exists.
    const { user } = await makeSendableUser();
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, null, 5);
    await storage.updateCampaign(campaign.id, { status: "RUNNING" });

    // Simulate 2 of 5 contacts having been sent before the crash.
    for (const c of contacts.slice(0, 2)) {
      const rec = await storage.claimCampaignEmail({ campaignId: campaign.id, userId: user.id, contactId: c.id, recipientEmail: c.email });
      await storage.updateCampaignEmail(rec.id, { status: "SENT", sentAt: new Date() });
    }

    const finalized = await storage.finalizeCampaign(campaign.id, "FAILED");
    expect(finalized).toBe(true);

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.status).toBe("FAILED");
    expect(finalCampaign.sentEmails).toBe(2); // derived from campaign_emails, not a caller-supplied count
    expect(finalCampaign.finalizedAt).toBeTruthy();

    // The 3 never-attempted contacts have no PENDING row at all (crash happened
    // before the loop reached them) — nothing to clean up for those, correctly.
    const rows = await storage.getCampaignEmailsByCampaign(campaign.id, 100);
    expect(rows.length).toBe(2);
  });

  it("a campaign externally forced to CANCELLED mid-run stops within the same iteration and finalizes correctly (TRUST-017 reproduction)", async () => {
    const { sendCampaignEmail } = await import("../../server/email.js");
    // Give each simulated send real latency so there is an actual window for the
    // external cancel to land mid-run — otherwise the mocked send resolves near-
    // instantly and the whole campaign completes before the cancel is issued.
    sendCampaignEmail.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ messageId: `mock-${Math.random()}` }), 15))
    );

    const { user, domain } = await makeSendableUser();
    const CONTACT_COUNT = 20;
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, domain.id, CONTACT_COUNT);

    // Start the loop, then externally cancel shortly after — simulating deactivation
    // (which now calls cancelCampaign per §7.4) racing against an in-flight loop.
    const loopPromise = runCampaignLoop(campaign.id, user.id, { logTag: "[TEST][CANCEL]" });
    await new Promise(r => setTimeout(r, 30));
    await storage.cancelCampaign(campaign.id, ["RUNNING", "PENDING"]);
    await loopPromise;

    const finalCampaign = await storage.getCampaign(campaign.id);
    expect(finalCampaign.status).toBe("CANCELLED");
    expect(finalCampaign.finalizedAt).toBeTruthy();

    // Reconciliation must hold even for an early, externally-forced stop: whatever
    // subset of contacts got processed before the cancel took effect must be fully
    // and consistently accounted for — no partial/stale counters.
    const emailRows = await storage.getCampaignEmailsByCampaign(campaign.id, 100);
    const sentRows = emailRows.filter(r => r.status === "SENT");
    const ledger = await countCreditTransactions(user.id, campaign.id);
    expect(finalCampaign.sentEmails).toBe(sentRows.length);
    expect(finalCampaign.creditsUsed).toBe(sentRows.length);
    expect(ledger.length).toBe(sentRows.length);
    expect(sentRows.length).toBeLessThan(CONTACT_COUNT); // proves the cancel actually cut it short
  });
});
