import { Link } from "wouter";

export default function Terms() {
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
          <Link href="/">
            <img
              src="/repmail-logo.png"
              alt="RepMail"
              className="h-8 w-auto cursor-pointer"
              style={{ objectFit: "contain" }}
            />
          </Link>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#8888A0" }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/login">
              <span
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "rgba(0,229,200,0.1)", border: "1px solid rgba(0,229,200,0.25)", color: "#00E5C8" }}
              >
                Sign In
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "#8B5CF6", letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Legal
        </div>
        <h1
          className="text-4xl md:text-5xl font-extrabold mb-4"
          style={{ color: "#F0F0F5", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
        >
          Terms of Service
        </h1>
        <p className="text-base mb-2" style={{ color: "#7878A0" }}>
          Last updated: June 2026 &nbsp;·&nbsp; Binding on all RepMail accounts
        </p>
        <p className="text-base leading-relaxed" style={{ color: "#A8A8C0" }}>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of RepMail and related
          services operated by LetsZero Technologies (&ldquo;LetsZero&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
          By creating an account or using RepMail, you agree to these Terms. If you do not
          agree, do not use the service.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">
        <Section id="service" title="1. The Service">
          <p>
            RepMail is a credit-based email outreach platform. You purchase credits, create
            campaigns, upload contact lists, and send personalised emails via Amazon SES.
            One credit is consumed per email successfully submitted to SES for delivery.
          </p>
          <p className="mt-3">
            We provide the platform &ldquo;as-is&rdquo; and reserve the right to modify, suspend, or
            discontinue any feature with reasonable notice. We will use reasonable efforts to
            notify active users of material changes via the email address on file.
          </p>
        </Section>

        <Section id="accounts" title="2. Accounts and Eligibility">
          <ul className="list-disc pl-5 space-y-2">
            <li>You must be at least 18 years old to use RepMail.</li>
            <li>You must provide accurate registration information. Fake accounts are prohibited.</li>
            <li>
              One free plan account per person. Creating multiple accounts to circumvent free
              credit limits is prohibited and may result in suspension.
            </li>
            <li>
              You are responsible for maintaining the security of your account credentials.
              Notify us immediately at{" "}
              <a href="mailto:support@letszero.in" style={{ color: "#8B5CF6" }}>
                support@letszero.in
              </a>{" "}
              if you suspect unauthorised access.
            </li>
            <li>
              Team sub-accounts created under your account are your responsibility. You are
              accountable for all activity on accounts you manage.
            </li>
          </ul>
        </Section>

        <Section id="acceptable-use" title="3. Acceptable Use">
          <p>You agree to use RepMail only for lawful purposes. The following are strictly prohibited:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong style={{ color: "#F0F0F5" }}>Spam and unsolicited email</strong> — sending
              emails to recipients who have not given valid permission or have unsubscribed.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Purchased or harvested lists</strong> —
              uploading contacts obtained without their knowledge or from scrapers and data
              brokers who do not obtain explicit consent.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Deceptive content</strong> — impersonating
              another person or company, forging headers, or sending misleading subject lines.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Illegal content</strong> — campaigns
              promoting illegal goods, services, or activities.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Malware and phishing</strong> — sending
              links to malicious sites or content designed to deceive recipients into disclosing
              credentials.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Platform abuse</strong> — attempting to
              bypass rate limits, trial-credit restrictions, or suppression enforcement.
            </li>
          </ul>
          <p className="mt-4">
            Violations may result in immediate account suspension without refund. Serious
            violations will be reported to relevant authorities.
          </p>
        </Section>

        <Section id="anti-spam" title="4. Anti-Spam Compliance">
          <p>
            RepMail is designed for legitimate outreach to contacts you have a genuine
            relationship with or explicit permission to contact. You are solely responsible
            for complying with all applicable anti-spam laws, including:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>CAN-SPAM Act (United States)</li>
            <li>CASL — Canada&rsquo;s Anti-Spam Legislation</li>
            <li>GDPR (European Union) — consent requirements for marketing emails</li>
            <li>IT Act and related rules (India)</li>
          </ul>
          <p className="mt-4">
            RepMail automatically honours unsubscribes and bounces by adding affected
            addresses to your suppression list. You must not manually remove suppressed
            addresses to re-contact them.
          </p>
        </Section>

        <Section id="contact-responsibility" title="5. Your Contact Data Responsibility">
          <p>
            By uploading a contact list, you represent and warrant that:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              You have a lawful basis to contact each recipient (opt-in consent, legitimate
              business relationship, or other legal basis applicable in your jurisdiction).
            </li>
            <li>
              Your contact data was collected lawfully and you have the right to process it.
            </li>
            <li>
              You will honour opt-out requests promptly and not re-add suppressed contacts.
            </li>
          </ul>
          <p className="mt-4">
            LetsZero is a data processor on your behalf for the contact data you upload.
            You remain the data controller and bear full responsibility for your contact
            data practices under applicable privacy laws.
          </p>
        </Section>

        <Section id="credits" title="6. Credits and Payments">
          <SubHead>6.1 Credit Purchases</SubHead>
          <p>
            Credits are purchased in advance. Prices are displayed in INR or USD at the time
            of purchase. One credit is consumed per email successfully submitted to Amazon SES
            for delivery. Credits are non-refundable except as stated in Section 6.3.
          </p>

          <SubHead>6.2 Credit Validity</SubHead>
          <p>
            Purchased credits are valid for 6 months from the date of purchase. After
            expiry, unused credits may be forfeited. Volume bonus credits share the same
            expiry as the base purchase. Free plan monthly credits (500/month) expire at the
            end of each calendar month and do not roll over.
          </p>

          <SubHead>6.3 Refund Policy</SubHead>
          <p>
            We offer refunds for unused purchased credits within 7 days of purchase, provided
            fewer than 10% of the purchased credits have been used. To request a refund,
            email{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#8B5CF6" }}>
              support@letszero.in
            </a>{" "}
            with your payment ID. Refunds are processed within 5–7 business days. We reserve
            the right to deny refund requests where there is evidence of platform abuse.
          </p>

          <SubHead>6.4 Free Plan</SubHead>
          <p>
            The Free Plan provides 500 credits per calendar month at no charge. Free credits
            cannot be rolled over to the next month. Free Plan accounts are subject to
            reduced sending limits and feature restrictions as displayed on the pricing page.
          </p>
        </Section>

        <Section id="ip-and-content" title="7. Intellectual Property">
          <p>
            RepMail, the LetsZero brand, and all platform code, design, and functionality are
            owned by LetsZero Technologies. You may not copy, reverse engineer, or create
            derivative works based on the platform.
          </p>
          <p className="mt-3">
            You retain ownership of your campaign content, templates, and contact data. By
            using RepMail, you grant LetsZero a limited licence to store and process this
            content solely to provide the service.
          </p>
        </Section>

        <Section id="availability" title="8. Availability and SLA">
          <p>
            We target 99.5% monthly uptime for the RepMail platform. Planned maintenance
            windows will be announced with at least 24 hours notice via the status page or
            email. We are not liable for downtime caused by third-party providers (AWS SES,
            Railway, Razorpay, etc.).
          </p>
          <p className="mt-3">
            In the event of extended unplanned downtime exceeding 2 hours in a single
            incident, we will credit affected accounts with a proportional number of free
            credits at our discretion.
          </p>
        </Section>

        <Section id="suspension" title="9. Suspension and Termination">
          <p>
            We may suspend or terminate your account with immediate effect if:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>You violate the Acceptable Use Policy (Section 3).</li>
            <li>Your campaigns generate complaint rates above 0.1% or bounce rates above 5%.</li>
            <li>We receive abuse complaints from your recipients.</li>
            <li>Your account is found to be engaged in fraud or credit farming.</li>
          </ul>
          <p className="mt-4">
            For minor violations, we will issue a warning before suspension. You may appeal
            suspensions by contacting{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#8B5CF6" }}>
              support@letszero.in
            </a>
            . Refunds for suspended accounts are at our discretion and will not be issued for
            violations of these Terms.
          </p>
          <p className="mt-3">
            You may terminate your account at any time by contacting support. Upon
            termination, your data will be deleted within 30 days.
          </p>
        </Section>

        <Section id="liability" title="10. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, LetsZero shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages,
            including lost profits, lost revenue, loss of data, or loss of goodwill, arising
            from your use of (or inability to use) RepMail.
          </p>
          <p className="mt-3">
            Our total liability to you for any claims arising under these Terms shall not
            exceed the amount you paid to us in the 3 months preceding the claim.
          </p>
          <p className="mt-3">
            We are not responsible for the deliverability, open rates, or click rates of
            your campaigns, which depend on recipient mail servers, spam filters, and
            factors outside our control.
          </p>
        </Section>

        <Section id="disclaimer" title="11. Disclaimer of Warranties">
          <p>
            RepMail is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
            express or implied, including but not limited to merchantability, fitness for a
            particular purpose, and non-infringement. We do not warrant that the service will
            be error-free, uninterrupted, or secure.
          </p>
        </Section>

        <Section id="governing-law" title="12. Governing Law">
          <p>
            These Terms are governed by the laws of India. Any disputes shall be subject to
            the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.
            If you are a consumer in the EU, you may also be entitled to bring a claim in
            the courts of your country of residence.
          </p>
        </Section>

        <Section id="changes" title="13. Changes to These Terms">
          <p>
            We reserve the right to modify these Terms at any time. Material changes will be
            communicated via email at least 14 days before the effective date. Your continued
            use of RepMail after the effective date constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section id="contact" title="14. Contact">
          <p>
            Questions about these Terms?
          </p>
          <div
            className="mt-4 p-4 rounded-xl"
            style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
          >
            <p style={{ color: "#F0F0F5", fontWeight: 600 }}>LetsZero Technologies</p>
            <p className="mt-1">
              Email:{" "}
              <a href="mailto:support@letszero.in" style={{ color: "#8B5CF6" }}>
                support@letszero.in
              </a>
            </p>
            <p className="mt-1">
              Web:{" "}
              <Link href="/contact">
                <span className="cursor-pointer" style={{ color: "#8B5CF6" }}>letszero.in/contact</span>
              </Link>
            </p>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <footer
        className="border-t"
        style={{ background: "#06060B", borderColor: "#1A1A2E" }}
      >
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55556A" }}>
            <img src="/repmail-logo.png" alt="RepMail" className="h-6 w-auto" style={{ objectFit: "contain" }} />
            <span>© {new Date().getFullYear()} LetsZero. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#55556A" }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="mt-12">
      <div
        className="w-8 h-px mb-4"
        style={{ background: "#8B5CF6" }}
      />
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
