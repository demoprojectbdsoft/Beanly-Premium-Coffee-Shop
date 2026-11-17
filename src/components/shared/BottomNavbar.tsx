"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingBag,
  Info,
  Briefcase,
  Mail,
  Store,
  Truck,
} from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

// Pages shown in desktop bottom nav. The vendor directory sits directly after
// the shop, because it is the other half of the same question: what is for
// sale, and who is selling it.
export const NAV_LINKS = [
  { label: "Home",     href: "/",         icon: Home },
  { label: "Shop",     href: "/shop",     icon: ShoppingBag },
  { label: "Vendors",  href: "/vendors",  icon: Store },
  { label: "About",    href: "/about",    icon: Info },
  { label: "Services", href: "/services", icon: Briefcase },
  { label: "Contact",  href: "/contact",  icon: Mail },
];

// Pages shown in drawer / hamburger menu only
export const DRAWER_PAGE_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
];

export default function BottomNavbar() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const freeThreshold = settings.shipping?.freeShippingThreshold ?? 50;
  const freeShippingEnabled = settings.shipping?.freeShippingEnabled !== false;
  const currency = settings.currency || "USD";
  const currencySymbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "BDT" ? "৳" : "$";

  return (
    <div className="hidden md:block w-full bg-[var(--navbar-bg)] border-b border-[var(--border-color)] transition-colors duration-200">
      <div className="w-full px-4 md:px-14 flex items-center justify-between gap-4">
        
        {/* Navigation Page Links */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-2 no-scrollbar">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold transition-all whitespace-nowrap group ${
                  isActive
                    ? "text-primary bg-primary/10 shadow-2xs"
                    : "text-[var(--foreground-muted)] hover:text-primary hover:bg-[var(--surface-alt)]"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-[var(--foreground-muted)] group-hover:text-primary"
                  }`}
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Promotional Text — dynamic from site settings */}
        {freeShippingEnabled && (
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] shrink-0">
            <Truck className="w-4 h-4 text-primary shrink-0" />
            <span>Free Shipping on Orders {currencySymbol}{freeThreshold}+</span>
          </div>
        )}

      </div>
    </div>
  );
}
