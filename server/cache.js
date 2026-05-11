/**
 * In-Memory Cache — Redis-swappable interface
 * ============================================
 * Keyed by SHA-256 hash of inputs. 1-hour TTL.
 * To swap in Redis: replace get/set/makeKey with ioredis equivalents;
 * the rest of the codebase stays unchanged.
 */

import crypto from "crypto";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const _store = new Map();

/**
 * Build a deterministic cache key from any number of string parts.
 * Parts are joined with a null-byte separator before hashing.
 */
export function makeKey(...parts) {
  return crypto.createHash("sha256").update(parts.join("\x00")).digest("hex");
}

export function get(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _store.delete(key);
    return null;
  }
  return entry.data;
}

export function set(key, data) {
  _store.set(key, { data, ts: Date.now() });
}

export function stats() {
  return { size: _store.size, ttlMs: CACHE_TTL_MS };
}
