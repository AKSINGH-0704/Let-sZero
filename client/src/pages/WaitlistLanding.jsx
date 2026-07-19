/**
 * PRIVATE BETA WAITLIST LANDING PAGE
 *
 * Design system: Matches existing LandingExperience.tsx
 * - Background: #0A0A0F
 * - Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (mono)
 * - Accents: violet, cyan, amber, emerald
 * - Constant animations: floating RepMail metric cards, morse code display, data-flow SVG
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, Mail, Shield, BarChart3, ChevronDown,
  Loader2, Check, AlertCircle, Send, Sparkles, Users, Globe2, Lock,
  CheckCircle2, Zap, Eye
} from "lucide-react";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

const FONT_HEADING = "'Space Grotesk', sans-serif";
const FONT_BODY    = "'Inter', sans-serif";
const FONT_MONO    = "'JetBrains Mono', monospace";

// â”€â”€â”€ PARTICLES (deterministic, no hydration mismatch) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PARTICLES = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  x: ((i * 73 + 11) % 97) + 1.5,
  y: ((i * 137 + 5) % 93) + 3,
  size: i % 3 === 0 ? 2 : 1,
  delay: (i * 0.17) % 5,
  duration: 3 + (i % 6),
  opacity: 0.06 + (i % 5) * 0.04,
}));

// â”€â”€â”€ MORSE CODE: "EARLY ACCESS" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each item: { s: '.' | '-' | 'gap' | 'word' }
const MORSE_SEQ = (() => {
  const enc = {
    E: ["."],
    A: [".", "-"],
    R: [".", "-", "."],
    L: [".", "-", ".", "."],
    Y: ["-", ".", "-", "-"],
    C: ["-", ".", "-", "."],
    S: [".", ".", "."],
  };
  const words = [
    ["E", "A", "R", "L", "Y"],
    ["A", "C", "C", "E", "S", "S"],
  ];
  const seq = [];
  words.forEach((word, wi) => {
    if (wi > 0) seq.push({ s: "word" });
    word.forEach((ch, ci) => {
      if (ci > 0) seq.push({ s: "gap" });
      enc[ch].forEach((sym) => seq.push({ s: sym }));
    });
  });
  return seq;
})();

// â”€â”€â”€ MORSE CODE DISPLAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MorseCodeDisplay() {
  const [activeIdx, setActiveIdx] = useState(0);
  const TICK_MS = 260; // ms per symbol

  useEffect(() => {
    const total = MORSE_SEQ.length;
    const id = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % (total + 8)); // +8 for pause before restart
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap" style={{ minHeight: 20 }}>
      {MORSE_SEQ.map((item, i) => {
        const isActive = i === activeIdx % MORSE_SEQ.length && activeIdx < MORSE_SEQ.length + 1;
        const isPast   = i < activeIdx % MORSE_SEQ.length;

        if (item.s === "gap")  return <div key={i} className="w-2" />;
        if (item.s === "word") return <div key={i} className="w-5" />;

        const isDot = item.s === ".";
        return (
          <motion.div
            key={i}
            animate={{
              backgroundColor: isActive
                ? "#a78bfa"
                : isPast
                ? "rgba(167,139,250,0.25)"
                : "rgba(255,255,255,0.12)",
              boxShadow: isActive
                ? "0 0 10px rgba(167,139,250,0.9), 0 0 20px rgba(139,92,246,0.5)"
                : isPast
                ? "0 0 4px rgba(167,139,250,0.2)"
                : "none",
              scale: isActive ? 1.4 : 1,
            }}
            transition={{ duration: 0.15 }}
            style={{
              width:  isDot ? 5  : 14,
              height: isDot ? 5  : 5,
              borderRadius: isDot ? "50%" : 3,
              flexShrink: 0,
            }}
          />
        );
      })}
      {/* LABEL */}
      <span
        className="ml-3 text-[9px] tracking-[0.25em] text-violet-400/40 uppercase select-none"
        style={{ fontFamily: FONT_MONO }}
      >
        EARLYÂ·ACCESS
      </span>
    </div>
  );
}

