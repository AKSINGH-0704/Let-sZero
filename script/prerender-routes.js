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
];
