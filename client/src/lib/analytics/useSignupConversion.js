import { useEffect } from "react";
import { trackSignUp } from "./conversions";
import { getAttribution } from "./attribution";

// M59 — attribute a sign-up conversion to an account that actually exists.
//
// The `signup` nonce is put on the OAuth redirect by the server, on the single
// branch that just created a user (routes.js, Google callback). Its presence is
// therefore proof of registration, not of intent: clicking "Continue with
// Google", abandoning the Google consent screen, or signing in as an existing
// member never produces it.
//
// The parameter is stripped from the URL as soon as it is read. That is the
// primary duplicate guard, and it is what makes refresh and back/forward safe —
// after the first render there is no nonce left in the address bar to re-read,
// so a restored history entry has nothing to fire on. The durable key inside
// trackSignUp is the second guard, covering a double-invoked effect (React
// StrictMode) within the same page load, where the strip has not yet been
// observed by the second invocation.
//
// replaceState rather than pushState: the pre-strip URL must not become a
// history entry the customer can navigate back to.
//
// M60 — the same proven moment also associates the click that acquired this
// account. It is done HERE and nowhere else for exactly the reason the nonce
// exists: this is the one point in the application where "an account was just
// created" is a fact the server has already committed, rather than something
// inferred from a page the customer happens to be on. Associating attribution
// on any authenticated page would overwrite the acquiring campaign every time a
// returning customer clicked a later ad.

export function useSignupConversion() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const nonce = url.searchParams.get("signup");
    if (!nonce) return;

    url.searchParams.delete("signup");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );

    trackSignUp(nonce);

    // Attribution is reporting, not function. It is deliberately not awaited
    // and its failure is swallowed: a customer who has just created an account
    // must never see an error, or wait, because a diagnostic row could not be
    // written. Returns without a request when the visitor never granted
    // advertising consent, since nothing was ever captured to send.
    const attribution = getAttribution();
    if (attribution) {
      fetch("/api/attribution/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attribution }),
      }).catch(() => {});
    }
  }, []);
}
