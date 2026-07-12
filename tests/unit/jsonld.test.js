// M21-E — JSON-LD generator tests. Pure functions, plain data-shape
// assertions — no rendering needed.

import { describe, it, expect } from "vitest";
import { buildPersonJsonLd, buildArticleJsonLd, buildBreadcrumbListJsonLd, buildFaqJsonLd } from "../../shared/content/jsonLd.js";

const author = { slug: "jane-doe", name: "Jane Doe", role: "Deliverability Engineer", bio: "Writes about DKIM." };

describe("buildPersonJsonLd", () => {
  it("produces a valid schema.org Person for a real author page", () => {
    const jsonLd = buildPersonJsonLd(author, { canonicalUrl: "https://www.letszero.in/repmail/learn/authors/jane-doe" });
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.name).toBe("Jane Doe");
    expect(jsonLd.jobTitle).toBe("Deliverability Engineer");
    expect(jsonLd.url).toBe("https://www.letszero.in/repmail/learn/authors/jane-doe");
  });

  it("omits the image field entirely when there's no avatar, rather than emitting an empty/undefined one", () => {
    const jsonLd = buildPersonJsonLd(author, { canonicalUrl: "https://x.test" });
    expect("image" in jsonLd).toBe(false);
  });

  it("defaults to Person for an author record with no authorType (ADR-014 backward compatibility)", () => {
    const jsonLd = buildPersonJsonLd(author, { canonicalUrl: "https://x.test" });
    expect(jsonLd["@type"]).toBe("Person");
  });

  it("emits Organization, not Person, for a real team-level byline (ADR-014) — and omits jobTitle, a Person-only property", () => {
    const teamAuthor = { slug: "repmail-team", name: "RepMail Team", role: "Product Team", bio: "The team behind RepMail.", authorType: "Organization" };
    const jsonLd = buildPersonJsonLd(teamAuthor, { canonicalUrl: "https://www.letszero.in/repmail/learn/authors/repmail-team" });
    expect(jsonLd["@type"]).toBe("Organization");
    expect(jsonLd.name).toBe("RepMail Team");
    expect("jobTitle" in jsonLd).toBe(false);
  });
});

describe("buildArticleJsonLd", () => {
  const article = {
    title: "How DKIM Works",
    description: "A practical guide.",
    publishedAt: "2026-07-12",
    author,
  };

  it("produces a valid BlogPosting with a nested author Person referencing the real author page", () => {
    const jsonLd = buildArticleJsonLd(article, {
      canonicalUrl: "https://www.letszero.in/repmail/learn/deliverability/how-dkim-works",
      authorUrl: "https://www.letszero.in/repmail/learn/authors/jane-doe",
    });
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.headline).toBe("How DKIM Works");
    expect(jsonLd.author).toEqual({ "@type": "Person", name: "Jane Doe", url: "https://www.letszero.in/repmail/learn/authors/jane-doe" });
    expect("dateModified" in jsonLd).toBe(false);
  });

  it("includes dateModified only when the article has been updated", () => {
    const jsonLd = buildArticleJsonLd({ ...article, updatedAt: "2026-08-01" }, { canonicalUrl: "https://x.test", authorUrl: "https://x.test/authors/jane-doe" });
    expect(jsonLd.dateModified).toBe("2026-08-01");
  });

  it("nests an Organization author, not Person, for an article bylined to a real team (ADR-014)", () => {
    const teamAuthor = { slug: "repmail-team", name: "RepMail Team", role: "Product Team", bio: "The team behind RepMail.", authorType: "Organization" };
    const jsonLd = buildArticleJsonLd({ ...article, author: teamAuthor }, {
      canonicalUrl: "https://x.test",
      authorUrl: "https://x.test/authors/repmail-team",
    });
    expect(jsonLd.author).toEqual({ "@type": "Organization", name: "RepMail Team", url: "https://x.test/authors/repmail-team" });
  });
});

describe("buildBreadcrumbListJsonLd", () => {
  it("mirrors the exact visual breadcrumb trail — same items, same order, no separate hand-kept list", () => {
    const items = [
      { label: "RepMail Resource Center", href: "/repmail/learn" },
      { label: "Deliverability & Sender Reputation", href: "/repmail/learn/deliverability" },
      { label: "How DKIM Works" }, // current page, no href
    ];
    const jsonLd = buildBreadcrumbListJsonLd(items, { canonicalOrigin: "https://www.letszero.in" });
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(3);
    expect(jsonLd.itemListElement[0]).toEqual({ "@type": "ListItem", position: 1, name: "RepMail Resource Center", item: "https://www.letszero.in/repmail/learn" });
    expect(jsonLd.itemListElement[2]).toEqual({ "@type": "ListItem", position: 3, name: "How DKIM Works" }); // no `item` field — matches having no href
  });
});

describe("buildFaqJsonLd (M23-C)", () => {
  it("produces FAQPage with a Question/Answer per genuine FAQ", () => {
    const jsonLd = buildFaqJsonLd([
      { question: "Do I need all three?", answer: "Practically, yes." },
      { question: "Where do records go?", answer: "In your DNS." },
    ]);
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(2);
    expect(jsonLd.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Do I need all three?",
      acceptedAnswer: { "@type": "Answer", text: "Practically, yes." },
    });
  });

  it("returns null for no/empty FAQs so it can be filtered out of a JSON-LD graph", () => {
    expect(buildFaqJsonLd(undefined)).toBeNull();
    expect(buildFaqJsonLd([])).toBeNull();
  });
});
