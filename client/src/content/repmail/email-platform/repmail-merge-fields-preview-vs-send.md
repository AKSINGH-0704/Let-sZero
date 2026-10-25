---
product: repmail
academy: email-platform
contentType: tutorial
slug: repmail-merge-fields-preview-vs-send
title: Merge Fields Work in Preview but Fail on Send
description: Learn why merge fields can look correct in preview but render incorrectly
  in a sent email, and follow a checklist to trace data, template, and recipient issues.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- merge fields
- email personalization
- troubleshooting
- RepMail
collections:
- email-platform-essentials
learningPaths:
- email-infrastructure
keyTakeaways:
- A preview may show sample contact data, while a final send uses the saved template
  and each recipient’s available data.
- Check the exact message location, affected contact, field mapping, blank values,
  and saved template in that order.
- A literal placeholder, blank value, and incorrect value suggest different causes;
  inspect the final rendered message.
- RepMail previews sample personalized examples; its AI preview does not rewrite outbound
  messages.
commonMistakes:
- Assuming one successful preview proves every recipient has the same field data.
- Checking the message body but not a personalized subject or recipient header.
- Editing the template without confirming the saved campaign version.
- Treating an empty source value as a template-rendering failure.
- Assuming an undocumented custom field is a supported standard placeholder.
faqs:
- question: Why does a merge field look right in preview but appear blank when sent?
  answer: The preview may use a contact with a populated value, while the recipient’s
    record has a blank value or a different field mapping. Check that recipient’s
    source data and mapping first.
- question: What should I do if the sent email contains the literal placeholder?
  answer: Check the token spelling and whether it is supported, then confirm the saved
    template contains the intended token. Inspect the final rendered message to determine
    whether the issue is limited to one location.
- question: Does RepMail’s AI preview change the email sent to each recipient?
  answer: No. RepMail’s AI preview shows sample personalized examples; outbound messages
    use the saved template with per-recipient merge fields.
nextStep:
  label: Review RepMail’s workflow
  href: /repmail/learn/cold-email/where-repmail-fits-in-your-workflow
  description: See how templates and campaign review fit into the broader sending
    workflow.
assets:
- type: checklist
  title: Merge-field mismatch checklist
  content:
  - Locate the mismatch — Record whether it appears in the subject, recipient header,
    or body, and note the exact field.
  - Verify the preview contact — Confirm which contact supplied the preview value
    and compare it with the affected recipient.
  - Inspect data and mapping — Check that the affected contact has a value in the
    source column mapped to the intended field.
  - Check for blanks — Decide whether to complete the data, revise optional-field
    wording, or exclude the contact.
  - Confirm saved template state — Reopen the saved campaign and verify the placeholder
    and its location.
  - Inspect the final message — Determine whether the result is a literal token, blank,
    or incorrect value; investigate the corresponding cause.
---

A correct preview does not prove that every recipient’s final email will contain the same values. Preview may show a sample contact, while the send uses the saved template and recipient data available at send time. To find the difference, check the exact final message, confirm the field mapping and value for the affected recipient, then verify that the saved template contains the merge field you intended.

## Diagnose the mismatch in order

Start with one affected recipient and one specific field. Record what the preview showed, what the recipient received, and the exact placeholder or field name involved. Avoid changing several fields at once: that makes it harder to tell which change resolved the problem.

Then work through these checks:

1. **Identify where the problem appears.** Is it in the subject, a recipient header such as the To field, or the message body? A field that works in the body may still be handled differently in another part of the message. Check the final recipient view, not just the editor’s preview.
2. **Check which contact the preview used.** Confirm the preview represents the affected recipient, or inspect a preview for that recipient if your sending system offers one. A sample contact with complete information can conceal missing data in another record.
3. **Check the source data and mapping.** Find the affected contact in the imported or selected list. Confirm the source column has the expected value and that it is mapped to the field referenced in the template. Similar names, extra spaces, or a column that was not mapped as intended can produce a mismatch.
4. **Check for a blank value.** If the recipient’s field is empty, the send may have no value to insert. Decide whether to fill the missing data, revise the wording so the field is optional, or exclude that contact. Do not assume the preview’s sample value exists for every recipient.
5. **Check the saved version.** Confirm that the version you previewed is also the version saved for the campaign. Reopen the saved campaign or template and verify the field is still present in the correct location. If you edited after previewing, preview the saved version again.
6. **Inspect the final rendered message.** Use the message received by the affected recipient, or a safely controlled test recipient where appropriate, to see whether the field stayed as a literal placeholder, became blank, or inserted the wrong value. Those outcomes point to different causes.

## Read the symptom before changing anything

A literal token such as `{{company}}` in the message suggests that the field was not replaced in that part of the final content. Check the exact spelling and whether that placeholder is supported by the sending system. A blank where a value should be points first to the recipient record or field mapping. A plausible but incorrect value points to the source row, mapping, or contact selection.

For example, suppose the preview shows “Hello Northstar” but the sent message says “Hello ”. Check whether the affected recipient’s company field is populated, whether the imported company column maps to that field, and whether the campaign used the saved template that you previewed. Do not replace the placeholder with fixed text just to make one preview look right; that would hide the data problem rather than resolve it for other recipients.

If the issue is in a subject or recipient header rather than the body, treat that as a separate location to test. A successful body preview is not evidence that a header field resolved correctly. Community questions about merge tags in the To field and custom merge fields illustrate these distinct troubleshooting cases; they do not establish that all platforms handle them identically.[1][2]

## RepMail merge fields: preview versus send

RepMail by LetsZero previews up to three personalized examples and sends the saved template with per-recipient merge fields. The AI preview is a sample feature; it does not change how outbound emails are sent. For diagnosis, compare the saved template and the affected recipient’s mapped contact data with the actual rendered email rather than treating an AI-generated sample as the final send.

RepMail’s documented standard placeholders include `{{name}}`, `{{email}}`, `{{company}}`, and `{{category}}`, as well as sender fields: `{{sender_name}}`, `{{sender_title}}`, `{{sender_company}}`, and `{{sender_phone}}`. Check the supported field list and spelling before using a token. If your template uses a custom field that is not among the documented placeholders, do not assume it will resolve as a standard merge field.

For a broader view of where sending, templates, and review fit together, see [Where RepMail fits in your workflow](/repmail/learn/cold-email/where-repmail-fits-in-your-workflow). Teams with multiple reviewers can also use the [cross-border agency review workflow](/repmail/learn/outreach/agency-cross-border-review-workflow) as context for checking campaign content before launch. If the investigation shifts from personalization to delivery configuration, consult the separate guides to [SES configuration-set routing](/repmail/learn/infrastructure/aws-ses-configuration-sets-routing) and [SES sandbox readiness](/repmail/learn/infrastructure/aws-ses-sandbox-production-readiness); those topics do not diagnose a merge-field mismatch.

## Before you send again

Correct the underlying cause first: update the field value or mapping, use a supported placeholder, or revise the saved template. Then preview the saved version using representative contact data and inspect a final rendered message for a controlled recipient. Confirm the subject, recipient header, and body independently if each uses personalization.

If only some recipients are affected, compare one affected contact with one contact that rendered correctly. Look for differences in source values and mappings before making a broad template change. If every recipient is affected in the same way, review the saved template and placeholder spelling first. This is a practical way to narrow the cause; it is not a guarantee that those checks cover every platform-specific issue.

## Sources

[1]: https://www.reddit.com/r/MailChimp/comments/1nvjx9a/merge_tags_in_to_field/
[2]: https://www.reddit.com/r/MailChimp/comments/1nczl4c/merge_fields/
