---
product: repmail
academy: compliance
contentType: guide
slug: processor-controller-outreach-role-map
title: "Processor vs. Controller Role Map for Outreach Vendors"
description: "Processor vs. Controller Role Map for Outreach Vendors — Teams struggle to assign roles when a platform selects means, uses data, or sends on instructions."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","processor","controller","role"]
assets:
  - type: table
    title: "Processor vs Controller Diagnostic Table"
    content:
      headers: ["Activity","Who decides purpose?","Who decides means/implementation?","Role likely","Contract action"]
      rows:
        - ["Sending using your uploaded lists and templates","You","You (vendor follows instructions)","Processor","Standard DPA; audit & deletion clauses"]
        - ["Vendor’s proprietary audience scoring that triggers sends","Vendor (scoring purpose)","Vendor (algorithm & thresholds)","Controller or joint controller","Controller agreement; assign DS rights responsibilities"]
        - ["Delivery optimization (vendor automatically changes cadence/volume)","You (overall campaign goal) or Vendor (if autonomous)","Vendor (if it changes cadence without instruction)","Processor if instructed; controller if autonomous","Require opt-in for optimization; DPA + operational gates"]
        - ["Data enrichment from third-party append services","You (decide to enrich) or Vendor (if they trigger enrichment)","Vendor (selection of third-party enrichers)","Processor if you direct; controller if vendor chooses and uses independently","Prohibit independent enrichment in DPA or require subprocessors disclosure"]
        - ["Consent capture via vendor-hosted form","Depends (who designs purpose and messaging)","Vendor controls the form and storage","Controller for capture activity if vendor determines wording/storage","Controller agreement or clear responsibilities in contract"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Teams struggle to assign roles when a platform selects means, uses data, or sends on instructions."
  - "Distinct from vendor due diligence: determines legal role and obligations."
  - "Link to DPA checklist, ROPA, and vendor review."
commonMistakes:
  - "Skipping this check: Inventory outreach tasks and label who sets purpose and who sets means for each task."
  - "Skipping this check: Request and archive configuration snapshots, change logs, and API permission records from the vendor."
  - "Skipping this check: Identify any vendor features that autonomously modify segmentation, templates, or cadence; require explicit opt-in for autonomous optimization."
faqs:
  - question: "If a vendor offers an 'autopilot' optimization feature, does that make them a controller?"
    answer: "It depends on control and instruction: if autopilot acts without your documented, specific instructions and makes decisions about who receives messages or how personal data is profiled, that behavior points toward controller activity for those functions. If autopilot runs only within parameters you set and stays strictly within documented instructions, it is more consistent with a processor role. Treat ambiguous cases conservatively and require opt-in and visibility into decisions."
  - question: "Can one vendor be a processor for some tasks and a controller for others?"
    answer: "Yes. Roles can be task-specific: a vendor may process sends under instruction (processor) while independently running consent capture or audience scoring (controller). Document per-activity roles, split contractual arrangements accordingly, and ensure responsibilities for data subject rights are allocated and recorded."
  - question: "What evidence should we keep to defend our classification?"
    answer: "Keep configuration snapshots, permission and API key records, change logs showing who altered segmentation or templates, onboarding emails that assign responsibilities, and written approvals for any autonomous features. Also retain contractual language that constrains vendor autonomy. If evidence is incomplete, escalate governance and tighten contractual and operational controls."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Decide controller vs. processor by mapping who chooses the means of processing, who sets purposes, and who exercises decision-making about personal data handling. Use this role map to assign contract clauses, audit rights, and operational owners so your outreach vendors are governed consistently and defensibly.

## Decision boundary: means versus purpose

The core legal distinction hinges on who determines the purposes of processing (why data is used) and who determines the means (how it is done). If your organization sets both the purposes and the key means, you are a controller; if the vendor only acts on instructions about purpose and the controller sets the means, the vendor is a processor. Where a vendor chooses significant technical or operational means independently, they may be a joint controller or a controller for those activities.
Be explicit about which choices count as 'means' in outreach: template selection, send cadence, segmentation logic, bounce handling, and data enrichment can each influence whether a vendor is making operational choices. Treat any vendor decision that has material influence on how personal data is collected, profiled, or disclosed as potential 'means' rather than a mere implementation detail.

## Evidence limits and how to gather it

Document the vendor’s operational autonomy using configuration records, runbooks, and historic logs that show who set defaults and who changed them. Evidence should answer: who configured segmentation rules; who enabled automated AI personalization; who controlled delivery throttles; and who initiated data enrichment jobs. Where vendor marketing or contracts are silent, rely on system traces and change logs.
Understand the limits of evidence: provider documentation may not reflect current custom settings and marketing claims are not determinative of legal role. When evidence is ambiguous, treat the relationship as potentially joint or controller and increase contractual protections and governance until clarified.

## Practical sequence to determine role

Step 1: Map functional tasks (list collection, segmentation, template design, sending, suppression, tracking, enrichment). For each task note who decides the purpose and who decides the method. Step 2: Collect objective artifacts (UI permission records, API keys, change logs, onboarding emails, contract clauses). Step 3: Apply the decision boundary: if vendor decides both purpose and means for any task, treat them as a controller for that task; if vendor only acts on documented instructions, treat them as processor.
Step 4: If mixed responsibilities exist across tasks, document per-task roles and require either a joint controller agreement or split contracts and appropriate DPAs. Record stop conditions — e.g., vendor begins auto-optimizations without documented instruction — that trigger reclassification and contractual escalation.

## Operational controls and contract implications

If the vendor is a processor, require a Data Processing Agreement (DPA) that limits scope, prohibits independent repurposing, requires subprocessors list, and sets audit and deletion obligations. If the vendor is a controller or joint controller for certain activities, negotiate a controller–controller (or joint controller) agreement that allocates responsibilities for data subject rights, lawful basis, and breach notifications.
Specify operational controls: who must approve templates, who can alter segmentation logic, how consent signals are communicated, and which logs must be retained. Prefer explicit approval gates for any automated optimization features and require the vendor to surface decisions that materially affect recipients so you can evidence control or instruction.

## Examples (labeled) to illustrate edge cases

Example 1 — Processor: A vendor sends messages using lists and templates you supply, follows send schedules you configure, and performs delivery using fixed throttles you set; they do not independently enrich or profile. This maps to a processor role for sending.
Example 2 — Joint controller/controller: A vendor runs proprietary audience scoring that they design and use to decide sends without your instruction; they also collect consent via their widget. For those scoring and collection activities they act as a controller or joint controller. Treat other activities separately and document accordingly.

## Practical checklist

- [ ] Inventory outreach tasks and label who sets purpose and who sets means for each task.
- [ ] Request and archive configuration snapshots, change logs, and API permission records from the vendor.
- [ ] Identify any vendor features that autonomously modify segmentation, templates, or cadence; require explicit opt-in for autonomous optimization.
- [ ] Match role findings to contract type: DPA for processor activities; controller agreements for controller/joint controller activities.
- [ ] Mandate subprocessors list, audit rights, and deletion/return procedures in the DPA.
- [ ] Define operational approval gates (templates, segments, enrichment feeds) and responsible internal owners.
- [ ] Set monitoring triggers (unexpected sends, new enrichment source, sudden permission changes) that escalate to legal/compliance.
- [ ] Record stop conditions that switch a task’s role classification and require immediate contractual/operational review.
- [ ] Link role map outputs to ROPA, vendor review, and your DPA checklist for ongoing governance.

## Where RepMail fits

Use this guide as an operational checklist and diagnostic when reviewing or onboarding outreach vendors. Map task-level roles into your ROPA, vendor review, and DPA checklist so outreach governance, audit rights, and escalation paths are captured in workflows. Do not assume provider claims determine legal status; rely on configuration evidence and documented instructions when operationalizing outbound controls.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [Adequacy Decision vs. Safeguard: Cross-Border Routing Choice](/repmail/learn/compliance/adequacy-vs-safeguard-cross-border-routing)
- [B2B Corporate Subscriber vs. Individual Address: PECR Routing](/repmail/learn/compliance/b2b-corporate-subscriber-vs-individual-address)


## Sources

[1]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/ "UK Information Commissioner guidance"
