"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  X,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import SparqLogo from "@/components/shared/SparqLogo";

/**
 * The vendor's workspace navigation.
 *
 * Grouped the same way as the admin and rider sidebars: the overview leads on
 * its own, then the groups run from the day's work (sales, then the shop
 * itself) and end with the account.
 *
 * Only the seller's own pages are listed. The buyer side of the same account —
 * personal orders, wishlist — lives in the customer dashboard, and the way to
 * reach it is the account menu's dashboard switch, which changes the whole
 * shell rather than slipping one foreign link into this one. A sidebar that
 * mixes two dashboards is how a seller ends up not knowing which shop they are
 * editing.
 */
const OVERVIEW_ITEM = {
  name: "Overview",
  href: "/dashboard/vendor",
  icon: LayoutDashboard,
};

const NAV_GROUPS: { title: string; items: { name: string; href: string; icon: LucideIcon }[] }[] = [
  {
    title: "Store",
    items: [
      { name: "Products", href: "/dashboard/vendor/products", icon: Package },
      { name: "Store Profile", href: "/dashboard/vendor/profile", icon: Store },
    ],
  },
  {
    title: "Sales & Marketing",
    items: [
      { name: "Orders", href: "/dashboard/vendor/orders", icon: ShoppingBag },
      { name: "Warranties", href: "/dashboard/vendor/warranties", icon: ShieldCheck },
      { name: "Analytics", href: "/dashboard/vendor/analytics", icon: BarChart3 },
      { name: "Coupons", href: "/dashboard/vendor/coupons", icon: Ticket },
      { name: "Promotions", href: "/dashboard/vendor/promotions", icon: Sparkles },
    ],
  },
  {
    title: "Account",
    items: [
      { name: "Plan & Billing", href: "/dashboard/vendor/subscription", icon: CreditCard },
      { name: "Notifications", href: "/dashboard/vendor/notifications", icon: Bell },
      { name: "Settings", href: "/dashboard/vendor/settings", icon: Settings },
    ],
  },
];

interface SidebarLinkProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  onClose: () => void;
}

/** One menu row. The grouped links and the overview share it, so they look the same. */
function SidebarLink({ name, href, icon: Icon, isActive, onClose }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
        isActive
          ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs font-bold border border-transparent"
          : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border-color)]/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 stroke-[2]" />
        <span>{name}</span>
      </div>
      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
    </Link>
  );
}

interface VendorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorSidebar({ isOpen, onClose }: VendorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const vendor = session?.user as { name?: string; email?: string } | undefined;

  // The overview is the parent of every other vendor page, so it only counts as
  // active on its own path. The rest stay highlighted on their sub-pages, such
  // as /dashboard/vendor/orders/123.
  const isActiveLink = (href: string) =>
    href === "/dashboard/vendor"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

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

      {/* `h-[100dvh]` and a scroll area that takes the height left over: on a
          phone a 100vh column is taller than the visible screen, so the footer
          fell below the fold and could not be reached. */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 max-w-[85vw] h-[100dvh] bg-[var(--surface-elevated)] border-r border-[var(--border-color)] flex flex-col shrink-0 transition-transform duration-300 ease-in-out shadow-xs ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <SparqLogo size="sm" />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)] bg-[var(--brand-flat)]/10 border border-[var(--brand-flat)]/25 px-2 py-0.5 rounded-md shadow-2xs">
                Seller
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

          {/* Main menu — the overview leads, then grouped sections */}
          <nav className="space-y-4">
            <SidebarLink
              {...OVERVIEW_ITEM}
              isActive={isActiveLink(OVERVIEW_ITEM.href)}
              onClose={onClose}
            />

            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1 pt-3 border-t border-[var(--border-color)]/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-3 mb-1.5 opacity-75">
                  {group.title}
                </p>
                {group.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    {...item}
                    isActive={isActiveLink(item.href)}
                    onClose={onClose}
                  />
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="shrink-0 p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--surface-alt)]">
          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-[var(--on-grad-text)] shadow-xs shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[var(--foreground)] leading-none truncate">
                {vendor?.name || "Your store"}
              </p>
              <p className="text-[10px] text-[var(--brand-flat)] font-semibold mt-1">
                Seller account
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
