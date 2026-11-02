"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronRight,
  CreditCard,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import SparqLogo from "@/components/shared/SparqLogo";

/**
 * The vendor's workspace navigation.
 *
 * It starts small on purpose: the store overview, the orders, the store
 * profile, the catalogue and the seller feed. Promotions and coupons join this
 * list as their screens arrive, so no link here ever opens a page that does not
 * exist.
 *
 * The second group is the seller's own buyer side. An approved vendor keeps the
 * account they shopped from before, so their wishlist and personal orders are
 * one click away rather than a URL they have to remember.
 */
const VENDOR_NAV_GROUPS = [
  {
    title: "Store",
    items: [
      { name: "Overview", href: "/dashboard/vendor", icon: LayoutDashboard },
      { name: "Orders", href: "/dashboard/vendor/orders", icon: ShoppingBag },
      { name: "Products", href: "/dashboard/vendor/products", icon: Package },
      { name: "Analytics", href: "/dashboard/vendor/analytics", icon: BarChart3 },
      { name: "Coupons", href: "/dashboard/vendor/coupons", icon: Ticket },
      { name: "Promotions", href: "/dashboard/vendor/promotions", icon: Sparkles },
      { name: "Store Profile", href: "/dashboard/vendor/profile", icon: Store },
      { name: "Plan & Billing", href: "/dashboard/vendor/subscription", icon: CreditCard },
      { name: "Notifications", href: "/dashboard/vendor/notifications", icon: Bell },
      { name: "Settings", href: "/dashboard/vendor/settings", icon: Settings },
    ],
  },
  {
    title: "Your Shopping",
    items: [
      { name: "Buyer Dashboard", href: "/dashboard/customer", icon: LayoutDashboard },
      { name: "My Orders", href: "/dashboard/customer/orders", icon: ShoppingBag },
      { name: "Wishlist", href: "/dashboard/customer/wishlist", icon: Heart },
    ],
  },
];

interface VendorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorSidebar({ isOpen, onClose }: VendorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const vendor = session?.user as { name?: string; email?: string } | undefined;

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
                Vendor
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

          {VENDOR_NAV_GROUPS.map((group) => (
            <nav key={group.title} className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-3 mb-2 opacity-75">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                // A workspace root owns its bare path, so it must not stay
                // active while a deeper page in the same workspace is open.
                const isWorkspaceRoot =
                  item.href === "/dashboard/vendor" || item.href === "/dashboard/customer";
                const isActive = isWorkspaceRoot
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

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
          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-[var(--on-grad-text)] shadow-xs shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[var(--foreground)] leading-none truncate">
                {vendor?.name || "Your store"}
              </p>
              <p className="text-[10px] text-[var(--brand-flat)] font-semibold mt-1">
                Vendor account
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--foreground)] hover:text-[var(--brand-flat)] hover:bg-[var(--brand-flat)]/10 border border-[var(--border-color)] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Shop as a customer</span>
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
