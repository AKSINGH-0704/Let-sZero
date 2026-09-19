/**
 * LETSZERO "LIVING LEDGER" — Problem, System (dark control room), Guarantees.
 */

import { motion, useReducedMotion } from "framer-motion";
import {
  C,
  EASE,
  PIPELINE,
  GUARANTEES,
  Reveal,
  Counter,
  Aurora,
  SectionHeader,
  staggerParent,
  staggerChild,
  onInk,
  asText,
} from "./theme.jsx";
import { IMAGES } from "./fx.jsx";

/* ============================================================
   02 — THE PROBLEM
============================================================ */
export function ProblemSection() {
  const stats = [
    {
      big: <Counter to={0.3} decimals={1} suffix="%" className="lz-mono text-[34px] font-bold" style={{ color: C.oxide }} />,
      text: "The complaint rate where Gmail and Yahoo start blocking bulk senders outright.",
      accent: C.oxide,
    },
    {
      big: <Counter to={0.1} decimals={1} suffix="%" className="lz-mono text-[34px] font-bold" style={{ color: C.amberText }} />,
      text: "The line they ask you to stay under. RepMail pauses your campaign here, automatically.",
      accent: C.amber,
    },
    {
      big: <span className="lz-mono text-[34px] font-bold" style={{ color: C.rose }}>₹0</span>,
      text: "What it costs to buy back a burned domain. It's not for sale, at any price.",
      accent: C.rose,
    },
  ];

  return (
    <section className="relative py-24 md:py-36 overflow-hidden">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <SectionHeader n="02" label="The problem" accent={C.amberText} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <Reveal>
              <h2 className="lz-display font-bold tracking-[-0.02em] leading-[1.05] text-[clamp(30px,4.2vw,54px)]">
                Most email tools have a quiet deal:{" "}
                <span style={{ color: C.oxide }}>you burn the domain</span>,
                <br className="hidden md:block" /> they keep the{" "}
                <em className="lz-serif" style={{ fontStyle: "italic", color: C.amberText }}>
                  subscription.
                </em>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-[600px] text-[16px] md:text-[17px] leading-relaxed" style={{ color: C.inkSoft }}>
                Since 2024, Gmail and Yahoo have had strict rules for bulk senders. Let
                spam complaints pass 0.3% and your emails stop arriving, for every
                campaign, every rep and every future customer. They ask senders to
                stay under 0.1%. Most tools mention this in a help article, then
                give you a bigger send button.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mt-6 max-w-[600px] text-[16px] md:text-[17px] leading-relaxed" style={{ color: C.inkSoft }}>
                A burned domain doesn't show an error.{" "}
                <span style={{ color: C.ink, fontWeight: 500 }}>Replies just quietly stop.</span>{" "}
                By the time you notice, it's too late, and no tool can give it back.
              </p>
            </Reveal>

            {/* reply decay visual */}
            <Reveal delay={0.25}>
              <div className="mt-12 max-w-[600px]">
                <div className="lz-mono text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: C.inkFaintText }}>
                  Replies from a burning domain, week by week
                </div>
                <div className="flex items-end gap-1.5 h-24">
                  {[92, 88, 84, 76, 61, 42, 24, 11, 4, 2].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        background: i < 4 ? C.emerald : i < 7 ? C.amber : C.oxide,
                        opacity: 0.9,
                      }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.7, delay: 0.3 + i * 0.07, ease: EASE }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 lz-mono text-[10px]" style={{ color: C.inkFaintText }}>
                  <span style={{ color: C.emeraldText }}>HEALTHY</span>
                  <span style={{ color: C.amberText }}>SLIPPING, WITH NO WARNING</span>
                  <span style={{ color: C.oxideText }}>GONE</span>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <motion.div
              variants={staggerParent}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-7"
            >
              {stats.map((s, i) => (
                <motion.div
                  key={i}
                  variants={staggerChild}
                  whileHover={{ x: 6 }}
                  className="pl-6 py-1 rounded-r-xl"
                  style={{ borderLeft: `3px solid ${s.accent}` }}
                >
                  <div>{s.big}</div>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: C.inkSoft }}>
                    {s.text}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   03 — THE SYSTEM (dark control room)
============================================================ */
export function SystemSection() {
  const reduce = useReducedMotion();
  return (
    <section id="system" className="relative py-24 md:py-36 overflow-hidden" style={{ background: C.ink, color: C.paper }}>
      {/* image backdrop — data-center rails under heavy ink wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${IMAGES.servers})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.1,
          filter: "grayscale(1) contrast(1.1)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(to bottom, ${C.ink} 0%, ${C.ink}D9 35%, ${C.ink}D9 65%, ${C.ink} 100%)` }}
        aria-hidden="true"
      />
      <Aurora mode="ink" />
      <div className="absolute inset-0 pointer-events-none lz-grain" />

      <div className="relative max-w-[1320px] mx-auto px-5 sm:px-8">
        <SectionHeader n="03" label="How it works" accent={C.tealOnInk} dark />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 md:mb-20">
          <div className="lg:col-span-7">
            <Reveal>
              <h2 className="lz-display font-bold tracking-[-0.02em] leading-[1.05] text-[clamp(30px,4.2vw,54px)]">
                Seven stages.{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${C.oxide}, ${C.amber}, ${C.emerald}, ${C.teal}, ${C.violet})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }}
                >
                  Every single email goes through all of them.
                </span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 flex items-end">
            <Reveal delay={0.15}>
              <p className="text-[15px] leading-relaxed" style={{ color: "#BDB5A4" }}>
                This is how RepMail really sends, not a marketing diagram. Each
                step exists because something can go wrong there, and when it
                does, RepMail stops or skips instead of guessing.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Pipeline with traveling pulse rail */}
        <div className="relative">
          <div
            className="absolute left-[7px] md:left-[9px] top-0 bottom-0 w-px hidden sm:block"
            style={{
              background: `linear-gradient(to bottom, ${C.oxide}, ${C.amber}, ${C.rose}, ${C.teal}, ${C.emerald}, ${C.violet}, ${C.gold})`,
              opacity: 0.5,
            }}
          />
          {!reduce && (
            <motion.div
              className="absolute left-[3px] md:left-[5px] w-[9px] h-[9px] rounded-full hidden sm:block"
              style={{ background: C.paper, boxShadow: `0 0 14px 3px ${C.amber}` }}
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <div className="sm:pl-10 md:pl-14">
            {PIPELINE.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.05} y={20}>
                <motion.div
                  whileHover={{ x: 8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="group relative grid grid-cols-12 gap-4 md:gap-6 py-7 md:py-8 px-4 md:px-6 -mx-4 md:mx-0 rounded-xl"
                  style={{ borderBottom: `1px solid ${C.paper}14` }}
                >
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `linear-gradient(90deg, ${s.accent}1F, transparent 60%)` }}
                  />
                  <div className="relative col-span-12 md:col-span-2 flex md:block items-baseline gap-3">
                    <span
                      className="lz-display text-[40px] md:text-[52px] font-extrabold leading-none"
                      style={{ color: onInk(s.accent), opacity: 0.85 }}
                    >
                      {s.id}
                    </span>
                    <span
                      className="lz-mono text-xs tracking-[0.2em] md:mt-2 md:inline-block px-2 py-1 rounded"
                      style={{ color: onInk(s.accent), background: `${s.accent}1A` }}
                    >
                      {s.name}
                    </span>
                  </div>
                  <div className="relative col-span-12 md:col-span-4">
                    <h3 className="lz-display font-bold text-lg md:text-xl tracking-[-0.01em] leading-snug">
                      {s.title}
                    </h3>
                  </div>
                  <div className="relative col-span-12 md:col-span-4">
                    <p className="text-[14px] leading-relaxed" style={{ color: "#BDB5A4" }}>{s.body}</p>
                  </div>
                  <div className="relative col-span-12 md:col-span-2 md:text-right">
                    <span className="lz-mono text-[10.5px] leading-relaxed block" style={{ color: onInk(s.accent) }}>
                      {s.spec}
                    </span>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <span className="lz-mono text-[11px] tracking-[0.18em] uppercase" style={{ color: "#9A937F" }}>
              Built on
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                ["Node.js", C.emerald],
                ["PostgreSQL", C.teal],
                ["Redis · BullMQ", C.oxide],
                ["AWS SES + SNS", C.amber],
                ["OpenAI", C.violet],
              ].map(([t, accent]) => (
                <motion.span
                  key={t}
                  whileHover={{ scale: 1.06, y: -2 }}
                  className="lz-mono text-[11px] px-3 py-1.5 rounded-full border cursor-default"
                  style={{ color: onInk(accent), borderColor: `${accent}55`, background: `${accent}12` }}
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   04 — GUARANTEES
============================================================ */
export function GuaranteesSection() {
  return (
    <section id="guarantees" className="relative py-24 md:py-36 overflow-hidden">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <SectionHeader n="04" label="Our guarantees" accent={C.emeraldText} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="lg:col-span-8">
            <Reveal>
              <h2 className="lz-display font-bold tracking-[-0.02em] leading-[1.05] text-[clamp(30px,4.2vw,54px)]">
                Anyone can make promises.
                <br />
                We{" "}
                <em className="lz-serif" style={{ fontStyle: "italic", color: C.emerald }}>
                  built ours in.
                </em>
              </h2>
            </Reveal>
          </div>
        </div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {GUARANTEES.map((g) => (
            <motion.div key={g.id} variants={staggerChild} className="h-full">
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="group relative h-full rounded-2xl p-7 md:p-8 flex flex-col overflow-hidden"
                style={{
                  background: C.paperHi,
                  border: `1px solid ${C.ink}1A`,
                  boxShadow: `0 4px 24px -12px ${C.ink}26`,
                }}
              >
                <span
                  className="absolute top-0 left-0 h-1 w-full origin-left scale-x-[0.18] group-hover:scale-x-100 transition-transform duration-500"
                  style={{ background: `linear-gradient(90deg, ${g.accent}, ${g.accent}55)` }}
                />
                <span
                  className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${g.accent}26, transparent 70%)` }}
                />
                <span
                  className="lz-mono text-[11px] tracking-[0.18em] mb-5 px-2 py-1 rounded self-start"
                  style={{ color: asText(g.accent), background: `${g.accent}16` }}
                >
                  {g.id}
                </span>
                <h3 className="lz-display font-bold text-xl tracking-[-0.01em] leading-snug mb-3">
                  {g.title}
                </h3>
                <p className="text-[14.5px] leading-relaxed mb-6 flex-1" style={{ color: C.inkSoft }}>
                  {g.body}
                </p>
                <div className="pt-4" style={{ borderTop: `1px dotted ${C.ink}33` }}>
                  <span className="lz-mono text-[10.5px] leading-relaxed" style={{ color: asText(g.accent) }}>
                    HOW — {g.mech}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
