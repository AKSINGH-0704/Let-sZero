/**
 * LETSZERO "LIVING LEDGER" — high-end FX layer.
 * Custom dynamic cursor, duotone image cards,
 * rotating badge, outlined ghost type. Award-site grammar, reduced-motion safe.
 */

import { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { C, EASE, useMounted, useAmbientPaused, toggleAmbientPaused, useReducedMotionLive } from "./theme.jsx";

/* ----------------------------------------------------------------
   GLOBAL STYLES — fonts, keyframes, cursor + scroll behavior.
   Shared by every Living Ledger page.
---------------------------------------------------------------- */
export function GlobalStyles() {
  // dangerouslySetInnerHTML, not a text child.
  //
  // React escapes text children, and <style> is RAWTEXT in the HTML parser —
  // character references inside it are never decoded. A plain child therefore
  // prerendered as `font-family: &#x27;Cabinet Grotesk&#x27;`, which is an
  // invalid declaration, so every quoted value in this sheet (36 of them, plus
  // the grain data-URI) was dead until React hydrated and replaced the node.
  // On a prerendered page that is exactly the window the prerender exists to
  // cover. This is the documented way to emit a stylesheet from React, and the
  // content is a static template in this file — no user input reaches it.
  const css = `
      /* Fonts are self-hosted in client/src/fonts.css (M34) — no third-party font hosts. */

      .lz-display { font-family: 'Cabinet Grotesk', 'Space Grotesk', sans-serif; }
      .lz-body    { font-family: 'General Sans', 'Inter', sans-serif; }
      .lz-mono    { font-family: 'JetBrains Mono', monospace; }
      /* Audit 231 - font-weight is pinned because .lz-serif is applied to <em>
         inside headings that set 700, and Instrument Serif ships only a 400
         file (client/src/fonts.css). Inheriting 700 made the browser
         synthesise a bold, so five nodes rendered a smeared faux-bold of a
         display serif. 400 is the weight actually served. */
      .lz-serif   { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; }
      .lz-root ::selection { background: ${C.oxide}; color: ${C.paper}; }

      @keyframes lz-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .lz-ticker-track  { animation: lz-ticker 44s linear infinite; will-change: transform; }
      .lz-marquee-track { animation: lz-ticker 28s linear infinite; will-change: transform; }
      .lz-marquee-rev   { animation-direction: reverse; }
      .lz-ticker:hover .lz-ticker-track,
      .lz-marquee:hover .lz-marquee-track { animation-play-state: paused; }

      @keyframes lz-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      .lz-float { animation: lz-float 7s ease-in-out infinite; }

      @keyframes lz-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .lz-badge-spin { animation: lz-spin 18s linear infinite; will-change: transform; }

      @keyframes lz-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.8); } }
      .lz-pulse { animation: lz-pulse 2.2s ease-in-out infinite; }

      @keyframes lz-scan { 0% { top: -10%; } 100% { top: 110%; } }
      .lz-scan { animation: lz-scan 5s cubic-bezier(.4,0,.6,1) infinite; }

      /* The sweep used to animate background-position, which PERFORMANCE_BUDGETS
         names outright: "Never animate background-position. It cannot be
         composited and repaints the element every frame." It was one of the two
         measured causes of M32's scroll jitter, and here it ran forever on the
         H1 — the LCP element. The gradient is now static and a composited
         overlay translates across it instead, so the effect is identical and
         the work moves to the compositor. */
      @keyframes lz-shimmer { from { transform: translateX(-60%); } to { transform: translateX(160%); } }
      .lz-shimmer-text {
        position: relative;
        display: inline-block;
        background: linear-gradient(110deg, ${C.oxide} 0%, ${C.amber} 34%, ${C.rose} 67%, ${C.oxide} 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
        isolation: isolate;
      }
      .lz-shimmer-text::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(110deg, transparent 0%, ${C.paper}00 35%, ${C.paper}66 50%, ${C.paper}00 65%, transparent 100%);
        mix-blend-mode: screen;
        animation: lz-shimmer 6s linear infinite;
        will-change: transform;
      }

      /* WCAG 2.2.2 (Level A) covers motion that starts on its own and runs past
         five seconds. Slowing the tickers to 110s left them doing exactly that,
         so they stop with everything else. ADR-016's rule is the one being
         followed here: enforce per-mechanism, and stop decoration rather than
         feedback. */
      @media (prefers-reduced-motion: reduce) {
        .lz-pulse, .lz-scan, .lz-float,
        .lz-ticker-track, .lz-marquee-track,
        .lz-shimmer-text::after { animation: none; }
        /* The sweep is decoration on top of a gradient that reads fine without
           it; the text underneath keeps its colours. */
        .lz-shimmer-text::after { opacity: 0; }

        /* The badge kept turning under reduced motion, just at 60s instead of
           18s. That was a deliberate choice and Audit 235 does not revisit it,
           so the duration that used to live in a framer prop is restated here
           and the behaviour is byte-for-byte what it was. */
        .lz-badge-spin { animation-duration: 60s; }

        /* Stopping a ticker is not the same as making it readable.
           Both tracks are far wider than the viewport — measured 7,534px and
           6,212px against ~1,280px of visible box — so simply freezing them
           leaves most of the content permanently outside an overflow:hidden
           window with no scrollbar and no way to reach it. What is stranded is
           not decoration: the ledger is the page's product evidence, and the
           marquee is its list of guarantees.

           So reduced motion gets the same information as a static, wrapped
           block: the loop's duplicate copies are dropped, the track stops being
           max-content and wraps, and the clip is released. No animation, no
           horizontal scrolling, nothing lost. */
        .lz-ticker, .lz-marquee { overflow: visible; }
        .lz-ticker-track,
        .lz-marquee-track {
          width: auto;
          flex-wrap: wrap;
          justify-content: center;
          white-space: normal;
          row-gap: 2px;
        }
        .lz-ticker-track > [data-dup],
        .lz-marquee-track > [data-dup] { display: none; }
        .lz-marquee[data-dup-row] { display: none; }
        /* The vertical rule between events reads as a divider in one line and
           as clutter in a wrapped block. */
        .lz-ticker-track > span { border-right: 0 !important; }
      }

      /* M32-A pauses ambient motion during scroll with the rule
         html[data-scrolling] [data-ambient]. That selector reaches elements,
         not pseudo-elements, so the shimmer sweep — which lives on ::after so
         the gradient can stay clipped to the text — is named explicitly here
         rather than left as the one infinite animation that keeps running
         while the page moves. */
      /* Footer links: one declaration drives hover AND focus-visible, so a
         keyboard user gets the same accent a mouse user does. The base colour
         measures 9.17:1 on the ink footer and each accent is an on-ink variant
         at >=4.7:1, so neither state drops below AA. */
      .lz-footer-link { color: #BDB5A4; }
      .lz-footer-link:hover,
      .lz-footer-link:focus-visible { color: var(--lz-accent, #BDB5A4); }

      html[data-scrolling] .lz-shimmer-text::after {
        animation-play-state: paused;
      }

      /* WCAG 2.2.2 (Audit 235) — the in-content pause mechanism.
         Deliberately the same shape as the M32-A scroll rule above, and it
         reaches the same set: every decorative loop on this page is either
         marked [data-ambient] or is the shimmer sweep, which lives on a
         pseudo-element that attribute selectors cannot reach and so is named
         here. The !important is for the same reason M32-A needs one: several
         of these animations are declared as inline styles, which otherwise
         win over any stylesheet rule.

         This pauses rather than removes, so the strips hold their position
         and resume from it; nothing reflows, so toggling costs no layout and
         cannot shift the page. */
      html[data-motion-paused] [data-ambient] {
        animation-play-state: paused !important;
      }
      html[data-motion-paused] .lz-shimmer-text::after,
      html[data-motion-paused] .lz-badge-spin {
        animation-play-state: paused !important;
      }

      .lz-grain {
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
        opacity: 0.04;
      }

      /* The header is position:fixed and 73px tall, and nothing reserved
         room for it. Measured on production, every in-page anchor put its
         target's top edge at viewport 0 — #system at scrollY 1914, #guarantees
         at 3509, #main-content at 0 — so the first 73px of each destination
         sat behind the navigation, including the heading that says which
         section you just jumped to. scroll-padding-top is the property that
         belongs to the scroll container rather than to each target, so it
         covers the skip link, the nav's in-page links and any deep link into
         /#system from another page with one declaration.

         This lives in the landing page's own sheet, which renders only on
         "/", so it does not change scrolling anywhere else in the product. */
      html {
        scroll-behavior: smooth;
        scroll-padding-top: 88px;
      }
      @media (min-width: 768px) {
        html { scroll-padding-top: 96px; }
      }
      @media (pointer: fine) {
        .lz-cursor-on .lz-root, .lz-cursor-on .lz-root a,
        .lz-cursor-on .lz-root button, .lz-cursor-on .lz-root [data-cursor] {
          cursor: none;
        }
      }
    `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/* ---------------- imagery (duotone-treated Unsplash, infra aesthetic) ---------------- */
// `arch` was declared here and referenced nowhere, which still shipped its
// 330KB file into client/public. Dropped along with the asset.
/* Only the two section backdrops resolve through this map now. The resource
   cards reach their own images by literal path from RESOURCES in theme.jsx,
   and the hero no longer uses photography at all, so the other four keys were
   pointing at nothing. */
export const IMAGES = {
  servers: "/images/landing/servers.webp",
  globe: "/images/landing/globe.webp",
};

/* ----------------------------------------------------------------
   CUSTOM CURSOR — ink dot + spring ring, scales over interactive
   targets, shows a label for [data-cursor="LABEL"], difference-blend.
   Desktop fine-pointer only; native cursor restored on touch.
---------------------------------------------------------------- */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);
  const [label, setLabel] = useState("");
  const reduce = useReducedMotion();

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 24, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 260, damping: 24, mass: 0.5 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    document.documentElement.classList.add("lz-cursor-on");

    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target instanceof Element ? e.target.closest("a, button, [data-cursor]") : null;
      setHover(!!t);
      setLabel(t?.getAttribute?.("data-cursor") || "");
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      document.documentElement.classList.remove("lz-cursor-on");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, [x, y]);

  if (!enabled) return null;

  const ringScale = pressed ? 0.7 : label ? 3.2 : hover ? 1.9 : 1;

  return (
    <>
      {/* core dot */}
      <motion.div
        className="fixed top-0 left-0 z-[120] pointer-events-none w-0 h-0 flex items-center justify-center"
        style={{ x, y }}
        aria-hidden="true"
      >
        <motion.div
          animate={{ scale: pressed ? 0.5 : hover ? 0.4 : 1 }}
          transition={{ duration: 0.2 }}
          className="w-[9px] h-[9px] rounded-full shrink-0"
          style={{ background: C.oxide }}
        />
      </motion.div>
      {/* trailing ring / label puck */}
      {/* The blend belongs on THIS wrapper, not on the ring inside it.
          `mix-blend-mode` composites an element against the backdrop of its
          nearest stacking-context ancestor, and this wrapper is already one
          (fixed + z-index, plus the transform framer-motion compiles x/y
          into). Its only child is the ring, so a blend declared on the ring
          had nothing beneath it to blend with: it painted plain white.
          Measured on production against four rings over the same cream
          backdrop — blend on the node itself, blend under a z-indexed
          wrapper, blend under a transformed wrapper, and no blend at all —
          only the first inverted; the other three were indistinguishable.
          So the ring was invisible on every light section of the page, which
          is most of it, and the one thing a desktop visitor could see of
          their own pointer was the 9px oxide dot — the same shape and colour
          the product panels use for status. Hiding the native cursor
          (`cursor: none`) left that dot sitting on the domain-health card
          reading as part of the product UI.
          Moving the declaration up one level gives the group the page as its
          backdrop, so the ring inverts as intended: dark on paper, light on
          ink. */}
      <motion.div
        className="fixed top-0 left-0 z-[119] pointer-events-none w-0 h-0 flex items-center justify-center"
        style={{
          x: reduce ? x : ringX,
          y: reduce ? y : ringY,
          mixBlendMode: label ? "normal" : "difference",
        }}
        aria-hidden="true"
      >
        <motion.div
          animate={{ scale: ringScale }}
          transition={{ duration: 0.3, ease: EASE }}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            border: label ? "none" : `1.5px solid ${C.ink}`,
            background: label ? C.ink : "transparent",
            borderColor: label ? "transparent" : "#fff",
          }}
        >
          {label && (
            <span className="lz-mono text-[6.5px] font-bold tracking-[0.18em]" style={{ color: C.paper }}>
              {label}
            </span>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}

/* ----------------------------------------------------------------
   The cinematic preloader was REMOVED here (Audit 230, M1).

   It rendered `fixed inset-0 z-[110]` over the whole page for 1.25s of
   counter plus a 0.75s exit — roughly 2.2s of full-screen curtain laid
   over a hero the prerender had ALREADY painted. That is the exact
   inversion this page is supposed to avoid: prerender made the content
   visible, hydration hid it again. The hero's entrance ladder was sized
   to that curtain (T = 1.45s), which is why the supporting paragraph was
   the LCP element at 4792ms on a 390px cold load.

   The visual identity does not live in the curtain: the kinetic headline,
   the collage entrance, the tickers, the cursor and the rotating badge all
   remain. Nothing replaced it, because a faster first paint IS the
   improvement.
---------------------------------------------------------------- */

/* ----------------------------------------------------------------
   ImageCard was REMOVED here (Audit 230, M6).

   Its only two call sites were the hero collage's stock photographs, and
   those are now ProductPanels built from the implementation instead. With
   no call sites left the component, its <picture> media gate and its 1x1
   fallback pixel are all dead code — the media gate mattered while the
   photographs existed; removing the photographs is the stronger fix,
   because below `lg` the page now requests nothing for the collage at all
   rather than requesting a transparent pixel.
---------------------------------------------------------------- */

/* ----------------------------------------------------------------
   PRODUCT PANEL — the hero collage's supporting evidence.

   Replaces two stock photographs (a circuit board and a generic analytics
   screenshot) that shared nothing with the card they sat beside: measured,
   circuit.webp was a 1000x667 landscape source forced into a 180x230 portrait
   box, so `object-cover` discarded about 46% of its width, and the two boxes
   had different aspect ratios, different rotations and no common visual
   language with the domain-health card.

   These are built from the same parts as that card — same radius, border,
   shadow, paperHi ground, ink footer strip, mono labels — so the three read as
   one system rather than a card between two photos.

   Everything they state is drawn from the implementation, not written for the
   page. See the call sites in Hero.jsx for the source of each line.
---------------------------------------------------------------- */
export function ProductPanel({ label, accent = C.teal, accentText, rows = [], footer, className = "" }) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden flex flex-col ${className}`}
      style={{
        background: C.paperHi,
        border: `1px solid ${C.ink}1F`,
        boxShadow: `0 24px 60px -24px ${C.ink}59, 0 0 0 5px ${C.paperHi}`,
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-1.5 shrink-0"
        style={{
          borderBottom: `1px solid ${C.ink}14`,
          background: `linear-gradient(to right, ${accent}12, transparent)`,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        <span className="lz-mono text-[8.5px] tracking-[0.18em] uppercase" style={{ color: C.inkFaintText }}>
          {label}
        </span>
      </div>

      <div className="px-3 py-2.5 flex-1 flex flex-col justify-center gap-[7px]">
        {rows.map(([name, verdict]) => (
          <div key={name} className="flex items-baseline justify-between gap-2">
            <span className="lz-mono text-[9px] leading-tight" style={{ color: C.inkSoft }}>
              {name}
            </span>
            <span
              className="lz-mono text-[8.5px] font-bold tracking-[0.1em] uppercase shrink-0"
              style={{ color: accentText || C.inkFaintText }}
            >
              {verdict}
            </span>
          </div>
        ))}
      </div>

      {footer && (
        <div className="px-3 py-2 shrink-0" style={{ background: C.ink }}>
          <span className="lz-mono text-[8px] tracking-[0.14em] uppercase leading-snug" style={{ color: "#9A937F" }}>
            {footer}
          </span>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   MOTION TOGGLE — the visible half of the WCAG 2.2.2 mechanism.

   One shared page-level state (see theme.jsx), rendered beside each of the
   two continuous strips so it is adjacent to the content it stops rather
   than parked in the footer 8,000px away from the hero ticker. Both
   instances read and write the same attribute, so they can never disagree.

   The accessible name carries the state — "Pause motion" while it runs,
   "Play motion" once stopped — rather than a constant name plus
   `aria-pressed`. Mixing the two is what makes toggle buttons ambiguous, and
   a name that changes is announced on activation without moving focus. The
   icon and the word change together, so the state is truthful for sighted
   and screen-reader users from the same markup.

   Renders nothing until mounted, so the prerendered HTML and React's first
   pass agree, and nothing at all under reduced motion, where the animations
   are already `none` and a pause control would be offering to stop something
   that is not moving.
---------------------------------------------------------------- */
export function MotionToggle({ tone = "paper", className = "" }) {
  const mounted = useMounted();
  // The control has to agree with the stylesheet at all times, including after
  // the visitor changes the OS preference with this page open. framer's
  // one-shot read left it claiming to pause loops that were already gone, and
  // — the direction that actually matters — absent while the tickers ran.
  const reduce = useReducedMotionLive();
  const paused = useAmbientPaused();
  if (!mounted || reduce) return null;

  const onInk = tone === "ink";
  const fg = onInk ? "#BDB5A4" : C.inkFaintText;
  const bg = onInk ? C.ink : C.paperHi;

  return (
    <button
      type="button"
      onClick={toggleAmbientPaused}
      aria-label={paused ? "Play motion" : "Pause motion"}
      className={`absolute right-0 top-0 bottom-0 z-10 pl-10 sm:pl-12 pr-3 sm:pr-4 flex items-center gap-1.5 lz-mono text-[9px] tracking-[0.14em] uppercase rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
        onInk ? "focus-visible:ring-white/50" : "focus-visible:ring-[#15120D]/40"
      } ${className}`}
      style={{
        color: fg,
        // A fade rather than a hard edge, so the moving track dissolves under
        // the control instead of being chopped off by it. The ramp needs real
        // width to read as a fade: at 38% of an 84px control it was ~32px, or
        // about three characters of 11px mono, and the screenshot showed the
        // ticker cut mid-word. 58% of a wider control is ~58px.
        background: `linear-gradient(to right, ${bg}00 0%, ${bg} 58%, ${bg} 100%)`,
      }}
    >
      {paused ? (
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
          <path d="M2 1.2 8.4 5 2 8.8z" />
        </svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
          <rect x="2" y="1.4" width="2.3" height="7.2" />
          <rect x="5.7" y="1.4" width="2.3" height="7.2" />
        </svg>
      )}
      {/* Below `sm` the word is dropped and the control is the icon alone, so
          it takes ~14% of a 360px strip instead of ~25%. The button keeps its
          full accessible name either way, and with no visible text there is
          nothing for WCAG 2.5.3 to disagree with; where the word IS shown,
          the name still contains it. */}
      <span className="hidden sm:inline">{paused ? "Play" : "Pause"}</span>
    </button>
  );
}

/* ----------------------------------------------------------------
   ROTATING BADGE — circular text on an SVG path, slow spin.
---------------------------------------------------------------- */
export function RotatingBadge({ text = "OUTREACH · ACCOUNTED FOR · LETSZERO · ", size = 120, tone = C.ink, className = "" }) {
  // Framer drove this rotation, and framer has no "stop where you are": setting
  // `animate` to {} makes it transition the element back to its resting value,
  // so pausing produced a slow unwind to 0deg instead of a stop. Measured, the
  // badge was still turning 1.2s after the control said PLAY.
  //
  // As a CSS animation it freezes in place under the same one-line rule as
  // every other loop here, and the rAF loop goes away with it. The reduced
  // motion path is deliberately unchanged: still a spin, still 60s, declared
  // in the sheet instead of in this prop.
  return (
    <div
      className={`lz-badge-spin pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <path id="lz-badge-circle" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        </defs>
        <circle cx="50" cy="50" r="49" fill="none" stroke={`${tone}33`} strokeWidth="0.75" />
        <circle cx="50" cy="50" r="2.5" fill={C.oxide} />
        <text style={{ fontSize: "8.4px", letterSpacing: "0.16em", fontFamily: "'JetBrains Mono', monospace", fill: tone }}>
          <textPath href="#lz-badge-circle">{text}</textPath>
        </text>
      </svg>
    </div>
  );
}

/* ----------------------------------------------------------------
   GHOST TYPE — oversized outlined display word for depth layers.
---------------------------------------------------------------- */
export function GhostWord({ word, tone = C.ink, className = "", opacity = 0.1 }) {
  return (
    <span
      aria-hidden="true"
      className={`lz-display font-extrabold select-none pointer-events-none leading-none ${className}`}
      style={{
        color: "transparent",
        WebkitTextStroke: `1.5px ${tone}`,
        opacity,
        letterSpacing: "-0.02em",
      }}
    >
      {word}
    </span>
  );
}
