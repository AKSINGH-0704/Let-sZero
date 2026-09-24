---
product: repmail
academy: cold-email
contentType: template
slug: ai-cold-email-prompts-evidence-tone
title: "AI Cold Email Prompts: How to Specify Audience, Evidence, and Tone"
description: "Build controlled AI cold-email prompts with audience, approved evidence, tone, exclusions, blank-field behavior, and structured output."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["cold-email", "ai", "prompts", "copywriting"]
collections: ["cold-email-message-quality"]
learningPaths: ["cold-email-message-quality"]
assets:
  - type: template
    title: "Controlled AI cold-email prompt slots"
    content:
      - "Role: “You are a drafting assistant. Do not make legal, compliance, or deliverability decisions.”"
      - "Audience: define role, company segment, problem context, and exclusions."
      - "Evidence: provide source IDs and permitted observations; never infer missing facts."
      - "Message: specify offer, tone, length, one CTA, and opt-out handling."
      - "Blank behavior: return [MISSING] and explain what cannot be drafted."
      - "Output: return a claim table first, then subject, body, assumptions, and review flags."
keyTakeaways:
  - "A good prompt constrains inputs and output; it does not ask for a magical one-shot email."
  - "Source IDs and blank-field behavior make unsupported claims visible."
  - "Compliance, suppression, and deliverability decisions must stay outside the writing model."
faqs:
  - question: "Is AI-assisted outreach automatically compliant?"
    answer: "No. AI generation does not decide whether a message is lawful, truthful, properly identified, or correctly suppressed. Apply the requirements for the jurisdictions and providers involved, then record the reviewer’s decision."
  - question: "Should a human approve AI-assisted outreach?"
    answer: "Yes. A human should check evidence, recipient fit, wording, merge behavior, opt-out handling, and send controls before approval. Fluency is not evidence of accuracy."
  - question: "What should an AI cold-email prompt contain?"
    answer: "Specify the audience, approved evidence with source IDs, exclusions, offer, tone, CTA, maximum length, blank-field behavior, and a structured output format. Explicitly instruct the model not to guess."
nextStep:
  label: "Review the generated message"
  href: "/repmail/learn/cold-email/ai-generated-cold-email-review"
  description: "Apply the evidence, tone, merge, and approval gate to the draft."
---
AI cold-email prompts work best as controlled specifications. Give the model a bounded audience, approved evidence, a clear offer, and explicit failure behavior. Ask for a claim table before prose so a reviewer can see what the draft believes it knows. A prompt cannot replace source review, suppression checks, or a jurisdiction-specific compliance assessment.

## Fill the prompt slots

Define the audience first: role, company type, and the reason this segment is in scope. State what is out of scope. Next, provide only approved evidence, each with a source ID. An instruction such as “personalize this email” invites invention unless the prompt also says which facts are allowed and what to do when one is missing.

Set the message contract: one offer, one CTA, a plain tone, a maximum length, and prohibited claims. Tell the model not to claim a customer result, feature, relationship, urgency, pain, or metric unless the supplied source supports it. Tell it to convert an unsupported inference into a question or remove it.

The [opening-line framework](opening-line framework) and [CTA examples](CTA guide) can supply human writing rules. The [personalization checklist](data checklist) is the input gate, not something the model should silently perform.

## Require structured output

Request four blocks: a claim table, the draft, missing-data flags, and review questions. The claim table should include claim text, source ID, observation or inference, and permitted wording. The draft should use a blank marker when an optional field is missing. Review questions should call out ambiguous identity, stale evidence, or a CTA that asks for more than the evidence justifies.

This structure makes it easier to compare revisions and reject a fluent but unsupported sentence. It also makes your prompt testable. Use a fixed set containing a valid source, stale source, blank field, contradictory record, and unusual name. Check whether the output follows the contract rather than judging only style.

## Keep high-risk decisions outside the prompt

A writing model must not decide whether the recipient belongs on a suppression list, whether a campaign is lawful, or whether your authentication and provider requirements are met. The [AI-generated review gate](AI review gate) catches factuality and merge problems; your [compliance checklist](compliance checklist) covers the operational review. The FTC’s [CAN-SPAM guide][1] requires truthful headers and subject lines, identification, a physical address, and an easy opt-out for covered commercial email.

## Where RepMail fits

The public RepMail README documents template generation, personalized previews, spam analysis, campaign execution, telemetry, and suppression. It does not justify treating an AI prompt as an autonomous approval system or as an enrichment source. Use the prompt as a controlled input to a human-owned process.

For broader context, see the [complete guide to cold email](/repmail/learn/cold-email/complete-guide-to-cold-email) and then return to this focused workflow.


## Related resources

Use the [adjacent workflow](/repmail/learn/cold-email/ai-generated-cold-email-review) and then review the [next operational guide](/repmail/learn/cold-email/personalization-data-checklist) to keep this decision connected to the wider RepMail resource graph.

## References

[1]: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence "NIST, Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile"
[2]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC, CAN-SPAM Act: A Compliance Guide for Business"
[3]: https://github.com/AKSINGH-0704/Let-sZero/blob/main/README.md "LetsZero RepMail repository README"
