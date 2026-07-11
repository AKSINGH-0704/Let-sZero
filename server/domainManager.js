/**
 * Domain Manager — M9 Custom Sending Domains (hardened M12)
 * ============================================
 * Handles domain registration, SES identity management, verification polling,
 * and domain-level validation. All business logic for sender domains lives here;
 * routes.js calls these functions and handles HTTP framing.
 *
 * AWS Easy DKIM: SES manages DKIM key pairs automatically. Customers add 3 CNAME
 * records (provided by SES). No per-message DKIM injection needed — SES signs
 * automatically for verified identities. The ownership TXT record was removed in
 * M12 — SES CNAME verification is the authoritative ownership proof.
 */

import { SESv2Client, CreateEmailIdentityCommand, GetEmailIdentityCommand, DeleteEmailIdentityCommand } from "@aws-sdk/client-sesv2";
import { getAwsRegion } from "./awsConfig.js";
import { resolveCname } from "dns/promises";
import { storage } from "./storage.js";
import { sendTransactionalEmail } from "./email.js";
import { AUDIT_ACTIONS, DOMAIN_ELIGIBLE_PLANS } from "../shared/schema.js";
import { normalizeDomain, validateFromEmail } from "../shared/domainUtils.js";

export { normalizeDomain, validateFromEmail };

const VERIFICATION_WINDOW_DAYS = parseInt(process.env.DOMAIN_VERIFICATION_WINDOW_DAYS || "14", 10);

// ── Module-level poll health state ────────────────────────────────────────────
// Exported so the health endpoint can surface domain poll liveness without
// needing to know about the scheduling logic in index.js.

let _lastPollCompletedAt = null;
let _pollInProgress = false;

export function getDomainPollHealth() {
  return {
    lastCompletedAt: _lastPollCompletedAt,
    inProgress: _pollInProgress,
  };
}

let ses = null;
function getSesClient() {
  if (!ses) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      const err = new Error("SES API credentials not configured: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Railway");
      err.code = "CREDENTIALS_NOT_CONFIGURED";
      throw err;
    }
    const region = getAwsRegion();
    if (!region) {
      const err = new Error("AWS region not configured: set AWS_REGION or SES_SMTP_HOST in Railway");
      err.code = "CREDENTIALS_NOT_CONFIGURED";
      throw err;
    }
    ses = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
  }
  return ses;
}

// ── Plan gate ─────────────────────────────────────────────────────────────────