// â”€â”€â”€ FLOATING REPMAIL METRIC CARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const METRIC_CARDS = [
  {
    id: 1,
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    glowColor: "rgba(52,211,153,0.15)",
    borderColor: "rgba(52,211,153,0.18)",
    label: "Campaign Complete",
    primary: "2,847 delivered",
    secondary: "94.2% inbox rate",
    badge: { text: "Live", color: "emerald" },
    right: "4%", top: "20%",
    animY: [0, -14, 6, 0],
    duration: 11,
    delay: 0,
    rotate: -1.5,
  },
  {
    id: 2,
    icon: Shield,
    iconColor: "text-violet-400",
    glowColor: "rgba(139,92,246,0.15)",
    borderColor: "rgba(139,92,246,0.22)",
    label: "Anti-Spam Check",
    primary: "Score: 12",
    secondary: "Safe to send âœ“",
    badge: { text: "Safe", color: "violet" },
    right: "18%", top: "39%",
    animY: [0, 16, -8, 0],
    duration: 14,
    delay: 1.5,
    rotate: 1.2,
  },
  {
    id: 3,
    icon: Sparkles,
    iconColor: "text-cyan-400",
    glowColor: "rgba(6,182,212,0.15)",
    borderColor: "rgba(6,182,212,0.22)",
    label: "AI Preview Ready",
    primary: "3 personalised",
    secondary: "GPT-4o powered",
    badge: { text: "AI", color: "cyan" },
    right: "5%", top: "61%",
    animY: [0, -18, 10, 0],
    duration: 13,
    delay: 3,
    rotate: -1,
  },
  {
    id: 4,
    icon: BarChart3,
    iconColor: "text-amber-400",
    glowColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.20)",
    label: "Open Rate",
    primary: "â†‘ 34.2%",
    secondary: "vs 22.1% avg",
    badge: { text: "+12%", color: "amber" },
    right: "20%", top: "78%",
    animY: [0, 12, -6, 0],
    duration: 16,
    delay: 2,
    rotate: 1.8,
  },
];

const BADGE_COLORS = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  violet:  "bg-violet-500/15  text-violet-400  border-violet-500/20",
  cyan:    "bg-cyan-500/15    text-cyan-400    border-cyan-500/20",
  amber:   "bg-amber-500/15   text-amber-400   border-amber-500/20",
};

function FloatingMetricCard({ card, index }) {
  const Icon = card.icon;
  return (
    <motion.div
      className="absolute hidden xl:block"
      style={{ right: card.right, top: card.top, rotate: card.rotate }}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: card.animY, scale: 1 }}
      transition={{
        opacity: { duration: 0.7, delay: 0.8 + index * 0.25 },
        scale:   { duration: 0.7, delay: 0.8 + index * 0.25 },
        y:       { duration: card.duration, repeat: Infinity, ease: "easeInOut", delay: card.delay },
      }}
    >
      <div
        className="relative rounded-2xl p-4 backdrop-blur-xl"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
          border: `1px solid ${card.borderColor}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 0 24px ${card.glowColor}`,
          minWidth: 190,
        }}
      >
        {/* Shimmer top edge */}
        <div
          className="absolute top-0 left-4 right-4 h-px rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${card.borderColor.replace('0.', '0.6')}, transparent)` }}
        />

        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: card.glowColor, border: `1px solid ${card.borderColor}` }}
          >
            <Icon className={`w-4 h-4 ${card.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest" style={{ fontFamily: FONT_MONO }}>
              {card.label}
            </p>
            <p className="text-sm font-semibold text-white leading-none mb-1" style={{ fontFamily: FONT_HEADING }}>
              {card.primary}
            </p>
            <p className="text-[11px] text-gray-500" style={{ fontFamily: FONT_BODY }}>
              {card.secondary}
            </p>
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${BADGE_COLORS[card.badge.color]}`}
            style={{ fontFamily: FONT_MONO, flexShrink: 0 }}
          >
            {card.badge.text}
          </span>
        </div>

        {/* Activity pulse */}
        <motion.div
          className="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full"
          style={{ background: card.iconColor.replace("text-", "").replace("-400", "") === "amber" ? "#fbbf24" : undefined }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 2.2 + index * 0.4, repeat: Infinity }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{ backgroundColor: card.glowColor.replace("0.15", "1") }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

function FloatingMetricCards() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {METRIC_CARDS.map((card, i) => (
        <FloatingMetricCard key={card.id} card={card} index={i} />
      ))}
    </div>
  );
}

