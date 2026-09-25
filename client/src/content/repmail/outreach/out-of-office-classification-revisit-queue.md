---
product: repmail
academy: outreach
contentType: template
slug: out-of-office-classification-revisit-queue
title: "Out-of-Office Classification and Revisit Queue"
description: "Out-of-Office Classification and Revisit Queue — Operators need to classify OOO dates, indefinite notices, alternate contacts, and no-action messages."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","out","office","classification"]
assets:
  - type: table
    title: "OOO Classification Decision Table"
    content:
      headers: ["Observed Reply Feature","Decision","Required Evidence","Action","Stop Condition"]
      rows:
        - ["Explicit return date provided (e.g., 'back June 15')","Revisit","Exact date or bounded range","Set Revisit Date; schedule follow-up; Evidence Confidence=High","Missing parsable date"]
        - ["Alternate contact named with email","Alternate Contact","Name + email or direct instruction to contact","Create handoff task; verify email; Evidence Confidence=High","Role only or missing email"]
        - ["Unbounded leave / 'out indefinitely' or ambiguous","Indefinite","No date or vague availability statement","Set review reminder (30–90d); Evidence Confidence=Low/Med","Explicit opt-out or new date provided"]
        - ["Explicit opt-out or 'do not contact'","No Action","Clear decline language","Tag suppression; remove from sequences; Evidence Confidence=High","Contradictory message later"]
        - ["Automated bounce / system message","No Action (or route to ops)","Non-human automated content","Suppress for delivery issues; route bounce to deliverability team if needed","If human follow-up clarifies availability"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Operators need to classify OOO dates, indefinite notices, alternate contacts, and no-action messages."
  - "Distinct from OOO article: reusable queue fields and revisit decisions."
  - "follow-up taxonomy; suppression logic"
commonMistakes:
  - "Skipping this check: Read the reply and copy the verbatim text into Source Text."
  - "Skipping this check: Decide one outcome: Revisit, Alternate Contact, Indefinite, or No Action."
  - "Skipping this check: If Revisit, normalize explicit dates to YYYY-MM-DD and set Evidence Confidence."
faqs:
  - question: "When should I prefer Indefinite over scheduling a revisit?"
    answer: "Choose Indefinite if the reply does not include a parsable date or provides vague timing (e.g., 'out for a while', 'on leave with no return date'). Indefinite signals human review rather than blind automation; set a review reminder and capture the verbatim message. For high-value prospects, prefer shorter review windows and escalate for manual outreach."
  - question: "Can I auto-schedule follow-ups from phrases like 'back in two weeks'?"
    answer: "Yes, treat clearly bounded relative phrases ('in two weeks') as acceptable for scheduling if you can reliably normalize the phrase to an ISO date at time of classification. Mark Evidence Confidence as Medium if normalized from relative text. If normalization is uncertain (ambiguous reference point or language), set to Indefinite and request human verification."
  - question: "What counts as enough evidence to hand off to an alternate contact?"
    answer: "Require a named person or role plus contact information (email or phone) and an explicit instruction to contact them. If only a role is provided without contact details, capture it and escalate for human verification before reassigning outreach."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Classify Out‑Of‑Office (OOO) replies by whether they require a scheduled revisit, immediate reassignment, suppression, or no action. This worksheet defines clear decision boundaries, the minimum evidence to act, and the queue fields to record so operators consistently recover legitimate opportunities without creating indiscriminate follow-up.

## Decision boundaries: four OOO outcomes

Define four mutually exclusive outcomes for any OOO-style reply: Revisit (scheduled follow-up), Alternate Contact (handoff), Indefinite (suppress until human review), and No Action (ignore/suppress permanently). Treat a single message as one outcome; do not apply multiple outcomes unless subsequent messages change the evidence.
Evidence limits: only use content present in the reply (dates, contact info, explicit 'no' language). Do not infer intent from previous campaign context, open rates, or sender reputation. If the reply is ambiguous, default to Indefinite for human review rather than guessing a date.
Practical sequence: 1) Extract explicit date or deadline; 2) Look for alternate contact or redirect wording; 3) Check for explicit decline/no interest language; 4) Assign one outcome and populate queue fields (see next section).

## Queue fields to capture for reproducible decisions

