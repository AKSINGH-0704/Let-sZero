import { describe, it, expect } from "vitest";
import { normalizeDomain, validateFromEmail } from "../../shared/domainUtils.js";

// ── normalizeDomain ───────────────────────────────────────────────────────────

describe("normalizeDomain", () => {
  it("accepts a plain domain", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
  });

  it("trims whitespace and lowercases", () => {
    expect(normalizeDomain("  ACME.COM  ")).toBe("acme.com");
  });

  it("strips trailing dots", () => {
    expect(normalizeDomain("example.com.")).toBe("example.com");
  });

  it("accepts a subdomain", () => {
    expect(normalizeDomain("mail.acme.com")).toBe("mail.acme.com");
  });

  it("rejects empty input", () => {
    expect(() => normalizeDomain("")).toThrow("Domain is required");
  });

  it("rejects null input", () => {
    expect(() => normalizeDomain(null)).toThrow("Domain is required");
  });

  it("rejects input with spaces", () => {
    expect(() => normalizeDomain("my domain.com")).toThrow("Invalid domain");
  });

  it("rejects non-ASCII / IDN homoglyph domains (DOM-010)", () => {
    // Cyrillic 'а' looks identical to Latin 'a' — must be caught before URL parsing
    // which would silently convert it to Punycode instead of rejecting it.
    expect(() => normalizeDomain("аcme.com")).toThrow("ASCII");
  });

  it("rejects IP addresses", () => {
    expect(() => normalizeDomain("192.168.1.1")).toThrow("IP addresses");
  });

  it("rejects bare hostname without TLD", () => {
    expect(() => normalizeDomain("localhost")).toThrow();
  });

  it("rejects reserved TLD 'test'", () => {
    expect(() => normalizeDomain("example.test")).toThrow("Reserved TLD");
  });

  it("rejects reserved TLD 'localhost'", () => {
    expect(() => normalizeDomain("app.localhost")).toThrow("Reserved TLD");
  });
});

// ── validateFromEmail ─────────────────────────────────────────────────────────

describe("validateFromEmail", () => {
  it("accepts a matching from email", () => {
    expect(validateFromEmail("hello@acme.com", "acme.com")).toBe("hello@acme.com");
  });

  it("lowercases and trims the email", () => {
    expect(validateFromEmail("  HELLO@ACME.COM  ", "acme.com")).toBe("hello@acme.com");
  });

  it("rejects a mismatched domain", () => {
    expect(() => validateFromEmail("hello@other.com", "acme.com")).toThrow("@acme.com");
  });

  it("rejects an email without @", () => {
    expect(() => validateFromEmail("notanemail", "acme.com")).toThrow("Invalid email format");
  });

  it("rejects an email with header-injection characters", () => {
    expect(() => validateFromEmail("hello\r\n@acme.com", "acme.com")).toThrow("Invalid characters");
  });

  it("rejects empty input", () => {
    expect(() => validateFromEmail("", "acme.com")).toThrow("From email is required");
  });
});
