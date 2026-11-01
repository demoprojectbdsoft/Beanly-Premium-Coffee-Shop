"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Bike,
  Store,
  Repeat,
  Check,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import UserAvatar from "./UserAvatar";
import { setActiveRole } from "@/lib/action/user";

/**
 * The profile dropdown.
 *
 * Beyond the usual profile / orders / settings links it now carries the
 * dashboard switcher. Every workspace the account has been approved for
 * appears as its own row, and picking one calls the store API and reloads the
 * shell. A single-role account sees the switcher collapsed to one disabled
 * row, so the pattern is stable across every visitor.
 */

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  activeRole?: string | null;
  roles?: string[] | string | null;
  vendorStatus?: string | null;
  riderStatus?: string | null;
};

const normaliseRoles = (user: SessionUser | undefined): string[] => {
  if (!user) return [];
  const raw = user.roles;
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string" && raw.length > 0
      ? raw.split(",")
      : [user.activeRole, user.role];
  const seen = new Set<string>();
  for (const entry of list) {
    const value = typeof entry === "string" ? entry.toLowerCase().trim() : "";
    if (value) seen.add(value);
  }
  return Array.from(seen);
};

const labelFor = (role: string) =>
  role === "demoadmin"
    ? "Demo admin"
    : role.charAt(0).toUpperCase() + role.slice(1);

const homeFor = (role: string) => {
  if (role === "rider") return "/dashboard/rider";
  if (role === "vendor") return "/dashboard/vendor";
  if (role === "admin" || role === "demoadmin") return "/dashboard/admin";
  return "/";
};

const iconFor = (role: string) => {
  if (role === "rider") return <Bike className="w-4 h-4" />;
  if (role === "vendor") return <Store className="w-4 h-4" />;
  if (role === "admin" || role === "demoadmin") return <ShieldCheck className="w-4 h-4" />;
  return <ShoppingBag className="w-4 h-4" />;
};

