/**
 * LETSZERO "LIVING LEDGER" — design tokens, data, and motion primitives.
 * All numbers are real and sourced from the engineering handoff.
 */

import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion, useInView, animate } from "framer-motion";

/* ---------------- palette ----------------

   Three families, chosen by where the colour lands and how big the type is.
   WCAG 1.4.3 asks 4.5:1 of small text and 3:1 of large (>=24px, or >=18.66px
   bold), and the display palette below only ever clears the large-text bar.
   RC-1 is the precedent: #6B7280 measured 4.08:1 on this page's dark footer
   and had to move, so the split is made explicit here rather than left for
   each call site to get right.

   - Display accents  — headlines, rules, dots, badges. Large type only.
   - `*Text` variants — the same hue darkened until it clears 4.5:1 on both
     paper and paperHi. Use for any text under 24px.
   - `*OnInk` variants — lightened for the ink-backed sections, where the
     display accents fall to 3.7-3.9:1.

   Every ratio below is computed, not estimated. */
export const C = {
  paper: "#F7F3EA",
  paperHi: "#FDFBF5",
  ink: "#15120D",
  inkSoft: "#5C564B",   // 6.57:1 on paper
  inkFaint: "#8F887A",  // 3.18:1 — decorative rules and large type only

  // Display accents (large type / non-text).
  oxide: "#E04E1C",
  amber: "#E8A33D",
  teal: "#137F8C",
  emerald: "#1F9D63",
  rose: "#C2455A",
  violet: "#6D5AE0",
  gold: "#B98A2F",

  // Small text on ANY light surface. Calibrated against the darkest tinted pill
  // the page actually renders (#E5E9DD), not against bare paper: most of these
  // labels sit inside an `${accent}12` capsule, and tokens tuned to paper alone
  // came up ~0.2 short once the tint was composited in. Second figure is paper.
  oxideText: "#B13E16",     // 4.77 pill / 5.31 paper
  amberText: "#8B5A11",     // 4.77 / 5.31
  tealText: "#116F7B",      // 4.75 / 5.29
  emeraldText: "#177349",   // 4.75 / 5.29
  roseText: "#B13A4E",      // 4.75 / 5.29
  violetText: "#604CDD",    // 4.76 / 5.30
  goldText: "#805F20",      // 4.76 / 5.30
  inkFaintText: "#6A6459",  // 4.76 / 5.30

  // Small text on ANY ink surface, same reasoning against the lightest ink pill
  // (#29180F). Amber, emerald and gold already clear it unchanged.
  oxideOnInk: "#E55B2B",    // 4.76 pill / 5.22 ink
  tealOnInk: "#1695A4",     // 4.76 / 5.22
  violetOnInk: "#8778E6",   // 4.76 / 5.21
  roseOnInk: "#CD6879",     // 4.75 / 5.21

  // Primary CTA fill. White at 15px semibold needs 4.5:1, and the original
  // #E04E1C measured 3.98:1 — the label sat over a failing gradient for most
  // of the button's width. This sweep clears 4.5:1 end to end (4.63 -> 4.89).
  ctaFrom: "#CE4718",
  ctaTo: "#C2455A",
};

/**
 * Map a display accent to something legible on the ink-backed sections.
 *
 * Those sections tinted their small mono labels as `${accent}CC` — the accent
 * at 80% over near-black. Composited, five of the seven landed between 2.8:1
 * and 3.8:1, well under the 4.5:1 small text needs. Amber, emerald and gold
 * already clear it at full alpha; the rest get a lightened variant. Returning
 * the accent unchanged when no override exists keeps this a no-op for colours
 * that were never the problem.
 */
const ON_INK = {
  "#E04E1C": "#E55B2B", // oxide
  "#137F8C": "#1695A4", // teal
  "#6D5AE0": "#8778E6", // violet
  "#C2455A": "#CD6879", // rose
  // amber, emerald and gold already clear 4.5:1 on ink and its tinted pills.
};

/**
 * Map a display accent to its small-text-safe twin on paper.
 *
 * The counterpart to onInk(). Data tables like LEDGER_EVENTS carry a display
 * accent per row, and those rows are rendered at 10-11px, where the display
 * palette measures 1.95:1 to 4.42:1. Callers that render an accent as small
 * text pass it through here rather than each one remembering which of the
 * seven need darkening.
 */
