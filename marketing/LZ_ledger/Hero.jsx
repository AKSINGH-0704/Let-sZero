/**
 * LETSZERO "LIVING LEDGER" — Nav + cinematic Hero (collage, kinetic mixed type,
 * ghost word, rotating badge, ledger card) + event ticker.
 */

import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, ArrowDown, ChevronDown, Menu, X } from "lucide-react";
import { C, EASE, LEDGER_EVENTS, PRODUCTS, Counter, Tilt, Aurora, KineticWords, go, asText } from "./theme.jsx";
import { IMAGES, ImageCard, RotatingBadge, GhostWord } from "./fx.jsx";

const NAV_LINKS = [
  ["How it works", "#system", C.teal],
  ["Resources", "/repmail/learn", C.emerald],
  ["Pricing", "/pricing", C.amber],
  ["Contact", "/contact", C.violet],
];

// M31-B, restated for this page. The nav links were 20px-tall hit targets with
// no focus indicator of their own. `py-2` lifts them past the 24px WCAG 2.5.8
// minimum without moving anything visually (the row is items-center), and
// focus-visible gives keyboard users the indicator they otherwise had none of.
const NAV_LINK_CLASS =
  "relative inline-flex items-center rounded py-2 text-sm group " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40";

/* Products dropdown: opens on hover (desktop) and on click/keyboard,
   closes on outside click, Escape, or leaving the menu. */
function ProductsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const show = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const hide = () => { closeTimer.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded py-2 text-sm transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40"
        style={{ color: open ? C.oxideText : C.inkSoft }}
      >
        Products
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute -left-4 top-full pt-4 w-[340px]"
          >
            <div
              className="rounded-2xl p-2 overflow-hidden"
              style={{ background: C.paperHi, border: `1px solid ${C.ink}1A`, boxShadow: `0 24px 60px -20px ${C.ink}40` }}
            >
              {PRODUCTS.map((p) => {
                const Tag = p.href ? "a" : "div";
                return (
                  <Tag
                    key={p.name}
                    {...(p.href ? { href: p.href } : { "aria-disabled": "true" })}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40 ${p.href ? "hover:bg-black/[0.04]" : "opacity-60"}`}
                  >
                    <span className="w-10 h-10 shrink-0 rounded-lg grid place-items-center overflow-hidden" style={{ background: `${p.accent}14` }}>
                      {p.logo ? (
                        <img src={p.logo} alt="" className="w-7 h-7 object-contain" />
                      ) : (
                        <span className="w-3 h-3 rounded-sm" style={{ background: p.accent }} />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="lz-display font-bold text-[15px]" style={{ color: C.ink }}>{p.name}</span>
                        <span
                          className="lz-mono text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded"
                          style={p.live ? { color: C.emeraldText, background: `${C.emerald}16` } : { color: C.inkFaintText, background: `${C.ink}0D` }}
                        >
                          {p.status}
                        </span>
                      </span>
                      <span className="block mt-0.5 text-[12.5px] leading-snug" style={{ color: C.inkSoft }}>{p.short}</span>
                    </span>
                  </Tag>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Nav({ delay = 0.05 }) {
  const reduce = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      /* Transform-only. The header used to prerender at opacity 0, so the
         primary navigation — and the nav CTA, the page's main conversion
         entry — did not exist for anyone reading the static HTML, and blinked
         in only after hydration. A translate is enough of an entrance and
         leaves the markup legible from the first paint. */
      initial={reduce ? false : { y: -16 }}
      animate={reduce ? false : { y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      style={{
        background: scrolled ? "rgba(247,243,234,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.ink}1A` : "1px solid transparent",
      }}
    >
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 h-16 md:h-[72px] flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 rounded group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40">
          <motion.span
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="w-7 h-7 grid place-items-center rounded-md"
            style={{ background: C.ink }}
          >
            <span
              className="w-3 h-3 rounded-sm"
              style={{ background: `conic-gradient(from 45deg, ${C.oxide}, ${C.amber}, ${C.emerald}, ${C.teal}, ${C.oxide})` }}
            />
          </motion.span>
          <span className="flex items-baseline gap-2">
            <span className="lz-display text-[20px] font-extrabold tracking-tight">LetsZero</span>
            {/* The tagline costs ~168px. Measured, it is the difference between
                the bar fitting at 1024 and the wordmark running straight into
                "Products" there, so it waits for xl. */}
            <span className="lz-mono text-[10px] tracking-[0.22em] uppercase hidden xl:inline" style={{ color: C.inkFaintText }}>
              Outreach, accounted for
            </span>
          </span>
        </a>

        {/* M36, again. The desktop bar was enabled at `md` (768px). Measured
            with this page's own fonts it needs 995px: at 768 and 820 "Sign in"
            and the primary CTA were pushed off-screen entirely, and the brand
            tagline overlapped "Products" — the exact defect M36 recorded
            against the previous landing page. The bar now waits for `lg`, and
            the hamburger covers every tablet width below it. */}
        <nav className="hidden lg:flex items-center gap-7">
          <ProductsMenu />
          {NAV_LINKS.map(([label, href, accent]) => (
            <a key={label} href={href} className={NAV_LINK_CLASS} style={{ color: C.inkSoft }}>
              <span className="group-hover:opacity-0 transition-opacity duration-150">{label}</span>
              <span
                className="absolute inset-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 font-medium"
                style={{ color: accent }}
              >
                {label}
              </span>
              <span
                className="absolute bottom-1 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-300"
                style={{ background: accent }}
              />
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => go("/login")}
            className="px-4 py-2 text-sm rounded transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40"
            style={{ color: C.inkSoft }}
          >
            Sign in
          </button>
          {/* The product journey is the primary one. /early-access is a real,
              live route and keeps its place in the closing section and footer,
              but it is a waitlist: its conversion is SECONDARY and, today,
              carries no configured Google Ads label at all. Making it the
              headline CTA would have pointed the page's main traffic at the
              one path that reports nothing. */}
          <motion.button
            onClick={() => go("/products/repmail")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group px-5 py-2.5 text-sm font-medium rounded-full flex items-center gap-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#15120D]/50"
            style={{ background: `linear-gradient(120deg, ${C.ink} 0%, ${C.ink} 55%, ${C.ctaFrom} 130%)` }}
          >
            Explore RepMail
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        </div>

        <button
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          style={{ color: C.ink }}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="lg:hidden overflow-hidden"
            style={{ background: C.paperHi, borderBottom: `1px solid ${C.ink}1A` }}
          >
            <div className="px-5 py-4 flex flex-col">
              <div className="pb-3" style={{ borderBottom: `1px solid ${C.ink}0F` }}>
                <span className="lz-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: C.inkFaintText }}>Products</span>
                {PRODUCTS.map((p) =>
                  p.href ? (
                    <a key={p.name} href={p.href} onClick={() => setMobileOpen(false)} className="mt-2 flex items-center gap-3 rounded py-2 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40" style={{ color: C.ink }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.accent }} />
                      {p.name}
                      <span className="lz-mono text-[9px] tracking-[0.15em]" style={{ color: C.emeraldText }}>{p.status}</span>
                    </a>
                  ) : (
                    <div key={p.name} className="mt-2 flex items-center gap-3 py-2 text-[15px]" style={{ color: C.inkFaintText }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `${p.accent}66` }} />
                      {p.name}
                      <span className="lz-mono text-[9px] tracking-[0.15em]">{p.status}</span>
                    </div>
                  )
                )}
              </div>
              {[...NAV_LINKS, ["Sign in", "/login", C.ink]].map(([label, href, accent], i) => (
                <motion.a
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="py-3.5 text-[15px] flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15120D]/40"
                  style={{ borderBottom: `1px solid ${C.ink}0F`, color: C.ink }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                  {label}
                </motion.a>
              ))}
              {/* Mirrors the desktop bar: the product journey is primary. */}
              <motion.button
                onClick={() => go("/products/repmail")}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 mb-2 w-full px-5 py-3.5 text-sm font-medium rounded-full text-white flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#15120D]/50"
                style={{ background: `linear-gradient(120deg, ${C.ink}, ${C.ctaFrom})` }}
              >
                Explore RepMail <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// Thresholds match production, not campaignConfig.js's defaults: Railway sets
// COMPLAINT_RATE_PAUSE_THRESHOLD=0.0005 (0.05%) and
// BOUNCE_RATE_PAUSE_THRESHOLD=0.03 (3%). "14/sec" is the account-wide ceiling.
const LEDGER_ROWS = [
  ["Spam complaints", "counter-a", "auto-pause at 0.05%", C.emerald],
  ["Bounces", "counter-b", "auto-pause at 3%", C.emerald],
  ["Sending pace", "14/sec", "account ceiling, matched to SES", C.teal],
  ["Unsubscribes", "blocked", "for good, every campaign", C.rose],
  ["Delivery reports", "verified", "signed by Amazon only", C.violet],
  ["Activity log", "180 days", "can't be edited", C.amber],
];

/* Base delay for the hero's DECORATIVE entrances only.
   It used to be 1.45s, sized to hide behind the full-screen preloader curtain
   while that curtain existed. Measured on production, that ladder was the LCP:
   the supporting paragraph sat at opacity 0 until 3.9s and LCP landed at
   4792ms on a 390px cold load — and reduced-motion users paid the same price,
   because the delay was on `transition`, which no motion preference touches.
   Nothing load-bearing waits on this any more: the headline, the paragraph and
   the primary CTA are painted by the prerender and stay painted. What is left
   here staggers the collage and the ornaments, which no one is reading. */
const T = 0.05;

export function Hero() {
  const reduce = useReducedMotion();
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroDrift = useTransform(heroScroll, [0, 1], [0, reduce ? 0 : -70]);
  const collageDrift = useTransform(heroScroll, [0, 1], [0, reduce ? 0 : -150]);
  const ghostDrift = useTransform(heroScroll, [0, 1], [0, reduce ? 0 : 120]);

  return (
    <section ref={heroRef} className="relative pt-28 md:pt-40 pb-0 overflow-hidden min-h-[100svh]">
      <Aurora mode="paper" />
      <div className="absolute inset-0 pointer-events-none lz-grain" />

      {/* oversized ghost word, parallax opposite direction */}
      <motion.div
        style={{ y: ghostDrift }}
        className="absolute -right-8 top-[8%] hidden lg:block"
        aria-hidden="true"
      >
        <GhostWord word="ZERO" tone={C.ink} opacity={0.08} className="text-[26vw]" />
      </motion.div>

      <motion.div style={{ y: heroDrift }} className="relative max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-6 items-start">
          {/* Left — kinetic mixed-type statement */}
          <div className="lg:col-span-7 pt-2 md:pt-6">
            <motion.div
              initial={reduce ? false : { y: 10 }}
              animate={reduce ? false : { y: 0 }}
              transition={{ duration: 0.45, delay: 0, ease: EASE }}
              className="inline-flex items-center gap-2.5 mb-8 px-3.5 py-2 rounded-full border"
              style={{ borderColor: `${C.emerald}50`, background: `${C.emerald}12` }}
            >
              <span data-ambient className="w-2 h-2 rounded-full lz-pulse" style={{ background: C.emerald }} />
              <span className="lz-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: C.emeraldText }}>
                RepMail is live · onboarding early teams
              </span>
            </motion.div>

            <h1 className="leading-[0.93]">
              <span className="block lz-display font-extrabold uppercase tracking-[-0.02em] text-[clamp(44px,7.6vw,108px)]">
                <KineticWords text="Anyone" delay={T + 0.1} />{" "}
                <GhostWord word="can" tone={C.ink} opacity={0.85} className="text-[0.92em] align-baseline" />{" "}
                <KineticWords text="send." delay={T + 0.22} />
              </span>
              <span className="block mt-2 md:mt-3">
                <em
                  className="lz-serif text-[clamp(34px,5.4vw,76px)] tracking-[-0.01em]"
                  style={{ fontStyle: "italic", color: C.inkSoft }}
                >
                  <KineticWords text="few can" delay={T + 0.4} />
                </em>
              </span>
              <span className="relative block lz-display font-extrabold uppercase tracking-[-0.02em] text-[clamp(44px,7.6vw,108px)] mt-1 md:mt-2">
                <KineticWords text="keep sending." delay={T + 0.55} className="lz-shimmer-text" />
                <motion.svg
                  className="absolute left-0 -bottom-2 w-[78%]"
                  height="12"
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M2 8 Q 75 2, 150 7 T 298 5"
                    fill="none"
                    stroke={C.oxide}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, delay: T + 1.2, ease: EASE }}
                  />
                </motion.svg>
              </span>
            </h1>

            <motion.p
              initial={reduce ? false : { y: 14 }}
              animate={reduce ? false : { y: 0 }}
              transition={{ duration: 0.5, delay: 0.06, ease: EASE }}
              className="mt-9 max-w-[560px] text-[16.5px] md:text-lg leading-relaxed"
              style={{ color: C.inkSoft }}
            >
              Your domain's reputation is the one thing in outreach you{" "}
              <em className="lz-serif" style={{ fontStyle: "italic", color: C.ink }}>
                can't buy back
              </em>
              . RepMail{" "}
              <span style={{ color: C.amberText, fontWeight: 500 }}>checks</span> every email before it goes out,{" "}
              <span style={{ color: C.tealText, fontWeight: 500 }}>tracks</span> what happens after, and{" "}
              <span style={{ color: C.oxideText, fontWeight: 500 }}>pauses on its own</span>{" "}
              before a bad list can hurt you.
            </motion.p>

            <motion.div
              initial={reduce ? false : { y: 14 }}
              animate={reduce ? false : { y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
              className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              {/* Primary CTA keeps the production journey: the product page
                  leads to sign-up and purchase, both of which are PRIMARY
                  conversions with configured Google Ads labels. The waitlist
                  stays available further down the page. */}
              <motion.button
                onClick={() => go("/products/repmail")}
                whileHover={{ scale: 1.03, boxShadow: `0 16px 40px -12px ${C.ctaFrom}80` }}
                whileTap={{ scale: 0.97 }}
                data-cursor="GO"
                className="group px-8 py-4 text-[15px] font-semibold rounded-full text-white flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#15120D]/50"
                style={{ background: `linear-gradient(120deg, ${C.ctaFrom}, ${C.ctaTo})` }}
              >
                Explore RepMail
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.a
                href="#system"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 text-[15px] font-medium rounded-full border-2 flex items-center justify-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#15120D]/50"
                style={{ borderColor: `${C.ink}30`, color: C.ink }}
              >
                See how it works
                <motion.span animate={reduce ? {} : { y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                  <ArrowDown className="w-4 h-4" />
                </motion.span>
              </motion.a>
            </motion.div>
          </div>

          {/* Right — reputation ledger card + badge */}
          <motion.div style={{ y: collageDrift }} className="lg:col-span-5 relative hidden lg:block flex items-center justify-center">
            {/* rotating badge: top-right corner, above and clear of the card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: T + 0.9, ease: EASE }}
              className="absolute -top-8 right-0 z-30"
            >
              <RotatingBadge size={100} />
            </motion.div>

            {/* photo collage behind and beside the card */}
            <motion.div
              initial={{ opacity: 0, x: 40, rotate: 10 }}
              animate={{ opacity: 1, x: 0, rotate: 5 }}
              transition={{ duration: 1, delay: T + 0.5, ease: EASE }}
              className="absolute right-0 top-32 z-0 w-[180px] h-[230px]"
            >
              <div data-ambient className="lz-float w-full h-full">
                <ImageCard src={IMAGES.circuit} caption="Checked before sending" tone={C.teal} className="w-full h-full" priority />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: T + 0.8, ease: EASE }}
              className="absolute -right-4 bottom-[-104px] z-0 w-[170px] h-[120px]"
            >
              <div data-ambient className="lz-float w-full h-full" style={{ animationDelay: "-3.5s" }}>
                <ImageCard src={IMAGES.analytics} caption="Live numbers" tone={C.amber} className="w-full h-full" priority />
              </div>
            </motion.div>

            {/* the domain-health card */}
            <motion.div
              initial={{ opacity: 0, y: 48, rotate: 3 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.9, delay: T + 0.7, ease: EASE }}
              className="relative w-[330px] z-10 mt-20"
            >
              <Tilt max={6}>
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: C.paperHi,
                    border: `1px solid ${C.ink}1F`,
                    boxShadow: `0 30px 80px -30px ${C.ink}59, 0 0 0 6px ${C.paperHi}`,
                  }}
                >
                  <div
                    data-ambient
                    className="lz-scan absolute left-0 right-0 h-16 pointer-events-none"
                    style={{ background: `linear-gradient(to bottom, transparent, ${C.teal}14, transparent)` }}
                  />
                  <div
                    className="px-5 py-3.5 flex items-center justify-between"
                    style={{
                      borderBottom: `1px solid ${C.ink}14`,
                      background: `linear-gradient(to right, ${C.oxide}0D, ${C.amber}0D, transparent)`,
                    }}
                  >
                    <span className="lz-mono text-[10px] tracking-[0.2em]" style={{ color: C.inkFaintText }}>
                      YOUR DOMAIN, RIGHT NOW
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span data-ambient className="w-1.5 h-1.5 rounded-full lz-pulse" style={{ background: C.emerald }} />
                      <span className="lz-mono text-[10px] font-bold" style={{ color: C.emeraldText }}>
                        HEALTHY
                      </span>
                    </span>
                  </div>
                  <div className="px-5 py-4 space-y-3.5">
                    {LEDGER_ROWS.map(([k, v, note, accent], i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: T + 1 + i * 0.1, duration: 0.45, ease: EASE }}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="text-[13px]" style={{ color: C.inkSoft }}>{k}</span>
                        <span className="flex-1 border-b border-dotted translate-y-[-3px]" style={{ borderColor: `${C.ink}26` }} />
                        <span className="text-right">
                          <span className="lz-mono text-[13px] font-bold" style={{ color: asText(accent) }}>
                            {v === "counter-a" ? (
                              <Counter to={0.04} decimals={2} suffix="%" duration={1.8} />
                            ) : v === "counter-b" ? (
                              <Counter to={1.21} decimals={2} suffix="%" duration={1.8} />
                            ) : (
                              v
                            )}
                          </span>
                          <span className="block lz-mono text-[10px]" style={{ color: C.inkFaintText }}>{note}</span>
                        </span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-5 py-3" style={{ background: C.ink }}>
                    <span className="lz-mono text-[10px] tracking-[0.14em]" style={{ color: "#F7F3EAB3" }}>
                      NOTHING TO SWITCH ON. <span style={{ color: C.amber }}>IT ALL RUNS BY ITSELF.</span>
                    </span>
                  </div>
                </div>
              </Tilt>
            </motion.div>
          </motion.div>
        </div>


      </motion.div>

      {/* Event ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: T + 1.3 }}
        className="lz-ticker relative mt-16 md:mt-20 overflow-hidden"
        style={{
          borderTop: `1px solid ${C.ink}1F`,
          borderBottom: `1px solid ${C.ink}1F`,
          background: C.paperHi,
        }}
      >
        <div data-ambient className="lz-ticker-track flex w-max whitespace-nowrap py-3.5">
          {[...LEDGER_EVENTS, ...LEDGER_EVENTS].map((e, i) => (
            <span key={i} className="lz-mono text-[11px] flex items-center gap-2.5 px-6" style={{ borderRight: `1px solid ${C.ink}12` }}>
              <span style={{ color: C.inkFaintText }}>{e.t}</span>
              <span className="font-bold px-1.5 py-0.5 rounded" style={{ color: asText(e.c), background: `${e.c}16` }}>
                {e.k}
              </span>
              <span style={{ color: C.inkSoft }}>{e.d}</span>
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
