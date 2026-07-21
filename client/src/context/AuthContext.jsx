import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";

const AuthContext = createContext(null);

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

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
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

  const value = {
    user,
    isLoading: isLoading || !isInitialized,
    isAuthenticated,
    isRootAdmin,
    isSubAdmin,
    isSecondaryRoot,
    isAdmin,
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
