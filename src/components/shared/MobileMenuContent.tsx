"use client";

import React from "react";
import Link from "next/link";
import { Info, Briefcase, Mail } from "lucide-react";
import { Category, SubCategory } from "@/types";
import MobileCategories from "./MobileCategories";
import UserAccountMenu from "./UserAccountMenu";
import { ThemeSwitch } from "./Switcher";

const PAGE_LINKS = [
  { label: "About Us", href: "/about", icon: Info, color: "text-primary" },
  { label: "Services", href: "/services", icon: Briefcase, color: "text-violet-500" },
  { label: "Contact Us", href: "/contact", icon: Mail, color: "text-emerald-500" },
];

interface MobileMenuContentProps {
  categories: Category[];
  subCategories: SubCategory[];
  onClose: () => void;
}

/**
 * The body every small-screen door shows: the left drawer, the hamburger
 * overlay and the right drawer all render this one component.
 *
 * The account block is the same `UserAccountMenu` the desktop header opens,
 * laid out flat. It used to be a simpler card here, which meant a phone could
 * not switch workspace at all — and a rider or seller signing in on a small
 * screen had one "Go to Dashboard" button that followed the account's role
 * mirror rather than its approved roles. Out of the box on every surface now.
 */
export default function MobileMenuContent({
  categories,
  subCategories,
  onClose,
}: MobileMenuContentProps) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--background)]">
      {/* ── Scrollable Body Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

        {/* 1. Account: identity, workspace switcher, sign out. No shortcut
            rows here - the fixed bottom bar under this drawer is the phone's
            way to Profile, Settings and Dashboard. */}
        <UserAccountMenu variant="storefront" layout="panel" onNavigate={onClose} />

        {/* 2. Appearance / Dark Mode Switch */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)]">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[var(--foreground)]">Appearance</span>
          </div>
          <ThemeSwitch variant="inline" />
        </div>

        {/* 3. Explore Pages (About, Services, Contact) */}
        <div className="space-y-1">
          <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] mb-1.5">
            Explore
          </p>
          {PAGE_LINKS.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--surface-alt)] shadow-xs border border-[var(--border-color)] shrink-0 ${page.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-primary transition-colors">
                  {page.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* 4. Categories and Subcategories Tree */}
        <div className="pt-2 border-t border-[var(--border-color)]/80">
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
