"use client";

import React from "react";
import { Search, Menu, Sun, Moon } from "lucide-react";
import CartButton from "@/components/shared/CartButton";
import UserAccountMenu from "@/components/shared/UserAccountMenu";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { useDashboardRole } from "@/hooks/useDashboardRole";

import { useTheme } from "next-themes";

interface DashboardNavbarProps {
  onToggleSidebar: () => void;
}

export default function DashboardNavbar({ onToggleSidebar }: DashboardNavbarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // next-themes leaves resolvedTheme undefined until the browser has read the
  // saved theme, so this doubles as the "mounted" flag without an effect.
  const isThemeKnown = resolvedTheme !== undefined;

  // One reader of the workspace for the whole header: the label, the bell's
  // copy and links, and whether the basket belongs here all come from the same
  // URL-first answer, so nothing in this bar can disagree with the page.
  const { label, notificationView, showsCart } = useDashboardRole();

  const isDark = (resolvedTheme || theme) === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <header className="h-16 w-full border-b border-[var(--border-color)] bg-[var(--surface-elevated)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Mobile Hamburger & Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          className="lg:hidden p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] hover:border-[var(--brand-flat)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35 transition-all shadow-2xs cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search lives on every desk that has room for it. On phones the bar is
            already carrying the hamburger, the bell, the basket and the avatar,
            and a dead-wide input is what pushes the page into a sideways
            scroll — so it is hidden below the small breakpoint, not shrunk. */}
        <div className="relative hidden sm:block w-48 md:w-64 lg:w-80 min-w-0 max-w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search orders, products, items..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface-alt)]/60 hover:bg-[var(--surface-alt)] border border-[var(--border-color)] focus:border-[var(--brand-flat)] focus:ring-2 focus:ring-[var(--brand-flat)]/35 rounded-xl text-xs focus:outline-none focus:bg-[var(--surface-elevated)] transition-all placeholder:text-[var(--foreground-muted)] text-[var(--foreground)]"
          />
        </div>

        {/* Which dashboard this is, in words the reader can trust. The URL and
            this chip are computed from the same path, so the rider workspace
            can never be labelled "Customer" again. */}
        <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)] bg-[var(--brand-flat)]/10 border border-[var(--brand-flat)]/25 px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap">
          {label} dashboard
        </span>
      </div>

      {/* Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Switcher Toggle */}
        {isThemeKnown && (
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--brand-flat)] hover:border-[var(--brand-flat)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35 transition-all shadow-2xs cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--brand-flat)] transition-transform hover:-rotate-12" />
            )}
          </button>
        )}

        {/* Notifications — one bell for every role; the view decides the copy
            and the links, the API decides whose lines are read. */}
        <NotificationBell view={notificationView} />

        {/* Cart Item Count & Dollar Total — buyers only, and only on the buyer
            dashboard. A vendor who also buys does not see their basket while
            they are running their shop. */}
        {showsCart && (
          <CartButton
            showTotal={true}
            className="px-2 py-1.5 rounded-xl hover:bg-[var(--surface-alt)] transition-colors"
          />
        )}

        <div className="h-5 w-px bg-[var(--border-color)] hidden sm:block" />

        {/* Identity + dashboard switcher + logout. The dashboard variant
            deliberately omits the storefront's Profile / Dashboard / Orders /
            Settings shortcuts, because the sidebar already owns those screens
            and each role's profile and settings live under that role's own
            workspace - the way to reach them is to switch dashboards here. */}
        <UserAccountMenu variant="dashboard" />
      </div>
    </header>
  );
}
