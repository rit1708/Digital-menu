import { useState } from "react";
import Head from "next/head";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "~/components/ui/use-toast";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useRedirectIfAuthenticated } from "~/hooks/use-redirect-if-authenticated";
import { useAuthActions } from "~/hooks/use-auth-actions";
import {
  sendCodeSchema,
  verifyLoginSchema,
  registerSchema,
  type SendCodeInput,
  type VerifyLoginInput,
  type RegisterInput,
} from "~/lib/validations";
import { cn } from "~/lib/utils";
import { getFirstErrorField } from "~/lib/form-utils";

export default function Home() {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "verify" | "register">("email");

  // Redirect if already authenticated
  useRedirectIfAuthenticated();

  const { sendCode, handleLogin, handleRegister, isSendingCode, isLoggingIn, isRegistering } =
    useAuthActions();

  const isLoading = isSendingCode || isLoggingIn || isRegistering;

  // Email form
  const emailForm = useForm<SendCodeInput>({
    resolver: zodResolver(sendCodeSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });

  // Verify form
  const verifyForm = useForm<VerifyLoginInput>({
    resolver: zodResolver(verifyLoginSchema),
    mode: "onTouched",
    defaultValues: { email: "", code: "" },
  });

  // Register form
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { email: "", code: "", name: "", country: "" },
  });


  const handleSendCode = (data: SendCodeInput) => {
    sendCode.mutate(
      { email: data.email.trim() },
      {
        onSuccess: (response) => {
          const result = response as { success?: boolean; code?: string; message?: string };
          if (result.code) {
            toast({
              title: "Verification Code",
              description: `Your verification code is: ${result.code}`,
            });
          } else {
            toast({
              title: "Code sent",
              description: "Check your email for the verification code (check console in dev mode)",
            });
          }
          verifyForm.setValue("email", data.email.trim());
          registerForm.setValue("email", data.email.trim());
          setStep("verify");
        },
      }
    );
  };

  const handleVerify = async (data: VerifyLoginInput) => {
    try {
      const result = await handleLogin(data.email.trim(), data.code);
      if (!result.success && result.needsRegistration) {
        registerForm.setValue("email", data.email.trim());
        registerForm.setValue("code", data.code);
        setStep("register");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Invalid verification code";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRegisterSubmit = async (data: RegisterInput) => {
    try {
      await handleRegister(
        data.email.trim(),
        data.code,
        data.name.trim(),
        data.country.trim()
      );
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <>
      <Head>
        <title>Digital Menu Management - Login</title>
        <meta name="description" content="Digital Menu Management System - Create and manage restaurant menus with QR codes" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Digital Menu Management" />
        <meta property="og:description" content="Create and manage restaurant menus with QR codes" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-center">
            Digital Menu Management
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            {step === "email" && "Enter your email to get started"}
            {step === "verify" && "Enter the verification code sent to your email"}
            {step === "register" && "Complete your registration"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {step === "email" && (
            <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  autoFocus={false}
                  {...emailForm.register("email")}
                  className={cn(
                    ((emailForm.formState.touchedFields.email || emailForm.formState.isSubmitted) && 
                     emailForm.formState.errors.email && 
                     getFirstErrorField(emailForm.formState.errors) === "email") ? "!border-red-500" : ""
                  )}
                />
                {(emailForm.formState.touchedFields.email || emailForm.formState.isSubmitted) && emailForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 sm:h-12 text-base font-medium"
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={verifyForm.handleSubmit(handleVerify)} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code *</Label>
                  <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus={false}
                  {...verifyForm.register("code", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    },
                  })}
                  className={cn(
                    ((verifyForm.formState.touchedFields.code || verifyForm.formState.isSubmitted) && 
                     verifyForm.formState.errors.code && 
                     getFirstErrorField(verifyForm.formState.errors) === "code") ? "!border-red-500" : ""
                  )}
                />
                {(verifyForm.formState.touchedFields.code || verifyForm.formState.isSubmitted) && verifyForm.formState.errors.code && (
                  <p className="text-sm text-red-500">
                    {verifyForm.formState.errors.code.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("email");
                    verifyForm.reset();
                  }}
                  disabled={isLoading}
                  className="flex-1 h-11 sm:h-12 text-base font-medium"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 sm:h-12 text-base font-medium"
                >
                  {isLoading ? "Verifying..." : "Verify & Login"}
                </Button>
              </div>
            </form>
          )}

          {step === "register" && (
            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  autoFocus={false}
                  {...registerForm.register("name")}
                  className={cn(
                    ((registerForm.formState.touchedFields.name || registerForm.formState.isSubmitted) && 
                     registerForm.formState.errors.name && 
                     getFirstErrorField(registerForm.formState.errors) === "name") ? "!border-red-500" : ""
                  )}
                />
                {(registerForm.formState.touchedFields.name || registerForm.formState.isSubmitted) && registerForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  type="text"
                  placeholder="United States"
                  autoFocus={false}
                  {...registerForm.register("country")}
                  className={cn(
                    ((registerForm.formState.touchedFields.country || registerForm.formState.isSubmitted) && 
                     registerForm.formState.errors.country && 
                     getFirstErrorField(registerForm.formState.errors) === "country") ? "!border-red-500" : ""
                  )}
                />
                {(registerForm.formState.touchedFields.country || registerForm.formState.isSubmitted) && registerForm.formState.errors.country && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.country.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("verify");
                    registerForm.reset();
                  }}
                  disabled={isLoading}
                  className="flex-1 h-11 sm:h-12 text-base font-medium"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 sm:h-12 text-base font-medium"
                >
                  {isLoading ? "Registering..." : "Register"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}

