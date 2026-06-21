import { Link } from "wouter";

export default function RepMailPrivacy() {
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
            <Link href="/repmail/terms" className="hover:text-white transition-colors">Terms</Link>
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
          RepMail Privacy Policy
        </h1>
        <p className="text-base mb-2" style={{ color: "#7878A0" }}>
          Last updated: June 2026 &nbsp;·&nbsp; Applies to all RepMail accounts
        </p>
        <p className="text-base leading-relaxed" style={{ color: "#A8A8C0" }}>
          This Privacy Policy describes how RepMail (operated by LetsZero Technologies) collects,
          uses, and protects data when you use the RepMail email outreach platform. RepMail is a
          product of LetsZero — see also the{" "}
          <Link href="/privacy">
            <span className="cursor-pointer" style={{ color: "#00E5C8" }}>LetsZero Corporate Privacy Policy</span>
          </Link>
          {" "}for company-wide data practices.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">

        <Section id="account-data" title="1. Account Data">
          <p>
            RepMail collects your name, email address, and company name at registration. If you
            sign in via Google OAuth, we receive only the profile fields you authorise (name,
            email, profile photo). We do not receive access to your Google mailbox or
            Google Drive.
          </p>
          <p className="mt-3">
            Your account credentials are protected with bcrypt password hashing (cost factor 12).
            Sessions are maintained via a server-side session cookie. We do not use persistent
            tracking cookies or advertising identifiers.
          </p>
        </Section>

        <Section id="contact-uploads" title="2. Contact Upload Responsibilities">
          <p>
            RepMail allows you to upload contact lists (CSV or manual entry) containing recipient
            email addresses and custom fields (first name, last name, company, role, and custom
            variables). You are the data controller for all contact data you upload.
          </p>
          <SubHead>What we store</SubHead>
          <ul className="list-disc pl-5 space-y-2">
            <li>Recipient email addresses (required)</li>
            <li>Optional custom fields you provide (name, company, title, etc.)</li>
            <li>Campaign assignment metadata (which campaign the contact was added to)</li>
            <li>Send status and delivery outcome per contact</li>
          </ul>
          <SubHead>Your obligations</SubHead>
          <p>
            By uploading a contact list, you confirm that you have a lawful basis to contact each
            recipient — either explicit consent, a prior business relationship, or another legal
            basis applicable in your jurisdiction. RepMail does not validate the origin of your
            contact lists, but we will suspend accounts where uploaded lists generate complaint
            rates above 0.1% or bounce rates above 5%.
          </p>
          <p className="mt-3">
            We do not use your contact data for our own marketing, analytics, or model training.
            Contact data is retained for 24 months from the date of upload, after which it is
            automatically deleted from our systems unless you delete it earlier.
          </p>
        </Section>

        <Section id="ses-delivery" title="3. SES Delivery Processing">
          <p>
            RepMail sends all outbound emails through Amazon SES (Simple Email Service) using
            SMTP over TLS (port 587). Emails originate from the SES region <code style={{ color: "#00E5C8", background: "rgba(0,229,200,0.08)", padding: "1px 4px", borderRadius: "3px" }}>eu-north-1</code> (Stockholm)
            under the <code style={{ color: "#00E5C8", background: "rgba(0,229,200,0.08)", padding: "1px 4px", borderRadius: "3px" }}>letszero.in</code> domain with DKIM, SPF, and DMARC
            (<code style={{ color: "#00E5C8", background: "rgba(0,229,200,0.08)", padding: "1px 4px", borderRadius: "3px" }}>p=quarantine</code>) configured.
          </p>
          <p className="mt-3">
            Each outbound email consumes one RepMail credit from your account balance at the
            moment it is successfully submitted to SES for delivery. Credits are deducted regardless
            of whether the recipient&rsquo;s mail server ultimately accepts the message.
          </p>
          <p className="mt-3">
            SES transmits delivery events (sends, deliveries, delivery delays, bounces, complaints,
            opens, clicks) back to RepMail via Amazon SNS webhooks. These events are stored in our
            <code style={{ color: "#00E5C8", background: "rgba(0,229,200,0.08)", padding: "1px 4px", borderRadius: "3px" }}> sns_events</code> table and used
            exclusively to populate your campaign analytics and to enforce suppression rules.
          </p>
        </Section>

        <Section id="open-tracking" title="4. Open Tracking">
          <p>
            RepMail embeds a 1×1 transparent tracking pixel in the HTML body of each outbound
            email. When a recipient opens the email, their mail client loads this pixel, which
            signals an &ldquo;open&rdquo; event to Amazon SES. SES then delivers an <code style={{ color: "#00E5C8", background: "rgba(0,229,200,0.08)", padding: "1px 4px", borderRadius: "3px" }}>open</code> event
            to our webhook.
          </p>
          <p className="mt-3">
            Open tracking data is attributed to the campaign and counted at the aggregate level in
            your dashboard. We do not build individual recipient profiles from open events. Open
            tracking is subject to client-side image blocking (some mail clients suppress pixel
            loads by default — open rates therefore represent a minimum floor, not a precise count).
          </p>
          <p className="mt-3">
            Open tracking is enabled by default and cannot currently be disabled per campaign.
            If your campaign or jurisdiction requires you to disable tracking, contact{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>.
          </p>
        </Section>

        <Section id="click-tracking" title="5. Click Tracking">
          <p>
            RepMail rewrites URLs in outbound email bodies to route through SES click-tracking
            infrastructure. When a recipient clicks a tracked link, SES logs a <code style={{ color: "#00E5C8", background: "rgba(0,229,200,0.08)", padding: "1px 4px", borderRadius: "3px" }}>click</code> event
            and redirects the recipient to the original URL. The click event is delivered to our
            webhook and counted in your campaign analytics.
          </p>
          <p className="mt-3">
            We do not log individual recipient click behaviour beyond the aggregate count shown in
            your dashboard. Click data is retained for 24 months from the campaign send date.
          </p>
        </Section>

        <Section id="ai-content" title="6. AI-Generated Content">
          <p>
            RepMail offers AI-assisted email template generation powered by OpenAI. When you use
            this feature, RepMail sends the following to OpenAI&rsquo;s API:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>Your sender profile (name, title, company)</li>
            <li>Campaign type and objective you specify</li>
            <li>Sample recipient attributes from your contact list (for personalisation preview)</li>
          </ul>
          <p className="mt-4">
            We do not send full contact lists to OpenAI — only the fields needed to generate a
            representative template preview. AI generation is subject to OpenAI&rsquo;s usage
            policies and data processing terms. Generated content is validated before delivery:
            unclosed placeholders, subject length, and spam-indicator patterns are checked
            automatically.
          </p>
          <p className="mt-3">
            AI-generated content is a starting point — you review and approve all templates
            before sending. RepMail does not guarantee that AI-generated content is compliant with
            any specific industry regulation or jurisdiction&rsquo;s email marketing law.
          </p>
        </Section>

        <Section id="bounce-handling" title="7. Bounce Handling">
          <p>
            Amazon SES classifies bounces as:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong style={{ color: "#F0F0F5" }}>Hard bounce</strong> — the address is permanently
              invalid (e.g. no such user, domain does not exist). Hard-bounced addresses are added
              to your suppression list automatically and will not be contacted again.
            </li>
            <li>
              <strong style={{ color: "#F0F0F5" }}>Soft bounce</strong> — temporary delivery failure
              (e.g. mailbox full, server temporarily unavailable). Soft bounces are logged but do not
              automatically trigger suppression.
            </li>
          </ul>
          <p className="mt-4">
            If your campaign-level bounce rate (hard bounces ÷ emails sent) exceeds <strong style={{ color: "#F87171" }}>5%</strong>,
            RepMail will automatically pause your account from sending. You will see a banner in
            the dashboard. To resume, contact{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>.
          </p>
          <p className="mt-3">
            SES will also pause your SES account if bounce rates exceed AWS thresholds
            (typically 10%). Maintaining a clean contact list is your responsibility.
          </p>
        </Section>

        <Section id="complaint-handling" title="8. Complaint Handling">
          <p>
            A complaint event is generated when a recipient clicks the &ldquo;Report Spam&rdquo; or
            &ldquo;Junk&rdquo; button in their mail client. Amazon SES routes complaint notifications
            to our webhook via SNS.
          </p>
          <p className="mt-3">
            Complained addresses are added to your suppression list immediately and will not be
            contacted again. If your complaint rate exceeds <strong style={{ color: "#F87171" }}>0.1%</strong>
            (1 complaint per 1,000 emails), RepMail will pause your account from sending.
          </p>
          <p className="mt-3">
            AWS SES also enforces its own complaint rate thresholds. Accounts with persistent
            complaint rates above AWS limits risk having their SES sending privileges revoked —
            this affects all users on the RepMail platform, not just the offending account.
            Repeat violations will result in permanent account termination.
          </p>
        </Section>

        <Section id="suppression" title="9. Suppression Management">
          <p>
            RepMail maintains a suppression list for each account. Addresses are added to the
            suppression list from four sources:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li><strong style={{ color: "#F0F0F5" }}>Hard bounce</strong> — automatic, immediate</li>
            <li><strong style={{ color: "#F0F0F5" }}>Complaint</strong> — automatic, immediate</li>
            <li><strong style={{ color: "#F0F0F5" }}>Unsubscribe</strong> — when recipient clicks an unsubscribe link in the email</li>
            <li><strong style={{ color: "#F0F0F5" }}>Manual</strong> — when you manually suppress an address via the dashboard</li>
          </ul>
          <p className="mt-4">
            Suppressed addresses are excluded from all future campaigns automatically. You must
            not manually remove hard-bounced or complained addresses to attempt re-contact — doing
            so violates both anti-spam law and these Terms of Service and will result in account
            suspension.
          </p>
          <p className="mt-3">
            Suppression entries are retained indefinitely to comply with CAN-SPAM, GDPR, and
            similar anti-spam obligations. Even after account deletion, suppression records may
            be retained in anonymised form for compliance purposes.
          </p>
        </Section>

        <Section id="retention" title="10. Data Retention">
          <table
            className="w-full mt-3 text-sm"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #1A1A2E" }}>
                <th className="text-left py-2 pr-4" style={{ color: "#F0F0F5", fontWeight: 600 }}>Data type</th>
                <th className="text-left py-2" style={{ color: "#F0F0F5", fontWeight: 600 }}>Retention period</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Account profile", "Until account deletion + 30 days"],
                ["Contact lists", "24 months from upload date"],
                ["Campaign content & analytics", "24 months from campaign send date"],
                ["SNS delivery events", "24 months from event timestamp"],
                ["Suppression entries", "Indefinite (compliance requirement)"],
                ["Payment records", "7 years (statutory accounting requirement)"],
                ["Audit logs", "12 months"],
                ["AI generation logs", "30 days"],
              ].map(([type, period]) => (
                <tr key={type} style={{ borderBottom: "1px solid #111120" }}>
                  <td className="py-2 pr-4" style={{ color: "#C8C8D8" }}>{type}</td>
                  <td className="py-2" style={{ color: "#A8A8C0" }}>{period}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4">
            You may request early deletion of contact lists or campaign data by emailing{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>.
            Suppression entries and payment records cannot be deleted before their retention period expires.
          </p>
        </Section>

        <Section id="termination" title="11. Account Termination">
          <SubHead>Voluntary termination</SubHead>
          <p>
            You may request account deletion at any time by contacting{" "}
            <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>.
            Upon confirmed deletion: account profile data is removed within 30 days, active
            campaigns are cancelled, and unused purchased credits are forfeited (no refund is
            issued unless requested within 7 days of the most recent purchase and fewer than
            10% of those credits were used).
          </p>
          <SubHead>Involuntary termination</SubHead>
          <p>
            RepMail may terminate your account immediately and without refund if:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>Bounce rate exceeds 5% and is not remediated after warning</li>
            <li>Complaint rate exceeds 0.1% and is not remediated after warning</li>
            <li>Your campaigns are found to be sending to purchased, harvested, or scraped lists</li>
            <li>You remove suppressed addresses and attempt to re-contact them</li>
            <li>Your account is used for phishing, malware distribution, or impersonation</li>
            <li>You create multiple accounts to circumvent free plan limits</li>
          </ul>
          <p className="mt-4">
            Serious violations are reported to AWS and may result in IP-level blocks and legal referral.
          </p>
          <SubHead>Data after termination</SubHead>
          <p>
            After account deletion, your data is handled per the retention schedule in Section 10.
            Suppression entries are retained indefinitely. You may request a data export before
            deletion — we will provide it within 30 days of request.
          </p>
        </Section>

        <Section id="contact-us" title="12. Contact">
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
              For general company privacy matters, see the{" "}
              <Link href="/privacy">
                <span className="cursor-pointer" style={{ color: "#00E5C8" }}>LetsZero Corporate Privacy Policy</span>
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
            <Link href="/privacy" style={{ color: "#6B7280" }} className="hover:text-white transition-colors text-xs">LetsZero Legal</Link>
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
