import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

// Central brand registry.
// Add a new entry here when a new product launches — no logic changes needed.
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
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NewCampaign from "@/pages/NewCampaign";
import History from "@/pages/History";
import Templates from "@/pages/Templates";
import Users from "@/pages/Users";
import Audit from "@/pages/Audit";
import Profile from "@/pages/Profile";
import ResetPassword from "@/pages/ResetPassword";
import PublicPricing from "@/pages/PublicPricing";
import Payments from "@/pages/Payments";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import RepMailPrivacy from "@/pages/RepMailPrivacy";
import RepMailTerms from "@/pages/RepMailTerms";
import NotFound from "@/pages/not-found";
import WaitlistLanding from "@/pages/WaitlistLanding";
import AcceptInvite from "@/pages/AcceptInvite";
import Suppressions from "@/pages/Suppressions";
import ContactLibrary from "@/pages/ContactLibrary";
import ContactListDetail from "@/pages/ContactListDetail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetByToken from "@/pages/ResetByToken";
import Domains from "@/pages/Domains";
import DomainDetail from "@/pages/DomainDetail";
import LinkExpired from "@/pages/LinkExpired";
import Onboarding from "@/pages/Onboarding";
import LandingExperience from "@marketing/LFP_final/LandingExperience";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

// M21-D — lazy-loaded, not a static top-level import like every other page
// above. gray-matter/marked (the markdown/frontmatter parsing this pulls in
// transitively via resourceCenterContent.js) add ~500KB to the bundle;
// without lazy-loading, that cost lands on every page load — including the
// authenticated app, since this codebase has no route-level code-splitting
// anywhere else (M21-B's audit already found this gap). Splitting these 5
// routes out keeps that cost paid only by someone who actually visits
// /learn or /repmail/learn/*.
const LetsZeroLearnDirectory = lazy(() => import("@/pages/LetsZeroLearnDirectory"));
const ResourceCenterHomePage = lazy(() => import("@/pages/resource-center/ResourceCenterHomePage"));
// M28 — the flat "all guides" index behind the homepage's View all guides CTA.
const AllGuidesPage = lazy(() => import("@/pages/resource-center/AllGuidesPage"));
const AcademyHubPage = lazy(() => import("@/pages/resource-center/AcademyHubPage"));
const ArticlePage = lazy(() => import("@/pages/resource-center/ArticlePage"));
const AuthorPage = lazy(() => import("@/pages/resource-center/AuthorPage"));
// M22-A — first real consumers of learningPathSchema/collectionSchema.
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
// Sending is blocked by SAS + CampaignConfirmation — no upstream redirect needed.
// This component is kept as a pass-through so route structure is preserved for future use.
function RequiresWorkspaceActivation({ children }) {
  return children;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, mustResetPassword } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && mustResetPassword) {
    return <ResetPassword />;
  }

  return (
    <ErrorBoundary resetKey={location}>
      <BrandingManager />
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

      {/* M21-D/M21-I — Resource Center, product-parameterized: :product is
          resolved against the real PRODUCTS registry inside each page
          (useResourceCenterProduct), not hardcoded to "repmail" — a second
          LetsZero product (PAR §11's own examples — MessageHub,
          NotifyStream) needs a PRODUCTS entry and content, not new routes
          or new page components. Route order matters: /authors/:author
          must be declared before /:academy/:slug (both are 3 segments
          after :product — without this order, "authors" would be greedily
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

      {/* M28 — /guides is a literal 2-segments-after-:product path, the same
          shape as :academy below, so it must be declared first or "guides"
          would match as an Academy slug and render a 404 hub. */}
      <Route path="/:product/learn/guides">
        {() => <Suspense fallback={<LoadingScreen />}><AllGuidesPage /></Suspense>}
      </Route>

      <Route path="/:product/learn/authors/:author">
        {() => <Suspense fallback={<LoadingScreen />}><AuthorPage /></Suspense>}
      </Route>

      {/* M22-A — paths/:path and collections/:collection are the same
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

      {/* M21-G — reuses RELEASE_NOTES.md verbatim, zero new writing (PAR §13
          Phase 11). Real, substantive content, so — unlike the still-empty
          Resource Center pages above — this one IS prerendered/indexed
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
