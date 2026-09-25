---
product: repmail
academy: lead-generation
contentType: guide
slug: intent-signal-thresholds-action
title: "Intent Signal Thresholds: When Is a Signal Strong Enough to Act?"
description: "Intent Signal Thresholds: When Is a Signal Strong Enough to Act? — Reps receive noisy alerts without agreed thresholds, recency windows, or stop rules."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["lead-generation","lead","intent","signal","thresholds"]
assets:
  - type: table
    title: "Decision/Diagnostic Table: Make-or-Suppress Logic for an Intent Alert"
    content:
      headers: ["Signal attributes","Gate checks (Strength / Age / Stop rule)","Action","Owner & SLA"]
      rows:
        - ["High strength (top band), event <48h, no prior outreach","Pass / Pass / False","Create AE task","AE — 2 hours"]
        - ["Medium strength, event <7 days, no prior outreach","Pass / Pass / False","Route to SDR queue","SDR — 24 hours"]
        - ["Medium strength, event 8–30 days, prior outreach <14 days","Pass / Maybe / True","Suppress and annotate (re-evaluate 30 days)","Operations — archival"]
        - ["Low strength, event <72h, no disqualifiers","Fail / Pass / False","Nurture list with automated sequence","Marketing — 7 days"]
        - ["Any strength, company flagged as disqualified (e.g., wrong vertical)","N/A / N/A / True","Discard or mark as do-not-contact","Operations — no SLA"]
featured: false
collections: ["list-quality-operations"]
learningPaths: ["list-quality-and-suppression"]
keyTakeaways:
  - "Reps receive noisy alerts without agreed thresholds, recency windows, or stop rules."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Links intent to routing and SLA."
commonMistakes:
  - "Skipping this check: Document the numeric strength threshold (X) and the vendor metric used to calculate it."
  - "Skipping this check: Assign a recency window (Y days) for each intent event type and document the rationale."
  - "Skipping this check: List and codify stop rules that suppress or retire alerts (recent outreach, closed-lost, disqualification)."
faqs:
  - question: "How do I pick an initial numeric threshold when vendor scores are relative?"
    answer: "Pick a threshold that limits alerts to a volume your team can handle under your SLA, then test. Treat vendor scores as rank-order indicators; run a pilot split by score band and measure contact and qualification rates. Adjust so the marginal cost of following an extra alert aligns with the marginal value of the leads you expect to generate. Note: vendor scores are directional—validate within your environment [1]."
  - question: "What stop-rule timing should I use for prior outreach?"
    answer: "Common operational choices are 7–14 days to prevent duplicate early outreach, and 30–90 days for re-evaluation if a contact ignored prior attempts. Choose short windows for high-urgency signals and longer windows where the buying cycle is typically slow. Record and review these timings regularly; there is no one-size-fits-all legal or vendor-defined interval."
  - question: "Should every alert generate a task for a rep?"
    answer: "No. Only alerts that pass strength, recency, and stop-rule gates should generate immediate tasks. Others should be routed to nurture, logged for review, or suppressed. This reduces alert fatigue and ensures rep time is spent on signals with higher expected yield."
nextStep:
  label: "Continue with Bounce Webhook Idempotency and Suppression State"
  href: "/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use explicit thresholds, recency windows, and stop rules so reps treat an intent alert as an operational signal rather than a suggestion. A usable decision boundary combines (1) minimum signal strength, (2) maximum age, and (3) a stop condition tied to routing and SLA—if any of those fail, deprioritize or discard the alert.

## Define the decision boundary: three minimal parameters

An actionable intent alert must clear three gates: a strength threshold (the measured signal is at or above X), a recency window (the event occurred within Y days), and a stop rule (previous outreach, disqualifying company signals, or conflicting routing). Document exact values for X and Y and list the stop-rule causes that produce an automatic no-contact decision. Evidence limits: most intent providers report relative scores or event counts; treat those as ordinal, not absolute, and record the vendor metric you used to set X.

Practical sequence: map common incoming alert types to a single triage template. For each alert, record the vendor metric, timestamp, and any existing engagement tags. Apply the three gates in order; only if all pass does the alert become a prospecting task routed to a rep under the SLA.

## Choose thresholds from operational constraints, not vendor defaults

Set thresholds to match rep capacity and expected conversion yield rather than vendor-recommended levels alone. Start with a conservative threshold that limits alerts to what your team can follow up on within the SLA, then lower it if conversion rates and reach capacity allow. Evidence limits: vendor scores are directional—use them for ranking but validate by testing within your stack and tracking actual outcomes [1].

