import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

// Central brand registry.
// Add a new entry here when a new product launches â€” no logic changes needed.
const BRANDS = {
  letszero: {
    title: "LetsZero",
    favicon: "/letszero-logo.png",
    routes: ["/", "/early-access", "/contact", "/privacy", "/terms", "/learn"],
  },
  repmail: {
    title: "RepMail",
    favicon: "/favicon.png",
    routes: ["/products/repmail", "/pricing", "/login", "/forgot-password", "/reset-password/", "/repmail/", "/accept-invite", "/app/"],
  },
};

const DEFAULT_BRAND = BRANDS.letszero;

function resolveBrand(location) {
  for (const brand of Object.values(BRANDS)) {
    if (brand.routes.some((prefix) => location.startsWith(prefix) && prefix !== "/") ||
        (brand.routes.includes("/") && location === "/")) {
      return brand;
    }
  }
  return DEFAULT_BRAND;
}

function BrandingManager() {
  const [location] = useLocation();

  useEffect(() => {
    const brand = resolveBrand(location);
    document.title = brand.title;
    document
      .querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']")
      .forEach((el) => { el.href = brand.favicon; });
  }, [location]);

  return null;
}

import Landing from "@/pages/Landing";
import ResetPassword from "@/pages/ResetPassword";
import PublicPricing from "@/pages/PublicPricing";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/not-found";
import LandingExperience from "@marketing/LFP_final/LandingExperience";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

// M21-D â€” lazy-loaded, not a static top-level import like every other page
// above. gray-matter/marked (the markdown/frontmatter parsing this pulls in
// transitively via resourceCenterContent.js) add ~500KB to the bundle;
// without lazy-loading, that cost lands on every page load â€” including the
// authenticated app, since this codebase has no route-level code-splitting
// anywhere else (M21-B's audit already found this gap). Splitting these 5
// routes out keeps that cost paid only by someone who actually visits
// /learn or /repmail/learn/*.
const LetsZeroLearnDirectory = lazy(() => import("@/pages/LetsZeroLearnDirectory"));
// M32-B â€” every authenticated /app/* page and every non-prerendered public
// page is loaded on demand. Before this, a visitor landing on the marketing
// homepage downloaded the whole authenticated application: Dashboard,
// NewCampaign, History, Templates, Users, Audit, Payments, Domains and the
// rest, none of which they can even reach while logged out. The prerendered
// public routes stay eager on purpose: their HTML is already in the document,
// and suspending during hydration would replace real content with a spinner.
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const NewCampaign = lazy(() => import("@/pages/NewCampaign"));
const History = lazy(() => import("@/pages/History"));
const Templates = lazy(() => import("@/pages/Templates"));
const Users = lazy(() => import("@/pages/Users"));
const Audit = lazy(() => import("@/pages/Audit"));
const Profile = lazy(() => import("@/pages/Profile"));
const Payments = lazy(() => import("@/pages/Payments"));
const RepMailPrivacy = lazy(() => import("@/pages/RepMailPrivacy"));
const RepMailTerms = lazy(() => import("@/pages/RepMailTerms"));
const WaitlistLanding = lazy(() => import("@/pages/WaitlistLanding"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const Suppressions = lazy(() => import("@/pages/Suppressions"));
const ContactLibrary = lazy(() => import("@/pages/ContactLibrary"));
const ContactListDetail = lazy(() => import("@/pages/ContactListDetail"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetByToken = lazy(() => import("@/pages/ResetByToken"));
const Domains = lazy(() => import("@/pages/Domains"));
const DomainDetail = lazy(() => import("@/pages/DomainDetail"));
const LinkExpired = lazy(() => import("@/pages/LinkExpired"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));

const ResourceCenterHomePage = lazy(() => import("@/pages/resource-center/ResourceCenterHomePage"));
// M28 â€” the flat "all guides" index behind the homepage's View all guides CTA.
const AllGuidesPage = lazy(() => import("@/pages/resource-center/AllGuidesPage"));
const AcademyHubPage = lazy(() => import("@/pages/resource-center/AcademyHubPage"));
const ArticlePage = lazy(() => import("@/pages/resource-center/ArticlePage"));
const AuthorPage = lazy(() => import("@/pages/resource-center/AuthorPage"));
// M22-A â€” first real consumers of learningPathSchema/collectionSchema.
const LearningPathPage = lazy(() => import("@/pages/resource-center/LearningPathPage"));
const CollectionPage = lazy(() => import("@/pages/resource-center/CollectionPage"));
const RepMailChangelog = lazy(() => import("@/pages/RepMailChangelog"));

// Dev-only design-system preview. Gated on import.meta.env.DEV so Rollup drops the
// dynamic import (and its chunk) entirely from production builds.
const DesignPreview = import.meta.env.DEV ? lazy(() => import("@/pages/_DesignPreview")) : null;

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user?.role)) {
      return <Redirect to="/app/dashboard" />;
    }
  }

  return children;
}