const AS_TEXT = {
  "#E04E1C": "#B13E16", // oxide
  "#E8A33D": "#8B5A11", // amber
  "#137F8C": "#116F7B", // teal
  "#1F9D63": "#177349", // emerald
  "#C2455A": "#B13A4E", // rose
  "#6D5AE0": "#604CDD", // violet
  "#B98A2F": "#805F20", // gold
};

export function asText(accent) {
  return AS_TEXT[accent] || accent;
}

export function onInk(accent) {
  return ON_INK[accent] || accent;
}

export const EASE = [0.22, 1, 0.36, 1];

/* ---------------- data ---------------- */

export const LEDGER_EVENTS = [
  { t: "14:02:11", k: "SENT", d: "accepted by Amazon SES", c: C.emerald },
  { t: "14:02:11", k: "CREDIT", d: "1 credit used · logged", c: C.amber },
  { t: "14:02:14", k: "DELIVERED", d: "confirmed by a signed Amazon report", c: C.emerald },
  { t: "14:02:31", k: "OPENED", d: "recorded on the contact", c: C.teal },
  { t: "14:03:02", k: "BOUNCED", d: "address blocked from future sends", c: C.oxide },
  { t: "14:03:02", k: "RETRY", d: "skipped · this person already got it", c: C.violet },
  // 0.04% would sit just under the real 0.05% pause threshold, which is not
  // what "well under" describes. The sample now matches the limit it claims.
  { t: "14:03:05", k: "SAFETY", d: "complaints at 0.01% · well under the limit", c: C.emerald },
  { t: "14:03:18", k: "UNSUBSCRIBED", d: "honored instantly, for every campaign", c: C.rose },
  { t: "14:03:19", k: "LOGGED", d: "kept for 180 days", c: C.gold },
  // 14/sec is the account-wide ceiling (SES_RATE_PER_SECOND, default 14,
  // enforced by the Redis token bucket in server/rateLimiter.js). A single
  // campaign is additionally capped at 60% of it — floor(14*0.6) = 8/sec — so
  // a bare "14 emails a second" would overstate what one campaign sees.
  { t: "14:03:26", k: "PACE", d: "up to 14 emails a second · no bursts", c: C.teal },
];

export const PIPELINE = [
  {
    id: "01", name: "IMPORT", accent: C.oxide,
    title: "Your list gets checked first",
    body: "Upload a CSV and RepMail maps the columns for you, then flags missing or messy fields before you write a single email.",
    spec: "auto-detected columns · send-readiness summary",
  },
  {
    id: "02", name: "COMPOSE", accent: C.amber,
    title: "AI writes the first draft",
    body: "Answer a short brief (who you are, who you're writing to, what you're offering) and get a ready template in your chosen tone. One draft per campaign, which you review.",
    spec: "6 campaign types · 4 tones",
  },
  {
    id: "03", name: "VALIDATE", accent: C.rose,
    title: "Mistakes get caught, not sent",
    body: "A broken {{first_name}} tag stops the draft and gives your AI credit back. A spam check runs before anything can go out.",
    spec: "broken-tag block · spam score before send",
  },
  {
    id: "04", name: "QUEUE", accent: C.teal,
    title: "Steady pace, never a flood",
    body: "Emails go out at a pace your email provider is happy with. If the background queue goes down, a backup sender takes over and follows the same rules.",
    spec: "up to 14/sec account-wide · 8/sec per campaign · automatic backup sender",
  },
  {
    id: "05", name: "SEND", accent: C.emerald,
    title: "Retries never send twice",
    body: "Before any retry, RepMail checks each contact. Anyone who already got the email, bounced, complained or unsubscribed is skipped. Every time.",
    spec: "per-contact check on every retry",
  },
  {
    id: "06", name: "ACCOUNT", accent: C.violet,
    title: "Only real reports count",
    body: "Deliveries, bounces, complaints, opens and clicks only count when they arrive in a report signed by Amazon. Anything unsigned or unknown is thrown out.",
    spec: "signed reports only · unknown sources rejected",
  },
  {
    id: "07", name: "PROTECT", accent: C.gold,
    title: "It stops before the damage",
    // Thresholds read from production, not from the code defaults: Railway sets
    // COMPLAINT_RATE_PAUSE_THRESHOLD=0.0005 (0.05%) and
    // BOUNCE_RATE_PAUSE_THRESHOLD=0.03 (3%). campaignConfig.js defaults to
    // 0.0005 and 0.08, so quoting the source would have overstated the bounce
    // ceiling by ~2.7x. Gmail's published complaint line is 0.1%; RepMail
    // pauses at half of it, which is the actual claim worth making.
    body: "Sending pauses by itself if complaints reach 0.05% — half the line Gmail tells senders to stay under — or bounces reach 3%. Mid-campaign, it re-checks every 50 emails.",
    spec: "0.05% complaints · 3% bounces · check every 50",
  },
];

