// M21-C, rebuilt M23-B — an Academy card with its own visual identity
// (icon + accent from academyTheme) instead of the old identical
// indigo-on-white treatment. Academies with no content yet render as a
// deliberate, non-interactive "Coming soon" card rather than a live link to
// an empty page (the "empty Academies look dead" finding) — honest about
// what's launched without four dead-feeling links.
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { academyTheme, academyAccentStyle } from "./academyTheme";

export default function AcademyCard({ academy, href, articleCount }) {
  const { Icon } = academyTheme(academy.slug);
  const hasContent = typeof articleCount === "number" ? articleCount > 0 : true;
  const accentStyle = academyAccentStyle(academy.slug);

  const inner = (
    <Card
      className={
        hasContent
          ? "group h-full border-border transition-all hover:-translate-y-0.5 hover:border-[color:var(--academy-accent)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
          : "h-full border-dashed border-border/70 bg-muted/30"
      }
      style={accentStyle}
    >
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-center justify-between">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--academy-accent)]/10 text-[color:var(--academy-accent)]"
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
          {hasContent ? (
            <span className="text-xs font-medium text-muted-foreground">
              {articleCount} guide{articleCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>
        <h3 className="mb-1 text-base font-semibold tracking-tight">{academy.name}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{academy.tagline}</p>
        {hasContent && (
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[color:var(--academy-accent)]">
            Explore
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (!hasContent) {
    return (
      <div data-testid={`card-academy-${academy.slug}`} aria-label={`${academy.name} — coming soon`}>
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} data-testid={`link-academy-${academy.slug}`} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {inner}
    </Link>
  );
}
