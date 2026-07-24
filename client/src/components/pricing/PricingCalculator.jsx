/**
 * SHARED PRICING CALCULATOR (credit estimator) — RepMail by LetsZero
 *
 * M39 Phase 1C — extracted from PublicPricing.jsx so the credit estimator is a
 * reusable commerce component rather than ~300 lines inlined in one page. It owns
 * the slider/input interaction and DISPLAYS an estimate; it decides no charge. The
 * amount is priced by the shared formula for display and, on buy, validated and
 * charged by the server (MD-003). The component is presentational + local state
 * only: it reports the chosen amount via `onBuy(credits)` and lets the host own
 * navigation / purchase-intent persistence.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { Building2, ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { calculateCreditPurchase } from "@shared/schema";
import { fmtNum, fmtUSD } from "@/lib/commerce/format";
import { CREDIT_PRESETS, MIN_CREDITS, MAX_CREDITS, CREDIT_STEP } from "@/lib/commerce/config";

// ─── Logarithmic slider scale (3K–300K spans 2 orders of magnitude) ───────────
// A linear slider makes 10K look identical to 3K. Log scale spaces them evenly.
const _LOG_MIN = Math.log10(MIN_CREDITS);
const _LOG_MAX = Math.log10(MAX_CREDITS);
const _SLIDER_MAX = 1000;

function creditsToSlider(c) {
  const clamped = Math.max(MIN_CREDITS, Math.min(MAX_CREDITS, c));
  return Math.round(((Math.log10(clamped) - _LOG_MIN) / (_LOG_MAX - _LOG_MIN)) * _SLIDER_MAX);
}

function sliderToCredits(pos) {
  const t = pos / _SLIDER_MAX;
  const raw = Math.pow(10, _LOG_MIN + t * (_LOG_MAX - _LOG_MIN));
  return Math.max(MIN_CREDITS, Math.min(MAX_CREDITS, Math.round(raw / CREDIT_STEP) * CREDIT_STEP));
}

const PRESET_LABELS = ["3K", "5K", "10K", "15K", "25K", "50K", "100K", "200K", "300K"];

// ─── Animated number hook ─────────────────────────────────────────────────────
// snapKey: when this value changes, skip animation and jump instantly (e.g. currency switch)
function useAnimatedNumber(value, snapKey) {
  const motionVal = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  const prevSnapKey = useRef(snapKey);

  useEffect(() => {
    const shouldSnap = snapKey !== undefined && snapKey !== prevSnapKey.current;
    prevSnapKey.current = snapKey;

    if (shouldSnap) {
      motionVal.set(value);
      setDisplay(value);
      return;
    }
    const ctrl = animate(motionVal, value, {
      duration: 0.4,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return ctrl.stop;
  }, [value, snapKey, motionVal]);

  return display;
}

/**
 * @param {object}   props
 * @param {"INR"|"USD"} [props.currency="INR"]
 * @param {(credits:number) => void} props.onBuy  called with the chosen credit amount
 * @param {number}   [props.initialCredits=15000]
 */
