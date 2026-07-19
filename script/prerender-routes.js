// M21-B — the six routes prerendered this milestone: exactly the URLs
// already declared canonical/indexable via the existing client/public/sitemap.xml,
// deliberately not a larger set — this phase proves the pipeline on
// already-shipped, already-tested pages (PAR §13 Phase 2), not a scope
// expansion beyond what's already public and indexed.
//
// M21-G adds /repmail/changelog — real, substantive, already-published
// content (RELEASE_NOTES.md verbatim), unlike the still-empty Resource
// Center Academy pages, which deliberately remain out of this list until
// they have real content worth indexing (see Audit 129).
//
// M22-D adds the 17 Resource Center routes M21-D deliberately withheld:
// the homepage, both launched Academy hubs, all 11 Wave 1 articles, the
// author page, the Getting Started path, and the Collection — real
// content now exists (M22-B/C), so the condition M21-D's own comment
// named ("until they have real content worth indexing") is now true.
//
// M27 — the Resource Center routes below are no longer hand-written. This file
// is plain Node ESM (imported directly by script/prerender.js and
// script/generate-sitemap.js, not loaded through Vite), so it can't use
// import.meta.glob the way the client bundle does. It can, however, read the
// real content directory through shared/content/loader.js — exactly what
// script/generate-rss.js has always done. getPublicRoutes() below derives every
// article, Academy hub, author, path, and collection route from that same
// loader, so a new markdown file is prerendered and enters the sitemap by
// existing, rather than by also being copied into a list here. Before M27 the
// two drifted: RSS reported 60 articles while the sitemap reported 24 URLs.
//
// STATIC_ROUTES stays hand-written: those pages are React components with no
// backing content file to derive a title or description from.
import { readdir, readFile } from "fs/promises";
import path from "path";
import {
  buildArticleJsonLd,
  buildPersonJsonLd,
  buildBreadcrumbItems,
  buildBreadcrumbListJsonLd,
  buildFaqJsonLd,
} from "../shared/content/jsonLd.js";
import { loadAuthors, loadArticles } from "../shared/content/loader.js";
import { PRODUCTS } from "../shared/content/taxonomy.js";

const ORIGIN = "https://www.letszero.in";
const CONTENT_DIR = path.resolve(import.meta.dirname, "..", "client", "src", "content");

const RC_SUFFIX = "RepMail Resource Center";

function webPageJsonLd(name) {
  return (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name, url });
}

// M28-B — a page's structured data is a graph, not a single node. The client
// pages have always rendered Article + BreadcrumbList (+ FAQPage where the
// article has genuine Q&A) via useJsonLd, but that runs after hydration, so the
// prerendered HTML a crawler reads carried only the first node. These helpers
// build the same graph the matching page component builds, from the same
// shared/content/jsonLd.js functions, so the two cannot drift.
//
// The prerenderer JSON.stringify's whatever it is given; an array serializes to
// a single ld+json block holding multiple schema.org objects, which is valid and
// is what Google's own multiple-types guidance recommends.
function graph(...nodes) {
  const present = nodes.filter(Boolean);
  return present.length === 1 ? present[0] : present;
}

function rcBreadcrumbJsonLd(product, { academy, academyHref, articleTitle } = {}) {
  return buildBreadcrumbListJsonLd(
    buildBreadcrumbItems({
      resourceCenterName: product.resourceCenterName,
      resourceCenterHref: product.basePath,
      academy,
      academyHref,
      articleTitle,
    }),
    { canonicalOrigin: ORIGIN },
  );
}

export const STATIC_ROUTES = [
  {
    path: "/",
    componentPath: "@marketing/LFP_final/LandingExperience",
    title: "LetsZero — Email infrastructure built for outbound teams",
    description: "LetsZero builds RepMail and the infrastructure behind it — campaign automation, deliverability intelligence, and performance analytics for outbound email teams.",
    ogImage: "https://www.letszero.in/letszero-logo.png",
    jsonLd: (url) => ({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "LetsZero",
      url,
      logo: "https://www.letszero.in/letszero-logo.png",
    }),
  },
  {
    path: "/products/repmail",
    componentPath: "/src/pages/Landing.jsx",
    title: "RepMail — Cold email infrastructure by LetsZero",
    description: "RepMail is a credit-based cold email platform: verified sending domains, AI-assisted personalization, spam analysis, and team-based sending, built by LetsZero.",
    jsonLd: (url) => ({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "RepMail",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url,
    }),
  },
  {
    path: "/pricing",
    componentPath: "/src/pages/PublicPricing.jsx",
    title: "RepMail Pricing — Credit-based plans, no subscriptions",
    description: "RepMail pricing: pay for credits you use, no monthly fees. Every plan — including the free trial — includes up to 25 team members.",
    jsonLd: (url) => ({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "RepMail Pricing",
      url,
    }),
  },
  {
    path: "/contact",
    componentPath: "/src/pages/Contact.jsx",
    title: "Contact LetsZero",
    description: "Get in touch with the LetsZero team about RepMail, partnerships, or support.",
    ogImage: "https://www.letszero.in/letszero-logo.png",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "Contact LetsZero", url }),
  },
  {
    path: "/privacy",
    componentPath: "/src/pages/Privacy.jsx",
    title: "Privacy Policy — LetsZero",
    description: "LetsZero's privacy policy: how we collect, use, and protect your data.",
    ogImage: "https://www.letszero.in/letszero-logo.png",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "LetsZero Privacy Policy", url }),
  },
  {
    path: "/terms",
    componentPath: "/src/pages/Terms.jsx",
    title: "Terms of Service — LetsZero",
    description: "LetsZero's terms of service.",
    ogImage: "https://www.letszero.in/letszero-logo.png",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "LetsZero Terms of Service", url }),
  },
  {
    path: "/repmail/changelog",
    componentPath: "/src/pages/RepMailChangelog.jsx",
    title: "What's New in RepMail — Changelog",
    description: "Release notes for RepMail: what's been built, improved, and hardened, in plain language.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "RepMail Changelog", url }),
  },

  // M22-D — Resource Center homepage. (M23-II-E: titles/descriptions cleaned
  // of em dashes and kept in sync with the article frontmatter.)
  {
    path: "/repmail/learn",
    componentPath: "/src/pages/resource-center/ResourceCenterHomePage.jsx",
    title: "RepMail Resource Center: Cold Email & Deliverability Guides",
    description: "Practical guides on cold email deliverability, sending infrastructure, and getting your campaigns into the inbox, written by the team building RepMail.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "RepMail Resource Center", url }),
  },

  // M28 — the All Guides index. Static here because it is a React page with no
  // backing content file of its own; the guides it lists are derived at render
  // time from the same loader, so it never needs updating as content grows.
  {
    path: "/repmail/learn/guides",
    componentPath: "/src/pages/resource-center/AllGuidesPage.jsx",
    title: "All Guides | RepMail Resource Center",
    description: "Every guide, definition, and comparison in the RepMail Resource Center, grouped by topic: deliverability, cold email, infrastructure, sending platforms, and the email glossary.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "CollectionPage", name: "All Guides", url }),
  },
];


