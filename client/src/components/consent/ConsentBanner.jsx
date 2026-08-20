import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CATEGORIES,
  setConsent,
  rejectAll,
  needsConsentDecision,
} from "@/lib/consent";

// M59 — the consent surface.
//
// The only place a visitor is asked, and the only writer of consent state
// outside the authority module itself. It renders for one reason: the visitor
// has not yet answered.
//
// ⚠️ The consent read happens in an effect, never during render, and `visible`
// starts false. That combination is load-bearing rather than stylistic.
// script/prerender.js runs these components through renderToString under Node,
// where there is no window: reading localStorage during render would throw, and
// prerender treats a per-route failure as non-fatal, so the route would quietly
// fall back to a plain SPA shell and lose its static HTML. Starting hidden also
// keeps the banner out of that HTML, which would otherwise show it to visitors
// who had already answered until hydration removed it. Prerender output is
// byte-identical to before M59.
//
// Deliberately NOT a modal: it does not trap focus and does not block the page.
// A visitor must be able to read the privacy policy in order to decide, which a
// focus trap over the whole document would prevent.

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(needsConsentDecision());
  }, []);

  if (!visible) return null;

  const decide = (decision) => {
    decision();
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Asks about advertising and nothing else, because advertising
            measurement is the only purpose this platform performs. An earlier
            draft said "advertising and analytics cookies" while no analytics
            consumer existed (ADS-004) — soliciting consent for something that
            never happens, and disagreeing with both the implementation and the
            proposed policy wording. That is the M53 CDP-1 shape: two surfaces
            describing one thing under different conditions. */}
        <p className="min-w-0 text-sm text-muted-foreground">
          We use cookies that are necessary to run this site. With your
          permission we would also use Google Ads advertising cookies to measure
          which advertising brings people here.{" "}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Privacy Policy
          </Link>
        </p>

        {/* Reject is listed first in the DOM so it is reachable in the same
            number of keystrokes as Accept. The two are equally weighted
            visually — a refusal that is harder to give than a grant is not a
            free choice. Accept carries the primary variant only because one
            primary action per view is the design-system rule, not because it
            is the preferred answer. */}
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide(rejectAll)}
            data-testid="consent-reject"
          >
            Reject
          </Button>
          <Button
            size="sm"
            // Grants exactly what the copy above asked about. setConsent
            // coerces every unlisted category to false, so analytics cannot be
            // granted by a question that was never posed.
            onClick={() => decide(() => setConsent({ [CONSENT_CATEGORIES.ADVERTISING]: true }))}
            data-testid="consent-accept"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
