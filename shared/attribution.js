// M60 — the advertising attribution shape, defined ONCE.
//
// The browser decides what to capture and the server decides what to store,
// and if those two answers ever differ the difference is silent: the client
// sends a field the server drops, or the server accepts a field the client was
// never supposed to collect. Both are the kind of defect that shows up as a
// reporting discrepancy months later, so there is one allowlist and both sides
// import it.
//
// Deliberately dependency-free and browser-free — this module is evaluated
// under Node by the server and by the prerenderer, and bundled into the client.

/**
 * The only parameters ever read from a landing URL or accepted from a client.
 *
 * Google click identifiers first, then the standard UTM set.
 *
 * `gbraid` and `wbraid` are the iOS/app and web-to-app identifiers Google
 * substitutes for `gclid` when ATT restricts it. Omitting them would silently
 * lose a share of iOS traffic that varies with the campaign mix — visible as
 * unattributed customers rather than as an error.
 *
 * An allowlist rather than a blocklist, because the failure it prevents is a
 * campaign URL carrying something that must never be stored. A customer's email
 * address appended to an ad's landing URL is a routine marketing mistake, and a
 * blocklist would have to predict it.
 */
export const ATTRIBUTION_PARAMS = Object.freeze([
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

/**
 * A gclid is ~90 characters; a utm value is a campaign label. 256 is
 * comfortably above every legitimate value and far below anything that could
 * park a payload in storage or in an audit row.
 */
export const MAX_VALUE_LENGTH = 256;

/** ISO-8601 with milliseconds is 24 characters; 64 leaves room and bounds it. */
const MAX_TIMESTAMP_LENGTH = 64;

/**
 * Reduce one touch to the allowlisted fields, or null if it carries none.
 *
 * Returning null for "no attribution parameters" matters: it keeps "arrived
 * with no ad" distinguishable from "arrived with an ad we failed to read", and
 * it stops an object that is merely a landing path from being counted as a
 * touch.
 */
export function sanitizeTouch(touch) {
  if (!touch || typeof touch !== "object") return null;

  const clean = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = touch[key];
    if (typeof value === "string" && value) {
      clean[key] = value.slice(0, MAX_VALUE_LENGTH);
    }
  }
  if (Object.keys(clean).length === 0) return null;

  clean.landingPath =
    typeof touch.landingPath === "string" ? touch.landingPath.slice(0, MAX_VALUE_LENGTH) : "/";
  clean.at = typeof touch.at === "string" ? touch.at.slice(0, MAX_TIMESTAMP_LENGTH) : null;

  return clean;
}

/**
 * Reduce a whole attribution record to what may be stored.
 *
 * Used on BOTH sides for the same reason. In the browser the stored record is
 * re-validated on read, because localStorage is editable by the visitor. On the
 * server the posted body is validated because it arrived over the network, and
 * an audit row is permanent — anything unbounded written into it stays written.
 *
 * `last` falls back to `first` rather than being dropped, so every record has
 * both touches and a report never has to special-case a half-populated row.
 */
export function sanitizeAttribution(record) {
  if (!record || typeof record !== "object") return null;

  const first = sanitizeTouch(record.first);
  if (!first) return null;

  return {
    first,
    last: sanitizeTouch(record.last) || first,
  };
}
