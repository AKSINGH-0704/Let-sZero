// RepMail Resource Center — taxonomy (M21-A, Phase 1 of the Organic Growth,
// SEO & Content Platform roadmap; see PAR-M21-organic-growth-seo-content-platform.md).
//
// This file is product-agnostic *mechanism*, product-specific *data*: the
// PRODUCTS map is where a future LetsZero product (e.g. a second entry
// alongside "repmail") would register its own Academy set, without any
// change to the schema in ./schema.js or the build pipeline that consumes it.
// This is the concrete form of the PAR §11 scalability decision — a second
// product's Resource Center is new data here, not new engineering.

export const CONTENT_TYPES = {
  GUIDE: "guide",
  TUTORIAL: "tutorial",
  COMPARISON: "comparison",
  TEMPLATE: "template",
  KNOWLEDGE_BASE: "knowledge-base",
  RELEASE_NOTES: "release-notes",
  RESEARCH: "research",
  PRODUCT_EDUCATION: "product-education",
  ENGINEERING_ARTICLE: "engineering-article",
  CASE_STUDY: "case-study",
  GLOSSARY_TERM: "glossary-term",
};

// RepMail's seven Academies (PAR §6). Order is editorial (drives homepage
// Academy-discovery module order, PAR §5) — not alphabetical.
export const REPMAIL_ACADEMIES = [
  {
    slug: "cold-email",
    name: "Cold Email",
    tagline: "Writing, personalization, subject lines, sequences",
    description: "The tactical craft of cold email: what to write, how to personalize it, and how to structure a sequence that gets replies.",
  },
  {
    slug: "deliverability",
    name: "Deliverability & Sender Reputation",
    tagline: "DKIM, SPF, DMARC, warm-up, inbox placement",
    description: "How to make sure the email you send actually lands in the inbox: the technical and reputational side of sending.",
  },
  {
    slug: "outreach",
    name: "Outreach & Sales Engagement",
    tagline: "Multi-channel sequencing, cadences, meeting booking",
    description: "Cold email as one tactic inside a broader sales-engagement process: cadences, channels, and follow-up.",
  },
  {
    slug: "infrastructure",
    name: "Email Infrastructure",
    tagline: "SMTP, SES, DNS, sending architecture",
    description: "How sending infrastructure actually works, for the practitioner who wants to understand the machinery, not just use it.",
  },
  {
    slug: "lead-generation",
    name: "Lead Generation",
    tagline: "List building, prospecting, ICP and TAM",
    description: "Finding the right people to email in the first place, upstream of cold email itself.",
  },
  {
    slug: "compliance",
    name: "Compliance",
    tagline: "CAN-SPAM, GDPR, CASL, unsubscribe requirements",
    description: "Staying on the right side of the law while sending cold email at scale.",
  },
];

// Templates is a library, not an Academy (PAR §6 — deliberately distinguished:
// it cross-cuts every Academy above rather than competing with them).
export const REPMAIL_TEMPLATE_LIBRARY = {
  slug: "templates",
  name: "Templates",
  tagline: "Ready-to-use cold email templates, sequences, and checklists",
};

// PRODUCTS is the extension point (PAR §11). A second LetsZero product adds
// an entry here with its own academies/templateLibrary — no schema change,
// no build-pipeline change, no route restructuring.
export const PRODUCTS = {
  repmail: {
    slug: "repmail",
    name: "RepMail",
    resourceCenterName: "RepMail Resource Center",
    basePath: "/repmail/learn",
    academies: REPMAIL_ACADEMIES,
    templateLibrary: REPMAIL_TEMPLATE_LIBRARY,
  },
};

export function getAcademyBySlug(productSlug, academySlug) {
  const product = PRODUCTS[productSlug];
  if (!product) return null;
  return product.academies.find((a) => a.slug === academySlug) ?? null;
}

export function listAcademySlugs(productSlug) {
  const product = PRODUCTS[productSlug];
  if (!product) return [];
  return product.academies.map((a) => a.slug);
}
