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
];

const DIVIDER = "=".repeat(72);
const SUBDIV  = "-".repeat(72);

console.log(DIVIDER);
console.log("RepMail — AI Template Quality Audit (new prompts, 2026-06-16)");
console.log(`10 scenarios across all 6 campaign types and 4 tones`);
console.log(DIVIDER);

const results = [];

for (let i = 0; i < scenarios.length; i++) {
  const s = scenarios[i];
  console.log(`\n[${i + 1}/10] ${s.label}`);
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