export const GUARANTEES = [
  {
    id: "G-01", accent: C.oxide,
    title: "Nobody gets the same email twice",
    body: "Retry a campaign as often as you like. Anyone who already got it, bounced, complained or unsubscribed is skipped.",
    mech: "a per-contact check in both the main and backup sender",
  },
  {
    id: "G-02", accent: C.amber,
    title: "You're never charged twice",
    body: "Each credit moves exactly once. Even if a payment is confirmed twice at the same moment, you're only credited once.",
    mech: "all-or-nothing credit updates in the database",
  },
  {
    id: "G-03", accent: C.emerald,
    title: "It pauses before Gmail blocks you",
    body: "The safety limits sit inside Gmail's published rules, not on the edge of them. RepMail stops you before the inbox providers have to.",
    mech: "0.05% complaints · 3% bounces · checked while sending",
  },
  {
    id: "G-04", accent: C.rose,
    title: "Unsubscribe means unsubscribe",
    body: "One click and that person is off every future campaign, permanently. Nobody on your team can accidentally email them again.",
    mech: "checked before every single send",
  },
  {
    id: "G-05", accent: C.violet,
    title: "Your numbers are real",
    body: "Open, bounce and delivery numbers only come from signed Amazon reports, so your dashboard can't be padded or faked.",
    mech: "signature check on every report",
  },
  {
    id: "G-06", accent: C.teal,
    title: "There's a record of everything",
    body: "Campaigns, credit changes and admin actions are all logged, so you can always answer \"who did what, and when?\"",
    mech: "activity kept 180 days · send records 90 days",
  },
];

export const PRODUCTS = [
  {
    name: "RepMail", status: "LIVE", live: true, accent: C.oxide,
    logo: "/repmail-logo.png",
    short: "Cold email for sales teams that protects your domain.",
    desc: "Cold outreach for sales teams. AI writes the draft, you pay per email, every send is tracked, and campaigns pause themselves before your domain gets hurt.",
    href: "/products/repmail",
  },
  {
    name: "MessageHub", status: "COMING SOON", live: false, accent: C.teal,
    short: "All your business messaging in one inbox.",
    desc: "One place for every business message, with the same careful tracking RepMail has.",
    href: null,
  },
  {
    name: "NotifyStream", status: "COMING SOON", live: false, accent: C.violet,
    short: "Product notifications across every channel.",
    desc: "Product notifications across channels, with every delivery confirmed the RepMail way.",
    href: null,
  },
];

export const MARQUEE_CLAIMS = [
  ["NO EMAIL SENT TWICE", C.oxide],
  ["NO CREDIT CHARGED TWICE", C.amber],
  ["PAUSES BEFORE DAMAGE", C.emerald],
  ["UNSUBSCRIBES STICK", C.rose],
  ["ONLY REAL NUMBERS", C.violet],
  ["EVERYTHING LOGGED", C.teal],
];

/* Real Resource Center guides (client/src/content/repmail). */
export const RESOURCES = [
  {
    tag: "Deliverability", accent: C.teal, img: "/images/landing/workspace.webp", read: "Pillar guide",
    title: "The Complete Guide to Email Deliverability",
    desc: "Reputation, authentication, spam filters and list hygiene, explained in one place.",
    href: "/repmail/learn/deliverability/complete-guide-to-email-deliverability",
  },
  {
    tag: "Cold email", accent: C.oxide, img: "/images/landing/analytics.webp", read: "Benchmarks",
    title: "Cold Email Benchmarks 2026: What Good Looks Like",
    desc: "Real open, reply, bounce and complaint rates, and how to tell if your campaign is on track.",
    href: "/repmail/learn/cold-email/cold-email-benchmarks",
  },
  {
    tag: "Deliverability", accent: C.violet, img: "/images/landing/abstract.webp", read: "Guide",
    title: "The Complete Guide to Email Authentication",
    desc: "SPF, DKIM and DMARC in plain English, and why cold email fails without them.",
    href: "/repmail/learn/deliverability/email-authentication",
  },
];

