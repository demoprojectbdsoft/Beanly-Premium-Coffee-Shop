"use client";

import React, { useRef, useState } from "react";
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
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import SparqLogo from "@/components/shared/SparqLogo";

/**
 * Where a fresh session should land.
 *
 * The multi-role account stores every authority in `roles` and the dashboard
 * the person last chose in `activeRole`. Sign-in honours that choice when it
 * is still valid, then falls back to the first non-customer authority so a
 * rider or a vendor reaches their workspace without an extra click. A plain
 * customer keeps the callback page they were originally sent to.
 */
function homeFor(user: unknown): string {
  const u = (user || {}) as {
    role?: string | null;
    activeRole?: string | null;
    roles?: string[] | string | null;
  };
  const pool: string[] = Array.isArray(u.roles)
    ? u.roles.map((r) => String(r).toLowerCase())
    : typeof u.roles === "string" && u.roles
      ? u.roles.split(",").map((r) => r.trim().toLowerCase())
      : [String(u.activeRole || u.role || "customer").toLowerCase()];
  const active = String(u.activeRole || u.role || "").toLowerCase();
  const chosen = active && pool.includes(active) ? active : pool[0] || "customer";
  if (chosen === "rider") return "/dashboard/rider";
  if (chosen === "vendor") return "/dashboard/vendor";
  if (chosen === "admin" || chosen === "demoadmin") return "/dashboard/admin";
  return "/";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/";
  const callbackUrl = rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//") ? rawCallbackUrl : "/";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const fillDemoCredentials = () => {
    if (emailRef.current) emailRef.current.value = "demoadmin@gmail.com";
    if (passwordRef.current) passwordRef.current.value = "root@123";
  };

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
        // Every workspace has its own home; a customer keeps the page they
        // were originally sent to.
        const home = homeFor(loginData.user);
        const destination = callbackUrl === "/" ? home : callbackUrl;
        router.push(destination);
        router.refresh();
      }
      if (error) {
        toast.error(error.message);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign in.";
      setError(message);
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
        newUserCallbackURL: callbackUrl,
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--surface-alt)] transition-colors duration-200">
      <div className="w-full max-w-md space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <SparqLogo size="lg" />
          <p className="text-xs text-[var(--foreground-muted)]">
            Welcome back! Please enter your details to sign in
          </p>
        </div>

        <Card className="w-full border border-[var(--border-color)] shadow-xl bg-[var(--surface-elevated)]/95 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-col gap-1 text-center pb-2 pt-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Sign In
            </CardTitle>
            <CardDescription className="text-xs text-[var(--foreground-muted)]">
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
                className="p-3 text-xs rounded-xl border border-primary/20 bg-primary/10"
              >
                <AlertDescription className="text-primary font-medium">
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
              className="flex items-center justify-center gap-2 h-11 text-xs font-semibold border-[var(--border-color)] text-[var(--foreground)] rounded-xl hover:bg-[var(--surface-alt)] cursor-pointer transition-colors w-full"
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
              <Separator className="flex-1 bg-[var(--border-color)]" />
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                Or with Email
              </span>
              <Separator className="flex-1 bg-[var(--border-color)]" />
            </div>

            {/* Login Form */}
            <Form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 w-full">
                <Label className="text-xs font-semibold text-[var(--foreground)]">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none z-10" />
                  <Input
                    ref={emailRef}
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    variant="primary"
                    fullWidth
                    className="w-full pl-9 h-10 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--foreground)] focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[var(--foreground)]">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[11px] font-semibold text-primary hover:text-primary-hover hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none z-10" />
                  <Input
                    ref={passwordRef}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    variant="primary"
                    fullWidth
                    className="w-full pl-9 pr-9 h-10 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--foreground)] focus:ring-2 focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer z-10"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isDisabled={loading}
                className="h-11 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-4 w-full"
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

            {/* Demo Credentials Banner */}
            <div className="rounded-xl border border-amber-300/40 dark:border-amber-800/60 bg-amber-500/10 p-3">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                <span>🔐</span> Demo Admin Access
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-amber-900 dark:text-amber-300">
                    <span className="font-semibold">Email:</span> demoadmin@gmail.com
                  </p>
                  <p className="text-[11px] text-amber-900 dark:text-amber-300">
                    <span className="font-semibold">Password:</span> root@123
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shrink-0"
                >
                  Use Demo
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[var(--foreground-muted)] pt-2">
              Don&apos;t have an account?{" "}
              <Link
                href={callbackUrl !== "/" ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/register"}
                className="font-semibold text-primary hover:text-primary-hover hover:underline"
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
