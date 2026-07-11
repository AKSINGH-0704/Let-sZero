// Centralized customer-facing error parsing (Activation/Monetization/Error-Experience
// program). Previously err.message was the raw HTTP response body text — about half
// of the app's ~20 mutation error handlers remembered to JSON.parse it before display
// and about half didn't, so a wrong password on Login rendered the literal string
// {"message":"Invalid credentials"}. apiRequest/throwIfResNotOk (client/src/lib/
// queryClient.js) now guarantee err.message is always a clean, plain-language string,
// with the full structured body (rowErrors, validationErrors, etc.) available on
// err.body for callers that need it. This test exercises that contract directly
// against a mocked fetch, without needing a DOM/React render.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("apiRequest — centralized error parsing", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("throws a clean, plain-language message from a JSON { message } error body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ message: "Invalid credentials" }),
    });
    const { apiRequest } = await import("../../client/src/lib/queryClient.js");

    await expect(apiRequest("POST", "/api/auth/login", { username: "x", password: "y" }))
      .rejects.toMatchObject({ message: "Invalid credentials", status: 401 });
  });

  it("never leaks raw JSON text as the error message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({ message: "Free trial credits have already been claimed." }),
    });
    const { apiRequest } = await import("../../client/src/lib/queryClient.js");

    try {
      await apiRequest("POST", "/api/payments/initiate", { planId: "trial" });
      throw new Error("expected apiRequest to reject");
    } catch (err) {
      expect(err.message).toBe("Free trial credits have already been claimed.");
      expect(err.message.startsWith("{")).toBe(false);
    }
  });

  it("falls back to the { error } field when { message } is absent (MAINT-002 shape drift)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => JSON.stringify({ error: "PLAN_LIMIT" }),
    });
    const { apiRequest } = await import("../../client/src/lib/queryClient.js");

    await expect(apiRequest("POST", "/api/users", {})).rejects.toMatchObject({ message: "PLAN_LIMIT" });
  });

  it("degrades gracefully for a non-JSON response body instead of throwing a parse error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      text: async () => "<html><body>502 Bad Gateway</body></html>",
    });
    const { apiRequest } = await import("../../client/src/lib/queryClient.js");

    try {
      await apiRequest("GET", "/api/health");
      throw new Error("expected apiRequest to reject");
    } catch (err) {
      // Not a hard requirement that it strip the HTML — the requirement is that it
      // never throws while trying to parse, and body is null (no structured payload).
      expect(err.body).toBeNull();
      expect(typeof err.message).toBe("string");
    }
  });

  it("exposes the full structured body on err.body for callers that need more than the message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({
        message: "No valid email addresses found in the import file.",
        rowErrors: [{ row: 2, value: "not-an-email", reason: "Invalid email format" }],
        totalRows: 5,
        failedRows: 1,
      }),
    });
    const { apiRequest } = await import("../../client/src/lib/queryClient.js");

    try {
      await apiRequest("POST", "/api/contact-lists/abc/import", { rows: [] });
      throw new Error("expected apiRequest to reject");
    } catch (err) {
      expect(err.message).toBe("No valid email addresses found in the import file.");
      expect(err.body.rowErrors).toHaveLength(1);
      expect(err.body.rowErrors[0].reason).toBe("Invalid email format");
    }
  });

  it("does not throw on a successful (ok) response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    const { apiRequest } = await import("../../client/src/lib/queryClient.js");

    const res = await apiRequest("GET", "/api/health");
    expect(res.ok).toBe(true);
  });
});
