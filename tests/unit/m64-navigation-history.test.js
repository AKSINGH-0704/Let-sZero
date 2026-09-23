// M64 — browser history and auth-restore correctness.
//
// Two defects, both reproduced in a real browser against the built app before
// these guards existed.
//
// 1. GUARD REDIRECTS PUSHED. wouter's navigate() defaults to pushState and
//    <Redirect> forwards its props straight through as navigate options, so a
//    bounce left the route the visitor was thrown out of sitting in history
//    with the destination appended after it. Measured:
//
//      logged out, open /app/dashboard
//        before: entries ["about:blank","/app/dashboard","/login"]; Back
//                returned to /app/dashboard, the guard fired again, and the
//                visitor landed on /login. Two Back presses, both absorbed.
//        after : entries ["about:blank","/login"]; Back leaves the app.
//
//      / -> /app/dashboard bounce
//        before: one action grew history by 2; Back and Back again both stayed
//                on /login, so "/" was unreachable.
//        after : grew by 1; Back returned to "/".
//
//    Ordinary navigation is unchanged and still pushes: / -> /login -> Back
//    returned to "/" both before and after.
//
// 2. A BFCACHE RESTORE NEVER RE-CHECKED THE SESSION. Navigating off-origin and
//    pressing Back restored the document with pageshow.persisted === true and
//    no remount. /api/auth/me is held at staleTime: Infinity, so with the
//    session revoked in between the authenticated shell kept rendering and kept
//    navigating between /app/* routes. The server stayed authoritative (every
//    protected call answered 401, nothing leaked), but the UI was stale.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../client/src");

/** Every .jsx under client/src. */
function sources(dir = SRC, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sources(p, out);
    else if (e.name.endsWith(".jsx")) out.push(p);
  }
  return out;
}

/**
 * Source with comments blanked out, newlines preserved so line numbers still
 * line up. The rule below is about redirects the app RENDERS; prose describing
 * one — including the block comment above ProtectedRoute explaining this very
 * fix — is not a redirect and must not be scanned as one.
 */
function code(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
}

describe("M64 — a guard redirect must not leave a history entry behind", () => {
  it("finds the redirects it is meant to be guarding", () => {
    const all = sources().flatMap((f) =>
      [...code(f).matchAll(/<Redirect\b[^>]*>/g)].map((m) => ({ f, tag: m[0] })),
    );
    // ProtectedRoute x2, "/", /login, /forgot-password, /reset-password,
    // the /app/* catch-all, Login's own guard and Onboarding x2.
    expect(all.length, "no <Redirect> found — the scan is broken").toBeGreaterThanOrEqual(10);
  });

  it("gives every <Redirect> an explicit replace", () => {
    const offenders = [];
    for (const f of sources()) {
      const src = code(f);
      for (const m of src.matchAll(/<Redirect\b[^>]*>/g)) {
        if (!/\breplace\b/.test(m[0])) {
          const line = src.slice(0, m.index).split("\n").length;
          offenders.push(`${path.relative(SRC, f)}:${line} ${m[0].replace(/\s+/g, " ")}`);
        }
      }
    }
    expect(
      offenders,
      "a guard redirect still pushes — Back will return to the route the visitor was bounced off and bounce again",
    ).toEqual([]);
  });

  it("leaves user-initiated navigation alone", () => {
    // The fix is deliberately scoped to <Redirect>. A bare navigate()/
    // setLocation() is the visitor choosing to go somewhere, which is a real
    // step in their journey and must keep pushing. If these ever acquire a
    // blanket `replace`, Back stops working for ordinary in-app navigation.
    const navbar = fs.readFileSync(path.join(SRC, "components/layout/Navbar.jsx"), "utf8");
    expect(navbar).toMatch(/navigate\("\/"\)/);
    expect(navbar, "logout navigation should not have been switched to replace").not.toMatch(
      /navigate\("\/",\s*\{\s*replace/,
    );
  });
});

describe("M64 — a restored document reconciles with the real session", () => {
  const auth = () => fs.readFileSync(path.join(SRC, "context/AuthContext.jsx"), "utf8");

  it("re-checks auth when the page comes back from the bfcache", () => {
    const src = auth();
    expect(src, "nothing listens for pageshow, so a bfcache restore keeps the frozen auth state").toMatch(
      /addEventListener\(\s*["']pageshow["']/,
    );
    // Only a genuine bfcache restore should pay for a refetch; an ordinary load
    // fires pageshow too, with persisted === false, and the query is already
    // being fetched there. Asserting on the CONDITION, not merely on the word
    // appearing somewhere: a check for /\.persisted/ alone stayed green when
    // the guard was mutated to `if (true)`, which would refetch auth on every
    // single page load.
    expect(src, "the refetch must be gated on a persisted restore, not run on every load").toMatch(
      /if\s*\(\s*event\.persisted\s*\)/,
    );
    expect(src, "the restore must invalidate the auth query").toMatch(
      /invalidateQueries\(\s*\{\s*queryKey:\s*\["\/api\/auth\/me"\]/,
    );
  });

  it("removes the listener again", () => {
    expect(auth(), "the pageshow listener is never removed").toMatch(
      /removeEventListener\(\s*["']pageshow["']/,
    );
  });

  it("keeps the deliberate staleTime: Infinity on the auth query", () => {
    // The invalidate-on-restore hook exists precisely BECAUSE the query is
    // never stale. If someone "fixes" staleTime instead, this pairing needs
    // rethinking rather than silently drifting.
    expect(auth()).toMatch(/queryKey:\s*\["\/api\/auth\/me"\][\s\S]{0,300}staleTime:\s*Infinity/);
  });

  it("still clears the cache before planting the logged-out value", () => {
    // M39's post-deploy ordering fix. Re-asserted here because M64 touches this
    // file and the order is load-bearing: clear() after setQueryData would wipe
    // the null it just planted.
    const src = auth();
    const clear = src.indexOf("queryClient.clear()");
    const plant = src.indexOf('queryClient.setQueryData(["/api/auth/me"], null)');
    expect(clear, "applyLocalLogout no longer clears").toBeGreaterThan(-1);
    expect(plant, "applyLocalLogout no longer plants null").toBeGreaterThan(-1);
    expect(clear, "clear() must come before the null is planted").toBeLessThan(plant);
  });
});
