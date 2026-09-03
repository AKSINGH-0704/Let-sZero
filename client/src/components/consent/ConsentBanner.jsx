import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { openCookiePreferences } from "./CookiePreferences";
import {
  CONSENT_CATEGORIES,
  setConsent,
  rejectAll,
  needsConsentDecision,
  onConsentChange,
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
// who had already answered until hydration removed it.
//
// Deliberately NOT a modal: it does not trap focus and does not block the page.
// A visitor must be able to read the privacy policy in order to decide, which a
// focus trap over the whole document would prevent.
//
// ─── Why this subscribes to the authority (CONSENT-001) ──────────────────────
//
// The first version read consent ONCE, in a mount-only effect, and never again.
// Measured against production: a visitor who opened Cookie preferences from the
// footer and granted advertising there had their decision stored — and the
// banner stayed on screen, still asking. Clicking its "Reject" then silently
// overwrote the grant they had just made. The mirror case is the damaging one:
// a visitor who REFUSES in the dialog could then be granted advertising storage
// by the stale "Accept" sitting behind it.
//
// So the banner now derives its visibility from the same authority every other
// surface writes to. That closes the footer-dialog case and the cross-tab case
// with one subscription, because `onConsentChange` is notified by both.

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(needsConsentDecision());
    sync();
    return onConsentChange(sync);
  }, []);

  if (!visible) return null;

  // Dismiss locally as well as through the subscription. `sync` re-reads
  // storage, and a visitor who blocks storage has no record to read — so on
  // that path `sync` would put the banner straight back and re-ask on the same
  // page view. The explicit hide runs after `apply()` and therefore wins, which
  // is the behaviour setConsent already documents: the decision governs THIS
  // page view whether or not it survives to the next one.
  const decide = (apply) => {
    apply();
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-labelledby="consent-banner-heading"
      data-testid="consent-banner"
      // max-h/overflow is a bound, not a layout: on a short viewport the notice
      // must never grow until it swallows the page it is asking about. It does
      // not engage at any tested size.
      className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto border-t border-border bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5 sm:py-3.5"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0 space-y-1.5">
          {/* A heading, not just an aria-label. The bottom bar previously
              carried no heading at any breakpoint, so it read as boilerplate
              and gave assistive technology nothing to announce beyond body
              copy. The region is now named by the text the visitor can see. */}
          <h2
            id="consent-banner-heading"
            className="text-base font-semibold text-foreground"
          >
            Cookies on LetsZero
          </h2>

          {/* Two sentences, because there are two different things and running
              them together is what made the old copy hard to act on: what is
              always on, then what is genuinely optional.

              Asks about advertising and nothing else, because advertising
              measurement is the only purpose this platform performs. An earlier
              draft said "advertising and analytics cookies" while no analytics
              consumer existed (ADS-004) — soliciting consent for something that
              never happens, and disagreeing with both the implementation and
              the policy wording. That is the M53 CDP-1 shape: two surfaces
              describing one thing under different conditions.

              The outcome clause is an accuracy fix in the same family. The old
              copy said only that we measure which advertising brings people
              here — a visit — while the implementation has always transmitted
              sign_up and purchase conversions, which the published policy
              already discloses ("which conversion occurred — a sign-up or a
              purchase"). The first layer was the least complete description of
              the three. Naming the outcomes does not widen the purpose, grant a
              further signal, or change what is sent, so CONSENT_VERSION is not
              bumped and existing decisions stand. */}
          <p className="min-w-0 text-sm leading-snug text-muted-foreground">
            Essential cookies keep LetsZero secure and working. Always on.
          </p>
          <p className="min-w-0 text-sm leading-snug text-muted-foreground">
            With your permission, Google Ads cookies let us see which advertising
            brings people to LetsZero, and whether it leads to sign-ups and
            purchases.
          </p>
        </div>

        {/* The action row: the two "tell me more" routes, then the decision.

            Settings and the policy sit together and read as one row rather than
            competing with the decision buttons. Keeping settings out of the
            button group is also what keeps this bar short: three stacked
            full-width buttons made it 424px tall at 320px — over half the
            viewport on a small phone, which would have turned a deliberately
            non-blocking notice into an effective blocker.

            The links live in this row rather than under the copy, which is what
            recovered the short-viewport case. Measured at 667×375 the links and
            the button pair fit on ONE line, so a row that previously cost a
            whole line of height now costs none: 225px (60% of that viewport)
            became 158px. Below `sm` the group wraps and the links simply sit
            above the buttons, as before.

            Reject is listed first in the DOM so it is reachable in the same
            number of keystrokes as Accept. The two decisions are equally
            weighted visually — a refusal that is harder to give than a grant is
            not a free choice. Accept carries the primary variant only because
            one primary action per view is the design-system rule, not because
            it is the preferred answer.

            A two-column grid below `sm`, so the pair stays side by side and
            visibly equal, then intrinsic widths from `sm` up. Measured on
            production, the old row put two 61px-wide, 32px-tall targets in a
            320px viewport and left most of the width unused; these are the
            controls the entire surface exists for. `px-3` rather than the
            button default `px-4`: at 320px the extra 8px of gutter per side was
            the difference between a two-line and a three-line label, which cost
            22px of a notice that had none to spare. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:shrink-0 lg:justify-end">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <button
              type="button"
              onClick={openCookiePreferences}
              data-testid="consent-settings"
              className="inline-flex min-h-[24px] items-center rounded font-medium text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Cookie settings
            </button>
            <Link
              href="/privacy"
              className="inline-flex min-h-[24px] items-center rounded font-medium text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Privacy Policy
            </Link>
          </p>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              variant="outline"
              className="h-auto w-full whitespace-normal px-3 py-2 sm:w-auto"
              onClick={() => decide(rejectAll)}
              data-testid="consent-reject"
            >
              Reject optional cookies
            </Button>
            <Button
              className="h-auto w-full whitespace-normal px-3 py-2 sm:w-auto"
              // Grants exactly what the copy above asked about. setConsent
              // coerces every unlisted category to false, so analytics cannot be
              // granted by a question that was never posed.
              onClick={() => decide(() => setConsent({ [CONSENT_CATEGORIES.ADVERTISING]: true }))}
              data-testid="consent-accept"
            >
              Allow advertising cookies
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