// Preview Mode: users can access the full product before completing domain verification.
// Sending is blocked by SAS + CampaignConfirmation â€” no upstream redirect needed.
// This component is kept as a pass-through so route structure is preserved for future use.
function RequiresWorkspaceActivation({ children }) {
  return children;
}

// M32-C — routes whose rendering does not depend on auth state at all.
//
// AppRoutes used to return a full-screen LoadingScreen for every route while
// the auth query was in flight. On a prerendered public page that means the
// server sends complete, correct HTML, React hydrates, and then immediately
// replaces it with a spinner. Measured at 4x CPU throttle:
//
//   /               256ms of full-screen spinner over prerendered content
//   /pricing        358ms
//   /repmail/learn  1956ms
//
// while /api/auth/me itself answered in 26-57ms. The wait is JS parse, execute
// and chunk fetch, not the network call, and none of these pages render
// anything differently for a signed-in user. Prerendering exists precisely to
// put content on screen immediately; blocking it on an irrelevant query gave
// that benefit away.
//
// "/" is deliberately NOT in this list: it redirects signed-in visitors to the
// dashboard, so it genuinely needs auth resolved before it can decide.
const AUTH_INDEPENDENT_ROUTES = [
  /^\/repmail\/learn(\/|$)/,
  /^\/repmail\/changelog(\/|$)/,
  /^\/repmail\/(privacy|terms)(\/|$)/,
  /^\/learn(\/|$)/,
  /^\/products\//,
  /^\/pricing(\/|$)/,
  /^\/contact(\/|$)/,
  /^\/privacy(\/|$)/,
  /^\/terms(\/|$)/,
];

