"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Headphones } from "lucide-react";
import SparqLogo from "./SparqLogo";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { getCategories } from "@/lib/api/categories";
import { Category } from "@/types";
import {
  FaFacebookF,
  FaXTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaRss,
  FaTiktok,
  FaPinterest,
  FaVimeo,
  FaDiscord,
} from "react-icons/fa6";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: FaFacebookF,
  twitter: FaXTwitter,
  "twitter/x": FaXTwitter,
  x: FaXTwitter,
  instagram: FaInstagram,
  linkedin: FaLinkedinIn,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  pinterest: FaPinterest,
  vimeo: FaVimeo,
  discord: FaDiscord,
  rss: FaRss,
};

export default function Footer() {
  const { settings } = useSiteSettings();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then((res: { data?: Category[] } | Category[]) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        setCategories(list.filter((c) => c.isActive !== false));
      })
      .catch(() => setCategories([]));
  }, []);

  // Only show the categories column if there are at least 5 categories
  const showCategoriesColumn = categories.length >= 5;
  const footerCategories = categories.slice(0, 7);

  // Only show links that have a non-empty URL set in admin settings
  const socialLinks = (settings.socialLinks || [])
    .filter((item) => item.url && item.url.trim() !== "")
    .map((item) => ({
      icon: PLATFORM_ICONS[item.platform.toLowerCase()] || FaFacebookF,
      label: item.platform,
      href: item.url.trim(),
    }));

  const phone = settings.supportPhone || "(800) 8001-8588, (0600) 874 548";
  const address = settings.address || "17 Princess Road, London, Greater London NW1 8JR, UK";
  const siteName = settings.siteName || "Sparq";

  return (
    <footer className="w-full bg-[var(--surface)] text-[var(--foreground-muted)] font-sans border-t border-[var(--border-color)]">
      
      {/* ── Main Footer Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Column 1: Brand & Contact */}
          <div className={`col-span-2 ${showCategoriesColumn ? "lg:col-span-5" : "lg:col-span-7"} space-y-6`}>
            
            {/* Logo matching site design language with footer logo source */}
            <SparqLogo size="lg" logoSource="footer" showSlogan />

            {/* 24/7 Call Center Hotline Block (Gradient Blue Accents) */}
            <div className="flex items-center gap-4 py-2">
              <div className="p-3.5 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
                <Headphones className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-muted)] font-medium">
                  Got Questions ? Call us 24/7!
                </p>
                <p className="text-lg md:text-xl font-bold text-[var(--foreground)] tracking-tight">
                  {phone}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                Contact Info
              </h4>
              <p className="text-xs md:text-sm text-[var(--foreground-muted)] leading-relaxed">
                {address}
              </p>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-2.5 pt-2 flex-wrap">
              {socialLinks.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <a
                    key={idx}
                    href={item.href}
                    aria-label={item.label}
                    target={item.href !== "#" ? "_blank" : undefined}
                    rel={item.href !== "#" ? "noopener noreferrer" : undefined}
                    className="social-icon-btn touch-manipulation"
                  >
                    <IconComponent className="w-3.5 h-3.5 pointer-events-none" />
                  </a>
                );
              })}
            </div>

          </div>

          {/* Column 2: Dynamic Categories — only shown when ≥5 categories exist */}
          {showCategoriesColumn && (
            <div className="col-span-1 lg:col-span-4 space-y-4">
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Shop by Category
              </h3>
              <ul className="space-y-2.5 text-xs md:text-sm">
                {footerCategories.map((cat) => (
                  <li key={cat._id || cat.id || cat.slug}>
                    <Link
                      href={`/shop?category=${cat.slug}`}
                      className="text-[var(--foreground-muted)] hover:text-primary transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Column 3: Customer Care */}
          <div className={`${showCategoriesColumn ? "col-span-1 lg:col-span-3" : "col-span-2 lg:col-span-5"} space-y-4`}>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Customer Care
            </h3>
            <ul className="space-y-2.5 text-xs md:text-sm">
              {[
                { name: "My Account", href: "/account" },
                { name: "Track your Order", href: "/track-order" },
                // Multi-vendor entry points: the discovery page and the locator,
                // which both answer from real shops rather than sample rows.
                { name: "Shop the Shops", href: "/stores" },
                { name: "Store Locator", href: "/store-locator" },
                { name: "Customer Service", href: "/customer-service" },
                { name: "Returns/Exchange", href: "/returns" },
                { name: "FAQs", href: "/faq" },
                { name: "Product Support", href: "/support" },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.href}
                    className="text-[var(--foreground-muted)] hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom Sub-Footer Bar ── */}
      <div className="w-full bg-[var(--surface-alt)] border-t border-[var(--border-color)] py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--foreground-muted)]">
          
          <p className="text-center md:text-left">
            {settings.footerCopyright || (
              <>
                © <strong className="font-semibold text-[var(--foreground)]">{siteName}</strong>. All rights reserved.
              </>
            )}
          </p>

          <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
            <span className="font-black text-xs text-primary tracking-wider">
              DISCOVER
            </span>
            <div className="flex -space-x-1">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 inline-block" />
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block" />
            </div>
            <span className="font-bold text-xs italic text-[var(--foreground)] opacity-90">
              PayPal
            </span>
            <span className="font-bold text-xs text-[var(--foreground)] opacity-85">
              Skrill
            </span>
            <span className="font-black text-xs text-[var(--foreground)] italic tracking-wider">
              VISA
            </span>
          </div>

        </div>
      </div>

    </footer>
  );
}
