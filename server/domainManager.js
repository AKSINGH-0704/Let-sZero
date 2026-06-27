/**
 * Domain Manager — M9 Custom Sending Domains
 * ============================================
 * Handles domain registration, SES identity management, verification polling,
 * and domain-level validation. All business logic for sender domains lives here;
 * routes.js calls these functions and handles HTTP framing.
 *
 * AWS Easy DKIM: SES manages DKIM key pairs automatically. Customers add 3 CNAME
 * records (provided by SES) + 1 TXT ownership record. No per-message DKIM injection
 * needed — SES signs automatically for verified identities.
 */

import { SESv2Client, CreateEmailIdentityCommand, GetEmailIdentityCommand, DeleteEmailIdentityCommand } from "@aws-sdk/client-sesv2";
import { resolveTxt, resolveCname } from "dns/promises";
import { storage } from "./storage.js";
import { AUDIT_ACTIONS } from "../shared/schema.js";

const VERIFICATION_WINDOW_DAYS = parseInt(process.env.DOMAIN_VERIFICATION_WINDOW_DAYS || "14", 10);

// Plans allowed to use custom sending domains
const DOMAIN_ELIGIBLE_PLANS = ["starter", "growth", "scale", "enterprise"];

let ses = null;
function getSesClient() {
  if (!ses) {
    ses = new SESv2Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return ses;
}

// ── Domain normalisation ──────────────────────────────────────────────────────

export function normalizeDomain(input) {
  if (!input || typeof input !== "string") throw new Error("Domain is required");
  const trimmed = input.trim().toLowerCase();

  // Reject obviously invalid inputs before URL parsing
  if (!trimmed || trimmed.includes(" ")) throw new Error("Invalid domain");

  // Use URL constructor to parse and validate structure
  let hostname;
  try {
    const url = new URL(`https://${trimmed}`);
    hostname = url.hostname;
  } catch {
    throw new Error("Invalid domain format");
  }

  // Strip trailing dots (some DNS tools append them)
  hostname = hostname.replace(/\.+$/, "");

  // Reject bare IPs — domains must have at least one dot and a TLD
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) throw new Error("IP addresses are not valid sending domains");

  // Reject reserved/local names
  const reserved = ["localhost", "local", "internal", "example", "test", "invalid"];
  const parts = hostname.split(".");
  if (parts.length < 2) throw new Error("Domain must include a TLD");
  if (reserved.includes(parts[parts.length - 1])) throw new Error("Reserved TLD not allowed");
  if (reserved.includes(hostname)) throw new Error("Reserved domain not allowed");

  return hostname;
}

export function validateFromEmail(email, domain) {
  if (!email || typeof email !== "string") throw new Error("From email is required");
  const trimmed = email.trim().toLowerCase();

  const atIdx = trimmed.lastIndexOf("@");
  if (atIdx < 1) throw new Error("Invalid email format");

  const localPart = trimmed.slice(0, atIdx);
  const emailDomain = trimmed.slice(atIdx + 1);

  if (!localPart || !emailDomain) throw new Error("Invalid email format");
  if (emailDomain !== domain) throw new Error(`From email must use the domain @${domain}`);

  // Reject control characters and header-injection sequences
  if (/[\r\n<>"]/.test(trimmed)) throw new Error("Invalid characters in email address");

  return trimmed;
}

// ── Plan gate ─────────────────────────────────────────────────────────────────

export function assertDomainEligible(user) {
  if (!DOMAIN_ELIGIBLE_PLANS.includes(user.plan?.toLowerCase())) {
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
      console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — returning existing PENDING record`);
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
      // Delete existing FAILED record — fresh start
      console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — deleting FAILED record for fresh start`);
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

  // SES: check if identity exists before creating (idempotency for SES side)
  let sesData = null;
  try {
    sesData = await getSesClient().send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
    console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — SES identity already exists, reusing`);
  } catch (err) {
    if (err.name !== "NotFoundException") throw err;
    // Not found — create it
    sesData = await getSesClient().send(new CreateEmailIdentityCommand({
      EmailIdentity: domain,
      // SigningAttributesOrigin: "AWS_SES" is required when DkimSigningAttributes is provided.
      // NextSigningKeyLength specifies RSA-2048 keys (SES manages key rotation automatically).
      DkimSigningAttributes: { SigningAttributesOrigin: "AWS_SES", NextSigningKeyLength: "RSA_2048_BIT" },
    }));
    console.log(`[DOMAIN][REGISTER] userId=${userId} domain=${domain} — SES identity created`);
  }

  // Extract DKIM CNAME records from SES response
  const dkimAttrs = sesData.DkimAttributes || {};
  const dkimTokens = (dkimAttrs.Tokens || []).map(token => ({
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    type: "CNAME",
  }));

  // Ownership proof TXT record (proves the user owns the domain in RepMail context)
  const verifyRecord = {
    name: `_repmail-verify.${domain}`,
    value: `repmail-verify=${userId}`,
    type: "TXT",
  };

  const senderDomain = await storage.createSenderDomain({
    userId,
    domain,
    fromEmail,
    status: "PENDING_VERIFICATION",
    dkimTokens,
    verifyRecord,
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
      // SES identity was deleted externally — cannot verify or send. Fail immediately.
      console.warn(`${logTag} domain=${domain} — SES identity no longer exists; marking FAILED`);
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
      }
      return { ...domainRecord, status: "FAILED" };
    } else if (err.name === "ThrottlingException") {
      console.warn(`${logTag} domain=${domain} — SES ThrottlingException, skipping this cycle`);
      return domainRecord; // return unchanged
    } else {
      throw err;
    }
  }

  // DNS-level diagnostics for DKIM (informational, does not block verification)
  const dnsResults = {};
  if (domainRecord.dkimTokens && Array.isArray(domainRecord.dkimTokens)) {
    for (const record of domainRecord.dkimTokens.slice(0, 1)) {
      try {
        await resolveCname(record.name);
        dnsResults.dkim = "RESOLVED";
      } catch {
        dnsResults.dkim = "NOT_RESOLVED";
      }
      break;
    }
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
      console.log(`${logTag} domain=${domain} — VERIFIED`);
      return { ...domainRecord, status: "VERIFIED", verifiedAt: new Date() };
    }
    // Already VERIFIED — no update needed
    return domainRecord;
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
      console.warn(`${logTag} domain=${domain} — FAILED (window expired)`);
      return { ...domainRecord, status: "FAILED" };
    }
  }

  console.log(`${logTag} domain=${domain} — still pending (ses=${sesStatus}, dkim=${dkimStatus})`);
  return domainRecord;
}

// ── Domain removal ────────────────────────────────────────────────────────────

export async function removeDomain(domainRecord, userId) {
  const { id, domain } = domainRecord;

  // DB first — orphaned SES identities are harmless (they have no reputation cost)
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

// ── Polling job runner ────────────────────────────────────────────────────────

export async function runDomainVerificationPoll() {
  const pending = await storage.getSenderDomainsByStatus("PENDING_VERIFICATION");
  if (!pending.length) return;

  console.log(`[DOMAIN][VERIFY] Polling ${pending.length} pending domain(s)`);
  for (const domain of pending) {
    try {
      await checkDomainVerification(domain, { logTag: "[DOMAIN][VERIFY]" });
    } catch (err) {
      console.error(`[DOMAIN][VERIFY] domain=${domain.domain} error:`, err.message);
    }
  }
}
