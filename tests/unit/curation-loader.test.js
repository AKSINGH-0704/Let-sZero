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

describe("getLearningPathsForProduct / getCollectionsForProduct — the real Wave 1 Getting Started path + Collection (M22-C)", () => {
  it("loads the real Getting Started path with its beginner level and 6 ordered steps", () => {
    const paths = resourceCenterContent.getLearningPathsForProduct("repmail");
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatchObject({
      slug: "getting-started",
      name: "Getting Started",
      level: "beginner",
      product: "repmail",
    });
    expect(paths[0].steps).toEqual([
      "where-repmail-fits-in-your-workflow",
      "verify-your-sending-domain",
      "why-your-emails-land-in-spam",
      "subject-lines-that-get-opened",
      "personalize-cold-email-at-scale",
      "pre-send-deliverability-checklist",
    ]);
  });

  it("loads the real Getting Your First Campaign Delivered collection", () => {
    const collections = resourceCenterContent.getCollectionsForProduct("repmail");
    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      slug: "getting-your-first-campaign-delivered",
      name: "Getting Your First Campaign Delivered",
      product: "repmail",
    });
    expect(collections[0].articleSlugs).toEqual([
      "why-new-domains-need-warm-up",
      "hard-vs-soft-bounces",
      "pre-send-deliverability-checklist",
      "cold-email-templates",
    ]);
  });

  it("returns an empty array for a product that isn't registered at all — not a fallback to repmail's real data", () => {
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
