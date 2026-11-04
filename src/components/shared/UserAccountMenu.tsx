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
  Home,
  Ban,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import UserAvatar from "./UserAvatar";
import { useDashboardRole } from "@/hooks/useDashboardRole";
import {
  WORKSPACE_HREFS,
  WORKSPACE_LABELS,
  WORKSPACE_ORDER_LABELS,
  WORKSPACE_ORDERS,
  WORKSPACE_PROFILES,
  WORKSPACE_SETTINGS,
  isStoreWorkspace,
  type WorkspaceRole,
} from "@/lib/core/roles";

/**
 * The profile menu, shared by the storefront header, the dashboard shell and
 * the storefront's mobile drawers - but the three are not the same job.
 *
 * `variant="storefront"` (the public site) also carries the Profile /
 * Dashboard / Orders / Settings links, because there is no sidebar out there
 * and this menu is the only door into a workspace.
 *
 * `variant="dashboard"` drops those links on purpose. Inside a dashboard the
 * sidebar already lists every screen, and each role's profile, orders and
 * settings are different screens under that role's own workspace - so the
 * honest way to reach them is to switch into that dashboard. The menu here
 * keeps just three things: who you are, which workspace to open, and how to
 * sign out.
 *
 * `layout` is how the same rows are hung: `dropdown` is the header popover
 * under the avatar, `panel` lays them out flat inside a drawer, where a
 * popover anchored to nothing would have nowhere to sit. Small screens used to
 * have no switcher at all because only the desktop row mounted this menu, so
 * the drawers now carry the same rows instead of a second, simpler account
 * card that could drift from them.
 *
 * The flat panel is the phone form, and it drops the shortcut rows: a phone
 * already carries a fixed bottom bar with Profile, Settings and Dashboard, so
 * listing them again inside the drawer is the same door twice in one screen.
 * Identity, the workspace switcher and signing out stay, because nothing else
 * on a small screen offers those.
 */
export type UserAccountMenuVariant = "storefront" | "dashboard";
export type UserAccountMenuLayout = "dropdown" | "panel";

/**
 * The words each dashboard is called, straight from the workspace table so the
 * menu, the header chip and the sidebar chip can never drift apart.
 */
const labelFor = (role: WorkspaceRole) => WORKSPACE_LABELS[role];

/**
 * The menu's own row order: buy, sell, deliver, run the store.
 *
 * Only the entries the account actually holds are offered further down, so this
 * is the shape of the list, not a promise about any one account.
 */
const WORKSPACE_ORDER: WorkspaceRole[] = ["customer", "vendor", "rider", "admin"];

/**
 * The chip words for an approved entry.
 *
 * The seller entry is called "Seller" everywhere the account can read it, and
 * the sandbox admin says so, because "vendor" and "demoadmin" are database
 * values, not UI copy.
 */
const chipLabel = (role: string) =>
  (WORKSPACE_LABELS as Record<string, string | undefined>)[role] ??
  role.charAt(0).toUpperCase() + role.slice(1);

const iconFor = (role: WorkspaceRole) => {
  if (role === "rider") return <Bike className="w-4 h-4" />;
  if (role === "vendor") return <Store className="w-4 h-4" />;
  if (role === "admin") return <ShieldCheck className="w-4 h-4" />;
  return <ShoppingBag className="w-4 h-4" />;
};

