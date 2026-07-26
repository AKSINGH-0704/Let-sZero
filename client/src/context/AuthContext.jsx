import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
// M39 Phase 3 — cross-tab auth synchronization so login AND logout propagate to
// every tab immediately (not just this one). See client/src/lib/authSync.js.
import { broadcastAuth, subscribeAuth, AUTH_EVENTS } from "@/lib/authSync";

const AuthContext = createContext(null);

// Applied both to this tab's own logout and to a logout broadcast from another tab,
// so the two paths converge on identical local state.
//
// Order matters (M39 post-deploy fix): clear() FIRST to drop every cached
// user-scoped query, THEN plant `null` as the authoritative auth value. Because
// the `/api/auth/me` observer runs with `staleTime: Infinity`, that planted null
// is treated as fresh and renders the tab logged-out immediately — no network
// refetch required. The previous order (setQueryData → clear) wiped the null it
// had just set, leaving a *receiving* (broadcast) tab to reach the logged-out
// state only if clear() happened to trigger a server refetch. In a background
// tab it often did not: refetchOnWindowFocus is a no-op under staleTime:Infinity
// (the query is never stale), so that second tab could keep showing its stale
// authenticated view. Planting null last removes the dependency on any refetch.
// Exported for tests/unit/auth-logout-cache.test.js — the defect this guards
// against lives in the cache-mutation order, so the order is what a test asserts.
export function applyLocalLogout() {
  queryClient.clear();
  queryClient.setQueryData(["/api/auth/me"], null);
}

export function AuthProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: true,
    throwOnError: false
  });

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Mirror auth transitions announced by other tabs. A logout elsewhere clears this
  // tab's state; a login elsewhere invalidates so this tab re-reads the now-valid
  // session. Symmetric with the mutations below, so the whole browser stays in one
  // auth state regardless of which tab acted or whether this tab has focus.
  useEffect(() => {
    return subscribeAuth((type) => {
      if (type === AUTH_EVENTS.LOGOUT) {
        applyLocalLogout();
      } else if (type === AUTH_EVENTS.LOGIN) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    });
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      broadcastAuth(AUTH_EVENTS.LOGIN); // tell other tabs to re-read the session
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiRequest("POST", "/api/auth/logout");
      } catch (error) {
        // Even if logout request fails, clear local state
        console.error("Logout request failed, clearing local state anyway:", error);
      }
    },
    onSuccess: () => {
      applyLocalLogout();
      broadcastAuth(AUTH_EVENTS.LOGOUT); // tell other tabs to clear immediately
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { 
        currentPassword, 
        newPassword 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  });

  const login = async (credentials) => {
    return loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  const resetPassword = async (currentPassword, newPassword) => {
    return resetPasswordMutation.mutateAsync({ currentPassword, newPassword });
  };

  const isAuthenticated = !!user;
  const mustResetPassword = user?.mustResetPassword === true;
  const isRootAdmin = user?.role === "ROOT_ADMIN";
  const isSubAdmin = user?.role === "SUB_ADMIN";
  const isSecondaryRoot = user?.isSecondaryRoot === true;
  const isAdmin = isRootAdmin || isSubAdmin || isSecondaryRoot;
  // M37 — the single platform-operated account, as the server computes it. Note
  // this is NOT isRootAdmin: a customer's own workspace owner is also a
  // ROOT_ADMIN. Only ever gate genuinely platform-wide operational surfaces on
  // this; anything a customer should see belongs behind isAdmin/isRootAdmin.
  const isPlatformOperator = user?.isPlatformOperator === true;
  // M41-FIX — a workspace OWNER is the root of their own workspace: a top-level
  // account with no parent. Self-service customers sign up as role USER (not
  // ROOT_ADMIN), so ownership is defined by tree POSITION, not role. The owner is
  // the "Admin" of their workspace and gets the full team-management experience;
  // a plain member (role USER *with* a parentId) does not. Guarded on
  // isAuthenticated so a still-loading (undefined) user is never treated as owner.
  const isWorkspaceOwner = isAuthenticated && user?.parentId == null;
  // Everyone who may manage the workspace team: managers/root admins (isAdmin)
  // and the workspace owner. Mirrors the server's adminMiddleware exactly.
  const canManageTeam = isAdmin || isWorkspaceOwner;

  const value = {
    user,
    isLoading: isLoading || !isInitialized,
    isAuthenticated,
    isRootAdmin,
    isSubAdmin,
    isSecondaryRoot,
    isAdmin,
    isWorkspaceOwner,
    canManageTeam,
    isPlatformOperator,
    mustResetPassword,
    login,
    logout,
    resetPassword,
    loginError: loginMutation.error,
    // Lets SignInForm clear the "Invalid credentials" banner the moment the
    // customer starts retyping, instead of it sitting on screen through the
    // whole retry (React Query only clears mutation error state on the next
    // mutate() call otherwise).
    resetLoginError: loginMutation.reset,
    isLoggingIn: loginMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,
    refetch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
