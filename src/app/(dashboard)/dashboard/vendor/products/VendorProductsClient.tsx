"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { toast } from "react-toastify";
import type { VendorPagination, VendorProduct, VendorProductPlan } from "@/types/vendor";
import { formatTaka, getVendorProductStatusStyle } from "@/lib/vendorProductStatus";
import { archiveVendorProduct } from "@/lib/action/vendor";

/**
 * The vendor's catalogue.
 *
 * The plan usage sits above the table because it is the one number that
 * explains why "Add product" may refuse to publish: the limit is counted from
 * live rows, not from rows in the table.
 */

interface VendorProductsClientProps {
  products: VendorProduct[];
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
  plan: VendorProductPlan;
  filters: { status: string; search: string };
}

const TABS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "out_of_stock", label: "Out of stock" },
  { key: "draft", label: "Drafts" },
  { key: "archived", label: "Archived" },
];

export default function VendorProductsClient({
  products,
  typeCounts,
  pagination,
  plan,
  filters,
}: VendorProductsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [archiving, setArchiving] = useState<string | null>(null);

  const atLimit = plan.used >= plan.maxProducts;

  const go = (next: { page?: number; search?: string; status?: string }) => {
    const params = new URLSearchParams();
    const nextSearch = (next.search ?? search).trim();
    const nextStatus = next.status ?? filters.status;
    const page = next.page ?? 1;

    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/vendor/products?${query}` : "/dashboard/vendor/products");
  };

  const archive = async (product: VendorProduct) => {
    if (archiving) return;

    setArchiving(product._id);
    try {
      const res = await archiveVendorProduct(product._id);
      if (res?.success === false) {
        toast.error(res.message || "The product could not be archived");
        return;
      }
      toast.success("Product archived");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setArchiving(null);
    }
  };

  const usagePercent = plan.maxProducts > 0 ? Math.min(100, Math.round((plan.used / plan.maxProducts) * 100)) : 100;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Products</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Everything you sell. Published products count against your plan.
          </p>
        </div>

        <Link
          href="/dashboard/vendor/products/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add product
        </Link>
      </header>

      {/* Plan usage */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground)]">
            {plan.used} / {plan.maxProducts} Products Used
            <span className="ml-1.5 rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {plan.name}
            </span>
          </p>

          {atLimit ? (
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--brand-flat)] hover:underline"
            >
              <TriangleAlert className="h-3 w-3" />
              Limit reached — upgrade to publish more
            </Link>
          ) : (
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--brand-flat)]"
            >
              Manage plan
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
          <div
            className={`h-full rounded-full ${atLimit ? "bg-rose-500" : "bg-brand-gradient"}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((tab) => {
            const active = filters.status === tab.key;
            const count = tab.key === "all" ? pagination.total : typeCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => go({ status: tab.key, page: 1 })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
                <span className={`rounded px-1 text-[9px] font-bold ${active ? "bg-white/20" : "bg-[var(--surface-alt)]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            go({ search, page: 1 });
          }}
          className="relative w-full sm:w-64"
        >
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, SKU or brand"
            className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] pl-9 pr-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
          />
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Package className="h-6 w-6 text-[var(--foreground-muted)]" />
            <p className="text-xs font-semibold text-[var(--foreground)]">No products here</p>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              {filters.search || filters.status !== "all"
                ? "Nothing matches this view."
                : "Add your first product and it appears here as a draft."}
            </p>
            <Link
              href="/dashboard/vendor/products/new"
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
            >
              <Plus className="h-3 w-3" />
              Add product
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {products.map((product) => {
              const style = getVendorProductStatusStyle(product.vendorProductStatus);
              const StatusIcon = style.icon;
              const category =
                typeof product.categoryId === "object" && product.categoryId
                  ? product.categoryId.name
                  : "—";
              const stock =
                product.stockQuantity === null || product.stockQuantity === undefined
                  ? "Not tracked"
                  : `${product.stockQuantity} in stock`;

              return (
                <li key={product._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-[var(--foreground-muted)]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[var(--foreground)]">{product.title}</p>
                    <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                      {category}
                      {product.sku ? ` · ${product.sku}` : ""} · {stock}
                    </p>
                  </div>

                  <p className="text-xs font-bold text-[var(--foreground)]">{formatTaka(product.price)}</p>

                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                  >
                    <StatusIcon className="h-2.5 w-2.5" />
                    {style.label}
                  </span>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/vendor/products/${product._id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Link>

                    {product.vendorProductStatus !== "archived" && (
                      <button
                        type="button"
                        onClick={() => archive(product)}
                        disabled={archiving === product._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
                      >
                        {archiving === product._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                        Archive
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2.5 shadow-2xs">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} products
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => go({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
