"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "@/context/SiteSettingsContext";

/** Resolves human-friendly page context from the active URL */
function getPageLabel(pathname: string | null): { label: string; emoji: string } {
  if (!pathname || pathname === "/") return { label: "Storefront", emoji: "🏪" };
  if (pathname.startsWith("/shop/")) return { label: "Product Details", emoji: "📦" };
  if (pathname.startsWith("/shop")) return { label: "Products Catalog", emoji: "🛍️" };
  if (pathname.startsWith("/cart")) return { label: "Shopping Cart", emoji: "🛒" };
  if (pathname.startsWith("/checkout")) return { label: "Secure Checkout", emoji: "🔒" };
  if (pathname.startsWith("/order-success")) return { label: "Order Receipt", emoji: "🎉" };
  if (pathname.startsWith("/track-order")) return { label: "Order Tracking", emoji: "📍" };
  if (pathname.startsWith("/store-locator")) return { label: "Store Locator", emoji: "🗺️" };
  if (pathname.startsWith("/about")) return { label: "About Us", emoji: "✨" };
  if (pathname.startsWith("/contact")) return { label: "Contact Us", emoji: "💬" };
  if (pathname.startsWith("/dashboard/admin")) return { label: "Admin Panel", emoji: "⚙️" };
  if (pathname.startsWith("/dashboard/customer")) return { label: "My Dashboard", emoji: "👤" };
  if (pathname.startsWith("/dashboard")) return { label: "Dashboard", emoji: "📊" };
  if (pathname.startsWith("/auth/login")) return { label: "Sign In", emoji: "🔑" };
  if (pathname.startsWith("/auth/register")) return { label: "Create Account", emoji: "🚀" };
  return { label: "Loading", emoji: "⚡" };
}

export default function Loading() {
  const { settings } = useSiteSettings();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    setMounted(true);

    // Animate progress bar 0 → 85% quickly, then stall waiting for real load
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) { clearInterval(timer); return prev; }
        const jump = prev < 40 ? 8 : prev < 70 ? 4 : 1;
        return Math.min(prev + jump, 85);
      });
    }, 80);

    // Animate dots
    const dotTimer = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);

    return () => { clearInterval(timer); clearInterval(dotTimer); };
  }, []);

  const siteName = settings.siteName || "Sparq";
  const { label: pageLabel, emoji } = mounted ? getPageLabel(pathname) : { label: "Loading", emoji: "⚡" };

  // First letter of site name as monogram
  const monogram = siteName.charAt(0).toUpperCase();

  /* `fixed inset-0` already is the viewport; the old `h-screen w-screen`
     measured 100vw/100vh on top of it, which is wider and taller than the
     visible area on a phone and made the loading screen itself scrollable. */
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[var(--background)] flex flex-col items-center justify-center select-none">

      {/* ── Diagonal Grid Pattern Background ── */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Soft Corner Glow ── */}
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Main Content ── */}
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-xs px-6">

        {/* ── Logo Block — Letter Mark + Ring ── */}
        <div className="relative flex items-center justify-center">
          {/* Outer rotating segmented ring */}
          <svg
            className="absolute w-28 h-28 animate-[spin_3s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="45" stroke="var(--border-color)" strokeWidth="2" />
            <circle
              cx="50" cy="50" r="45"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeDasharray="50 232"
              strokeLinecap="round"
            />
          </svg>

          {/* Inner counter-rotating arc */}
          <svg
            className="absolute w-20 h-20 animate-[spin_2s_linear_infinite_reverse]"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              cx="50" cy="50" r="45"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeDasharray="20 262"
              strokeOpacity="0.4"
              strokeLinecap="round"
            />
          </svg>

          {/* Center monogram tile */}
          <div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-hover, var(--primary)))" }}
          >
            {monogram}
            {/* Shine overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          </div>
        </div>

        {/* ── Text Block ── */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Site name */}
          <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">
            {siteName}
          </h1>

          {/* Page context pill */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-xs">
            <span className="text-sm leading-none">{emoji}</span>
            <span className="text-xs font-semibold text-[var(--foreground-muted)] tracking-wide">
              {pageLabel}
            </span>
          </div>

          {/* Loading dots text */}
          <p className="text-[11px] font-medium text-[var(--foreground-muted)] tracking-widest uppercase">
            Loading{".".repeat(dotCount)}
          </p>
        </div>

        {/* ── Progress Track ── */}
        <div className="w-full space-y-2">
          <div className="w-full h-[3px] bg-[var(--surface-alt)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, var(--primary), var(--primary-hover, var(--primary)))",
                boxShadow: "0 0 8px var(--primary)",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--foreground-muted)] font-medium">
            <span>Fetching data</span>
            <span>{progress}%</span>
          </div>
        </div>

      </div>

      {/* ── Bottom Tagline ── */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }}
            />
          ))}
        </div>
        <p className="text-[10px] text-[var(--foreground-muted)] font-medium tracking-widest uppercase">
          {settings.siteTagline || "Premium Store Experience"}
        </p>
      </div>

    </div>
  );
}