// M23-C — the reusable educational component library. Each is driven by an
// optional schema field (shared/content/schema.js) and rendered by
// ArticleTemplate in a designed position — never as raw markdown. All degrade
// to nothing when their data is absent, so an article that omits a field
// renders exactly as before. Introduced per the M23 mandate to enrich
// articles "only where they genuinely improve the learning experience."
import { Link } from "wouter";
import {
  Lightbulb,
  Info,
  AlertTriangle,
  ListChecks,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

// --- Callout (note / tip / warning) — for inline emphasis and Common mistakes.
const CALLOUT = {
  note: { Icon: Info, cls: "border-info/30 bg-info/5", icon: "text-info" },
  tip: { Icon: Lightbulb, cls: "border-success/30 bg-success/5", icon: "text-success" },
  warning: { Icon: AlertTriangle, cls: "border-warning/40 bg-warning/5", icon: "text-warning" },
};

export function Callout({ variant = "note", title, children, testId }) {
  const c = CALLOUT[variant] ?? CALLOUT.note;
  const Icon = c.Icon;
  return (
    <div className={`my-6 rounded-xl border ${c.cls} p-4`} data-testid={testId}>
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.icon}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {title && <p className="mb-1 font-semibold">{title}</p>}
          <div className="text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline">{children}</div>
        </div>
      </div>
    </div>
  );
}

// --- Key takeaways — a scannable summary near the top of the article.
export function KeyTakeaways({ items }) {
  if (!items?.length) return null;
  return (
    <aside className="my-8 rounded-xl border border-border bg-muted/40 p-5" data-testid="article-key-takeaways" aria-label="Key takeaways">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Key takeaways</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// --- Prerequisites — "Before you start", each optionally an internal link.
export function Prerequisites({ items, testId = "article-prerequisites" }) {
  if (!items?.length) return null;
  return (
    <div className="my-6 rounded-xl border border-border p-4" data-testid={testId}>
      <div className="mb-2 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold">Before you start</p>
      </div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            {item.href ? (
              <Link href={item.href} className="text-primary hover:underline" data-testid={`link-prereq-${i}`}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Common mistakes — a warning-styled Callout with a list.
export function CommonMistakes({ items }) {
  if (!items?.length) return null;
  return (
    <Callout variant="warning" title="Common mistakes to avoid" testId="article-common-mistakes">
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warning" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Callout>
  );
}

// --- FAQ — accessible native <details> accordion (no JS, keyboard-friendly),
// mirrored by FAQPage JSON-LD on the page.
export function ArticleFaq({ faqs }) {
  if (!faqs?.length) return null;
  return (
    <section className="mt-12" data-testid="article-faq" aria-label="Frequently asked questions">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="divide-y divide-border rounded-xl border border-border">
        {faqs.map((faq, i) => (
          <details key={i} className="group px-4 py-3" data-testid={`faq-${i}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {faq.question}
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// --- Continue learning — the premium next-step card (replaces the old
// in-body "## Next step" markdown). Uses the article's Academy accent so it
// reads as a deliberate, branded hand-off rather than a plain link.
export function ContinueLearning({ nextStep, accentStyle }) {
  if (!nextStep) return null;
  return (
    <Link
      href={nextStep.href}
      data-testid="article-continue-learning"
      className="group mt-12 block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={accentStyle}
    >
      <div className="rounded-2xl border border-[color:var(--academy-accent,hsl(var(--primary)))]/30 bg-[color:var(--academy-accent,hsl(var(--primary)))]/5 p-6 transition-colors hover:bg-[color:var(--academy-accent,hsl(var(--primary)))]/10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--academy-accent,hsl(var(--primary)))]">
          Continue learning
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight">{nextStep.label}</h3>
            {nextStep.description && (
              <p className="mt-1 text-sm text-muted-foreground">{nextStep.description}</p>
            )}
          </div>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--academy-accent,hsl(var(--primary)))] text-white transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          >
            <ArrowRight className="h-5 w-5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// M28 — Previous/Next navigation for an article being read as part of a
// learning path. Derived from the path's own step order (see
// shared/content/ordering.js findPathNavigation), never hand-maintained on the
// article: reordering a path updates every member's navigation automatically.
//
// Renders nothing for the 40 of 60 articles that belong to no path, so a
// standalone reference page is not given a fake sequence to sit in.
export function PathNavigation({ navigation, product }) {
  if (!navigation) return null;
  const { path, position, total, previous, next } = navigation;
  if (!previous && !next) return null;

  const href = (article) => `${product.basePath}/${article.academy.slug}/${article.slug}`;

  return (
    <nav
      className="mt-12 border-t border-border pt-6"
      aria-label={`${path.name} navigation`}
      data-testid="article-path-navigation"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Part of</span>
        <Link
          href={`${product.basePath}/paths/${path.slug}`}
          className="font-medium text-foreground hover:text-primary"
          data-testid="link-path-nav-parent"
        >
          {path.name}
        </Link>
        <span aria-hidden="true" className="opacity-40">·</span>
        <span data-testid="text-path-position">
          Step {position} of {total}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {previous ? (
          <Link
            href={href(previous)}
            data-testid="link-path-previous"
            className="group flex flex-col rounded-xl border border-border bg-card p-4 outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Previous
            </span>
            <span className="text-sm font-semibold leading-snug group-hover:text-primary">{previous.title}</span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {next && (
          <Link
            href={href(next)}
            data-testid="link-path-next"
            className="group flex flex-col rounded-xl border border-border bg-card p-4 text-right outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring sm:items-end"
          >
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Next
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold leading-snug group-hover:text-primary">{next.title}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
