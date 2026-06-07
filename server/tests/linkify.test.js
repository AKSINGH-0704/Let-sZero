// Tests for server/linkify.js
// Run with: node --test server/tests/linkify.test.js
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { linkifyUrls } from "../linkify.js";

// ── Single URLs ───────────────────────────────────────────────────────────────

test("https URL becomes anchor", () => {
  const out = linkifyUrls("Visit https://example.com today");
  assert.ok(out.includes('<a href="https://example.com"'), out);
  assert.ok(out.includes(">https://example.com</a>"), out);
  assert.ok(out.startsWith("Visit "), out);
  assert.ok(out.endsWith(" today"), out);
});

test("http URL becomes anchor", () => {
  const out = linkifyUrls("See http://example.com for details");
  assert.ok(out.includes('<a href="http://example.com"'), out);
});

test("bare www URL gets https:// prefix in href", () => {
  const out = linkifyUrls("Go to www.example.com now");
  assert.ok(out.includes('<a href="https://www.example.com"'), out);
  assert.ok(out.includes(">www.example.com</a>"), out);
});

// ── Multiple URLs ─────────────────────────────────────────────────────────────

test("multiple URLs in one string are all linkified", () => {
  const out = linkifyUrls("First https://a.com and then https://b.com ok");
  assert.ok(out.includes('<a href="https://a.com"'), out);
  assert.ok(out.includes('<a href="https://b.com"'), out);
  // Surrounding text preserved
  assert.ok(out.startsWith("First "), out);
  assert.ok(out.endsWith(" ok"), out);
});

test("www and https in same string both linkified", () => {
  const out = linkifyUrls("See www.foo.com or https://bar.com");
  assert.ok(out.includes('<a href="https://www.foo.com"'), out);
  assert.ok(out.includes('<a href="https://bar.com"'), out);
});

// ── URLs inside paragraphs ────────────────────────────────────────────────────

test("URL mid-sentence: surrounding text is preserved exactly", () => {
  const out = linkifyUrls("Please check https://example.com/page for more info.");
  assert.ok(out.startsWith("Please check "), out);
  // URL is followed by a space, not punctuation — the period belongs to the sentence end
  assert.ok(out.includes(">https://example.com/page</a> for more info."), out);
});

test("URL with path and query string is fully captured", () => {
  const out = linkifyUrls("Results: https://example.com/search?q=hello&page=2");
  assert.ok(out.includes('<a href="https://example.com/search?q=hello&page=2"'), out);
  assert.ok(out.includes(">https://example.com/search?q=hello&page=2</a>"), out);
});

test("URL with hash fragment is fully captured", () => {
  const out = linkifyUrls("Jump to https://example.com/docs#section");
  assert.ok(out.includes('<a href="https://example.com/docs#section"'), out);
});

// ── URLs next to punctuation ─────────────────────────────────────────────────

test("trailing period is stripped from URL and placed after </a>", () => {
  const out = linkifyUrls("Visit https://example.com.");
  assert.ok(out.includes('<a href="https://example.com"'), out);
  assert.ok(out.endsWith("</a>."), out);
});

test("trailing comma is stripped from URL and placed after </a>", () => {
  const out = linkifyUrls("See https://a.com, then https://b.com.");
  assert.ok(out.includes(">https://a.com</a>,"), out);
  assert.ok(out.includes(">https://b.com</a>."), out);
});

test("trailing semicolon is stripped", () => {
  const out = linkifyUrls("Link: https://example.com;");
  assert.ok(out.includes("</a>;"), out);
  assert.ok(!out.includes('<a href="https://example.com;"'), out);
});

test("trailing closing parenthesis is stripped", () => {
  const out = linkifyUrls("(see https://example.com)");
  assert.ok(out.includes("</a>)"), out);
  assert.ok(!out.includes('<a href="https://example.com)"'), out);
});

test("trailing exclamation mark is stripped", () => {
  const out = linkifyUrls("Check https://example.com!");
  assert.ok(out.includes("</a>!"), out);
});

// ── No-op cases ───────────────────────────────────────────────────────────────

test("plain text with no URLs is returned unchanged", () => {
  const text = "Hello, how are you doing today?";
  assert.equal(linkifyUrls(text), text);
});

test("empty string returns empty string", () => {
  assert.equal(linkifyUrls(""), "");
});

test("anchor tags have correct rel and target attributes", () => {
  const out = linkifyUrls("https://example.com");
  assert.ok(out.includes('target="_blank"'), out);
  assert.ok(out.includes('rel="noopener noreferrer"'), out);
});
