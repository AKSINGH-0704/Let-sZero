// M23-B — the per-Academy visual identity registry: one lucide icon + one
// accent hue per Academy, the single highest-leverage move against the
// "every card looks identical" monotony finding. Data, not styling — the
// accent values themselves are tokens defined in index.css (--rc-*), so
// components never carry inline hex (ADR-012); they read the token through
// the CSS custom property this registry points at.
//
// Keyed by the real taxonomy slugs (shared/content/taxonomy.js). A future
// Academy adds one entry here + one --rc-* token pair, nothing else.
import {
  ShieldCheck,
  PenLine,
  Send,
  Server,
  Target,
  Scale,
  LayoutTemplate,
  GraduationCap,
  Globe,
  BookOpen,
} from "lucide-react";

const REGISTRY = {
  "deliverability": { Icon: ShieldCheck, token: "--rc-deliverability" },
  "cold-email": { Icon: PenLine, token: "--rc-cold-email" },
  "outreach": { Icon: Send, token: "--rc-outreach" },
  "infrastructure": { Icon: Server, token: "--rc-infrastructure" },
  "email-platform": { Icon: Globe, token: "--rc-email-platform" },
  "lead-generation": { Icon: Target, token: "--rc-lead-generation" },
  "compliance": { Icon: Scale, token: "--rc-compliance" },
  "glossary": { Icon: BookOpen, token: "--rc-glossary" },
  "templates": { Icon: LayoutTemplate, token: "--rc-templates" },
};

const FALLBACK = { Icon: GraduationCap, token: "--primary" };

export function academyTheme(slug) {
  const entry = REGISTRY[slug] ?? FALLBACK;
  return {
    Icon: entry.Icon,
    // The colour string every consumer uses. Resolves to the token, which
    // is redefined per theme in index.css — so light/dark are handled for
    // free without the component knowing which theme it's in.
    accent: `hsl(var(${entry.token}))`,
  };
}

// Convenience: the inline style object that publishes the Academy accent as
// a --academy-accent custom property, so descendants can theme via
// Tailwind arbitrary values like text-[color:var(--academy-accent)] without
// dynamic class names (which Tailwind's purge can't see).
export function academyAccentStyle(slug) {
  return { "--academy-accent": academyTheme(slug).accent };
}
