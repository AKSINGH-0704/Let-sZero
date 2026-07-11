// M21-F — related-content scoring tests. Pure function, plain fixture data.

import { describe, it, expect } from "vitest";
import { getRelatedArticles } from "../../shared/content/relatedContent.js";

const deliverability = { slug: "deliverability" };
const coldEmail = { slug: "cold-email" };

function article(overrides) {
  return {
    slug: "x", title: "X", tags: [], academy: deliverability, publishedAt: "2026-01-01",
    ...overrides,
  };
}

describe("getRelatedArticles", () => {
  it("never includes the article itself", () => {
    const target = article({ slug: "how-dkim-works", tags: ["dkim"] });
    const related = getRelatedArticles(target, [target]);
    expect(related).toHaveLength(0);
  });

  it("ranks a shared-tag match above a same-academy-only match", () => {
    const target = article({ slug: "how-dkim-works", tags: ["dkim", "authentication"] });
    const sameAcademyOnly = article({ slug: "warm-up-guide", tags: ["warm-up"], academy: deliverability });
    const sharedTag = article({ slug: "spf-explained", tags: ["dkim"], academy: coldEmail }); // different academy, but shares a tag
    const related = getRelatedArticles(target, [sameAcademyOnly, sharedTag]);
    expect(related[0].slug).toBe("spf-explained"); // shared tag (score 2) beats same-academy-only (score 1)
    expect(related[1].slug).toBe("warm-up-guide");
  });

  it("excludes candidates with zero overlap (no shared tags, no shared academy)", () => {
    const target = article({ slug: "how-dkim-works", tags: ["dkim"], academy: deliverability });
    const unrelated = article({ slug: "gdpr-basics", tags: ["gdpr"], academy: { slug: "compliance" } });
    const related = getRelatedArticles(target, [unrelated]);
    expect(related).toHaveLength(0);
  });

  it("breaks ties by most recently published", () => {
    const target = article({ slug: "how-dkim-works", academy: deliverability });
    const older = article({ slug: "old-guide", academy: deliverability, publishedAt: "2026-01-01" });
    const newer = article({ slug: "new-guide", academy: deliverability, publishedAt: "2026-06-01" });
    const related = getRelatedArticles(target, [older, newer]);
    expect(related[0].slug).toBe("new-guide");
  });

  it("respects the limit option", () => {
    const target = article({ slug: "how-dkim-works", academy: deliverability });
    const many = Array.from({ length: 10 }, (_, i) => article({ slug: `guide-${i}`, academy: deliverability }));
    const related = getRelatedArticles(target, many, { limit: 2 });
    expect(related).toHaveLength(2);
  });

  it("returns an empty array for a null article rather than throwing", () => {
    expect(getRelatedArticles(null, [article({})])).toEqual([]);
  });
});
