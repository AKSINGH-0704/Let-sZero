---
product: "repmail"
academy: "cold-email"
contentType: "guide"
slug: "event-triggered-follow-up-taxonomy"
title: "Event-Triggered Follow-Up: A Practical Taxonomy"
description: "Design event-triggered sales follow-up with trigger families, source and freshness checks, state transitions, suppression rules, and clear owners."
authorSlug: "repmail-team"
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["event-triggered-follow-up", "sales-workflows", "revenue-operations", "outreach"]
collections: ["cold-email-message-quality", "outreach-measurement"]
learningPaths: ["cold-email-message-quality"]
assets: [{"type": "table", "title": "Trigger families and safe next actions", "content": {"headers": ["Trigger family", "Example evidence", "First action", "Stop or review condition"], "rows": [["Explicit intent", "Information request or reply", "Fulfil the request; offer one relevant next step", "The request is fulfilled or recipient declines"], ["Conversation state", "Completed call, no-show, or proposal question", "Recap, reschedule, or answer the open item", "A new state is recorded"], ["Event context", "Webinar registration or attendance", "Deliver the promised resource and segment context", "Permission or relevance is unclear"], ["External account signal", "Fresh, source-backed company change", "Verify freshness and relevance before drafting", "Signal is stale, unverified, or unrelated"]]}}]
keyTakeaways: ["Classify the event before writing the message: intent, context, lifecycle, or operational state.", "Store the source, observed time, freshness window, and owner for each trigger.", "A trigger should change the next action—not merely justify another pitch."]
faqs: [{"question": "What counts as an event trigger for sales follow-up?", "answer": "A trigger is an observable event that changes the relevance or timing of a next action, such as an explicit request, a completed meeting, a referral, an event registration, or a documented account change."}, {"question": "How do I avoid stale or misleading triggers?", "answer": "Record the source, timestamp, subject, and freshness window. Re-check external signals before sending and skip the message when the evidence is missing, stale, or unrelated to the recipient."}, {"question": "Should every trigger start an automated sequence?", "answer": "No. Some events require human review, a fulfillment response, or suppression. Add a sequence only when the trigger, audience, permissions, and stop conditions are explicit."}]
nextStep: {"label": "QA the resulting sequence", "href": "/repmail/learn/cold-email/cold-email-sequence-quality-checklist", "description": "Check evidence, timing, copy, suppression, and ownership before activation."}
---

An event-triggered follow-up email should be driven by a verified change in context, not by a desire to send another touch. Build the workflow around trigger families, then record the source, timestamp, freshness window, owner, next state, and stop condition for each trigger.

## Classify the event

Four families cover most sales follow-up workflows. **Explicit intent** includes an information request or reply and usually calls for fulfilment first. **Conversation state** includes a completed call, a no-show, or an open proposal question and calls for a recap, reschedule, or answer. **Event context** includes registration or attendance and calls for the promised resource plus a relevant optional next step. **External account signals** include a company change observed from a source; these require verification before use.

Classification matters because the same recipient should not receive the same message after every event. A request for information is a reply state. It is not permission to start an unrelated sequence. A stale company announcement is not evidence that a person has a current problem.

## Add decision rules, not just triggers

For every trigger, define what happens when the evidence is missing, stale, contradictory, or irrelevant. Record who reviews external signals and how often. Store the observed time and source URL or system event ID. Before sending, check whether the recipient has replied, opted out, entered another opportunity stage, or become suppressed.

The trigger should produce a state transition: requested information becomes fulfilled; a no-show becomes rescheduled or closed; a webinar registration becomes replay delivered; an external signal becomes verified or discarded. If no state changes, a new email may only create noise. The [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) are useful when deciding when not to send.

Use the table as a planning artifact. Then run the [sequence quality checklist](/repmail/learn/cold-email/cold-email-sequence-quality-checklist) and keep the [compliance record](/repmail/learn/compliance/cold-email-compliance-recordkeeping) aligned with the actual trigger and message. For a broader foundation, read the [complete cold-email guide](/repmail/learn/cold-email/complete-guide-to-cold-email).

