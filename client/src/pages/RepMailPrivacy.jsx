import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Database, Upload, Eye, MousePointer2, Sparkles, Zap, Clock, Mail,
  AlertCircle, Flag, ShieldOff, UserX, Shield
} from "lucide-react";

const NAV = [
  { id: "account-data",    label: "Data Collection",  icon: Database },
  { id: "contact-uploads", label: "Contact Uploads",  icon: Upload },
  { id: "open-tracking",   label: "Open Tracking",    icon: Eye },
  { id: "click-tracking",  label: "Click Tracking",   icon: MousePointer2 },
  { id: "ai-content",      label: "AI Content",       icon: Sparkles },
  { id: "ses-delivery",    label: "Deliverability",   icon: Zap },
  { id: "retention",       label: "Retention",        icon: Clock },
  { id: "contact-us",      label: "Contact",          icon: Mail },
];

function Mono({ children }) {
  return (
    <code style={{ color: "#00E5C8", background: "rgba(0,229,200,0.08)", padding: "1px 5px", borderRadius: "4px", fontSize: "0.85em", fontFamily: "monospace" }}>
      {children}
    </code>
  );
}

function Section({ id, title, icon: Icon, iconColor = "#00E5C8", iconBg = "rgba(0,229,200,0.07)", iconBorder = "rgba(0,229,200,0.14)", children }) {
  return (
    <section id={id} style={{ scrollMarginTop: "90px" }}>
      <div className="rounded-2xl p-7" style={{ background: "#0A1428", border: "1px solid #162035" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>
            <Icon style={{ width: "15px", height: "15px", color: iconColor }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </h2>
        </div>
        <div className="text-sm leading-relaxed space-y-3" style={{ color: "#94A3B8" }}>
          {children}
        </div>
      </div>
    </section>
  );
}

function SubHead({ children }) {
  return (
    <h3 className="text-sm font-semibold pt-2 mb-1" style={{ color: "#CBD5E1", fontFamily: "'Space Grotesk', sans-serif" }}>
      {children}
    </h3>
  );
}

export default function RepMailPrivacy() {
  const [active, setActive] = useState("account-data");

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.3;
      let cur = NAV[0].id;
      for (const { id } of NAV) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "#050A14", color: "#CBD5E1", fontFamily: "'Inter', sans-serif" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(5,10,20,0.94)", borderColor: "#162035" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/app/dashboard">
            <img src="/repmail-logo.png" alt="RepMail" className="h-9 w-auto cursor-pointer" style={{ objectFit: "contain" }} />
          </Link>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#64748B" }}>
            <Link href="/repmail/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/app/dashboard">
              <span className="px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer" style={{ background: "rgba(0,229,200,0.1)", border: "1px solid rgba(0,229,200,0.25)", color: "#00E5C8" }}>
                Dashboard →
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: "linear-gradient(160deg, rgba(0,229,200,0.04) 0%, rgba(59,130,246,0.02) 50%, transparent 100%)", borderBottom: "1px solid #162035" }}>
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-semibold" style={{ background: "rgba(0,229,200,0.06)", border: "1px solid rgba(0,229,200,0.18)", color: "#00E5C8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <Shield style={{ width: "11px", height: "11px" }} />
            RepMail Legal
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            Privacy Policy
          </h1>
          <p className="text-sm mb-4" style={{ color: "#475569" }}>
            Last updated: June 2026 &nbsp;·&nbsp; Applies to all RepMail accounts
          </p>
          <p className="text-base leading-relaxed max-w-2xl" style={{ color: "#94A3B8" }}>
            How RepMail (operated by LetsZero Technologies) collects, uses, and protects your data.
            RepMail is a product of LetsZero — see also the{" "}
            <Link href="/privacy">
              <span className="cursor-pointer" style={{ color: "#00E5C8" }}>LetsZero Corporate Privacy Policy</span>
            </Link>
            {" "}for company-wide data practices.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 xl:gap-14">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky" style={{ top: "88px" }}>
              <p className="text-xs font-semibold uppercase mb-4" style={{ color: "#334155", letterSpacing: "0.08em" }}>
                On this page
              </p>
              <nav className="space-y-0.5">
                {NAV.map(({ id, label, icon: Icon }) => {
                  const on = active === id;
                  return (
                    <button
                      key={id}
                      onClick={() => scrollTo(id)}
                      aria-current={on ? "true" : undefined}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-r-lg text-sm text-left transition-all"
                      style={{
                        background: on ? "rgba(0,229,200,0.07)" : "transparent",
                        borderLeft: on ? "2px solid #00E5C8" : "2px solid transparent",
                        color: on ? "#00E5C8" : "#6B7280",
                        fontWeight: on ? 500 : 400,
                      }}
                    >
                      <Icon style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile pill nav */}
          <div className="lg:hidden col-span-full -mx-6 px-6 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              {NAV.map(({ id, label }) => {
                const on = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    aria-current={on ? "true" : undefined}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                    style={{
                      background: on ? "rgba(0,229,200,0.12)" : "rgba(22,32,53,0.6)",
                      border: on ? "1px solid rgba(0,229,200,0.35)" : "1px solid #1E2D47",
                      color: on ? "#00E5C8" : "#6B7280",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <main className="space-y-5 pb-24 min-w-0">

            <Section id="account-data" title="Account Data" icon={Database}>
              <p>
                RepMail collects your name, email address, and company name at registration. If you
                sign in via Google OAuth, we receive only the profile fields you authorise (name,
                email, profile photo). We do not receive access to your Google mailbox or
                Google Drive.
              </p>
              <p>
                Your account credentials are protected with bcrypt password hashing (cost factor 12).
                Sessions are maintained via a server-side session cookie. We do not use persistent
                tracking cookies or advertising identifiers.
              </p>
            </Section>

            <Section id="contact-uploads" title="Contact Upload Responsibilities" icon={Upload}>
              <p>
                RepMail allows you to upload contact lists (CSV or manual entry) containing recipient
                email addresses and custom fields (first name, last name, company, role, and custom
                variables). You are the data controller for all contact data you upload.
              </p>
              <SubHead>What we store</SubHead>
              <ul className="list-disc pl-5 space-y-1.5">
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
              <p>
                We do not use your contact data for our own marketing, analytics, or model training.
                Contact data is retained for 24 months from the date of upload, after which it is
                automatically deleted from our systems unless you delete it earlier.
              </p>
            </Section>

            <Section id="open-tracking" title="Open Tracking" icon={Eye}>
              <p>
                RepMail embeds a 1×1 transparent tracking pixel in the HTML body of each outbound
                email. When a recipient opens the email, their mail client loads this pixel, which
                signals an &ldquo;open&rdquo; event to Amazon SES. SES then delivers an <Mono>open</Mono> event
                to our webhook.
              </p>
              <p>
                Open tracking data is attributed to the campaign and counted at the aggregate level in
                your dashboard. We do not build individual recipient profiles from open events. Open
                tracking is subject to client-side image blocking (some mail clients suppress pixel
                loads by default — open rates therefore represent a minimum floor, not a precise count).
              </p>
              <p>
                Open tracking is enabled by default and cannot currently be disabled per campaign.
                If your campaign or jurisdiction requires you to disable tracking, contact{" "}
                <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>.
              </p>
            </Section>

            <Section id="click-tracking" title="Click Tracking" icon={MousePointer2}>
              <p>
                RepMail rewrites URLs in outbound email bodies to route through SES click-tracking
                infrastructure. When a recipient clicks a tracked link, SES logs a <Mono>click</Mono> event
                and redirects the recipient to the original URL. The click event is delivered to our
                webhook and counted in your campaign analytics.
              </p>
              <p>
                We do not log individual recipient click behaviour beyond the aggregate count shown in
                your dashboard. Click data is retained for 24 months from the campaign send date.
              </p>
            </Section>

            <Section id="ai-content" title="AI-Generated Content" icon={Sparkles}>
              <p>
                RepMail offers AI-assisted email template generation powered by OpenAI. When you use
                this feature, RepMail sends the following to OpenAI&rsquo;s API:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>Your sender profile (name, title, company)</li>
                <li>Campaign type and objective you specify</li>
                <li>Sample recipient attributes from your contact list (for personalisation preview)</li>
              </ul>
              <p>
                We do not send full contact lists to OpenAI — only the fields needed to generate a
                representative template preview. AI generation is subject to OpenAI&rsquo;s usage
                policies and data processing terms. Generated content is validated before delivery:
                unclosed placeholders, subject length, and spam-indicator patterns are checked
                automatically.
              </p>
              <p>
                AI-generated content is a starting point — you review and approve all templates
                before sending. RepMail does not guarantee that AI-generated content is compliant with
                any specific industry regulation or jurisdiction&rsquo;s email marketing law.
              </p>
            </Section>

            <Section id="ses-delivery" title="SES Delivery Processing" icon={Zap}>
              <p>
                RepMail sends all outbound emails through Amazon SES (Simple Email Service) using
                SMTP over TLS (port 587). Emails originate from the SES region <Mono>eu-north-1</Mono> (Stockholm)
                under the <Mono>letszero.in</Mono> domain with DKIM, SPF, and DMARC
                (<Mono>p=quarantine</Mono>) configured.
              </p>
              <p>
                Each outbound email consumes one RepMail credit from your account balance at the
                moment it is successfully submitted to SES for delivery. Credits are deducted regardless
                of whether the recipient&rsquo;s mail server ultimately accepts the message.
              </p>
              <p>
                SES transmits delivery events (sends, deliveries, delivery delays, bounces, complaints,
                opens, clicks) back to RepMail via Amazon SNS webhooks. These events are stored in our
                <Mono> sns_events</Mono> table and used exclusively to populate your campaign analytics and to enforce suppression rules.
              </p>
            </Section>

            <Section
              id="bounce-handling"
              title="Bounce Handling"
              icon={AlertCircle}
              iconColor="#FB923C"
              iconBg="rgba(251,146,60,0.07)"
              iconBorder="rgba(251,146,60,0.14)"
            >
              <p>Amazon SES classifies bounces as:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong style={{ color: "#F1F5F9" }}>Hard bounce</strong> — the address is permanently
                  invalid (e.g. no such user, domain does not exist). Hard-bounced addresses are added
                  to your suppression list automatically and will not be contacted again.
                </li>
                <li>
                  <strong style={{ color: "#F1F5F9" }}>Soft bounce</strong> — temporary delivery failure
                  (e.g. mailbox full, server temporarily unavailable). Soft bounces are logged but do not
                  automatically trigger suppression.
                </li>
              </ul>
              <p>
                If your campaign-level bounce rate (hard bounces ÷ emails sent) exceeds <strong style={{ color: "#F87171" }}>5%</strong>,
                RepMail will automatically pause your account from sending. You will see a banner in
                the dashboard. To resume, contact{" "}
                <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>.
              </p>
              <p>
                SES will also pause your SES account if bounce rates exceed AWS thresholds
                (typically 10%). Maintaining a clean contact list is your responsibility.
              </p>
            </Section>

            <Section
              id="complaint-handling"
              title="Complaint Handling"
              icon={Flag}
              iconColor="#FB923C"
              iconBg="rgba(251,146,60,0.07)"
              iconBorder="rgba(251,146,60,0.14)"
            >
              <p>
                A complaint event is generated when a recipient clicks the &ldquo;Report Spam&rdquo; or
                &ldquo;Junk&rdquo; button in their mail client. Amazon SES routes complaint notifications
                to our webhook via SNS.
              </p>
              <p>
                Complained addresses are added to your suppression list immediately and will not be
                contacted again. If your complaint rate exceeds <strong style={{ color: "#F87171" }}>0.1%</strong>
                {" "}(1 complaint per 1,000 emails), RepMail will pause your account from sending.
              </p>
              <p>
                AWS SES also enforces its own complaint rate thresholds. Accounts with persistent
                complaint rates above AWS limits risk having their SES sending privileges revoked —
                this affects all users on the RepMail platform, not just the offending account.
                Repeat violations will result in permanent account termination.
              </p>
            </Section>

            <Section id="suppression" title="Suppression Management" icon={ShieldOff}>
              <p>
                RepMail maintains a suppression list for each account. Addresses are added to the
                suppression list from four sources:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong style={{ color: "#F1F5F9" }}>Hard bounce</strong> — automatic, immediate</li>
                <li><strong style={{ color: "#F1F5F9" }}>Complaint</strong> — automatic, immediate</li>
                <li><strong style={{ color: "#F1F5F9" }}>Unsubscribe</strong> — when recipient clicks an unsubscribe link in the email</li>
                <li><strong style={{ color: "#F1F5F9" }}>Manual</strong> — when you manually suppress an address via the dashboard</li>
              </ul>
              <p>
                Suppressed addresses are excluded from all future campaigns automatically. You must
                not manually remove hard-bounced or complained addresses to attempt re-contact — doing
                so violates both anti-spam law and these Terms of Service and will result in account
                suspension.
              </p>
              <p>
                Suppression entries are retained indefinitely to comply with CAN-SPAM, GDPR, and
                similar anti-spam obligations. Even after account deletion, suppression records may
                be retained in anonymised form for compliance purposes.
              </p>
            </Section>

            <Section id="retention" title="Data Retention" icon={Clock}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E2D47" }}>
                    <th className="text-left py-2.5 pr-4" style={{ color: "#CBD5E1", fontWeight: 600 }}>Data type</th>
                    <th className="text-left py-2.5" style={{ color: "#CBD5E1", fontWeight: 600 }}>Retention period</th>
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
                  ].map(([type, period], i) => (
                    <tr key={type} style={{ borderBottom: "1px solid #111B2A", background: i % 2 === 1 ? "rgba(22,32,53,0.35)" : "transparent" }}>
                      <td className="py-2.5 pr-4" style={{ color: "#CBD5E1" }}>{type}</td>
                      <td className="py-2.5" style={{ color: "#64748B" }}>{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="pt-3">
                You may request early deletion of contact lists or campaign data by emailing{" "}
                <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>.
                Suppression entries and payment records cannot be deleted before their retention period expires.
              </p>
            </Section>

            <Section
              id="termination"
              title="Account Termination"
              icon={UserX}
              iconColor="#F87171"
              iconBg="rgba(248,113,113,0.07)"
              iconBorder="rgba(248,113,113,0.14)"
            >
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
              <p>RepMail may terminate your account immediately and without refund if:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Bounce rate exceeds 5% and is not remediated after warning</li>
                <li>Complaint rate exceeds 0.1% and is not remediated after warning</li>
                <li>Your campaigns are found to be sending to purchased, harvested, or scraped lists</li>
                <li>You remove suppressed addresses and attempt to re-contact them</li>
                <li>Your account is used for phishing, malware distribution, or impersonation</li>
                <li>You create multiple accounts to circumvent free plan limits</li>
              </ul>
              <p>Serious violations are reported to AWS and may result in IP-level blocks and legal referral.</p>
              <SubHead>Data after termination</SubHead>
              <p>
                After account deletion, your data is handled per the retention schedule above.
                Suppression entries are retained indefinitely. You may request a data export before
                deletion — we will provide it within 30 days of request.
              </p>
            </Section>

            <Section id="contact-us" title="Contact" icon={Mail}>
              <div className="rounded-xl p-5" style={{ background: "#060E1E", border: "1px solid #1E2D47" }}>
                <p className="font-semibold mb-2" style={{ color: "#F1F5F9" }}>RepMail / LetsZero Technologies</p>
                <p>
                  Email:{" "}
                  <a href="mailto:support@letszero.in" style={{ color: "#00E5C8" }}>support@letszero.in</a>
                </p>
                <p className="mt-1">
                  Contact form:{" "}
                  <Link href="/contact">
                    <span className="cursor-pointer" style={{ color: "#00E5C8" }}>letszero.in/contact</span>
                  </Link>
                </p>
                <p className="mt-3" style={{ color: "#475569" }}>
                  For general company privacy matters, see the{" "}
                  <Link href="/privacy">
                    <span className="cursor-pointer" style={{ color: "#00E5C8" }}>LetsZero Corporate Privacy Policy</span>
                  </Link>
                  .
                </p>
              </div>
            </Section>

          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t" style={{ background: "#050A14", borderColor: "#162035" }}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#334155" }}>
            <img src="/repmail-logo.png" alt="RepMail" className="h-6 w-auto" style={{ objectFit: "contain" }} />
            <span>© {new Date().getFullYear()} LetsZero. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/repmail/privacy" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/repmail/terms" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Contact</Link>
            <Link href="/privacy" style={{ color: "#4B5563" }} className="hover:text-white transition-colors text-xs">LetsZero Legal</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
