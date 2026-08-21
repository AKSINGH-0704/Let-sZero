import { lazy, Suspense, useEffect, useState } from "react";

// M59 / ADS-005 — the always-mounted half of the preferences surface.
//
// This file is deliberately tiny and imports nothing heavy. It is mounted
// globally in App.jsx, so anything it pulls in lands in the ENTRY bundle that
// every visitor downloads.
//
// ⚠️ The first version of this component imported Dialog, Switch, Label and
// Button directly. Measured against a pre-change build, that folded Radix
// Dialog and Switch into the entry chunk and removed the `dialog` modulepreload
// hint from all 116 prerendered pages — meaning every Resource Center article,
// none of which contains a dialog, began paying for one. That is a direct
// regression against the entry-chunk reduction PERF-004/PERF-006 achieved.
//
// So the listener is eager and the UI is lazy: nothing of the dialog is fetched
// until a visitor actually asks for it, which is a rare, deliberate action.
// `openCookiePreferences` stays exported from here so callers keep one import
// path and never touch the lazy module directly.

const CookiePreferencesDialog = lazy(() => import("./CookiePreferencesDialog"));

export const COOKIE_PREFERENCES_EVENT = "letszero:cookie-preferences";

/** Open the dialog from anywhere, including outside the React tree. */
export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_EVENT));
}

export default function CookiePreferences() {
  // `requested` latches on the first open and never resets: once the chunk is
  // fetched there is nothing to gain by unmounting it, and keeping it mounted
  // means reopening is instant.
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setRequested(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_EVENT, handleOpen);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, handleOpen);
  }, []);

  // Renders nothing at all until asked — so prerendered HTML is unaffected and
  // the lazy chunk is never requested on a normal page view.
  if (!requested) return null;

  // fallback={null} rather than a spinner: the chunk is small and the dialog is
  // modal, so a flash of loading UI over the page would be worse than the
  // dialog simply appearing a moment later.
  return (
    <Suspense fallback={null}>
      <CookiePreferencesDialog open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
