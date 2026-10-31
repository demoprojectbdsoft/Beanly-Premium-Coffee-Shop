"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Ticket,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "react-toastify";
import type { Coupon, CouponState } from "@/types";
import type { VendorPagination } from "@/types/vendor";
import { formatPrice } from "@/lib/currency";
import { formatOrderDate } from "@/lib/dateTime";
import { deleteVendorCoupon, setVendorCouponActive } from "@/lib/action/vendorCoupons";
import VendorCouponForm, { type CouponProductOption } from "./VendorCouponForm";

/**
 * The seller's coupon desk.
 *
 * The allowance sits above the table because it is the number that explains why
 * "New code" may refuse: only running codes cost a slot, and a code that has
 * ended or been stopped is already out of the count.
 */

interface VendorCouponsClientProps {
  coupons: Coupon[];
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
  filters: { status: string; search: string };
  allowance: { planName: string; limit: number; used: number; isLive: boolean };
  products: CouponProductOption[];
  currency: string;
}

const TABS: { key: CouponState | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Running" },
  { key: "upcoming", label: "Scheduled" },
  { key: "expired", label: "Ended" },
  { key: "stopped", label: "Stopped" },
];

const STATE_STYLES: Record<CouponState, { label: string; badge: string }> = {
  live: {
    label: "Running",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  upcoming: {
    label: "Scheduled",
    badge:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
  expired: {
    label: "Ended",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  stopped: {
    label: "Stopped",
    badge:
      "border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]",
  },
};

/** What the code takes off, in the words a seller would use. */
function discountWords(coupon: Coupon, currency: string): string {
  if (coupon.discountType === "percentage") {
    const cap =
      coupon.maxDiscountAmount > 0
        ? `, up to ${formatPrice(coupon.maxDiscountAmount, currency)}`
        : "";
    return `${coupon.discountValue}% off${cap}`;
  }
  return `${formatPrice(coupon.discountValue, currency)} off`;
}

/** The window, written once when only one end matters. */
function windowWords(coupon: Coupon): string {
  const start = formatOrderDate(coupon.startDate);
  const end = formatOrderDate(coupon.endDate);
  if (!start && !end) return "No dates set";
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start} → ${end}`;
}

export default function VendorCouponsClient({
  coupons,
  typeCounts,
  pagination,
  filters,
  allowance,
  products,
  currency,
}: VendorCouponsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const atLimit = allowance.used >= allowance.limit;

  const go = (next: { page?: number; search?: string; status?: string }) => {
    const params = new URLSearchParams();
    const nextSearch = (next.search ?? search).trim();
    const nextStatus = next.status ?? filters.status;
    const page = next.page ?? 1;

    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/vendor/coupons?${query}` : "/dashboard/vendor/coupons");
  };

  const closeForm = () => {
    setComposing(false);
    setEditing(null);
  };

  const startNew = () => {
    setEditing(null);
    setComposing(true);
  };

  const startEdit = (coupon: Coupon) => {
    setComposing(false);
    setEditing(coupon);
  };

  const toggleActive = async (coupon: Coupon) => {
    if (busyId) return;

    setBusyId(coupon._id);
    try {
      const res = await setVendorCouponActive(coupon._id, !coupon.isActive);
      if (res?.success === false) {
        toast.error(res.message || "The code could not be changed");
        return;
      }
      toast.success(coupon.isActive ? "Coupon stopped" : "Coupon running again");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (coupon: Coupon) => {
    if (busyId) return;

    setBusyId(coupon._id);
    try {
      const res = await deleteVendorCoupon(coupon._id);
      if (res?.success === false) {
        toast.error(res.message || "The code could not be removed");
        return;
      }
      // The API decides whether a spent code may be erased at all, so the line
      // the seller sees is the one the API wrote.
      toast.success(res?.message || "Coupon stopped");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const usagePercent =
    allowance.limit > 0 ? Math.min(100, Math.round((allowance.used / allowance.limit) * 100)) : 100;

  const formOpen = composing || editing !== null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Coupons</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Your own discount codes. Shoppers type them in the cart and at checkout.
          </p>
        </div>

        {!formOpen && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New code
          </button>
        )}
      </header>

      {/* Plan allowance */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground)]">
            {allowance.used} / {allowance.limit} Coupon Slots Used
            <span className="ml-1.5 rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {allowance.planName}
            </span>
          </p>

          {atLimit ? (
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--brand-flat)] hover:underline"
            >
              <TriangleAlert className="h-3 w-3" />
              No slot left — upgrade to run more
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

        <p className="mt-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
          Only running codes take a slot. A code that ended or was stopped is out
          of the count, but the orders that used it keep their discount.
          {!allowance.isLive && " Your subscription is not running, so new codes are refused until it is renewed."}
        </p>
      </section>

      {formOpen && (
        <VendorCouponForm
          key={editing?._id || "new"}
          coupon={editing}
          products={products}
          currency={currency}
          onDone={closeForm}
        />
      )}

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
                <span
                  className={`rounded px-1 text-[9px] font-bold ${active ? "bg-white/20" : "bg-[var(--surface-alt)]"}`}
                >
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
            placeholder="Code or label"
            className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] pl-9 pr-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
          />
        </form>
      </div>

      {/* The codes */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {coupons.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Ticket className="h-6 w-6 text-[var(--foreground-muted)]" />
            <p className="text-xs font-semibold text-[var(--foreground)]">No codes here</p>
            <p className="max-w-sm text-[11px] text-[var(--foreground-muted)]">
              {filters.search || filters.status !== "all"
                ? "Nothing matches this view."
                : "A code you write here is what a shopper types in the cart, and only your own products count towards it."}
            </p>
            {!formOpen && (
              <button
                type="button"
                onClick={startNew}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                New code
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {coupons.map((coupon) => {
              const style = STATE_STYLES[coupon.state];
              const scope =
                coupon.productIds.length > 0
                  ? `${coupon.productIds.length} named product${coupon.productIds.length === 1 ? "" : "s"}`
                  : "Whole shop";
              const usage =
                coupon.totalUsageLimit > 0
                  ? `${coupon.usedCount} of ${coupon.totalUsageLimit} used · ${coupon.remaining} left`
                  : `${coupon.usedCount} used · no cap`;

              return (
                <li key={coupon._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="rounded-lg bg-[var(--surface-alt)] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--foreground)]">
                        {coupon.code}
                      </p>
                      {coupon.title && (
                        <p className="truncate text-[11px] font-semibold text-[var(--foreground-muted)]">
                          {coupon.title}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[var(--foreground-muted)]">
                      {discountWords(coupon, currency)} · {scope} · {windowWords(coupon)}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--foreground-muted)]">
                      {usage}
                      {coupon.discountGiven > 0 && (
                        <> · {formatPrice(coupon.discountGiven, currency)} given away</>
                      )}
                      {coupon.minOrderAmount > 0 && (
                        <> · min {formatPrice(coupon.minOrderAmount, currency)}</>
                      )}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                  >
                    {style.label}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(coupon)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleActive(coupon)}
                      disabled={busyId === coupon._id}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === coupon._id && <Loader2 className="h-3 w-3 animate-spin" />}
                      {coupon.isActive ? "Stop" : "Resume"}
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(coupon)}
                      disabled={busyId === coupon._id}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
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
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} codes
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
