"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  PackageCheck,
  Navigation,
  History,
  Wallet,
  Bell,
  User,
  Settings,
  ChevronRight,
  X,
  ArrowLeft,
  LogOut,
  Bike,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import SparqLogo from "@/components/shared/SparqLogo";

/**
 * The rider's own dashboard navigation. Grouped the same way as the admin
 * sidebar: the work first, the account second.
 */
const RIDER_NAV_GROUPS = [
  {
    title: "Deliveries",
    items: [
      { name: "Overview", href: "/dashboard/rider", icon: LayoutDashboard },
      { name: "Delivery Requests", href: "/dashboard/rider/requests", icon: Inbox },
      { name: "My Deliveries", href: "/dashboard/rider/deliveries", icon: PackageCheck },
      { name: "Active Delivery", href: "/dashboard/rider/active", icon: Navigation },
      { name: "Delivery History", href: "/dashboard/rider/history", icon: History },
    ],
  },
  {
    title: "Account",
    items: [
      { name: "Earnings", href: "/dashboard/rider/earnings", icon: Wallet },
      { name: "Notifications", href: "/dashboard/rider/notifications", icon: Bell },
      { name: "Profile", href: "/dashboard/rider/profile", icon: User },
      { name: "Settings", href: "/dashboard/rider/settings", icon: Settings },
    ],
  },
];

interface RiderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RiderSidebar({ isOpen, onClose }: RiderSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const rider = session?.user as { name?: string; email?: string; availability?: string } | undefined;

  // Live availability, so the sidebar says the same thing the profile page
  // does. `useSession()` is a shared reactive store: the profile page
  // refetches it after a toggle and this badge updates with it.
  const availability = rider?.availability || "online";

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.push("/auth/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[var(--surface)]/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-[var(--surface-elevated)] border-r border-[var(--border-color)] flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out shadow-xs ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparqLogo size="sm" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)] bg-[var(--brand-flat)]/10 border border-[var(--brand-flat)]/25 px-2 py-0.5 rounded-md shadow-2xs">
                Rider
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Sidebar"
              className="lg:hidden p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {RIDER_NAV_GROUPS.map((group) => (
            <nav key={group.title} className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-3 mb-2 opacity-75">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard/rider" ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs font-bold border border-transparent"
                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border-color)]/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 stroke-[2]" />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                  </Link>
                );
              })}
            </nav>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--surface-alt)]">
          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-[var(--on-grad-text)] shadow-xs shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[var(--foreground)] leading-none truncate">
                  {rider?.name || "Rider"}
                </p>
                <p className="text-[10px] font-semibold mt-1 flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      availability === "offline" ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  <span className={availability === "offline" ? "text-rose-500" : "text-[var(--brand-flat)]"}>
                    {availability === "offline" ? "Offline" : "Online"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--foreground)] hover:text-[var(--brand-flat)] hover:bg-[var(--brand-flat)]/10 border border-[var(--border-color)] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
