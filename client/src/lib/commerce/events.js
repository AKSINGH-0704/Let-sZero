// M39 Phase 1C — commerce analytics/event extension points.
//
// A lightweight, dependency-free seam so future commerce analytics (funnel
// tracking, conversion events, A/B instrumentation) can observe the purchase
// lifecycle WITHOUT the commerce layer taking a hard dependency on any analytics
// SDK. Phase 1C deliberately ships NO analytics implementation — only the seam.
// Until something subscribes, every emit is a no-op.
//
// Design constraints:
//  - Pure module, SSR/prerender safe (no window, no timers at import).
//  - A throwing subscriber can never break a purchase: emit swallows handler errors.
//  - Unit-testable without a DOM.

/** Canonical event names. Kept as constants so call sites and subscribers agree. */
export const CommerceEvents = Object.freeze({
  QUOTE_REQUESTED: "commerce.quote.requested",
  QUOTE_RECEIVED: "commerce.quote.received",
  CHECKOUT_STARTED: "commerce.checkout.started",
  INTENT_SAVED: "commerce.intent.saved",
  INTENT_RESUMED: "commerce.intent.resumed",
  INTENT_CLEARED: "commerce.intent.cleared",
});

const handlers = new Set();

/**
 * Subscribe to commerce events. Returns an unsubscribe function.
 * @param {(event: { name: string, payload: object, ts: number }) => void} fn
 * @returns {() => void}
 */
export function onCommerceEvent(fn) {
  if (typeof fn !== "function") return () => {};
  handlers.add(fn);
  return () => handlers.delete(fn);
}

/**
 * Emit a commerce event to all subscribers. A no-op when nothing is subscribed.
 * Never throws — a faulty subscriber must not break checkout.
 * @param {string} name  one of CommerceEvents
 * @param {object} [payload]
 */
export function emitCommerceEvent(name, payload = {}) {
  if (handlers.size === 0) return;
  const event = { name, payload, ts: Date.now() };
  for (const fn of handlers) {
    try { fn(event); } catch { /* a subscriber's failure is never the purchase's problem */ }
  }
}

/** Test/teardown helper — drop all subscribers. */
export function _resetCommerceEventHandlers() {
  handlers.clear();
}