Practical sequence: run a 4‑week pilot with two bands (high and medium). Route only high-band signals to senior reps and medium-band to an SDR queue. Measure contact rate and qualified leads per band; adjust thresholds based on observed yield and cost-per-contact.

## Define recency windows tied to signal type and sales cycle

Different kinds of intent events need different Y values. High-urgency signals like product trials or RFP uploads require short windows (24–72 hours). Lower-urgency signals such as content downloads or visiting multiple pages can use longer windows (7–30 days). Evidence limits: these are operational heuristics—vendor event timestamps indicate activity recency but not buying stage or intent persistence.

Practical sequence: classify incoming events into urgency buckets, assign a recency window to each, and expire alerts automatically when they exceed Y. Log expirations so you can analyze whether longer or shorter windows improve conversion.

## Explicit stop rules: when to suppress or retire an alert

Stop rules prevent noisy repeats and wasted outreach. Typical stop conditions: a contact attempted within the last N days, a closed-lost/opportunity on record, company-level disqualification (e.g., wrong vertical), or conflicting outreach ownership. Operationalize these as boolean checks before creating a task.

Practical sequence: implement stop-rule checks in the routing step. If any stop rule is true, annotate the alert with the reason and either suppress it, route it to low-priority nurture, or set a re-evaluate timer depending on the cause (for example re-evaluate after 90 days for a previously unresponsive contact).

## Routing and SLA: tie thresholds to who gets what and when

Decide what passes the gates for each routing lane: senior AE, SDR, or nurture. For example, high-strength+short-recency may go to AE with a 2‑hour SLA; medium strength with short recency to SDR with a 24‑hour SLA; anything else to nurture with a 7‑day review. Evidence limits: SLA targets are internal service levels—they should reflect rep availability and sales cycle length, not vendor scoring alone.

Practical sequence: publish a routing matrix that maps score bands and recency buckets to recipients and SLAs. Monitor SLA adherence and conversion, and iterate thresholds if queues become backlogged or conversion falls below expectations.

## Testing, measurement, and iteration

Measure three operational KPIs by threshold band: contact rate (attempts per alert), positive engagement rate (meaningful responses or meetings), and qualified-opportunity rate. Use these to compute yield per alert and cost-per-qualified-lead, and adjust thresholds to optimize for your target metric.

Practical sequence: run 6–8 week A/B tests of threshold and recency combinations. Keep all other variables constant (cadence, messaging, routing). Record provider metric values so you can map them back to vendor signals and update the threshold definitions based on actual yield.

## Practical checklist

- [ ] Document the numeric strength threshold (X) and the vendor metric used to calculate it.
- [ ] Assign a recency window (Y days) for each intent event type and document the rationale.
- [ ] List and codify stop rules that suppress or retire alerts (recent outreach, closed-lost, disqualification).
- [ ] Create a routing matrix mapping score+recency to recipient lanes and SLA targets.
- [ ] Pilot thresholds with a controlled sample and measure contact, engagement, and qualification rates.
- [ ] Log alert outcomes and expirations for weekly review and threshold tuning.
- [ ] Implement automated pre-routing checks for stop rules and recency expiry.
- [ ] Set re-evaluation timers for suppressed alerts (e.g., 30/90/180 days depending on cause).
- [ ] Train reps on the decision boundary and require annotation of handled alerts for feedback.

## Where RepMail fits

Use this guide as a checklist and decision aid when integrating intent alerts into an outbound workflow. The three-gate decision boundary and routing matrix can be implemented as a pre-processing step before alerts are converted into rep tasks or messages, reducing noisy inbox items and aligning follow-up with internal SLAs. Do not assume any specific RepMail feature or integration beyond using the checklist to inform your routing and SLA rules.

Continue with [Bounce Webhook Idempotency and Suppression State](/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression) for the next step in the workflow.

## Related RepMail guides

- [Contact-to-Account Matching When Domains Are Ambiguous](/repmail/learn/lead-generation/contact-to-account-matching-ambiguous-domains)
- [Data Freshness SLA for Prospect Lists](/repmail/learn/lead-generation/data-freshness-sla-prospect-lists)


## Sources

[1]: https://6sense.com/glossary/inbound-sales/ "Supporting technical or operational reference"
[2]: https://business.linkedin.com/sales-solutions/sales-navigator-customer-hub/resources/inmail-best-practices "Supporting technical or operational reference"
