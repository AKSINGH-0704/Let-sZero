// AI template quality audit — generates 10 sample emails using new prompts.
// Run: railway run node tmp/test-sample-generation.mjs
import { generateTemplate, validateTemplate } from "../server/ai.js";

const scenarios = [
  {
    label: "B2B outreach — SaaS sales tool, VP of Sales, professional",
    intake: {
      recipientDescription: "VP of Sales at a Series B SaaS company with 20–40 sales reps",
      valueProposition: "RepMail automates personalised outreach sequences without making them feel automated — single template, per-contact substitution, real reply-to routing",
      objectiveType: "book a discovery call",
      objectiveDetail: "15-min intro call to see if there is a fit",
      relevanceReason: "Sales teams at this stage typically see reply rates drop as headcount grows past 20 reps",
    },
    senderContext: { name: "Aisha Kumar", title: "Account Executive", company: "RepMail" },
    campaignType: "b2b_outreach",
    tone: "professional",
  },
  {
    label: "B2B outreach — HR tech / recruiter tool, Head of People, friendly",
    intake: {
      recipientDescription: "Head of People at a 50–200 person startup currently scaling their team",
      valueProposition: "RepMail helps HR teams run sourcing outreach at volume without losing the personal tone that gets replies",
      objectiveType: "short demo",
      objectiveDetail: "10-min screen share",
    },
    senderContext: { name: "Marcus Lee", title: "Founder", company: "RepMail" },
    campaignType: "b2b_outreach",
    tone: "friendly",
  },
  {
    label: "Recruitment — senior backend engineer, IC role",
    intake: {
      recipientDescription: "Senior backend engineer with 6+ years at FAANG or a well-funded startup",
      valueProposition: "Senior IC role at a fast-moving B2B startup — remote-first, competitive equity, direct impact",
      objectiveType: "exploratory conversation",
      objectiveDetail: "15-min call, no formal interview process yet, just exploring fit",
      roleSummary: "Senior Backend Engineer, fully remote, Series A, strong equity, 6-figure base",
    },
    senderContext: { name: "Priya Sharma", title: "Head of Talent", company: "Stackflow" },
    campaignType: "recruitment",
    tone: "professional",
  },
  {
    label: "Partnership — marketing agency, rev-share proposal",
    intake: {
      recipientDescription: "Founder or BD lead at a B2B marketing or demand-gen agency",
      valueProposition: "RepMail offers white-label and rev-share arrangements for agencies whose clients need outbound tooling",
      objectiveType: "explore partnership",
      objectiveDetail: "30-min call to see if a referral or white-label arrangement makes sense",
    },
    senderContext: { name: "Tom Reid", title: "Head of Partnerships", company: "RepMail" },
    campaignType: "partnership",
    tone: "professional",
  },
  {
    label: "Follow-up — no reply to initial B2B email, 7 days later",
    intake: {
      recipientDescription: "Director of Sales Operations at a 100-person B2B company",
      valueProposition: "RepMail replaces disconnected spreadsheet tracking with a single campaign view per rep",
      objectiveType: "follow up to previous outreach",
      previousContext: "Sent an intro email 7 days ago about sales ops tooling, no reply",
    },
    senderContext: { name: "Aisha Kumar", title: "Account Executive", company: "RepMail" },
    campaignType: "follow_up",
    tone: "professional",
  },
  {
    label: "Real estate — residential seller inquiry",
    intake: {
      recipientDescription: "Homeowner who listed a 3-bedroom property in South Mumbai 2 weeks ago",
      valueProposition: "A qualified buyer in their price range wants a private viewing before the open house",
      objectiveType: "schedule a private viewing",
      objectiveDetail: "weekend or early next week",
    },
    senderContext: { name: "Kabir Mehta", title: "Property Consultant", company: "Prime Realty" },
    campaignType: "real_estate",
    tone: "professional",
  },
  {
    label: "B2B outreach — fintech compliance, CCO, formal",
    intake: {
      recipientDescription: "Chief Compliance Officer at a 100–500 person fintech company",
      valueProposition: "Automated email compliance audit trails meeting FCA and SEC record-keeping requirements — no IT project required",
      objectiveType: "15-minute compliance review call",
      relevanceReason: "New FCA email record-keeping guidelines take effect Q3 2026",
    },
    senderContext: { name: "Sarah Thornton", title: "Compliance Solutions Director", company: "AuditPath" },
    campaignType: "b2b_outreach",
    tone: "formal",
  },
  {
    label: "Recruitment — SDR role, recent graduate, friendly",
    intake: {
      recipientDescription: "Recent graduate or 1–2 year sales professional looking for their first SDR role at a SaaS company",
      valueProposition: "SDR role with structured coaching from a former Salesforce CRO, clear path to AE in 12 months",
      objectiveType: "brief intro call",
      roleSummary: "SDR, fully remote, Series A SaaS, strong coaching culture, base + variable + equity",
    },
    senderContext: { name: "James Okafor", title: "Talent Acquisition Lead", company: "Momentum CRM" },
    campaignType: "recruitment",
    tone: "friendly",
  },
  {
    label: "Partnership — SaaS native integration, casual",
    intake: {
      recipientDescription: "Product lead or co-founder at a CRM or outreach tool serving SMB sales teams",
      valueProposition: "A native integration between our tools would eliminate manual CSV exports for shared customers — both sides benefit",
      objectiveType: "technical integration discussion",
      objectiveDetail: "30-min product call to sketch out what a native integration would look like",
    },
    senderContext: { name: "Elena Vasquez", title: "Co-founder", company: "RepMail" },
    campaignType: "partnership",
    tone: "casual",
  },
  {
    label: "General outreach — solo founder managing own sales, casual",
    intake: {
      recipientDescription: "Pre-Series A startup founder who handles all outbound sales personally",
      valueProposition: "RepMail helps solo founders run outbound that reads like a direct message, not a campaign — without hiring a SDR",
      objectiveType: "live product walkthrough",
      objectiveDetail: "20-min demo, no pitch deck, just the product",
    },
    senderContext: { name: "Abhishek Singh", title: "Founder", company: "RepMail" },
    campaignType: "general",
    tone: "casual",
  },

  // ── Scenarios 11–20 ────────────────────────────────────────────────────────
  {
    label: "B2B outreach — AI analytics tool, Head of Data, professional",
    intake: {
      recipientDescription: "Head of Data at a 200-500 person e-commerce company running on Shopify",
      valueProposition: "Real-time cohort analysis with no BI team required — connects directly to Shopify data in under 10 minutes",
      objectiveType: "book a 20-minute product demo",
      relevanceReason: "Mid-size e-commerce teams typically outgrow Shopify Analytics by $5M GMV but can't justify a full BI stack",
    },
    senderContext: { name: "Natalia Kwan", title: "Head of Sales", company: "Cohort AI" },
    campaignType: "b2b_outreach",
    tone: "professional",
  },
  {
    label: "Recruitment — product designer, Series B startup, friendly",
    intake: {
      recipientDescription: "Senior product designer with 5+ years at a consumer app or fintech company",
      valueProposition: "First design hire at a Series B fintech — full ownership of the product design system, direct CEO access",
      objectiveType: "30-minute portfolio chat",
      objectiveDetail: "Informal conversation, no case study required yet",
      roleSummary: "Senior Product Designer, remote-friendly, $140-165k base, strong equity package",
    },
    senderContext: { name: "Rachel Torres", title: "Head of Talent", company: "PayRoute" },
    campaignType: "recruitment",
    tone: "friendly",
  },
  {
    label: "Follow-up — second touch after conference meeting, professional",
    intake: {
      recipientDescription: "VP of Engineering at a logistics company, met briefly at AWS re:Invent",
      valueProposition: "Infrastructure cost reduction tool — customers typically save 30-40% on compute within 90 days",
      objectiveType: "follow up to brief in-person meeting",
      previousContext: "Had a 5-minute conversation at the AWS booth, exchanged cards, they expressed interest in seeing the dashboard",
    },
    senderContext: { name: "Daniel Osei", title: "Enterprise Account Executive", company: "CloudBridge" },
    campaignType: "follow_up",
    tone: "professional",
  },
  {
    label: "B2B outreach — legal tech / CLM tool, General Counsel, formal",
    intake: {
      recipientDescription: "General Counsel at a 500-2000 person technology company managing 200+ vendor contracts",
      valueProposition: "Contract lifecycle management that cuts average contract turnaround from 14 days to 3 days — no change to existing approval workflows",
      objectiveType: "30-minute workflow review call",
      relevanceReason: "GDPR and CCPA renewal cycles are creating a bottleneck for GCs managing high contract volumes",
    },
    senderContext: { name: "Fiona Halvorsen", title: "Enterprise Sales Director", company: "ClauseIQ" },
    campaignType: "b2b_outreach",
    tone: "formal",
  },
  {
    label: "Partnership — accounting software referral, casual",
    intake: {
      recipientDescription: "Founder or managing partner at a boutique accounting or CFO-as-a-service firm",
      valueProposition: "Our accounts payable automation tool helps their SMB clients reduce manual invoice processing — referral arrangement available",
      objectiveType: "explore referral or white-label partnership",
      objectiveDetail: "20-min call to explore if there's a fit for their client base",
    },
    senderContext: { name: "Yusuf Adebayo", title: "Partnerships Lead", company: "FinFlow" },
    campaignType: "partnership",
    tone: "casual",
  },
  {
    label: "Real estate — commercial property owner, professional",
    intake: {
      recipientDescription: "Owner of a 10,000+ sqft commercial warehouse in a logistics corridor currently sitting empty",
      valueProposition: "A logistics company needs immediate short-term storage space — 6-month lease, full rent upfront",
      objectiveType: "arrange a site visit",
      objectiveDetail: "Flexible timing this week or next",
    },
    senderContext: { name: "Marcus Webb", title: "Commercial Property Consultant", company: "Meridian Realty" },
    campaignType: "real_estate",
    tone: "professional",
  },
  {
    label: "Recruitment — senior data engineer, remote-first, professional",
    intake: {
      recipientDescription: "Senior data engineer with 4+ years working on data pipelines at a tech company, likely passively looking",
      valueProposition: "Senior Data Engineer role building the data infrastructure from scratch at a Series A health-tech startup — Spark, Kafka, dbt stack",
      objectiveType: "brief intro call",
      objectiveDetail: "20 minutes — no commitment, just exploring",
      roleSummary: "Senior Data Engineer, fully remote, Series A, health-tech, $150-175k, equity",
    },
    senderContext: { name: "Aisha Brennan", title: "Technical Recruiter", company: "PulseHealth" },
    campaignType: "recruitment",
    tone: "professional",
  },
  {
    label: "B2B outreach — cybersecurity / endpoint protection, CISO, formal",
    intake: {
      recipientDescription: "CISO or VP of Security at a financial services firm with 1000+ employees",
      valueProposition: "Zero-trust endpoint protection that deploys in under 48 hours with no agent install on end-user devices",
      objectiveType: "15-minute security briefing call",
      relevanceReason: "SEC cybersecurity disclosure rules effective December 2023 require faster incident detection and reporting",
    },
    senderContext: { name: "Christopher Lane", title: "VP of Sales", company: "Sentinel Zero" },
    campaignType: "b2b_outreach",
    tone: "formal",
  },
  {
    label: "General outreach — SaaS founder selling to marketing teams, casual",
    intake: {
      recipientDescription: "Marketing director or VP of Marketing at a B2B SaaS company running performance campaigns",
      valueProposition: "UTM parameter management and attribution reporting in one place — replaces four spreadsheets with a single source of truth",
      objectiveType: "live walkthrough of the attribution dashboard",
      objectiveDetail: "15-min screen share, I'll show the report for a campaign like theirs",
    },
    senderContext: { name: "Leila Nasser", title: "Co-founder", company: "TrackStack" },
    campaignType: "general",
    tone: "casual",
  },
  {
    label: "Follow-up — no reply after 10 days, warm intro context, professional",
    intake: {
      recipientDescription: "CFO at a 50-person professional services firm",
      valueProposition: "Accounts receivable automation — reduces average days sales outstanding by 12 days",
      objectiveType: "follow up to previous outreach",
      previousContext: "Sent intro email 10 days ago via a warm introduction from their VP of Operations — no reply yet",
    },
    senderContext: { name: "Priya Menon", title: "Account Executive", company: "InvoiceFlow" },
    campaignType: "follow_up",
    tone: "professional",
  },
];

