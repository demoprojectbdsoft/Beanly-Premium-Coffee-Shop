"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Lock,
  ArrowLeft,
  Home,
  LogIn,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export default function ForbiddenView() {
  const router = useRouter();

  /* `min-h-[100dvh]` rather than `h-screen max-h-screen`: a locked height of
     100vh is taller than the visible screen while a phone's address bar is up,
     and a fixed height plus `overflow-hidden` silently clipped the copy on a
     short landscape screen. The box now fills the view and grows instead. */
  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-4 sm:py-6 relative overflow-hidden bg-[var(--background)]">
      {/* ── Seamless Ambient Radial Glow Backdrop ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,var(--primary),transparent)] opacity-15 pointer-events-none" />

      {/* Subtle Bottom Ambient Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-red-500/10 to-transparent pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-3.5 sm:space-y-4.5 relative z-10 my-auto">
        {/* 1. Hero 403 Visual */}
        <div className="relative flex items-center justify-center group">
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none text-transparent bg-clip-text text-gradient-primary select-none drop-shadow-sm transition-transform duration-500 ease-out group-hover:scale-105">
            403
          </h1>

          {/* Floating Pill with Lock & Status */}
          <div className="absolute bottom-0 sm:bottom-1 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--surface-elevated)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-lg shadow-black/5">
            <Lock className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[11px] font-bold text-[var(--foreground)] uppercase tracking-wider">
              Access Forbidden
            </span>
          </div>
        </div>

        {/* 2. Text Message Header */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide border border-primary/20">
            <Sparkles className="w-3 h-3" />
            <span>Restricted Gateway</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            Access Denied
          </h2>

          <p className="text-xs sm:text-sm text-[var(--foreground-muted)] leading-relaxed font-normal">
            You do not have the required permissions or clearance to access this resource.
          </p>
        </div>

        {/* 3. PROMINENT RED ALERT BOX */}
        <div
          role="alert"
          aria-live="assertive"
          className="max-w-md mx-auto p-3 sm:p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/40 border-2 border-red-500/40 dark:border-red-500/50 shadow-lg shadow-red-500/10 text-left transition-all hover:border-red-500"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30 shrink-0">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                  </span>
                  <span className="text-[11px] font-black tracking-wider uppercase text-red-600 dark:text-red-400">
                    Red Alert &bull; Security Restriction
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20">
                  HTTP 403
                </span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] dark:text-[var(--foreground)] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Unauthorized Role or Missing Clearance</span>
              </h3>

              <p className="text-[11px] sm:text-xs text-[var(--foreground-muted)] leading-relaxed font-normal">
                Your authenticated session does not possess the clearance needed to view this page. If you are an administrator, please sign in with an authorized account.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1">
          {/* Primary CTA: Home */}
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-xs sm:text-sm shadow-md shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <Home className="w-4 h-4 stroke-[2.2]" />
            <span>Back to Home</span>
          </Link>

          {/* Secondary CTA: Sign In / Switch Account */}
          <Link
            href="/auth/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold text-xs sm:text-sm border border-[var(--border-color)] shadow-xs hover:text-primary hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <LogIn className="w-4 h-4 stroke-[2.2]" />
            <span>Switch Account</span>
          </Link>

          {/* Tertiary CTA: Go Back */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-3 rounded-full bg-transparent hover:bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-semibold text-xs sm:text-sm border border-transparent hover:border-[var(--border-color)] transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </main>
  );
}