async function readJsonDir(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return []; // no paths/ or collections/ directory yet is a valid, honest state
  }
  const entries = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      entries.push(JSON.parse(await readFile(path.join(dir, file), "utf-8")));
    } catch (err) {
      // Mirrors the loader's own posture: one malformed curation file is
      // skipped, it never takes the whole build down.
      console.warn(`[prerender-routes] skipping invalid ${file}: ${err.message}`);
    }
  }
  return entries;
}

// Derives every Resource Center route from the real content on disk, using the
// same loader script/generate-rss.js uses. An Academy hub is only emitted once
// it has at least one article, so an empty Academy is never indexed as a thin
// page (the same rule the header nav already applies).
export async function getPublicRoutes({
  contentDir = CONTENT_DIR,
  productSlug = "repmail",
  staticRoutes = STATIC_ROUTES,
  log = console.warn,
} = {}) {
  const product = PRODUCTS[productSlug];
  if (!product) return [...staticRoutes];

  const base = `/${productSlug}/learn`;
  const authors = await loadAuthors(contentDir, productSlug, { log });
  const articles = await loadArticles(contentDir, productSlug, authors, { log });

  const articleRoutes = articles.map((article) => ({
    path: `${base}/${article.academy.slug}/${article.slug}`,
    componentPath: "/src/pages/resource-center/ArticlePage.jsx",
    title: `${article.title} | ${RC_SUFFIX}`,
    description: article.description,
    jsonLd: (url) =>
      graph(
        buildArticleJsonLd(article, {
          canonicalUrl: url,
          authorUrl: `${ORIGIN}${base}/authors/${article.author.slug}`,
        }),
        rcBreadcrumbJsonLd(product, {
          academy: article.academy,
          academyHref: `${base}/${article.academy.slug}`,
          articleTitle: article.title,
        }),
        buildFaqJsonLd(article.faqs),
      ),
  }));

  const academiesWithContent = product.academies.filter((academy) =>
    articles.some((article) => article.academy.slug === academy.slug),
  );
  const academyRoutes = academiesWithContent.map((academy) => ({
    path: `${base}/${academy.slug}`,
    componentPath: "/src/pages/resource-center/AcademyHubPage.jsx",
    title: `${academy.name} | ${RC_SUFFIX}`,
    description: academy.description,
    jsonLd: (url) =>
      graph(
        webPageJsonLd(academy.name)(url),
        rcBreadcrumbJsonLd(product, { academy, academyHref: `${base}/${academy.slug}` }),
      ),
  }));

  const authorRoutes = [...authors.values()].map((author) => ({
    path: `${base}/authors/${author.slug}`,
    componentPath: "/src/pages/resource-center/AuthorPage.jsx",
    title: `${author.name} | ${RC_SUFFIX}`,
    description: author.bio,
    jsonLd: (url) =>
      graph(buildPersonJsonLd(author, { canonicalUrl: url }), rcBreadcrumbJsonLd(product, { articleTitle: author.name })),
  }));

  const productDir = path.join(contentDir, productSlug);
  const pathRoutes = (await readJsonDir(path.join(productDir, "paths"))).map((p) => ({
    path: `${base}/paths/${p.slug}`,
    componentPath: "/src/pages/resource-center/LearningPathPage.jsx",
    title: `${p.name} | ${RC_SUFFIX}`,
    description: p.description,
    jsonLd: (url) => graph(webPageJsonLd(p.name)(url), rcBreadcrumbJsonLd(product, { articleTitle: p.name })),
  }));

  const collectionRoutes = (await readJsonDir(path.join(productDir, "collections"))).map((c) => ({
    path: `${base}/collections/${c.slug}`,
    componentPath: "/src/pages/resource-center/CollectionPage.jsx",
    title: `${c.name} | ${RC_SUFFIX}`,
    description: c.description,
    jsonLd: (url) => graph(webPageJsonLd(c.name)(url), rcBreadcrumbJsonLd(product, { articleTitle: c.name })),
  }));

  return [
    ...staticRoutes,
    ...academyRoutes,
    ...articleRoutes,
    ...authorRoutes,
    ...pathRoutes,
    ...collectionRoutes,
  ];
}
