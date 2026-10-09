"use client";

import React from "react";
import Link from "next/link";
import { Home, Search, ShoppingBag, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <main className="h-screen max-h-screen w-full flex flex-col items-center justify-center px-4 py-4 sm:py-6 relative overflow-hidden bg-slate-50 dark:bg-gray-950">
      {/* ── Seamless Ambient Radial Glow Backdrop ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.18),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(0,0,0,0))] pointer-events-none" />

      {/* Subtle Bottom Ambient Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-sky-100/30 to-transparent dark:from-sky-950/20 pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-3.5 sm:space-y-4.5 relative z-10 my-auto">
        {/* 1. Hero 404 Visual */}
        <div className="relative flex items-center justify-center group">
          {/* Main 404 Text with Shimmer Gradient */}
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 dark:from-sky-400 dark:via-blue-500 dark:to-indigo-400 select-none drop-shadow-sm transition-transform duration-500 ease-out group-hover:scale-105">
            404
          </h1>

          {/* Floating Pill with Search Icon */}
          <div className="absolute bottom-0 sm:bottom-1 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-slate-200 dark:border-gray-800 shadow-lg shadow-sky-900/5">
            <Search className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Page Not Found
            </span>
          </div>
        </div>

        {/* 2. Text Message Header */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100/80 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-[11px] font-semibold tracking-wide border border-sky-200/60 dark:border-sky-900/50">
            <Sparkles className="w-3 h-3" />
            <span>Lost in Cyberspace?</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            We couldn&apos;t find that page
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
            The link you followed might be broken, or the page may have been moved to a new URL. Let&apos;s get you back on track!
          </p>
        </div>

        {/* 3. Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1">
          {/* Primary CTA: Home */}
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <Home className="w-4 h-4 stroke-[2.2]" />
            <span>Back to Home</span>
          </Link>

          {/* Secondary CTA: Products */}
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm border border-slate-200 dark:border-gray-700 shadow-xs hover:bg-slate-50 dark:hover:bg-gray-750 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
            <span>Browse Products</span>
          </Link>
        </div>
      </div>
    </main>
  );
}