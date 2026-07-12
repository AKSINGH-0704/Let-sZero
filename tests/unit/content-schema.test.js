// M21-A — Resource Center content schema & taxonomy tests.
// Pure data/validation tests, no server, no HTTP — the schema in
// shared/content/schema.js is consumed at build time (M21-B/D), not at
// request time, so there's no route to exercise yet.

import { describe, it, expect } from "vitest";
import { articleFrontmatterSchema, validateArticle, authorSchema, collectionSchema, learningPathSchema } from "../../shared/content/schema.js";
import { PRODUCTS, REPMAIL_ACADEMIES, REPMAIL_TEMPLATE_LIBRARY, getAcademyBySlug, listAcademySlugs, CONTENT_TYPES } from "../../shared/content/taxonomy.js";

function validFrontmatter(overrides = {}) {
  return {
    product: "repmail",
    academy: "deliverability",
    contentType: CONTENT_TYPES.GUIDE,
    slug: "how-dkim-works",
    title: "How DKIM Works",
    description: "A practical guide to DKIM signing and why it matters for deliverability.",
    authorSlug: "jane-doe",
    publishedAt: "2026-07-12",
    tags: ["dkim", "authentication"],
    assets: [{ type: "diagram", title: "DKIM lookup flow", content: "/images/dkim-flow.svg" }],
    ...overrides,
  };
}

describe("taxonomy", () => {
  it("defines exactly the seven RepMail academies from the PAR, in editorial order", () => {
    expect(REPMAIL_ACADEMIES.map((a) => a.slug)).toEqual([
      "cold-email", "deliverability", "outreach", "infrastructure", "lead-generation", "compliance",
    ]);
    expect(REPMAIL_ACADEMIES).toHaveLength(6); // 6 Academies + 1 Template Library = 7 pillars total
    expect(REPMAIL_TEMPLATE_LIBRARY.slug).toBe("templates");
  });

  it("every academy has a non-empty name, tagline, and description (no placeholder pillars)", () => {
    for (const academy of REPMAIL_ACADEMIES) {
      expect(academy.name.length).toBeGreaterThan(0);
      expect(academy.tagline.length).toBeGreaterThan(0);
      expect(academy.description.length).toBeGreaterThan(0);
    }
  });

  it("PRODUCTS is the extension point — a future product adds an entry, not a schema change", () => {
    expect(Object.keys(PRODUCTS)).toEqual(["repmail"]);
    expect(PRODUCTS.repmail.basePath).toBe("/repmail/learn");
    expect(PRODUCTS.repmail.resourceCenterName).toBe("RepMail Resource Center");
  });

  it("getAcademyBySlug resolves a real academy and returns null for an unknown one", () => {
    expect(getAcademyBySlug("repmail", "deliverability")?.name).toBe("Deliverability & Sender Reputation");
    expect(getAcademyBySlug("repmail", "not-a-real-academy")).toBeNull();
    expect(getAcademyBySlug("not-a-real-product", "deliverability")).toBeNull();
  });

  it("listAcademySlugs returns all seven-minus-templates slugs for repmail, empty for an unknown product", () => {
    expect(listAcademySlugs("repmail")).toHaveLength(6);
    expect(listAcademySlugs("nonexistent")).toEqual([]);
  });
});

describe("article frontmatter schema", () => {
  it("accepts a well-formed article", () => {
    const result = articleFrontmatterSchema.parse(validFrontmatter());
    expect(result.slug).toBe("how-dkim-works");
    expect(result.featured).toBe(false); // default
  });

  it("rejects an article with zero assets — every content item must ship a practical asset (PAR §9)", () => {
    expect(() => articleFrontmatterSchema.parse(validFrontmatter({ assets: [] }))).toThrow();
  });

  it("rejects a title over the SEO length budget", () => {
    const longTitle = "A".repeat(71);
    expect(() => articleFrontmatterSchema.parse(validFrontmatter({ title: longTitle }))).toThrow();
  });

  it("rejects a description over the meta-description length budget", () => {
    const longDesc = "A".repeat(161);
    expect(() => articleFrontmatterSchema.parse(validFrontmatter({ description: longDesc }))).toThrow();
  });

  it("rejects an unknown content type", () => {
    expect(() => articleFrontmatterSchema.parse(validFrontmatter({ contentType: "listicle" }))).toThrow();
  });

  it("rejects an unknown product", () => {
    expect(() => articleFrontmatterSchema.parse(validFrontmatter({ product: "messagehub" }))).toThrow();
  });
});