// â”€â”€â”€ ANIMATED DATA-FLOW SVG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Continuous SVG line animation â€” email delivery paths
function AnimatedDataFlow({ className = "" }) {
  const PATHS = [
    "M 0 80 C 120 40, 200 140, 320 80 S 480 20, 600 80 S 760 140, 900 80",
    "M 0 160 C 100 100, 220 220, 360 150 S 520 60, 680 150 S 820 220, 960 160",
    "M 50 240 C 180 180, 300 300, 440 230 S 600 140, 740 220 S 880 280, 1000 230",
  ];
  const NODES = [
    { cx: 0,   cy: 80  }, { cx: 320, cy: 80  }, { cx: 600, cy: 80  }, { cx: 900, cy: 80  },
    { cx: 0,   cy: 160 }, { cx: 360, cy: 150 }, { cx: 680, cy: 150 }, { cx: 960, cy: 160 },
    { cx: 50,  cy: 240 }, { cx: 440, cy: 230 }, { cx: 740, cy: 220 }, { cx: 1000,cy: 230 },
  ];

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 1000 300"
        className="w-full h-full opacity-[0.08]"
        preserveAspectRatio="xMidYMid slice"
      >
        {PATHS.map((d, pi) => (
          <motion.path
            key={pi}
            d={d}
            fill="none"
            stroke="url(#flowGrad)"
            strokeWidth="1.5"
            strokeDasharray="12 6"
            animate={{ strokeDashoffset: [0, -36] }}
            transition={{ duration: 3 + pi * 0.8, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {NODES.map((n, ni) => (
          <motion.circle
            key={ni}
            cx={n.cx} cy={n.cy} r={3}
            fill="#a78bfa"
            // M35-C â€” once `r` is in `animate`, motion owns the attribute and the
            // static r={3} no longer seeds it. Each node has its own delay, so
            // during that window motion wrote r="undefined" and the browser
            // rejected it: 12 console errors per load of this page. `initial`
            // gives it a defined start; r={3} stays for the prerendered HTML.
            initial={{ opacity: 0.3, r: 2 }}
            animate={{ opacity: [0.3, 1, 0.3], r: [2, 4, 2] }}
            transition={{ duration: 2.5 + (ni % 5) * 0.6, repeat: Infinity, ease: "easeInOut", delay: ni * 0.2 }}
          />
        ))}
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="30%"  stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="70%"  stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// â”€â”€â”€ ANIMATED BACKGROUND â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D0D18] via-[#0A0A0F] to-[#08080E]" />

      {/* Violet orb â€” drifts slowly */}
      <motion.div
        className="absolute rounded-full blur-[140px]"
        style={{
          width: 700, height: 700,
          top: "-10%", right: "5%",
          background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.04) 70%, transparent 100%)",
        }}
        animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.12, 0.94, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Cyan orb */}
      <motion.div
        className="absolute rounded-full blur-[160px]"
        style={{
          width: 600, height: 600,
          bottom: "-5%", left: "5%",
          background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, rgba(6,182,212,0.03) 70%, transparent 100%)",
        }}
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -30, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Amber accent */}
      <motion.div
        className="absolute rounded-full blur-[180px]"
        style={{
          width: 400, height: 400,
          top: "40%", right: "20%",
          background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 50, 0] }}
        transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Particle field */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{ opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3], scale: [1, 1.4, 1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 0 10 L 40 10 M 10 0 L 10 40 M 0 20 L 40 20 M 20 0 L 20 40 M 0 30 L 40 30 M 30 0 L 30 40' fill='none' stroke='white' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// â”€â”€â”€ SECTION GLOW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SectionGlow({ color = "violet", intensity = 0.08, size = 600, className = "" }) {
  const colorMap = {
    violet:  `rgba(139,92,246,${intensity})`,
    cyan:    `rgba(6,182,212,${intensity})`,
    amber:   `rgba(245,158,11,${intensity})`,
    emerald: `rgba(52,211,153,${intensity})`,
  };
  return (
    <div
      className={`absolute rounded-full blur-[140px] pointer-events-none ${className}`}
      style={{
        width: size, height: size,
        background: `radial-gradient(circle, ${colorMap[color]} 0%, transparent 70%)`,
      }}
    />
  );
}

