import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";

type AuthContextType = {
  user: { id: string; email: string; name: string; country: string } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "auth-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get token from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken && storedToken !== "undefined" && storedToken !== "null" && storedToken.trim() !== "") {
        setToken(storedToken);
      } else if (storedToken) {
        // Clean up invalid token
        localStorage.removeItem(TOKEN_KEY);
      }
      setIsInitialized(true);
    }
  }, []);

  // Fetch current user if token exists
  const { data: user, error, isLoading } = api.auth.getCurrentUser.useQuery(undefined, {
    enabled: !!token && isInitialized,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Handle auth errors
  useEffect(() => {
    if (error && isInitialized) {
      // Token is invalid, clear it
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    }
  }, [error, isInitialized]);

  const login = (newToken: string) => {
    if (newToken && newToken !== "undefined" && newToken !== "null" && newToken.trim() !== "") {
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
    }
  };

  const logoutMutation = api.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      router.push("/");
    },
    onError: () => {
      // Even if logout fails on server, clear local token
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      router.push("/");
    },
  });

  const logout = async () => {
    if (token) {
      await logoutMutation.mutateAsync();
    } else {
      // If no token, just clear and redirect
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      router.push("/");
    }
  };

  const checkAuth = () => {
    if (typeof window === "undefined") return false;
    const storedToken = localStorage.getItem(TOKEN_KEY);
    return !!(
      storedToken &&
      storedToken !== "undefined" &&
      storedToken !== "null" &&
      storedToken.trim() !== ""
    );
  };

  const value: AuthContextType = {
    user: user ?? null,
    isLoading: isLoading || !isInitialized,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