export default function UserAccountMenu() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user as SessionUser | undefined;

  const allRoles = normaliseRoles(user);
  const activeRole =
    String(user?.activeRole || user?.role || "").toLowerCase() ||
    allRoles[0] ||
    "customer";
  // The customer entry never appears as a "dashboard" — a plain customer lives
  // on the storefront. Switching to it means going home.
  const dashboards = allRoles.filter((role) => role !== "customer");
  const canShop = allRoles.includes("customer");

  const userImage = user?.image || (user as { avatar?: string })?.avatar;
  const firstName = user?.name ? user.name.split(" ")[0] : "Account";

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await authClient.signOut();
      setIsOpen(false);
      toast.success("Logged out successfully");
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Failed to log out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSwitch = async (role: string) => {
    if (switching || role === activeRole) return;
    setSwitching(role);
    try {
      const result = await setActiveRole(role);
      if (result?.success === false) {
        toast.error(result.message || "Could not switch dashboard");
      } else {
        toast.success(`Switched to ${labelFor(role)}`);
        router.push(homeFor(role));
        router.refresh();
      }
    } catch (err) {
      console.error("Role switch failed:", err);
      toast.error("Could not switch dashboard");
    } finally {
      setSwitching(null);
      setIsOpen(false);
    }
  };

  // Loading state placeholder
  if (isPending) {
    return (
      <div className="w-8 h-8 rounded-full bg-[var(--surface-alt)] dark:bg-[var(--surface)] animate-pulse shrink-0" />
    );
  }

  // Not logged in -> Clean Sign In Button
  if (!user) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/auth/login"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--foreground-secondary)] dark:text-[var(--foreground)] hover:text-primary dark:hover:text-primary hover:bg-[var(--surface-alt)] transition-all cursor-pointer"
        >
          <User className="w-4 h-4 text-[var(--foreground-muted)]" />
          <span>Sign In</span>
        </Link>
      </div>
    );
  }

  const profileHref =
    activeRole === "rider"
      ? "/dashboard/rider/profile"
      : activeRole === "vendor"
        ? "/dashboard/vendor/profile"
        : "/dashboard/profile";
  const dashboardHref = homeFor(activeRole);
  const settingsHref =
    activeRole === "rider"
      ? "/dashboard/rider/settings"
      : activeRole === "vendor"
        ? "/dashboard/vendor/settings"
        : "/dashboard/settings";
  const ordersHref =
    activeRole === "admin" || activeRole === "demoadmin"
      ? "/dashboard/admin/orders"
      : activeRole === "rider"
        ? "/dashboard/rider/deliveries"
        : activeRole === "vendor"
          ? "/dashboard/vendor/orders"
          : canShop
            ? "/dashboard/customer/orders"
            : "#";
  const ordersLabel =
    activeRole === "rider"
      ? "Deliveries"
      : activeRole === "vendor"
        ? "Store orders"
        : "Orders";

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Dropdown Toggle Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="User Account Menu"
        className={`flex items-center gap-2.5 p-1 pl-1 pr-2.5 rounded-full border transition-all duration-200 cursor-pointer select-none group ${
          isOpen
            ? "border-primary/50 bg-primary/10 shadow-xs"
            : "border-[var(--border-color)] hover:border-primary/40 bg-[var(--surface-elevated)]"
        }`}
      >
        {/* Avatar badge — the photo when it loads, the initial when it cannot */}
        <UserAvatar
          src={userImage}
          name={user.name || "User"}
          size={28}
          className="rounded-full bg-primary text-white text-xs shadow-xs"
        />

        {/* Name & Role preview */}
        <div className="text-left hidden lg:block leading-tight">
          <p className="text-xs font-bold text-[var(--foreground)] truncate max-w-[90px]">
            {firstName}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)] capitalize">
            {labelFor(activeRole)}
          </p>
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-[var(--surface-elevated)] rounded-2xl shadow-xl border border-[var(--border-color)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right overflow-hidden"
          role="menu"
        >
          {/* Header section with User info */}
          <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--surface-alt)]">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={userImage}
                name={user.name || "User"}
                size={40}
                className="rounded-full bg-primary text-white text-sm shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--foreground)] truncate">
                  {user.name || "User"}
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {allRoles.length === 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  Customer
                </span>
              ) : (
                allRoles.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      role === activeRole
                        ? "bg-primary text-white border-primary"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {role === activeRole ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-primary" />
                    )}
                    {labelFor(role)}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Navigation items */}
          <div className="py-1.5 px-1.5 space-y-0.5 text-xs font-medium text-[var(--foreground)]">
            {/* Profile */}
            <Link
              href={profileHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
            >
              <User className="w-4 h-4 text-[var(--foreground-muted)]" />
              <span>Profile</span>
            </Link>

            {/* Dashboard */}
            <Link
              href={dashboardHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-[var(--foreground-muted)]" />
              <span>Dashboard</span>
            </Link>

            {/* Orders / Deliveries */}
            {ordersHref !== "#" && (
              <Link
                href={ordersHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-[var(--foreground-muted)]" />
                <span>{ordersLabel}</span>
              </Link>
            )}

            {/* Settings */}
            <Link
              href={settingsHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
            >
              <Settings className="w-4 h-4 text-[var(--foreground-muted)]" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Dashboard switcher — only surfaces when the account has more than
              one approved authority. */}
          {dashboards.length > 0 && (
            <div className="py-1.5 px-1.5 border-t border-[var(--border-color)]/80 space-y-0.5">
              <p className="flex items-center gap-1.5 px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                <Repeat className="w-3 h-3" />
                Switch dashboard
              </p>

              {canShop && (
                <button
                  type="button"
                  onClick={() => handleSwitch("customer")}
                  disabled={switching !== null || activeRole === "customer"}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    activeRole === "customer"
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-[var(--surface-alt)] hover:text-primary"
                  }`}
                >
                  {switching === "customer" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--foreground-muted)]" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-[var(--foreground-muted)]" />
                  )}
                  <span className="flex-1 text-left">Customer storefront</span>
                  {activeRole === "customer" && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              )}

              {dashboards.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSwitch(role)}
                  disabled={switching !== null || role === activeRole}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    role === activeRole
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-[var(--surface-alt)] hover:text-primary"
                  }`}
                >
                  {switching === role ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--foreground-muted)]" />
                  ) : (
                    <span className="text-[var(--foreground-muted)]">{iconFor(role)}</span>
                  )}
                  <span className="flex-1 text-left capitalize">
                    {labelFor(role)} dashboard
                  </span>
                  {role === activeRole && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Logout button */}
          <div className="p-1.5 border-t border-[var(--border-color)]/80">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <LogOut className="w-4 h-4 shrink-0" />
              )}
              <span>{isLoggingOut ? "Signing out..." : "Log Out"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
