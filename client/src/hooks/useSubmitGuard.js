import { useCallback, useRef, useState } from "react";

/**
 * M35-C — a synchronous in-flight guard for form submission.
 *
 * Every public form was double-submittable. Measured: three clicks on the
 * submit button produced three POSTs on both /contact and /early-access.
 *
 * The interesting case is /early-access, which already had a guard:
 *
 *   if (status === "loading" || status === "success") return;
 *
 * That reads React state, and state does not update within the tick that
 * dispatched the event. Three clicks delivered before the next render all read
 * `status === "idle"` and all proceeded. A disabled button does not help
 * either: it is disabled by the same not-yet-applied render, and it never
 * prevented Enter-key submission in the first place.
 *
 * The guard therefore has to be a ref, which mutates immediately, with state
 * kept alongside only so the UI can show a pending affordance. This is the
 * reason the two cannot be collapsed into one value.
 *
 * Usage:
 *   const [handleSubmit, isSubmitting] = useSubmitGuard(async (e) => {
 *     e.preventDefault();          // still synchronous, before any await
 *     await doTheThing();
 *   });
 *
 * The returned callback is stable, so passing it to onSubmit does not
 * invalidate memoised children, and the latest handler is always invoked even
 * though the identity never changes.
 */
export function useSubmitGuard(handler) {
  const inFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep the newest handler without changing `run`'s identity.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const run = useCallback(async (...args) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setIsSubmitting(true);
    try {
      return await handlerRef.current(...args);
    } finally {
      // Released even when the handler throws or returns early, so a validation
      // failure never leaves the form permanently wedged.
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return [run, isSubmitting];
}