export default function PricingCalculator({ currency = "INR", onBuy, initialCredits = 15000 }) {
  // ── M35-B — the slider's own position is the single source of truth; credits are
  // derived from it, so the thumb never snaps away from the cursor. `inputDraft` is
  // explicitly ephemeral: while non-null the field shows what was typed and nothing
  // may overwrite it; on blur it commits and clears.
  const [sliderPos, setSliderPos] = useState(() => creditsToSlider(initialCredits));
  const [inputDraft, setInputDraft] = useState(null);

  const credits = sliderToCredits(sliderPos);
  const inputVal = inputDraft ?? String(credits);

  const setCredits = useCallback((c) => setSliderPos(creditsToSlider(c)), []);

  const handleInputChange = useCallback((e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setInputDraft(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= MIN_CREDITS && num <= MAX_CREDITS) {
      setSliderPos(creditsToSlider(Math.round(num / CREDIT_STEP) * CREDIT_STEP));
    }
  }, []);

  const handleInputBlur = useCallback(() => {
    const num = parseInt(inputDraft ?? "", 10);
    const next = isNaN(num)
      ? credits
      : Math.max(MIN_CREDITS, Math.min(MAX_CREDITS, Math.round(num / CREDIT_STEP) * CREDIT_STEP));
    setSliderPos(creditsToSlider(next));
    setInputDraft(null);
  }, [inputDraft, credits]);

  const estimatorCredits = credits;
  const purchase = calculateCreditPurchase(estimatorCredits);
  const isMaxCredits = credits >= MAX_CREDITS;

  const estimPrice = purchase
    ? (currency === "INR" ? purchase.priceINR : purchase.priceUSD)
    : 0;
  const estimTotal = purchase ? purchase.totalCredits : 0;
  const estimBonus = purchase ? purchase.bonusCredits : 0;

  const animatedPrice = useAnimatedNumber(estimPrice, currency);
  const animatedTotal = useAnimatedNumber(estimTotal, currency);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-4 sm:p-8 md:p-10"
      style={{
        background: "rgba(12,12,20,0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Section label */}
      <div
        className="flex items-center gap-3 mb-8"
        style={{ color: "#00E5C8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}
      >
        <div style={{ width: 40, height: 1, background: "#00E5C8" }} />
        Estimate Your Cost
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Left: Slider + input */}
        <div>
          {/* M38 — stack the credit total above the input on narrow screens. */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <div
                className="text-3xl font-bold mb-1"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "#F0F0F5", fontVariantNumeric: "tabular-nums" }}
              >
                {fmtNum(estimatorCredits)}
              </div>
              <div className="text-sm" style={{ color: "#9898B8" }}>credits</div>
            </div>

            {/* Direct input */}
            <div>
              <label
                htmlFor="credit-input"
                className="block text-xs mb-1.5"
                style={{ color: "#B8B8D0", letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                Enter exact amount
              </label>
              <input
                id="credit-input"
                type="text"
                inputMode="numeric"
                value={inputVal}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="rounded-lg px-3 py-2 text-sm font-mono text-right outline-none transition-all"
                style={{
                  width: "130px",
                  background: "#16162A",
                  border: "1px solid #2A2A45",
                  color: "#F0F0F5",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#00E5C8")}
                onBlurCapture={e => (e.currentTarget.style.borderColor = "#2A2A45")}
                aria-label="Enter credit amount"
              />
            </div>
          </div>

          {/* Custom styled slider — 1,000-credit increments */}
          <div className="relative py-4">
            {/* M35-B — the slider's own position is the value. */}
            <Slider
              min={0}
              max={_SLIDER_MAX}
              step={1}
              value={[sliderPos]}
              onValueChange={([v]) => { setSliderPos(v); setInputDraft(null); }}
              className="w-full"
              style={{ "--slider-track": "#16162A", "--slider-range": "#00E5C8" }}
              thumbProps={{
                "aria-label": "Select credit amount",
                "aria-valuetext": `${fmtNum(estimatorCredits)} credits`,
              }}
            />
            {/* Tick marks — jump to common presets. M38 — each tick is positioned from
                the SAME creditsToSlider() scale that drives the thumb (one source of
                truth), so a preset's label sits exactly under the thumb when selected.
                M35-D — ≥24px hit target (WCAG 2.5.8). M35-F — inactive #7878A0 (4.7:1). */}
            <div className="relative mt-3 h-6">
              {CREDIT_PRESETS.map((value, i) => {
                const frac = creditsToSlider(value) / _SLIDER_MAX; // 0..1, log scale
                return (
                  <button
                    key={value}
                    onClick={() => setCredits(value)}
                    className="absolute top-0 inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8]"
                    style={{
                      left: `calc(10px + ${frac} * (100% - 20px))`,
                      transform: "translateX(-50%)",
                      color: credits === value ? "#00E5C8" : "#7878A0",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.05em",
                    }}
                    aria-label={`Select ${value.toLocaleString()} credits`}
                  >
                    {PRESET_LABELS[i]}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs mt-4" style={{ color: "#7878A0" }}>
            Minimum purchase: 3,000 credits · Credits never expire
          </p>
        </div>

        {/* Right: Result display */}
        <div
          className="rounded-xl p-6 flex flex-col justify-center relative overflow-hidden"
          style={{ background: "#0A0A12", border: "1px solid #1A1A2E" }}
        >
          <AnimatePresence mode="wait">
            {isMaxCredits ? (
              <motion.div
                key="contact-sales"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <Building2 className="w-10 h-10 mx-auto mb-4" style={{ color: "#8B5CF6" }} />
                <div
                  className="text-xl font-bold mb-2"
                  style={{ fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif", color: "#F0F0F5" }}
                >
                  300,000+ Credits?
                </div>
                <p className="text-sm mb-6" style={{ color: "#A8A8C0" }}>
                  For custom volume requirements, contact our sales team for tailored pricing.
                </p>
                <Link href="/contact?reason=SALES">
                  <button
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: "rgba(139,92,246,0.15)",
                      border: "1px solid rgba(139,92,246,0.4)",
                      color: "#8B5CF6",
                    }}
                  >
                    Contact Sales <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="estimate-result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div
                  className="text-xs mb-2 uppercase tracking-widest"
                  style={{ color: "#B8B8D0", letterSpacing: "0.2em" }}
                >
                  Total cost
                </div>
                <div
                  className="text-5xl font-bold mb-1"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#F0F0F5",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`${currency}-${estimPrice}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currency === "INR"
                        ? `₹${animatedPrice.toLocaleString("en-IN")}`
                        : fmtUSD(estimPrice)}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <div
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
                  >
                    <span style={{ color: "#8A8AB0", fontSize: "11px" }}>Total credits</span>
                    <div
                      style={{ color: "#F0F0F5", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
                      className="font-bold text-base"
                    >
                      {animatedTotal.toLocaleString()}
                    </div>
                  </div>

                  <AnimatePresence>
                    {estimBonus > 0 && (
                      <motion.div
                        key="bonus"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{
                          background: "rgba(52,211,153,0.08)",
                          border: "1px solid rgba(52,211,153,0.2)",
                        }}
                      >
                        <span style={{ color: "#8A8AB0", fontSize: "11px" }}>Bonus credits</span>
                        <div
                          style={{ color: "#34D399", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
                          className="font-bold text-base"
                        >
                          +{estimBonus.toLocaleString()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
                  >
                    <span style={{ color: "#8A8AB0", fontSize: "11px" }}>Cost per email</span>
                    <div
                      style={{ color: "#F0F0F5", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
                      className="font-bold text-base"
                    >
                      ₹{purchase ? (purchase.priceINR / estimatorCredits).toFixed(2) : "—"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onBuy?.(estimatorCredits)}
                  className="w-full mt-6 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #00E5C8 0%, #00B8A3 100%)",
                    color: "#06060B",
                    boxShadow: "0 4px 20px rgba(0,229,200,0.2)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,229,200,0.3)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,229,200,0.2)";
                  }}
                >
                  Buy {fmtNum(estimatorCredits)} Credits
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
