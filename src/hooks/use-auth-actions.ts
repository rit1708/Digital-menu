import { useRouter } from "next/router";
import { useToast } from "~/components/ui/use-toast";
import { useAuth } from "~/contexts/auth-context";
import { api } from "~/utils/api";
import { unwrapData } from "./use-unwrap-data";

/**
 * Hook for authentication actions (login, register, etc.)
 * Provides convenient methods for auth operations
 */
export function useAuthActions() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();

  const sendCode = api.auth.sendVerificationCode.useMutation({
    onError: (error) => {
      const errorMessage =
        error.data?.zodError?.formErrors?.[0] ||
        error.message ||
        "Failed to send verification code";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const verifyAndLoginMutation = api.auth.verifyAndLogin.useMutation();
  const verifyAndRegisterMutation = api.auth.verifyAndRegister.useMutation();

  const handleLogin = async (email: string, code: string) => {
    try {
      const result = await verifyAndLoginMutation.mutateAsync({ email, code });
      const token = unwrapData<{ token: string }>(result)?.token;

      if (!token || typeof token !== "string" || token.trim() === "") {
        throw new Error("Invalid token received from server");
      }

      login(token);
      router.push("/dashboard");
      return { success: true };
    } catch (error: unknown) {
      if (error && typeof error === "object" && "data" in error) {
        const trpcError = error as { data?: { code?: string } };
        if (trpcError.data?.code === "NOT_FOUND") {
          return { success: false, needsRegistration: true };
        }
      }
      throw error;
    }
  };

  const handleRegister = async (
    email: string,
    code: string,
    name: string,
    country: string
  ) => {
    try {
      const result = await verifyAndRegisterMutation.mutateAsync({
        email,
        code,
        name,
        country,
      });
      const token = unwrapData<{ token: string }>(result)?.token;

      if (!token || typeof token !== "string" || token.trim() === "") {
        throw new Error("Invalid token received from server");
      }

      login(token);
      router.push("/dashboard");
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to register. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    sendCode,
    handleLogin,
    handleRegister,
    isSendingCode: sendCode.isPending,
    isLoggingIn: verifyAndLoginMutation.isPending,
    isRegistering: verifyAndRegisterMutation.isPending,
  };
}

