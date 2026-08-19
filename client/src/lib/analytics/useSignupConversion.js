import { useEffect } from "react";
import { trackSignUp } from "./conversions";

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
  }, []);
}
