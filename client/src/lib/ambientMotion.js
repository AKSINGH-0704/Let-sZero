/**
 * M32-A — pause ambient background animations while the page is scrolling.
 *
 * The pricing page runs 28 infinite CSS animations at once: four blurred orbs,
 * a drifting hero gradient, floating particles, pulsing beams and glows. They
 * are cheap at rest and very expensive during scroll, because the animation
 * timeline keeps invalidating style on elements the scroll is simultaneously
 * re-compositing. Two of them are expensive by construction: `heroBgDrift`
 * animates `background-position`, which cannot be composited and repaints the
 * hero section every frame, and `orbFloat1-4` animate `scale()` on elements
 * carrying `filter: blur(80-110px)`, which forces the blur to be re-rasterised
 * every frame.
 *
 * Measured on production, /pricing, 4x CPU throttle, 5 runs per variant. Pausing
 * these animations for the duration of a scroll gesture:
 *
 *            baseline (5 runs)                 paused (5 runs)         effect
 *   recalc   2.32 2.53 2.32 2.32 2.24 s        0.65 0.55 0.61 0.63 0.72 s   -73%
 *   task    12.5 13.3 12.3 13.6 13.0  s        6.46 6.77 6.48 6.20 7.40 s   -50%
 *
 * The distributions do not overlap. At idle the difference is negligible (-6%
 * style recalc), which is the point: the cost only materialises when the
 * animations compete with scrolling.
 *
 * Design is preserved exactly. The animations run normally whenever the page is
 * still, which is when anyone is actually looking at them; they freeze only
 * while the viewport is moving, where ambient drift is imperceptible anyway.
 *
 * One passive listener and one timer, chosen over per-element IntersectionObservers
 * because the whole point is to spend less work during scroll, not more.
 */

const IDLE_MS = 160; // long enough to span momentum scrolling without flicker
const ATTR = "data-scrolling";

let idleTimer = null;
let installed = false;

function markScrolling() {
  const root = document.documentElement;
  // Touch the attribute only on transitions, so a scroll does not dirty the
  // root element on every single event.
  if (!root.hasAttribute(ATTR)) root.setAttribute(ATTR, "");
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    root.removeAttribute(ATTR);
    idleTimer = null;
  }, IDLE_MS);
}

/**
 * Idempotent and SSR-safe: the prerender pipeline renders these pages in Node,
 * where there is no window, and calling this twice must not attach twice.
 */
export function installAmbientMotionPause() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;
  window.addEventListener("scroll", markScrolling, { passive: true });
}
