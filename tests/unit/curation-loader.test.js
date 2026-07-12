// M22-A — tests for the first real consumers of learningPathSchema/
// collectionSchema (schemas existed since M21-A, unused until now).
// getLearningPathsForProduct/getCollectionsForProduct are import.meta.glob-
// based (same mechanism as getArticlesForProduct/getAuthorsForProduct),
// so they're exercised via Vite's own SSR module loader, matching the
// pattern already used throughout this test suite for client-bundle code.
// resolveArticleSlugs has no glob dependency and is tested directly.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";

let vite, resourceCenterContent;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  resourceCenterContent = await vite.ssrLoadModule("/src/lib/resourceCenterContent.js");
});

afterAll(async () => {
  await vite.close();
});

describe("getLearningPathsForProduct / getCollectionsForProduct — honest empty state (today's real state, zero content published)", () => {
  it("returns an empty array, not an error, when no path files exist yet", () => {
    const paths = resourceCenterContent.getLearningPathsForProduct("repmail");
    expect(paths).toEqual([]);
  });

  it("returns an empty array, not an error, when no collection files exist yet", () => {
    const collections = resourceCenterContent.getCollectionsForProduct("repmail");
    expect(collections).toEqual([]);
  });

  it("returns an empty array for a product that isn't registered at all", () => {
    expect(resourceCenterContent.getLearningPathsForProduct("messagehub")).toEqual([]);
    expect(resourceCenterContent.getCollectionsForProduct("messagehub")).toEqual([]);
  });
});

describe("resolveArticleSlugs — pure function, no glob dependency", () => {
  const articles = [
    { slug: "verify-your-sending-domain", title: "Verify Your Sending Domain Before Your First Campaign" },
    { slug: "why-your-emails-land-in-spam", title: "Why Your Emails Land in Spam, and How to Fix It" },
  ];

  it("resolves ordered slugs into their real article objects, in the given order", () => {
    const resolved = resourceCenterContent.resolveArticleSlugs(
      ["why-your-emails-land-in-spam", "verify-your-sending-domain"],
      articles
    );
    expect(resolved.map((a) => a.slug)).toEqual(["why-your-emails-land-in-spam", "verify-your-sending-domain"]);
  });

  it("silently drops a slug that doesn't resolve to a real article — a broken step is never worse than a missing one", () => {
    const resolved = resourceCenterContent.resolveArticleSlugs(
      ["verify-your-sending-domain", "this-article-does-not-exist"],
      articles
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0].slug).toBe("verify-your-sending-domain");
  });

  it("returns an empty array for an empty slug list", () => {
    expect(resourceCenterContent.resolveArticleSlugs([], articles)).toEqual([]);
  });
});
