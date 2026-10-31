"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, PackageSearch, Search } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import ProductCardSkeleton from "@/components/shared/ProductCardSkeleton";
import { getProducts } from "@/lib/api/products";
import type { Product } from "@/types";

interface StoreShelfProps {
  storeSlug: string;
  /** The first page, rendered by the server before any query runs. */
  initialProducts: Product[];
  initialPagination: { page: number; limit: number; total: number; totalPages: number };
  initialFilters: { search: string; sort: string };
}

const SORTS = [
  { key: "", label: "Newest" },
  { key: "featured", label: "Featured" },
  { key: "rating", label: "Best rated" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

/**
 * One shop's shelf.
 *
 * The page is `/stores/<slug>`, so the shelf lives in the URL's query string
 * (`q`, `sort`, `page`) and refetches through the public products read with
 * `storeSlug` pinned by the server-rendered page — a shopper cannot type a
 * second shop's slug into this box, because the box never sends one.
 */
export default function StoreShelf({
  storeSlug,
  initialProducts,
  initialPagination,
  initialFilters,
}: StoreShelfProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.search);
  const [sort, setSort] = useState(initialFilters.sort);
  const [page, setPage] = useState(initialPagination.page);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  // A slow response must not overwrite a newer one, so every read carries a
  // serial and stale answers are dropped on arrival.
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    const res = await getProducts({
      storeSlug,
      search: search || undefined,
      sort: sort || undefined,
      page,
      limit: 12,
    });
    if (id !== requestId.current) return;
    setProducts(res?.data?.products ?? []);
    setPagination(
      res?.data?.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 1 }
    );
    setLoading(false);
  }, [storeSlug, search, sort, page]);

  // The first render already shows the server's rows; only later changes query.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Keep the URL honest about what is on screen, so a shelf view can be shared.
  useEffect(() => {
    if (!mounted.current) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (sort) params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    router.replace(`/stores/${storeSlug}${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }, [search, sort, page, storeSlug, router]);

  return (
    <div className="space-y-5">
      {/* ── Search, sort ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--foreground-muted)]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search this shop..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--foreground-muted)]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SORTS.map((option) => (
            <button
              key={option.key || "default"}
              type="button"
              onClick={() => {
                setSort(option.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                sort === option.key
                  ? "bg-brand-gradient text-[var(--on-grad-text)] border-transparent"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:text-[var(--foreground)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
        <span>
          {pagination.total} {pagination.total === 1 ? "listing" : "listings"} in this shop
        </span>
        {loading && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Refreshing
          </span>
        )}
      </div>

      {/* ── Grid ── */}
      {products.length === 0 && !loading ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-10 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface-alt)] flex items-center justify-center">
            <PackageSearch className="w-5 h-5 text-[var(--foreground-muted)]" />
          </div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">
            {search ? "Nothing here matches that" : "This shop has nothing on the shelf yet"}
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
            {search
              ? "Try a shorter word, or clear the search to see everything the shop sells."
              : "The shop is trading, but it has no published listings right now. Check back soon."}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="px-4 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-[11px] font-bold cursor-pointer"
            >
              Clear the search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {(loading && products.length === 0
            ? (Array.from({ length: 8 }) as unknown as Product[])
            : products
          ).map((product, index) =>
            product ? (
              <ProductCard key={product.id || product._id || index} product={product} hasRightBorder={false} />
            ) : (
              <ProductCardSkeleton key={`skeleton-${index}`} hasRightBorder={false} />
            )
          )}
        </div>
      )}

      {/* ── Paging ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
