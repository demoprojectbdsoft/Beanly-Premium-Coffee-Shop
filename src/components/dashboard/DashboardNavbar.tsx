"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Search, Menu, Sun, Moon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import CartButton from "@/components/shared/CartButton";
import UserAccountMenu from "@/components/shared/UserAccountMenu";
import NotificationBell from "@/components/dashboard/NotificationBell";
import type { NotificationView } from "@/lib/notifications";
import { canShop, roleOf, resolveActiveRole } from "@/lib/core/roles";

import { useTheme } from "next-themes";

interface DashboardNavbarProps {
  onToggleSidebar: () => void;
}

export default function DashboardNavbar({ onToggleSidebar }: DashboardNavbarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // next-themes leaves resolvedTheme undefined until the browser has read the
  // saved theme, so this doubles as the "mounted" flag without an effect.
  const isThemeKnown = resolvedTheme !== undefined;
  const pathname = usePathname();

  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isRiderRoute = pathname.startsWith("/dashboard/rider");
  const isVendorRoute = pathname.startsWith("/dashboard/vendor");
  // The session's role hint can trail a just-switched dashboard, so the route
  // itself is the fallback: the header can never say "Customer" over the rider
  // workspace it is rendering. Better-auth types the user without the role
  // fields the API writes onto the same row, so they are read through a cast.
  const roleUser = user as
    | { role?: string | null; activeRole?: string | null; roles?: string[] | string | null }
    | undefined;
  const sessionRole = resolveActiveRole(roleUser);
  const routeRole = isRiderRoute ? "rider" : isVendorRoute ? "vendor" : "";
  const userRole =
    routeRole && (routeRole === sessionRole || !sessionRole) ? routeRole : sessionRole || routeRole;
  // The store's feed names other people's orders and accounts, which is why it
  // is the store's own board and not something a customer could ever read.
  const isAdminView = userRole === "admin" || userRole === "demoadmin";
  // One bell for every role: the view only decides the copy and the links, the
  // API decides whose lines come back. A seller workspace reuses it as is.
  const notificationView: NotificationView = isAdminView
    ? "store"
    : userRole === "rider"
      ? "rider"
      : userRole === "vendor"
        ? "vendor"
        : "customer";
  // The switcher menu wants the dashboard the header is actually showing, so a
  // stale session hint is corrected with the route before it reaches canShop.
  const canUserShop = canShop({ activeRole: userRole, role: roleOf(roleUser) || null, roles: roleUser?.roles ?? null });

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

        <div className="relative w-48 sm:w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search orders, products, items..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface-alt)]/60 hover:bg-[var(--surface-alt)] border border-[var(--border-color)] focus:border-[var(--brand-flat)] focus:ring-2 focus:ring-[var(--brand-flat)]/35 rounded-xl text-xs focus:outline-none focus:bg-[var(--surface-elevated)] transition-all placeholder:text-[var(--foreground-muted)] text-[var(--foreground)]"
          />
        </div>
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

        {/* Cart Item Count & Dollar Total — buyers only */}
        {canUserShop && (
          <CartButton
            showTotal={true}
            className="px-2 py-1.5 rounded-xl hover:bg-[var(--surface-alt)] transition-colors"
          />
        )}

        <div className="h-5 w-px bg-[var(--border-color)] hidden sm:block" />

        {/* Profile + dashboard switcher — the same menu the storefront carries,
            so every approved profile is one click away from any workspace. */}
        <UserAccountMenu />
      </div>
    </header>
  );
}
