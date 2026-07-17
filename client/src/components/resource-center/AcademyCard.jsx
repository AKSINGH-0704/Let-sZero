// M21-C, rebuilt M23-B, completed M28 — an Academy card with its own visual
// identity (icon + accent from academyTheme).
//
// M28 removed the "Coming soon" branch outright. An Academy with no content is
// now filtered out upstream and never reaches this component, so there is no
// placeholder state left to render: the card is always a live link to a real,
// populated Academy. Keeping a dead branch here would have left the placeholder
// one caller mistake away from production, which is the thing M28 set out to
// remove.
//
// The card now carries real scent instead of a tagline alone: how much is in
// there, what it covers, and the specific guide you would land on.
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { academyTheme, academyAccentStyle } from "./academyTheme";
import { academyCountNoun } from "@shared/content/ordering.js";

export default function AcademyCard({ academy, href, articleCount, latestArticle }) {
  const { Icon } = academyTheme(academy.slug);
  const accentStyle = academyAccentStyle(academy.slug);

  return (
    <Link
      href={href}
      data-testid={`link-academy-${academy.slug}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card
        className="h-full border-border transition-all hover:-translate-y-0.5 hover:border-[color:var(--academy-accent)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
        style={accentStyle}
      >
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--academy-accent)]/10 text-[color:var(--academy-accent)]"
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
            <span
              className="rounded-full bg-[color:var(--academy-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--academy-accent)]"
              data-testid={`text-academy-count-${academy.slug}`}
            >
              {academyCountNoun(academy.slug, articleCount)}
            </span>
          </div>

          <h3 className="mb-1 text-base font-semibold tracking-tight">{academy.name}</h3>
          <p className="mb-3 text-sm text-muted-foreground">{academy.description ?? academy.tagline}</p>

          {latestArticle && (
            <p className="mb-4 truncate text-xs text-muted-foreground" data-testid={`text-academy-latest-${academy.slug}`}>
              <span className="font-medium text-foreground/70">Latest:</span> {latestArticle.title}
            </p>
          )}

          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[color:var(--academy-accent)]">
            Start learning
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