// â”€â”€â”€ WAITLIST FORM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WaitlistForm({ variant = "hero" }) {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef(null);

  // M35-C â€” the guard below used to read `status`, which is React state and so
  // still reads "idle" for every click delivered before the next render.
  // Measured: three clicks produced three POST /api/waitlist. useSubmitGuard
  // holds the flag in a ref, which mutates synchronously and wins that race.
  const [handleSubmit] = useSubmitGuard(async (e) => {
    e.preventDefault();
    if (status === "success") return;
    const trimmed = email.trim();
    if (!trimmed) { setErrorMessage("Enter your email address."); setStatus("error"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) { setErrorMessage("Enter a valid email address."); setStatus("error"); return; }
    setStatus("loading"); setErrorMessage("");
    try {
      const res  = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmed, source: variant }) });
      const data = await res.json();
      if (res.ok) { setStatus("success"); setEmail(""); }
      else if (res.status === 409) { setErrorMessage("You're already on the list."); setStatus("error"); }
      else { setErrorMessage(data.message || "Something went wrong."); setStatus("error"); }
    } catch { setErrorMessage("Network error. Please try again."); setStatus("error"); }
  });

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25"
        style={{ boxShadow: "0 0 30px rgba(52,211,153,0.08)" }}
      >
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "0 0 16px rgba(52,211,153,0.3)" }}>
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-300" style={{ fontFamily: FONT_BODY }}>You're on the list.</p>
          <p className="text-xs text-emerald-400/60 mt-0.5" style={{ fontFamily: FONT_BODY }}>We'll reach out when it's your turn.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === "error") { setStatus("idle"); setErrorMessage(""); } }}
            placeholder="you@company.com"
            disabled={status === "loading"}
            className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border text-white text-sm placeholder:text-gray-500 outline-none transition-all focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60 ${
              status === "error" ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 hover:border-white/20 focus:border-violet-500/40"
            }`}
            style={{ fontFamily: FONT_BODY }}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-3 bg-white text-black rounded-xl font-medium text-sm transition-all hover:bg-gray-100 hover:shadow-xl hover:shadow-white/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          style={{ fontFamily: FONT_BODY }}
        >
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Request Access</span><ArrowUpRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
      {status === "error" && errorMessage && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 mt-2 text-xs text-red-400" style={{ fontFamily: FONT_BODY }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{errorMessage}
        </motion.p>
      )}
    </form>
  );
}

// â”€â”€â”€ VALUE BLOCKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VALUE_BLOCKS = [
  { icon: Send,     title: "Campaign Automation",       description: "End-to-end campaign orchestration. Upload contacts, build templates with merge fields, preview with AI, and send at scale. All from one interface.", color: "cyan",   delay: 0.1 },
  { icon: Shield,   title: "Deliverability Infrastructure", description: "Built-in spam analysis, content scoring, and domain reputation monitoring. Know your inbox placement before you hit send.",                        color: "violet", delay: 0.2 },
  { icon: BarChart3,title: "Performance Intelligence",  description: "Real-time delivery metrics, campaign analytics, and credit tracking. Full visibility into what's working and what needs attention.",                color: "amber",  delay: 0.3 },
];

const ACCENT = {
  cyan:   { iconBg: "from-cyan-500/15 to-cyan-600/10",   border: "border-cyan-500/20",   hoverBorder: "hover:border-cyan-500/40",   text: "text-cyan-400",   glow: "rgba(6,182,212,0.13)"   },
  violet: { iconBg: "from-violet-500/15 to-violet-600/10",border: "border-violet-500/20", hoverBorder: "hover:border-violet-500/40", text: "text-violet-400", glow: "rgba(139,92,246,0.13)"  },
  amber:  { iconBg: "from-amber-500/15 to-amber-600/10", border: "border-amber-500/20",  hoverBorder: "hover:border-amber-500/40",  text: "text-amber-400",  glow: "rgba(245,158,11,0.13)"  },
};

// â”€â”€â”€ STATS ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TRUST_STATS = [
  { icon: Users,  value: "200+",    label: "Teams on waitlist",     color: "violet" },
  { icon: Globe2, value: "18",      label: "Countries represented", color: "cyan"   },
  { icon: Lock,   value: "Private", label: "Invite-only beta",      color: "amber"  },
];

// â”€â”€â”€ MAIN COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function WaitlistLanding() {
  return (
    <div className="min-h-screen w-full bg-[#0A0A0F] overflow-x-hidden">

      {/* â”€â”€ NAVIGATION â”€â”€ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#0A0A0F]/80 border-b border-white/[0.06]"
        style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)" }}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <img src="/letszero-logo.png" alt="LetsZero" style={{ height: "64px", width: "auto", objectFit: "contain", borderRadius: "10px", background: "#111118", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }} />
          </motion.div>

          <div className="flex items-center gap-4">
            {/* M35-D â€” 20px tall as flex children; these are visible from `sm`
                up, which includes touch tablets, so they need a real target. */}
            <a href="/"                  className="hidden sm:inline-flex min-h-[24px] items-center px-1 text-sm text-gray-400 hover:text-white transition-colors" style={{ fontFamily: FONT_BODY }}>Home</a>
            <a href="/products/repmail"  className="hidden sm:inline-flex min-h-[24px] items-center px-1 text-sm text-gray-400 hover:text-white transition-colors" style={{ fontFamily: FONT_BODY }}>RepMail</a>
            <a href="/login"             className="hidden sm:inline-flex min-h-[24px] items-center px-1 text-sm text-gray-400 hover:text-white transition-colors" style={{ fontFamily: FONT_BODY }}>Sign In</a>
            <a
              href="#waitlist-cta"
              className="px-5 py-2.5 text-sm rounded-xl font-medium transition-all hover:shadow-xl active:scale-95 relative overflow-hidden group"
              style={{ fontFamily: FONT_BODY, background: "linear-gradient(135deg, #fff 0%, #e8e8ff 100%)", color: "#0A0A0F", boxShadow: "0 0 20px rgba(139,92,246,0.2)" }}
            >
              Request Early Access
            </a>
          </div>
        </div>
      </nav>

      {/* â”€â”€ HERO â”€â”€ */}
      <section className="relative w-full min-h-screen overflow-hidden pt-20">
        <AnimatedBackground />

        {/* Floating RepMail metric cards (desktop only) */}
        <FloatingMetricCards />

        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12 py-28 md:py-36" style={{ zIndex: 3 }}>
          <div className="max-w-3xl xl:max-w-[52%]">

            {/* Private Beta badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 mb-8"
            >
              <motion.div
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-sm"
                style={{ background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)", boxShadow: "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.06)" }}
                animate={{ boxShadow: ["0 0 20px rgba(139,92,246,0.15)", "0 0 32px rgba(139,92,246,0.28)", "0 0 20px rgba(139,92,246,0.15)"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div className="w-1.5 h-1.5 rounded-full bg-violet-400" animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <span className="text-sm text-violet-300" style={{ fontFamily: FONT_MONO }}>Private Beta</span>
                <Sparkles className="w-3.5 h-3.5 text-violet-400/70" />
              </motion.div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
              className="mb-6" style={{ fontFamily: FONT_HEADING }}
            >
              <span className="block text-4xl sm:text-5xl md:text-[64px] leading-[1.1] font-semibold text-white">
                Outbound infrastructure
              </span>
              <span
                className="block text-4xl sm:text-5xl md:text-[64px] leading-[1.1] font-semibold"
                style={{ background: "linear-gradient(90deg, #a78bfa 0%, #818cf8 45%, #67e8f9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", paddingBottom: "0.08em" }}
              >
                that actually works.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.22 }}
              className="text-base sm:text-lg text-gray-400 mb-10 max-w-xl leading-relaxed" style={{ fontFamily: FONT_BODY }}
            >
              LetsZero unifies campaign automation, deliverability, and performance analytics
              into a single system. Built for teams that need control over their outbound
              pipeline, not another fragmented tool stack.
            </motion.p>

            {/* Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.32 }}>
              <WaitlistForm variant="hero" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-5 text-xs text-gray-600" style={{ fontFamily: FONT_BODY }}
            >
              Now onboarding early operators Â· Rolling invitations Â· No spam, ever
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </motion.div>
        </motion.div>
      </section>

      {/* â”€â”€ STATS ROW â”€â”€ */}
      <section className="relative w-full bg-[#0A0A0F] py-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 md:gap-24">
            {TRUST_STATS.map((stat, i) => {
              const Icon = stat.icon;
              const c = { violet: { text: "text-violet-400", glow: "rgba(139,92,246,0.2)" }, cyan: { text: "text-cyan-400", glow: "rgba(6,182,212,0.2)" }, amber: { text: "text-amber-400", glow: "rgba(245,158,11,0.2)" } }[stat.color];
              return (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 80%)`, border: "1px solid rgba(255,255,255,0.07)" }}>
                    <Icon className={`w-4 h-4 ${c.text}`} />
                  </div>
                  <div>
                    <p className={`text-xl font-semibold ${c.text}`} style={{ fontFamily: FONT_HEADING }}>{stat.value}</p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: FONT_BODY }}>{stat.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ CORE VALUE SECTION (with data-flow animation in bg) â”€â”€ */}
      <section className="relative w-full bg-[#0A0A0F] py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        <SectionGlow color="cyan" intensity={0.06} size={500} className="top-1/2 -translate-y-1/2 -left-32" />

        {/* Data-flow network animation in lower half */}
        <AnimatedDataFlow className="bottom-0 left-0 right-0 h-64 opacity-60" />

        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <span className="text-xs uppercase tracking-widest text-gray-500 mb-3 block" style={{ fontFamily: FONT_MONO }}>What we're building</span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white max-w-lg" style={{ fontFamily: FONT_HEADING }}>
              One system for outbound.
              <br />
              <span className="text-gray-400">Not ten tools duct-taped together.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {VALUE_BLOCKS.map((block) => {
              const a = ACCENT[block.color];
              const Icon = block.icon;
              return (
                <motion.div
                  key={block.title}
                  initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: block.delay }}
                  whileHover={{ y: -4 }}
                  className={`group relative p-6 rounded-2xl border bg-white/[0.02] transition-all duration-300 cursor-default ${a.border} ${a.hoverBorder}`}
                  style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.2)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 40px ${a.glow}, 0 1px 0 rgba(255,255,255,0.06)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.2)"; }}
                >
                  <div className={`absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    style={{ background: `linear-gradient(90deg, transparent, ${a.glow.replace('0.13', '0.7')}, transparent)` }} />
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.iconBg} border ${a.border} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 ${a.text}`} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2.5" style={{ fontFamily: FONT_HEADING }}>{block.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: FONT_BODY }}>{block.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ PROBLEM SECTION â”€â”€ */}
      <section className="relative w-full bg-[#0A0A0F] py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        <SectionGlow color="violet" intensity={0.07} size={600} className="-top-32 -right-48" />

        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}>
              <span className="text-xs uppercase tracking-widest text-gray-500 mb-3 block" style={{ fontFamily: FONT_MONO }}>The problem</span>
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-8" style={{ fontFamily: FONT_HEADING }}>
                Outbound is{" "}
                <span style={{ background: "linear-gradient(90deg, #f87171 0%, #fca5a5 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  broken.
                </span>
              </h2>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.12 }} className="space-y-5 mb-10">
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: FONT_BODY }}>Most outbound teams run on a patchwork of disconnected tools. One for sending, one for list management, another for analytics, and something else for deliverability.</p>
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: FONT_BODY }}>Deliverability is a black box. You don't know your inbox placement until your campaign is already underperforming.</p>
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: FONT_BODY }}>Scaling outbound means scaling complexity. More tools, more integrations, more things that break silently. The infrastructure layer doesn't exist. Until now.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, delay: 0.28 }} className="flex flex-wrap gap-3">
              {["Fragmented tools", "No deliverability visibility", "Manual processes at scale", "Data silos"].map((item, i) => (
                <motion.span key={item} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400/80 rounded-full border border-red-500/15 bg-red-500/[0.05]" style={{ fontFamily: FONT_MONO }}>
                  <div className="w-1 h-1 rounded-full bg-red-400/60" />{item}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* â”€â”€ VISION SECTION â”€â”€ */}
      <section className="relative w-full bg-[#0A0A0F] py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[200px] pointer-events-none"
          style={{ width: 900, height: 500, background: "radial-gradient(ellipse, rgba(139,92,246,0.09) 0%, rgba(6,182,212,0.04) 50%, transparent 100%)" }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}>
              <span className="text-xs uppercase tracking-widest text-gray-500 mb-3 block" style={{ fontFamily: FONT_MONO }}>What we believe</span>
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-8" style={{ fontFamily: FONT_HEADING }}>Building the infrastructure layer<br />for modern outbound</h2>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.14 }} className="space-y-5 text-left md:text-center">
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: FONT_BODY }}>LetsZero is building a unified system where campaign automation, deliverability intelligence, and performance analytics work together â€” not as separate products, but as one coherent infrastructure.</p>
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: FONT_BODY }}>We started with RepMail because email is still the backbone of B2B outbound. The architecture is designed to extend into messaging, notifications, and multi-channel orchestration.</p>
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: FONT_BODY }}>Built for teams who want control, clarity, and scale. No black boxes. No vendor lock-in. Just infrastructure that works.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-12 inline-flex items-center gap-5 px-6 py-4 rounded-2xl border"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)", boxShadow: "0 0 30px rgba(139,92,246,0.08), 0 1px 0 rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2">
                <motion.div className="w-2 h-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.4, 1], scale: [1, 0.8, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ boxShadow: "0 0 8px rgba(52,211,153,0.6)" }} />
                <span className="text-sm text-gray-300" style={{ fontFamily: FONT_BODY }}>RepMail Â· Live</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: FONT_BODY }}>MessageHub Â· Planned</span>
              </div>
              <div className="w-px h-5 bg-white/10 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: FONT_BODY }}>NotifyStream Â· Future</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* â”€â”€ FINAL CTA â”€â”€ */}
      <section id="waitlist-cta" className="relative w-full bg-[#0A0A0F] py-28 md:py-36 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        {/* Animated CTA glows */}
        <motion.div
          className="absolute rounded-full blur-[160px] pointer-events-none"
          style={{ width: 600, height: 400, bottom: "-20%", left: "20%", background: "radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full blur-[140px] pointer-events-none"
          style={{ width: 500, height: 350, top: "-10%", right: "20%", background: "radial-gradient(ellipse, rgba(6,182,212,0.10) 0%, transparent 70%)" }}
          animate={{ scale: [1, 0.92, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="max-w-xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}>

              {/* â”€â”€ MORSE CODE DISPLAY â”€â”€ */}
              <motion.div
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }}
                className="mb-8"
              >
                <div
                  className="inline-flex flex-col items-center gap-3 px-6 py-4 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(6,182,212,0.04) 100%)",
                    border: "1px solid rgba(139,92,246,0.15)",
                    boxShadow: "0 0 30px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <p className="text-[9px] tracking-[0.3em] text-gray-600 uppercase" style={{ fontFamily: FONT_MONO }}>
                    transmitting
                  </p>
                  <MorseCodeDisplay />
                </div>
              </motion.div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-violet-300" style={{ fontFamily: FONT_MONO }}>Limited early access</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-semibold text-white mb-4" style={{ fontFamily: FONT_HEADING }}>Get early access</h2>
              <p className="text-gray-400 mb-10 text-lg leading-relaxed" style={{ fontFamily: FONT_BODY }}>
                We're onboarding teams in small batches. Request access and we'll reach out when there's a spot.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, delay: 0.14 }}>
              <div className="relative inline-block w-full">
                <motion.div
                  className="absolute -inset-4 rounded-2xl blur-xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)" }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative flex justify-center">
                  <WaitlistForm variant="footer" />
                </div>
              </div>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 text-xs text-gray-600" style={{ fontFamily: FONT_BODY }}>
              Private beta Â· No credit card required Â· Cancel anytime
            </motion.p>
          </div>
        </div>
      </section>

      {/* â”€â”€ FOOTER â”€â”€ */}
      <footer className="w-full bg-[#0A0A0F] border-t border-white/[0.05] py-10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/letszero-logo.png" alt="LetsZero" style={{ height: "44px", width: "auto", objectFit: "contain", borderRadius: "8px", background: "#111118", boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }} />
          </div>
          {/* M35-D — flex children, so WCAG 2.5.8's inline exception does not
              apply; they measured 16px tall. Padding brings them to 24px. */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a href="/privacy" className="inline-flex min-h-[24px] items-center px-1 text-xs text-gray-600 hover:text-gray-400 transition-colors" style={{ fontFamily: FONT_BODY }}>Privacy</a>
            <a href="/terms" className="inline-flex min-h-[24px] items-center px-1 text-xs text-gray-600 hover:text-gray-400 transition-colors" style={{ fontFamily: FONT_BODY }}>Terms</a>
            <a href="/contact" className="inline-flex min-h-[24px] items-center px-1 text-xs text-gray-600 hover:text-gray-400 transition-colors" style={{ fontFamily: FONT_BODY }}>Contact</a>
          </div>
          <p className="text-xs text-gray-600" style={{ fontFamily: FONT_BODY }}>
            &copy; {new Date().getFullYear()} LetsZero. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