function AppRoutes() {
  const { isAuthenticated, isLoading, mustResetPassword } = useAuth();
  const [location] = useLocation();

  if (isLoading && !AUTH_INDEPENDENT_ROUTES.some((re) => re.test(location))) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && mustResetPassword) {
    return <ResetPassword />;
  }

  return (
    <ErrorBoundary resetKey={location}>
      <BrandingManager />
      {/* M32-B â€” one boundary covering every lazily-loaded route. Eagerly
          imported components (the prerendered public pages) never suspend, so
          they still render on the first frame and hydration is unaffected; only
          an on-demand chunk reaches this fallback. The Resource Center routes
          keep their own inner boundaries so moving between them does not
          re-trigger this full-screen loader for chunks already fetched. */}
      <Suspense fallback={<LoadingScreen />}>
      <Switch>
        {import.meta.env.DEV && DesignPreview && (
          <Route path="/_design">
            <Suspense fallback={null}><DesignPreview /></Suspense>
          </Route>
        )}

        <Route path="/">
          {() => isAuthenticated ? <Redirect to="/app/dashboard" /> : <LandingExperience />}
        </Route>

      <Route path="/early-access">
        {() => <WaitlistLanding />}
      </Route>

      <Route path="/products/repmail">
        <Landing />
      </Route>

      <Route path="/login">
        {() => isAuthenticated ? <Redirect to="/app/dashboard" /> : <Login />}
      </Route>

      <Route path="/pricing">
        {() => <PublicPricing />}
      </Route>

      <Route path="/contact">
        {() => <Contact />}
      </Route>

      <Route path="/privacy">
        {() => <Privacy />}
      </Route>

      <Route path="/terms">
        {() => <Terms />}
      </Route>

      <Route path="/repmail/privacy">
        {() => <RepMailPrivacy />}
      </Route>

      <Route path="/repmail/terms">
        {() => <RepMailTerms />}
      </Route>

      {/* M21-D/M21-I â€” Resource Center, product-parameterized: :product is
          resolved against the real PRODUCTS registry inside each page
          (useResourceCenterProduct), not hardcoded to "repmail" â€” a second
          LetsZero product (PAR Â§11's own examples â€” MessageHub,
          NotifyStream) needs a PRODUCTS entry and content, not new routes
          or new page components. Route order matters: /authors/:author
          must be declared before /:academy/:slug (both are 3 segments
          after :product â€” without this order, "authors" would be greedily
          matched as an academy slug). Each lazy-loaded component gets its
          own Suspense boundary so navigating between Resource Center pages
          doesn't re-trigger the full-screen loader for chunks already
          fetched. */}
      <Route path="/learn">
        {() => <Suspense fallback={<LoadingScreen />}><LetsZeroLearnDirectory /></Suspense>}
      </Route>

      <Route path="/:product/learn">
        {() => <Suspense fallback={<LoadingScreen />}><ResourceCenterHomePage /></Suspense>}
      </Route>

      {/* M28 â€” /guides is a literal 2-segments-after-:product path, the same
          shape as :academy below, so it must be declared first or "guides"
          would match as an Academy slug and render a 404 hub. */}
      <Route path="/:product/learn/guides">
        {() => <Suspense fallback={<LoadingScreen />}><AllGuidesPage /></Suspense>}
      </Route>

      <Route path="/:product/learn/authors/:author">
        {() => <Suspense fallback={<LoadingScreen />}><AuthorPage /></Suspense>}
      </Route>

      {/* M22-A â€” paths/:path and collections/:collection are the same
          3-segments-after-:product shape as authors/:author above, so they
          must also be declared before :academy/:slug for the same reason. */}
      <Route path="/:product/learn/paths/:path">
        {() => <Suspense fallback={<LoadingScreen />}><LearningPathPage /></Suspense>}
      </Route>

      <Route path="/:product/learn/collections/:collection">
        {() => <Suspense fallback={<LoadingScreen />}><CollectionPage /></Suspense>}
      </Route>

      <Route path="/:product/learn/:academy/:slug">
        {() => <Suspense fallback={<LoadingScreen />}><ArticlePage /></Suspense>}
      </Route>

      <Route path="/:product/learn/:academy">
        {() => <Suspense fallback={<LoadingScreen />}><AcademyHubPage /></Suspense>}
      </Route>

      {/* M21-G â€” reuses RELEASE_NOTES.md verbatim, zero new writing (PAR Â§13
          Phase 11). Real, substantive content, so â€” unlike the still-empty
          Resource Center pages above â€” this one IS prerendered/indexed
          (see script/prerender-routes.js). */}
      <Route path="/repmail/changelog">
        {() => <Suspense fallback={<LoadingScreen />}><RepMailChangelog /></Suspense>}
      </Route>

      <Route path="/accept-invite">
        {() => <AcceptInvite />}
      </Route>

      <Route path="/forgot-password">
        {() => isAuthenticated ? <Redirect to="/app/dashboard" /> : <ForgotPassword />}
      </Route>

      <Route path="/reset-password/token/:token">
        {() => isAuthenticated ? <Redirect to="/app/dashboard" /> : <ResetByToken />}
      </Route>

      <Route path="/link-expired">
        {() => <LinkExpired />}
      </Route>

      <Route path="/app/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>

      <Route path="/app/dashboard">
        <ProtectedRoute>
          <RequiresWorkspaceActivation>
            <Dashboard />
          </RequiresWorkspaceActivation>
        </ProtectedRoute>
      </Route>

      <Route path="/app/campaigns/new">
        <ProtectedRoute>
          <RequiresWorkspaceActivation>
            <NewCampaign />
          </RequiresWorkspaceActivation>
        </ProtectedRoute>
      </Route>

      <Route path="/app/history">
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      </Route>

      <Route path="/app/suppressions">
        <ProtectedRoute>
          <Suppressions />
        </ProtectedRoute>
      </Route>

      <Route path="/app/contacts/:id">
        <ProtectedRoute>
          <ContactListDetail />
        </ProtectedRoute>
      </Route>

      <Route path="/app/contacts">
        <ProtectedRoute>
          <ContactLibrary />
        </ProtectedRoute>
      </Route>

      <Route path="/app/domains/:id">
        <ProtectedRoute>
          <DomainDetail />
        </ProtectedRoute>
      </Route>

      <Route path="/app/domains">
        <ProtectedRoute>
          <Domains />
        </ProtectedRoute>
      </Route>

      <Route path="/app/templates">
        <ProtectedRoute>
          <Templates />
        </ProtectedRoute>
      </Route>

      <Route path="/app/users">
        <ProtectedRoute requiredRole={["ROOT_ADMIN", "SUB_ADMIN"]}>
          <Users />
        </ProtectedRoute>
      </Route>

      <Route path="/app/audit">
        <ProtectedRoute requiredRole="ROOT_ADMIN">
          <Audit />
        </ProtectedRoute>
      </Route>

      <Route path="/app/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      <Route path="/app/payments/process/:id">
        <ProtectedRoute>
          <Payments />
        </ProtectedRoute>
      </Route>

      <Route path="/app/payments">
        <ProtectedRoute>
          <Payments />
        </ProtectedRoute>
      </Route>

      <Route path="/app/:rest*">
        <ProtectedRoute>
          <Redirect to="/app/dashboard" />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
