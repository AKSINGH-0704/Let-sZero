// M22-D — structural tests on the real PUBLIC_ROUTES array itself (data,
// not the prerender mechanism — that's tested against a fixture in
// prerender.test.js per its own header comment, and against the real
// 24 production routes by `npm run build`, which isn't re-run per test).
// This confirms the 17 Resource Center routes M22-D added are actually
// present with the right shape, and that the article/author entries
// correctly reuse shared/content/jsonLd.js's real builders rather than
// hand-duplicating the JSON-LD shape.

import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES } from "../../script/prerender-routes.js";

const CANONICAL = "https://www.letszero.in/repmail/learn";

function findRoute(path) {
  return PUBLIC_ROUTES.find((r) => r.path === path);
}

describe("PUBLIC_ROUTES — the 17 Resource Center routes M22-D adds", () => {
  it("includes the homepage, both launched Academy hubs, all 11 articles, the author page, the path, and the collection", () => {
    const expectedPaths = [
      "/repmail/learn",
      "/repmail/learn/deliverability",
      "/repmail/learn/cold-email",
      "/repmail/learn/deliverability/why-your-emails-land-in-spam",
      "/repmail/learn/deliverability/verify-your-sending-domain",
      "/repmail/learn/deliverability/why-new-domains-need-warm-up",
      "/repmail/learn/deliverability/hard-vs-soft-bounces",
      "/repmail/learn/deliverability/pre-send-deliverability-checklist",
      "/repmail/learn/cold-email/subject-lines-that-get-opened",
      "/repmail/learn/cold-email/personalize-cold-email-at-scale",
      "/repmail/learn/cold-email/how-many-follow-ups",
      "/repmail/learn/cold-email/what-to-ab-test-first",
      "/repmail/learn/cold-email/cold-email-templates",
      "/repmail/learn/cold-email/where-repmail-fits-in-your-workflow",
      "/repmail/learn/authors/repmail-team",
      "/repmail/learn/paths/getting-started",
      "/repmail/learn/collections/getting-your-first-campaign-delivered",
    ];
    for (const p of expectedPaths) expect(findRoute(p), `missing route ${p}`).toBeTruthy();
  });

  it("every article route reuses buildArticleJsonLd — emits BlogPosting with an Organization author (repmail-team, ADR-014), not a hand-duplicated shape", () => {
    const route = findRoute("/repmail/learn/deliverability/why-your-emails-land-in-spam");
    const jsonLd = route.jsonLd(`${CANONICAL}/deliverability/why-your-emails-land-in-spam`);
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.headline).toBe("Why Your Emails Land in Spam, and How to Fix It");
    expect(jsonLd.author).toEqual({
      "@type": "Organization",
      name: "RepMail Team",
      url: "https://www.letszero.in/repmail/learn/authors/repmail-team",
    });
  });

  it("the author route reuses buildPersonJsonLd — emits Organization, not Person, for the team byline", () => {
    const route = findRoute("/repmail/learn/authors/repmail-team");
    const jsonLd = route.jsonLd(`${CANONICAL}/authors/repmail-team`);
    expect(jsonLd["@type"]).toBe("Organization");
    expect(jsonLd.name).toBe("RepMail Team");
    expect("jobTitle" in jsonLd).toBe(false); // Person-only property, correctly absent
  });

  it("every route has a componentPath pointing at a real Resource Center page component", () => {
    const resourceCenterPaths = PUBLIC_ROUTES.filter((r) => r.path.startsWith("/repmail/learn"));
    expect(resourceCenterPaths).toHaveLength(17);
    for (const route of resourceCenterPaths) {
      expect(route.componentPath).toMatch(/^\/src\/pages\/(resource-center\/\w+Page\.jsx)$/);
    }
  });
});