describe("validateArticle — two-stage validation (schema + real product taxonomy)", () => {
  it("passes for a real academy slug under repmail", () => {
    expect(() => validateArticle(validFrontmatter({ academy: "cold-email" }))).not.toThrow();
  });

  it("passes for the templates library slug too (assets/templates live there, not in an Academy)", () => {
    expect(() => validateArticle(validFrontmatter({ academy: "templates", contentType: CONTENT_TYPES.TEMPLATE }))).not.toThrow();
  });

  it("throws for an academy slug that isn't real, even though it passes the generic schema (it's just a non-empty string there)", () => {
    expect(() => validateArticle(validFrontmatter({ academy: "productivity-tips" }))).toThrow(/Unknown academy/);
  });

  it("accepts the optional M23-C educational fields, and validates without them (backward compatible)", () => {
    // Absent — the pre-M23 shape still validates.
    const base = validateArticle(validFrontmatter());
    expect(base.keyTakeaways).toBeUndefined();
    expect(base.nextStep).toBeUndefined();

    // Present and well-formed.
    const enriched = validateArticle(validFrontmatter({
      keyTakeaways: ["One", "Two"],
      prerequisites: [{ label: "A verified domain", href: "/repmail/learn/deliverability/verify-your-sending-domain" }, { label: "A list" }],
      commonMistakes: ["Don't do X"],
      faqs: [{ question: "Q?", answer: "A." }],
      nextStep: { label: "Next", href: "/repmail/learn/x", description: "why" },
      heroDiagram: "email-authentication",
    }));
    expect(enriched.keyTakeaways).toEqual(["One", "Two"]);
    expect(enriched.nextStep.href).toBe("/repmail/learn/x");
    expect(enriched.faqs[0].question).toBe("Q?");
    expect(enriched.heroDiagram).toBe("email-authentication");
  });

  it("rejects a malformed nextStep (missing href) and a malformed faq (missing answer)", () => {
    expect(() => validateArticle(validFrontmatter({ nextStep: { label: "Next" } }))).toThrow();
    expect(() => validateArticle(validFrontmatter({ faqs: [{ question: "Q?" }] }))).toThrow();
  });
});

describe("author schema — no field can represent a fictional persona (PAR §9/§12 Decision 5)", () => {
  it("requires name, role, and bio — a byline can't be just a display name", () => {
    expect(() => authorSchema.parse({ slug: "jane-doe", name: "Jane Doe", role: "Engineer", bio: "Writes about deliverability." })).not.toThrow();
    expect(() => authorSchema.parse({ slug: "jane-doe", name: "Jane Doe" })).toThrow();
  });

  it("the schema has no isAiGenerated/persona-type field at all", () => {
    expect(Object.keys(authorSchema.shape)).not.toContain("isAiGenerated");
    expect(Object.keys(authorSchema.shape)).not.toContain("persona");
  });

  it("authorType defaults to Person when omitted (ADR-014 backward compatibility)", () => {
    const parsed = authorSchema.parse({ slug: "jane-doe", name: "Jane Doe", role: "Engineer", bio: "Writes about deliverability." });
    expect(parsed.authorType).toBe("Person");
  });

  it("accepts Organization for a real team-level byline (ADR-014), rejects anything else", () => {
    expect(() => authorSchema.parse({ slug: "repmail-team", name: "RepMail Team", role: "Product Team", bio: "The team behind RepMail.", authorType: "Organization" })).not.toThrow();
    expect(() => authorSchema.parse({ slug: "repmail-team", name: "RepMail Team", role: "Product Team", bio: "...", authorType: "AI" })).toThrow();
  });
});

describe("collection and learning-path schemas — product-scoped like articles (PAR §11)", () => {
  it("a collection needs a real product plus slug/name/description; articleSlugs defaults to empty", () => {
    const c = collectionSchema.parse({ product: "repmail", slug: "getting-your-first-campaign-delivered", name: "Getting Your First Campaign Delivered", description: "Cross-pillar starter collection." });
    expect(c.articleSlugs).toEqual([]);
  });

  it("rejects a collection with an unknown product", () => {
    expect(() => collectionSchema.parse({ product: "messagehub", slug: "x", name: "X", description: "..." })).toThrow();
  });

  it("a learning path requires a real product and at least one step", () => {
    expect(() => learningPathSchema.parse({ product: "repmail", slug: "new-to-cold-email", name: "New to Cold Email? Start Here", description: "...", steps: [] })).toThrow();
    expect(() => learningPathSchema.parse({ product: "repmail", slug: "new-to-cold-email", name: "New to Cold Email? Start Here", description: "...", steps: ["how-dkim-works"] })).not.toThrow();
  });

  it("a learning path's level is optional, and accepts only beginner/intermediate/advanced (M22-A)", () => {
    const noLevel = learningPathSchema.parse({ product: "repmail", slug: "getting-started", name: "Getting Started", description: "...", steps: ["how-dkim-works"] });
    expect(noLevel.level).toBeUndefined();

    const withLevel = learningPathSchema.parse({ product: "repmail", slug: "getting-started", name: "Getting Started", description: "...", steps: ["how-dkim-works"], level: "beginner" });
    expect(withLevel.level).toBe("beginner");

    expect(() => learningPathSchema.parse({ product: "repmail", slug: "x", name: "X", description: "...", steps: ["a"], level: "expert" })).toThrow();
  });
});
