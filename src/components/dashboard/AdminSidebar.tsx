"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  PackagePlus,
  FolderPlus,
  FolderTree,
  SlidersHorizontal,
  CreditCard,
  FileText,
  User,
  Settings,
  ChevronRight,
  X,
  ArrowLeft,
  LogOut,
  Star,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";
import SparqLogo from "@/components/shared/SparqLogo";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
  { name: "Products", href: "/dashboard/admin/products", icon: Package },
  // { name: "Add Product", href: "/dashboard/admin/products/add", icon: PackagePlus },
  { name: "Categories", href: "/dashboard/admin/categories", icon: FolderTree },
  // { name: "Add Category", href: "/dashboard/admin/categories/add", icon: FolderPlus },
  { name: "Home Slider", href: "/dashboard/admin/home-slider", icon: SlidersHorizontal },
  { name: "Orders", href: "/dashboard/admin/orders", icon: ShoppingBag },
  { name: "Transactions", href: "/dashboard/admin/transactions", icon: CreditCard },
  { name: "Users", href: "/dashboard/admin/users", icon: Users },
  { name: "Reviews", href: "/dashboard/admin/reviews", icon: Star },
  // { name: "Reports", href: "/dashboard/admin/reports", icon: FileText },
];

const ACCOUNT_ITEMS = [
  { name: "Profile", href: "/dashboard/admin/profile", icon: User },
  { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
];

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

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-gray-950/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Off-canvas Sidebar Panel */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-white dark:bg-gray-900 border-r border-slate-200/80 dark:border-gray-800 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Header & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparqLogo size="sm" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/50 px-2 py-0.5 rounded-md">
                Admin
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Sidebar"
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Menu Navigation */}
          <nav className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">
              Main Menu
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
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
          <nav className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-gray-800/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">
              Account
            </p>
            {ACCOUNT_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
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

        {/* Sidebar Footer: Back to Store & Sign Out */}
        <div className="p-4 border-t border-slate-100 dark:border-gray-800/60 space-y-2 bg-slate-50/50 dark:bg-gray-950/40">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200/80 dark:border-gray-800 transition-colors cursor-pointer"
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