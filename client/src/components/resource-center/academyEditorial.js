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
    plannedTopics: ["SMTP and SES fundamentals", "Dedicated vs shared IPs", "Scaling your sending architecture safely"],
  },
  "lead-generation": {
    plannedTopics: ["Building a clean, permission-based list", "Data enrichment without the junk", "Defining your ICP and total addressable market"],
  },
  compliance: {
    plannedTopics: ["CAN-SPAM and GDPR, in plain language", "Unsubscribe handling that stays compliant", "Reducing legal risk as you scale"],
  },
};

export function academyEditorial(slug) {
  return EDITORIAL[slug] ?? {};
}
