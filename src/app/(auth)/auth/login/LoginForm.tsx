"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Form,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Button,
  Separator,
  Alert,
  AlertDescription,
} from "@heroui/react";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { authClient, signIn } from "@/lib/auth-client";
import { toast } from "react-toastify";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/";
  const callbackUrl = rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//") ? rawCallbackUrl : "/";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDemoMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const email = String(data.email || "").trim();
    const password = String(data.password || "");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data: loginData, error } = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });
      if (loginData) {
        toast.success("Authentication Successful!");
        router.push(callbackUrl);
        router.refresh();
      }
      if (error) {
        toast.error(error.message);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign in.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setDemoMessage(null);
    setLoading(true);

    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });

      if (res?.error) {
        const errorMsg =
          res.error.message || "Google sign-in failed. Please try again.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during Google sign-in.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center text-3xl font-extrabold tracking-tight text-[#333e48] dark:text-white">
            electro<span className="text-primary text-4xl leading-none">.</span>
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Welcome back! Please enter your details to sign in
          </p>
        </div>

        <Card className="w-full border border-slate-200/80 dark:border-gray-800 shadow-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-col gap-1 text-center pb-2 pt-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign In
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Access your account and manage your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-6 pt-2">
            {error && (
              <Alert
                status="danger"
                className="p-3 text-xs rounded-xl border border-red-200 dark:border-red-900/50"
              >
                <AlertDescription className="text-red-700 dark:text-red-300 font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {demoMessage && (
              <Alert
                status="accent"
                className="p-3 text-xs rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40"
              >
                <AlertDescription className="text-blue-700 dark:text-blue-300 font-medium">
                  {demoMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              fullWidth
              isDisabled={loading}
              className="flex items-center justify-center gap-2 h-11 text-xs font-semibold border-slate-300 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer transition-colors w-full"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </Button>

            <div className="flex items-center gap-4 my-3">
              <Separator className="flex-1 bg-slate-200 dark:bg-gray-800" />
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Or with Email
              </span>
              <Separator className="flex-1 bg-slate-200 dark:bg-gray-800" />
            </div>

            {/* Login Form */}
            <Form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 w-full">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                  <Input
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    variant="primary"
                    fullWidth
                    className="w-full pl-9 h-10 text-xs rounded-xl border border-slate-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    variant="primary"
                    fullWidth
                    className="w-full pl-9 pr-9 h-10 text-xs rounded-xl border border-slate-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer z-10"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Checkboxes / Selection Options */}
              <div className="space-y-2 pt-1">
                {/* Terms and Conditions option */}
                <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span>
                    I accept the{" "}
                    <Link
                      href="/terms"
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Terms &amp; Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isDisabled={loading}
                className="h-11 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-4 w-full"
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign In
                    <LogIn className="w-4 h-4" />
                  </>
                )}
              </Button>
            </Form>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              Don&apos;t have an account?{" "}
              <Link
                href={callbackUrl !== "/" ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/register"}
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
              >
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
