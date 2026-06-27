import { randomBytes, createHash } from "crypto";

// 22-char base64url string — 128 bits of cryptographically secure randomness.
// Collision probability is negligible for any realistic deployment scale (< 10^-21
// at 10^9 simultaneous tokens).
export function generateTrackingToken() {
  return randomBytes(16).toString("base64url");
}

// Token format validation — 22-char base64url, checked before any DB lookup.
export const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

// Hardcoded 1×1 transparent GIF (35 bytes) — never read from disk.
// Cache-Control: no-store headers prevent caching; this buffer is reused per-request.
export const TRACKING_PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// SHA-256 of IP address with a salt — stores a non-reversible hash, never the raw IP.
// IP_HASH_SALT env var should be set to a random secret in production; default is a
// fixed string that prevents rainbow-table attacks while making the hash deterministic.
export function hashIp(ip) {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || "repmail-tracking-v1";
  return createHash("sha256").update(ip + salt).digest("hex");
}

// Same URL_RE as server/linkify.js — must stay synchronised with linkifyUrls().
// Identifies all distinct trackable URLs in a plain-text template body so that
// tokens can be generated before the campaign loop begins.
const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[a-zA-Z0-9][^\s<>"']*)/gi;
const TRAILING_RE = /[.,;:!?)\]]+$/;

export function extractTemplateLinks(templateBody) {
  const links = new Set();
  const trackBaseUrl = process.env.TRACK_BASE_URL || "";
  const trackingPrefix = trackBaseUrl ? trackBaseUrl + "/t/" : null;

  let m;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(templateBody)) !== null) {
    const raw = m[0].replace(TRAILING_RE, "");
    const href = raw.startsWith("www.") ? `https://${raw}` : raw;
    // Never create a token for a URL that is itself a tracking endpoint
    if (trackingPrefix && href.startsWith(trackingPrefix)) continue;
    links.add(href);
  }
  return [...links];
}
