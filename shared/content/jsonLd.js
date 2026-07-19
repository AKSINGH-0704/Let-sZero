// M21-E — JSON-LD generators for the Resource Center (PAR §7). Pure
// functions (no fs, no DOM) — usable both by the future build-time
// prerender path and by the client-side useJsonLd hook (M21-E). Kept next
// to shared/content/schema.js and taxonomy.js since these describe the
// same content model, just projected into schema.org's vocabulary.

// authorType (ADR-014): "Person" for a real named individual, "Organization"
// for a real team-level byline (e.g. "RepMail Team"). jobTitle is a Person-only
// schema.org property — omitted for Organization rather than emitted
// meaninglessly. Defaults to "Person" for author records predating this field.
export function buildPersonJsonLd(author, { canonicalUrl }) {
  const authorType = author.authorType ?? "Person";
  return {
    "@context": "https://schema.org",
    "@type": authorType,
    name: author.name,
    ...(authorType === "Person" ? { jobTitle: author.role } : {}),
    description: author.bio,
    url: canonicalUrl,
    ...(author.avatarUrl ? { image: author.avatarUrl } : {}),
  };
}

export function buildArticleJsonLd(article, { canonicalUrl, authorUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    url: canonicalUrl,
    author: {
      "@type": article.author.authorType ?? "Person",
      name: article.author.name,
      url: authorUrl,
    },
  };
}

// M23-C — FAQPage structured data from an article's genuine Q&A (schema.js
// `faqs`). Only emit when there are real FAQs — Google's guidance is that
// FAQPage markup must reflect visible, genuine Q&A on the page, which it does
// here (the same list drives the visible ArticleFaq component). Returns null
// for no/empty FAQs so callers can spread it into a JSON-LD graph safely.
export function buildFaqJsonLd(faqs) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/**
 * The breadcrumb trail for a Resource Center page, as [{ label, href }, ...]
 * (last item has no href — it is the current page).
 *
 * M28-B — moved here from ResourceCenterBreadcrumb.jsx. It was always a pure
 * function, but living in a .jsx file meant the build-time prerender pipeline
 * (plain Node ESM, no JSX transform) could not import it, so prerendered pages
 * shipped BlogPosting JSON-LD only — the BreadcrumbList was added client-side
 * after hydration, where a crawler reading the served HTML never sees it.
 * Living in shared/content/ it is genuinely one source of truth for all three
 * consumers: the visual trail, the client JSON-LD, and the prerendered JSON-LD.
 */
export function buildBreadcrumbItems({ resourceCenterName, resourceCenterHref, academy, academyHref, articleTitle }) {
  const items = [{ label: resourceCenterName, href: resourceCenterHref }];
  if (academy) items.push({ label: academy.name, href: academyHref });
  if (articleTitle) items.push({ label: articleTitle });
  return items;
}

// breadcrumbItems: the same [{ label, href }, ...] shape
// buildBreadcrumbItems() above produces — one source of truth for the visual
// trail and its structured-data twin, not two hand-kept copies that could
// drift (the exact risk flagged and avoided in M21-C's own code comments).
export function buildBreadcrumbListJsonLd(breadcrumbItems, { canonicalOrigin }) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${canonicalOrigin}${item.href}` } : {}),
    })),
  };
}
