/**
 * domainUtils.js — Pure validation functions for custom sending domains.
 *
 * No imports, no side effects, no external dependencies.
 * Isolated here so they can be unit-tested without mocking SES, storage, or email.
 */

export function normalizeDomain(input) {
  if (!input || typeof input !== "string") throw new Error("Domain is required");
  const trimmed = input.trim().toLowerCase();

  if (!trimmed || trimmed.includes(" ")) throw new Error("Invalid domain");

  // Reject non-ASCII characters before URL parsing.
  // The WHATWG URL standard converts IDN labels to Punycode rather than rejecting them,
  // so a Cyrillic lookalike domain (e.g. аcme.com) would pass through as its Punycode
  // equivalent — creating a SES identity for a domain the customer doesn't own or intend.
  // Failing fast here gives an immediate error instead of a 14-day verification timeout.
  if (/[^\x00-\x7F]/.test(trimmed)) {
    throw new Error("Domain must contain only ASCII characters — international domain names are not supported");
  }

  let hostname;
  try {
    const url = new URL(`https://${trimmed}`);
    hostname = url.hostname;
  } catch {
    throw new Error("Invalid domain format");
  }

  hostname = hostname.replace(/\.+$/, "");

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    throw new Error("IP addresses are not valid sending domains");
  }

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

  // Reject control characters and header-injection sequences.
  if (/[\r\n<>"]/.test(trimmed)) throw new Error("Invalid characters in email address");

  return trimmed;
}