const DIVIDER = "=".repeat(72);
const SUBDIV  = "-".repeat(72);

console.log(DIVIDER);
console.log("RepMail — AI Template Quality Audit v2 (post-placeholder-fix, 2026-06-17)");
console.log(`20 scenarios across all 6 campaign types and 4 tones`);
console.log(DIVIDER);

const results = [];

for (let i = 0; i < scenarios.length; i++) {
  const s = scenarios[i];
  console.log(`\n[${i + 1}/20] ${s.label}`);
  console.log(SUBDIV);

  try {
    const t0 = Date.now();
    const raw = await generateTemplate(s.intake, s.tone, {
      campaignType:  s.campaignType,
      senderContext: s.senderContext,
    });
    const ms = Date.now() - t0;

    const validation = validateTemplate(raw.subject, raw.body, {
      campaignType: s.campaignType,
      intake:       s.intake,
    });

    const wordCount = raw.body.trim().split(/\s+/).filter(Boolean).length;
    const errors    = validation.warnings.filter(w => w.severity === "error");
    const warns     = validation.warnings.filter(w => w.severity === "warn");

    console.log(`SUBJECT : ${raw.subject}`);
    console.log(`MODEL   : ${raw._model}  |  words: ${wordCount}  |  latency: ${ms}ms  |  hardBlocked: ${validation.hardBlocked}`);
    console.log(`\nBODY:\n${raw.body}`);

    if (errors.length > 0) {
      console.log("\n⛔ ERRORS:");
      errors.forEach(e => console.log(`   [${e.code}] ${e.message}`));
    }
    if (warns.length > 0) {
      console.log("\n⚠  WARNINGS:");
      warns.forEach(w => console.log(`   [${w.code}] ${w.message}`));
    }
    if (validation.warnings.length === 0) {
      console.log("\n✓  VALIDATION CLEAN");
    }

    results.push({ label: s.label, subject: raw.subject, wordCount, hardBlocked: validation.hardBlocked, errors: errors.length, warnings: warns.length });

  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    results.push({ label: s.label, error: err.message });
  }

  console.log(DIVIDER);
}

console.log("\n=== SUMMARY TABLE ===");
console.log("No | Words | Err | Warn | Subject");
console.log("-".repeat(72));
results.forEach((r, i) => {
  if (r.error) {
    console.log(`${String(i + 1).padStart(2)} | ERROR  |  -  |  -   | ${r.error.slice(0, 50)}`);
  } else {
    const blocked = r.hardBlocked ? " [BLOCKED]" : "";
    console.log(`${String(i + 1).padStart(2)} | ${String(r.wordCount).padStart(5)} |  ${r.errors}  |  ${r.warnings}   | ${r.subject}${blocked}`);
  }
});
console.log("\n=== Done ===");
