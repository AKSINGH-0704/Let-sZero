import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Layers, Shield, Ban, Users, CreditCard, Sparkles,
  ShieldOff, Users2, Gauge, UserX, TriangleAlert,
  Globe, RefreshCw, Mail
} from "lucide-react";

const NAV = [
  { id: "acceptable-use",          label: "Acceptable Use",  icon: Shield },
  { id: "anti-spam",               label: "Anti-Spam",       icon: Ban },
  { id: "credits",                 label: "Credits",         icon: CreditCard },
  { id: "ai-content",              label: "AI Usage",        icon: Sparkles },
  { id: "suppression-obligations", label: "Suppressions",    icon: ShieldOff },
  { id: "team-accounts",           label: "Teams",           icon: Users2 },
  { id: "liability",               label: "Liability",       icon: TriangleAlert },
  { id: "contact-us",              label: "Contact",         icon: Mail },
];

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

export default function RepMailTerms() {
  const [active, setActive] = useState("acceptable-use");

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
            <img src="/repmail-logo-white.png" alt="RepMail" className="h-9 w-auto cursor-pointer" style={{ objectFit: "contain" }} />
          </Link>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#64748B" }}>
            <Link href="/repmail/privacy" className="hover:text-white transition-colors">Privacy</Link>
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
      <div style={{ background: "linear-gradient(160deg, rgba(139,92,246,0.04) 0%, rgba(59,130,246,0.02) 50%, transparent 100%)", borderBottom: "1px solid #162035" }}>
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-semibold" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <Layers style={{ width: "11px", height: "11px" }} />
            RepMail Legal
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            Terms of Service
          </h1>
          <p className="text-sm mb-4" style={{ color: "#475569" }}>
            Last updated: June 2026 &nbsp;·&nbsp; Binding on all RepMail accounts
          </p>
          <p className="text-base leading-relaxed max-w-2xl" style={{ color: "#94A3B8" }}>
            These Terms govern your use of the RepMail email outreach platform operated by
            LetsZero Solutions Private Limited. By creating an account or sending a campaign, you accept these
            Terms. See also the{" "}
            <Link href="/terms">
              <span className="cursor-pointer" style={{ color: "#A78BFA" }}>LetsZero Corporate Terms of Service</span>
            </Link>
            {" "}which apply in conjunction.
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
                        background: on ? "rgba(167,139,250,0.07)" : "transparent",
                        borderLeft: on ? "2px solid #A78BFA" : "2px solid transparent",
                        color: on ? "#A78BFA" : "#6B7280",
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
                      background: on ? "rgba(167,139,250,0.12)" : "rgba(22,32,53,0.6)",
                      border: on ? "1px solid rgba(167,139,250,0.35)" : "1px solid #1E2D47",
                      color: on ? "#A78BFA" : "#6B7280",
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

            {/* Platform description — not in sidebar, no icon card style needed */}
            <section id="platform" style={{ scrollMarginTop: "90px" }}>
              <div className="rounded-2xl p-7" style={{ background: "#0A1428", border: "1px solid #162035" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.14)" }}>
                    <Layers style={{ width: "15px", height: "15px", color: "#A78BFA" }} />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
                    Platform Description
                  </h2>
                </div>
                <div className="text-sm leading-relaxed space-y-3" style={{ color: "#94A3B8" }}>
                  <p>
                    RepMail is a credit-based email outreach platform. You purchase sending credits,
                    create personalised email campaigns, upload contact lists, and RepMail delivers
                    emails on your behalf via Amazon SES. One credit is consumed per email successfully
                    submitted to SES — regardless of final delivery outcome.
                  </p>
                  <p>
                    The platform includes: campaign management, AI-assisted template generation, contact
                    list management, delivery analytics (open/click/bounce/complaint rates), suppression
                    management, and a team hierarchy (ROOT_ADMIN → SUB_ADMIN → USER).
                  </p>
                </div>
              </div>
            </section>

            <Section id="acceptable-use" title="Acceptable Use" icon={Shield}>
              <p>
                RepMail is built for legitimate outreach — not bulk unsolicited email. Sending spam
                is prohibited, violates these Terms, and may violate applicable law.
              </p>
              <SubHead>Prohibited sending practices</SubHead>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Sending to addresses collected without permission (scraped, purchased, rented, or harvested lists)</li>
                <li>Sending to addresses that have previously bounced (hard bounce) or complained</li>
                <li>Sending to recipients who have unsubscribed</li>
                <li>Using misleading or deceptive subject lines</li>
                <li>Impersonating another person, company, or brand</li>
                <li>Forging email headers or FROM addresses</li>
                <li>Omitting required identification or unsubscribe mechanisms</li>
              </ul>
            </Section>

            <Section
              id="anti-spam"
              title="Anti-Spam Compliance"
              icon={Ban}
              iconColor="#F87171"
              iconBg="rgba(248,113,113,0.07)"
              iconBorder="rgba(248,113,113,0.14)"
            >
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
              <p>
                These thresholds are enforced in real time via SES delivery event monitoring. Accounts
                paused for exceeding thresholds must contact support before sending can resume. Repeat
                violations result in permanent termination.
              </p>
            </Section>

            <section id="contact-responsibility" style={{ scrollMarginTop: "90px" }}>
              <div className="rounded-2xl p-7" style={{ background: "#0A1428", border: "1px solid #162035" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "rgba(0,229,200,0.07)", border: "1px solid rgba(0,229,200,0.14)" }}>
                    <Users style={{ width: "15px", height: "15px", color: "#00E5C8" }} />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
                    Contact List Responsibility
                  </h2>
                </div>
                <div className="text-sm leading-relaxed space-y-3" style={{ color: "#94A3B8" }}>
                  <p>
                    You are the data controller for all contact lists you upload to RepMail. By uploading
                    a list, you represent and warrant that:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
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
                  <p>
                    LetsZero is a data processor acting on your instructions for contact data. You indemnify
                    LetsZero against any claims, fines, or regulatory actions arising from your contact data
                    practices.
                  </p>
                </div>
              </div>
            </section>

            <Section id="credits" title="Credits and Payments" icon={CreditCard}>
              <SubHead>4.1 How credits work</SubHead>
              <p>
                Credits are the RepMail sending currency. You purchase credits in advance from the
                pricing page or dashboard. One credit = one email submitted to SES. Credits are
                deducted from your balance in the following order:
              </p>
              <ol className="list-decimal pl-5 space-y-1 mt-2">
                <li>Free monthly pool (500 credits for free plan users, refreshed monthly)</li>
                <li>Purchased credit balance</li>
              </ol>

              <SubHead>4.2 Credit expiry</SubHead>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Purchased credits are valid for <strong style={{ color: "#F1F5F9" }}>6 months</strong> from purchase date.</li>
                <li>Volume bonus credits share the same expiry as the triggering purchase.</li>
                <li>Free plan monthly credits expire at month end and do not roll over.</li>
                <li>Team-allocated credits (parent → child) expire with the allocation event.</li>
              </ul>

              <SubHead>4.3 Refund policy</SubHead>
              <p>Refunds are available for unused purchased credits under these conditions:</p>
              <InfoBox color="cyan">
                <p>Request within <strong>7 days</strong> of purchase</p>
                <p className="mt-1">Fewer than <strong>10%</strong> of the purchased credits have been used</p>
                <p className="mt-1">No evidence of platform abuse on the account</p>
              </InfoBox>
              <p>
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

            <Section id="ai-content" title="AI-Generated Content" icon={Sparkles}>
              <p>
                RepMail provides AI-assisted template generation as a convenience feature. You are
                fully responsible for reviewing and approving any AI-generated content before sending.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>
                  RepMail does not guarantee that AI-generated content is accurate, compliant with
                  anti-spam law, or suitable for your specific use case.
                </li>
                <li>
                  AI generation is subject to daily per-user quotas (enforced in the application) to
                  prevent API cost abuse.
                </li>
                <li>
                  You may not use AI generation to produce content that violates the Acceptable Use or
                  Anti-Spam sections, or that is deceptive, harassing, or illegal.
                </li>
                <li>
                  AI-generated emails are validated automatically for unclosed placeholders and basic
                  quality checks. Validation does not guarantee legal compliance.
                </li>
              </ul>
            </Section>

            <Section id="suppression-obligations" title="Suppression Obligations" icon={ShieldOff}>
              <p>
                RepMail automatically manages a suppression list for your account. You have additional
                obligations:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
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

            <Section id="team-accounts" title="Team Accounts and Permissions" icon={Users2}>
              <p>
                RepMail supports a three-tier hierarchy: ROOT_ADMIN, SUB_ADMIN, and USER. As an
                account administrator, you are responsible for:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>All activity performed by users you create under your account</li>
                <li>Ensuring your sub-users comply with these Terms</li>
                <li>Credit allocations you make to sub-users (allocations are non-reversible)</li>
              </ul>
              <p>
                If a sub-user violates these Terms, the root account is jointly liable.
              </p>
            </Section>

            <section id="availability" style={{ scrollMarginTop: "90px" }}>
              <div className="rounded-2xl p-7" style={{ background: "#0A1428", border: "1px solid #162035" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "rgba(0,229,200,0.07)", border: "1px solid rgba(0,229,200,0.14)" }}>
                    <Gauge style={{ width: "15px", height: "15px", color: "#00E5C8" }} />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
                    Platform Availability
                  </h2>
                </div>
                <div className="text-sm leading-relaxed space-y-3" style={{ color: "#94A3B8" }}>
                  <p>
                    We target 99.5% monthly uptime. Planned maintenance will be announced with at least
                    24 hours notice. We are not liable for downtime caused by AWS SES, Railway, Redis,
                    Razorpay, or other third-party providers.
                  </p>
                  <p>
                    Campaign execution uses a BullMQ background queue (Redis-backed). During Redis
                    unavailability, campaigns fall back to inline execution. We do not guarantee
                    campaign delivery timing during extended infrastructure incidents.
                  </p>
                </div>
              </div>
            </section>

            <Section
              id="termination"
              title="Account Termination"
              icon={UserX}
              iconColor="#F87171"
              iconBg="rgba(248,113,113,0.07)"
              iconBorder="rgba(248,113,113,0.14)"
            >
              <SubHead>Grounds for immediate termination</SubHead>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Repeated bounce rate &gt; 5% after warning</li>
                <li>Repeated complaint rate &gt; 0.1% after warning</li>
                <li>Sending to purchased, harvested, or scraped lists</li>
                <li>Re-contacting suppressed addresses</li>
                <li>Phishing, malware distribution, or impersonation campaigns</li>
                <li>Creating multiple accounts to circumvent free plan limits (credit farming)</li>
                <li>Any activity that threatens the SES sending reputation of the RepMail platform</li>
              </ul>
              <p>
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

            <Section
              id="liability"
              title="Limitation of Liability"
              icon={TriangleAlert}
              iconColor="#FB923C"
              iconBg="rgba(251,146,60,0.07)"
              iconBorder="rgba(251,146,60,0.14)"
            >
              <p>
                RepMail is not liable for: undelivered emails, spam filter decisions, low open or
                click rates, recipient opt-out losses, regulatory fines arising from your campaigns,
                or any indirect, consequential, or punitive damages. Our maximum liability for any
                claim is the amount you paid us in the 3 months preceding the claim.
              </p>
              <p>
                You indemnify LetsZero against all claims, costs, and damages arising from: your
                contact list practices, your campaign content, your anti-spam compliance failures,
                or your misuse of the platform.
              </p>
            </Section>

            <section id="governing-law" style={{ scrollMarginTop: "90px" }}>
              <div className="rounded-2xl p-7" style={{ background: "#0A1428", border: "1px solid #162035" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "rgba(0,229,200,0.07)", border: "1px solid rgba(0,229,200,0.14)" }}>
                    <Globe style={{ width: "15px", height: "15px", color: "#00E5C8" }} />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
                    Governing Law
                  </h2>
                </div>
                <div className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                  <p>
                    These Terms are governed by the laws of India. Disputes are subject to the exclusive
                    jurisdiction of courts in Bengaluru, Karnataka, India. EU consumers retain the right
                    to bring claims in their country of residence.
                  </p>
                </div>
              </div>
            </section>

            <section id="changes" style={{ scrollMarginTop: "90px" }}>
              <div className="rounded-2xl p-7" style={{ background: "#0A1428", border: "1px solid #162035" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "rgba(0,229,200,0.07)", border: "1px solid rgba(0,229,200,0.14)" }}>
                    <RefreshCw style={{ width: "15px", height: "15px", color: "#00E5C8" }} />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
                    Changes to These Terms
                  </h2>
                </div>
                <div className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                  <p>
                    We reserve the right to update these Terms. Material changes will be communicated
                    via email to active account holders at least 14 days before the effective date.
                    Continued use after the effective date constitutes acceptance.
                  </p>
                </div>
              </div>
            </section>

            <Section id="contact-us" title="Contact" icon={Mail}>
              <div className="rounded-xl p-5" style={{ background: "#060E1E", border: "1px solid #1E2D47" }}>
                <p className="font-semibold mb-2" style={{ color: "#F1F5F9" }}>RepMail / LetsZero Solutions Private Limited</p>
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
                  For general company terms, see the{" "}
                  <Link href="/terms">
                    <span className="cursor-pointer" style={{ color: "#A78BFA" }}>LetsZero Corporate Terms of Service</span>
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
            <img src="/repmail-logo-white.png" alt="RepMail" className="h-6 w-auto" style={{ objectFit: "contain" }} />
            <span>© {new Date().getFullYear()} LetsZero. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/repmail/privacy" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/repmail/terms" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" style={{ color: "#9CA3AF" }} className="hover:text-white transition-colors">Contact</Link>
            <Link href="/terms" style={{ color: "#4B5563" }} className="hover:text-white transition-colors text-xs">LetsZero Legal</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