Capture these minimal, reusable fields on every OOO ticket: Outcome (Revisit/Alternate/Indefinite/No Action), Revisit Date (YYYY-MM-DD or blank), Alternate Contact Name, Alternate Contact Email, Source Text (copy of reply), Evidence Confidence (High/Medium/Low), and Owner. These fields keep the revisit queue actionable and auditable.
Decision boundary on Revisit Date: only set when the sender provides an explicit date or a clearly bounded range (e.g., 'back on June 15' or 'return in two weeks'). If the message says 'out for a while' or 'on leave' without a date, leave Revisit Date blank and mark Outcome as Indefinite.
Practical sequence: extract verbatim date text into Source Text, normalize to ISO date for Revisit Date when possible, set Evidence Confidence to High for explicit dates and Medium for derived ranges; assign Owner within 24 hours.

## Handling alternate contacts and handoffs

Decision boundary: classify as Alternate Contact only when the reply names a person or provides an email/phone and clearly instructs the sender to contact them (e.g., 'contact Jane at jane@company.com'). If the message suggests 'you can reach out to my team' without specifics, do not auto-handoff; mark as Indefinite.
Evidence limits: require both a clear identifier (name or role) and contact information to auto-create a handoff. If only a role is given (e.g., 'our procurement team'), capture the role in Alternate Contact Name and set Evidence Confidence to Low—route for human verification before reassigning outreach.
Practical sequence: verify alternate email format quickly (basic syntactic check), create a new contact record if unique, set Outcome to Alternate Contact, and add a follow-up task to confirm handoff within 3 business days.

## Indefinite replies and safe suppression

Decision boundary: mark Indefinite when the reply indicates unbounded unavailability ('out indefinitely', 'no timeline', 'retired') or when evidence is ambiguous and requires human judgement. Indefinite is a temporary suppress state, not permanent suppression.
Evidence limits: do not interpret polite declines as Indefinite. For explicit declines ('not interested', 'please stop'), use No Action. For messages like 'not sure when I'll be back', use Indefinite and schedule human review at a cadence (recommended 30–90 days depending on deal size).
Practical sequence: set a short human-review reminder (30 days for low value, 90 for high value), capture the reasoning in Source Text, and assign an owner to resolve whether to revisit, handoff, or permanently suppress.

## No Action: explicit declines and permanent suppression

Decision boundary: classify as No Action when the reply contains clear opt-out or refusal language (e.g., 'please stop', 'not interested', 'do not contact'). This outcome should suppress future campaign touches for the relevant product line or thread.
Evidence limits: do not treat transactional or routing replies (automated receipts, bounce notifications) as No Action unless they contain an explicit opt-out. If unsure, escalate to Indefinite rather than auto-suppressing.
Practical sequence: tag the contact with a suppression reason, record the verbatim decline in Source Text, and remove the contact from active sequences for the defined scope (product or outreach channel) immediately.

## Operational workflow and ownership

Owners: assign an operator or team to own the OOO queue with explicit SLAs (respond to new OOO items within 24 hours; resolve Indefinite items within their review window). Use Evidence Confidence to triage workload—High confidence revisits can be scheduled automatically; Low confidence items need human verification.
Sequence and stop conditions: automated scheduling should only run when Outcome is Revisit and Revisit Date is populated with High or Medium confidence. Stop conditions for automation: missing or ambiguous date, alternate contact without verified email, or explicit opt-out. Record all actions into the ticket history for auditability.

## Practical checklist

- [ ] Read the reply and copy the verbatim text into Source Text.
- [ ] Decide one outcome: Revisit, Alternate Contact, Indefinite, or No Action.
- [ ] If Revisit, normalize explicit dates to YYYY-MM-DD and set Evidence Confidence.
- [ ] If Alternate Contact, capture name, email, and validate email syntax before handoff.
- [ ] If Indefinite, set a human-review reminder (30–90 days) and assign an owner.
- [ ] If No Action, tag suppression reason and remove contact from active sequences for the relevant scope.
- [ ] Do not infer dates or intent from campaign context; use only reply text for classification.
- [ ] Log every decision and the evidence confidence level in the ticket.
- [ ] Escalate ambiguous or high-value opportunities to a senior reviewer before permanent suppression.

## Where RepMail fits

Use this worksheet as a reproducible checklist and ticket schema when you triage OOO replies in your outbound workflow. Record the specific queue fields and Evidence Confidence levels described here so revisit automation and suppression rules operate from consistent, auditable inputs. This guide is a decision aid; confirm provider-specific behaviors (e.g., mail platform automation rules) separately before enabling fully automated scheduling.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency knowledge transfer from departing account owner](/repmail/learn/outreach/agency-departing-account-owner-knowledge-transfer)
- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)


## Sources

[1]: https://mailmeteor.com/checklists/cold-email "Supporting technical or operational reference"
