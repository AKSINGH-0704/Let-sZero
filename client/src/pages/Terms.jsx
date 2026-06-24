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
              src="/letszero-logo.png"
              alt="LetsZero"
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
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#8B5CF6" }}
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
          Last updated: June 2026 &nbsp;&middot;&nbsp; Platform agreement &nbsp;&middot;&nbsp; applies to all LetsZero products and services
        </p>
        <p className="text-base leading-relaxed" style={{ color: "#A8A8C0" }}>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of software products
          and related services operated by LetsZero Technologies (&ldquo;LetsZero&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;our&rdquo;). By creating an account or using any LetsZero product, you agree
          to these Terms. If you do not agree, do not use the services.
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
            style={{ color: "#55556A" }}
          >
            Contents
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              ["#about",          "1.",  "About These Terms"],
              ["#accounts",       "2.",  "Accounts and Eligibility"],
              ["#acceptable-use", "3.",  "Acceptable Use"],
              ["#your-data",      "4.",  "Your Data and Our Role"],
              ["#billing",        "5.",  "Subscriptions and Billing"],
              ["#ip-and-content", "6.",  "Intellectual Property"],
              ["#availability",   "7.",  "Platform Availability"],
              ["#suspension",     "8.",  "Suspension and Termination"],
              ["#liability",      "9.",  "Limitation of Liability"],
              ["#disclaimer",     "10.", "Disclaimer of Warranties"],
              ["#governing-law",  "11.", "Governing Law"],
              ["#changes",        "12.", "Changes to These Terms"],
              ["#contact",        "13.", "Contact"],
            ].map(([href, num, title]) => (
              <li key={href} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0" style={{ color: "#55556A", minWidth: "1.5rem" }}>
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

        <Section id="about" title="1. About These Terms">
          <p>
            LetsZero Technologies builds and operates multiple software products for businesses.
            These Terms establish the agreement between you and LetsZero for your use of all
            LetsZero products and services.
          </p>
          <p className="mt-3">
            Individual products may have supplemental terms that apply in addition to these Terms,
            addressing billing specifics or functionality unique to that product. Where supplemental
            terms conflict with these Terms, the supplemental terms govern for that product.
          </p>
        </Section>

        <Section id="accounts" title="2. Accounts and Eligibility">
          <ul className="list-disc pl-5 space-y-2">
            <li>You must be at least 18 years old to create a LetsZero account.</li>
            <li>
              You must provide accurate registration information. Accounts created with false
              information may be suspended.
            </li>
            <li>
              Creating duplicate accounts for the same product to extend free-tier access or
              circumvent plan limits is prohibited and may result in suspension of all associated
              accounts.
            </li>
            <li>
              You are responsible for maintaining the security of your credentials. If you suspect
              unauthorized access, notify us immediately at{" "}
              <a href="mailto:support@letszero.in" style={{ color: "#8B5CF6" }}>
                support@letszero.in
              </a>
              .
            </li>
            <li>
              Where a LetsZero product supports team accounts or sub-users, you are responsible
              for all activity on accounts you administer.
            </li>
          </ul>
        </Section>

        <Section id="acceptable-use" title="3. Acceptable Use">
          <p>
            You agree to use LetsZero products only for lawful purposes. The following are
            prohibited:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong style={{ color: "#F0F0F5" }}>Unlawful communications</strong> — sending
              messages or notifications to recipients without a valid legal basis to do so,
              including those who have opted out or unsubscribed.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Identity misrepresentation</strong> —
              impersonating another person or company, forging sender information, or using
              deceptive identification.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Harmful content</strong> — distributing
              malware, phishing links, or content designed to deceive recipients into disclosing
              credentials or sensitive information.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Illegal content</strong> — promoting illegal
              goods, services, or activities through any LetsZero product.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Platform abuse</strong> — attempting to
              circumvent rate limits, trial restrictions, built-in safeguards, or access
              controls.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Unauthorized resale</strong> — reselling or
              sublicensing access to LetsZero products without our written permission.
            </li>
          </ul>
          <p className="mt-4">
            Violations may result in immediate account suspension without refund. Serious
            violations will be reported to relevant authorities.
          </p>
        </Section>

        <Section id="your-data" title="4. Your Data and Our Role">
          <p>
            Where a LetsZero product processes data on your behalf — such as customer or contact
            information you import or manage through a product — you act as the data controller
            and LetsZero acts as a data processor under applicable data protection law. You are
            responsible for ensuring you have a lawful basis to process that data and for
            complying with all applicable privacy and data protection obligations.
          </p>
          <p className="mt-3">
            We process customer-provided data only to deliver the services you have requested.
            We do not use your contact or customer data for our own marketing.
          </p>
          <p className="mt-3">
            For details on how LetsZero handles your own personal account data, see our{" "}
            <Link href="/privacy">
              <span className="cursor-pointer" style={{ color: "#8B5CF6" }}>
                Privacy Policy
              </span>
            </Link>
            .
          </p>
        </Section>

        <Section id="billing" title="5. Subscriptions and Billing">
          <SubHead>5.1 Pricing Models</SubHead>
          <p>
            LetsZero products are available under various pricing models, including subscriptions,
            credit-based usage, and free plans. The applicable pricing is displayed on each
            product&rsquo;s pricing page before purchase. By completing a purchase, you agree to
            the price and terms presented at that time.
          </p>

          <SubHead>5.2 Payment Processing</SubHead>
          <p>
            Payments are handled by our designated payment processor. We do not store card numbers,
            bank credentials, or payment instrument details. All charges are final unless a refund
            is granted under Section 5.3 or required by applicable law.
          </p>

          <SubHead>5.3 Refunds</SubHead>
          <p>
            Refund eligibility is described on each product&rsquo;s pricing page or in the
            product&rsquo;s supplemental terms. As a general principle, refund requests for
            recently purchased plans or credits may be honoured within a reasonable window where
            minimal usage has occurred. To request a refund, contact us at{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#8B5CF6" }}>
              support@letszero.in
            </a>{" "}
            with your transaction details. We reserve the right to deny refund requests where
            there is evidence of abuse or violation of these Terms.
          </p>

          <SubHead>5.4 Free Plans and Trials</SubHead>
          <p>
            Some LetsZero products offer free plans or trial access subject to usage limits and
            feature restrictions. Details are described on each product&rsquo;s pricing page.
            Creating multiple accounts to extend free access is a violation of these Terms.
          </p>
        </Section>

        <Section id="ip-and-content" title="6. Intellectual Property">
          <p>
            LetsZero Technologies owns all rights to our products, brand, codebase, and platform
            design. You may not copy, reverse engineer, or create derivative works based on any
            LetsZero product.
          </p>
          <p className="mt-3">
            You retain ownership of content you create within LetsZero products. By using our
            products, you grant LetsZero a limited licence to store and process your content
            solely to provide the services you have requested.
          </p>
        </Section>

        <Section id="availability" title="7. Platform Availability">
          <p>
            We aim to maintain consistent, reliable service across our products. Planned
            maintenance will be announced in advance where practicable. We are not liable for
            downtime caused by third-party infrastructure providers or circumstances outside our
            control.
          </p>
          <p className="mt-3">
            We provide our services &ldquo;as available&rdquo; and reserve the right to modify,
            suspend, or discontinue any product or feature. We will use reasonable efforts to
            notify active users of material changes via the email address on file.
          </p>
        </Section>

        <Section id="suspension" title="8. Suspension and Termination">
          <p>We may suspend or terminate your account with immediate effect if:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>You violate these Terms or the Acceptable Use Policy in Section 3.</li>
            <li>Your use of a LetsZero product violates applicable law.</li>
            <li>We receive credible abuse reports relating to your account.</li>
            <li>Your account is found to be engaged in fraud.</li>
          </ul>
          <p className="mt-4">
            For minor violations, we will issue a warning before suspension where practicable.
            You may appeal a suspension by contacting{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#8B5CF6" }}>
              support@letszero.in
            </a>
            . Refunds will not be issued for accounts terminated for violations of these Terms.
          </p>
          <p className="mt-3">
            You may close your account at any time by contacting support. Your data will be
            deleted within 30 days of account closure.
          </p>
        </Section>

        <Section id="liability" title="9. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, LetsZero shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages, including lost
            profits, loss of data, or loss of goodwill, arising from your use of or inability to
            use our products.
          </p>
          <p className="mt-3">
            Our total aggregate liability to you for any claims arising under these Terms shall
            not exceed the amount you paid to LetsZero in the 3 months preceding the claim.
          </p>
        </Section>

        <Section id="disclaimer" title="10. Disclaimer of Warranties">
          <p>
            LetsZero products are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
            without warranties of any kind, express or implied, including merchantability,
            fitness for a particular purpose, or non-infringement. We do not warrant that our
            products will be error-free, uninterrupted, or entirely secure.
          </p>
        </Section>

        <Section id="governing-law" title="11. Governing Law">
          <p>
            These Terms are governed by the laws of India. Disputes shall be subject to the
            exclusive jurisdiction of the courts in Bengaluru, Karnataka, India. If you are a
            consumer in the EU, you may also bring a claim in the courts of your country of
            residence.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Material changes will be communicated
            by email at least 14 days before the effective date. Continued use of LetsZero
            products after the effective date constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section id="contact" title="13. Contact">
          <p>Questions about these Terms?</p>
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
                <span className="cursor-pointer" style={{ color: "#8B5CF6" }}>
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
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55556A" }}>
            <img
              src="/letszero-logo.png"
              alt="LetsZero"
              className="h-6 w-auto"
              style={{ objectFit: "contain" }}
            />
            <span>&copy; {new Date().getFullYear()} LetsZero. All rights reserved.</span>
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
      <div className="w-8 h-px mb-4" style={{ background: "#8B5CF6" }} />
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
