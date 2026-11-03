"use client";

import React from "react";
import Link from "next/link";
import {
  PackageSearch,
  ArrowLeft,
  Home,
  ShoppingBag,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface ProductNotFoundProps {
  slug?: string;
}

export default function ProductNotFound({ slug }: ProductNotFoundProps) {
  // Straight to the catalog pages that always exist, so the shortcuts work in any
  // kind of store rather than naming one industry's categories.
  const quickCategories = [
    { name: "All Products", href: "/shop" },
    { name: "New Arrivals", href: "/shop?sort=newest" },
    { name: "Special Offers", href: "/shop?hasOffer=true" },
  ];

  return (
    <div className="relative min-h-[70dvh] flex items-center justify-center py-12 px-4">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 dark:bg-primary/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-secondary/10 dark:bg-secondary/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-xl w-full text-center space-y-8">
        {/* Visual Icon Box */}
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary-hover/20 to-secondary/20 blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[var(--surface-elevated)] via-[var(--surface-alt)] to-[var(--surface-elevated)] border border-[var(--border-color)] shadow-xl shadow-black/5 dark:shadow-black/50 flex items-center justify-center">
            <PackageSearch className="w-12 h-12 text-primary stroke-[1.5]" />
          </div>
          <span className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-amber-500 text-white shadow-md shadow-amber-500/30">
            <Sparkles className="w-4 h-4" />
          </span>
        </div>

        {/* Text Details */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            404 • Product Not Found
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            Oops! This product is unavailable
          </h1>

          <p className="text-sm text-[var(--foreground-muted)] max-w-md mx-auto leading-relaxed">
            The item you are looking for might have been removed, had its name changed, or is temporarily out of catalog.
          </p>

          {slug && (
            <div className="pt-1">
              <span className="inline-block px-3 py-1 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)] text-xs font-mono text-[var(--foreground-muted)]">
                Slug: &quot;{slug}&quot;
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/shop"
            className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Explore All Products
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto h-11 px-6 border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--surface-alt)] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Popular Categories Shortcut */}
        <div className="pt-6 border-t border-[var(--border-color)] space-y-3">
          <p className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
            Or Browse Top Categories
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickCategories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--foreground)] bg-[var(--surface-elevated)] border border-[var(--border-color)] hover:border-primary hover:text-primary transition-all shadow-2xs"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Help Contact */}
        <div className="text-xs text-[var(--foreground-muted)] flex items-center justify-center gap-1.5 pt-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need help finding an item?</span>
          <Link href="/contact" className="text-primary font-semibold hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
