"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, UserCircle, Settings, LayoutDashboard } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useDashboardRole } from "@/hooks/useDashboardRole";
import {
  WORKSPACE_HREFS,
  WORKSPACE_PROFILES,
  WORKSPACE_SETTINGS,
} from "@/lib/core/roles";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { data: session } = authClient.useSession();
  const user = session?.user;
  // The same URL-first answer the header and the sidebars use, so the three
  // shortcuts at the bottom of a phone cannot point at a different dashboard
  // than the page the reader is actually on.
  const { workspace } = useDashboardRole();

  // Auth-aware hrefs
  const profileHref = user ? WORKSPACE_PROFILES[workspace] : "/auth/login";
  const settingsHref = user ? WORKSPACE_SETTINGS[workspace] : "/auth/login";
  const dashboardHref = user ? WORKSPACE_HREFS[workspace] : "/auth/login";

  const NAV_ITEMS = [
    { label: "Home", href: "/", icon: Home },
    { label: "Shop", href: "/shop", icon: ShoppingBag },
    { label: "Profile", href: profileHref, icon: UserCircle },
    { label: "Settings", href: settingsHref, icon: Settings },
    { label: "Dashboard", href: dashboardHref, icon: LayoutDashboard },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--surface-elevated)]/90 backdrop-blur-lg border-t border-[var(--border-color)] shadow-[0_-4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.3)] transition-colors duration-200"
    >
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-around relative">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.label}
              className="relative flex flex-col items-center justify-center flex-1"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Floating Name Tooltip on Hover */}
              <div
                className={`absolute -top-9 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-color)] text-[11px] font-semibold tracking-wide pointer-events-none transition-all duration-200 shadow-md whitespace-nowrap z-50 flex items-center justify-center ${
                  isHovered
                    ? "opacity-100 -translate-y-1 scale-100"
                    : "opacity-0 translate-y-1 scale-90"
                }`}
              >
                <span>{item.label}</span>
                {/* Arrow pointer */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--border-color)]" />
              </div>

              {/* Navigation Link */}
              <Link
                href={item.href}
                className={`relative flex flex-col items-center justify-center w-full py-1.5 px-1 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "text-primary dark:text-primary"
                    : "text-[var(--foreground-muted)] hover:text-primary active:scale-95"
                }`}
              >
                <div
                  className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 dark:bg-primary/20 shadow-xs"
                      : "hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? "scale-110 stroke-[2.2]" : "stroke-[1.8]"
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>

                <span
                  className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-all duration-200 ${
                    isActive
                      ? "font-bold text-primary dark:text-primary"
                      : "text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
