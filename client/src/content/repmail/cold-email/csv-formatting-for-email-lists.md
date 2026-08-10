---
contentType: knowledge-base
slug: csv-formatting-for-email-lists
title: CSV Formatting Mistakes That Break Cold Campaigns
description: "Broken merge fields, hidden whitespace and smart quotes cause more failed cold emails than spam filters do. Here is how to clean a file before import."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["csv", "list-building", "personalization", "cold-email", "data-quality"]
keyTakeaways:
  - "A merge field that fails renders as \"Hi ,\" — which tells the recipient they are on a list more clearly than anything else in the message."
  - "Trailing whitespace and non-breaking spaces are invisible in a spreadsheet and break exact matching."
  - "Save as CSV UTF-8. A default Excel export mangles accented names into unreadable characters."
  - "Always send a test to yourself first and read the rendered message, not the template."
prerequisites:
  - label: "Build and verify the list first"
    href: "/repmail/learn/cold-email/build-and-verify-a-cold-email-list"
commonMistakes:
  - "Leaving the header row as the spreadsheet exported it, so the column is \"First Name \" with a trailing space and the merge field never matches."
  - "Using full names in a first-name column, producing \"Hi Sarah Chen-Watanabe,\" in a message meant to sound personal."
  - "Company names carrying legal suffixes — \"Acme Corp Pvt Ltd\" — inside a sentence written for \"Acme\"."
  - "Exporting from Excel without choosing UTF-8, which turns accented and non-Latin names into replacement characters."
  - "Smart quotes and em dashes pasted from a document, which render inconsistently across mail clients."
  - "Assuming a blank cell is safe. It usually produces a grammatically broken sentence rather than an empty one."
faqs:
  - question: "What breaks most often?"
    answer: "Whitespace, by a wide margin. A trailing space in a header or a value is invisible in every spreadsheet application and defeats exact matching, so the merge field silently falls back to empty. The second most common is a first-name column containing full names, which produces a greeting no human would write."
  - question: "How should I handle missing values?"
    answer: "Decide before you import, not after. Either exclude the contact from a campaign that depends on that field, or write the sentence so it reads correctly when the value is absent. A fallback of \"there\" is better than nothing but is widely recognised; the strongest option is to segment the incomplete rows into a campaign that does not use the field at all."
  - question: "Does file encoding really matter?"
    answer: "Yes, and it is the failure most likely to reach real recipients, because it only becomes visible on names your test row did not include. Save as CSV UTF-8 explicitly. A default Excel export uses a regional encoding that renders accented and non-Latin characters as replacement symbols in the delivered message."
  - question: "Should company names be cleaned?"
    answer: "If you use them in a sentence, yes. Data providers return legal entity names, so a template reading \"I saw {{company}} is hiring\" becomes \"I saw Acme Corporation Pvt Ltd is hiring\". Strip the suffixes into a separate display column and keep the legal name if you need it elsewhere."
nextStep:
  label: "Next: personalization that survives scale"
  href: "/repmail/learn/cold-email/personalize-cold-email-at-scale"
  description: "Clean data is what makes personalization possible. This is what to do with it."
assets:
  - type: checklist
    title: Pre-import file check
    content:
      - "Saved as CSV UTF-8, not the default spreadsheet export."
      - "Header row contains no leading or trailing spaces and matches your merge fields exactly."
      - "One email address per row, one column, no combined cells."
      - "First-name column contains first names only — no full names, no titles."
      - "Company column holds a display name, with legal suffixes stripped."
      - "Names are cased as a human would write them, not ALL CAPS or all lowercase."
      - "No smart quotes, em dashes or non-breaking spaces carried over from a document."
      - "Blank cells identified, and either excluded or handled by the copy."
      - "Duplicates removed across the whole file."
      - "A test send to yourself has been read as the recipient sees it."
  - type: table
    title: What each mistake produces in the delivered message
    content:
      headers: ["In the file", "What the recipient reads", "Fix"]
      rows:
        - ["Header \"First Name \" (trailing space)", "Hi ,", "Trim every header cell"]
        - ["first_name = \"Sarah Chen\"", "Hi Sarah Chen,", "Split full names into separate columns"]
        - ["first_name = \"SARAH\"", "Hi SARAH,", "Normalise capitalisation on import"]
        - ["company = \"Acme Corp Pvt Ltd\"", "…saw Acme Corp Pvt Ltd is hiring", "Keep a cleaned display-name column"]
        - ["Blank first_name", "Hi ,", "Exclude the row or rewrite the opening line"]
        - ["Non-UTF-8 export", "Hi Jos?, / Hi JosÃ©,", "Save explicitly as CSV UTF-8"]
        - ["Smart quotes from a document", "Inconsistent glyphs across clients", "Paste as plain text before saving"]