/* ---------------- motion primitives ---------------- */

export function go(href) {
  window.location.href = href;
}

/**
 * False on the server and on the very first client render, true afterwards.
 *
 * This page is prerendered, so anything that renders differently before and
 * after hydration has to be able to tell the two apart. Reading a ref or a
 * media query during render cannot: the server has no DOM, and guessing
 * produces markup React then has to discard. A state flag set in an effect is
 * the one signal that is false in the prerendered HTML and true once the page
 * is live, which is exactly the distinction the hero reveal needs.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/* ----------------------------------------------------------------
   AMBIENT MOTION PAUSE — the WCAG 2.2.2 mechanism (Audit 235).

   Everything decorative on this page starts on its own, loops forever and
   runs beside other content, which is exactly the content SC 2.2.2 (Level A)
   requires a pause/stop/hide mechanism for. The only one that existed was
   `:hover`, and a measured sweep of all 36 focusable elements with
   `preventScroll` never moved the ticker out of `running` — so keyboard users
   had nothing, and a real touch press-and-hold never matched `:hover` either.
   `prefers-reduced-motion` covers people who set the OS preference; it is not
   an in-content mechanism and does not discharge the criterion.

   The state lives on <html> rather than in React because that is what the CSS
   half of the fix keys off, and because one attribute keeps the two controls
   agreeing without a store between them. There is no timer, no observer and
   no per-frame work: flipping one attribute is the entire runtime cost, and
   CSS does the rest on the compositor.

   Scope is one document, and on production that turns out to be more generous
   than it sounds. Measured against the live site: following the header's
   /pricing link builds a NEW document, so a forward navigation or a reload
   starts moving again; pressing Back restores the SAME document from the
   back/forward cache, with a `window` marker, an <html> probe attribute and
   this paused state all intact. (A local static server sending
   `Cache-Control: no-store` makes the page bfcache-ineligible and hides that
   entirely - measure this one against production.)

   It is deliberately not persisted beyond that. SC 2.2.2 asks for a mechanism,
   not a remembered preference, and the users who want motion off everywhere
   and permanently are already served by prefers-reduced-motion. Persisting it
   would mean either reading storage during render, which breaks hydration on a
   prerendered page, or applying it in an effect, which shows a flash of the
   motion the visitor asked to stop.

   Reduced motion is NOT touched by any of this. Under `reduce` the animations
   are already `none`, so the control renders nothing at all rather than
   offering to pause what is not moving.
---------------------------------------------------------------- */
const PAUSE_ATTR = "data-motion-paused";
const PAUSE_EVENT = "letszero:motion-paused";

export function isAmbientPaused() {
  return typeof document !== "undefined" && document.documentElement.hasAttribute(PAUSE_ATTR);
}

export function toggleAmbientPaused() {
  const de = document.documentElement;
  if (de.hasAttribute(PAUSE_ATTR)) de.removeAttribute(PAUSE_ATTR);
  else de.setAttribute(PAUSE_ATTR, "");
  // Every mounted control and every framer-driven loop re-reads the attribute
  // from this one event, so two controls can never disagree about the state.
  window.dispatchEvent(new CustomEvent(PAUSE_EVENT));
}

/**
 * Starts `false` on the server AND on the first client render, so the
 * prerendered markup and React's first pass agree; the effect then syncs from
 * the attribute, which is what carries the state across a remount.
 */
export function useAmbientPaused() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sync = () => setPaused(isAmbientPaused());
    sync();
    window.addEventListener(PAUSE_EVENT, sync);
    return () => window.removeEventListener(PAUSE_EVENT, sync);
  }, []);
  return paused;
}

