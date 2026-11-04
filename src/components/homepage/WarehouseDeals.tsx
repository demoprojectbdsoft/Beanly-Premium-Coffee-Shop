"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/types";
import { getProducts } from "@/lib/api/products";
import ProductCard from "../shared/ProductCard";
import ProductCardSkeleton from "../shared/ProductCardSkeleton";

const TABS = ["0-20", "20-40", "40-60", "60-80", "80-100"] as const;

function WarehouseDealsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDiscount = searchParams.get("discount") || "0-20";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);

  // Fetch products from server for active discount tab
  useEffect(() => {
    let active = true;
    setLoading(true);

    getProducts({ discount: currentDiscount, limit: 18 })
      .then((res) => {
        if (!active) return;
        const list = res?.data?.products || (Array.isArray(res?.data) ? res.data : []);
        setProducts(list);
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    setPageIndex(0);
    return () => {
      active = false;
    };
  }, [currentDiscount]);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("discount", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const visibleProducts = products.slice(
    pageIndex * ITEMS_PER_PAGE,
    (pageIndex + 1) * ITEMS_PER_PAGE
  );

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6 gap-4">
        <div className="relative inline-block">
          <h2 className="text-xl md:text-2xl font-light text-[var(--foreground)] dark:text-[var(--foreground)]">
            Save Big on Warehouse Cleaning
          </h2>
          <div className="absolute -bottom-[13px] left-0 w-full h-[2px] bg-primary" />
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 text-sm">
          {/* Discount range tabs */}
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer ${
                  currentDiscount === tab
                    ? "bg-primary text-white shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:text-[var(--foreground-muted)] dark:hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--surface-alt)]"
                }`}
              >
                {tab}%
              </button>
            ))}
          </div>

          <Link
            href={`/shop?discount=${currentDiscount}`}
            className="text-xs text-[var(--foreground-muted)] hover:text-primary flex items-center gap-1 font-medium transition-colors"
          >
            Go to Daily Deals Section
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Products Carousel */}
      <div className="relative group/carousel">
        {totalPages > 1 && (
          <button
            type="button"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[var(--surface-elevated)] dark:bg-[var(--surface)] shadow-md border border-[var(--border-color)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--surface-elevated)] dark:bg-[var(--surface-elevated)] shadow-xs">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-[var(--border-color)]/80 dark:divide-[var(--border-color)]">
              {Array.from({ length: 5 }).map((_, idx) => (
                <ProductCardSkeleton key={idx} hasRightBorder={idx !== 4} />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-[var(--border-color)]/80 dark:divide-[var(--border-color)]">
              {visibleProducts.map((product, idx) => (
                <ProductCard
                  key={product.id || product.slug}
                  product={product}
                  hasRightBorder={idx !== visibleProducts.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-[var(--foreground-muted)]">
              No products found for {currentDiscount}% discount.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <button
            type="button"
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            disabled={pageIndex >= totalPages - 1}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[var(--surface-elevated)] dark:bg-[var(--surface)] shadow-md border border-[var(--border-color)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Pagination Dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPageIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                pageIndex === idx ? "w-6 bg-primary" : "w-2 bg-[var(--border-color)] dark:bg-[var(--foreground-muted)]"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function WarehouseDeals() {
  return (
    <Suspense fallback={null}>
      <WarehouseDealsContent />
    </Suspense>
  );
}