import { Link } from "wouter";

export default function Privacy() {
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
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
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
          style={{ background: "rgba(0,229,200,0.06)", border: "1px solid rgba(0,229,200,0.15)", color: "#00E5C8", letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Legal
        </div>
        <h1
          className="text-4xl md:text-5xl font-extrabold mb-4"
          style={{ color: "#F0F0F5", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
        >
          Privacy Policy
        </h1>
        <p className="text-base mb-2" style={{ color: "#7878A0" }}>
          Last updated: June 2026 &nbsp;·&nbsp; Effective for all RepMail users
        </p>
        <p className="text-base leading-relaxed" style={{ color: "#A8A8C0" }}>
          LetsZero Technologies (&ldquo;LetsZero&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the RepMail
          email outreach platform available at{" "}
          <span style={{ color: "#00E5C8" }}>letszero.in</span>. This Privacy Policy explains
          what data we collect, how we use it, and your rights regarding that data.
        </p>
      </div>

      <div
        className="max-w-4xl mx-auto px-6 pb-24"
        style={{ "--accent": "#00E5C8" }}
      >
        <Section id="overview" title="1. Who We Are">
          <p>
            LetsZero Technologies provides RepMail, a credit-based email outreach platform
            that lets teams send personalised campaigns through Amazon SES. Our registered
            contact address for privacy matters is{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>
              support@letszero.in
            </a>
            .
          </p>
        </Section>

        <Section id="data-we-collect" title="2. Data We Collect">
          <SubHead>2.1 Account Information</SubHead>
          <p>
            When you create a RepMail account — including via Google OAuth — we collect your
            name, email address, and (optionally) your company name. If you sign in with
            Google, we receive only the profile fields you authorise: name, email, and profile
            picture. We do not receive your Google password or access to your Google mailbox.
          </p>

          <SubHead>2.2 Contact Lists</SubHead>
          <p>
            When you upload a contact list for a campaign, we store the recipient email
            addresses and any custom fields you provide (name, company, custom variables). You
            are solely responsible for having lawful permission to contact these recipients.
            We do not use your contact data for our own marketing.
          </p>

          <SubHead>2.3 Campaign Content</SubHead>
          <p>
            We store the templates and campaign configurations you create. Email body content
            is retained to power the campaign history and deliverability analytics you see in
            the dashboard.
          </p>

          <SubHead>2.4 Email Delivery Events</SubHead>
          <p>
            Amazon SES reports delivery events — sends, deliveries, bounces, complaints,
            opens, and clicks — back to us via SNS webhooks. We store these events to populate
            your campaign analytics and to maintain the suppression list required by CAN-SPAM
            and similar regulations.
          </p>

          <SubHead>2.5 Usage and Technical Data</SubHead>
          <p>
            We log server-side activity (API request timestamps, error events) for
            debugging and uptime monitoring. We use session cookies to keep you signed in.
            We do not use third-party analytics SDKs or ad-tracking pixels.
          </p>

          <SubHead>2.6 Payment Information</SubHead>
          <p>
            Credit purchases are processed by Razorpay. We do not store card numbers or bank
            details. We store the transaction ID, amount, and credit amount for your payment
            history.
          </p>
        </Section>

        <Section id="how-we-use" title="3. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-2">
            <li>To create and manage your RepMail account.</li>
            <li>To send emails on your behalf via Amazon SES.</li>
            <li>To generate campaign analytics (open, click, bounce, complaint rates).</li>
            <li>To enforce suppression lists and maintain CAN-SPAM/GDPR compliance.</li>
            <li>To process credit purchases and maintain your payment history.</li>
            <li>To respond to support requests sent to support@letszero.in.</li>
            <li>To detect and prevent fraudulent or abusive use of the platform.</li>
            <li>To send transactional notifications about your account (e.g. password resets).</li>
          </ul>
          <p className="mt-4">
            We do not sell your data. We do not use your data for advertising. We do not
            share your contact lists with third parties.
          </p>
        </Section>

        <Section id="legal-basis" title="4. Legal Basis for Processing">
          <p>
            If you are in the European Economic Area (EEA), our legal basis for processing
            your data is:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong style={{ color: "#F0F0F5" }}>Contract performance</strong> — processing
              necessary to deliver the RepMail service you signed up for.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Legitimate interests</strong> — fraud
              prevention, security monitoring, and platform integrity.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Legal obligation</strong> — maintaining
              suppression lists as required by anti-spam law.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Consent</strong> — where we ask for
              optional permissions (e.g. Google OAuth scopes).
            </li>
          </ul>
        </Section>

        <Section id="data-sharing" title="5. Who We Share Data With">
          <p>We share your data only with:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong style={{ color: "#F0F0F5" }}>Amazon Web Services (SES, SNS)</strong> —
              to deliver your emails and receive delivery event notifications.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Razorpay</strong> — to process credit
              purchases. Subject to Razorpay&rsquo;s own privacy policy.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Railway</strong> — our cloud
              infrastructure provider that hosts the RepMail application and PostgreSQL database.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Google (if OAuth is used)</strong> — only
              to verify your identity at sign-in. We do not receive ongoing access to your
              Google account.
            </li>
          </ul>
          <p className="mt-4">
            We may disclose data if required by law, court order, or to protect the safety
            and rights of our users.
          </p>
        </Section>

        <Section id="data-retention" title="6. Data Retention">
          <p>
            We retain your account data for as long as your account is active. Campaign data
            and analytics are retained for 24 months from the campaign send date to support
            your reporting history.
          </p>
          <p className="mt-3">
            Suppression list entries (bounced and complained addresses) are retained
            indefinitely to comply with anti-spam obligations. If you delete your account, all
            personal data is removed within 30 days except where retention is required by law
            or to protect legitimate interests (e.g. fraud prevention).
          </p>
        </Section>

        <Section id="cookies" title="7. Cookies and Sessions">
          <p>
            RepMail uses a single session cookie to keep you signed in. We do not use
            tracking cookies, advertising cookies, or third-party analytics cookies.
            Disabling cookies in your browser will prevent you from logging in to the
            application.
          </p>
        </Section>

        <Section id="your-rights" title="8. Your Rights">
          <p>
            Depending on your location, you may have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Receive a copy of your data in a portable format.</li>
            <li>Withdraw consent where processing is based on consent.</li>
          </ul>
          <p className="mt-4">
            To exercise any of these rights, email us at{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>
              support@letszero.in
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section id="security" title="9. Security">
          <p>
            We use industry-standard measures including TLS encryption in transit, encrypted
            database connections, bcrypt password hashing, and session-based authentication.
            Our infrastructure is hosted on Railway with private internal networking between
            the application and database.
          </p>
          <p className="mt-3">
            No system is completely secure. If you believe you&rsquo;ve found a security
            vulnerability, please report it to{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>
              support@letszero.in
            </a>{" "}
            before public disclosure.
          </p>
        </Section>

        <Section id="children" title="10. Children's Privacy">
          <p>
            RepMail is not directed at children under 13. We do not knowingly collect data
            from children. If you believe we have inadvertently collected data from a child,
            please contact us immediately.
          </p>
        </Section>

        <Section id="international" title="11. International Data Transfers">
          <p>
            Our servers are located in the United States (Railway, US West region). Amazon
            SES sends email from the EU North (Stockholm) region. By using RepMail, you
            consent to your data being processed in these jurisdictions. We apply appropriate
            safeguards for cross-border transfers.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            announced via email to registered account holders at least 14 days before they
            take effect. Continued use of RepMail after the effective date constitutes
            acceptance of the revised policy.
          </p>
        </Section>

        <Section id="contact" title="13. Contact">
          <p>
            For any privacy-related questions, data requests, or concerns:
          </p>
          <div
            className="mt-4 p-4 rounded-xl"
            style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
          >
            <p style={{ color: "#F0F0F5", fontWeight: 600 }}>LetsZero Technologies</p>
            <p className="mt-1">
              Email:{" "}
              <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>
                support@letszero.in
              </a>
            </p>
            <p className="mt-1">
              Web:{" "}
              <Link href="/contact">
                <span className="cursor-pointer" style={{ color: "#00E5C8" }}>letszero.in/contact</span>
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
        style={{ background: "#00E5C8" }}
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
