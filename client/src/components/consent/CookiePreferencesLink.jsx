import { openCookiePreferences } from "./CookiePreferences";

// M59 / ADS-005 — the footer entry point.
//
// A <button>, not a <Link>: it opens a dialog rather than navigating, and
// making it look like a link while behaving like a control is exactly the
// mismatch that breaks keyboard and screen-reader users.
//
// `className` is passed through with no defaults of its own, because every
// public footer in this codebase is styled independently (some with tokens,
// some with inline hex from the marketing palette). Inheriting the sibling
// Privacy/Terms link's classes at each call site keeps it visually native to
// whichever footer it sits in, instead of importing one footer's styling into
// all of them.

export default function CookiePreferencesLink({
  className,
  children = "Cookie preferences",
  ...rest
}) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className={className}
      data-testid="cookie-preferences-link"
      // Remaining props are forwarded — several footers carry their colour as
      // an inline `style` rather than a class (the marketing palette is hex,
      // not tokens). Destructuring only className would drop those silently and
      // the link would render in the wrong colour with nothing to indicate why.
      {...rest}
    >
      {children}
    </button>
  );
}
