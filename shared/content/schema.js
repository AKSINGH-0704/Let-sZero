// RepMail Resource Center — content schema (M21-A, Phase 1).
//
// Validates markdown-file frontmatter for every content item. This is the
// data-model side of PAR §8 ("first-class from day one, even where the UI
// ships later") — assets, featured/collection membership, and author-as-entity
// are real schema fields here, not retrofitted later.
//
// Deliberately NOT a Drizzle/database schema (shared/schema.js is the DB
// schema; this is not) — content storage is markdown files in the repo,
// per PAR §12 Decision 3. Reuses zod (already a dependency) for the same
// validate-at-the-boundary discipline shared/schema.js already uses.

import { z } from "zod";
import { CONTENT_TYPES, PRODUCTS } from "./taxonomy.js";

const contentTypeValues = Object.values(CONTENT_TYPES);
const productSlugs = Object.keys(PRODUCTS);

// An "asset" is the practical, usable thing a content product ships with
// (PAR §6/§9 — a publish requirement, not optional). Modeled as data so a
// future "browse all checklists" view can be built without re-authoring
// anything (PAR §8).
export const assetSchema = z.object({
  type: z.enum(["checklist", "template", "table", "diagram"]),
  title: z.string().min(1),
  // For checklist/template: inline content (markdown or plain list items).
  // For table: a { headers, rows } shape. For diagram: an image path.
  // Deliberately loose (z.any()) at this layer — each asset type's renderer
  // (built in M21-C) validates its own shape; this schema only enforces that
  // every content item's assets are present and minimally identified.
  content: z.any(),
});

export const authorSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  bio: z.string().min(1),
  // Person (default) for a real named individual, Organization for a real
  // team-level byline (e.g. "RepMail Team") — both are honest identities,
  // neither is a fictional persona. Governs the schema.org @type emitted by
  // buildPersonJsonLd/buildArticleJsonLd (ADR-014); a name string alone
  // can't tell Google whether an entity is a person or a team.
  authorType: z.enum(["Person", "Organization"]).default("Person"),
  // No `isAiGenerated` / persona flag of any kind — the schema has no field
  // that could represent a fictional author, by design (PAR §9/§12 Decision 5,
  // ADR-014).
  avatarUrl: z.string().optional(),
});

export const articleFrontmatterSchema = z.object({
  product: z.enum(productSlugs),
  academy: z.string().min(1), // validated against the product's real academy slugs by validateArticle() below, not enumerated here (keeps this schema product-agnostic)
  contentType: z.enum(contentTypeValues),
  slug: z.string().min(1),
  title: z.string().min(1).max(70), // keeps SEO title formula (PAR §7) under ~60-70 chars headroom
  description: z.string().min(1).max(160), // meta description length budget, PAR §7
  authorSlug: z.string().min(1),
  publishedAt: z.string().date(),
  updatedAt: z.string().date().optional(),
  tags: z.array(z.string()).default([]),
  // Publish requirement (PAR §9): every article ships with at least one asset.
  assets: z.array(assetSchema).min(1, "every content item must include at least one practical asset (PAR §9)"),
  featured: z.boolean().default(false),
  collections: z.array(z.string()).default([]),
  learningPaths: z.array(z.string()).default([]),
  // Canonical override — only needed if a piece is intentionally a canonical
  // duplicate of another URL; absent for the normal case (PAR §7).
  canonicalUrl: z.string().optional(),
});

export const collectionSchema = z.object({
  product: z.enum(productSlugs),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  articleSlugs: z.array(z.string()).default([]),
});

export const learningPathSchema = z.object({
  product: z.enum(productSlugs),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  steps: z.array(z.string()).min(1), // ordered article slugs
});

/**
 * Validates a parsed article frontmatter object against both the generic
 * schema and the product's real academy taxonomy (the two-stage check the
 * schema-only validation above can't do, since academy slugs are per-product
 * data, not a fixed enum).
 */
export function validateArticle(frontmatter) {
  const parsed = articleFrontmatterSchema.parse(frontmatter);
  const product = PRODUCTS[parsed.product];
  const validAcademySlugs = product.academies.map((a) => a.slug).concat(product.templateLibrary.slug);
  if (!validAcademySlugs.includes(parsed.academy)) {
    throw new Error(
      `Unknown academy "${parsed.academy}" for product "${parsed.product}". Valid: ${validAcademySlugs.join(", ")}`
    );
  }
  return parsed;
}
