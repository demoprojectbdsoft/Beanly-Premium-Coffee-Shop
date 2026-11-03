"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  Mail,
  Phone,
  Share2,
  PlayCircle,
  Briefcase,
  Globe,
  Sun,
  Moon,
  Clock,
  CheckCircle2,
  RefreshCw,
  Shield,
  ArrowRight,
  Sparkles,
  Server,
  Activity,
  Lock,
} from "lucide-react";
import type { SiteSettingsData } from "@/types";

// ── Social icon resolver ──────────────────────────────────────────────────────
function SocialIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  const cls = "w-4 h-4";
  if (p.includes("youtube") || p.includes("video")) return <PlayCircle className={cls} />;
  if (p.includes("linkedin") || p.includes("work")) return <Briefcase className={cls} />;
  if (
    p.includes("facebook") ||
    p.includes("twitter") ||
    p.includes("instagram") ||
    p.includes("social")
  )
    return <Share2 className={cls} />;
  return <Globe className={cls} />;
}

interface Props {
  settings: SiteSettingsData | null;
}

export default function MaintenancePage({ settings: serverSettings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") || "/";
  const isPreview = searchParams.has("preview");

  const { settings: contextSettings } = useSiteSettings();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isStoreBackLive, setIsStoreBackLive] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [liveSettings, setLiveSettings] = useState<Partial<SiteSettingsData> | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check if user previously subscribed
    try {
      const savedEmail = localStorage.getItem("maint_subscribed_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setSubmitted(true);
      }
    } catch {}
  }, []);

  const isDark = mounted ? (resolvedTheme || theme) === "dark" : false;

  // Active settings hierarchy: Real-time polled data > context settings > server SSR props
  const s: SiteSettingsData =
    (liveSettings as SiteSettingsData) ||
    contextSettings ||
    (serverSettings as SiteSettingsData);

  const siteName = s?.siteName || "Sparq";
  const supportEmail = s?.supportEmail || "support@sparq.com";
  const supportPhone = s?.supportPhone || "(800) 8001-8588";
  const socialLinks = s?.socialLinks || [];

  const navLogo = s?.navbarLogo;
  const lightLogo = navLogo?.light?.trim() || "";
  const darkLogo = navLogo?.dark?.trim() || "";
  const hasLogo = !!(lightLogo || darkLogo);
  const activeLogo = isDark ? darkLogo || lightLogo : lightLogo || darkLogo;

  // ── Real-time Status Polling ──────────────────────────────────────────────
  const checkStatus = useCallback(
    async (isManual: boolean = false) => {
      if (isManual) setCheckingStatus(true);
      const startTime = performance.now();

      try {
        const res = await fetch("/api/maintenance/status", {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });

        const latency = Math.round(performance.now() - startTime);
        setPingLatency(latency);
        setLastCheckTime(new Date());

        if (res.ok) {
          const data = await res.json();
          if (data?.settings) {
            setLiveSettings(data.settings);
          }

          // If maintenance mode was disabled on the server!
          if (data?.maintenanceMode === false && !isPreview) {
            setIsStoreBackLive(true);
            setRedirectCountdown(3);
          }
        }
      } catch (err) {
        console.error("Maintenance status check error:", err);
      } finally {
        if (isManual) {
          setTimeout(() => setCheckingStatus(false), 400);
        }
      }
    },
    [isPreview]
  );

  // Poll every 4 seconds for real-time responsiveness
  useEffect(() => {
    checkStatus(false);
    const interval = setInterval(() => {
      checkStatus(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Countdown redirect when store returns online
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      router.push(fromPath);
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, fromPath, router]);

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    try {
      localStorage.setItem("maint_subscribed_email", email);
    } catch {}
  };

  // ── Inline CSS with brand design tokens ────────────────────────────────────
  const STYLES = `
    :root {
      --grad-from: var(--site-topbar-from, #1d4ed8);
      --grad-via:  var(--site-topbar-via,  #0284c7);
      --grad-to:   var(--site-topbar-to,   #4338ca);
      --brand-flat: var(--site-topbar-via, #0284c7);
      --brand-gradient: linear-gradient(135deg, var(--grad-from) 0%, var(--grad-via) 50%, var(--grad-to) 100%);
      --brand-gradient-hover: linear-gradient(135deg,
        color-mix(in srgb, var(--grad-from) 85%, white) 0%,
        color-mix(in srgb, var(--grad-via)  85%, white) 50%,
        color-mix(in srgb, var(--grad-to)   85%, white) 100%);
      --brand-shadow: 0 4px 20px -2px color-mix(in srgb, var(--grad-via) 40%, transparent);
      --brand-shadow-hover: 0 8px 30px -4px color-mix(in srgb, var(--grad-via) 60%, transparent);
      --focus-ring: 0 0 0 3px color-mix(in srgb, var(--brand-flat) 35%, transparent);
      --grad-border: color-mix(in srgb, var(--brand-flat) 30%, transparent);
    }
    .dark {
      --grad-from: color-mix(in srgb, var(--site-topbar-from, #1d4ed8) 75%, white);
      --grad-via:  color-mix(in srgb, var(--site-topbar-via,  #0284c7) 75%, white);
      --grad-to:   color-mix(in srgb, var(--site-topbar-to,   #4338ca) 75%, white);
      --brand-flat: color-mix(in srgb, var(--site-topbar-via, #0284c7) 80%, white);
    }

    .maint-page {
      min-height: 100vh;
      /* The dynamic height, so a phone's address bar does not leave a strip of
         empty page under the fold; the vh line above is the fallback for older
         browsers that have no unit for the visible box. */
      min-height: 100dvh;
      background: var(--background);
      color: var(--foreground);
      position: relative;
      overflow-x: hidden;
    }
    .maint-glow {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background:
        radial-gradient(circle 600px at 50% 0%, color-mix(in srgb, var(--grad-via) 15%, transparent), transparent 75%),
        radial-gradient(circle 500px at 80% 80%, color-mix(in srgb, var(--grad-to) 10%, transparent), transparent 70%);
    }
    .dark .maint-glow {
      background:
        radial-gradient(circle 700px at 50% -5%, color-mix(in srgb, var(--grad-via) 22%, transparent), transparent 80%),
        radial-gradient(circle 600px at 90% 70%, color-mix(in srgb, var(--grad-to) 14%, transparent), transparent 75%);
    }

    .maint-card {
      background: var(--surface-elevated, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 1.5rem;
      box-shadow: 0 4px 30px -4px rgba(0, 0, 0, 0.06);
      position: relative;
      overflow: hidden;
      transition: border-color .2s, box-shadow .2s;
    }
    .dark .maint-card {
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface, #131d2e) 88%, var(--brand-flat) 12%) 0%,
        color-mix(in srgb, var(--background, #0b0f19) 92%, var(--brand-flat) 8%) 100%
      );
      border: 1px solid color-mix(in srgb, var(--brand-flat) 24%, rgba(255, 255, 255, 0.08));
      box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.65), 0 0 24px -6px color-mix(in srgb, var(--brand-flat) 16%, transparent);
    }

    .btn-gradient {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.7rem 1.4rem;
      border-radius: 9999px;
      background: var(--brand-gradient);
      color: #ffffff;
      font-weight: 600;
      font-size: 0.875rem;
      border: 1px solid transparent;
      cursor: pointer;
      box-shadow: var(--brand-shadow);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
    }
    .btn-gradient:hover {
      background: var(--brand-gradient-hover);
      box-shadow: var(--brand-shadow-hover);
      transform: translateY(-1.5px);
    }
    .btn-gradient:active {
      transform: translateY(0) scale(0.98);
    }

    .btn-outline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 9999px;
      background: transparent;
      color: var(--brand-flat);
      border: 1.5px solid var(--brand-flat);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-outline:hover {
      background: color-mix(in srgb, var(--brand-flat) 10%, transparent);
      transform: translateY(-1px);
    }

    .social-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 9999px;
      background: color-mix(in srgb, var(--brand-flat) 10%, transparent);
      color: var(--brand-flat);
      border: 1px solid color-mix(in srgb, var(--brand-flat) 25%, transparent);
      transition: all 0.2s;
    }
    .social-btn:hover {
      background: var(--brand-gradient);
      color: #ffffff;
      transform: translateY(-2px) scale(1.06);
      box-shadow: var(--brand-shadow);
    }

    @keyframes pulseGlow {
      0%, 100% { opacity: 0.8; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(1.4); }
    }
    .pulse-dot {
      position: relative;
    }
    .pulse-dot::after {
      content: "";
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: inherit;
      animation: pulseGlow 2s infinite ease-in-out;
      opacity: 0.6;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="maint-page flex flex-col justify-between">
        {/* Ambient Glow */}
        <div className="maint-glow" aria-hidden />

        {/* ── Top Header Navigation ────────────────────────────────────── */}
        <header className="relative z-20 w-full border-b border-[var(--border-color)]/60 bg-[var(--surface)]/70 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Logo / Brand → home */}
            <Link
              href="/"
              aria-label={`${siteName} home`}
              className="flex items-center gap-3 cursor-pointer"
            >
              {hasLogo && activeLogo ? (
                <Image
                  src={activeLogo}
                  alt={siteName}
                  width={130}
                  height={38}
                  style={{ height: 38, width: "auto", objectFit: "contain" }}
                  unoptimized
                  priority
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shadow-md"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    {siteName.charAt(0)}
                  </div>
                  <span
                    className="font-extrabold text-xl tracking-tight text-[var(--foreground)]"
                    style={{
                      fontFamily: "var(--site-font-heading, sans-serif)",
                    }}
                  >
                    {siteName}
                  </span>
                </div>
              )}
            </Link>

            {/* Right actions: Live status, Theme toggle, Admin portal */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              {/* Real-time status badge */}
              <div
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-sm"
                style={{
                  background: isStoreBackLive
                    ? "color-mix(in srgb, #10b981 12%, transparent)"
                    : "color-mix(in srgb, var(--brand-flat) 10%, transparent)",
                  color: isStoreBackLive ? "#10b981" : "var(--brand-flat)",
                  borderColor: isStoreBackLive
                    ? "color-mix(in srgb, #10b981 25%, transparent)"
                    : "color-mix(in srgb, var(--brand-flat) 25%, transparent)",
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full pulse-dot ${
                    isStoreBackLive ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span>
                  {isStoreBackLive
                    ? "Store Online"
                    : "Maintenance Active"}
                </span>
                {pingLatency !== null && (
                  <span className="text-[10px] opacity-75 font-mono">
                    ({pingLatency}ms)
                  </span>
                )}
              </div>

              {/* Theme switch */}
              {mounted && (
                <button
                  type="button"
                  id="maint-theme-toggle"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  aria-label={
                    isDark ? "Switch to light mode" : "Switch to dark mode"
                  }
                  className="p-2 rounded-full text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors border border-[var(--border-color)]/60 cursor-pointer"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              )}

              {/* Staff / Admin Login Access */}
              <Link
                href="/auth/login"
                id="maint-admin-access-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-[var(--border-color)] text-[var(--foreground)] bg-[var(--surface-alt)] hover:border-[var(--brand-flat)] cursor-pointer"
                title="Admin / Staff Login"
              >
                <Shield className="w-3.5 h-3.5 text-[var(--brand-flat)]" />
                <span className="hidden sm:inline">Admin Login</span>
              </Link>
            </div>
          </div>
        </header>

        {/* ── Store Back Online Notification Banner ─────────────────────── */}
        {isStoreBackLive && (
          <div className="relative z-30 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg animate-in slide-in-from-top duration-300">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </div>
                <div>
                  <p className="font-bold text-sm">
                    Store is officially back online!
                  </p>
                  <p className="text-xs text-white/90">
                    System maintenance has concluded. Redirecting you in{" "}
                    <strong>{redirectCountdown ?? 3}</strong>s...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(fromPath)}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-emerald-800 hover:bg-white/90 shadow transition cursor-pointer shrink-0"
              >
                Enter Store Now →
              </button>
            </div>
          </div>
        )}

        {/* ── Main Content Hero ────────────────────────────────────────── */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
          <div className="w-full max-w-3xl mx-auto space-y-8">
            {/* Top Pill & Headline */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm uppercase border"
                style={{
                  background:
                    "color-mix(in srgb, var(--brand-flat) 12%, transparent)",
                  color: "var(--brand-flat)",
                  borderColor:
                    "color-mix(in srgb, var(--brand-flat) 28%, transparent)",
                }}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Scheduled Store Maintenance</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight"
                style={{
                  fontFamily: "var(--site-font-heading, sans-serif)",
                  color: "var(--foreground)",
                }}
              >
                We&apos;re upgrading for a{" "}
                <span
                  style={{
                    background: "var(--brand-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  brighter experience
                </span>
              </h1>

              <p className="text-base sm:text-lg max-w-xl text-[var(--foreground-muted)] leading-relaxed">
                {siteName} is currently undergoing scheduled performance and
                security improvements. All shopping data, orders and customer
                accounts remain safe and untouched.
              </p>
            </div>

            {/* ── System Status & Live Progress Card ───────────────────── */}
            <div className="maint-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]/60">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-[var(--foreground)]">
                      System Upgrade in Progress
                    </h2>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Live sync active • Auto-redirects when store re-opens
                    </p>
                  </div>
                </div>

                {/* Real-time check status button */}
                <button
                  type="button"
                  id="maint-check-status-btn"
                  onClick={() => checkStatus(true)}
                  disabled={checkingStatus}
                  className="btn-outline text-xs px-3.5 py-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      checkingStatus ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {checkingStatus ? "Pinging..." : "Check Live Status"}
                  </span>
                </button>
              </div>

              {/* Visual Pipeline Stages */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      Core Database
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Optimized & Verified
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3 relative overflow-hidden">
                  <Server className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      Performance Engine
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      In Progress (78%)
                    </p>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 h-0.5 w-3/4"
                    style={{ background: "var(--brand-gradient)" }}
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border-color)]/60 bg-[var(--surface-alt)]/50 flex items-start gap-3 opacity-75">
                  <Lock className="w-4 h-4 text-[var(--foreground-muted)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      Security & Storefront
                    </p>
                    <p className="text-[11px] text-[var(--foreground-muted)] font-medium">
                      Final Step Before Live
                    </p>
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[var(--foreground-muted)]">
                  <span>Upgrade Progress</span>
                  <span className="text-[var(--brand-flat)]">78% Completed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface-alt)] overflow-hidden border border-[var(--border-color)]/60">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: "78%",
                      background: "var(--brand-gradient)",
                      boxShadow: "0 0 10px var(--brand-flat)",
                    }}
                  />
                </div>
              </div>

              {lastCheckTime && (
                <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)] pt-2 border-t border-[var(--border-color)]/40">
                  <span>
                    Last server heartbeat:{" "}
                    {lastCheckTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    proxy active
                  </span>
                </div>
              )}
            </div>

            {/* ── Email Notification Card ──────────────────────────────── */}
            <div className="maint-card p-6 sm:p-8 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--brand-flat)]" />
                  <h2 className="font-bold text-base text-[var(--foreground)]">
                    Get Instant Notification When We Re-Open
                  </h2>
                </div>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Enter your email address and our system will alert you the
                  moment the store goes live.
                </p>
              </div>

              {submitted ? (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold animate-in fade-in"
                  style={{
                    background:
                      "color-mix(in srgb, var(--brand-flat) 10%, transparent)",
                    color: "var(--brand-flat)",
                    borderColor:
                      "color-mix(in srgb, var(--brand-flat) 25%, transparent)",
                  }}
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <p>You&apos;re subscribed!</p>
                    <p className="text-xs font-normal opacity-90">
                      We will notify <strong>{email}</strong> the exact instant
                      the store is live.
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  id="maint-notify-form"
                  onSubmit={handleNotifySubmit}
                  className="flex flex-col sm:flex-row gap-2.5"
                >
                  <input
                    type="email"
                    id="maint-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    required
                    className="flex-1 px-4 py-3 rounded-full text-sm outline-none transition-all bg-[var(--surface-alt)] text-[var(--foreground)] border border-[var(--border-color)] focus:border-[var(--brand-flat)] focus:ring-2 focus:ring-[var(--brand-flat)]/20"
                  />
                  <button
                    type="submit"
                    id="maint-notify-btn"
                    className="btn-gradient shrink-0"
                  >
                    <span>Notify Me</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* ── Need Immediate Assistance / Support Contacts ─────────── */}
            <div className="maint-card p-6 sm:p-8 space-y-5">
              <h2 className="font-bold text-base text-[var(--foreground)]">
                Need immediate customer support?
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href={`mailto:${supportEmail}`}
                  id="maint-email-link"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--border-color)]/60 bg-[var(--surface-alt)]/40 hover:border-[var(--brand-flat)] transition-all group no-underline"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      background:
                        "color-mix(in srgb, var(--brand-flat) 12%, transparent)",
                      color: "var(--brand-flat)",
                    }}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Email Customer Care
                    </p>
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                      {supportEmail}
                    </p>
                  </div>
                </a>

                <a
                  href={`tel:${supportPhone.replace(/\s/g, "")}`}
                  id="maint-phone-link"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--border-color)]/60 bg-[var(--surface-alt)]/40 hover:border-[var(--brand-flat)] transition-all group no-underline"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      background:
                        "color-mix(in srgb, var(--brand-flat) 12%, transparent)",
                      color: "var(--brand-flat)",
                    }}
                  >
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Toll-Free Phone Support
                    </p>
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                      {supportPhone}
                    </p>
                  </div>
                </a>
              </div>

              {/* {socialLinks.length > 0 && (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-color)]/40">
                  <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Follow updates on social
                  </span>
                  <div className="flex items-center gap-2">
                    {socialLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-btn"
                        title={link.platform}
                        aria-label={link.platform}
                      >
                        <SocialIcon platform={link.platform} />
                      </a>
                    ))}
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </main>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="relative z-10 py-6 border-t border-[var(--border-color)]/50 text-center text-xs text-[var(--foreground-muted)] space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className="text-[var(--brand-flat)] hover:underline font-semibold"
            >
              Staff Sign In
            </Link>
          </div>
          <p>
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            Protected by {siteName} Proxy Route Guard.
          </p>
        </footer>
      </div>
    </>
  );
}