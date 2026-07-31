// TRUST-014 regression — the sending identity belongs to the WORKSPACE.
//
// Found in live production validation: an invited member saw two "Preview Mode —
// add a verified sending domain" banners and was routed to /app/onboarding, a
// setup only the workspace owner can perform and which members must never do.
//
// The server was already right. `hasVerifiedDomainForUser` and
// `getVerifiedDomainForUser` both resolve to the workspace root, and the send path
// enforces against that. The CLIENT had no way to ask the same question, so four
// surfaces asked `user.sendingIdentityType` — a column set only on the account
// that registered the domain, and therefore null for every invited member.
//
// These tests pin the workspace-authoritative answer at its source, so a client
// reading the per-user column again would have nothing correct to read.

import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "../../server/storage.js";
import { getSenderHealthReport } from "../../server/senderAuth.js";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const rand = () => Math.random().toString(36).slice(2);

async function makeUser(overrides = {}) {
  const u = await storage.createUser({
    username: `u_${rand()}`, email: `${rand()}@example.com`,
    password: "x".repeat(20), creditsReceived: 1000, emailVerified: true,
    ...overrides,
  });
  await storage.updateUser(u.id, { senderName: "Test Sender" });
  return storage.getUserById(u.id);
}

/** Owner + one member, with a VERIFIED domain owned by the workspace root. */
async function workspaceWithDomain() {
  const owner = await makeUser();
  await storage.createSenderDomain({
    userId: owner.id, domain: `${rand()}.example.com`,
    fromEmail: "campaigns@example.com", status: "VERIFIED",
  });
  const member = await makeUser({ parentId: owner.id, role: "USER" });
  return { owner, member };
}

describe("the workspace owns the sending identity", () => {
  it("a member inherits the workspace's verified domain", async () => {
    const { member } = await workspaceWithDomain();
    expect(await storage.hasVerifiedDomainForUser(member.id)).toBe(true);
  });

  it("...even though the member's own identity column is unset", async () => {
    // This is the exact discrepancy the client was reading. The member has no
    // sendingIdentityType and never will — and can still send.
    const { member } = await workspaceWithDomain();
    expect(member.sendingIdentityType == null).toBe(true);
    expect(await storage.hasVerifiedDomainForUser(member.id)).toBe(true);
  });

  it("a member of a workspace with NO domain correctly has none", async () => {
    const owner = await makeUser();
    const member = await makeUser({ parentId: owner.id, role: "USER" });
    expect(await storage.hasVerifiedDomainForUser(member.id)).toBe(false);
  });

  it("does not leak another workspace's domain", async () => {
    const { member } = await workspaceWithDomain();   // has a domain
    const outsider = await makeUser();                // separate workspace, none
    expect(await storage.hasVerifiedDomainForUser(member.id)).toBe(true);
    expect(await storage.hasVerifiedDomainForUser(outsider.id)).toBe(false);
  });

  it("an unverified workspace domain does not count", async () => {
    const owner = await makeUser();
    await storage.createSenderDomain({
      userId: owner.id, domain: `${rand()}.example.com`,
      fromEmail: "campaigns@example.com", status: "PENDING",
    });
    const member = await makeUser({ parentId: owner.id, role: "USER" });
    expect(await storage.hasVerifiedDomainForUser(member.id)).toBe(false);
  });
});

describe("sender health projects the workspace answer to the client", () => {
  it("reports workspaceHasVerifiedDomain: true for an inheriting member", async () => {
    const { member } = await workspaceWithDomain();
    const report = await getSenderHealthReport(member);
    expect(report.identity.workspaceHasVerifiedDomain).toBe(true);
  });

  it("distinguishes the workspace answer from the per-user column", async () => {
    // The field the client used to read stays null; the field it must read is true.
    // If these ever collapse into one value the defect is back.
    const { member } = await workspaceWithDomain();
    const report = await getSenderHealthReport(member);
    expect(report.identity.sendingIdentityType).toBeNull();
    expect(report.identity.workspaceHasVerifiedDomain).toBe(true);
  });

  it("reports false when the workspace genuinely has no verified domain", async () => {
    const owner = await makeUser();
    const member = await makeUser({ parentId: owner.id, role: "USER" });
    const report = await getSenderHealthReport(member);
    expect(report.identity.workspaceHasVerifiedDomain).toBe(false);
  });

  it("the owner sees their own workspace's answer too", async () => {
    const { owner } = await workspaceWithDomain();
    const report = await getSenderHealthReport(owner);
    expect(report.identity.workspaceHasVerifiedDomain).toBe(true);
  });

  it("a member of a domain-ready workspace is send-eligible on identity", async () => {
    // identity.ok is what actually gates sending. A member inheriting a verified
    // workspace domain must not be blocked on SENDER_DOMAIN_REQUIRED.
    const { member } = await workspaceWithDomain();
    const report = await getSenderHealthReport(member);
    expect(report.identity.code).not.toBe("SENDER_DOMAIN_REQUIRED");
    expect(report.identity.ok).toBe(true);
  });
});

describe("no client surface may decide sending identity from the user row", () => {
  // A source guard, because this defect is invisible to any test that renders a
  // single account: it only appears for an INVITED member, and every one of the
  // four broken surfaces looked correct for the owner who registered the domain.
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const read = (p) => readFile(join(root, p), "utf8");
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the sender health widget reads the workspace answer, not the user column", async () => {
    const src = strip(await read("client/src/components/SenderHealthWidget.jsx"));
    expect(src).not.toMatch(/user\??\.sendingIdentityType/);
    expect(src).toMatch(/workspaceHasVerifiedDomain/);
  });

  it.each([
    "client/src/components/layout/AppLayout.jsx",
    "client/src/pages/Dashboard.jsx",
    "client/src/pages/Onboarding.jsx",
  ])("%s prompts for domain setup only behind a workspace-ownership check", async (file) => {
    // These three may still read the OWNER's own registration state — that is
    // legitimate, it is their setup step. What they may not do is show it to
    // someone who cannot act on it, so every one of them is gated on ownership.
    const src = strip(await read(file));
    expect(src).toMatch(/isWorkspaceOwner/);
  });
});
