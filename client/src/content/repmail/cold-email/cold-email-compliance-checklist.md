---
contentType: guide
slug: cold-email-compliance-checklist
title: "Cold Email Compliance: CAN-SPAM, GDPR and the Rest"
description: "Cold email is legal in most places, with conditions. Here is what CAN-SPAM, GDPR and PECR each actually require, and the checklist that satisfies all three."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["compliance", "cold-email", "gdpr", "can-spam", "legal"]
keyTakeaways:
  - "Cold B2B email is legal in the US, the UK and the EU, but each regime attaches different conditions to it."
  - "CAN-SPAM does not require consent. GDPR does not ban cold email; it requires a lawful basis, and legitimate interest can be one."
  - "The requirements that appear in every regime are: identify yourself honestly, make opting out easy, and honour it promptly."
  - "This is general information, not legal advice. Where the stakes are high, ask a lawyer who knows your jurisdiction."
prerequisites:
  - label: "Google and Yahoo sender requirements"
    href: "/repmail/learn/deliverability/google-yahoo-sender-requirements"
commonMistakes:
  - "Assuming GDPR forbids cold email outright. It regulates the processing of personal data and provides legitimate interest as a lawful basis for B2B outreach."
  - "Relying on a footer unsubscribe link alone when the recipient's provider expects one-click unsubscribe headers."
  - "Using a false or unmonitored From address, or omitting a real postal address, both of which are explicit CAN-SPAM violations."
  - "Treating a purchased list as compliant because the vendor said so. The obligation sits with the sender, not the seller."
  - "Continuing to mail an address after an opt-out because it was re-imported from a different list."
faqs:
  - question: "Is cold email actually legal?"
    answer: "In the United States, yes, under CAN-SPAM, which permits unsolicited commercial email provided you meet its conditions. In the UK and EU, B2B cold email to a business address is generally permissible under legitimate interest, with stricter rules for individuals and sole traders. Several other jurisdictions — Canada under CASL is the clearest example — require consent, which changes the analysis substantially."
  - question: "Does GDPR ban cold email?"
    answer: "No. GDPR governs how you process personal data, and a work email address that identifies a person is personal data. It requires a lawful basis for processing, and legitimate interest is a recognised basis for B2B outreach where the recipient would reasonably expect it and your interest does not override their rights. You must document that assessment, tell people how you obtained their data, and honour objections immediately."
  - question: "What must every cold email contain?"
    answer: "Across all the regimes discussed here: an honest From address and subject line, a clear identification of who is sending, a genuine physical postal address, and a working way to opt out that is honoured promptly. Those four cover the common ground."
  - question: "How quickly must I honour an unsubscribe?"
    answer: "CAN-SPAM allows ten business days. Gmail and Yahoo's bulk sender rules require two days. GDPR expects objections to be honoured without undue delay. The practical answer is immediately and automatically, because the strictest applicable standard is the one you have to meet anyway."
  - question: "Can I email a purchased list?"
    answer: "Legally it varies by jurisdiction, and practically it is a bad idea regardless. Purchased lists carry high bounce rates and spam traps, which damages the domain reputation everything else depends on. Compliance liability also stays with you: a vendor's assurance is not a defence."
nextStep:
  label: "Next: build a list you can actually stand behind"
  href: "/repmail/learn/cold-email/complete-guide-to-cold-email"
  description: "Compliance is much easier when the list was built deliberately rather than bought."
assets:
  - type: checklist
    title: Pre-send compliance checklist
    content:
      - "The From name and address identify a real person or team at your company, and the mailbox is monitored."
      - "The subject line describes the message honestly and does not imply an existing relationship that does not exist."
      - "The message states who you are and what your company does, in the body, without the recipient having to work it out."
      - "A genuine physical postal address is included."
      - "An unsubscribe mechanism is present, works, and requires no login or reply to use."
      - "List-Unsubscribe headers are set, not just a footer link."
      - "Opt-outs are recorded centrally and enforced at send time, across every list and campaign."
      - "You can state where each contact's data came from and why you believe you may contact them."
      - "Recipients in consent-based jurisdictions are excluded unless you have consent."
      - "Nothing in the message misrepresents your product, your identity, or the reason you are writing."
  - type: table
    title: What each regime asks of you
    content:
      headers: ["Regime", "Applies to", "Consent needed?", "Core obligations"]
      rows:
        - ["CAN-SPAM (US)", "Commercial email to US recipients", "No", "Honest headers, identify sender, postal address, working opt-out honoured within 10 business days"]
        - ["GDPR (EU/EEA)", "Processing personal data of people in the EU", "No, if legitimate interest applies", "Lawful basis, documented assessment, transparency about data source, honour objections promptly"]
        - ["PECR (UK)", "Electronic marketing to UK recipients", "Not for corporate bodies", "Stricter for individuals and sole traders; identify sender; provide opt-out"]
        - ["CASL (Canada)", "Commercial electronic messages to Canadian recipients", "Yes, express or implied", "Consent, identification, and an unsubscribe honoured within 10 days"]