export function assertDomainEligible(user) {
  // TRUST-025-adjacent (M20-B): use effectivePlan, not the raw column — a
  // Sub-Admin/User's own .plan defaults to "free" until a separate event
  // touches it, which would incorrectly block a paid workspace's own member.
  const plan = (user.effectivePlan ?? user.plan)?.toLowerCase();
  if (!DOMAIN_ELIGIBLE_PLANS.includes(plan)) {
    const err = new Error("Custom sending domains require a Starter plan or above");
    err.code = "PLAN_LIMIT";
    throw err;
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function registerDomain(userId, rawDomain, rawFromEmail) {
  const domain = normalizeDomain(rawDomain);
  const fromEmail = validateFromEmail(rawFromEmail, domain);

  // Idempotency: check existing record for this user+domain
  const existing = await storage.getSenderDomainByUserIdAndDomain(userId, domain);
  if (existing) {
    if (existing.status === "PENDING_VERIFICATION") {
      console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — returning existing PENDING record id=${existing.id}`);
      return existing;
    }
    if (existing.status === "VERIFIED") {
      const err = new Error("This domain is already verified on your account");
      err.code = "ALREADY_VERIFIED";
      throw err;
    }
    if (existing.status === "SUSPENDED") {
      const err = new Error("This domain is suspended and cannot be re-registered");
      err.code = "DOMAIN_SUSPENDED";
      throw err;
    }
    if (existing.status === "FAILED") {
      console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — deleting FAILED record id=${existing.id} for fresh start`);
      await storage.deleteSenderDomain(existing.id);
      try { await getSesClient().send(new DeleteEmailIdentityCommand({ EmailIdentity: domain })); } catch {}
    }
  }

  // Check if another user already owns this domain (cross-user conflict)
  const conflict = await storage.getSenderDomainByDomain(domain);
  if (conflict && conflict.userId !== userId) {
    const err = new Error("This domain is already registered by another account");
    err.code = "DOMAIN_CONFLICT";
    throw err;
  }

  // SES: reuse existing identity if present (idempotent on repeated registrations)
  let sesData = null;
  try {
    sesData = await getSesClient().send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
    console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — SES identity already exists, reusing`);
  } catch (err) {
    if (err.name !== "NotFoundException") throw err;
    sesData = await getSesClient().send(new CreateEmailIdentityCommand({
      EmailIdentity: domain,
      // Easy DKIM: AWS_SES manages RSA-2048 key pairs and rotation automatically.
      DkimSigningAttributes: { SigningAttributesOrigin: "AWS_SES", NextSigningKeyLength: "RSA_2048_BIT" },
    }));
    console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — SES identity created`);
  }

  // Extract DKIM CNAME records from SES response.
  // These are the only DNS records customers need to add — no ownership TXT record.
  const dkimAttrs = sesData.DkimAttributes || {};
  const dkimTokens = (dkimAttrs.Tokens || []).map(token => ({
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    type: "CNAME",
  }));

  const senderDomain = await storage.createSenderDomain({
    userId,
    domain,
    fromEmail,
    status: "PENDING_VERIFICATION",
    dkimTokens,
    verificationWindowDays: VERIFICATION_WINDOW_DAYS,
  });

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.DOMAIN_REGISTERED,
    targetType: "sender_domain",
    targetId: senderDomain.id,
    details: { domain, fromEmail },
  });

  console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — registered id=${senderDomain.id}`);
  return senderDomain;
}

// ── Verification check ────────────────────────────────────────────────────────

export async function checkDomainVerification(domainRecord, { logTag = "[DOMAIN][CHECK]" } = {}) {
  const { id, domain, userId } = domainRecord;

  let sesStatus = "NOT_STARTED";
  let dkimStatus = "NOT_STARTED";

  try {
    const sesData = await getSesClient().send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
    sesStatus = sesData.VerifiedForSendingStatus ? "VERIFIED" : "PENDING";
    dkimStatus = sesData.DkimAttributes?.Status || "NOT_STARTED";
  } catch (err) {
    if (err.name === "NotFoundException") {
      console.warn(`${logTag} domainId=${id} userId=${userId} domain=${domain} — SES identity no longer exists; marking FAILED`);
      const updated = await storage.updateSenderDomainIfPending(id, {
        status: "FAILED",
        updatedAt: new Date(),
      });
      if (updated) {
        await storage.createAuditLog({
          userId,
          action: AUDIT_ACTIONS.DOMAIN_VERIFICATION_FAILED,
          targetType: "sender_domain",
          targetId: id,
          details: { domain, reason: "ses_identity_not_found" },
        });
        await _notifyVerificationFailed(userId, domain, domainRecord.verificationWindowDays, "ses_identity_not_found");
      }
      return { ...domainRecord, status: "FAILED" };
    } else if (err.name === "ThrottlingException") {
      console.warn(`${logTag} domainId=${id} userId=${userId} domain=${domain} — SES ThrottlingException, skipping this cycle`);
      return domainRecord;
    } else {
      throw err;
    }
  }

  // Per-record CNAME propagation check (diagnostic — does not block verification).
  // Returns individual propagation state per token so the frontend can show
  // "2 of 3 records propagated" instead of a single pass/fail.
  const dnsResults = { dkimRecords: [] };
  if (Array.isArray(domainRecord.dkimTokens) && domainRecord.dkimTokens.length > 0) {
    const cnameResults = await Promise.allSettled(
      domainRecord.dkimTokens.map(rec => resolveCname(rec.name))
    );
    dnsResults.dkimRecords = cnameResults.map((result, i) => ({
      name: domainRecord.dkimTokens[i].name,
      resolved: result.status === "fulfilled",
    }));
    const resolvedCount = dnsResults.dkimRecords.filter(r => r.resolved).length;
    dnsResults.dkimSummary = resolvedCount === domainRecord.dkimTokens.length
      ? "ALL_RESOLVED"
      : resolvedCount > 0 ? "PARTIAL" : "NONE_RESOLVED";
  }

  if (sesStatus === "VERIFIED" && dkimStatus === "SUCCESS") {
    const updated = await storage.updateSenderDomainIfPending(id, {
      status: "VERIFIED",
      verifiedAt: new Date(),
      updatedAt: new Date(),
    });
    if (updated) {
      await storage.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.DOMAIN_VERIFIED,
        targetType: "sender_domain",
        targetId: id,
        details: { domain, dnsResults },
      });
      console.log(`${logTag} domainId=${id} userId=${userId} domain=${domain} — VERIFIED`);
      await _notifyVerificationSuccess(userId, domain);
      return { ...domainRecord, status: "VERIFIED", verifiedAt: new Date(), dnsResults };
    }
    return { ...domainRecord, dnsResults };
  }

  // Check if verification window has expired
  const windowExpiry = new Date(domainRecord.createdAt);
  windowExpiry.setDate(windowExpiry.getDate() + (domainRecord.verificationWindowDays || VERIFICATION_WINDOW_DAYS));
  if (new Date() > windowExpiry && domainRecord.status === "PENDING_VERIFICATION") {
    const updated = await storage.updateSenderDomainIfPending(id, {
      status: "FAILED",
      updatedAt: new Date(),
    });
    if (updated) {
      await storage.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.DOMAIN_VERIFICATION_FAILED,
        targetType: "sender_domain",
        targetId: id,
        details: { domain, reason: "verification_window_expired", windowDays: domainRecord.verificationWindowDays },
      });
      console.warn(`${logTag} domainId=${id} userId=${userId} domain=${domain} — FAILED (window expired after ${domainRecord.verificationWindowDays}d)`);
      await _notifyVerificationFailed(userId, domain, domainRecord.verificationWindowDays, "verification_window_expired");
      return { ...domainRecord, status: "FAILED", dnsResults };
    }
  }

  console.log(`${logTag} domainId=${id} userId=${userId} domain=${domain} — still pending (ses=${sesStatus}, dkim=${dkimStatus}, dns=${dnsResults.dkimSummary || "unchecked"})`);
  return { ...domainRecord, dnsResults };
}

// ── Domain removal ────────────────────────────────────────────────────────────

export async function removeDomain(domainRecord, userId) {
  const { id, domain } = domainRecord;

  // DB first — orphaned SES identities are harmless (no reputation cost)
  await storage.deleteSenderDomain(id);

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.DOMAIN_REMOVED,
    targetType: "sender_domain",
    targetId: id,
    details: { domain },
  });

  // SES removal — best-effort; don't block on failure
  try {
    await getSesClient().send(new DeleteEmailIdentityCommand({ EmailIdentity: domain }));
    console.log(`[DOMAIN][DELETE] userId=${userId} domain=${domain} — SES identity deleted`);
  } catch (err) {
    if (err.name !== "NotFoundException") {
      console.warn(`[DOMAIN][DELETE] userId=${userId} domain=${domain} — SES delete failed (non-fatal): ${err.message}`);
    }
  }
}

// ── Admin unsuspend ───────────────────────────────────────────────────────────

export async function unsuspendDomain(domainRecord, adminUserId) {
  const { id, domain, userId } = domainRecord;

  // Re-check SES to determine the correct restoration status rather than blindly
  // restoring to VERIFIED. The SES identity may have degraded while suspended.
  let restoredStatus = "PENDING_VERIFICATION";
  let sesReason = "ses_status_unknown";

  try {
    const sesData = await getSesClient().send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
    const sesVerified = sesData.VerifiedForSendingStatus === true;
    const dkimOk = sesData.DkimAttributes?.Status === "SUCCESS";

    if (sesVerified && dkimOk) {
      restoredStatus = "VERIFIED";
      sesReason = "ses_confirmed_verified";
    } else {
      restoredStatus = "PENDING_VERIFICATION";
      sesReason = `ses_not_verified (VerifiedForSending=${sesVerified}, dkim=${sesData.DkimAttributes?.Status})`;
    }
  } catch (err) {
    if (err.name === "NotFoundException") {
      // SES identity was deleted while the domain was suspended.
      // Cannot restore to VERIFIED — the customer must re-register.
      restoredStatus = "FAILED";
      sesReason = "ses_identity_not_found";
    } else {
      throw err;
    }
  }

  const updated = await storage.updateSenderDomain(id, {
    status: restoredStatus,
    suspendedAt: null,
    updatedAt: new Date(),
  });

  await storage.createAuditLog({
    userId: adminUserId,
    action: AUDIT_ACTIONS.DOMAIN_UNSUSPENDED,
    targetType: "sender_domain",
    targetId: id,
    details: { domain, restoredStatus, sesReason, domainOwnerUserId: userId },
  });

  console.log(`[DOMAIN][UNSUSPEND] adminUserId=${adminUserId} domain=${domain} — restored to ${restoredStatus} (${sesReason})`);

  // Notify the domain owner of the restoration
  const owner = await storage.getUserById(userId).catch(() => null);
  if (owner?.email) {
    const appUrl = process.env.APP_URL || "https://repmail.in";
    let subject, body;
    if (restoredStatus === "VERIFIED") {
      subject = `Your RepMail sending domain has been restored — ${domain}`;
      body = `Hi ${owner.username || owner.email},\n\nYour custom sending domain "${domain}" has been restored on RepMail and is active again.\n\nYou can now use it for new campaigns.\n\n${appUrl}/app/domains\n\n— The RepMail Team`;
    } else if (restoredStatus === "PENDING_VERIFICATION") {
      subject = `Your RepMail domain is pending re-verification — ${domain}`;
      body = `Hi ${owner.username || owner.email},\n\nYour custom sending domain "${domain}" has been unsuspended but needs to complete verification.\n\nPlease visit your Domains page to check status.\n\n${appUrl}/app/domains\n\n— The RepMail Team`;
    } else {
      subject = `Action required: RepMail domain needs re-registration — ${domain}`;
      body = `Hi ${owner.username || owner.email},\n\nYour custom sending domain "${domain}" was unsuspended, but the domain identity was no longer found in the sending service.\n\nPlease delete this domain in RepMail and re-register it to restore sending.\n\n${appUrl}/app/domains\n\n— The RepMail Team`;
    }
    sendTransactionalEmail(owner.email, subject, body).catch(err =>
      console.error(`[DOMAIN][UNSUSPEND] Notification email failed userId=${userId} domain=${domain}:`, err.message)
    );
  }

  return updated;
}

// ── Polling job runner ────────────────────────────────────────────────────────

export async function runDomainVerificationPoll() {
  _pollInProgress = true;
  try {
    const pending = await storage.getSenderDomainsByStatus("PENDING_VERIFICATION");
    if (!pending.length) {
      _lastPollCompletedAt = new Date().toISOString();
      return;
    }

    console.log(`[DOMAIN][VERIFY] Polling ${pending.length} pending domain(s)`);
    for (const domain of pending) {
      try {
        await checkDomainVerification(domain, { logTag: "[DOMAIN][VERIFY]" });
      } catch (err) {
        console.error(`[DOMAIN][VERIFY] domainId=${domain.id} domain=${domain.domain} error:`, err.message);
      }
    }
    _lastPollCompletedAt = new Date().toISOString();
  } finally {
    _pollInProgress = false;
  }
}

// ── Internal notification helpers ─────────────────────────────────────────────

async function _notifyVerificationSuccess(userId, domain) {
  const owner = await storage.getUserById(userId).catch(() => null);
  if (!owner?.email) return;
  const appUrl = process.env.APP_URL || "https://repmail.in";
  sendTransactionalEmail(
    owner.email,
    `Your RepMail sending domain is verified — ${domain}`,
    `Hi ${owner.username || owner.email},\n\nGreat news! Your custom sending domain "${domain}" has been verified on RepMail and is ready to use.\n\nYou can now select it when creating a new campaign.\n\n${appUrl}/app/domains\n\n— The RepMail Team`
  ).catch(err =>
    console.error(`[DOMAIN][NOTIFY] Verified email failed userId=${userId} domain=${domain}:`, err.message)
  );
}

async function _notifyVerificationFailed(userId, domain, windowDays, reason) {
  const owner = await storage.getUserById(userId).catch(() => null);
  if (!owner?.email) return;
  const appUrl = process.env.APP_URL || "https://repmail.in";
  const isExpiry = reason === "verification_window_expired";
  sendTransactionalEmail(
    owner.email,
    `RepMail domain verification ${isExpiry ? "expired" : "failed"} — ${domain}`,
    isExpiry
      ? `Hi ${owner.username || owner.email},\n\nThe ${windowDays}-day verification window for your custom sending domain "${domain}" has expired.\n\nTo use this domain, please:\n1. Go to Custom Sending Domains in RepMail\n2. Delete the existing record for ${domain}\n3. Re-register the domain to start a new verification window\n\n${appUrl}/app/domains\n\n— The RepMail Team`
      : `Hi ${owner.username || owner.email},\n\nWe were unable to verify your custom sending domain "${domain}".\n\nPlease delete it in RepMail and re-register to try again.\n\n${appUrl}/app/domains\n\n— The RepMail Team`
  ).catch(err =>
    console.error(`[DOMAIN][NOTIFY] Failed email failed userId=${userId} domain=${domain}:`, err.message)
  );
}
