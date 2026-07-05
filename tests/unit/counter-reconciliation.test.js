// PAR-TRUST-017 §13 / TRUST-018 verification — post-finalization reconciliation
// of the campaigns.sentEmails/creditsUsed cache. Runs against the in-memory
// storage backend (DATABASE_URL unset — no real Postgres/AWS touched).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { storage } from "../../server/storage.js";
import { runCampaignLoop } from "../../server/campaignLoop.js";
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
