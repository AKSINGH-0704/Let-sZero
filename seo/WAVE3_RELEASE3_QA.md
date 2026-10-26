# Wave 3 Release 3 QA

Date: 2026-10-26

## Scope

Release 3 adds 12 evidence-qualified RepMail Resource Center articles using the existing Markdown frontmatter, collections, learning paths, metadata, canonical, sitemap, RSS, JSON-LD, related-content, and prerender architecture. No existing article was rewritten.

## New articles


- `repmail-do-you-need-mailbox-for-sending-domain` — `repmail/infrastructure/repmail-do-you-need-mailbox-for-sending-domain.md`
- `repmail-merge-fields-explained` — `repmail/email-platform/repmail-merge-fields-explained.md`
- `how-to-send-mass-email-safely` — `repmail/deliverability/how-to-send-mass-email-safely.md`
- `can-you-send-bulk-email-legally` — `repmail/compliance/can-you-send-bulk-email-legally.md`
- `legitimate-mass-email-sending` — `repmail/compliance/legitimate-mass-email-sending.md`
- `smtp-reply-codes-explained` — `repmail/glossary/smtp-reply-codes-explained.md`
- `queued-email-meaning` — `repmail/glossary/queued-email-meaning.md`
- `email-headers-explained` — `repmail/glossary/email-headers-explained.md`
- `dpdp-rule-15-cross-border-transfer` — `repmail/compliance/dpdp-rule-15-cross-border-transfer.md`
- `dpdp-act-extraterritorial-scope` — `repmail/compliance/dpdp-act-extraterritorial-scope.md`
- `free-bulk-email-limits` — `repmail/email-platform/free-bulk-email-limits.md`
- `how-many-free-emails-can-you-send` — `repmail/email-platform/how-many-free-emails-can-you-send.md`

## Gates

- Draft QA: 12/12 passed; 0 errors.
- Canonical QA: 12/12 new articles; 0 failures; 0 warnings.
- Full Vitest: 107/107 files passed; 1,659/1,659 tests passed.
- Production build: 650/650 routes prerendered.
- Sitemap: 650 URLs generated.
- RSS: 609 RepMail items generated.
- Internal-link graph: 4/4 tests passed after correcting collection hub route shapes.

## Safety

- `Blogs.docx` was not modified.
- Google Ads, consent, pricing, payments, authentication, analytics, and application architecture were not modified.
- No real signup, purchase, campaign, or account-setting action was performed.
- No fabricated traffic, ranking, conversion, or performance metric is claimed. Stored search observations are treated as qualitative evidence only.
