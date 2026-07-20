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
              src="/letszero-logo.png"
              alt="LetsZero"
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
          Last updated: June 2026 &nbsp;&middot;&nbsp; Applies to all LetsZero accounts and products
        </p>
        <p className="text-base leading-relaxed" style={{ color: "#A8A8C0" }}>
          LetsZero Solutions Private Limited (&ldquo;LetsZero&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) develops and operates
          multiple business software products available at letszero.in. This Privacy Policy explains what
          data we collect, how we use it, and your rights regarding that data. Individual products may
          publish supplemental privacy notices for functionality specific to that product.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">
        {/* Table of Contents */}
        <nav
          className="mb-12 p-5 rounded-xl"
          style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
        >
          <p
            className="text-xs font-semibold mb-3 uppercase tracking-widest"
            style={{ color: "#7878A0" }}
          >
            Contents
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              ["#who-we-are",    "1.",  "Who We Are"],
              ["#data-we-collect","2.", "What We Collect"],
              ["#how-we-use",    "3.",  "How We Use Your Data"],
              ["#legal-basis",   "4.",  "Legal Basis for Processing"],
              ["#data-sharing",  "5.",  "Who We Share Data With"],
              ["#data-retention","6.",  "Data Retention"],
              ["#your-rights",   "7.",  "Your Rights"],
              ["#security",      "8.",  "Security"],
              ["#children",      "9.",  "Children's Privacy"],
              ["#international", "10.", "International Data Transfers"],
              ["#changes",       "11.", "Changes to This Policy"],
              ["#contact",       "12.", "Contact"],
            ].map(([href, num, title]) => (
              <li key={href} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0" style={{ color: "#7878A0", minWidth: "1.5rem" }}>
                  {num}
                </span>
                <a
                  href={href}
                  className="hover:text-white transition-colors"
                  style={{ color: "#7878A0" }}
                >
                  {title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="who-we-are" title="1. Who We Are">
          <p>
            LetsZero Solutions Private Limited is a software company that builds and operates business software
            products. Our products are available at{" "}
            <span style={{ color: "#00E5C8" }}>letszero.in</span>. For privacy-related inquiries,
            contact us at{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8", textDecoration: "underline" }}>
              support@letszero.in
            </a>
            .
          </p>
          <p className="mt-3">
            This Policy establishes the baseline privacy standards that apply across all LetsZero
            products. Where an individual product handles data in ways specific to its functionality,
            a supplemental privacy notice for that product provides additional detail.
          </p>
        </Section>

        <Section id="data-we-collect" title="2. What We Collect">
          <SubHead>2.1 Account Information</SubHead>
          <p>
            When you register for a LetsZero account, we collect your name, email address, and any
            additional profile information you choose to provide. If you sign in using a third-party
            identity provider, we receive only the profile fields you authorise during that
            authentication flow. We do not receive your third-party account password or persistent
            access to your accounts on those services.
          </p>

          <SubHead>2.2 Usage Information</SubHead>
          <p>
            We collect data about how you interact with our products, including feature usage, API
            request timestamps, and error events. This data is used for platform reliability,
            performance monitoring, and product improvement. We do not use third-party advertising
            networks or ad-tracking pixels.
          </p>

          <SubHead>2.3 Billing Information</SubHead>
          <p>
            Payments are handled by our payment processor. We do not store card numbers, bank
            details, or payment credentials. We retain transaction records, amounts, and associated
            identifiers for your billing history and for compliance with applicable law.
          </p>

          <SubHead>2.4 Support Communications</SubHead>
          <p>
            When you contact our support team, we retain those communications to resolve your
            inquiry and to improve our support quality over time.
          </p>

          <SubHead>2.5 Product-Specific Data</SubHead>
          <p>
            Individual products may process additional categories of data specific to their
            functionality. Where this applies, the product&rsquo;s supplemental privacy notice
            describes what is collected and why.
          </p>

          <SubHead>2.6 Security and Monitoring</SubHead>
          <p>
            We monitor platform activity to detect abuse, fraud, and security threats. This
            includes server-side log monitoring and error tracking on platform infrastructure.
            This data is used exclusively for security and integrity purposes.
          </p>

          <SubHead>2.7 Cookies and Sessions</SubHead>
          <p>
            We use session cookies to keep you authenticated during your use of our products. We
            do not use advertising cookies or third-party tracking cookies. Disabling cookies will
            prevent you from signing in.
          </p>
        </Section>

        <Section id="how-we-use" title="3. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-2">
            <li>To create and manage your account across LetsZero products.</li>
            <li>To deliver the products and features you use.</li>
            <li>To process billing and maintain your payment history.</li>
            <li>To respond to support requests.</li>
            <li>
              To send transactional communications: account alerts, password resets, and billing
              receipts.
            </li>
            <li>To detect and prevent fraud, abuse, and security threats.</li>
            <li>To maintain platform reliability and improve product quality.</li>
          </ul>
          <p className="mt-4">
            We do not sell your data. We do not use your data for advertising. We do not share
            your data with advertising networks.
          </p>
        </Section>

        <Section id="legal-basis" title="4. Legal Basis for Processing">
          <p>
            If you are located in the European Economic Area (EEA) or the United Kingdom, our
            legal bases for processing your personal data are:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong style={{ color: "#F0F0F5" }}>Contract performance</strong> — processing
              necessary to deliver the product or service you signed up for.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Legitimate interests</strong> — fraud
              prevention, security monitoring, and platform integrity.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Legal obligation</strong> — compliance with
              applicable laws and regulations.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Consent</strong> — where we have obtained
              your explicit permission for specific optional processing.
            </li>
          </ul>
        </Section>

        <Section id="data-sharing" title="5. Who We Share Data With">
          <p>We share your data only with service providers necessary to operate our platform:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong style={{ color: "#F0F0F5" }}>Cloud infrastructure providers</strong> —
              companies that host our applications and databases.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Payment processors</strong> — providers that
              handle billing transactions on our behalf.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Identity providers</strong> — third-party
              sign-in services, if you choose to authenticate through them.
            </li>
          </ul>
          <p className="mt-4">
            We may also disclose data when required by law, court order, or to protect the safety
            and rights of our users. We do not sell your data or share it for marketing or
            advertising purposes.
          </p>
          <p className="mt-3">
            Specific providers used by each product are identified in that product&rsquo;s
            supplemental privacy notice.
          </p>
        </Section>

        <Section id="data-retention" title="6. Data Retention">
          <p>
            We retain your account data for as long as your account is active. If you delete your
            account, your personal data is removed within 30 days, except where retention is
            required by law or necessary to protect legitimate interests such as fraud prevention
            or legal compliance.
          </p>
          <p className="mt-3">
            Specific retention periods for product data — such as activity logs or usage history
            — are described in each product&rsquo;s supplemental privacy notice.
          </p>
        </Section>

        <Section id="your-rights" title="7. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Request deletion of your account and associated personal data.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Receive a portable copy of your data.</li>
            <li>Withdraw consent where processing is based on consent.</li>
          </ul>
          <p className="mt-4">
            To exercise any of these rights, email{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8", textDecoration: "underline" }}>
              support@letszero.in
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section id="security" title="8. Security">
          <p>
            We apply security measures across our platform, including encryption of data in
            transit, encrypted database connections, secure password storage, and access controls
            on internal systems.
          </p>
          <p className="mt-3">
            No system is entirely secure. If you discover a security vulnerability, please report
            it to{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8", textDecoration: "underline" }}>
              support@letszero.in
            </a>{" "}
            before public disclosure.
          </p>
        </Section>

        <Section id="children" title="9. Children's Privacy">
          <p>
            LetsZero products are not directed at children under 13. We do not knowingly collect
            personal data from children. If you believe we have received data from a child, contact
            us immediately at{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8", textDecoration: "underline" }}>
              support@letszero.in
            </a>
            .
          </p>
        </Section>

        <Section id="international" title="10. International Data Transfers">
          <p>
            Our services are primarily hosted in the United States. By using LetsZero products,
            you acknowledge that your data may be processed in jurisdictions outside your own. We
            work with infrastructure providers that operate under their own applicable legal
            frameworks, and we apply security measures to protect your data regardless of where
            it is processed.
          </p>
        </Section>

        <Section id="changes" title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated by email to registered account holders at least 14 days before they take
            effect. Continued use of LetsZero products after the effective date constitutes
            acceptance of the revised policy.
          </p>
        </Section>

        <Section id="contact" title="12. Contact">
          <p>For privacy questions, data requests, or concerns:</p>
          <div
            className="mt-4 p-4 rounded-xl"
            style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
          >
            <p style={{ color: "#F0F0F5", fontWeight: 600 }}>LetsZero Solutions Private Limited</p>
            <p className="mt-1">
              Email:{" "}
              <a href="mailto:support@letszero.in" style={{ color: "#00E5C8", textDecoration: "underline" }}>
                support@letszero.in
              </a>
            </p>
            <p className="mt-1">
              Web:{" "}
              <Link href="/contact">
                <span className="cursor-pointer" style={{ color: "#00E5C8" }}>
                  letszero.in/contact
                </span>
              </Link>
            </p>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <footer className="border-t" style={{ background: "#06060B", borderColor: "#1A1A2E" }}>
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#7878A0" }}>
            <img
              src="/letszero-logo.png"
              alt="LetsZero"
              className="h-6 w-auto"
              style={{ objectFit: "contain" }}
            />
            <span>&copy; {new Date().getFullYear()} LetsZero. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#7878A0" }}>
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
