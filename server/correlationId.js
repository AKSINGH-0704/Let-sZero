// M39 Phase 5 — request correlation IDs (observability on critical paths).
//
// Before Phase 5 there was no per-request identifier anywhere: a log line or a
// Sentry event could not be tied back to the specific request that produced it,
// and a customer report ("payment X failed at 14:03") could not be traced across
// the initiate → webhook → fulfillment path. This middleware assigns one stable id
// per request, echoes it to the client (so a support ticket can quote it), and —
// wired in index.js — tags the Sentry scope so every captured error carries it.
//
// Trust boundary: an inbound id is accepted only if it looks like a safe token
// (so an attacker cannot inject newlines/control chars into our logs — log
// forging); otherwise a fresh UUID is generated. Pure and unit-testable.

import crypto from "crypto";

export const REQUEST_ID_HEADER = "x-request-id";
const SAFE_ID = /^[A-Za-z0-9_.-]{1,128}$/;

/** Return a safe correlation id for this request: a sanitised inbound one, else a new UUID. */
export function resolveRequestId(req) {
  const incoming = req.headers?.[REQUEST_ID_HEADER] || req.headers?.["x-correlation-id"];
  if (typeof incoming === "string" && SAFE_ID.test(incoming)) return incoming;
  return crypto.randomUUID();
}

/** Express middleware: attach req.id and echo the id back on the response. */
export function correlationId(req, res, next) {
  const id = resolveRequestId(req);
  req.id = id;
  try { res.setHeader(REQUEST_ID_HEADER, id); } catch { /* headers may already be sent in rare paths */ }
  next();
}
