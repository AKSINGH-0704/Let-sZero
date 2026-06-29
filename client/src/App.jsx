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
    routes: ["/", "/early-access", "/contact", "/privacy", "/terms"],
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
import LinkExpired from "@/pages/LinkExpired";
import Onboarding from "@/pages/Onboarding";
import LandingExperience from "@marketing/LFP_final/LandingExperience";
import { Loader2 } from "lucide-react";

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

// Redirects non-admin users without a sending identity to the Workspace Activation wizard
function RequiresWorkspaceActivation({ children }) {
  const { user, isAdmin } = useAuth();
  if (user && !isAdmin && !user.sendingIdentityType) {
    return <Redirect to="/app/onboarding" />;
  }
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
    <>
      <BrandingManager />
      <Switch>
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
    </>
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
