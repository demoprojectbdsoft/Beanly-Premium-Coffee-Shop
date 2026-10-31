"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  MapPin,
  Package,
  Search,
  Star,
  Store,
  TriangleAlert,
} from "lucide-react";
import type { PublicStore } from "@/types/stores";
import { useSiteSettings } from "@/context/SiteSettingsContext";

interface StoresClientProps {
  stores: PublicStore[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { search: string; category: string; featured: boolean; sort: string };
}

const SORTS = [
  { key: "featured", label: "Featured first" },
  { key: "rating", label: "Best rated" },
  { key: "newest", label: "Newest" },
  { key: "popular", label: "Most orders" },
];

/**
 * Shop discovery.
 *
 * The URL is the state: search, category, sort and page all live in the query
 * string, so a filtered list is a link, the back button behaves, and the
 * server's first render already shows the right rows. The chips only ever name
 * the categories this page's shops use — the list says what it is holding.
 */
export default function StoresClient({ stores, pagination, filters }: StoresClientProps) {
  const router = useRouter();
  const { settings } = useSiteSettings();
  // The box is uncontrolled and seeded from the URL once: the server's render
  // is the truth about what is on screen, and an effect that copied the URL
  // back into state every navigation would only cause cascading re-renders.
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchRef.current) searchRef.current.value = filters.search;
  }, [filters.search]);

  const go = (next: Partial<{ search: string; category: string; featured: string; sort: string; page: number }>) => {
    const merged = {
      // Filters ride on the URL's last submitted search, not on half-typed
      // text — sorting by something the reader can see beats sorting by a
      // word that was never pressed into the list.
      search: filters.search,
      category: filters.category,
      featured: filters.featured ? "true" : "",
      sort: filters.sort,
      page: pagination.page,
      ...next,
    };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.category) params.set("category", merged.category);
    if (merged.featured === "true") params.set("featured", "true");
    if (merged.sort && merged.sort !== "featured") params.set("sort", merged.sort);
    if (Number(merged.page) > 1) params.set("page", String(merged.page));
    router.push(`/stores${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  };

  const submitSearch = () => {
    const value = searchRef.current?.value.trim() || "";
    go({ search: value, page: 1 });
  };

  const categories = Array.from(
    new Set(stores.map((store) => store.category).filter(Boolean))
  ).sort();

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-10 space-y-6">
      {/* ── Header ── */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wide uppercase">
          <Store className="w-4 h-4 stroke-[2.2]" />
          Sellers
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
          Shop the <span className="text-gradient-primary">shops</span>
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] max-w-2xl">
          Every seller trading on {settings.siteName || "Sparq"} right now — browse a
          storefront, see its rating, and buy straight from the shop that ships it.
        </p>
      </div>

      {/* ── Search & sort ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--foreground-muted)]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            ref={searchRef}
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
            placeholder="Search shops by name, description or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--foreground-muted)]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => go({ sort: option.key, page: 1 })}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                filters.sort === option.key
                  ? "bg-brand-gradient text-[var(--on-grad-text)] border-transparent"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:text-[var(--foreground)]"
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go({ featured: filters.featured ? "" : "true", page: 1 })}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
              filters.featured
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300/60 dark:border-amber-600/50"
                : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:text-[var(--foreground)]"
            }`}
          >
            <Crown className="w-3 h-3" />
            Featured only
          </button>
        </div>
      </div>

      {/* ── Category chips, from the shops on this page ── */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => go({ category: "", page: 1 })}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
              !filters.category
                ? "text-primary border-primary/40 bg-primary/10"
                : "text-[var(--foreground-muted)] border-[var(--border-color)] bg-[var(--surface-elevated)]"
            }`}
          >
            All categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => go({ category: filters.category === category ? "" : category, page: 1 })}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                filters.category === category
                  ? "text-primary border-primary/40 bg-primary/10"
                  : "text-[var(--foreground-muted)] border-[var(--border-color)] bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--foreground-muted)]">
        {pagination.total} {pagination.total === 1 ? "shop" : "shops"} trading
        {filters.search ? ` matching “${filters.search}”` : ""}
        {filters.category ? ` in ${filters.category}` : ""}
        {filters.featured ? " · featured only" : ""}
      </p>

      {/* ── Shop cards ── */}
      {stores.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-10 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface-alt)] flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 text-[var(--foreground-muted)]" />
          </div>
          <h2 className="text-sm font-bold text-[var(--foreground)]">No shop answers this</h2>
          <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
            Nobody is trading under these filters. A shop that is hidden, suspended or closed
            is not listed here — and a typo in a saved link looks exactly the same.
          </p>
          <button
            type="button"
            onClick={() => router.push("/stores", { scroll: false })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-[11px] font-bold cursor-pointer"
          >
            Clear the filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stores.map((store) => (
            <Link
              key={store._id}
              href={`/stores/${store.slug}`}
              className="group flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40 hover:border-primary/40 transition-all duration-300 cursor-pointer"
            >
              <div className="relative h-24 bg-brand-gradient">
                {store.coverImage && (
                  <Image
                    src={store.coverImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                {store.isFeatured && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                    <Crown className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
                <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] overflow-hidden shadow-xs flex items-center justify-center">
                  {store.logo ? (
                    <Image
                      src={store.logo}
                      alt={`${store.name} logo`}
                      fill
                      sizes="48px"
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Store className="w-5 h-5 text-[var(--foreground-muted)]" />
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1 pt-7 px-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {store.name}
                  </h3>
                  {store.category && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] shrink-0 mt-0.5">
                      {store.category}
                    </span>
                  )}
                </div>
                {store.description && (
                  <p className="text-[11px] text-[var(--foreground-muted)] line-clamp-2 leading-relaxed">
                    {store.description}
                  </p>
                )}
                {(store.address.city || store.address.area) && (
                  <p className="text-[10px] text-[var(--foreground-muted)] inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {[store.address.area, store.address.city].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="mt-auto pt-2 flex items-center gap-3 text-[10px] sm:text-[11px] text-[var(--foreground-muted)]">
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {store.rating > 0 ? store.rating.toFixed(1) : "New"}
                    {store.reviewCount > 0 && (
                      <span className="font-normal text-[var(--foreground-muted)]">({store.reviewCount})</span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {store.productCount}
                  </span>
                  <span className="ml-auto font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Visit shop
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Paging ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} shops
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => go({ page: pagination.page - 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => go({ page: pagination.page + 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
