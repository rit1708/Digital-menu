import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "~/contexts/auth-context";

/**
 * Hook to redirect authenticated users away from auth pages (like login)
 * Redirects to dashboard if already authenticated
 */
export function useRedirectIfAuthenticated(redirectTo: string = "/dashboard") {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, router, redirectTo]);
}

