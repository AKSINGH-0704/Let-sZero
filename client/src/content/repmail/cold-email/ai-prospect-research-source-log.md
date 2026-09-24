---
product: repmail
academy: cold-email
contentType: template
slug: ai-prospect-research-source-log
title: "AI Prospect Research: Source Log for Outreach Facts"
description: "Use a source log to turn prospect research into dated, reviewable outreach facts without turning snippets into unsupported claims."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["cold-email", "ai", "research", "evidence"]
collections: ["cold-email-message-quality"]
learningPaths: ["cold-email-message-quality"]
assets:
  - type: template
    title: "Prospect research source log fields"
    content:
      - "Record entity, claim, source URL, page title, checked date, and event date."
      - "Label observation, inference, or unknown."
      - "Assign confidence and the exact wording allowed in outreach."
      - "Record reviewer, invalidation reason, and next review date."
      - "Before drafting, mark claims whose source no longer supports them as invalid."
      - "Link the approved source ID to the final draft and reviewer decision."
keyTakeaways:
  - "A source log turns a research snippet into a reviewable evidence record."
  - "The source being available is not proof that it supports the wording."
  - "Invalidate claims when pages change, disappear, or no longer support the observation."
faqs:
  - question: "Is AI-assisted outreach automatically compliant?"
    answer: "No. AI generation does not decide whether a message is lawful, truthful, properly identified, or correctly suppressed. Apply the requirements for the jurisdictions and providers involved, then record the reviewer’s decision."
  - question: "Should a human approve AI-assisted outreach?"
    answer: "Yes. A human should check evidence, recipient fit, wording, merge behavior, opt-out handling, and send controls before approval. Fluency is not evidence of accuracy."
  - question: "What belongs in an AI prospect research source log?"
    answer: "Store the entity, exact claim, URL, page title, checked date, event date if known, observation or inference label, confidence, allowed wording, reviewer, and invalidation status."
nextStep:
  label: "Review AI-generated email"
  href: "/repmail/learn/cold-email/ai-generated-cold-email-review"
  description: "Use the approved source IDs to review every claim in the rendered message."
---
An AI prospect research source log is a small evidence ledger between web research and outreach copy. It prevents a search snippet, stale page, or model paraphrase from becoming an unsupported personalization claim. Because demand for this topic is unmeasured, use the log as an operational control rather than as a promise of better campaign performance.

## Capture the evidence before drafting

For each observation, record the entity, exact claim, source URL, page title, date checked, event date if known, and reviewer. Add a source ID that can travel into the prompt and draft. Quote or summarize narrowly enough that another reviewer can open the page and see why the claim is allowed.

Label the claim as an observation, inference, or unknown. “The company lists a security engineering role” is an observation. “The team is struggling with security” is an inference. “They need our product now” is unknown unless the recipient says so. The [personalization data checklist](personalization data checklist) provides complementary checks for relevance and data quality.

## Add permitted wording and an invalidation step

The ledger should say not just what the source contains, but how it may be used. For example: “May mention the listed role as a question; may not claim hiring urgency.” Add confidence and a next-review date appropriate to the source. When a page changes, disappears, expires, or stops supporting the claim, mark the record invalid. Do not quietly retain the old wording.

An invalid source should trigger one of three actions: remove the claim, re-research it, or rewrite it as a question that does not pretend to know the answer. A model should receive only approved records and should be told to return a source ID for each factual sentence. NIST’s [Generative AI Profile][1] emphasizes lifecycle risk management; the [FTC advertising guidance][2] reinforces that commercial claims must not be deceptive.

## Connect the log to approval

After generation, open every cited source and compare it with the rendered message. Check the company, person, role, date, and implied pain. Then record the reviewer, material edits, decision, and reason. The [AI email review checklist](AI email review checklist) is the final factuality and merge gate.

Do not scrape or store more personal information than the task needs. A source log is not permission to collect sensitive data. Keep access limited, document retention, and follow your organization’s applicable privacy review.

## Where RepMail fits

RepMail’s public documentation describes campaign execution, delivery events, suppression, and AI features for templates, previews, and spam analysis. Those capabilities do not create source provenance. Keep the ledger external to the model and make approval a human decision.

For broader context, see the [complete guide to cold email](/repmail/learn/cold-email/complete-guide-to-cold-email) and then return to this focused workflow.


## Related resources

Use the [adjacent workflow](/repmail/learn/cold-email/personalization-data-checklist) and then review the [next operational guide](/repmail/learn/cold-email/ai-generated-cold-email-review) to keep this decision connected to the wider RepMail resource graph.

## References

[1]: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence "NIST, Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile"
[2]: https://www.ftc.gov/business-guidance/advertising-marketing "FTC, Advertising and Marketing"
[3]: https://github.com/AKSINGH-0704/Let-sZero/blob/main/README.md "LetsZero RepMail repository README"
