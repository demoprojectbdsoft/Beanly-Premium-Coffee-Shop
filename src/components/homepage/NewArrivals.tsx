"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, PackageX } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import ProductCardSkeleton from "@/components/shared/ProductCardSkeleton";
import { Product } from "@/types";

interface NewArrivalsProps {
  products?: Product[];
  newArrivals?: Product[];
  loading?: boolean;
}

export default function NewArrivals({
  products = [],
  newArrivals = [],
  loading = false,
}: NewArrivalsProps) {
  const allProducts: Product[] =
    newArrivals.length > 0
      ? newArrivals
      : products.length > 0
      ? products
      : [];

  const [activePageIndex, setActivePageIndex] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(allProducts.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(activePageIndex, totalPages - 1);

  const visibleProducts = allProducts.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* ── 1. Section Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
        <div className="relative inline-block">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-light text-[var(--foreground)]">
              New Arrivals
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" /> Fresh in stock
            </span>
          </div>
          {/* Active Accent Underline using Gradient Primary */}
          <div className="absolute -bottom-[13px] left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-primary-hover rounded-full" />
        </div>

        {/* Go to New Arrivals Link */}
        <Link
          href="/shop?sort=newest"
          className="text-xs text-[var(--foreground-muted)] hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer group"
        >
          <span>Go to New Arrivals</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── 2. Content Condition: Skeleton / Grid / Empty State ── */}
      {loading ? (
        /* Skeleton State */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs bg-[var(--surface-elevated)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={i} hasRightBorder={i < 4} />
          ))}
        </div>
      ) : allProducts.length === 0 ? (
        <div className="w-full py-12 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <PackageX className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            No new arrivals available right now
          </p>
          <p className="text-xs text-[var(--foreground-muted)] max-w-sm">
            Check back soon for the latest product releases.
          </p>
        </div>
      ) : (
        <div className="relative group/carousel">
          {/* Left Arrow Button */}
          {totalPages > 1 && (
            <button
              type="button"
              aria-label="Previous products"
              disabled={currentPage === 0}
              onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-md text-[var(--foreground-muted)] hover:text-primary hover:border-primary flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Product Grid Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs bg-[var(--surface-elevated)]">
            {visibleProducts.map((product: Product, index: number) => (
              <ProductCard
                key={product.id || index}
                product={product}
                hasRightBorder={index < visibleProducts.length - 1}
                showDiscountBadge={false}
              />
            ))}
          </div>

          {/* Right Arrow Button */}
          {totalPages > 1 && (
            <button
              type="button"
              aria-label="Next products"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setActivePageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-md text-[var(--foreground-muted)] hover:text-primary hover:border-primary flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* ── 3. Pagination Dots ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to page ${index + 1}`}
              onClick={() => setActivePageIndex(index)}
              className={`transition-all duration-300 cursor-pointer ${
                currentPage === index
                  ? "w-6 h-2 rounded-full bg-gradient-to-r from-primary to-primary-hover shadow-xs"
                  : "w-2 h-2 rounded-full bg-[var(--border-color)] hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
