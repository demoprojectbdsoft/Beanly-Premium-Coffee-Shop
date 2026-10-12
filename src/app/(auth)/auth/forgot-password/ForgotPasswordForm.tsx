"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  Alert,
  AlertDescription,
} from "@heroui/react";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import SparqLogo from "@/components/shared/SparqLogo";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      // Simulate API call for password reset email
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-4">
        {/* Brand logo & tagline */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <SparqLogo size="lg" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Password Recovery Service
          </p>
        </div>

        <Card className="w-full border border-slate-200/80 dark:border-gray-800 shadow-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-col gap-1 text-center pb-2 pt-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Forgot Password?
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              No worries! Enter your email address and we&apos;ll send you instructions to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-6 pt-2">
            {error && (
              <Alert status="danger" className="p-3 text-xs rounded-xl border border-red-200 dark:border-red-900/50">
                <AlertDescription className="text-red-700 dark:text-red-300 font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {submitted ? (
              <div className="space-y-4 py-2">
                <Alert status="success" className="p-4 text-xs rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300 space-y-1">
                      <p className="font-bold text-sm">Reset link sent!</p>
                      <p className="text-xs leading-relaxed">
                        We have sent password reset instructions to <span className="font-semibold">{email}</span>. Please check your inbox and spam folder.
                      </p>
                    </AlertDescription>
                  </div>
                </Alert>

                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setSubmitted(false)}
                  className="h-10 text-xs font-semibold border-slate-300 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer w-full"
                >
                  Resend Instructions
                </Button>
              </div>
            ) : (
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 h-10 text-xs rounded-xl border border-slate-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isDisabled={loading}
                  className="h-11 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 w-full"
                >
                  {loading ? (
                    "Sending Reset Link..."
                  ) : (
                    <>
                      Send Reset Instructions
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </Form>
            )}

            <div className="text-center pt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