---

Cold email occupies an awkward place in most people's understanding of the law: widely practised, widely assumed to be either completely fine or completely forbidden, and rarely looked at closely. The reality is more specific and more manageable than either belief.

In most of the markets a B2B team cares about, cold outreach is lawful — with conditions attached. The conditions differ by jurisdiction, but they overlap enough that a single sensible operating standard satisfies nearly all of them. What follows is that standard, and the reasoning behind it.

One caveat first, meant sincerely rather than as boilerplate: this is general information written by engineers, not legal advice. If you are operating at scale, in a regulated sector, or in a jurisdiction not discussed here, the cost of an hour with a lawyer is trivial against the cost of getting it wrong.

## CAN-SPAM: permission is not the issue, honesty is

The United States regime is the most permissive of the major frameworks and the most widely misunderstood, usually in the direction of assuming it is stricter than it is.

CAN-SPAM does not require consent. You may send commercial email to someone who never asked for it. What it requires is that you do so without deceiving them. The From address and the routing information must be accurate. The subject line must not misrepresent what the message is about. You must identify the message as a commercial solicitation, disclose who is sending it, and include a genuine physical postal address. You must provide a working opt-out, and honour it within ten business days.

Most cold email that gets companies into trouble under CAN-SPAM fails on the honesty requirements rather than the mechanical ones. A subject line implying a prior conversation that never happened, a From name chosen to look like a personal contact, an unmonitored reply address — these are the violations that matter, and they are also the practices that produce spam complaints, which is not a coincidence.

## GDPR: a lawful basis, not a prohibition

The European position causes the most confusion, largely because "GDPR" gets used as shorthand for "you cannot email people", which is not what it says.

GDPR governs the processing of personal data. A named person's work email address is personal data, so building a prospect list and mailing it is processing, and processing requires a lawful basis. Consent is one lawful basis. It is not the only one, and for B2B outreach it is usually not the relevant one.

The relevant basis is **legitimate interest**. Direct marketing is explicitly recognised as capable of being a legitimate interest. To rely on it you need to have actually done the assessment: identified your interest, considered whether the processing is necessary to achieve it, and weighed it against the recipient's rights and reasonable expectations. A senior decision-maker at a company that plausibly needs what you sell, contacted at their work address about their professional role, sits comfortably inside that. An individual at a personal address, contacted about something unrelated to their work, does not.

Three obligations follow and are frequently skipped. You must be able to say **where you got the data** — and tell the recipient if they ask. You must make objecting easy and honour it immediately, without the balancing test being reopened. And you must be able to show your reasoning: an assessment you never wrote down is difficult to rely on later.

The UK adds PECR alongside GDPR. Its practical effect for B2B senders is that corporate subscribers are treated more permissively than individuals and sole traders, so segmenting those out is worth the effort.

## The requirements that appear everywhere

Read across the regimes and the same handful of obligations keep reappearing, in different language. That overlap is the useful part, because meeting the strictest version of each is simpler than maintaining four separate compliance postures.

**Be honestly identifiable.** Real sender, real company, real reply address, a subject line that describes the message. No regime permits deception, and no filter rewards it either.

**Include a real postal address.** Explicit under CAN-SPAM, and good practice everywhere. It is a small trust signal and its absence is an easy violation to prove.

**Make opting out trivial, and honour it fast.** The legal deadlines vary from immediately to ten business days. The mailbox providers now require two. Since the strictest applicable standard is the one you must meet, the only sane implementation is automatic and immediate — and the friction you remove converts complaints into quiet opt-outs, which protects the domain.

**Know your list's provenance.** Under GDPR this is a formal obligation. Everywhere else it is the difference between a list you can defend and one you cannot. It is also the best available predictor of bounce rate, which is why the compliance answer and the deliverability answer point the same way.

## Compliance and deliverability are the same work

The most useful thing to notice about all of this is that almost none of it is in tension with performance.

Honest headers reduce complaints. Easy unsubscribe reduces complaints. A list built deliberately bounces less, which protects your domain reputation, which is the thing that determines whether any of your mail arrives. The regulatory floor and the deliverability floor turn out to be roughly the same floor, approached from different directions.

The practices that create legal exposure — bought lists, misleading subject lines, unsubscribe links that quietly do nothing — are the same practices that destroy sending reputations. Teams that treat compliance as a checkbox exercise separate from deliverability usually end up doing the work twice.

RepMail adds the standard `List-Unsubscribe` and `List-Unsubscribe-Post` headers to every campaign message, and maintains a workspace-wide suppression list that is enforced at send time — so an opt-out or a complaint on one campaign is honoured on every later one, including lists imported afterwards. Bounces and complaints are suppressed automatically from the delivery telemetry rather than needing manual cleanup. What the platform cannot do is tell you your lawful basis, or vouch for where a list came from; that judgement stays with the sender.