export function Reveal({ children, delay = 0, y = 28, className = "", once = true }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Animated number counter — fires when scrolled into view. */
export function Counter({ to, decimals = 0, suffix = "", prefix = "", duration = 1.4, className = "", style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, { duration, ease: EASE, onUpdate: (v) => setVal(v) });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);
  return (
    <span ref={ref} className={className} style={style}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Pointer-tracking tilt card (transform-only, interruptible). */
export function Tilt({ children, className = "", max = 5 }) {
  const ref = useRef(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });
  const reduce = useReducedMotion();
  const onMove = (e) => {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: -py * max, ry: px * max });
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
        transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

/** Drifting aurora color field. mode: "paper" | "ink" */
export function Aurora({ mode = "paper" }) {
  const reduce = useReducedMotion();
  const paused = useAmbientPaused();
  const blobs =
    mode === "paper"
      ? [
          { c: C.oxide, o: 0.16, size: 560, top: "-12%", left: "52%", dx: 60, dy: 40, dur: 22 },
          { c: C.amber, o: 0.18, size: 480, top: "30%", left: "78%", dx: -50, dy: 60, dur: 26 },
          { c: C.teal, o: 0.13, size: 520, top: "45%", left: "-8%", dx: 70, dy: -40, dur: 24 },
          { c: C.rose, o: 0.1, size: 380, top: "-5%", left: "10%", dx: -40, dy: 50, dur: 28 },
        ]
      : [
          { c: C.oxide, o: 0.22, size: 600, top: "-15%", left: "60%", dx: 60, dy: 50, dur: 24 },
          { c: C.teal, o: 0.18, size: 540, top: "55%", left: "-10%", dx: 70, dy: -40, dur: 26 },
          { c: C.violet, o: 0.16, size: 460, top: "20%", left: "20%", dx: -50, dy: 60, dur: 22 },
        ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle at 50% 50%, ${b.c}, transparent 65%)`,
            opacity: b.o,
            filter: "blur(70px)",
            willChange: "transform",
          }}
          animate={reduce || paused ? {} : { x: [0, b.dx, 0], y: [0, b.dy, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** Section header with index, colored pill label, animated gradient rule. */
export function SectionHeader({ n, label, accent, dark = false }) {
  return (
    <div className="flex items-center gap-4 mb-10 md:mb-14">
      <Reveal y={10}>
        <span className="lz-mono text-xs tracking-[0.2em]" style={{ color: dark ? "#9A937F" : C.inkFaintText }}>
          {n}
        </span>
      </Reveal>
      <Reveal y={10} delay={0.06}>
        <span
          className="lz-mono text-xs tracking-[0.25em] uppercase px-2.5 py-1 rounded-full border"
          style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}
        >
          {label}
        </span>
      </Reveal>
      <motion.span
        className="flex-1 h-px origin-left"
        style={{ background: `linear-gradient(to right, ${accent}99, ${accent}22, transparent)` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1, ease: EASE, delay: 0.15 }}
      />
    </div>
  );
}

/**
 * Word-by-word kinetic headline reveal.
 *
 * The hidden variant parks each word at translateY(110%) inside an
 * overflow-hidden box, and framer-motion writes `initial` into the markup it
 * renders — including on the server. This page is prerendered
 * (script/prerender.js renders it through renderToString), so shipping
 * `initial="hidden"` unconditionally put the entire H1 into the prerendered
 * HTML at translateY(110%): crawlers read the words, people saw an empty hero
 * until hydration finished, and the LCP element was the thing being hidden.
 *
 * So the animation is now opted into on the client rather than opted out of on
 * the server. Before mount — which is exactly what prerender emits, and what a
 * visitor sees while JS is still arriving — the variants are dropped and the
 * words render in their resting position, untransformed. After mount the
 * variants attach and the reveal plays as designed.
 *
 * The clipping box is conditional for the same reason: an overflow-hidden
 * wrapper around text that is not being animated can only crop descenders.
 *
 * Deliberately not gated on useReducedMotion. ADR-016 keeps finite entrance
 * animations — "they communicate arrival and then stop" — and gates the
 * endless ones; this is a 0.7s reveal that settles.
 */
export function KineticWords({ text, className = "", style, delay = 0 }) {
  const words = text.split(" ");
  const mounted = useMounted();

  const parentVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: delay } },
  };
  const wordVariants = {
    hidden: { y: "110%", rotate: 2 },
    show: { y: "0%", rotate: 0, transition: { duration: 0.7, ease: EASE } },
  };

  return (
    <motion.span
      className={className}
      style={style}
      variants={mounted ? parentVariants : undefined}
      initial={mounted ? "hidden" : false}
      animate={mounted ? "show" : false}
    >
      {words.map((w, i) => (
        <span
          key={i}
          className={`inline-block align-bottom${mounted ? " overflow-hidden" : ""}`}
        >
          <motion.span
            className="inline-block"
            variants={mounted ? wordVariants : undefined}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
