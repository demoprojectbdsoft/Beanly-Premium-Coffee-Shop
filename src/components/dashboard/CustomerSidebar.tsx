"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  CreditCard,
  User,
  Settings,
  ChevronRight,
  X,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  LogOut,
  Star,
  Bell,
  Store,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import SparqLogo from "@/components/shared/SparqLogo";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const CUSTOMER_NAV_ITEMS = [
  { name: "Overview", href: "/dashboard/customer", icon: LayoutDashboard },
  { name: "Wishlist", href: "/dashboard/customer/wishlist", icon: Heart },
  { name: "My Orders", href: "/dashboard/customer/orders", icon: ShoppingBag },
  { name: "Notifications", href: "/dashboard/customer/notifications", icon: Bell },
  { name: "My Reviews", href: "/dashboard/customer/reviews", icon: Star },
  { name: "Transactions", href: "/dashboard/customer/transactions", icon: CreditCard },
];

const CUSTOMER_ACCOUNT_ITEMS = [
  { name: "My Profile", href: "/dashboard/customer/profile", icon: User },
  { name: "Settings", href: "/dashboard/customer/settings", icon: Settings },
  // The conversion entry: an existing customer opens the marketplace
  // application from the account they already have, never a second signup.
  { name: "Become a Vendor", href: "/become-a-vendor", icon: Store },
];

/** Maps raw member string to a proper display label */
function formatMemberTier(member?: string | null): string {
  if (!member) return "Silver Member";
  const tier = member.charAt(0).toUpperCase() + member.slice(1).toLowerCase();
  return `${tier} Member`;
}

/** Tier badge colour */
function getTierColor(member?: string | null): string {
  switch (member?.toLowerCase()) {
    case "diamond": return "from-cyan-500 to-sky-600";
    case "platinum": return "from-purple-500 to-indigo-600";
    case "gold": return "from-amber-500 to-yellow-600";
    default: return "from-sky-500 to-blue-600";
  }
}

interface CustomerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerSidebar({ isOpen, onClose }: CustomerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { settings } = useSiteSettings();
  const siteName = settings.siteName || "Sparq";

  // Session-level user for identity (name, email, id)
  const sessionUser = session?.user as {
    id?: string;
    name?: string;
    email?: string;
    member?: string;
    points?: number;
  } | undefined;

  // Live member/points fetched from DB
  const [liveData, setLiveData] = useState<{
    member?: string;
    points?: number;
  } | null>(null);

  useEffect(() => {
    if (!sessionUser?.id) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;

    fetch(`${apiUrl}/users/${sessionUser.id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const data = json?.data ?? json;
        if (data) {
          setLiveData({
            member: data.member,
            points: typeof data.points === "number" ? data.points : undefined,
          });
        }
      })
      .catch(() => {
        // Silently fallback to session data
      });
  }, [sessionUser?.id]);

  // Prefer live DB data, fallback to session
  const activeMember = liveData?.member ?? sessionUser?.member;
  const activePoints = liveData?.points !== undefined ? liveData.points : (sessionUser?.points ?? 0);

  const memberTier = formatMemberTier(activeMember);
  const tierGradient = getTierColor(activeMember);
  const userPoints = activePoints.toLocaleString();

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
        {/* Scrollable Navigation Area */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Header & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparqLogo size="sm" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)] bg-[var(--brand-flat)]/10 border border-[var(--brand-flat)]/25 px-2 py-0.5 rounded-md shadow-2xs">
                Customer
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

          {/* Main Menu Navigation */}
          <nav className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-3 mb-2 opacity-75">
              Main Menu
            </p>
            {CUSTOMER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs font-bold border border-transparent"
                      : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35"
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

          {/* Account Navigation */}
          <nav className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-3 mb-2 opacity-75">
              Account
            </p>
            {CUSTOMER_ACCOUNT_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs font-bold border border-transparent"
                      : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35"
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
        </div>

        {/* Sidebar Footer with Loyalty Tier & Back to Store */}
        <div className="p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--surface-alt)]">
          {/* Rewards Card — live data */}
          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-[var(--on-grad-text)] shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--foreground)] leading-none">
                  {memberTier}
                </p>
                <p className="text-[10px] text-[var(--brand-flat)] font-semibold mt-1">
                  {userPoints} {siteName} Pts
                </p>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-[var(--brand-flat)]" />
          </div>

          {/* Back to Store link & Sign Out */}
          <div className="space-y-2">
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
        </div>
      </aside>
    </>
  );
}
