// M57 — the ownership transfer confirmation, ACTUALLY RENDERED.
//
// Every claim on this screen is a claim about somebody's money and access, and
// each must match what the transaction (Audit 220) really does. The three that
// must never drift: AutoPay is removed, the subscription is untouched, and the
// sending domains follow the workspace.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, Summary;
const normalise = (m) => m.replace(/<!--\s*-->/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
const html = (props) => normalise(renderToString(React.createElement(Summary, props)));

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  Summary = (await vite.ssrLoadModule("/src/components/teams/OwnershipTransferSummary.jsx")).default;
}, 60000);
afterAll(async () => { await vite?.close(); });

describe("the customer is told what changes", () => {
  it("names the person who will own the workspace", () => {
    expect(html({ newOwnerName: "Ravi" })).toMatch(/Ravi becomes the workspace owner/);
  });

  it("falls back to a grammatical sentence when nobody is chosen yet", () => {
    const h = html({});
    expect(h).toMatch(/This person becomes the workspace owner/);
    expect(h).not.toMatch(/undefined|null/);
    expect(h).not.toMatch(/They becomes/);
  });

  it("states plainly that AutoPay and the saved card are removed", () => {
    // The most surprising consequence, and the one a customer would otherwise
    // discover at a renewal that did not happen.
    const h = html({ newOwnerName: "Ravi" });
    expect(h).toMatch(/Automatic renewal is switched off/i);
    expect(h).toMatch(/saved payment method is removed/i);
    expect(h).toMatch(/never charged for a workspace you no longer own/i);
  });

  it("says the outgoing owner keeps access as a member", () => {
    expect(html({ newOwnerName: "Ravi" })).toMatch(/regular member/i);
  });
});

describe("the customer is told what does NOT change", () => {
  it("promises the subscription, seats, renewal date and amount are untouched", () => {
    expect(html({ newOwnerName: "Ravi" })).toMatch(/subscription, seats, renewal date and amount/i);
  });

  it("promises sending keeps working — the defect M56 fixed", () => {
    // If the domains did not follow the root, this sentence would be a lie and
    // every member's sending would break. Pinned here so the copy and the
    // transaction cannot drift apart.
    expect(html({ newOwnerName: "Ravi" })).toMatch(/verified sending domains/i);
  });

  it("promises credits and billing history are kept", () => {
    const h = html({ newOwnerName: "Ravi" });
    expect(h).toMatch(/credits stay yours/i);
    expect(h).toMatch(/Billing history and receipts are kept/i);
  });
});

describe("the customer is warned about recovery", () => {
  it("says only the new owner can transfer it back", () => {
    expect(html({ newOwnerName: "Ravi" })).toMatch(/Only the new owner can transfer the workspace back/i);
  });
});

describe("it never leaks internal vocabulary", () => {
  it("uses no engineering or gateway terms", () => {
    const h = html({ newOwnerName: "Ravi" });
    for (const leak of [/mandate/i, /\btoken\b/i, /gateway/i, /razorpay/i, /parentId/i, /rootId/i, /workspaceRootId/i, /AutoPay/]) {
      expect(h, `leaked: ${leak}`).not.toMatch(leak);
    }
  });
});