---

This is the least interesting article in this library and probably the one that will save you the most embarrassment. Spam filters get the attention, but a large share of cold emails that fail do so before deliverability is involved at all: they arrive perfectly, in the inbox, reading `Hi ,` — and the recipient learns everything they need to know about how the message was produced.

A broken merge field is worse than no personalisation. A message that opens `Hi there,` is neutral. A message that opens `Hi ,` is a confession.

## Whitespace is the main offender

The single most common cause of a failed merge is a space you cannot see.

Spreadsheet exports routinely carry trailing whitespace in header cells, so a column that looks like `First Name` is actually `First Name `. Merge fields match exactly, the lookup fails, and the field resolves to empty for every row in the file. Nothing in the spreadsheet indicates a problem, and the template looks correct, because the template *is* correct.

The same applies to values. A contact whose first name is `Sarah ` will merge as `Sarah ` — usually harmless, occasionally not, and always a sign the file was not cleaned. Non-breaking spaces, which arrive when data is pasted from a web page, are worse: they look identical to a normal space and match nothing.

Trim every header and every value on import. If your spreadsheet tool has a `TRIM` function, run it across the whole sheet before exporting; it costs one step and removes an entire category of failure.

## Names are data, not text

The second most common problem is treating a name column as though it contains what its label says.

A `first_name` column populated from a data provider frequently contains full names, and the resulting greeting — `Hi Sarah Chen,` — is subtly wrong in a way that reads as automated, because no human writes that. All-caps values from CRM exports produce `Hi SARAH,`. Titles produce `Hi Dr. Chen,` in a message otherwise written to be informal.

Company names have the same problem in a more visible place. Providers return legal entity names, so a sentence written for `Acme` becomes `I noticed Acme Corporation Private Limited is hiring`. Keep two columns if you need the legal name: one for records, one for use in sentences.

The general rule is that any value you drop into the middle of a sentence must already read like something a person would type there. If it needs cleaning to read naturally, clean it in the file, not in the copy.

## Encoding, and why it fails late

File encoding is the mistake most likely to reach real recipients, because it usually survives testing.

Default spreadsheet exports use a regional encoding rather than UTF-8. Plain ASCII names pass through unharmed, which is why a test row called `John Smith` proves nothing. Names containing accented or non-Latin characters — `José`, `Müller`, `Łukasz`, any name in a non-Latin script — are mangled into replacement characters that arrive in the delivered message.

Save as **CSV UTF-8** explicitly, every time. Then include a name with a non-ASCII character in your test send, so that the check actually exercises the failure mode.

Smart quotes and em dashes belong in the same category. Copied from a document, they render inconsistently across mail clients and occasionally as literal escape sequences. If any part of your file passed through a word processor, paste it as plain text before saving.

## Decide about blanks before you import

Missing values are inevitable in any list of real size. What matters is that you decide what happens to them deliberately.

There are three defensible options. Exclude contacts missing a field the campaign depends on, and send them a different campaign. Write the sentence so it reads correctly when the value is empty — which usually means moving the merge field out of the opening line. Or use a fallback, accepting that `Hi there,` is widely recognised as a fallback and buys you very little.

What is not defensible is finding out at send time. A blank cell in a `{{company}}` field does not produce a sentence with a gap; it produces a sentence that is grammatically broken, and it goes to everyone in the file who is missing that value.

## Always read the rendered message

Every one of these failures is caught by the same thirty-second check: send the campaign to yourself, with a handful of real rows including at least one awkward one, and read the message that arrives.

Not the template. The rendered message, in a real inbox, as the recipient will see it. Every problem described in this article is obvious at that moment and invisible before it.

RepMail validates placeholders at generation and again at send: a template containing a merge field the list cannot fill is blocked rather than delivered with a gap, so `Hi ,` does not reach a recipient. Uploads are checked per address with duplicate detection inside the file, and the campaign confirmation screen shows the effective From address and the rendered result before anything is sent. The file hygiene above is still worth doing — the platform can stop a broken merge, but it cannot tell that `SARAH` should have been `Sarah`.
