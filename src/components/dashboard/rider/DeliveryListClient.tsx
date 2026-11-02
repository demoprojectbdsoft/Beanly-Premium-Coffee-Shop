"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  MapPin,
  PackageCheck,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_STYLES,
  formatDistance,
  formatMoment,
} from "@/lib/rider";
import {
  DELIVERY_STATUSES,
  type DeliveryPagination,
  type DeliveryRecord,
} from "@/types/delivery";
import { fetchMyDeliveryAction } from "@/lib/action/deliveries";
import { useRiderLocationShare } from "@/context/RiderLocationContext";
import DeliveryActions from "./DeliveryActions";
import AppSelect from "@/components/shared/AppSelect";
import DeliveryDetailModal from "./DeliveryDetailModal";

interface DeliveryListClientProps {
  scope: "requests" | "deliveries" | "active" | "history";
  title: string;
  subtitle: string;
  emptyText: string;
  path: string;
  showStatusFilter: boolean;
  deliveries: DeliveryRecord[];
  /** Orders whose assignment expired before the rider answered. */
  expiredIds: string[];
  pagination: DeliveryPagination;
  filters: { status: string; search: string; sort: string; limit: number };
}

export default function DeliveryListClient({
  scope,
  title,
  subtitle,
  emptyText,
  path,
  showStatusFilter,
  deliveries,
  expiredIds,
  pagination,
  filters,
}: DeliveryListClientProps) {
  const router = useRouter();
  const { formatPrice } = useSiteSettings();
  // The workspace's position feed. Every stage button on this page changes what
  // it should be reporting for, so each one asks for a re-read rather than
  // waiting on the tracker's own minute.
  const share = useRiderLocationShare();

  const [search, setSearch] = useState(filters.search);
  const [status, setStatus] = useState(filters.status);
  const [sort, setSort] = useState(filters.sort);
  const [limit, setLimit] = useState(String(filters.limit));

  // The row a rider opened, and whether its answer window had already closed.
  const [detail, setDetail] = useState<DeliveryRecord | null>(null);
  const [detailExpired, setDetailExpired] = useState(false);
  // A list row carries the delivery's own copy of the customer and the money.
  // The full order is read on the click and merged in, so the sheet can show the
  // lines, the payment and the postcode without the rider leaving the table.
  const [orderRead, setOrderRead] = useState<DeliveryRecord | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderFailed, setOrderFailed] = useState(false);

  const loadOrder = (id: string) => {
    setOrderLoading(true);
    setOrderFailed(false);
    fetchMyDeliveryAction(id)
      .then((full) => {
        if (full) setOrderRead(full);
        else setOrderFailed(true);
      })
      .catch(() => setOrderFailed(true))
      .finally(() => setOrderLoading(false));
  };

  const openDetail = (delivery: DeliveryRecord) => {
    setDetail(delivery);
    setDetailExpired(expiredIds.includes(delivery._id));
    setOrderRead(null);
    loadOrder(delivery._id);
  };

  const retryOrder = () => {
    if (detail) loadOrder(detail._id);
  };

  // A change lands in the database, so the page is re-read rather than patched:
  // the row's next action is decided by the server, not by this component.
  const handleChanged = () => {
    setDetail(null);
    setOrderRead(null);
    share.refresh();
    router.refresh();
  };

  const go = (next: { page?: number; search?: string; status?: string; sort?: string; limit?: string }) => {
    const params = new URLSearchParams();
    const nextSearch = (next.search ?? search).trim();
    const nextStatus = next.status ?? status;
    const nextSort = next.sort ?? sort;
    const nextLimit = next.limit ?? limit;
    const page = next.page ?? 1;

    if (nextSearch) params.set("search", nextSearch);
    if (showStatusFilter && nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);
    if (nextLimit && nextLimit !== "10") params.set("limit", nextLimit);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `${path}?${query}` : path);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setSort("newest");
    setLimit("10");
    router.push(path);
  };

  const hasFilters = Boolean(search) || sort !== "newest" || (showStatusFilter && status !== "all");
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            {title}
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">{subtitle}</p>
        </div>
        {scope === "requests" && (
          <Link
            href="/dashboard/rider/deliveries"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            All my deliveries
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* ── Filters ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              go({ search, page: 1 });
            }}
            className="flex-1 flex items-center gap-2 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2"
          >
            <Search className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order, customer, phone or city"
              className="w-full bg-transparent outline-none text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  go({ search: "", page: 1 });
                }}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <AppSelect
              size="sm"
              ariaLabel="Sort deliveries"
              icon={<SlidersHorizontal />}
              value={sort}
              onChange={(next) => {
                setSort(next);
                go({ sort: next, page: 1 });
              }}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "fee_desc", label: "Highest fee" },
              ]}
            />

            {showStatusFilter && (
              <AppSelect
                size="sm"
                ariaLabel="Filter by stage"
                value={status}
                onChange={(next) => {
                  setStatus(next);
                  go({ status: next, page: 1 });
                }}
                options={[
                  { value: "all", label: "Every stage" },
                  { value: "active", label: "Active only" },
                  { value: "finished", label: "Finished only" },
                  ...DELIVERY_STATUSES.map((value) => ({
                    value,
                    label: DELIVERY_STATUS_LABELS[value],
                  })),
                ]}
              />
            )}

            <AppSelect
              size="sm"
              ariaLabel="Rows per page"
              value={limit}
              onChange={(next) => {
                setLimit(next);
                go({ limit: next, page: 1 });
              }}
              options={[
                { value: "10", label: "10 rows" },
                { value: "20", label: "20 rows" },
                { value: "50", label: "50 rows" },
              ]}
            />

            {hasFilters && (
              <Button
                size="sm"
                onClick={clearFilters}
                className="h-9 text-[11px] font-bold rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)] border border-[var(--border-color)]"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Rows ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl shadow-xs overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center gap-3">
            <Inbox className="w-10 h-10 text-[var(--foreground-muted)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">Nothing to show</p>
            <p className="text-xs text-[var(--foreground-muted)] max-w-md">{emptyText}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-alt)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Drop-off</th>
                  <th className="px-4 py-3 font-bold">Fee</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Assigned</th>
                  <th className="px-4 py-3 font-bold">Last update</th>
                  <th className="px-5 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {deliveries.map((delivery) => {
                  const distance = formatDistance(delivery.distanceKm);
                  const expired = expiredIds.includes(delivery._id);

                  return (
                    <tr
                      key={delivery._id}
                      className="hover:bg-[var(--surface-alt)]/60 transition-colors align-top"
                    >
                      <td className="px-5 py-4 font-bold text-[var(--foreground)] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetail(delivery)}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          {delivery.orderNumber}
                        </button>
                        <span className="block text-[10px] font-medium text-[var(--foreground-muted)]">
                          {delivery.items} item{delivery.items === 1 ? "" : "s"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-[var(--foreground)]">
                        <span className="font-semibold">{delivery.customerName || "Customer"}</span>
                        <span className="block text-[10px] text-[var(--foreground-muted)]">
                          {delivery.customerPhone || "No phone"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-[var(--foreground-muted)] max-w-[220px]">
                        <span className="inline-flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>
                            {delivery.address || "Address not recorded"}
                            {delivery.city && (
                              <span className="block text-[10px] font-semibold text-[var(--foreground)]">
                                {delivery.city}
                                {distance && ` · ${distance}`}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-4 font-bold text-[var(--foreground)] whitespace-nowrap">
                        {formatPrice(delivery.fee)}
                        <span className="block text-[10px] font-medium text-[var(--foreground-muted)]">
                          order {formatPrice(delivery.orderTotal)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Chip
                          size="sm"
                          className={`border text-[10px] font-bold ${DELIVERY_STATUS_STYLES[delivery.status]}`}
                        >
                          {DELIVERY_STATUS_LABELS[delivery.status]}
                        </Chip>
                        {delivery.status === "assigned" && delivery.expiresAt && (
                          <span
                            className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${
                              expired
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-[var(--foreground-muted)]"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {expired ? "Expired" : `Until ${formatMoment(delivery.expiresAt)}`}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-[var(--foreground-muted)] whitespace-nowrap">
                        {formatMoment(delivery.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-[var(--foreground-muted)] whitespace-nowrap">
                        {formatMoment(delivery.updatedAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end">
                          <DeliveryActions
                            delivery={delivery}
                            expired={expired}
                            compact
                            onChanged={handleChanged}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pager ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40">
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Showing <span className="font-bold text-[var(--foreground)]">{from}</span>–
            <span className="font-bold text-[var(--foreground)]">{to}</span> of{" "}
            <span className="font-bold text-[var(--foreground)]">{pagination.total}</span> deliveries
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              isDisabled={pagination.page <= 1}
              onClick={() => go({ page: pagination.page - 1 })}
              className="h-8 text-[11px] font-bold rounded-lg bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <span className="text-[11px] font-bold text-[var(--foreground-muted)] px-1">
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <Button
              size="sm"
              isDisabled={pagination.page >= pagination.totalPages}
              onClick={() => go({ page: pagination.page + 1 })}
              className="h-8 text-[11px] font-bold rounded-lg bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {scope === "active" && deliveries.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)]">
          <PackageCheck className="w-3.5 h-3.5" />
          {share.isSharing
            ? `Your position is sharing live${share.reported ? ` for ${share.reported.orderNumber}` : ""} — the customer sees it move on their tracking page.`
            : "Pick a parcel up and your position starts sharing on its own. Open a job to switch it off."}
        </div>
      )}

      <DeliveryDetailModal
        delivery={orderRead?._id === detail?._id ? orderRead : detail}
        isOpen={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        expired={detailExpired}
        onChanged={handleChanged}
        orderLoading={orderLoading}
        orderFailed={orderFailed}
        onRetryOrder={retryOrder}
      />
    </div>
  );
}
