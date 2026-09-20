/**
 * LETSZERO — "THE LIVING LEDGER" LANDING EXPERIENCE  ·  v3
 *
 * Composition root. Tokens/data/primitives in theme.jsx; FX layer (cursor,
 * imagery, global styles) in fx.jsx; sections split across
 * Hero.jsx / Sections.jsx / Closing.jsx.
 *
 * v3 adds: custom dynamic cursor, duotone image collage,
 * ghost type parallax, rotating badge, image-backed dark sections.
 *
 * Every number on this page is real and sourced from the engineering handoff.
 * No fabricated volume/uptime/customer metrics.
 */

import { motion, useScroll, useSpring } from "framer-motion";
import { C } from "./theme.jsx";
import { GlobalStyles, Cursor } from "./fx.jsx";
import { Nav, Hero } from "./Hero.jsx";
import { ProblemSection, SystemSection, GuaranteesSection } from "./Sections.jsx";
import { AISection, PlatformSection, PricingSection, ResourcesSection, CTASection, Footer } from "./Closing.jsx";

export default function LandingExperience() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.3 });

  return (
    <div
      className="lz-root lz-body min-h-screen w-full overflow-x-hidden antialiased"
      style={{ background: C.paper, color: C.ink }}
    >
      <GlobalStyles />
      <Cursor />

      {/* scroll progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left"
        style={{
          scaleX: progress,
          background: `linear-gradient(to right, ${C.oxide}, ${C.amber}, ${C.emerald}, ${C.teal})`,
        }}
      />

      <Nav />
      <Hero />
      <ProblemSection />
      <SystemSection />
      <GuaranteesSection />
      <AISection />
      <PlatformSection />
      <PricingSection />
      <ResourcesSection />
      <CTASection />
      <Footer />
    </div>
  );
}
