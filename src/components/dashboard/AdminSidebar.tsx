"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Banknote,
  Package,
  FolderTree,
  SlidersHorizontal,
  CreditCard,
  User,
  Settings,
  ChevronRight,
  X,
  ArrowLeft,
  LogOut,
  Star,
  Shield,
  Bell,
  Mail,
  Megaphone,
  Sparkles,
  Ticket,
  Truck,
  Store,
  Bike,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import SparqLogo from "@/components/shared/SparqLogo";

// The menu is split into groups so a long list of links stays readable. The
// overview leads on its own, then each group is drawn in the order written
// here.
const OVERVIEW_ITEM = {
  name: "Overview",
  href: "/dashboard/admin",
  icon: LayoutDashboard,
};

// The store's activity feed. It sits beside the overview rather than inside a
// group, because it is read every day and a group heading only adds a line.
const NOTIFICATIONS_ITEM = {
  name: "Notifications",
  href: "/dashboard/admin/notifications",
  icon: Bell,
};

const NAV_GROUPS = [
  {
    title: "Store",
    items: [
      { name: "Products", href: "/dashboard/admin/products", icon: Package },
      { name: "Categories", href: "/dashboard/admin/categories", icon: FolderTree },
      { name: "Home Slider", href: "/dashboard/admin/home-slider", icon: SlidersHorizontal },
      { name: "Promo Banners", href: "/dashboard/admin/promo-banners", icon: Megaphone },
      { name: "Promotions", href: "/dashboard/admin/promotions", icon: Sparkles },
    ],
  },
  {
    title: "Sales",
    items: [
      { name: "Orders", href: "/dashboard/admin/orders", icon: ShoppingBag },
      { name: "Deliveries", href: "/dashboard/admin/deliveries", icon: Truck },
      { name: "Rider payouts", href: "/dashboard/admin/payouts", icon: Banknote },
      { name: "Transactions", href: "/dashboard/admin/transactions", icon: CreditCard },
      { name: "Coupons", href: "/dashboard/admin/coupons", icon: Ticket },
    ],
  },
  {
    title: "People",
    items: [
      { name: "Users", href: "/dashboard/admin/users", icon: Users },
      { name: "Vendor applications", href: "/dashboard/admin/vendors", icon: Store },
      { name: "Rider applications", href: "/dashboard/admin/riders", icon: Bike },
    ],
  },
  {
    title: "Support",
    items: [
      { name: "Reviews", href: "/dashboard/admin/reviews", icon: Star },
      { name: "Warranties", href: "/dashboard/admin/warranties", icon: Shield },
      { name: "Messages", href: "/dashboard/admin/messages", icon: Mail },
    ],
  },
];

const ACCOUNT_ITEMS = [
  { name: "Profile", href: "/dashboard/admin/profile", icon: User },
  { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
];

interface SidebarLinkProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  onClose: () => void;
}

// One menu row. Used by both the grouped links and the account links so they
// look and behave exactly the same.
function SidebarLink({ name, href, icon: Icon, isActive, onClose }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
        isActive
          ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs font-bold border border-transparent"
          : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35"
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

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.push("/auth/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  // The overview is the parent of every other admin page, so it only counts as
  // active on its own path. The rest stay highlighted on their sub-pages, such
  // as /dashboard/admin/products/add.
  const isActiveLink = (href: string) =>
    href === "/dashboard/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[var(--surface)]/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Off-canvas Sidebar Panel */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-[var(--surface-elevated)] border-r border-[var(--border-color)] flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out shadow-xs ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Header & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparqLogo size="sm" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)] bg-[var(--brand-flat)]/10 border border-[var(--brand-flat)]/25 px-2 py-0.5 rounded-md shadow-2xs">
                Admin
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Sidebar"
              className="lg:hidden p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Menu — the overview leads, then the groups */}
          <nav className="space-y-5">
            <SidebarLink
              {...OVERVIEW_ITEM}
              isActive={isActiveLink(OVERVIEW_ITEM.href)}
              onClose={onClose}
            />

            <SidebarLink
              {...NOTIFICATIONS_ITEM}
              isActive={isActiveLink(NOTIFICATIONS_ITEM.href)}
              onClose={onClose}
            />

            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-3 mb-2 opacity-75">
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

          {/* Account Navigation */}
          <nav className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-3 mb-2 opacity-75">
              Account
            </p>
            {ACCOUNT_ITEMS.map((item) => (
              <SidebarLink
                key={item.href}
                {...item}
                isActive={isActiveLink(item.href)}
                onClose={onClose}
              />
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: Back to Store & Sign Out */}
        <div className="p-4 border-t border-[var(--border-color)] space-y-2 bg-[var(--surface-alt)]">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--foreground)] hover:text-[var(--brand-flat)] hover:bg-[var(--brand-flat)]/10 hover:border-[var(--brand-flat)]/30 border border-[var(--border-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35 transition-all cursor-pointer"
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
      </aside>
    </>
  );
}