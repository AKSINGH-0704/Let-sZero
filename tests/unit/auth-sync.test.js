// M39 Phase 3 — cross-tab authentication synchronization.
//
// Proves the mechanism that makes login AND logout propagate to every tab. The
// module prefers BroadcastChannel and falls back to a localStorage `storage`
// event; these tests drive the fallback path deterministically (no real second
// tab, no BroadcastChannel timing) by stubbing `window` and forcing
// BroadcastChannel unavailable, and separately assert SSR-safety.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const LS_KEY = "repmail.authEvent.v1";

describe("authSync — cross-tab auth synchronization (storage-fallback path)", () => {
  let mod, storageHandlers, lsStore, origWindow, origBC;

  beforeEach(async () => {
    origWindow = globalThis.window;
    origBC = globalThis.BroadcastChannel;
    globalThis.BroadcastChannel = undefined; // force the storage fallback path
    storageHandlers = new Set();
    lsStore = new Map();
    globalThis.window = {
      addEventListener: (ev, fn) => { if (ev === "storage") storageHandlers.add(fn); },
      removeEventListener: (ev, fn) => { if (ev === "storage") storageHandlers.delete(fn); },
      localStorage: {
        setItem: (k, v) => lsStore.set(k, v),
        getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
        removeItem: (k) => lsStore.delete(k),
      },
    };
    vi.resetModules();
    mod = await import("../../client/src/lib/authSync.js");
    mod._resetAuthSyncForTest();
  });

  afterEach(() => {
    globalThis.window = origWindow;
    globalThis.BroadcastChannel = origBC;
  });

  it("exposes stable event constants", () => {
    expect(mod.AUTH_EVENTS.LOGIN).toBe("login");
    expect(mod.AUTH_EVENTS.LOGOUT).toBe("logout");
  });

  it("broadcastAuth writes a payload another tab can observe", () => {
    mod.broadcastAuth("logout");
    const raw = lsStore.get(LS_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw).type).toBe("logout");
  });

  it("delivers another tab's logout to the subscriber", () => {
    const seen = [];
    const off = mod.subscribeAuth((type) => seen.push(type));
    // Simulate the storage event another tab's broadcast produces.
    for (const fn of storageHandlers) fn({ key: LS_KEY, newValue: JSON.stringify({ type: "logout", ts: Date.now() }) });
    expect(seen).toEqual(["logout"]);
    off();
  });

  it("delivers another tab's login to the subscriber", () => {
    const seen = [];
    mod.subscribeAuth((type) => seen.push(type));
    for (const fn of storageHandlers) fn({ key: LS_KEY, newValue: JSON.stringify({ type: "login", ts: Date.now() }) });
    expect(seen).toEqual(["login"]);
  });

  it("ignores unrelated keys and malformed / unknown payloads", () => {
    const seen = [];
    mod.subscribeAuth((t) => seen.push(t));
    for (const fn of storageHandlers) {
      fn({ key: "unrelated", newValue: JSON.stringify({ type: "logout" }) });
      fn({ key: LS_KEY, newValue: "not-json{" });
      fn({ key: LS_KEY, newValue: JSON.stringify({ type: "bogus" }) });
      fn({ key: LS_KEY, newValue: null });
    }
    expect(seen).toEqual([]);
  });

  it("unsubscribe stops further delivery", () => {
    const seen = [];
    const off = mod.subscribeAuth((t) => seen.push(t));
    off();
    for (const fn of storageHandlers) fn({ key: LS_KEY, newValue: JSON.stringify({ type: "logout" }) });
    expect(seen).toEqual([]);
  });
});

describe("authSync — SSR / prerender safety", () => {
  it("no-ops without a window and returns a no-op unsubscribe", async () => {
    const origWindow = globalThis.window;
    globalThis.window = undefined;
    vi.resetModules();
    const ssr = await import("../../client/src/lib/authSync.js");
    expect(() => ssr.broadcastAuth("login")).not.toThrow();
    const off = ssr.subscribeAuth(() => {});
    expect(typeof off).toBe("function");
    expect(() => off()).not.toThrow();
    globalThis.window = origWindow;
  });
});