## Edge cases to handle

Some events are ambiguous: a page view may be anonymous, a job change may be old, and a calendar event may have been cancelled. Treat those as review states, not send states. If two triggers arrive close together, merge them into one relevant message or let the higher-confidence state win; do not stack touches simply because two rules fired. If an event lacks an owner, source, or freshness rule, send it back for workflow design instead of automating it.

## Assign ownership

Name the person or team responsible for validating each trigger and reviewing exceptions. Automation can route a state, but it cannot repair missing context. A simple owner field, review queue, and audit trail make it easier to explain why a message was sent or why it was skipped.





## Operate the taxonomy as a decision system
This taxonomy is for lifecycle, sales, and operations teams deciding whether an event should create a message, a fulfilment task, a review item, or no action. The trigger is a state change with an owner and evidence—not a generic activity count. A page view, imported list row, or duplicated webhook can be recorded without becoming a send event.

| Trigger family | Minimum evidence | Message logic | Owner | Measurement | Stop or review rule |
| --- | --- | --- | --- | --- | --- |
| Explicit intent | Recipient request, reply ID, or recorded question | Fulfil the request before offering anything else | Reply owner or SDR | Time to fulfilment and answer-to-reply rate | Stop when fulfilled, declined, or suppressed |
| Conversation state | Meeting status, agreed next step, or proposal question | Recap the actual state; reschedule or answer one open item | Meeting owner | Completion, reschedule, and close rates | Review cancellations and duplicate meetings |
| Event context | Registration, attendance, or contribution plus program notice | Deliver promised value matched to the event state | Event owner | Resource delivery and cohort replies | Stop when promise is complete or context expires |
| External account signal | Named source, subject, observed time, and freshness window | Verify the signal, then ask a bounded relevance question | Account owner | Verified-signal rate and false-positive rate | Discard if stale, unrelated, anonymous, or disputed |
| Operational state | System event ID and a defined transition | Send only if the transition requires recipient action | Operations owner | Fulfilment time and exception rate | Review missing IDs, retries, and suppression conflicts |

For each rule, define the state before and after the event. For example, **question received → answer pending → answer sent** is different from **webinar registered → replay pending → replay delivered**. Store the event ID or source URL, observed timestamp, freshness deadline, audience lane, current suppression state, and next owner. If two events arrive within the same review window, deduplicate them or choose the higher-confidence state; do not reward the system for producing two messages.

The message must reflect the state transition. Explicit intent calls for fulfilment, a no-show calls for rescheduling or closure, a webinar registration calls for the promised resource, and a verified account change may justify one neutral relevance question. Do not use an external signal to assert that a person has a problem. If the event is ambiguous, route to review with a reason code such as `stale`, `anonymous`, `duplicate`, `cancelled`, or `suppressed`. A review state is an operational outcome, not a failed send.

Assign ownership at three levels: the source owner maintains event quality, the decision owner approves the transition and message, and the sender or fulfilment owner executes it. RevOps or automation owners preserve IDs, timestamps, retries, and suppression propagation. A rule without an accountable owner should remain inactive. Review the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) before activation and use the [sequence quality checklist](/repmail/learn/cold-email/cold-email-sequence-quality-checklist) to test message and timing logic.

Measure the full funnel by trigger family: events received, valid events, deduplicated events, review rate, sends, fulfilments, replies, positive or qualified replies, opt-outs, complaints, and suppressed skips. Sample the discarded and reviewed events; otherwise a high send rate can conceal poor source quality. Keep event-family cohorts separate so a fulfilment workflow is not judged against an external-signal campaign.

Stop automation when the source is missing, the freshness window expires, a reply or opt-out supersedes the trigger, the opportunity changes state, or the recipient’s requested action is complete. Re-enable only after a new event with a new ID or a documented human decision; never recycle an old trigger merely because the queue is empty.
## Sources

- [FTC CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [Google email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
