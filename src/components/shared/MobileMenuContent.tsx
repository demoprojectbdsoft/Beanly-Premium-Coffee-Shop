"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  LogOut,
  Loader2,
  LayoutDashboard,
  Info,
  Briefcase,
  Mail,
} from "lucide-react";
import { Category, SubCategory } from "@/types";
import MobileCategories from "./MobileCategories";
import { ThemeSwitch } from "./Switcher";
import LanguageTranslator from "./LanguageTranslator";
import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";

const PAGE_LINKS = [
  { label: "About Us", href: "/about", icon: Info, color: "text-sky-500" },
  { label: "Services", href: "/services", icon: Briefcase, color: "text-violet-500" },
  { label: "Contact Us", href: "/contact", icon: Mail, color: "text-emerald-500" },
];

interface MobileMenuContentProps {
  categories: Category[];
  subCategories: SubCategory[];
  onClose: () => void;
}

export default function MobileMenuContent({
  categories,
  subCategories,
  onClose,
}: MobileMenuContentProps) {
  const router = useRouter();

  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await authClient.signOut();
      toast.success("Logged out successfully");
      onClose();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Failed to log out");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const userRole = ((user as { role?: string })?.role || "customer").toLowerCase();
  const accountHref = user
    ? `/dashboard/${userRole}`
    : "/auth/login";

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-950">
      {/* ── Scrollable Body Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        
        {/* 1. Dedicated Account Profile & Logout Card */}
        {user ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-indigo-50/30 dark:from-sky-950/40 dark:via-blue-950/20 dark:to-gray-900/40 border border-sky-100/80 dark:border-sky-900/40 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 overflow-hidden">
                  {user.image || (user as { avatar?: string })?.avatar ? (
                    <Image
                      src={user.image || ((user as { avatar?: string })?.avatar as string)}
                      alt={user.name || "User avatar"}
                      fill
                      sizes="40px"
                      className="object-cover rounded-full"
                      unoptimized
                    />
                  ) : user.name ? (
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {user.name || "My Account"}
                  </p>
                  <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 capitalize">
                    {(user as { role?: string })?.role || "Customer"} Account
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                title="Log Out"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Logout</span>
              </button>
            </div>

            {/* Direct Dashboard Link */}
            <Link
              href={accountHref}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-xs transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Go to Dashboard</span>
            </Link>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                  Welcome to Electro
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  Sign in to access your orders
                </p>
              </div>
            </div>
            <Link
              href="/auth/login"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors shrink-0 shadow-xs"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* 2. Appearance / Dark Mode Switch */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Appearance</span>
          </div>
          <ThemeSwitch variant="inline" />
        </div>

        {/* 2b. Language Translator (Mobile / PWA) */}
        <LanguageTranslator variant="inline" />

        {/* 3. Explore Pages (About, Services, Contact) */}
        <div className="space-y-1">
          <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
            Explore
          </p>
          {PAGE_LINKS.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-800/80 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 shadow-xs border border-gray-100 dark:border-gray-700 shrink-0 ${page.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-primary transition-colors">
                  {page.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* 4. Categories and Subcategories Tree */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
          <MobileCategories
            categories={categories}
            subCategories={subCategories}
            onClose={onClose}
          />
        </div>

      </div>
    </div>
  );
}
