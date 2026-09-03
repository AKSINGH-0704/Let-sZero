import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, AlertCircle } from "lucide-react";
import CookiePreferencesLink from "@/components/consent/CookiePreferencesLink";

export default function NotFound() {
  return (
    // M59 / CONSENT-002 — the 404 is a public surface reachable from any URL,
    // including a mistyped or expired ad landing page, and it rendered no
    // footer at all. The ADS-005 guard proves every footer CARRIES the
    // withdrawal control; it cannot see a page that has no footer to inspect,
    // so this gap was invisible to it. A visitor who had already decided and
    // landed here had no in-page route back to that decision.
    //
    // The card itself is unchanged. This adds only the column wrapper needed to
    // hold a footer at the bottom — `flex-1` on the centring row preserves the
    // vertical centring the page already had rather than pushing the card up.
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="max-w-md w-full border-card-border">
          <CardContent className="pt-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-4xl font-bold mb-2">404</h1>
            <p className="text-xl font-medium mb-2">Page Not Found</p>
            <p className="text-muted-foreground mb-6">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <Link href="/">
              <Button className="gap-2" data-testid="button-go-home">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Deliberately the smallest thing that closes the gap: the existing
          CookiePreferencesLink beside the two policies that already exist, in
          the same token-styled idiom and with the same 24px minimum hit target
          the Resource Center footer established (M31-D). No new component and
          no shared footer abstraction — every public footer in this codebase is
          styled independently, and inlining it here keeps this page inside the
          existing tree-walk guard instead of hiding it behind an indirection
          the guard cannot follow. */}
      <footer className="border-t border-border">
        <nav
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 px-4 py-6 text-sm text-muted-foreground"
          aria-label="Footer"
        >
          {[
            { href: "/", label: "Home" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-[24px] items-center rounded py-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.label}
            </Link>
          ))}
          <CookiePreferencesLink className="inline-flex min-h-[24px] items-center rounded py-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring" />
        </nav>
      </footer>
    </div>
  );
}
