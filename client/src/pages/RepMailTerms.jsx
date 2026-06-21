import { Link } from "wouter";

export default function RepMailTerms() {
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ background: "#06060B", color: "#C8C8D8", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ background: "rgba(6,6,11,0.92)", borderColor: "#1A1A2E" }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/app/dashboard">
            <img
              src="/repmail-logo.png"
              alt="RepMail"
              className="h-9 w-auto cursor-pointer"
              style={{ objectFit: "contain" }}
            />
          </Link>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#8888A0" }}>
            <Link href="/repmail/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/app/dashboard">
              <span
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                style={{ background: "rgba(0,229,200,0.1)", border: "1px solid rgba(0,229,200,0.25)", color: "#00E5C8" }}
              >
                Dashboard
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/repmail-logo.png" alt="RepMail" className="h-8 w-auto" style={{ objectFit: "contain" }} />
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "rgba(0,229,200,0.06)", border: "1px solid rgba(0,229,200,0.15)", color: "#00E5C8", letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            RepMail · Legal
          </div>
        </div>
        <h1
          className="text-4xl md:text-5xl font-extrabold mb-4"
          style={{ color: "#F0F0F5", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
        >
          RepMail Terms of Service
        </h1>
        <p className="text-base mb-2" style={{ color: "#7878A0" }}>
          Last updated: June 2026 &nbsp;·&nbsp; Binding on all RepMail accounts
        </p>
        <p className="text-base leading-relaxed" style={{ color: "#A8A8C0" }}>
          These Terms govern your use of the RepMail email outreach platform operated by
          LetsZero Technologies. By creating an account or sending a campaign, you accept these
          Terms. See also the{" "}
          <Link href="/terms">
            <span className="cursor-pointer" style={{ color: "#00E5C8" }}>LetsZero Corporate Terms of Service</span>
          </Link>
          {" "}which apply in conjunction.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">

        <Section id="platform" title="1. Platform Description">
          <p>
            RepMail is a credit-based email outreach platform. You purchase sending credits,
            create personalised email campaigns, upload contact lists, and RepMail delivers
            emails on your behalf via Amazon SES. One credit is consumed per email successfully
            submitted to SES — regardless of final delivery outcome.
          </p>
          <p className="mt-3">
            The platform includes: campaign management, AI-assisted template generation, contact
            list management, delivery analytics (open/click/bounce/complaint rates), suppression
            management, and a team hierarchy (ROOT_ADMIN → SUB_ADMIN → USER).
          </p>
        </Section>

        <Section id="anti-spam" title="2. Anti-Spam Requirements">
          <p>
            RepMail is built for legitimate outreach — not bulk unsolicited email. Sending spam
            is prohibited, violates these Terms, and may violate applicable law.
          </p>
          <SubHead>Prohibited sending practices</SubHead>
          <ul className="list-disc pl-5 space-y-2">
            <li>Sending to addresses collected without permission (scraped, purchased, rented, or harvested lists)</li>
            <li>Sending to addresses that have previously bounced (hard bounce) or complained</li>
            <li>Sending to recipients who have unsubscribed</li>
            <li>Using misleading or deceptive subject lines</li>
            <li>Impersonating another person, company, or brand</li>
            <li>Forging email headers or FROM addresses</li>
            <li>Omitting required identification or unsubscribe mechanisms</li>
          </ul>
          <SubHead>Applicable regulations</SubHead>
          <p>
            You are solely responsible for complying with all applicable anti-spam laws in your
            jurisdiction and your recipients&rsquo; jurisdictions, including but not limited to:
            CAN-SPAM (US), CASL (Canada), GDPR and ePrivacy Directive (EU), PECR (UK), and the
            IT Act (India). RepMail does not provide legal advice — consult a qualified attorney
            for compliance guidance.
          </p>
          <SubHead>Automatic enforcement thresholds</SubHead>
          <InfoBox color="red">
            <p>Bounce rate &gt; 5% — account automatically paused</p>
            <p className="mt-1">Complaint rate &gt; 0.1% — account automatically paused</p>
          </InfoBox>
          <p className="mt-3">
            These thresholds are enforced in real time via SES delivery event monitoring. Accounts
            paused for exceeding thresholds must contact support before sending can resume. Repeat
            violations result in permanent termination.
          </p>
        </Section>

        <Section id="contact-responsibility" title="3. Contact List Responsibility">
          <p>
            You are the data controller for all contact lists you upload to RepMail. By uploading
            a list, you represent and warrant that:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              Each recipient has given valid permission to be contacted by you — either explicit
              opt-in consent, a demonstrable prior business relationship, or another lawful basis
              under applicable law.
            </li>
            <li>
              The list was collected in compliance with applicable data protection law (GDPR, CCPA,
              IT Act, etc.) and was not obtained by scraping, purchasing, or any method that bypasses
              recipient consent.
            </li>
            <li>
              You will honour unsubscribe requests promptly and not re-upload suppressed contacts.
            </li>
            <li>
              You have a legitimate purpose for contacting each recipient, consistent with the nature
              of the relationship and the content of the email.
            </li>
          </ul>
          <p className="mt-4">
            LetsZero is a data processor acting on your instructions for contact data. You indemnify
            LetsZero against any claims, fines, or regulatory actions arising from your contact data
            practices.
          </p>
        </Section>

        <Section id="credits" title="4. Credits and Payments">
          <SubHead>4.1 How credits work</SubHead>
          <p>
            Credits are the RepMail sending currency. You purchase credits in advance from the
            pricing page or dashboard. One credit = one email submitted to SES. Credits are
            deducted from your balance in the following order:
          </p>
          <ol className="list-decimal pl-5 space-y-1 mt-3">
            <li>Free monthly pool (500 credits for free plan users, refreshed monthly)</li>
            <li>Purchased credit balance</li>
          </ol>

          <SubHead>4.2 Credit expiry</SubHead>
          <ul className="list-disc pl-5 space-y-2">
            <li>Purchased credits are valid for <strong style={{ color: "#F0F0F5" }}>6 months</strong> from purchase date.</li>
            <li>Volume bonus credits share the same expiry as the triggering purchase.</li>
            <li>Free plan monthly credits expire at month end and do not roll over.</li>
            <li>Team-allocated credits (parent → child) expire with the allocation event.</li>
          </ul>

          <SubHead>4.3 Refund policy</SubHead>
          <p>
            Refunds are available for unused purchased credits under these conditions:
          </p>
          <InfoBox color="cyan">
            <p>Request within <strong>7 days</strong> of purchase</p>
            <p className="mt-1">Fewer than <strong>10%</strong> of the purchased credits have been used</p>
            <p className="mt-1">No evidence of platform abuse on the account</p>
          </InfoBox>
          <p className="mt-3">
            To request a refund: email{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>{" "}
            with your payment ID. Refunds are processed within 5–7 business days to the original
            payment method. Credits used before refund are deducted from the refund amount at
            the per-credit rate of the original purchase.
          </p>

          <SubHead>4.4 Free plan</SubHead>
          <p>
            Free plan accounts receive 500 credits per calendar month at no charge. Free plan
            credits refresh on the first use of each new calendar month (lazy refresh). Free plan
            accounts are subject to reduced sending limits: maximum 3 templates, 1 active
            campaign at a time, and no campaign scheduling.
          </p>
        </Section>

        <Section id="ai-content" title="5. AI-Generated Content">
          <p>
            RepMail provides AI-assisted template generation as a convenience feature. You are
            fully responsible for reviewing and approving any AI-generated content before sending.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              RepMail does not guarantee that AI-generated content is accurate, compliant with
              anti-spam law, or suitable for your specific use case.
            </li>
            <li>
              AI generation is subject to daily per-user quotas (enforced in the application) to
              prevent API cost abuse.
            </li>
            <li>
              You may not use AI generation to produce content that violates Section 2 (Anti-Spam)
              or that is deceptive, harassing, or illegal.
            </li>
            <li>
              AI-generated emails are validated automatically for unclosed placeholders and basic
              quality checks. Validation does not guarantee legal compliance.
            </li>
          </ul>
        </Section>

        <Section id="suppression-obligations" title="6. Suppression Obligations">
          <p>
            RepMail automatically manages a suppression list for your account. You have additional
            obligations:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              You must not remove hard-bounced or complained addresses from your suppression list.
              Doing so is prohibited and will result in account termination.
            </li>
            <li>
              If you import contacts from an external CRM, you must cross-reference your suppression
              list before sending and exclude any suppressed addresses.
            </li>
            <li>
              You must not re-add a suppressed address to a new campaign under any circumstances.
            </li>
          </ul>
        </Section>

        <Section id="team-accounts" title="7. Team Accounts and Permissions">
          <p>
            RepMail supports a three-tier hierarchy: ROOT_ADMIN, SUB_ADMIN, and USER. As an
            account administrator, you are responsible for:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>All activity performed by users you create under your account</li>
            <li>Ensuring your sub-users comply with these Terms</li>
            <li>Credit allocations you make to sub-users (allocations are non-reversible)</li>
          </ul>
          <p className="mt-4">
            If a sub-user violates these Terms, the root account is jointly liable.
          </p>
        </Section>

        <Section id="availability" title="8. Platform Availability">
          <p>
            We target 99.5% monthly uptime. Planned maintenance will be announced with at least
            24 hours notice. We are not liable for downtime caused by AWS SES, Railway, Redis,
            Razorpay, or other third-party providers.
          </p>
          <p className="mt-3">
            Campaign execution uses a BullMQ background queue (Redis-backed). During Redis
            unavailability, campaigns fall back to inline execution. We do not guarantee
            campaign delivery timing during extended infrastructure incidents.
          </p>
        </Section>

        <Section id="termination" title="9. Account Termination">
          <SubHead>Grounds for immediate termination</SubHead>
          <ul className="list-disc pl-5 space-y-2">
            <li>Repeated bounce rate &gt; 5% after warning</li>
            <li>Repeated complaint rate &gt; 0.1% after warning</li>
            <li>Sending to purchased, harvested, or scraped lists</li>
            <li>Re-contacting suppressed addresses</li>
            <li>Phishing, malware distribution, or impersonation campaigns</li>
            <li>Creating multiple accounts to circumvent free plan limits (credit farming)</li>
            <li>Any activity that threatens the SES sending reputation of the RepMail platform</li>
          </ul>
          <p className="mt-4">
            Upon termination: account access is revoked immediately, active campaigns are
            cancelled, and unused credits are forfeited. No refunds are issued for terminated
            accounts unless required by applicable consumer protection law.
          </p>
          <SubHead>Appeals</SubHead>
          <p>
            You may appeal a suspension (not a termination for serious violations) by emailing{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>{" "}
            within 14 days. We will review within 5 business days.
          </p>
        </Section>

        <Section id="liability" title="10. Limitation of Liability">
          <p>
            RepMail is not liable for: undelivered emails, spam filter decisions, low open or
            click rates, recipient opt-out losses, regulatory fines arising from your campaigns,
            or any indirect, consequential, or punitive damages. Our maximum liability for any
            claim is the amount you paid us in the 3 months preceding the claim.
          </p>
          <p className="mt-3">
            You indemnify LetsZero against all claims, costs, and damages arising from: your
            contact list practices, your campaign content, your anti-spam compliance failures,
            or your misuse of the platform.
          </p>
        </Section>

        <Section id="governing-law" title="11. Governing Law">
          <p>
            These Terms are governed by the laws of India. Disputes are subject to the exclusive
            jurisdiction of courts in Bengaluru, Karnataka, India. EU consumers retain the right
            to bring claims in their country of residence.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to These Terms">
          <p>
            We reserve the right to update these Terms. Material changes will be communicated
            via email to active account holders at least 14 days before the effective date.
            Continued use after the effective date constitutes acceptance.
          </p>
        </Section>

        <Section id="contact-us" title="13. Contact">
          <div
            className="mt-3 p-4 rounded-xl"
            style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
          >
            <p style={{ color: "#F0F0F5", fontWeight: 600 }}>RepMail / LetsZero Technologies</p>
            <p className="mt-1">
              Email:{" "}
              <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>
                support@letszero.in
              </a>
            </p>
            <p className="mt-1">
              Contact form:{" "}
              <Link href="/contact">
                <span className="cursor-pointer" style={{ color: "#00E5C8" }}>letszero.in/contact</span>
              </Link>
            </p>
            <p className="mt-2 text-sm" style={{ color: "#7878A0" }}>
              For general company terms, see the{" "}
              <Link href="/terms">
                <span className="cursor-pointer" style={{ color: "#00E5C8" }}>LetsZero Corporate Terms of Service</span>
              </Link>
              .
            </p>
          </div>
        </Section>

      </div>

      {/* Footer */}
      <footer className="border-t" style={{ background: "#06060B", borderColor: "#1A1A2E" }}>
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55556A" }}>
            <img src="/repmail-logo.png" alt="RepMail" className="h-6 w-auto" style={{ objectFit: "contain" }} />
            <span>© {new Date().getFullYear()} LetsZero. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/repmail/privacy" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/repmail/terms" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Contact</Link>
            <Link href="/terms" style={{ color: "#6B7280" }} className="hover:text-white transition-colors text-xs">LetsZero Legal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="mt-12">
      <div className="w-8 h-px mb-4" style={{ background: "#00E5C8" }} />
      <h2
        className="text-xl font-bold mb-4"
        style={{ color: "#F0F0F5", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#A8A8C0" }}>
        {children}
      </div>
    </section>
  );
}

function SubHead({ children }) {
  return (
    <h3
      className="text-base font-semibold mt-5 mb-2"
      style={{ color: "#D0D0E0", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </h3>
  );
}

function InfoBox({ color, children }) {
  const isRed = color === "red";
  return (
    <div
      className="mt-3 p-4 rounded-xl text-sm"
      style={{
        background: isRed ? "rgba(248,113,113,0.06)" : "rgba(0,229,200,0.06)",
        border: `1px solid ${isRed ? "rgba(248,113,113,0.2)" : "rgba(0,229,200,0.2)"}`,
        color: isRed ? "#FCA5A5" : "#A7F3D0",
      }}
    >
      {children}
    </div>
  );
}
