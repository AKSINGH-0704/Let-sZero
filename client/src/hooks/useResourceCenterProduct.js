// M21-I — resolves the :product route segment against the real PRODUCTS
// registry (shared/content/taxonomy.js). Used by every Resource Center
// route page so a second LetsZero product (PAR §11's own examples —
// MessageHub, NotifyStream) needs a PRODUCTS entry and content, not a new
// set of page components or hardcoded route paths — the gap the M21
// operator review (2026-07-12) asked to have closed, not just designed for.
import { PRODUCTS } from "@shared/content/taxonomy.js";

export default function useResourceCenterProduct(productSlug) {
  return PRODUCTS[productSlug] ?? null;
}
