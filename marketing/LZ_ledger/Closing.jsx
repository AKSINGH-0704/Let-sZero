/**
 * LETSZERO "LIVING LEDGER" — AI, Platform, Pricing, Final CTA, Footer.
 */

import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  C,
  EASE,
  PRODUCTS,
  MARQUEE_CLAIMS,
  RESOURCES,
  Reveal,
  Tilt,
  Aurora,
  SectionHeader,
  staggerParent,
  staggerChild,
  go,
  asText,
  onInk,
} from "./theme.jsx";
import { IMAGES } from "./fx.jsx";

/* ============================================================
   05 — INTELLIGENCE, GOVERNED
============================================================ */
export function AISection() {
  return (
    <section
      className="relative py-24 md:py-36 overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${C.paperHi} 0%, ${C.violet}0F 45%, ${C.teal}10 100%)`,
        borderTop: `1px solid ${C.ink}12`,
        borderBottom: `1px solid ${C.ink}12`,
      }}
    >
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <SectionHeader n="05" label="AI, with guardrails" accent={C.violetText} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          <div className="lg:col-span-6">
            <Reveal>
              <h2 className="lz-display font-bold tracking-[-0.02em] leading-[1.05] text-[clamp(30px,4.2vw,54px)]">
                AI writes the draft.
                <br />
                <em className="lz-serif" style={{ fontStyle: "italic", color: C.violet }}>
                  You stay in charge.
                </em>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-[520px] text-[16px] md:text-[17px] leading-relaxed" style={{ color: C.inkSoft }}>
                Tell RepMail who you are, who you're writing to and what you're
                offering. It writes a subject line and email in the tone you pick,
                then shows it filled in for up to three of your real contacts so
                you can see exactly what they'll get.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mt-6 max-w-[520px] text-[16px] md:text-[17px] leading-relaxed" style={{ color: C.inkSoft }}>
                <span style={{ color: C.ink, fontWeight: 600 }}>
                  One draft per campaign, not a different AI email for every person.
                </span>{" "}
                You can read what goes out, your costs stay predictable, and what
                you approve is exactly what gets sent.
              </p>
            </Reveal>

            <Reveal delay={0.26}>
              <div className="mt-10 flex flex-wrap gap-2">
                {[
                  ["B2B OUTREACH", C.oxide],
                  ["REAL ESTATE", C.amber],
                  ["RECRUITMENT", C.emerald],
                  ["PARTNERSHIP", C.teal],
                  ["FOLLOW-UP", C.violet],
                  ["GENERAL", C.rose],
                ].map(([t, accent], i) => (
                  <motion.span
                    key={t}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.35, ease: EASE }}
                    whileHover={{ scale: 1.08, rotate: i % 2 ? 1.5 : -1.5 }}
                    className="lz-mono text-[10.5px] tracking-[0.12em] px-3 py-1.5 rounded-full border cursor-default"
                    style={{ color: asText(accent), borderColor: `${accent}66`, background: `${accent}12` }}
                  >
                    {t}
                  </motion.span>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <Reveal delay={0.2}>
              <Tilt max={4}>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: C.paperHi,
                    border: `1px solid ${C.ink}1A`,
                    boxShadow: `0 30px 70px -30px ${C.violet}55`,
                  }}
                >
                  <div
                    className="px-5 py-3.5 flex items-center justify-between"
                    style={{
                      borderBottom: `1px solid ${C.ink}12`,
                      background: `linear-gradient(to right, ${C.violet}14, ${C.teal}10, transparent)`,
                    }}
                  >
                    <span className="lz-mono text-[10px] tracking-[0.2em]" style={{ color: C.inkFaintText }}>
                      WHAT THE AI DOES
                    </span>
                    <span className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: C.oxide }} />
                      <span className="w-2 h-2 rounded-full" style={{ background: C.amber }} />
                      <span className="w-2 h-2 rounded-full" style={{ background: C.emerald }} />
                    </span>
                  </div>
                  <div>
                    {[
                      ["Writes for", "B2B outreach · real estate · recruitment · partnerships · follow-ups", C.oxide],
                      ["In your tone", "professional · friendly · formal · casual", C.amber],
                      ["Preview", "see it filled in for 3 real contacts before sending", C.emerald],
                      ["Catches mistakes", "broken {{tags}} are blocked and your credit comes back", C.rose],
                      ["Spam check", "every template is scored before it can go out", C.teal],
                      ["Fair use", "daily limits, and repeat requests don't count against them", C.violet],
                    ].map(([k, v, accent], i) => (
                      <motion.div
                        key={k}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
                        className="px-5 py-4 group hover:bg-black/[0.02] transition-colors"
                        style={{ borderBottom: `1px solid ${C.ink}0D` }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                          <span className="lz-mono text-[10.5px] tracking-[0.15em] uppercase" style={{ color: asText(accent) }}>
                            {k}
                          </span>
                        </div>
                        <div className="text-[13.5px] leading-relaxed pl-3.5" style={{ color: C.ink }}>
                          {v}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Tilt>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   06 — THE PLATFORM
============================================================ */
export function PlatformSection() {
  return (
    <section className="relative py-24 md:py-36 overflow-hidden">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <SectionHeader n="06" label="Products" accent={C.oxideText} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="lg:col-span-8">
            <Reveal>
              <h2 className="lz-display font-bold tracking-[-0.02em] leading-[1.05] text-[clamp(30px,4.2vw,54px)]">
                Starting with email.
                <br />
                <span style={{ color: C.teal }}>Built for every way you reach customers.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-[620px] text-[16px] md:text-[17px] leading-relaxed" style={{ color: C.inkSoft }}>
                LetsZero builds the plumbing behind business communication so your
                team doesn't have to. RepMail is the first product. The tracking,
                credits and safety checks it runs on are what every product after
                it will be built on.
              </p>
            </Reveal>
          </div>
        </div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {PRODUCTS.map((p) => {
            // The live card was a <div> carrying onClick. That reads as a
            // button to a mouse and as nothing at all to everyone else: no tab
            // stop, no Enter, and no role for assistive technology to announce
            // — a WCAG 2.1.1 (Level A) failure, and a regression, since the
            // previous landing page shipped this as a real control.
            //
            // The action is navigation, so it is a link. A native <a> restores
            // focus, Enter, the announced role, the status bar target and
            // middle-click, none of which a div plus a key handler would have
            // given for free. Cards with no destination stay inert <div>s
            // rather than becoming disabled controls nobody can use.
            const Card = p.href ? motion.a : motion.div;
            return (
            <motion.div key={p.name} variants={staggerChild} className="h-full">
              <Card
                {...(p.href ? { href: p.href } : {})}
                whileHover={p.href ? { y: -10 } : { y: -4 }}
                transition={{ duration: 0.3, ease: EASE }}
                className={`relative h-full rounded-2xl p-[1.5px] overflow-hidden ${p.href ? "block cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#15120D]/50" : ""}`}
                style={{
                  background: p.live
                    ? `linear-gradient(135deg, ${C.oxide}, ${C.amber}, ${C.rose})`
                    : `${C.ink}1F`,
                }}
              >
                <div
                  className="relative h-full rounded-[14.5px] p-7 md:p-9 flex flex-col"
                  style={{ background: p.live ? C.paperHi : C.paper }}
                >
                  {p.live && (
                    <span
                      className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${C.amber}33, transparent 70%)` }}
                    />
                  )}
                  <div className="flex items-center justify-between mb-8">
                    <span
                      className="lz-mono text-[10px] tracking-[0.2em] px-2.5 py-1.5 rounded-full border flex items-center gap-2"
                      style={
                        p.live
                          ? { color: C.emeraldText, borderColor: `${C.emerald}66`, background: `${C.emerald}14` }
                          : { color: C.inkFaintText, borderColor: `${C.ink}1F`, background: "transparent" }
                      }
                    >
                      {p.live && <span data-ambient className="w-1.5 h-1.5 rounded-full lz-pulse" style={{ background: C.emerald }} />}
                      {p.status}
                    </span>
                    {p.href && (
                      <ArrowUpRight
                        className="w-5 h-5 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        style={{ color: C.oxide }}
                      />
                    )}
                  </div>
                  <h3
                    className="lz-display font-extrabold text-2xl md:text-[28px] tracking-[-0.015em] mb-3 flex items-center gap-3"
                    style={{ color: p.live ? C.ink : C.inkSoft }}
                  >
                    {p.logo && (
                      <motion.img
                        src={p.logo}
                        alt=""
                        className="w-10 h-10 object-contain"
                        whileHover={{ rotate: -8, scale: 1.1 }}
                      />
                    )}
                    {p.name}
                  </h3>
                  <p className="text-[14.5px] leading-relaxed flex-1" style={{ color: C.inkSoft }}>
                    {p.desc}
                  </p>
                  {p.href && (
                    <span className="mt-8 text-sm font-semibold flex items-center gap-2 transition-colors" style={{ color: C.oxideText }}>
                      Explore {p.name} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </div>
              </Card>
            </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   07 — PRICING PRINCIPLE
============================================================ */
export function PricingSection() {
  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden"
      style={{
        background: `linear-gradient(140deg, ${C.paperHi}, ${C.amber}12)`,
        borderTop: `1px solid ${C.ink}12`,
        borderBottom: `1px solid ${C.ink}12`,
      }}
    >
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <SectionHeader n="07" label="Pricing" accent={C.goldText} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8">
            <Reveal>
              <h2 className="lz-display font-bold tracking-[-0.02em] leading-[1.05] text-[clamp(30px,4.2vw,54px)]">
                Pay for the emails you send.
                <br />
                Not for{" "}
                <em className="lz-serif" style={{ fontStyle: "italic", color: C.goldText }}>
                  empty seats.
                </em>
              </h2>
            </Reveal>

            {/* animated equation */}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {[
                ["1 CREDIT", C.amber],
                ["=", C.inkFaint],
                ["1 EMAIL", C.teal],
                ["=", C.inkFaint],
                ["1 LINE ON YOUR RECEIPT", C.emerald],
              ].map(([t, accent], i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 16, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: i * 0.12, duration: 0.45, ease: EASE }}
                  className={
                    t === "="
                      ? "lz-mono text-2xl"
                      : "lz-mono text-[13px] md:text-sm font-bold tracking-[0.12em] px-4 py-2.5 rounded-xl border-2"
                  }
                  style={
                    t === "="
                      ? { color: asText(accent) }
                      : { color: asText(accent), borderColor: `${accent}66`, background: `${accent}12` }
                  }
                >
                  {t}
                </motion.span>
              ))}
            </div>

            <Reveal delay={0.2}>
              <p className="mt-8 max-w-[600px] text-[16px] md:text-[17px] leading-relaxed" style={{ color: C.inkSoft }}>
                Buy credits, then hand them out to your team like a budget. Every
                credit used is logged, so there are no surprise bills and no
                paying for people who barely send.
              </p>
            </Reveal>
          </div>
          <div className="lg:col-span-3 lg:col-start-10">
            <Reveal delay={0.15}>
              <motion.button
                onClick={() => go("/pricing")}
                whileHover={{ scale: 1.04, boxShadow: `0 16px 40px -14px ${C.gold}99` }}
                whileTap={{ scale: 0.97 }}
                className="group w-full px-7 py-4 rounded-full text-[15px] font-semibold text-white flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#15120D]/50"
                style={{ background: `linear-gradient(120deg, ${C.goldText}, ${C.ctaFrom})` }}
              >
                See credit pricing
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </motion.button>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   08 — RESOURCES (real Resource Center guides)
============================================================ */
export function ResourcesSection() {
  return (
    <section id="resources" className="relative py-24 md:py-32 overflow-hidden">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <SectionHeader n="08" label="Resources" accent={C.tealText} />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <Reveal>
            <h2 className="lz-display font-bold tracking-[-0.02em] leading-[1.05] text-[clamp(30px,4.2vw,54px)]">
              Learn what actually
              <br />
              <em className="lz-serif" style={{ fontStyle: "italic", color: C.teal }}>
                gets you replies.
              </em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <a
              href="/repmail/learn"
              className="group inline-flex items-center gap-2 rounded py-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40"
              style={{ color: C.tealText }}
            >
              Browse all guides
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </Reveal>
        </div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {RESOURCES.map((r) => (
            <motion.a
              key={r.href}
              href={r.href}
              variants={staggerChild}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              data-cursor="READ"
              className="group flex flex-col rounded-2xl overflow-hidden h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#15120D]/50"
              style={{ background: C.paperHi, border: `1px solid ${C.ink}1A`, boxShadow: `0 4px 24px -12px ${C.ink}26` }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={r.img}
                  alt=""
                  width={900}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  /* The card box is 3 across on desktop inside a 1320px rail,
                     one across below `md`. Without `sizes` the browser assumes
                     100vw and over-fetches for a ~390px box. */
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(160deg, ${r.accent}40, transparent 55%, ${C.ink}66)` }}
                />
                <span
                  className="absolute top-3 left-3 lz-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
                  style={{ color: C.paper, background: `${C.ink}CC` }}
                >
                  {r.tag}
                </span>
              </div>
              <div className="flex flex-col flex-1 p-6">
                <span className="lz-mono text-[10px] tracking-[0.15em] uppercase mb-2" style={{ color: asText(r.accent) }}>
                  {r.read}
                </span>
                <h3 className="lz-display font-bold text-lg leading-snug mb-2" style={{ color: C.ink }}>
                  {r.title}
                </h3>
                <p className="text-[14px] leading-relaxed flex-1" style={{ color: C.inkSoft }}>
                  {r.desc}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: asText(r.accent) }}>
                  Read the guide
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   09 — FINAL CTA + marquee
============================================================ */
function MarqueeRow({ reverse = false }) {
  // Four identical copies, so sliding by exactly half the track (two copies)
  // lands on an identical frame and the loop never visibly jumps.
  return (
    <div className="lz-marquee overflow-hidden">
      <div data-ambient className={`lz-marquee-track flex w-max whitespace-nowrap py-4 ${reverse ? "lz-marquee-rev" : ""}`}>
        {[0, 1, 2, 3].flatMap((copy) =>
          MARQUEE_CLAIMS.map(([t, accent]) => (
            <span
              key={`${copy}-${t}`}
              aria-hidden={copy > 0 ? "true" : undefined}
              className="lz-mono text-[12px] tracking-[0.2em] flex items-center gap-4 px-6"
            >
              <span style={{ color: accent }}>◆</span>
              <span style={{ color: `${C.paper}B3` }}>{t}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function CTASection() {
  return (
    <section className="relative py-28 md:py-40 overflow-hidden" style={{ background: C.ink, color: C.paper }}>
      {/* image backdrop — global network under ink wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${IMAGES.globe})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          opacity: 0.16,
          filter: "grayscale(0.6) contrast(1.05)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${C.ink}99 0%, ${C.ink}E6 70%, ${C.ink} 100%)` }}
        aria-hidden="true"
      />
      <Aurora mode="ink" />
      <div className="absolute inset-0 pointer-events-none lz-grain" />
      <div className="relative max-w-[1320px] mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <span
            className="lz-mono text-[11px] tracking-[0.25em] uppercase px-3 py-1.5 rounded-full border"
            style={{ color: C.amber, borderColor: `${C.amber}55`, background: `${C.amber}14` }}
          >
            Ready when you are
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="lz-display font-extrabold tracking-[-0.025em] leading-[0.98] text-[clamp(38px,6.5vw,88px)] mt-9">
            Send like your domain
            <br />
            <span className="lz-shimmer-text">depends on it.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          {/* "letting in early teams" implied a gate. REPMAIL_PUBLIC is true in
              production — /products/repmail, /pricing and sign-up are all open
              — so the copy says what is actually the case. */}
          <p className="mt-8 max-w-[520px] mx-auto text-[16px] md:text-[17px] leading-relaxed" style={{ color: "#BDB5A4" }}>
            RepMail is live and taking new teams now. Bring your list. We'll take
            care of keeping your domain safe.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* The filled button is the product journey, matching the nav and
                hero. Early access keeps its place in the closing pair — it is a
                real route — but as the secondary of the two, so the page's
                final conversion moment is not pointed at a waitlist whose
                conversion action has no configured label today. */}
            <motion.button
              onClick={() => go("/products/repmail")}
              whileHover={{ scale: 1.05, boxShadow: `0 20px 50px -16px ${C.ctaFrom}` }}
              whileTap={{ scale: 0.96 }}
              data-cursor="GO"
              className="group px-9 py-4 rounded-full text-[15px] font-semibold text-white flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15120D] focus-visible:ring-white/60"
              style={{ background: `linear-gradient(120deg, ${C.ctaFrom}, ${C.ctaTo})` }}
            >
              Explore RepMail
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button
              onClick={() => go("/early-access")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-9 py-4 rounded-full text-[15px] font-medium border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15120D] focus-visible:ring-white/60"
              style={{ borderColor: `${C.paper}33`, color: C.paper }}
            >
              Request early access
            </motion.button>
          </div>
        </Reveal>
      </div>

      {/* guarantee marquee: two rows drifting in opposite directions */}
      <div
        className="relative mt-20"
        style={{ borderTop: `1px solid ${C.paper}1A`, borderBottom: `1px solid ${C.paper}1A` }}
      >
        <MarqueeRow />
        <div style={{ borderTop: `1px solid ${C.paper}0F` }}>
          <MarqueeRow reverse />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
============================================================ */
export function Footer() {
  const cols = [
    {
      h: "Product", accent: C.oxideOnInk,
      links: [["RepMail", "/products/repmail"], ["Pricing", "/pricing"], ["Early access", "/early-access"]],
    },
    {
      h: "Company", accent: C.tealOnInk,
      // support@letszero.in was the previous landing page's "async" contact
      // path and the only one that needs neither JavaScript nor a form. The
      // redesign dropped it; it belongs beside Contact rather than nowhere.
      links: [
        ["How it works", "/#system"],
        ["Guarantees", "/#guarantees"],
        ["Contact", "/contact"],
        ["support@letszero.in", "mailto:support@letszero.in"],
      ],
    },
    {
      h: "Access", accent: C.emerald,
      links: [["Sign in", "/login"], ["Request access", "/early-access"], ["Resources", "/repmail/learn"]],
    },
    {
      h: "Legal", accent: C.amber,
      links: [["Privacy", "/privacy"], ["Terms", "/terms"]],
      // Consent withdrawal (M59 / ADS-005) — dispatches the same DOM event
      // CookiePreferences listens for, keeping this tree decoupled from client/.
      cookiePreferences: true,
    },
  ];

  return (
    <footer style={{ background: C.ink, color: C.paper }}>
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 grid place-items-center rounded-md" style={{ background: C.paper }}>
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: `conic-gradient(from 45deg, ${C.oxide}, ${C.amber}, ${C.emerald}, ${C.teal}, ${C.oxide})` }}
                />
              </span>
              <span className="lz-display text-xl font-extrabold tracking-tight">LetsZero</span>
            </div>
            <p className="mt-4 max-w-[340px] text-[13.5px] leading-relaxed" style={{ color: "#9A937F" }}>
              Outreach, accounted for. We build the tools that get your emails
              delivered, and keep your domain safe while they do.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.h} className="md:col-span-2">
              <div className="lz-mono text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: col.accent }}>
                {col.h}
              </div>
              <div className="space-y-2.5 text-sm">
                {col.links.map(([label, href]) => (
                  // M31-B: these were 20px-tall targets whose hover state was
                  // written by onMouseEnter/onMouseLeave as inline styles — a
                  // mechanism a keyboard user never triggers, leaving no focus
                  // indicator at all. Hover and focus are now the same CSS
                  // custom property, so they behave identically, and the
                  // vertical padding clears the 24px WCAG 2.5.8 minimum.
                  <a
                    key={label}
                    href={href}
                    className="lz-footer-link block min-h-[24px] py-1 rounded transition-all hover:translate-x-1 focus-visible:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    style={{ "--lz-accent": col.accent }}
                  >
                    {label}
                  </a>
                ))}
                {col.cookiePreferences && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("letszero:cookie-preferences"))}
                    className="lz-footer-link block min-h-[24px] py-1 text-left rounded transition-all hover:translate-x-1 focus-visible:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    style={{ "--lz-accent": col.accent }}
                  >
                    Cookie preferences
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${C.paper}1A` }}
        >
          <span className="lz-mono text-[10.5px]" style={{ color: "#9A937F" }}>
            © {new Date().getFullYear()} LetsZero · letszero.in
          </span>
          <span className="lz-mono text-[10.5px]">
            <span style={{ color: C.amber }}>EVERY PROMISE ON THIS PAGE</span>{" "}
            <span style={{ color: "#9A937F" }}>IS BUILT INTO THE PRODUCT.</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
