// M39 Phase 3 — cross-tab authentication synchronization.
//
// Root cause of "login syncs across tabs, logout does not": auth state is a single
// React Query `["/api/auth/me"]` query with `staleTime: Infinity`, and login/logout
// only mutated the LOCAL tab's cache. There was no cross-tab signal at all — and
// with `staleTime: Infinity`, even `refetchOnWindowFocus` won't re-validate. So a
// second tab kept its stale authenticated (or anonymous) view until something
// happened to refetch it. This is a synchronization-model gap, not a logout bug:
// the fix is one mechanism that propagates BOTH transitions to every tab.
//
// Mechanism: BroadcastChannel (instant, same-origin, does not echo to the sender),
// with a localStorage `storage`-event fallback for older browsers (also fires only
// in OTHER tabs). Pure and SSR/prerender-safe — every entry point no-ops when there
// is no `window`.

const CHANNEL_NAME = "repmail.auth.v1";
const LS_KEY = "repmail.authEvent.v1";

export const AUTH_EVENTS = Object.freeze({ LOGIN: "login", LOGOUT: "logout" });

function hasWindow() {
  return typeof window !== "undefined";
}

let _bc = null;
function channel() {
  if (!hasWindow() || typeof BroadcastChannel === "undefined") return null;
  if (_bc === null) {
    try { _bc = new BroadcastChannel(CHANNEL_NAME); } catch { _bc = false; }
  }
  return _bc || null;
}

/**
 * Announce an auth transition to every other tab in this browser.
 * @param {"login"|"logout"} type
 */
export function broadcastAuth(type) {
  if (!hasWindow()) return;
  const msg = { type, ts: Date.now() };
  const ch = channel();
  if (ch) {
    try { ch.postMessage(msg); return; } catch { /* fall through to storage */ }
  }
  // Fallback: a storage write fires a `storage` event in OTHER tabs (never the writer).
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(msg)); } catch { /* ignore */ }
}

/**
 * Subscribe to auth transitions broadcast by other tabs. Returns an unsubscribe fn.
 * The handler is called with the event type ("login" | "logout"). Never fires for
 * this tab's own broadcastAuth() call.
 * @param {(type: string, msg: object) => void} handler
 * @returns {() => void}
 */
export function subscribeAuth(handler) {
  if (!hasWindow() || typeof handler !== "function") return () => {};

  const ch = channel();
  const onMessage = (e) => {
    const d = e?.data;
    if (d && (d.type === AUTH_EVENTS.LOGIN || d.type === AUTH_EVENTS.LOGOUT)) handler(d.type, d);
  };
  const onStorage = (e) => {
    if (e?.key !== LS_KEY || !e.newValue) return;
    try {
      const d = JSON.parse(e.newValue);
      if (d && (d.type === AUTH_EVENTS.LOGIN || d.type === AUTH_EVENTS.LOGOUT)) handler(d.type, d);
    } catch { /* ignore malformed */ }
  };

  if (ch) ch.addEventListener("message", onMessage);
  // The storage listener is always attached: it is the fallback when BroadcastChannel
  // is unavailable, and harmless otherwise (broadcastAuth uses only one channel).
  window.addEventListener("storage", onStorage);

  return () => {
    if (ch) ch.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}

/** Test-only: drop the cached BroadcastChannel so a suite can re-derive it. */
export function _resetAuthSyncForTest() {
  if (_bc && typeof _bc.close === "function") { try { _bc.close(); } catch { /* ignore */ } }
  _bc = null;
}
