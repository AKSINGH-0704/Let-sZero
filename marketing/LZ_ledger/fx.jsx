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
import { C, EASE, useMounted } from "./theme.jsx";

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
      .lz-serif   { font-family: 'Instrument Serif', Georgia, serif; }
      .lz-root ::selection { background: ${C.oxide}; color: ${C.paper}; }

      @keyframes lz-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .lz-ticker-track  { animation: lz-ticker 44s linear infinite; will-change: transform; }
      .lz-marquee-track { animation: lz-ticker 28s linear infinite; will-change: transform; }
      .lz-marquee-rev   { animation-direction: reverse; }
      .lz-ticker:hover .lz-ticker-track,
      .lz-marquee:hover .lz-marquee-track { animation-play-state: paused; }

      @keyframes lz-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      .lz-float { animation: lz-float 7s ease-in-out infinite; }

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

      .lz-grain {
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
        opacity: 0.04;
      }

      html { scroll-behavior: smooth; }
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
/* A 1x1 transparent GIF. Used as the <img> fallback inside a <picture> whose
   only real <source> is gated on a media query: below that width the browser
   resolves THIS and issues no network request. Inline, so it costs nothing. */
export const BLANK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export const IMAGES = {
  circuit: "/images/landing/circuit.webp",
  servers: "/images/landing/servers.webp",
  globe: "/images/landing/globe.webp",
  abstract: "/images/landing/abstract.webp",
  analytics: "/images/landing/analytics.webp",
  workspace: "/images/landing/workspace.webp",
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
      <motion.div
        className="fixed top-0 left-0 z-[119] pointer-events-none w-0 h-0 flex items-center justify-center"
        style={{ x: reduce ? x : ringX, y: reduce ? y : ringY }}
        aria-hidden="true"
      >
        <motion.div
          animate={{ scale: ringScale }}
          transition={{ duration: 0.3, ease: EASE }}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            border: label ? "none" : `1.5px solid ${C.ink}`,
            background: label ? C.ink : "transparent",
            mixBlendMode: label ? "normal" : "difference",
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
   PRELOADER — ink curtain, counting meter, wordmark; lifts after load.
---------------------------------------------------------------- */
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
   DUOTONE IMAGE CARD — grayscale source + brand-color wash + grain,
   mono caption chip, zoom-on-hover. data-cursor aware.
---------------------------------------------------------------- */
/**
 * `width`/`height` carry the INTRINSIC dimensions so the aspect ratio is known
 * before the bytes arrive. The rendered box is sized by CSS either way; the
 * attributes are what let the browser reserve the right shape.
 *
 * The old `priority` prop is gone — see the note on the <img> below for the
 * measurement that retired it.
 */
export function ImageCard({ src, caption, tone = C.oxide, className = "", rotate = 0, cursorLabel = "VIEW", width, height, minWidth = 1024 }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, rotate: 0, zIndex: 30 }}
      transition={{ duration: 0.35, ease: EASE }}
      data-cursor={cursorLabel}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        rotate,
        border: `1px solid ${C.ink}26`,
        boxShadow: `0 24px 60px -24px ${C.ink}66`,
      }}
    >
      <div className="relative w-full h-full overflow-hidden">
        {/* The request is gated by `media`, not by `loading`.
            These cards sit in a `hidden lg:block` collage. Marking them
            priority made every phone and tablet download 193KB of pictures it
            could not render, at the HIGHEST priority, competing with an LCP
            path they cannot contribute to — measured at 390px: circuit.webp
            133,880B and analytics.webp 59,594B, both `laidOut=false`.

            `loading="lazy"` does NOT fix that, which was measured too: Chrome
            still fetched both at 390px, because a `display:none` image sits at
            the origin and lands inside the lazy-load distance threshold. Only
            a `<source media>` that does not match actually suppresses the
            request, so below `lg` the browser resolves the 1x1 transparent
            fallback and asks the network for nothing at all. */}
        <picture>
          <source media={`(min-width: ${minWidth}px)`} srcSet={src} />
          <motion.img
            src={BLANK_PIXEL}
            alt=""
            width={width}
            height={height}
            decoding="async"
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(1) contrast(1.08)" }}
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        </picture>
        {/* duotone wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(150deg, ${tone}59, transparent 55%, ${C.ink}73)`,
            mixBlendMode: "multiply",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${C.ink}99, transparent 45%)` }}
        />
      </div>
      {caption && (
        <span
          className="absolute bottom-3 left-3 lz-mono text-[9.5px] tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-full backdrop-blur-sm"
          style={{ color: C.paper, background: `${C.ink}CC`, border: `1px solid ${C.paper}33` }}
        >
          {caption}
        </span>
      )}
    </motion.div>
  );
}

/* ----------------------------------------------------------------
   ROTATING BADGE — circular text on an SVG path, slow spin.
---------------------------------------------------------------- */
export function RotatingBadge({ text = "OUTREACH · ACCOUNTED FOR · LETSZERO · ", size = 120, tone = C.ink, className = "" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: reduce ? 60 : 18, repeat: Infinity, ease: "linear" }}
      className={`pointer-events-none ${className}`}
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
    </motion.div>
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