export default function UserAccountMenu({
  variant = "storefront",
  layout = "dropdown",
  onNavigate,
}: {
  variant?: UserAccountMenuVariant;
  layout?: UserAccountMenuLayout;
  /** Lets the drawer that hosts the panel close itself once a row is followed. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { isPending } = authClient.useSession();
  // The workspace comes from the URL, with the session only filling in on
  // screens that are not inside a dashboard at all. That is what lets this menu
  // say "Rider dashboard" while the reader is looking at the rider dashboard,
  // instead of repeating a session hint that has not caught up yet.
  const { user, workspace, label, heldRoles, suspendedRoles, canEnter } = useDashboardRole();

  // The rows to offer: every dashboard the account was approved for, in a fixed
  // order. An entry the account does not hold is not listed at all, and one the
  // store team parked stays in the list but greyed out, so it is obvious the
  // door is closed rather than missing.
  const targets = WORKSPACE_ORDER.filter((role) =>
    role === "admin"
      ? heldRoles.includes("admin") || heldRoles.includes("demoadmin")
      : heldRoles.includes(role)
  );
  const canShop = heldRoles.includes("customer");

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

  // Folding the menu away is one action, but in a drawer it also has to fold
  // the drawer away: a row that navigates behind an open panel leaves the user
  // staring at a menu they already used.
  const closeMenu = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await authClient.signOut();
      closeMenu();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Failed to log out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * Changing dashboard is a navigation, not a transaction.
   *
   * It used to be a two-step call: write the account's active-role hint through
   * the store API, then move. When the API refused — a suspended entry, a role
   * an admin had just revoked, a session that had not refreshed — the refusal
   * came back as an error toast and the reader stayed where they were, with no
   * way to reach a dashboard they genuinely hold. The URL is the dashboard now,
   * so the menu only has to point at it. The hint is re-written afterwards by
   * the shell's own sync, which cannot block the move.
   */
  const goToWorkspace = (role: WorkspaceRole) => {
    if (role === workspace) {
      closeMenu();
      return;
    }
    if (!canEnter(role)) {
      toast.error(
        suspendedRoles.includes(role)
          ? `Your ${labelFor(role)} dashboard is suspended by the store team`
          : `This account has no ${labelFor(role)} dashboard`
      );
      return;
    }
    closeMenu();
    router.push(WORKSPACE_HREFS[role]);
  };

  // Loading state placeholder
  if (isPending) {
    return layout === "panel" ? (
      <div className="h-16 rounded-2xl bg-[var(--surface-alt)] animate-pulse" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-[var(--surface-alt)] dark:bg-[var(--surface)] animate-pulse shrink-0" />
    );
  }

  // Not logged in -> Clean Sign In Button
  if (!user) {
    if (layout === "panel") {
      return (
        <Link
          href="/auth/login"
          onClick={closeMenu}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-xs font-bold text-[var(--foreground)] hover:border-primary/40 transition-colors"
        >
          <span className="w-9 h-9 rounded-full bg-[var(--surface-alt)] flex items-center justify-center text-[var(--foreground-muted)] shrink-0">
            <User className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">Sign in</span>
            <span className="block text-[10px] font-semibold text-[var(--foreground-muted)]">
              Orders, wishlist and your dashboards
            </span>
          </span>
        </Link>
      );
    }

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

  // Where the storefront dropdown's shortcut rows land. Each one follows the
  // workspace on screen, so an approved rider clicking Profile gets the rider
  // profile rather than the buyer one. The dashboard variant renders none of
  // these. `/dashboard/profile` and `/dashboard/settings` are only redirect
  // pages for old links, so they are named directly here instead.
  const profileHref = WORKSPACE_PROFILES[workspace];
  // The dropdown's own "Dashboard" row lands on the workspace being read.
  const dashboardHref = WORKSPACE_HREFS[workspace];
  const settingsHref = WORKSPACE_SETTINGS[workspace];
  const ordersHref = WORKSPACE_ORDERS[workspace];
  const ordersLabel = WORKSPACE_ORDER_LABELS[workspace];

  // The avatar button that opens the popover. The drawers do not need it: they
  // lay the same rows out flat, with nothing to anchor a popover to.
  const trigger = (
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
            {label}
          </p>
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
    </button>
  );

  // Every row of the menu in one place, so the desktop popover and the mobile
  // drawers can never disagree about what this account is allowed to do.
  const menuRows = (
    <>
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

            {/* The account's approved entries, with the dashboard currently on
                screen filled in. The highlight follows the URL, because that is
                the dashboard the reader is standing in — not whichever hint the
                session happens to be carrying. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {heldRoles.length === 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  Customer
                </span>
              ) : (
                heldRoles.map((role) => {
                  const here =
                    role === workspace ||
                    (isStoreWorkspace(workspace) && (role === "admin" || role === "demoadmin"));
                  return (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        here
                          ? "bg-primary text-white border-primary"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {here ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <ShieldCheck className="w-3 h-3 text-primary" />
                      )}
                      {chipLabel(role)}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Storefront shortcuts. Out here there is no sidebar, so this
              dropdown is the only way into a workspace. Inside a dashboard the
              sidebar owns those screens and the block is skipped, leaving the
              menu as identity + switcher + logout. The phone panel skips it too,
              for a different piece of furniture: the fixed bottom bar already
              lists those destinations, so a drawer repeating them is one more
              thing to scroll past for nothing. */}
          {variant === "storefront" && layout === "dropdown" && (
            <div className="py-1.5 px-1.5 space-y-0.5 text-xs font-medium text-[var(--foreground)]">
              {/* Profile */}
              <Link
                href={profileHref}
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
              >
                <User className="w-4 h-4 text-[var(--foreground-muted)]" />
                <span>Profile</span>
              </Link>

              {/* Dashboard */}
              <Link
                href={dashboardHref}
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[var(--foreground-muted)]" />
                <span>Dashboard</span>
              </Link>

              {/* Orders / Deliveries */}
              <Link
                href={ordersHref}
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-[var(--foreground-muted)]" />
                <span>{ordersLabel}</span>
              </Link>

              {/* Settings */}
              <Link
                href={settingsHref}
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
              >
                <Settings className="w-4 h-4 text-[var(--foreground-muted)]" />
                <span>Settings</span>
              </Link>
            </div>
          )}

          {/* Dashboard switcher — only surfaces when the account holds more than
              one dashboard, so a plain customer is never offered doors that go
              to an application form. */}
          {targets.length > 1 && (
            <div className="py-1.5 px-1.5 border-t border-[var(--border-color)]/80 space-y-0.5">
              <p className="flex items-center gap-1.5 px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                <Repeat className="w-3 h-3" />
                Switch dashboard
              </p>

              {targets.map((role) => {
                const here = role === workspace;
                const parked = !canEnter(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => goToWorkspace(role)}
                    disabled={parked}
                    title={
                      parked
                        ? "This dashboard is suspended by the store team"
                        : here
                          ? "This is the dashboard you are using"
                          : undefined
                    }
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${
                      parked
                        ? "text-[var(--foreground-muted)]/60"
                        : here
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-[var(--surface-alt)] hover:text-primary"
                    }`}
                  >
                    {parked ? (
                      <Ban className="w-4 h-4 text-rose-500/70" />
                    ) : (
                      <span className="text-[var(--foreground-muted)]">{iconFor(role)}</span>
                    )}
                    <span className="flex-1 text-left">{labelFor(role)} dashboard</span>
                    {parked ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Suspended
                      </span>
                    ) : (
                      here && <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>
                );
              })}

              {/* Shopping lives on the storefront, so the menu carries a door
                  back to it for every account that can buy. */}
              {canShop && (
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-alt)] hover:text-primary transition-colors"
                >
                  <Home className="w-4 h-4 text-[var(--foreground-muted)]" />
                  <span>Go to storefront</span>
                </Link>
              )}
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
    </>
  );

  // The drawer's flat form: the same rows, no popover, inside the card the
  // host already frames.
  if (layout === "panel") {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-xs overflow-hidden">
        {menuRows}
      </div>
    );
  }

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {trigger}

      {/* Dropdown Menu Panel

          `w-72` with the panel hung off the right edge: on a narrow phone the
          box would run past the left edge of the screen and get clipped there,
          which is where the role switcher lives. The cap keeps the whole panel
          inside the viewport without moving its right edge. */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[var(--surface-elevated)] rounded-2xl shadow-xl border border-[var(--border-color)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right overflow-hidden"
          role="menu"
        >
          {menuRows}
        </div>
      )}
    </div>
  );
}
