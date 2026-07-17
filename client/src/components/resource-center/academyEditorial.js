// M23-II-C — editorial copy for Academy pages, kept out of the taxonomy
// (shared/content/taxonomy.js stays the engineering data source; this is the
// presentation-layer editorial voice). Keyed by Academy slug.
//
//   whyItMatters  a single, human paragraph. Answers "why should I care".
//   outcomes      what a reader can do after working through the Academy.
//   capabilities  the RepMail product features that relate to the topic.
//   plannedTopics for not-yet-launched Academies: what is coming, so the page
//                 reads as intentional and aspirational rather than empty.
//
// Copy is written to summarise and frame the real guides, never to invent
// claims or statistics.
const EDITORIAL = {
  deliverability: {
    whyItMatters:
      "Most cold email never fails because of what you wrote. It fails because the receiving server could not trust where it came from. Getting this right is the difference between an email that lands and one that quietly disappears.",
    outcomes: [
      "Set up SPF, DKIM, and DMARC so receivers trust your mail",
      "Warm a new domain without wrecking its reputation",
      "Read bounces correctly and protect your sender score",
      "Run a pre-send check that catches problems before they cost you",
    ],
    capabilities: [
      "Guided domain verification with generated DNS records",
      "Automatic SPF and DKIM record generation",
      "Bounce and complaint tracking on every campaign",
    ],
  },
  "cold-email": {
    whyItMatters:
      "A delivered email that nobody opens is as useless as one that bounced. Cold email is a craft. The subject line, the first sentence, the ask, and the follow-up each decide whether a stranger writes back.",
    outcomes: [
      "Write subject lines that earn the open",
      "Personalise at scale without sounding automated",
      "Structure a follow-up sequence that actually gets replies",
      "Know what to test first when your results stall",
    ],
    capabilities: [
      "AI-assisted drafting and personalisation",
      "Sequenced follow-ups on a schedule",
      "Open and reply tracking",
    ],
  },
  outreach: {
    plannedTopics: ["Multi-channel sequencing", "Cadence design that respects the prospect", "Booking meetings that actually happen"],
  },
  infrastructure: {
    whyItMatters:
      "When deliverability breaks, most senders discover the tool they trusted was never really infrastructure. Understanding the sending stack, the domain, DNS, SMTP relay, and IP, is what lets you tell a content problem from an infrastructure one.",
    outcomes: [
      "Understand the full sending stack, layer by layer",
      "Read an SMTP conversation and its reply codes",
      "Publish the DNS records receivers actually check",
      "See why cloud-native AWS SES beats the mailbox-wrapper model",
    ],
    capabilities: [
      "Native AWS SES delivery, not a mailbox wrapper",
      "Guided DNS and domain verification",
      "Real-time bounce and complaint telemetry via AWS SNS",
    ],
  },
  "email-platform": {
    whyItMatters:
      "\"Send email\" can mean a dozen different things: a marketing newsletter tool, a transactional API, a bulk sender, a cold outreach engine. They are built on different assumptions, and picking the wrong category is the most expensive mistake a sender makes before writing a single message.",
    outcomes: [
      "Tell an email sending platform apart from marketing software and a raw API",
      "Send bulk or mass email without destroying your domain",
      "Decide when you need an email API versus a full platform",
      "Match the platform category to what you are actually sending",
    ],
    capabilities: [
      "Cloud-native AWS SES sending, not a mailbox wrapper",
      "Pay-as-you-go credits instead of per-seat subscriptions",
      "Built-in deliverability, personalization, and analytics",
    ],
  },
  "lead-generation": {
    plannedTopics: ["Building a clean, permission-based list", "Data enrichment without the junk", "Defining your ICP and total addressable market"],
  },
  compliance: {
    plannedTopics: ["CAN-SPAM and GDPR, in plain language", "Unsubscribe handling that stays compliant", "Reducing legal risk as you scale"],
  },
  glossary: {
    whyItMatters:
      "Email has a vocabulary of its own, and the terms are not decoration. SPF, DMARC, SCL, PTR, warm-up: each names a specific mechanism that decides whether your mail reaches the inbox. These are the canonical definitions, each linking to the guide that explains it in depth.",
    outcomes: [
      "Look up any core email or deliverability term in one place",
      "Understand what a term means before diving into the full guide",
      "See how each concept connects to the ones around it",
      "Move from a definition straight to the in-depth explanation",
    ],
  },
};

export function academyEditorial(slug) {
  return EDITORIAL[slug] ?? {};
}
