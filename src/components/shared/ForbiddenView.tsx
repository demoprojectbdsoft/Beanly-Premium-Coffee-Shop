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

  return (
    <main className="h-screen max-h-screen w-full flex flex-col items-center justify-center px-4 py-4 sm:py-6 relative overflow-hidden bg-slate-50 dark:bg-gray-950">
      {/* ── Seamless Ambient Radial Glow Backdrop ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.18),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(0,0,0,0))] pointer-events-none" />

      {/* Subtle Bottom Ambient Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-red-100/20 to-transparent dark:from-red-950/15 pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-3.5 sm:space-y-4.5 relative z-10 my-auto">
        {/* 1. Hero 403 Visual */}
        <div className="relative flex items-center justify-center group">
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 dark:from-sky-400 dark:via-blue-500 dark:to-indigo-400 select-none drop-shadow-sm transition-transform duration-500 ease-out group-hover:scale-105">
            403
          </h1>

          {/* Floating Pill with Lock & Status */}
          <div className="absolute bottom-0 sm:bottom-1 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-slate-200 dark:border-gray-800 shadow-lg shadow-sky-900/5">
            <Lock className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Access Forbidden
            </span>
          </div>
        </div>

        {/* 2. Text Message Header */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100/80 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-[11px] font-semibold tracking-wide border border-sky-200/60 dark:border-sky-900/50">
            <Sparkles className="w-3 h-3" />
            <span>Restricted Gateway</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Access Denied
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
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

              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Unauthorized Role or Missing Clearance</span>
              </h3>

              <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <Home className="w-4 h-4 stroke-[2.2]" />
            <span>Back to Home</span>
          </Link>

          {/* Secondary CTA: Sign In / Switch Account */}
          <Link
            href="/auth/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm border border-slate-200 dark:border-gray-700 shadow-xs hover:bg-slate-50 dark:hover:bg-gray-750 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <LogIn className="w-4 h-4 stroke-[2.2]" />
            <span>Switch Account</span>
          </Link>

          {/* Tertiary CTA: Go Back */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-3 rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold text-xs sm:text-sm border border-transparent hover:border-slate-200 dark:hover:border-gray-700 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </main>
  );
}
