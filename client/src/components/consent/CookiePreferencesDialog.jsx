import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CATEGORIES,
  getConsent,
  setConsent,
  onConsentChange,
} from "@/lib/consent";

// M59 / ADS-005 — the preferences UI itself.
//
// Split from CookiePreferences.jsx so it can be code-split. Mounting it eagerly
// pulled Radix Dialog and Switch into the ENTRY bundle, where every visitor paid
// for them — including all 71 prerendered Resource Center articles, which have
// no dialog at all. That measurably undid part of the entry-chunk reduction
// PERF-004/PERF-006 achieved. Only a visitor who actually opens preferences
// should download this.
//
// The original note still applies:
//
// Before this, the consent notice appeared once and there was no way back: the
// banner renders only while `needsConsentDecision()` is true, so once answered
// the only route was clearing browser storage. Granting took one click;
// withdrawing took developer tools.
//
// This is NOT a second consent mechanism. It reads and writes the same
// `lib/consent` authority the banner uses, so there is exactly one stored
// decision and one set of Consent Mode signals. Withdrawal flows through the
// same `setConsent` → `onConsentChange` → `applyConsent` path a first-time
// refusal does, which is what makes it impossible for the two surfaces to
// disagree.
//
// Mounted once, globally (App.jsx), and opened by a DOM event rather than by
// props. That means any surface — including the marketing sub-project, which
// has its own module tree — can open it with no import and no shared state.

export default function CookiePreferencesDialog({ open, onOpenChange }) {
  const [advertising, setAdvertising] = useState(false);

  // Consent is read when this mounts or re-opens, never during the initial
  // render pass of the app — the same prerender constraint the banner observes.
  useEffect(() => {
    if (open) setAdvertising(getConsent()[CONSENT_CATEGORIES.ADVERTISING] === true);
  }, [open]);

  // If the banner resolves a decision while this dialog is open, reflect it
  // rather than letting the two surfaces show different states.
  useEffect(() => {
    return onConsentChange((next) => {
      setAdvertising(next[CONSENT_CATEGORIES.ADVERTISING] === true);
    });
  }, []);

  // Applied immediately, with no separate save step. Withdrawal must be as easy
  // as the single click that granted it; a confirm-then-save flow would make
  // taking consent back harder than giving it.
  const handleChange = (next) => {
    setAdvertising(next);
    setConsent({ [CONSENT_CATEGORIES.ADVERTISING]: next === true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="cookie-preferences">
        <DialogHeader>
          <DialogTitle>Cookie preferences</DialogTitle>
          {/* Plain text only. M58: interactive content inside a Radix
              description is announced as the dialog's description on open, and
              wrapping a component with `asChild` silently drops the id that
              `aria-describedby` points at. */}
          <DialogDescription>
            Change what you allow at any time. Your choice applies from the
            moment you make it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Shown, but deliberately not a control. Offering to "refuse" the
              sign-in cookie would be a false choice — refusing it just breaks
              signing in, and it is never used for measurement. */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Necessary</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Keeps you signed in and keeps the site working. These cannot be
                turned off, and are never used for advertising.
              </p>
            </div>
            <span className="shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Always on
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 border-t border-border pt-5">
            <div className="min-w-0">
              <Label htmlFor="consent-advertising" className="text-sm font-medium">
                Google Ads advertising
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Lets us measure which advertising brings people here. We never
                send Google your email address, name, or account details.
              </p>
            </div>
            <Switch
              id="consent-advertising"
              checked={advertising}
              onCheckedChange={handleChange}
              data-testid="consent-advertising-toggle"
              aria-describedby="consent-advertising-state"
            />
          </div>

          {/* aria-live so a screen-reader user hears the result of the toggle,
              which is otherwise silent — the dialog does not close on change. */}
          <p
            id="consent-advertising-state"
            aria-live="polite"
            className="text-sm text-muted-foreground"
            data-testid="consent-advertising-state"
          >
            {/* Every clause here is restricted to what this application does,
                because that is the only thing it can evidence.
                  - "We will not send Google any further conversion data" is
                    verifiable: fireConversion re-reads consent on every call.
                    An earlier draft said "Google receives no further
                    measurement", which is a claim about what a already-loaded
                    gtag.js transmits after a denied consent update — something
                    we never observed, having blocked Google throughout
                    verification, and which Consent Mode does not guarantee.
                  - "the advertising cookies we can access" is bounded on
                    purpose: the sweep expires the first-party _gcl_ and _gac_
                    cookies at path=/ only, cannot reach cookies on Google's
                    own domains, and cannot see HttpOnly cookies.
                    (Written without a wildcard on purpose: a literal asterisk
                    followed by a slash would close this comment early and the
                    file would not compile.)
                Claiming more would be the same overstatement as telling
                customers Google uses their data "solely" for measurement. */}
            {advertising
              ? "Advertising cookies are allowed."
              : "Advertising cookies are turned off. We will not send Google any further conversion data from this browser, and we have cleared the advertising cookies we can access on this site."}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)} data-testid="cookie-preferences-done">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
