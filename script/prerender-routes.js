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
// This file is plain Node ESM (imported directly by script/prerender.js
// and script/generate-sitemap.js, not loaded through Vite), so it can't
// use import.meta.glob to pull titles/descriptions from the real content
// files the way the client bundle does — each entry below is hand-written
// to match its source frontmatter exactly (shared/content/jsonLd.js's
// buildArticleJsonLd/buildPersonJsonLd are reused for the article/author
// entries' structured data, so at least that part isn't hand-duplicated).
import { buildArticleJsonLd, buildPersonJsonLd } from "../shared/content/jsonLd.js";

const ORIGIN = "https://www.letszero.in";
const REPMAIL_TEAM_AUTHOR = { name: "RepMail Team", role: "Product & Engineering", bio: "The people building and running RepMail — email infrastructure, deliverability, and the product itself.", authorType: "Organization" };
const AUTHOR_URL = `${ORIGIN}/repmail/learn/authors/repmail-team`;

function articleRoute({ path, title, description, publishedAt }) {
  return {
    path,
    componentPath: "/src/pages/resource-center/ArticlePage.jsx",
    title: `${title} — RepMail Resource Center`,
    description,
    jsonLd: (url) => buildArticleJsonLd({ title, description, publishedAt, author: REPMAIL_TEAM_AUTHOR }, { canonicalUrl: url, authorUrl: AUTHOR_URL }),
  };
}

export const PUBLIC_ROUTES = [
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

  // M22-D — Resource Center homepage.
  {
    path: "/repmail/learn",
    componentPath: "/src/pages/resource-center/ResourceCenterHomePage.jsx",
    title: "RepMail Resource Center — Cold Email & Deliverability Guides",
    description: "Practical guides on cold email deliverability, sending infrastructure, and getting your campaigns into the inbox — written by the team building RepMail.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "RepMail Resource Center", url }),
  },

  // M22-D — the two Academy hubs Wave 1 actually launched.
  {
    path: "/repmail/learn/deliverability",
    componentPath: "/src/pages/resource-center/AcademyHubPage.jsx",
    title: "Deliverability & Sender Reputation — RepMail Resource Center",
    description: "How to make sure the email you send actually lands in the inbox — SPF/DKIM/DMARC, domain warm-up, and bounce handling.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "Deliverability & Sender Reputation", url }),
  },
  {
    path: "/repmail/learn/cold-email",
    componentPath: "/src/pages/resource-center/AcademyHubPage.jsx",
    title: "Cold Email — RepMail Resource Center",
    description: "Writing, personalizing, and sequencing cold email that gets replies — plus where RepMail fits into your workflow.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "Cold Email", url }),
  },

  // M22-D — the 11 Wave 1 articles. title/description copied verbatim from
  // each article's own frontmatter (client/src/content/repmail/...) — kept
  // in sync by hand, since this file can't import.meta.glob the real files
  // (see header comment).
  articleRoute({
    path: "/repmail/learn/deliverability/why-your-emails-land-in-spam",
    title: "Why Your Emails Land in Spam, and How to Fix It",
    description: "SPF, DKIM, and DMARC explained through the actual problem they solve — mail that never reaches the inbox.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/deliverability/verify-your-sending-domain",
    title: "Verify Your Sending Domain Before Your First Campaign",
    description: "A step-by-step walkthrough of domain verification in RepMail — the one thing every sending domain needs before you can campaign.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/deliverability/why-new-domains-need-warm-up",
    title: "New Domain, Poor Delivery? Why You Need to Warm It Up First",
    description: "A verified domain with zero sending history still needs to earn trust gradually — here's a practical ramp schedule.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/deliverability/hard-vs-soft-bounces",
    title: "Why Did That Email Bounce? Hard vs. Soft Bounces Explained",
    description: "Not every bounce means the same thing — the difference determines whether you remove a contact or just wait it out.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/deliverability/pre-send-deliverability-checklist",
    title: "Before You Hit Send: A Pre-Campaign Deliverability Checklist",
    description: "A final, practical checklist to run through before launching any cold email campaign.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/cold-email/subject-lines-that-get-opened",
    title: "Nobody's Opening Your Cold Emails? Fix Your Subject Line First",
    description: "The subject line patterns that trigger spam filters and disengaged readers, and what to write instead.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/cold-email/personalize-cold-email-at-scale",
    title: "Personalization That Doesn't Feel Robotic, Even at Scale",
    description: "How to personalize cold email in a way that actually reads as genuine, using a repeatable structure instead of mail-merge tokens alone.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/cold-email/how-many-follow-ups",
    title: "How Many Follow-Ups Should a Cold Email Sequence Have?",
    description: "A practical cadence for cold email follow-ups — how many, how far apart, and why the last one often performs best.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/cold-email/what-to-ab-test-first",
    title: "Not Getting Replies? What to A/B Test First",
    description: "A prioritized order for A/B testing cold email, starting with the change that moves the numbers the most.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/cold-email/cold-email-templates",
    title: "Cold Email Templates You Can Send Without Hurting Deliverability",
    description: "Two ready-to-use cold email templates, written to perform well and avoid the patterns that trigger spam filters.",
    publishedAt: "2026-07-12",
  }),
  articleRoute({
    path: "/repmail/learn/cold-email/where-repmail-fits-in-your-workflow",
    title: "Where RepMail Fits Into Your Cold Email Workflow",
    description: "A practical, honest breakdown of what RepMail handles in a cold email operation — and what's still your job.",
    publishedAt: "2026-07-12",
  }),

  // M22-D — author page, Getting Started path, and Collection.
  {
    path: "/repmail/learn/authors/repmail-team",
    componentPath: "/src/pages/resource-center/AuthorPage.jsx",
    title: "RepMail Team — RepMail Resource Center",
    description: "The people building and running RepMail — email infrastructure, deliverability, and the product itself.",
    jsonLd: (url) => buildPersonJsonLd(REPMAIL_TEAM_AUTHOR, { canonicalUrl: url }),
  },
  {
    path: "/repmail/learn/paths/getting-started",
    componentPath: "/src/pages/resource-center/LearningPathPage.jsx",
    title: "Getting Started — RepMail Resource Center",
    description: "Everything you need to launch a deliverable first cold email campaign with RepMail, in order.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "Getting Started", url }),
  },
  {
    path: "/repmail/learn/collections/getting-your-first-campaign-delivered",
    componentPath: "/src/pages/resource-center/CollectionPage.jsx",
    title: "Getting Your First Campaign Delivered — RepMail Resource Center",
    description: "A deliverability-focused bundle — warm-up pacing, bounce handling, and templates built to keep your first campaign out of spam.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "WebPage", name: "Getting Your First Campaign Delivered", url }),
  },
];
