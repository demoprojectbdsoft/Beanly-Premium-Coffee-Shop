"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  MapPin,
  Package,
  Search,
  TriangleAlert,
} from "lucide-react";
import { toast } from "react-toastify";
import type { VendorOrder, VendorPagination } from "@/types/vendor";
import { getVendorOrderStatusStyle } from "@/lib/vendorOrderStatus";
import { updateVendorOrderStatus } from "@/lib/action/vendor";
import { formatOrderDate } from "@/lib/dateTime";
import { formatPrice } from "@/lib/currency";

/**
 * The seller's order board.
 *
 * A row is one seller's fulfilment group, not a whole checkout: the same order
 * number can appear twice when two shops are in it, and each shop advances its
 * own row. Accepting is offered inline because it is the one decision that
 * cannot wait; every later step lives on the order itself.
 */

interface VendorOrdersClientProps {
  orders: VendorOrder[];
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
  filters: { status: string; search: string };
  currency: string;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "New" },
  { key: "active", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

/** The grouped tabs read several statuses, so their count is summed here. */
const TAB_STATUSES: Record<string, string[]> = {
  pending: ["pending"],
  active: ["accepted", "processing", "ready_for_shipment"],
  completed: ["shipped", "delivered"],
  rejected: ["rejected", "cancelled"],
};

export default function VendorOrdersClient({
  orders,
  typeCounts,
  pagination,
  filters,
  currency,
}: VendorOrdersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [accepting, setAccepting] = useState<string | null>(null);

  const countFor = (key: string) => {
    if (key === "all") {
      return Object.values(typeCounts).reduce((sum, value) => sum + value, 0);
    }
    return (TAB_STATUSES[key] || [key]).reduce(
      (sum, status) => sum + (typeCounts[status] || 0),
      0
    );
  };

  const go = (next: { page?: number; search?: string; status?: string }) => {
    const params = new URLSearchParams();
    const nextSearch = (next.search ?? search).trim();
    const nextStatus = next.status ?? filters.status;
    const page = next.page ?? 1;

    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/vendor/orders?${query}` : "/dashboard/vendor/orders");
  };

  const accept = async (order: VendorOrder) => {
    if (accepting) return;

    setAccepting(order._id);
    try {
      const res = await updateVendorOrderStatus(order._id, "accepted");
      if (res?.success === false) {
        toast.error(res.message || "The order could not be accepted");
        return;
      }
      toast.success(`${order.orderNumber || "Order"} accepted`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Orders</h1>
        <p className="text-[11px] text-[var(--foreground-muted)]">
          Your own lines from every checkout. Another seller&apos;s items never appear here.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((tab) => {
            const active = filters.status === tab.key;

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
                  className={`rounded px-1 text-[9px] font-bold ${
                    active ? "bg-white/20" : "bg-[var(--surface-alt)]"
                  }`}
                >
                  {countFor(tab.key)}
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
            placeholder="Order number, customer or city"
            className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] pl-9 pr-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
          />
        </form>
      </div>

      {/* Rows */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="h-6 w-6 text-[var(--foreground-muted)]" />
            <p className="text-xs font-semibold text-[var(--foreground)]">No orders here</p>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              {filters.search || filters.status !== "all"
                ? "Nothing matches this view."
                : "When a customer buys one of your products, their lines land on this board."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {orders.map((order) => {
              const style = getVendorOrderStatusStyle(order.status);
              const StatusIcon = style.icon;
              const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const firstItem = order.items[0]?.title || "Items";

              return (
                <li key={order._id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
                      {order.items[0]?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={order.items[0].image}
                          alt={firstItem}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-[var(--foreground-muted)]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-mono text-[11px] font-bold text-[var(--foreground)]">
                          {order.orderNumber || "Order"}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                        >
                          <StatusIcon className="h-2.5 w-2.5" />
                          {style.label}
                        </span>
                      </div>
                      <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                        {order.customerName || "Customer"} ·{" "}
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {order.city || "—"}
                        </span>{" "}
                        · {units} item{units === 1 ? "" : "s"} · {formatOrderDate(order.placedAt)}
                      </p>
                      <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                        {firstItem}
                        {order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        {formatPrice(order.subtotal, currency, { showDecimals: false })}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-[var(--foreground-muted)]">
                        Your subtotal
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {order.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => accept(order)}
                          disabled={Boolean(accepting)}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-gradient px-2.5 py-1.5 text-[10px] font-bold text-[var(--on-grad-text)] shadow-xs transition-opacity disabled:opacity-60 cursor-pointer"
                        >
                          {accepting === order._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : null}
                          Accept
                        </button>
                      )}

                      <Link
                        href={`/dashboard/vendor/orders/${order._id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
                      >
                        Open
                      </Link>
                    </div>
                  </div>

                  {order.status === "rejected" && order.rejectionReason && (
                    <p className="mt-1.5 flex items-start gap-1 text-[10px] text-rose-600 dark:text-rose-400">
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                      {order.rejectionReason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Paging */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} order
            {pagination.total === 1 ? "" : "s"}
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
    </div>
  );
}
