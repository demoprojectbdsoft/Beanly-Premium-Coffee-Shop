"use client";

import React from "react";
import Link from "next/link";
import { Home, Search, ShoppingBag, Sparkles } from "lucide-react";

export default function NotFound() {
  /* `min-h-[100dvh]` for the same reason as the forbidden screen: a locked
     `h-screen` is taller than the visible phone screen and clipped its own
     copy under `overflow-hidden` on a short one. */
  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-4 sm:py-6 relative overflow-hidden bg-[var(--background)]">
      {/* ── Seamless Ambient Radial Glow Backdrop ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,var(--primary),transparent)] opacity-15 pointer-events-none" />

      {/* Subtle Bottom Ambient Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-3.5 sm:space-y-4.5 relative z-10 my-auto">
        {/* 1. Hero 404 Visual */}
        <div className="relative flex items-center justify-center group">
          {/* Main 404 Text with Shimmer Gradient */}
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none text-transparent bg-clip-text text-gradient-primary select-none drop-shadow-sm transition-transform duration-500 ease-out group-hover:scale-105">
            404
          </h1>

          {/* Floating Pill with Search Icon */}
          <div className="absolute bottom-0 sm:bottom-1 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--surface-elevated)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-lg shadow-black/5">
            <Search className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-[var(--foreground)] uppercase tracking-wider">
              Page Not Found
            </span>
          </div>
        </div>

        {/* 2. Text Message Header */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide border border-primary/20">
            <Sparkles className="w-3 h-3" />
            <span>Lost in Cyberspace?</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            We couldn&apos;t find that page
          </h2>

          <p className="text-xs sm:text-sm text-[var(--foreground-muted)] leading-relaxed font-normal">
            The link you followed might be broken, or the page may have been moved to a new URL. Let&apos;s get you back on track!
          </p>
        </div>

        {/* 3. Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1">
          {/* Primary CTA: Home */}
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-xs sm:text-sm shadow-md shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <Home className="w-4 h-4 stroke-[2.2]" />
            <span>Back to Home</span>
          </Link>

          {/* Secondary CTA: Products */}
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold text-xs sm:text-sm border border-[var(--border-color)] shadow-xs hover:text-primary hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
            <span>Browse Products</span>
          </Link>
        </div>
      </div>
    </main>
  );
}