---
product: repmail
academy: email-platform
contentType: knowledge-base
slug: repmail-merge-fields-explained
title: 'RepMail Merge Fields: How Recipient Data Enters a Template'
description: Learn how RepMail merge fields map contact and sender data into templates,
  resolve at send time, and behave when a placeholder is unknown.
authorSlug: repmail-team
publishedAt: '2026-10-26'
updatedAt: '2026-10-26'
tags:
- email merge fields
- mail merge placeholders
- email personalization variables
- RepMail
- email templates
collections:
- email-platform-essentials
learningPaths:
- email-infrastructure
keyTakeaways:
- RepMail supports eight fixed recipient and sender placeholders.
- Recipient values come from the mapped contact row; sender values come from the selected
  sender profile.
- Substitution occurs when RepMail prepares the outbound message for each recipient.
- AI previews show examples but do not replace the saved send template with a per-recipient
  AI rewrite.
- Unknown or missing fields should be treated as a review issue before sending.
commonMistakes:
- Typing a placeholder with the wrong braces or spelling.
- Assuming an arbitrary contact-column name is a supported merge field.
- Checking only one preview contact and missing blank or malformed data in another
  row.
- Confusing an AI personalization preview with the content actually used for sending.
- Leaving optional fields in sentences that become awkward when the value is missing.
faqs:
- question: Can I create a custom RepMail merge field?
  answer: 'The supported RepMail field set is fixed: four recipient fields and four
    sender fields. Do not assume an arbitrary column name will resolve as a placeholder.'
- question: When are merge fields replaced?
  answer: RepMail replaces supported placeholders when it prepares the saved template
    for each recipient at send time.
- question: Does AI rewrite every email differently for each recipient?
  answer: No. AI preview can show up to three personalized examples, while outbound
    sending uses the saved template and each recipient’s merge fields.
- question: What should I do if a placeholder does not resolve?
  answer: Check the exact placeholder spelling, the mapped contact row, and the selected
    sender profile. Replace unsupported placeholders or remove the affected sentence
    before sending.
nextStep:
  label: Prepare your personalization data
  href: /repmail/learn/cold-email/personalization-data-checklist
  description: Use the checklist to verify contact fields before building a RepMail
    campaign.
assets:
- type: checklist
  title: RepMail merge-field pre-send checklist
  content:
    items:
    - Use only the eight supported placeholders.
    - Confirm each recipient placeholder has a mapped contact value or an intentional
      blank-value plan.
    - Confirm sender placeholders match the selected sender profile.
    - Check braces and spelling exactly.
    - Preview at least three representative contact rows.
    - Read the rendered message for empty values, punctuation problems, and unnatural
      wording.
    - Remove or replace any unsupported placeholder.
    - Review the final sender, recipients, and template before sending.
---

RepMail merge fields are fixed placeholders that RepMail replaces with contact or sender data when an email is sent. For example, `{{name}}` can become `Jordan Lee`, while `{{company}}` can become `Northstar Labs`. The saved template stays reusable; each recipient receives values from the mapped contact row and sender profile.

Updated October 26, 2026.

## Supported RepMail merge fields

RepMail currently supports these eight plain-text placeholders:

| Placeholder | Value source | Example result |
|---|---|---|
| `{{name}}` | Recipient record | Jordan Lee |
| `{{email}}` | Recipient record | jordan@example.com |
| `{{company}}` | Recipient record | Northstar Labs |
| `{{category}}` | Recipient record | SaaS |
| `{{sender_name}}` | Sender profile | Avery Chen |
| `{{sender_title}}` | Sender profile | Partnerships Lead |
| `{{sender_company}}` | Sender profile | RepMail |
| `{{sender_phone}}` | Sender profile | +1 555 010 0142 |

Recipient fields come from the contact data mapped to the campaign. Sender fields come from the selected sender profile. A field is therefore a contract between the template and the data available at send time—not a request for RepMail to infer missing information.

For a broader explanation of how sending systems fit together, see [Email Platform Essentials](/repmail/learn/collections/email-platform-essentials). For practical input preparation, use the [Personalization Data Checklist](/repmail/learn/cold-email/personalization-data-checklist).

## What happens at send time

Suppose a campaign contains this template:

```text
Hi {{name}},

I noticed that {{company}} works in {{category}}. Would a short conversation be useful?

Best,
{{sender_name}}
{{sender_title}}, {{sender_company}}
```

The mapped contact row is:

| name | company | category | email |
|---|---|---|---|
| Jordan Lee | Northstar Labs | SaaS | jordan@example.com |

The selected sender profile contains Avery Chen, Partnerships Lead, and RepMail. RepMail substitutes those values when it prepares the outbound message. The resulting text is approximately:

```text
Hi Jordan Lee,

I noticed that Northstar Labs works in SaaS. Would a short conversation be useful?

Best,
Avery Chen
Partnerships Lead, RepMail
```

This substitution is deterministic for the saved template and mapped data. An AI preview can show up to three personalized examples, but the preview does not rewrite every outbound email. Sending uses the saved template and each recipient’s merge fields.

## Choosing and checking fields

Use a field only when the corresponding data is consistently available. Before sending:

1. Identify the source column or sender-profile value for every placeholder.
2. Confirm the spelling and braces exactly: `{{company}}`, not `{company}` or `{{ organisation }}`.
3. Preview several contacts, including records with short names, missing optional values, and unusual company names.
4. Check the rendered subject and body for awkward punctuation or empty-looking sentences.
5. Send only after confirming the correct sender profile and recipient mapping.

The [email personalization data checklist](/repmail/learn/cold-email/personalization-data-checklist) is useful when contact data is being prepared outside the campaign editor. If your workflow involves AI-generated content or external processors, review the [AI outreach data-deletion and subject-request guidance](/repmail/learn/cold-email/ai-outreach-data-deletion-subject-request) as a separate data-handling step.

## What happens with unknown or missing placeholders

Do not assume that any column name can become a merge field. RepMail’s supported field set is fixed as listed above.

The AI-generated-template validation path hard-blocks unknown placeholders. The ordinary campaign submission path is different: it does not perform the same cross-reference validation, and known replacement behavior can result in an empty value when data is unavailable. In practical terms, an unfamiliar placeholder may not produce the value you expect, especially in a manually submitted template.

Treat an unresolved placeholder as a send-blocking review item. Replace it with a supported field, supply the missing contact data, or remove the sentence. Do not rely on a recipient seeing the placeholder exactly as typed.

## A practical decision procedure

Use this sequence for every new template:

**If the value belongs to the recipient:** select one of `name`, `email`, `company`, or `category`, then verify that the contact row contains it.

**If the value belongs to the sender:** select one of `sender_name`, `sender_title`, `sender_company`, or `sender_phone`, then verify the selected sender profile.

**If the value is neither:** write it as fixed text or revise the data model. Do not invent a new placeholder.

**If the value is optional:** decide whether the sentence still reads correctly when it is absent. If not, collect the data before sending or remove that sentence.

**If a preview looks wrong:** inspect the mapped row, placeholder spelling, selected sender profile, and final rendered message in that order.

Merge fields solve data insertion; they do not validate the quality, accuracy, permission, or legal basis of the underlying contact data. Those questions require a separate review of your outreach process.

## Sources

[1]: https://www.reddit.com/r/MailChimp/comments/1nvjx9a/merge_tags_in_to_field/
[2]: https://www.reddit.com/r/MailChimp/comments/1nczl4c/merge_fields/
